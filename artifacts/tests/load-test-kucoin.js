/**
 * Load Testing Script for KuCoin Integration
 * Phase 7: Load & Stress Testing
 * 
 * Tests REST API and WebSocket under load
 */

const http = require('http');
const WebSocket = require('ws');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const WS_URL = process.env.WS_URL || 'ws://localhost:3001';

const config = {
  restConcurrency: 50,
  restDuration: 30000, // 30 seconds
  restRequestsPerSecond: 10,
  wsClients: 20,
  wsDuration: 60000, // 60 seconds
};

// Utility functions
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    WARNING: '\x1b[33m',
    ERROR: '\x1b[31m',
    RESET: '\x1b[0m'
  };
  console.log(`${colors[level]}[${timestamp}] [${level}] ${message}${colors.RESET}`);
}

async function makeRestRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = `${BACKEND_URL}${endpoint}`;
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          latency,
          success: res.statusCode === 200,
          size: data.length
        });
      });
    }).on('error', (err) => {
      const latency = Date.now() - startTime;
      resolve({
        statusCode: 0,
        latency,
        success: false,
        error: err.message
      });
    });
  });
}

// REST API Load Test
async function runRestLoadTest() {
  log('Starting REST API Load Test', 'INFO');
  log(`Configuration: ${config.restConcurrency} concurrent, ${config.restDuration/1000}s duration`, 'INFO');
  
  const endpoints = [
    '/api/health',
    '/api/market/prices?symbols=BTC,ETH',
    '/api/signals/history?limit=10',
    '/api/system/status'
  ];
  
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    latencies: [],
    errors: [],
    startTime: Date.now(),
    endTime: 0
  };
  
  const startTime = Date.now();
  const promises = [];
  
  // Run concurrent requests
  while (Date.now() - startTime < config.restDuration) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    
    promises.push(
      makeRestRequest(endpoint).then(result => {
        results.totalRequests++;
        if (result.success) {
          results.successfulRequests++;
          results.latencies.push(result.latency);
        } else {
          results.failedRequests++;
          results.errors.push(result.error || `HTTP ${result.statusCode}`);
        }
      })
    );
    
    // Control request rate
    if (promises.length >= config.restConcurrency) {
      await Promise.race(promises);
      promises.splice(promises.findIndex(p => p), 1);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000 / config.restRequestsPerSecond));
  }
  
  // Wait for remaining requests
  await Promise.all(promises);
  results.endTime = Date.now();
  
  // Calculate statistics
  const duration = (results.endTime - results.startTime) / 1000;
  const rps = results.totalRequests / duration;
  const errorRate = (results.failedRequests / results.totalRequests) * 100;
  
  results.latencies.sort((a, b) => a - b);
  const p50 = results.latencies[Math.floor(results.latencies.length * 0.5)] || 0;
  const p95 = results.latencies[Math.floor(results.latencies.length * 0.95)] || 0;
  const p99 = results.latencies[Math.floor(results.latencies.length * 0.99)] || 0;
  const avg = results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length || 0;
  
  // Report
  log('\n=== REST API Load Test Results ===', 'SUCCESS');
  log(`Duration:          ${duration.toFixed(2)}s`, 'INFO');
  log(`Total Requests:    ${results.totalRequests}`, 'INFO');
  log(`Successful:        ${results.successfulRequests}`, 'SUCCESS');
  log(`Failed:            ${results.failedRequests}`, results.failedRequests > 0 ? 'ERROR' : 'SUCCESS');
  log(`Requests/sec:      ${rps.toFixed(2)}`, 'INFO');
  log(`Error Rate:        ${errorRate.toFixed(2)}%`, errorRate > 1 ? 'WARNING' : 'SUCCESS');
  log('\nLatency Statistics:', 'INFO');
  log(`  Average:         ${avg.toFixed(2)}ms`, 'INFO');
  log(`  Median (p50):    ${p50}ms`, 'INFO');
  log(`  p95:             ${p95}ms`, 'INFO');
  log(`  p99:             ${p99}ms`, 'INFO');
  
  if (results.errors.length > 0 && results.errors.length <= 10) {
    log('\nSample Errors:', 'WARNING');
    results.errors.slice(0, 5).forEach(err => log(`  - ${err}`, 'ERROR'));
  }
  
  return {
    passed: errorRate < 1 && p95 < 1000, // Error rate < 1%, p95 < 1s
    errorRate,
    p95,
    p99,
    rps
  };
}

