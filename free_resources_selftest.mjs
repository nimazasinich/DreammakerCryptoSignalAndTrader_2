// free_resources_selftest.mjs
// Self-test for free external APIs and local backend endpoints
// Adapted for DreammakerCryptoSignalAndTrader project

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const API_BASE = process.env.API_BASE?.replace(/\/+$/,'') || 'http://localhost:8001/api';
const HEADERS_REDDIT = { 'User-Agent': 'smart-api-system-selftest/1.0' };
const TIMEOUT_MS = 8000;
const RETRIES = 2;

const artifactsDir = resolve('artifacts');
if (!existsSync(artifactsDir)) mkdirSync(artifactsDir, { recursive: true });

function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function fetchWithTimeout(url, init={}, timeout=TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return res;
  } finally { clearTimeout(id); }
}

async function probeJson(name, url, {headers={}, method='GET', body, required=true, validator}={}) {
  let attempt = 0, lastErr=null;
  while (attempt <= RETRIES) {
    try {
      const res = await fetchWithTimeout(url, { method, headers, body });
      const status = res.status;
      const text = await res.text();
      const ct = res.headers.get('content-type') || '';
      const isJson = ct.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[');
      const data = isJson ? JSON.parse(text) : text;
      const ok = status >= 200 && status < 300 && (!validator || validator(data));
      return { name, url, status, ok, required, ct, error: ok ? null : `Invalid response`, data: ok ? undefined : data };
    } catch (e) {
      lastErr = e;
      attempt += 1;
      if (attempt > RETRIES) {
        return { name, url, status: 0, ok: !required, required, ct: '', error: String(lastErr?.message || lastErr) };
      }
      await delay(500 * attempt);
    }
  }
}

async function probeText(name, url, {headers={}, required=true, validator}={}) {
  try {
    const res = await fetchWithTimeout(url, { headers });
    const text = await res.text();
    const ct = res.headers.get('content-type') || '';
    const ok = res.status >= 200 && res.status < 300 && (!validator || validator(text, ct));
    return { name, url, status: res.status, ok, required, ct, error: ok ? null : 'Invalid response' };
  } catch (e) {
    return { name, url, status: 0, ok: !required, required, ct: '', error: String(e?.message || e) };
  }
}

function isArrayOfArrays(a){ return Array.isArray(a) && a.length > 0 && Array.isArray(a[0]); }

async function run() {
  const results = [];

  console.log('🔍 Testing Free External APIs and Local Backend Endpoints...\n');

  // ============================================================================
  // EXTERNAL FREE ENDPOINTS (Required for core functionality)
  // ============================================================================
  
  results.push(await probeJson(
    'CoinGecko Simple Price',
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
    { required: true, validator: (d)=> typeof d==='object' && (d.bitcoin || d.ethereum) }
  ));

  results.push(await probeJson(
    'Binance Klines BTCUSDT 1h',
    'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=50',
    { required: true, validator: (d)=> isArrayOfArrays(d) }
  ));

  results.push(await probeJson(
    'Alternative.me Fear & Greed',
    'https://api.alternative.me/fng/',
    { required: true, validator: (d)=> d && Array.isArray(d.data) && d.data.length > 0 }
  ));

  // ============================================================================
  // EXTERNAL OPTIONAL ENDPOINTS (Nice to have, won't fail test)
  // ============================================================================
  
  results.push(await probeJson(
    'Reddit r/cryptocurrency top',
    'https://www.reddit.com/r/cryptocurrency/top.json?limit=25&t=day',
    { headers: HEADERS_REDDIT, required: false, validator: (d)=> !!(d?.data?.children?.length) }
  ));

  results.push(await probeText(
    'CoinDesk RSS Feed',
    'https://feeds.feedburner.com/CoinDesk',
    { required: false, validator: (txt, ct)=> ct.includes('xml') || txt.includes('<rss') || txt.includes('<feed') }
  ));

  results.push(await probeText(
    'CoinTelegraph RSS Feed',
    'https://cointelegraph.com/rss',
    { required: false, validator: (txt, ct)=> ct.includes('xml') || txt.includes('<rss') || txt.includes('<feed') }
  ));

  // ============================================================================
  // LOCAL BACKEND ENDPOINTS (Required for app to function)
  // ============================================================================
  
  console.log(`\n📡 Testing local backend at: ${API_BASE}\n`);

  // Core health check
  results.push(await probeJson(
    'Local: Health Check',
    `${API_BASE}/health`,
    { 
      required: true,
      validator: (d)=> d && (d.success === true || d.ready === true)
    }
  ));

  // Market data endpoint (critical)
  results.push(await probeJson(
    'Local: Market Prices',
    `${API_BASE}/market/prices?symbols=BTC,ETH,SOL`,
    { 
      required: true,
      validator: (d)=> d && (d.success === true || Array.isArray(d.prices))
    }
  ));

  // ============================================================================
  // LOCAL OPTIONAL ENDPOINTS (Enhanced features)
  // ============================================================================

  // Hugging Face OHLCV data
  results.push(await probeJson(
    'Local: HF OHLCV Data',
    `${API_BASE}/hf/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=100`,
    { 
      required: false,
      validator: (d)=> d && (d.success === true || Array.isArray(d.data))
    }
  ));

  // Hugging Face Sentiment Analysis
  results.push(await probeJson(
    'Local: HF Sentiment',
    `${API_BASE}/hf/sentiment`,
    { 
      method: 'POST',
      body: JSON.stringify({ texts: ['BTC strong breakout', 'ETH looks weak'] }),
      headers: { 'content-type': 'application/json' },
      required: false,
      validator: (d)=> d && (d.success === true || Array.isArray(d.results))
    }
  ));

  // Fear & Greed Index
  results.push(await probeJson(
    'Local: Fear & Greed Index',
    `${API_BASE}/sentiment/fear-greed`,
    { 
      required: false,
      validator: (d)=> d && (d.success === true || typeof d.score === 'number')
    }
  ));

  // Social Sentiment Aggregation
  results.push(await probeJson(
    'Local: Social Aggregate',
    `${API_BASE}/social/aggregate`,
    { 
      required: false,
      validator: (d)=> d && (d.success === true || d.sources)
    }
  ));

  // ============================================================================
  // RESULTS SUMMARY
  // ============================================================================

  const summary = {
    ts: new Date().toISOString(),
    apiBase: API_BASE,
    totals: {
      all: results.length,
      ok: results.filter(r=>r.ok).length,
      failed: results.filter(r=>!r.ok).length,
      requiredOk: results.filter(r=>r.ok && r.required).length,
      requiredTotal: results.filter(r=>r.required).length,
      optionalOk: results.filter(r=>r.ok && !r.required).length,
      optionalTotal: results.filter(r=>!r.required).length
    },
    failures: results.filter(r=>!r.ok).map(r=>({ 
      name: r.name, 
      url: r.url, 
      status: r.status, 
      error: r.error,
      required: r.required
    })),
    results
  };

  // Write detailed JSON report
  const jsonPath = resolve(artifactsDir, 'free_resources_selftest.json');
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  // Write human-readable log
  const logPath = resolve(artifactsDir, 'free_resources_selftest.log');
  const lines = [];
  lines.push('='.repeat(80));
  lines.push('FREE RESOURCES SELF-TEST REPORT');
  lines.push('='.repeat(80));
  lines.push(`Timestamp: ${summary.ts}`);
  lines.push(`API Base: ${API_BASE}`);
  lines.push('');
  lines.push('SUMMARY:');
  lines.push(`  Total Tests:      ${summary.totals.all}`);
  lines.push(`  Passed:           ${summary.totals.ok} ✅`);
  lines.push(`  Failed:           ${summary.totals.failed} ❌`);
  lines.push(`  Required Passed:  ${summary.totals.requiredOk}/${summary.totals.requiredTotal}`);
  lines.push(`  Optional Passed:  ${summary.totals.optionalOk}/${summary.totals.optionalTotal}`);
  lines.push('');
  lines.push('DETAILED RESULTS:');
  lines.push('-'.repeat(80));
  
  for (const r of results) {
    const status = r.ok ? '✅ OK  ' : '❌ FAIL';
    const type = r.required ? '[REQ]' : '[OPT]';
    const errorMsg = r.error ? ` | Error: ${r.error}` : '';
    lines.push(`${status} ${type} ${r.name}`);
    lines.push(`     Status: ${r.status} | URL: ${r.url}${errorMsg}`);
  }
  
  lines.push('-'.repeat(80));
  
  if (summary.totals.requiredOk < summary.totals.requiredTotal) {
    lines.push('');
    lines.push('❌ TEST FAILED: Some required endpoints are not working!');
    lines.push('');
    lines.push('FAILED REQUIRED ENDPOINTS:');
    summary.failures.filter(f => f.required).forEach(f => {
      lines.push(`  • ${f.name}`);
      lines.push(`    URL: ${f.url}`);
      lines.push(`    Error: ${f.error}`);
    });
  } else {
    lines.push('');
    lines.push('✅ TEST PASSED: All required endpoints are working!');
    
    if (summary.totals.optionalOk < summary.totals.optionalTotal) {
      lines.push('');
      lines.push('⚠️  Note: Some optional endpoints failed (this is OK):');
      summary.failures.filter(f => !f.required).forEach(f => {
        lines.push(`  • ${f.name}: ${f.error}`);
      });
    }
  }
  
  lines.push('');
  lines.push('='.repeat(80));
  
  const logContent = lines.join('\n');
  writeFileSync(logPath, logContent);

  // Console output
  console.log(logContent);
  
  // Write artifacts info
  console.log('\n📄 Reports saved:');
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   LOG:  ${logPath}`);

  // Exit with appropriate code
  if (summary.totals.requiredOk < summary.totals.requiredTotal) {
    console.log('\n❌ Exiting with error code 2 (required endpoints failed)\n');
    process.exit(2);
  } else {
    console.log('\n✅ All required endpoints working!\n');
    process.exit(0);
  }
}

run().catch(e=>{ 
  console.error('\n❌ Fatal error during test execution:');
  console.error(e); 
  process.exit(1); 
});

