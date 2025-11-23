/**
 * Automated Health Check Script
 * Phase 2: Boot & Smoke Testing
 * 
 * Verifies backend health, API endpoints, and basic functionality
 * without requiring user interaction.
 */

const http = require('http');
const https = require('https');

const BACKEND_PORT = process.env.BACKEND_PORT || 3001;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const latency = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          latency
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function testEndpoint(name, url, expectedStatus = 200, validateFn = null) {
  try {
    log(`\n📍 Testing: ${name}`, 'cyan');
    log(`   URL: ${url}`, 'blue');
    
    const response = await makeRequest(url);
    
    // Check status code
    if (response.statusCode === expectedStatus) {
      log(`   ✅ Status: ${response.statusCode} (${response.latency}ms)`, 'green');
    } else {
      log(`   ❌ Status: ${response.statusCode} (expected ${expectedStatus})`, 'red');
      return false;
    }
    
    // Parse JSON if applicable
    let jsonData = null;
    if (response.headers['content-type']?.includes('application/json')) {
      try {
        jsonData = JSON.parse(response.body);
        log(`   ✅ Valid JSON response`, 'green');
      } catch (e) {
        log(`   ❌ Invalid JSON response`, 'red');
        return false;
      }
    }
    
    // Custom validation
    if (validateFn && jsonData) {
      const validationResult = validateFn(jsonData);
      if (validationResult === true) {
        log(`   ✅ Validation passed`, 'green');
      } else {
        log(`   ❌ Validation failed: ${validationResult}`, 'red');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function runHealthChecks() {
  log('\n🚀 Starting Automated Health Checks', 'cyan');
  log('=====================================\n', 'cyan');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Backend Health Endpoint
  results.total++;
  const healthTest = await testEndpoint(
    'Backend Health',
    `${BACKEND_URL}/api/health`,
    200,
    (data) => {
      if (!data.binance) return 'Missing binance health data';
      if (!data.kucoin) return 'Missing kucoin health data';
      if (typeof data.binance.isConnected !== 'boolean') return 'Invalid binance connection status';
      if (typeof data.kucoin.isConnected !== 'boolean') return 'Invalid kucoin connection status';
      return true;
    }
  );
  results.tests.push({ name: 'Backend Health', passed: healthTest });
  if (healthTest) results.passed++; else results.failed++;
  
  // Test 2: Market Prices Endpoint
  results.total++;
  const pricesTest = await testEndpoint(
    'Market Prices',
    `${BACKEND_URL}/api/market/prices?symbols=BTC,ETH`,
    200,
    (data) => {
      if (!Array.isArray(data) && !data.prices) return 'Response is not an array or object with prices';
      const prices = Array.isArray(data) ? data : data.prices;
      if (!prices || prices.length === 0) return 'No price data returned';
      return true;
    }
  );
  results.tests.push({ name: 'Market Prices', passed: pricesTest });
  if (pricesTest) results.passed++; else results.failed++;
  
  // Test 3: Signals History Endpoint
  results.total++;
  const signalsTest = await testEndpoint(
    'Signals History',
    `${BACKEND_URL}/api/signals/history?limit=10`,
    200,
    (data) => {
      // Signals endpoint may return empty array if no signals yet - that's OK
      if (!Array.isArray(data) && !data.history && !data.signals) {
        return 'Response is not an array or object with history/signals';
      }
      return true;
    }
  );
  results.tests.push({ name: 'Signals History', passed: signalsTest });
  if (signalsTest) results.passed++; else results.failed++;
  
  // Test 4: Server Status Endpoint
  results.total++;
  const statusTest = await testEndpoint(
    'Server Status',
    `${BACKEND_URL}/api/system/status`,
    200,
    (data) => {
      if (!data.status) return 'Missing status field';
      return true;
    }
  );
  results.tests.push({ name: 'Server Status', passed: statusTest });
  if (statusTest) results.passed++; else results.failed++;
  
  // Test 5: Exchange Info (KuCoin via proxy or direct)
  results.total++;
  const exchangeTest = await testEndpoint(
    'Exchange Health Check',
    `${BACKEND_URL}/api/health`,
    200,
    (data) => {
      // Verify both exchanges have health metrics
      if (!data.binance || !data.kucoin) return 'Missing exchange health data';
      if (typeof data.binance.latency !== 'number') return 'Invalid Binance latency';
      if (typeof data.kucoin.latency !== 'number') return 'Invalid KuCoin latency';
      return true;
    }
  );
  results.tests.push({ name: 'Exchange Health', passed: exchangeTest });
  if (exchangeTest) results.passed++; else results.failed++;
  
  // Summary
  log('\n=====================================', 'cyan');
  log('📊 Test Results Summary', 'cyan');
  log('=====================================\n', 'cyan');
  
  log(`Total Tests:  ${results.total}`, 'blue');
  log(`Passed:       ${results.passed}`, 'green');
  log(`Failed:       ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Pass Rate:    ${((results.passed / results.total) * 100).toFixed(1)}%`, 
      results.failed === 0 ? 'green' : 'yellow');
  
  log('\n📋 Test Details:', 'cyan');
  results.tests.forEach((test, index) => {
    const icon = test.passed ? '✅' : '❌';
    const color = test.passed ? 'green' : 'red';
    log(`   ${index + 1}. ${icon} ${test.name}`, color);
  });
  
  log('\n=====================================\n', 'cyan');
  
  // Exit code based on results
  if (results.failed === 0) {
    log('✅ All health checks passed! System is operational.', 'green');
    process.exit(0);
  } else {
    log(`⚠️  ${results.failed} health check(s) failed. Please review.`, 'yellow');
    process.exit(1);
  }
}

// Check if backend is running first
async function checkBackendRunning() {
  try {
    log(`🔍 Checking if backend is running on port ${BACKEND_PORT}...`, 'cyan');
    await makeRequest(`${BACKEND_URL}/api/health`);
    log(`✅ Backend is running!`, 'green');
    return true;
  } catch (error) {
    log(`❌ Backend is not running on port ${BACKEND_PORT}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    log(`\n💡 Please start the backend first:`, 'yellow');
    log(`   npm run dev`, 'yellow');
    return false;
  }
}

// Main execution
(async () => {
  try {
    const isRunning = await checkBackendRunning();
    if (!isRunning) {
      process.exit(1);
    }
    
    await runHealthChecks();
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
})();

