// Simple local smoke to verify server + endpoints on PORT 8000
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const PORT = process.env.PORT || '8000';
let server;

async function waitForHealth() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/status/health`);
      if (r.ok) return true;
    } catch {}
    await wait(500);
  }
  return false;
}

async function ensureServer() {
  try {
    const r = await fetch(`http://localhost:${PORT}/status/health`);
    if (r.ok) return () => {};
  } catch {}
  // Start prod server from dist (assumes built)
  server = spawn('node', ['dist/server/index.js'], { stdio: 'inherit' });
  const ok = await waitForHealth();
  if (!ok) {
    console.error('Health never reached');
    server.kill('SIGTERM');
    process.exit(1);
  }
  return () => server && server.kill('SIGTERM');
}

async function main() {
  const stop = await ensureServer();
  const j = async (p, opt={}) => (await fetch(p, opt)).json().catch(()=>({ error:'failed' }));
  console.log('✓ Health:', await j(`http://localhost:${PORT}/status/health`));
  console.log('✓ System Status (head):', await j(`http://localhost:${PORT}/api/system/status`));
  console.log('✓ HF OHLCV (head):', await j(`http://localhost:${PORT}/api/hf/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=60`));
  console.log('✓ HF Sentiment:', await j(`http://localhost:${PORT}/api/hf/sentiment`, {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ texts:['BTC to the moon','ETH looks weak'] })
  }));
  stop();
}
main().catch(e => { console.error(e); process.exit(1); });
