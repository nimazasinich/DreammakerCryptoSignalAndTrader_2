#!/usr/bin/env node

/**
 * Test Script for Unified Proxy Service
 * 
 * این اسکریپت تمام endpointهای proxy را تست می‌کند
 * و نتایج را نمایش می‌دهد
 */

import axios from 'axios';

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3001';

// رنگ‌ها برای console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface TestResult {
  name: string;
  url: string;
  success: boolean;
  cached?: boolean;
  responseTime: number;
  error?: string;
  dataSize?: number;
}

const tests: Array<{
  name: string;
  url: string;
  validateResponse?: (data: any) => boolean;
}> = [
  // Binance Tests
  {
    name: 'Binance - Bitcoin Price',
    url: '/api/proxy/binance/price?symbol=BTCUSDT',
    validateResponse: (data) => data.price !== undefined
  },
  {
    name: 'Binance - Ethereum Price',
    url: '/api/proxy/binance/price?symbol=ETHUSDT',
    validateResponse: (data) => data.price !== undefined
  },
  {
    name: 'Binance - OHLCV Data',
    url: '/api/proxy/binance/klines?symbol=BTCUSDT&interval=1h&limit=10',
    validateResponse: (data) => Array.isArray(data) && data.length > 0
  },
  {
    name: 'Binance - 24hr Stats',
    url: '/api/proxy/binance/ticker/24hr?symbol=BTCUSDT',
    validateResponse: (data) => data.priceChange !== undefined
  },
  
  // CoinGecko Tests
  {
    name: 'CoinGecko - Simple Price',
    url: '/api/proxy/coingecko/simple/price?ids=bitcoin&vs_currencies=usd',
    validateResponse: (data) => data.bitcoin && data.bitcoin.usd !== undefined
  },
  {
    name: 'CoinGecko - Markets',
    url: '/api/proxy/coingecko/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5',
    validateResponse: (data) => Array.isArray(data) && data.length > 0
  },
  {
    name: 'CoinGecko - Bitcoin Info',
    url: '/api/proxy/coingecko/coins/bitcoin',
    validateResponse: (data) => data.id === 'bitcoin'
  },
  
  // Kraken Tests
  {
    name: 'Kraken - Bitcoin Price',
    url: '/api/proxy/kraken/ticker?pair=XBTUSD',
    validateResponse: (data) => data.result !== undefined
  },
  
  // CoinCap Tests
  {
    name: 'CoinCap - Assets List',
    url: '/api/proxy/coincap/assets?limit=5',
    validateResponse: (data) => data.data && Array.isArray(data.data)
  },
  {
    name: 'CoinCap - Bitcoin Info',
    url: '/api/proxy/coincap/assets/bitcoin',
    validateResponse: (data) => data.data && data.data.id === 'bitcoin'
  },
  
  // CryptoPanic Tests
  {
    name: 'CryptoPanic - News',
    url: '/api/proxy/cryptopanic/posts?auth_token=free',
    validateResponse: (data) => data.results && Array.isArray(data.results)
  },
  
  // Fear & Greed Tests
  {
    name: 'Fear & Greed Index',
    url: '/api/proxy/fear-greed',
    validateResponse: (data) => data.data && data.data[0] && data.data[0].value !== undefined
  }
];

