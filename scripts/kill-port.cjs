#!/usr/bin/env node
/* cross-platform kill port without extra deps */
const { execSync } = require('child_process');

const port = process.argv[2] || '3001';
const isWin = process.platform === 'win32';

try {
  if (isWin) {
    // find PID(s) listening on :port and kill
    const lines = execSync(`netstat -ano | findstr :${port}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().split(/\r?\n/).filter(Boolean);
    const pids = [...new Set(lines.map(l => (l.trim().match(/(\d+)\s*$/) || [])[1]).filter(Boolean))];
    if (pids.length === 0) {
      console.log(`ℹ No process found on port ${port} (or already freed).`);
    } else {
      pids.forEach(pid => execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit' }));
      console.log(`✔ Killed processes on port ${port}`);
    }
  } else {
    const pids = execSync(`lsof -ti :${port}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (pids) {
      execSync(`kill -9 ${pids}`, { stdio: 'inherit' });
      console.log(`✔ Killed processes on port ${port}`);
    } else {
      console.log(`ℹ No process found on port ${port} (or already freed).`);
    }
  }
} catch (e) {
  console.log(`ℹ No process found on port ${port} (or already freed).`);
}
