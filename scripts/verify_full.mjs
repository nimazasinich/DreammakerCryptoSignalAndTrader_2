import { spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(process.cwd());
const artifactsDir = path.join(repoRoot, "artifacts");
mkdirSync(artifactsDir, { recursive: true });

const isWin = process.platform === "win32";
const BACKEND_PORT = process.env.PORT || 3001;
const FRONTEND_PORT = 5173;

let backendProc = null;
let previewProc = null;

function logWrite(file, msg) {
  writeFileSync(path.join(artifactsDir, file), msg, { flag: "a" });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts, shell: isWin });
    let out = "";
    let err = "";
    child.stdout.on("data", d => (out += d.toString()));
    child.stderr.on("data", d => (err += d.toString()));
    child.on("close", code => {
      resolve({ code, out, err });
    });
    child.on("error", reject);
  });
}

async function waitHttpOk(url, timeoutMs = 30000, intervalMs = 800) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {
      // Continue waiting
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

function cleanup() {
  if (backendProc) {
    try {
      backendProc.kill('SIGTERM');
      setTimeout(() => {
        if (backendProc) backendProc.kill('SIGKILL');
      }, 3000);
    } catch (e) {}
  }
  if (previewProc) {
    try {
      previewProc.kill('SIGTERM');
      setTimeout(() => {
        if (previewProc) previewProc.kill('SIGKILL');
      }, 3000);
    } catch (e) {}
  }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function main() {
  const report = {
    system: {
      platform: process.platform,
      node: process.version,
      cwd: repoRoot,
      timestamp: new Date().toISOString()
    },
    steps: []
  };

  try {
    // 1) Check Node version
    const nodeMajor = parseInt(process.version.slice(1).split('.')[0]);
    if (nodeMajor < 18) {
      throw new Error(`Node.js 18+ required, found ${process.version}`);
    }
    report.steps.push({ step: "node_version_check", ok: true, version: process.version });

    // 2) Install npm dependencies
    if (!existsSync(path.join(repoRoot, "package.json"))) {
      throw new Error("package.json not found");
    }

    logWrite("npm.log", `Installing dependencies...\n`);
    const npmInstall = await run("npm", ["install"], { cwd: repoRoot });
    report.steps.push({ step: "npm_install", code: npmInstall.code });
    logWrite("npm.log", npmInstall.out + "\n" + npmInstall.err);
    if (npmInstall.code !== 0) {
      throw new Error("npm install failed");
    }

    // 3) Ensure .env.local exists with correct VITE_API_BASE
    const envLocalPath = path.join(repoRoot, ".env.local");
    const envContent = `VITE_API_BASE=http://localhost:${BACKEND_PORT}/api\nVITE_WS_BASE=http://localhost:${BACKEND_PORT}\n`;
    
    if (!existsSync(envLocalPath)) {
      writeFileSync(envLocalPath, envContent);
      report.steps.push({ step: "create_env_local", ok: true });
    } else {
      const existing = readFileSync(envLocalPath, "utf8");
      if (!existing.includes("VITE_API_BASE")) {
        writeFileSync(envLocalPath, envContent + "\n" + existing);
        report.steps.push({ step: "update_env_local", ok: true });
      } else {
        report.steps.push({ step: "check_env_local", ok: true });
      }
    }

    // 4) Start backend server
    logWrite("backend.log", `Starting backend server on port ${BACKEND_PORT}...\n`);
    backendProc = spawn("npx", ["tsx", "src/server.ts"], {
      cwd: repoRoot,
      shell: isWin,
      env: { ...process.env, PORT: String(BACKEND_PORT), NODE_ENV: "development" }
    });

    backendProc.stdout.on("data", d => logWrite("backend.log", d.toString()));
    backendProc.stderr.on("data", d => logWrite("backend.log", d.toString()));
    backendProc.on("error", err => {
      logWrite("backend.log", `Backend spawn error: ${err.message}\n`);
    });

    // Wait for backend health check
    const apiHealthy = await waitHttpOk(`http://localhost:${BACKEND_PORT}/api/health`, 40000);
    report.steps.push({ step: "backend_health", ok: apiHealthy, url: `http://localhost:${BACKEND_PORT}/api/health` });
    if (!apiHealthy) {
      throw new Error("Backend health check failed");
    }

    // 5) Build frontend
    logWrite("frontend.log", "Building frontend...\n");
    const buildResult = await run("npm", ["run", "build:frontend"], { cwd: repoRoot });
    report.steps.push({ step: "frontend_build", code: buildResult.code });
    logWrite("frontend.log", buildResult.out + "\n" + buildResult.err);
    if (buildResult.code !== 0) {
      throw new Error("Frontend build failed");
    }

    // 6) Start frontend preview
    logWrite("frontend.log", `Starting frontend preview on port ${FRONTEND_PORT}...\n`);
    previewProc = spawn("npm", ["run", "preview", "--", "--port", String(FRONTEND_PORT), "--strictPort"], {
      cwd: repoRoot,
      shell: isWin
    });

    previewProc.stdout.on("data", d => logWrite("frontend.log", d.toString()));
    previewProc.stderr.on("data", d => logWrite("frontend.log", d.toString()));
    previewProc.on("error", err => {
      logWrite("frontend.log", `Frontend spawn error: ${err.message}\n`);
    });

    // Wait for frontend health check
    const uiHealthy = await waitHttpOk(`http://localhost:${FRONTEND_PORT}/`, 30000);
    report.steps.push({ step: "frontend_health", ok: uiHealthy, url: `http://localhost:${FRONTEND_PORT}/` });
    if (!uiHealthy) {
      throw new Error("Frontend health check failed");
    }

    // 7) Additional API checks
    const systemStatusOk = await waitHttpOk(`http://localhost:${BACKEND_PORT}/api/system/status`, 6000);
    report.steps.push({ step: "system_status_check", ok: systemStatusOk });

    // 8) Write report
    report.success = true;
    report.summary = {
      backend: `http://localhost:${BACKEND_PORT}`,
      frontend: `http://localhost:${FRONTEND_PORT}`,
      backendHealth: apiHealthy,
      frontendHealth: uiHealthy
    };
    writeFileSync(path.join(artifactsDir, "functional_report.json"), JSON.stringify(report, null, 2));

    console.log("\n✅ Functional verification PASSED");
    console.log(`   Backend:  http://localhost:${BACKEND_PORT}`);
    console.log(`   Frontend: http://localhost:${FRONTEND_PORT}`);
    console.log(`   Report:   ${path.join(artifactsDir, "functional_report.json")}`);

    // Keep processes running for a moment to show success, then cleanup
    await new Promise(r => setTimeout(r, 2000));
    cleanup();

  } catch (err) {
    cleanup();
    report.success = false;
    report.error = String(err);
    report.errorStack = err.stack;
    writeFileSync(path.join(artifactsDir, "functional_report.json"), JSON.stringify(report, null, 2));
    console.error("\n❌ Functional verification FAILED");
    console.error(err);
    process.exit(1);
  }
}

main();