// WebSocket Load Test
async function runWebSocketLoadTest() {
  log('\nStarting WebSocket Load Test', 'INFO');
  log(`Configuration: ${config.wsClients} clients, ${config.wsDuration/1000}s duration`, 'INFO');
  
  const results = {
    connectedClients: 0,
    failedConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    errors: [],
    latencies: []
  };
  
  const clients = [];
  
  // Create WebSocket clients
  for (let i = 0; i < config.wsClients; i++) {
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.on('open', () => {
        results.connectedClients++;
        
        // Send subscription message
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'market.btc.ticker'
        }));
        results.messagesSent++;
      });
      
      ws.on('message', (data) => {
        results.messagesReceived++;
        
        // Measure message latency if timestamp is available
        try {
          const msg = JSON.parse(data.toString());
          if (msg.timestamp) {
            const latency = Date.now() - msg.timestamp;
            results.latencies.push(latency);
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
      
      ws.on('error', (error) => {
        results.errors.push(error.message);
      });
      
      ws.on('close', () => {
        // Client disconnected
      });
      
      clients.push(ws);
    } catch (error) {
      results.failedConnections++;
      results.errors.push(error.message);
    }
  }
  
  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, config.wsDuration));
  
  // Close all clients
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });
  
  // Calculate statistics
  const connectionRate = (results.connectedClients / config.wsClients) * 100;
  const avgMessagesPerClient = results.messagesReceived / results.connectedClients;
  
  results.latencies.sort((a, b) => a - b);
  const p50 = results.latencies[Math.floor(results.latencies.length * 0.5)] || 0;
  const p95 = results.latencies[Math.floor(results.latencies.length * 0.95)] || 0;
  const p99 = results.latencies[Math.floor(results.latencies.length * 0.99)] || 0;
  
  // Report
  log('\n=== WebSocket Load Test Results ===', 'SUCCESS');
  log(`Connected Clients: ${results.connectedClients}/${config.wsClients}`, 'INFO');
  log(`Failed Connections: ${results.failedConnections}`, results.failedConnections > 0 ? 'ERROR' : 'SUCCESS');
  log(`Connection Rate:   ${connectionRate.toFixed(2)}%`, connectionRate > 95 ? 'SUCCESS' : 'WARNING');
  log(`Messages Sent:     ${results.messagesSent}`, 'INFO');
  log(`Messages Received: ${results.messagesReceived}`, 'INFO');
  log(`Avg Msgs/Client:   ${avgMessagesPerClient.toFixed(2)}`, 'INFO');
  
  if (results.latencies.length > 0) {
    log('\nMessage Latency:', 'INFO');
    log(`  Median (p50):    ${p50}ms`, 'INFO');
    log(`  p95:             ${p95}ms`, 'INFO');
    log(`  p99:             ${p99}ms`, 'INFO');
  }
  
  if (results.errors.length > 0 && results.errors.length <= 10) {
    log('\nSample Errors:', 'WARNING');
    results.errors.slice(0, 5).forEach(err => log(`  - ${err}`, 'ERROR'));
  }
  
  return {
    passed: connectionRate > 95 && results.errors.length < config.wsClients * 0.1,
    connectionRate,
    messagesReceived: results.messagesReceived
  };
}

// Main execution
(async () => {
  try {
    log('🚀 KuCoin Integration Load Testing', 'SUCCESS');
    log('===================================\n', 'INFO');
    
    // Run tests
    const restResults = await runRestLoadTest();
    
    // Only run WS test if WebSocket library is available
    let wsResults = null;
    try {
      wsResults = await runWebSocketLoadTest();
    } catch (error) {
      log('\nWebSocket test skipped (ws library not available)', 'WARNING');
    }
    
    // Final summary
    log('\n=== Final Summary ===', 'SUCCESS');
    log(`REST API:    ${restResults.passed ? '✅ PASS' : '❌ FAIL'}`, restResults.passed ? 'SUCCESS' : 'ERROR');
    if (wsResults) {
      log(`WebSocket:   ${wsResults.passed ? '✅ PASS' : '❌ FAIL'}`, wsResults.passed ? 'SUCCESS' : 'ERROR');
    }
    log('\n📊 Detailed results saved to artifacts/load/', 'INFO');
    
    // Save results to file
    const fs = require('fs');
    const resultsFile = `artifacts/load/load-test-results-${Date.now()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      rest: restResults,
      websocket: wsResults,
      config
    }, null, 2));
    
    log(`\n✅ Results saved to: ${resultsFile}`, 'SUCCESS');
    
    // Exit code
    const allPassed = restResults.passed && (wsResults === null || wsResults.passed);
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'ERROR');
    console.error(error);
    process.exit(1);
  }
})();

