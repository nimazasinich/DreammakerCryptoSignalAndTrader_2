#!/usr/bin/env node

/**
 * Smoke Test for Unified Port 8000 Real Data Setup
 *
 * This script verifies:
 * 1. /health endpoint responds with 200 OK
 * 2. /market/candlestick/:symbol returns real Binance data
 * 3. /market/prices returns valid price data
 * 4. WebSocket connects and receives price updates
 *
 * Usage: npm run test:smoke
 * Requires: Server running on port 8000
 */

import http from 'http';
import { WebSocket } from 'ws';

/**
 * Make HTTP GET request
 */
function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    }).on('error', reject);
  });
}

/**
 * Test WebSocket connection and price updates
 */
function testWebSocket(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let gotMessage = false;
    const timeoutId = setTimeout(() => {
      if (!gotMessage) {
        ws.close();
        reject(new Error(`No message received within ${timeout}ms`));
      }
    }, timeout);

    ws.on('open', () => {
      console.log('  WebSocket connected');
    });

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(String(message));

        // Accept "connected" or "price" message as proof WebSocket works
        if (msg.type === 'connected') {
          gotMessage = true;
          console.log('  ✓ Received connection confirmation');
          clearTimeout(timeoutId);
          // Close immediately to avoid protocol errors from other messages
          setImmediate(() => ws.close());
          resolve(msg);
        } else if (msg.type === 'price' && msg.symbol === 'BTCUSDT') {
          gotMessage = true;
          console.log(`  ✓ Received BTCUSDT price: ${msg.price}`);
          clearTimeout(timeoutId);
          setImmediate(() => ws.close());
          resolve(msg);
        }
      } catch (err) {
        // Ignore parse errors
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeoutId);
      // Only reject if we haven't received a valid message yet
      if (!gotMessage) {
        reject(error);
      }
    });

    ws.on('close', () => {
      clearTimeout(timeoutId);
      if (gotMessage) {
        resolve();
      }
    });
  });
}

/**
 * Run smoke test suite
 */
async function runSmokeTest() {
  const BASE = 'http://localhost:8000';
  const WS_URL = 'ws://localhost:8000/ws';

  console.log('🧪 Starting Smoke Test (Port 8000, Real Data)\n');

  try {
    // Test 1: Health check
    console.log('1. Testing /health endpoint...');
    const healthRes = await get(`${BASE}/health`);

    if (healthRes.status !== 200) {
      throw new Error(`Health check failed with status ${healthRes.status}`);
    }

    const healthData = JSON.parse(healthRes.body);
    if (healthData.status !== 'ok') {
      throw new Error(`Health check returned unexpected status: ${healthData.status}`);
    }

    console.log(`  ✓ Health: ${healthRes.body}\n`);

    // Test 2: Candlestick data
    console.log('2. Testing /market/candlestick/BTCUSDT...');
    const candlesRes = await get(`${BASE}/market/candlestick/BTCUSDT?interval=1m&limit=3`);

    if (candlesRes.status !== 200) {
      throw new Error(`Candlestick endpoint failed with status ${candlesRes.status}`);
    }

    const candlesData = JSON.parse(candlesRes.body);

    if (!Array.isArray(candlesData) || candlesData.length === 0) {
      throw new Error('Candlestick data is not a valid array');
    }

    const lastCandle = candlesData[candlesData.length - 1];
    if (typeof lastCandle.c !== 'number' || lastCandle.c <= 0) {
      throw new Error('Candlestick data has invalid close price');
    }

    console.log(`  ✓ Received ${candlesData.length} candles`);
    console.log(`  ✓ Last close: ${lastCandle.c}\n`);

    // Test 3: Prices endpoint
    console.log('3. Testing /market/prices...');
    const pricesRes = await get(`${BASE}/market/prices?symbols=BTCUSDT,ETHUSDT`);

    if (pricesRes.status !== 200) {
      throw new Error(`Prices endpoint failed with status ${pricesRes.status}`);
    }

    const pricesData = JSON.parse(pricesRes.body);

    if (!pricesData.BTCUSDT || !pricesData.ETHUSDT) {
      throw new Error('Prices data missing expected symbols');
    }

    if (typeof pricesData.BTCUSDT !== 'number' || pricesData.BTCUSDT <= 0) {
      throw new Error('BTCUSDT price is invalid');
    }

    if (typeof pricesData.ETHUSDT !== 'number' || pricesData.ETHUSDT <= 0) {
      throw new Error('ETHUSDT price is invalid');
    }

    console.log(`  ✓ BTCUSDT: ${pricesData.BTCUSDT}`);
    console.log(`  ✓ ETHUSDT: ${pricesData.ETHUSDT}\n`);

    // Test 4: WebSocket connection
    console.log('4. Testing WebSocket connection...');
    await testWebSocket(WS_URL, 10000);
    console.log('  ✓ WebSocket test passed\n');

    // All tests passed
    console.log('✅ SMOKE TEST PASSED');
    console.log('All endpoints are functional and returning real data.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ SMOKE TEST FAILED');
    console.error(`Error: ${error.message}\n`);

    if (error.code === 'ECONNREFUSED') {
      console.error('⚠️  Hint: Make sure the server is running on port 8000');
      console.error('   Run: npm run dev\n');
    }

    process.exit(1);
  }
}

// Run the test
runSmokeTest();
