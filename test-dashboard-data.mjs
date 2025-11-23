#!/usr/bin/env node
/**
 * Dashboard Data Display Test
 * Tests all endpoints used by Dashboard to ensure data is displayed correctly
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

async function testEndpoint(name, path) {
  try {
    log(COLORS.cyan, `\n🔍 Testing: ${name}`);
    log(COLORS.blue, `   Endpoint: ${path}`);

    const response = await fetch(`${BASE_URL}${path}`);
    const data = await response.json();

    if (response.status === 200 && data.success !== false) {
      log(COLORS.green, `   ✅ Status: ${response.status}`);
      
      // Check for data
      const dataArray = data.data || data.prices || data.portfolio || [];
      const hasData = Array.isArray(dataArray) ? dataArray.length > 0 : !!dataArray;
      
      if (hasData) {
        log(COLORS.green, `   ✅ Has data: ${Array.isArray(dataArray) ? dataArray.length + ' items' : 'Yes'}`);
        
        // Show sample
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          const sample = dataArray[0];
          log(COLORS.blue, `   📊 Sample data:`);
          if (sample.symbol && sample.price) {
            log(COLORS.blue, `      Symbol: ${sample.symbol}, Price: $${sample.price.toFixed(2)}, Change: ${(sample.changePercent24h || sample.change24h || 0).toFixed(2)}%`);
          } else {
            console.log('      ', JSON.stringify(sample, null, 2).split('\n').slice(0, 3).join('\n       '));
          }
        }
        return { success: true, hasData: true };
      } else {
        log(COLORS.yellow, `   ⚠️  No data returned`);
        return { success: true, hasData: false };
      }
    } else {
      log(COLORS.red, `   ❌ Status: ${response.status}`);
      log(COLORS.red, `   Error: ${data.error || data.message || 'Unknown error'}`);
      return { success: false, hasData: false };
    }
  } catch (error) {
    log(COLORS.red, `   ❌ ERROR: ${error.message}`);
    return { success: false, hasData: false };
  }
}

async function runTests() {
  log(COLORS.magenta, '\n' + '='.repeat(80));
  log(COLORS.magenta, '📊 DASHBOARD DATA DISPLAY TEST');
  log(COLORS.magenta, '   Verifying all data sources for Dashboard components');
  log(COLORS.magenta, '='.repeat(80));
  log(COLORS.cyan, `API Base URL: ${BASE_URL}\n`);

  const results = {
    total: 0,
    success: 0,
    hasData: 0
  };

  // Test 1: Market Prices (Primary data source)
  log(COLORS.yellow, '\n💰 MARKET PRICE DATA');
  log(COLORS.yellow, '-'.repeat(80));
  
  results.total++;
  const testDataResult = await testEndpoint(
    'Test Data (Fallback)',
    '/api/market/test-data?symbols=BTC,ETH,BNB,SOL,XRP,ADA,DOT,AVAX'
  );
  if (testDataResult.success) results.success++;
  if (testDataResult.hasData) results.hasData++;

  results.total++;
  const directPricesResult = await testEndpoint(
    'Direct Prices (MultiProvider)',
    '/api/market/direct-prices?symbols=BTC,ETH,BNB'
  );
  if (directPricesResult.success) results.success++;
  if (directPricesResult.hasData) results.hasData++;

  results.total++;
  const marketPricesResult = await testEndpoint(
    'Market Prices (Standard)',
    '/api/market/prices?symbols=BTC,ETH,BNB&limit=3'
  );
  if (marketPricesResult.success) results.success++;
  if (marketPricesResult.hasData) results.hasData++;

  // Test 2: Historical Data for Charts
  log(COLORS.yellow, '\n📈 CHART DATA');
  log(COLORS.yellow, '-'.repeat(80));
  
  results.total++;
  const historyResult = await testEndpoint(
    'Market History (Chart Data)',
    '/api/market/history?symbol=BTC&timeframe=1h&limit=50'
  );
  if (historyResult.success) results.success++;
  if (historyResult.hasData) results.hasData++;

  // Test 3: Portfolio Data
  log(COLORS.yellow, '\n💼 PORTFOLIO DATA');
  log(COLORS.yellow, '-'.repeat(80));
  
  results.total++;
  const portfolioResult = await testEndpoint(
    'Portfolio Summary',
    '/api/trading/portfolio'
  );
  if (portfolioResult.success) results.success++;
  if (portfolioResult.hasData) results.hasData++;

  // Test 4: System Status
  log(COLORS.yellow, '\n🏥 SYSTEM STATUS');
  log(COLORS.yellow, '-'.repeat(80));
  
  results.total++;
  const statusResult = await testEndpoint(
    'System Status',
    '/api/system/status'
  );
  if (statusResult.success) results.success++;
  if (statusResult.hasData) results.hasData++;

  // Summary
  log(COLORS.magenta, '\n' + '='.repeat(80));
  log(COLORS.magenta, '📊 TEST SUMMARY');
  log(COLORS.magenta, '='.repeat(80));
  
  log(COLORS.green, `✅ Successful requests: ${results.success}/${results.total}`);
  log(COLORS.cyan, `📊 Endpoints with data: ${results.hasData}/${results.total}`);
  
  const dataRate = results.total > 0 ? ((results.hasData / results.total) * 100).toFixed(1) : 0;
  
  if (results.hasData >= results.total * 0.8) {
    log(COLORS.green, '\n🎉 EXCELLENT! Dashboard should display data correctly.');
    log(COLORS.green, `   ${dataRate}% of endpoints are returning data.`);
  } else if (results.hasData >= results.total * 0.5) {
    log(COLORS.yellow, '\n⚠️  PARTIAL: Some dashboard components may show data.');
    log(COLORS.yellow, `   ${dataRate}% of endpoints are returning data.`);
    log(COLORS.yellow, '   Recommendation: Use /api/market/test-data for reliable test data.');
  } else {
    log(COLORS.red, '\n❌ CRITICAL: Dashboard may not display data correctly.');
    log(COLORS.red, `   Only ${dataRate}% of endpoints are returning data.`);
    log(COLORS.red, '   Action required: Check server logs and API connectivity.');
  }
  
  log(COLORS.magenta, '='.repeat(80) + '\n');

  if (results.hasData < results.total * 0.5) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(COLORS.red, '\n💥 Test suite failed:', error);
  process.exit(1);
});

