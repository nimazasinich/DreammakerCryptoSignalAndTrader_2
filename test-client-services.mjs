#!/usr/bin/env node
/**
 * Test script for Client Services endpoints
 * Tests all endpoints documented in CLIENT_SERVICES.md
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let passed = 0;
let failed = 0;
let skipped = 0;

function log(color, ...args) {
  console.log(color, ...args, COLORS.reset);
}

async function testEndpoint(method, path, body = null, expectedStatus = 200, description = '') {
  try {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }

    log(COLORS.cyan, `\n🔍 Testing: ${method} ${path}`);
    if (description) {
      log(COLORS.blue, `   ${description}`);
    }

    const startTime = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (response.status === expectedStatus) {
      log(COLORS.green, `   ✅ PASS (${response.status}) - ${duration}ms`);
      if (data && typeof data === 'object') {
        console.log('   Response:', JSON.stringify(data, null, 2).split('\n').slice(0, 10).join('\n'));
      }
      passed++;
      return { success: true, data, duration };
    } else {
      log(COLORS.red, `   ❌ FAIL - Expected ${expectedStatus}, got ${response.status}`);
      console.log('   Response:', data);
      failed++;
      return { success: false, data, duration };
    }
  } catch (error) {
    log(COLORS.red, `   ❌ ERROR: ${error.message}`);
    failed++;
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log(COLORS.blue, '\n' + '='.repeat(80));
  log(COLORS.blue, '🧪 CLIENT SERVICES ENDPOINTS TEST SUITE');
  log(COLORS.blue, '='.repeat(80));
  log(COLORS.cyan, `Testing API at: ${BASE_URL}\n`);

  // ============================================================================
  // HEALTH & STATUS ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n📊 HEALTH & STATUS ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  await testEndpoint('GET', '/status/health', null, 200, 'Basic health check');
  await testEndpoint('GET', '/api/health', null, 200, 'API health status');
  await testEndpoint('GET', '/api/system/status', null, 200, 'System status with metrics');
  await testEndpoint('GET', '/api/system/health', null, 200, 'System health');

  // ============================================================================
  // MARKET DATA ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n💰 MARKET DATA ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  await testEndpoint('GET', '/api/market', null, 200, 'Top cryptocurrencies (BTC, ETH, BNB)');
  await testEndpoint('GET', '/api/market/history?symbol=BTC&timeframe=1h&limit=10', null, 200, 'Price history from database');
  await testEndpoint('GET', '/api/market/prices?symbols=BTC,ETH,BNB&limit=3', null, 200, 'Market prices for multiple symbols');
  await testEndpoint('GET', '/api/trending', null, 200, 'Trending coins');

  // ============================================================================
  // SENTIMENT ANALYSIS ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n😊 SENTIMENT ANALYSIS ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  await testEndpoint('GET', '/api/sentiment', null, 200, 'Fear & Greed Index');
  await testEndpoint('POST', '/api/sentiment/analyze', { text: 'Bitcoin is going to the moon!' }, 200, 'Analyze sentiment');
  await testEndpoint('GET', '/api/sentiment/history?limit=10', null, 200, 'Sentiment history');

  // ============================================================================
  // AI MODELS ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n🤖 AI MODELS ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  await testEndpoint('GET', '/api/models/status', null, 200, 'AI models status');
  await testEndpoint('GET', '/api/models/list', null, 200, 'List all available models');

  // ============================================================================
  // NEWS ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n📰 NEWS ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  await testEndpoint('GET', '/api/news?limit=5', null, 200, 'Get news articles');
  await testEndpoint('GET', '/api/news/latest?limit=5', null, 200, 'Latest analyzed news');

  // ============================================================================
  // TRADING ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n📈 TRADING ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  await testEndpoint('POST', '/api/trading/decision', { symbol: 'BTC', timeframe: '1h' }, 200, 'Get AI trading decision');
  await testEndpoint('GET', '/api/trading/portfolio', null, 200, 'Get portfolio');

  // ============================================================================
  // RESOURCES & PROVIDERS ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n🔌 RESOURCES & PROVIDERS ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  await testEndpoint('GET', '/api/resources', null, 200, 'Get all API resources');
  await testEndpoint('GET', '/api/resources/summary', null, 200, 'Resources summary');
  await testEndpoint('GET', '/api/resources/apis', null, 200, 'API registry');
  await testEndpoint('GET', '/api/providers/status', null, 200, 'List all data providers');
  await testEndpoint('GET', '/api/providers/categories', null, 200, 'Provider categories');

  // ============================================================================
  // DIAGNOSTICS & MONITORING ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n🔧 DIAGNOSTICS & MONITORING ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  await testEndpoint('GET', '/api/diagnostics/health', null, 200, 'Comprehensive health diagnostics');
  await testEndpoint('GET', '/debug-info', null, 200, 'Debug information');
  await testEndpoint('GET', '/api/logs/recent?limit=10', null, 200, 'Recent system logs');
  await testEndpoint('GET', '/api/logs/errors?limit=5', null, 200, 'Error logs');

  // ============================================================================
  // ALERTS ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n🔔 ALERTS ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  await testEndpoint('GET', '/api/alerts', null, 200, 'Get all alerts');
  await testEndpoint('GET', '/api/alerts/analytics', null, 200, 'Alert analytics');

  // ============================================================================
  // SIGNALS ENDPOINTS
  // ============================================================================
  log(COLORS.yellow, '\n🎯 SIGNALS ENDPOINTS');
  log(COLORS.yellow, '-'.repeat(80));

  await testEndpoint('POST', '/api/signals/analyze', { symbol: 'BTC', timeframe: '1h', bars: 100 }, 200, 'Analyze signals');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  log(COLORS.blue, '\n' + '='.repeat(80));
  log(COLORS.blue, '📊 TEST SUMMARY');
  log(COLORS.blue, '='.repeat(80));
  
  const total = passed + failed + skipped;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  
  log(COLORS.green, `✅ Passed: ${passed}`);
  log(COLORS.red, `❌ Failed: ${failed}`);
  log(COLORS.yellow, `⏭️  Skipped: ${skipped}`);
  log(COLORS.cyan, `📈 Pass Rate: ${passRate}%`);
  log(COLORS.blue, '='.repeat(80) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(COLORS.red, '\n💥 Test suite failed:', error);
  process.exit(1);
});

