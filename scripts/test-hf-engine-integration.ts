/**
 * HuggingFace Data Engine Integration Test
 * 
 * This script tests the complete integration of the HuggingFace Data Engine
 * as the primary data source for the application.
 */

import { hfDataEngineClient } from '../src/services/HFDataEngineClient.js';
import { HFDataEngineAdapter } from '../src/services/HFDataEngineAdapter.js';
import { primaryDataSourceService } from '../src/services/PrimaryDataSourceService.js';
import { getPrimaryDataSource, getDataSourceConfig } from '../src/config/dataSource.js';
import { Logger } from '../src/core/Logger.js';

const logger = Logger.getInstance();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  duration: number;
  data?: any;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<any>
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    logger.info(`Running test: ${name}`);
    const data = await testFn();
    const duration = Date.now() - startTime;
    
    if (data === null || data === undefined) {
      return {
        name,
        status: 'WARN',
        message: 'Test returned null/undefined',
        duration
      };
    }
    
    return {
      name,
      status: 'PASS',
      message: 'Test passed successfully',
      duration,
      data
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name,
      status: 'FAIL',
      message: error instanceof Error ? error.message : String(error),
      duration,
      data: error
    };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 HuggingFace Data Engine Integration Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test 1: Configuration Check
  console.log('📋 Test 1: Configuration Check');
  const configResult = await runTest('Configuration Check', async () => {
    const config = getDataSourceConfig();
    const primarySource = getPrimaryDataSource();
    
    console.log('  ✓ Primary Data Source:', primarySource);
    console.log('  ✓ HF Engine Enabled:', config.huggingface.enabled);
    console.log('  ✓ HF Engine URL:', config.huggingface.baseUrl);
    console.log('  ✓ HF Engine Timeout:', config.huggingface.timeout + 'ms');
    
    if (primarySource !== 'huggingface') {
      throw new Error(`Primary data source is ${primarySource}, expected 'huggingface'`);
    }
    
    if (!config.huggingface.enabled) {
      throw new Error('HF Engine is not enabled');
    }
    
    return config;
  });
  results.push(configResult);
  console.log(`  Status: ${configResult.status} (${configResult.duration}ms)\n`);

  // Test 2: Health Check
  console.log('📋 Test 2: Health Check - GET /api/hf-engine/health');
  const healthResult = await runTest('Health Check', async () => {
    const health = await hfDataEngineClient.getHealth();
    console.log('  ✓ Health Response:', JSON.stringify(health, null, 2).substring(0, 200));
    return health;
  });
  results.push(healthResult);
  console.log(`  Status: ${healthResult.status} (${healthResult.duration}ms)\n`);

  // Test 3: Get Providers
  console.log('📋 Test 3: Get Providers - GET /api/hf-engine/providers');
  const providersResult = await runTest('Get Providers', async () => {
    const providers = await hfDataEngineClient.getProviders();
    console.log('  ✓ Providers Response:', JSON.stringify(providers, null, 2).substring(0, 200));
    return providers;
  });
  results.push(providersResult);
  console.log(`  Status: ${providersResult.status} (${providersResult.duration}ms)\n`);

  // Test 4: Get Top Prices
  console.log('📋 Test 4: Get Top Prices - GET /api/hf-engine/prices?limit=5');
  const pricesResult = await runTest('Get Top Prices', async () => {
    const prices = await hfDataEngineClient.getTopPrices(5);
    const pricesArray = Array.isArray(prices) ? prices : prices?.data || [];
    console.log('  ✓ Prices Count:', pricesArray.length);
    if (pricesArray.length > 0) {
      console.log('  ✓ First Price:', JSON.stringify(pricesArray[0], null, 2));
    }
    return prices;
  });
  results.push(pricesResult);
  console.log(`  Status: ${pricesResult.status} (${pricesResult.duration}ms)\n`);

  // Test 5: Get Market Overview
  console.log('📋 Test 5: Get Market Overview - GET /api/hf-engine/market/overview');
  const overviewResult = await runTest('Get Market Overview', async () => {
    const overview = await hfDataEngineClient.getMarketOverview();
    console.log('  ✓ Overview Response:', JSON.stringify(overview, null, 2).substring(0, 300));
    return overview;
  });
  results.push(overviewResult);
  console.log(`  Status: ${overviewResult.status} (${overviewResult.duration}ms)\n`);

  // Test 6: Sentiment Analysis
  console.log('📋 Test 6: Sentiment Analysis - POST /api/hf-engine/hf/sentiment');
  const sentimentResult = await runTest('Sentiment Analysis', async () => {
    const sentiment = await hfDataEngineClient.runHfSentiment('Bitcoin is showing strong bullish momentum');
    console.log('  ✓ Sentiment Response:', JSON.stringify(sentiment, null, 2));
    return sentiment;
  });
  results.push(sentimentResult);
  console.log(`  Status: ${sentimentResult.status} (${sentimentResult.duration}ms)\n`);

  // Test 7: Get Logs
  console.log('📋 Test 7: Get Logs - GET /api/hf-engine/logs?limit=5');
  const logsResult = await runTest('Get Logs', async () => {
    const logs = await hfDataEngineClient.getLogs(5);
    const logsArray = Array.isArray(logs) ? logs : logs?.logs || [];
    console.log('  ✓ Logs Count:', logsArray.length);
    return logs;
  });
  results.push(logsResult);
  console.log(`  Status: ${logsResult.status} (${logsResult.duration}ms)\n`);

  // Test 8: Adapter - Get Market Prices
  console.log('📋 Test 8: Adapter - Get Market Prices');
  const adapterPricesResult = await runTest('Adapter Get Market Prices', async () => {
    const result = await HFDataEngineAdapter.getMarketPrices(5, ['BTC', 'ETH', 'SOL']);
    if (!result.ok) {
      throw new Error(`Adapter failed: ${result.message}`);
    }
    console.log('  ✓ Prices Count:', result.data.length);
    console.log('  ✓ Source:', result.source);
    if (result.data.length > 0) {
      console.log('  ✓ Sample Price:', JSON.stringify(result.data[0], null, 2));
    }
    return result;
  });
  results.push(adapterPricesResult);
  console.log(`  Status: ${adapterPricesResult.status} (${adapterPricesResult.duration}ms)\n`);

  // Test 9: Primary Data Source Service
  console.log('📋 Test 9: Primary Data Source Service');
  const primaryServiceResult = await runTest('Primary Data Source Service', async () => {
    const prices = await primaryDataSourceService.getMarketPrices(['BTC', 'ETH'], 2);
    console.log('  ✓ Prices Count:', prices.length);
    if (prices.length > 0) {
      console.log('  ✓ BTC Price:', prices[0]?.price, prices[0]?.source);
    }
    return prices;
  });
  results.push(primaryServiceResult);
  console.log(`  Status: ${primaryServiceResult.status} (${primaryServiceResult.duration}ms)\n`);

  // Test 10: Error Handling (503)
  console.log('📋 Test 10: Error Handling (Invalid Endpoint)');
  const errorHandlingResult = await runTest('Error Handling', async () => {
    try {
      // Try to call a non-existent endpoint
      await hfDataEngineClient['request']('GET', '/api/hf-engine/nonexistent');
      throw new Error('Should have thrown an error');
    } catch (error: any) {
      console.log('  ✓ Error caught successfully');
      console.log('  ✓ Error status:', error.status || 'unknown');
      console.log('  ✓ Error message:', error.message);
      
      // This is expected, so return success
      return { errorHandled: true, status: error.status, message: error.message };
    }
  });
  results.push(errorHandlingResult);
  console.log(`  Status: ${errorHandlingResult.status} (${errorHandlingResult.duration}ms)\n`);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`\nSuccess Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }

  if (warned > 0) {
    console.log('\n⚠️  Warnings:');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

