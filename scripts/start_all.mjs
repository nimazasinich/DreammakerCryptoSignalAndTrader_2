import { spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import path from "path";
import { setTimeout as wait } from "timers/promises";

const repo = process.cwd();
const isWin = process.platform === "win32";
const BACKEND_PORT = process.env.PORT || 3001;
const FRONTEND_PORT = 5173;

const artifacts = path.join(repo, "artifacts");
mkdirSync(artifacts, { recursive: true });

let backendProc = null;
let frontendProc = null;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: isWin, ...opts });
    p.on("close", (code) => {
      if (code === 0) {
        resolve(0);
      } else {
        reject(new Error(`${cmd} exited with code ${code}`));
      }
    });
    p.on("error", reject);
  });
}

async function waitOk(url, ms = 40000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch (e) {
      // Continue waiting
    }
    await wait(600);
  }
  return false;
}

async function ensureDependencies() {
  if (!existsSync(path.join(repo, "package.json"))) {
    throw new Error("package.json not found");
  }

  console.log("==> Installing npm dependencies...");
  await run("npm", ["install"], { cwd: repo });
}

async function ensureEnv() {
  const envPath = path.join(repo, ".env.local");
  const envContent = `VITE_API_BASE=http://localhost:${BACKEND_PORT}/api\nVITE_WS_BASE=http://localhost:${BACKEND_PORT}\n`;
  
  if (!existsSync(envPath)) {
    console.log("==> Creating .env.local...");
    writeFileSync(envPath, envContent);
  } else {
    const existing = readFileSync(envPath, "utf8");
    if (!existing.includes("VITE_API_BASE")) {
      console.log("==> Updating .env.local...");
      writeFileSync(envPath, envContent + "\n" + existing);
    }
  }
}

async function buildFrontend() {
  console.log("==> Building frontend...");
  await run("npm", ["run", "build:frontend"], { cwd: repo });
}

function startBackend() {
  console.log(`==> Starting backend server on port ${BACKEND_PORT}...`);
  const p = spawn("npx", ["tsx", "src/server.ts"], {
    cwd: repo,
    shell: isWin,
    env: { ...process.env, PORT: String(BACKEND_PORT), NODE_ENV: "development" }
  });

  p.stdout.on("data", (data) => process.stdout.write(data));
  p.stderr.on("data", (data) => process.stderr.write(data));
  
  p.on("error", (err) => {
    console.error("Backend spawn error:", err);
  });

  return p;
}

function startFrontendPreview() {
  console.log(`==> Starting frontend preview on port ${FRONTEND_PORT}...`);
  const p = spawn("npm", ["run", "preview", "--", "--port", String(FRONTEND_PORT), "--strictPort"], {
    cwd: repo,
    shell: isWin
  });

  p.stdout.on("data", (data) => process.stdout.write(data));
  p.stderr.on("data", (data) => process.stderr.write(data));
  
  p.on("error", (err) => {
    console.error("Frontend spawn error:", err);
  });

  return p;
}

function cleanup() {
  console.log("\n==> Shutting down...");
  if (frontendProc) {
    try {
      frontendProc.kill('SIGTERM');
      setTimeout(() => {
        if (frontendProc) frontendProc.kill('SIGKILL');
      }, 3000);
    } catch (e) {}
  }
  if (backendProc) {
    try {
      backendProc.kill('SIGTERM');
      setTimeout(() => {
        if (backendProc) backendProc.kill('SIGKILL');
      }, 3000);
    } catch (e) {}
  }
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

async function main() {
  const setupOnly = process.argv.includes("--setup-only");

  try {
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║  BOLT AI Crypto Trading Console - Startup Script         ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");

    await ensureDependencies();
    await ensureEnv();

    if (setupOnly) {
      console.log("\n✅ Setup completed. Run 'npm run start:all' to start the application.");
      return;
    }

    await buildFrontend();

    console.log("\n==> Starting backend and frontend...\n");
    backendProc = startBackend();

    console.log(`Waiting for backend health check (http://localhost:${BACKEND_PORT}/api/health)...`);
    const apiOk = await waitOk(`http://localhost:${BACKEND_PORT}/api/health`, 40000);
    if (!apiOk) {
      cleanup();
      throw new Error("Backend health check failed");
    }
    console.log("✅ Backend is healthy\n");

    frontendProc = startFrontendPreview();

    console.log(`Waiting for frontend health check (http://localhost:${FRONTEND_PORT}/)...`);
    const uiOk = await waitOk(`http://localhost:${FRONTEND_PORT}/`, 30000);
    if (!uiOk) {
      cleanup();
      throw new Error("Frontend health check failed");
    }
    console.log("✅ Frontend is healthy\n");

    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║  ✅ Ready. Application is running without errors.       ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");
    console.log(`Backend:  http://localhost:${BACKEND_PORT}/api/health`);
    console.log(`Frontend: http://localhost:${FRONTEND_PORT}/\n`);
    console.log("Press Ctrl+C to stop both servers.\n");

  } catch (error) {
    cleanup();
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();

