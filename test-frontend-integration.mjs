#!/usr/bin/env node
/**
 * Frontend Integration Test
 * Tests the key endpoints used by the Dashboard and TopSignalsPanel components
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:8001';
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, ...args) {
  console.log(color, ...args, COLORS.reset);
}

async function testEndpoint(name, path, expectedFields = []) {
  try {
    log(COLORS.cyan, `\n🔍 Testing: ${name}`);
    log(COLORS.blue, `   Endpoint: ${path}`);

    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}${path}`);
    const duration = Date.now() - startTime;
    
    const data = await response.json();

    if (response.status === 200) {
      log(COLORS.green, `   ✅ Status: ${response.status} (${duration}ms)`);
      
      // Check expected fields
      let allFieldsPresent = true;
      if (expectedFields.length > 0) {
        for (const field of expectedFields) {
          if (!(field in data)) {
            log(COLORS.yellow, `   ⚠️  Missing field: ${field}`);
            allFieldsPresent = false;
          }
        }
        if (allFieldsPresent) {
          log(COLORS.green, `   ✅ All expected fields present`);
        }
      }
      
      // Show sample data
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        log(COLORS.blue, `   📊 Sample data (first item):`);
        console.log('   ', JSON.stringify(data.data[0], null, 2).split('\n').slice(0, 5).join('\n   '));
      } else if (data.prices && Array.isArray(data.prices) && data.prices.length > 0) {
        log(COLORS.blue, `   📊 Sample price data (first item):`);
        console.log('   ', JSON.stringify(data.prices[0], null, 2).split('\n').slice(0, 5).join('\n   '));
      }
      
      return { success: true, data, duration };
    } else {
      log(COLORS.yellow, `   ⚠️  Status: ${response.status}`);
      log(COLORS.yellow, `   Message: ${data.error || data.message || 'No error message'}`);
      return { success: false, data, duration };
    }
  } catch (error) {
    log(COLORS.red, `   ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log(COLORS.magenta, '\n' + '='.repeat(80));
  log(COLORS.magenta, '🎨 FRONTEND INTEGRATION TEST');
  log(COLORS.magenta, '   Testing endpoints used by Dashboard & TopSignalsPanel');
  log(COLORS.magenta, '='.repeat(80));
  log(COLORS.cyan, `API Base URL: ${BASE_URL}\n`);

  let passed = 0;
  let total = 0;

  // ============================================================================
  // DASHBOARD VIEW ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n📊 DASHBOARD VIEW ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  // System Status (used by StatusRibbon)
  total++;
  const statusResult = await testEndpoint(
    'System Status',
    '/api/system/status',
    ['environment', 'features', 'trading']
  );
  if (statusResult.success) passed++;

  // Market Prices (used by MarketTicker)
  total++;
  const pricesResult = await testEndpoint(
    'Market Prices',
    '/api/market/prices?symbols=BTC,ETH,BNB&limit=3',
    ['success', 'data', 'prices']
  );
  if (pricesResult.success) passed++;

  // Portfolio (used by Dashboard stats)
  total++;
  const portfolioResult = await testEndpoint(
    'Portfolio',
    '/api/trading/portfolio',
    ['success', 'portfolio']
  );
  if (portfolioResult.success) passed++;

  // ============================================================================
  // TOP SIGNALS PANEL ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n🎯 TOP SIGNALS PANEL ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  // Note: TopSignalsPanel uses RealDataManager.getAISignals()
  // which internally calls various endpoints. Let's test the key ones:

  // Market History (for signal generation)
  total++;
  const historyResult = await testEndpoint(
    'Market History',
    '/api/market/history?symbol=BTC&timeframe=1h&limit=100',
    ['success', 'symbol', 'data']
  );
  if (historyResult.success) passed++;

  // ============================================================================
  // PRICE CHART ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n📈 PRICE CHART ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  // Market data for chart
  total++;
  const chartDataResult = await testEndpoint(
    'Chart Data (BTC)',
    '/api/market/history?symbol=BTC&timeframe=1h&limit=50',
    ['success', 'data']
  );
  if (chartDataResult.success) passed++;

  // ============================================================================
  // HEALTH & MONITORING
  // ============================================================================
  log(COLORS.yellow, '\n🏥 HEALTH & MONITORING');
  log(COLORS.yellow, '-'.repeat(80));

  // Health check
  total++;
  const healthResult = await testEndpoint(
    'Health Check',
    '/status/health',
    ['ok']
  );
  if (healthResult.success) passed++;

  // Debug info
  total++;
  const debugResult = await testEndpoint(
    'Debug Info',
    '/debug-info',
    ['success', 'server']
  );
  if (debugResult.success) passed++;

  // ============================================================================
  // SUMMARY
  // ============================================================================
  log(COLORS.magenta, '\n' + '='.repeat(80));
  log(COLORS.magenta, '📊 FRONTEND INTEGRATION TEST SUMMARY');
  log(COLORS.magenta, '='.repeat(80));
  
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  
  log(COLORS.green, `✅ Passed: ${passed}/${total}`);
  log(COLORS.cyan, `📈 Pass Rate: ${passRate}%`);
  
  if (passed === total) {
    log(COLORS.green, '\n🎉 All frontend integration tests passed!');
    log(COLORS.green, '   The Dashboard and TopSignalsPanel should work correctly.');
  } else if (passed >= total * 0.7) {
    log(COLORS.yellow, '\n⚠️  Most tests passed, but some endpoints need attention.');
    log(COLORS.yellow, '   The frontend should mostly work, but some features may be limited.');
  } else {
    log(COLORS.red, '\n❌ Many tests failed. Frontend functionality may be limited.');
    log(COLORS.red, '   Please check the server logs and ensure all services are running.');
  }
  
  log(COLORS.magenta, '='.repeat(80) + '\n');

  if (passed < total * 0.5) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(COLORS.red, '\n💥 Test suite failed:', error);
  process.exit(1);
});

