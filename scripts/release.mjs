#!/usr/bin/env node
import { execSync as sh } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const run = (cmd) => sh(cmd, { stdio: "pipe" }).toString().trim();
const die = (m) => { console.error(m); process.exit(1); };

const arg = process.argv[2] || "patch"; // patch|minor|major|rc|set
const setVer = process.argv[3];          // for "set": vX.Y.Z or vX.Y.Z-rc.N

// 0) safety
const dirty = run("git status --porcelain");
if (dirty) die("Working tree not clean. Commit/stash first.");
const branch = run("git rev-parse --abbrev-ref HEAD");
if (!["main", "master"].includes(branch)) die(`Please release from main/master (got ${branch}).`);

// 1) read current version (package.json if present, else from last tag)
const pkgPath = path.resolve("package.json");
let pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")) : null;
const lastTag = (() => { try { return run("git describe --tags --abbrev=0"); } catch { return ""; } })();
const cur = (pkg?.version ? `v${pkg.version}` : (lastTag || "v0.0.0"));

const parseV = (v) => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/.exec(v);
  if (!m) die(`Bad version: ${v}`);
  return { M:+m[1], m:+m[2], p:+m[3], rc: m[4]!=null? +m[4] : null };
};
const fmtV = ({M,m,p,rc}) => `v${M}.${m}.${p}${rc!=null?`-rc.${rc}`:""}`;

const bump = (base, kind) => {
  const x = parseV(base);
  if (kind === "patch") return fmtV({ ...x, p:x.p+1, rc:null });
  if (kind === "minor") return fmtV({ M:x.M, m:x.m+1, p:0, rc:null });
  if (kind === "major") return fmtV({ M:x.M+1, m:0, p:0, rc:null });
  if (kind === "rc") {
    // rc bumps rc.N if already rc; else rc.1 from current (no final bump)
    if (x.rc!=null) return fmtV({ ...x, rc:x.rc+1 });
    return fmtV({ ...x, rc:1 });
  }
  if (kind === "set") return setVer || die("Use: release.mjs set vX.Y.Z[-rc.N]");
  die(`Unknown bump kind: ${kind}`);
};

// 2) decide next version
const next = (arg === "set") ? bump(cur, "set") : bump(cur, arg);
const base = next.replace(/-rc\.\d+$/,"");

// 3) gather notes since last tag (if any)
let range = "";
if (lastTag) range = `${lastTag}..HEAD`;
const log = run(`git log --pretty=format:"* %s (%h)" ${range}`).split("\n").filter(Boolean).join("\n");
const notes = `# ${next}\n\nChanges since ${lastTag || "start"}:\n${log || "* docs: initial release notes"}\n`;

// 4) write package.json version (if present, ignore for rc to avoid churn)
if (pkg && !/-rc\.\d+$/.test(next)) {
  pkg.version = base.slice(1);
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  run("git add package.json");
  run(`git commit -m "chore(release): bump version to ${base}"`);
}

// 5) create tag with notes
writeFileSync(".RELEASE_NOTES.md", notes);
run(`git tag -a ${next} -F .RELEASE_NOTES.md`);
run(`git push origin ${next}`);
console.log(`Tagged and pushed ${next}\n\n${notes}`);