async function runTest(test: typeof tests[0]): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_BASE}/${test.url}`, {
      timeout: 10000
    });
    
    const responseTime = Date.now() - startTime;
    const dataSize = JSON.stringify(response.data).length;
    
    // اگر validation وجود داشت، اجرا کن
    let isValid = true;
    if (test.validateResponse) {
      isValid = test.validateResponse(response.data);
    }
    
    return {
      name: test.name,
      url: test.url,
      success: isValid,
      cached: response.data._cached || false,
      responseTime,
      dataSize,
      error: isValid ? undefined : 'Validation failed'
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: test.name,
      url: test.url,
      success: false,
      responseTime,
      error: error.message
    };
  }
}

async function runAllTests() {
  log('\n===========================================', 'cyan');
  log('   Unified Proxy Service - Test Suite', 'cyan');
  log('===========================================\n', 'cyan');
  
  log(`Testing against: ${API_BASE}/`, 'blue');
  log(`Total tests: ${tests.length}\n`, 'blue');
  
  const results: TestResult[] = [];
  
  // اجرای تست‌ها
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    log(`[${i + 1}/${tests.length}] Testing: ${test.name}...`, 'yellow');
    
    const result = await runTest(test);
    results.push(result);
    
    if (result.success) {
      log(`  ✓ Success (${result.responseTime}ms, ${result.dataSize} bytes)${result.cached ? ' [CACHED]' : ''}`, 'green');
    } else {
      log(`  ✗ Failed: ${result.error}`, 'red');
    }
    
    // صبر کمی بین تست‌ها برای rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // خلاصه نتایج
  log('\n===========================================', 'cyan');
  log('              Test Results', 'cyan');
  log('===========================================\n', 'cyan');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const cached = results.filter(r => r.cached).length;
  
  log(`Total: ${results.length}`, 'blue');
  log(`✓ Passed: ${successful}`, 'green');
  log(`✗ Failed: ${failed}`, 'red');
  log(`⚡ Cached: ${cached}`, 'yellow');
  
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  log(`📊 Avg Response Time: ${avgResponseTime.toFixed(2)}ms\n`, 'cyan');
  
  // نمایش تست‌های failed
  if (failed > 0) {
    log('\n===========================================', 'red');
    log('              Failed Tests', 'red');
    log('===========================================\n', 'red');
    
    results.filter(r => !r.success).forEach(result => {
      log(`✗ ${result.name}`, 'red');
      log(`  URL: ${result.url}`, 'red');
      log(`  Error: ${result.error}\n`, 'red');
    });
  }
  
  // نمایش تست‌های cached
  if (cached > 0) {
    log('\n===========================================', 'yellow');
    log('             Cached Responses', 'yellow');
    log('===========================================\n', 'yellow');
    
    results.filter(r => r.cached).forEach(result => {
      log(`⚡ ${result.name} (${result.responseTime}ms)`, 'yellow');
    });
  }
  
  log('\n===========================================\n', 'cyan');
  
  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// تست Cache
async function testCache() {
  log('\n===========================================', 'cyan');
  log('            Cache Performance Test', 'cyan');
  log('===========================================\n', 'cyan');
  
  const testUrl = `${API_BASE}/api/proxy/binance/price?symbol=BTCUSDT`;
  
  // درخواست اول
  log('Request 1 (from API)...', 'yellow');
  const start1 = Date.now();
  const response1 = await axios.get(testUrl);
  const time1 = Date.now() - start1;
  log(`  Response time: ${time1}ms`, 'blue');
  log(`  Cached: ${response1.data._cached ? 'Yes' : 'No'}`, 'blue');
  
  // صبر 1 ثانیه
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // درخواست دوم
  log('\nRequest 2 (should be cached)...', 'yellow');
  const start2 = Date.now();
  const response2 = await axios.get(testUrl);
  const time2 = Date.now() - start2;
  log(`  Response time: ${time2}ms`, 'blue');
  log(`  Cached: ${response2.data._cached ? 'Yes' : 'No'}`, 'blue');
  
  // محاسبه بهبود
  const improvement = ((time1 - time2) / time1 * 100).toFixed(2);
  log(`\n📈 Cache Performance: ${improvement}% faster`, 'green');
  
  log('\n===========================================\n', 'cyan');
}

// Run tests
(async () => {
  try {
    // چک کردن اینکه سرور up است
    try {
      await axios.get(`${API_BASE}/api/health`, { timeout: 5000 });
      log('✓ Server is running\n', 'green');
    } catch {
      log('✗ Server is not running!', 'red');
      log(`  Please start the server: npm run dev:server\n`, 'yellow');
      process.exit(1);
    }
    
    // اجرای تست‌های اصلی
    await runAllTests();
    
    // تست Cache
    await testCache();
    
  } catch (error: any) {
    log(`\n✗ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  }
})();
