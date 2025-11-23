#!/usr/bin/env tsx
/**
 * Full Strategy Pipeline Test Script
 * Tests the complete strategy pipeline with real data from multiple symbols
 *
 * Usage: npm run test:pipeline
 */

import dotenv from 'dotenv';
dotenv.config();

// Import pipeline and RealDataManager
import { runStrategyPipeline } from '../src/engine/pipeline.js';
import { RealDataManager } from '../src/services/RealDataManager.js';
import { Logger } from '../src/core/Logger.js';

const logger = Logger.getInstance();

// Test configuration
const TEST_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT'];
const TIMEFRAME = '1h';
const BAR_COUNT = 200;

async function testPipeline() {
  console.log('🚀 Full Strategy Pipeline Test');
  console.log('================================\n');

  const dataManager = RealDataManager.getInstance();
  let passedTests = 0;
  let failedTests = 0;
  const errors: Array<{ symbol: string; error: string }> = [];

  for (const symbol of TEST_SYMBOLS) {
    try {
      console.log(`\n📊 Testing ${symbol}...`);

      // Fetch OHLCV data
      const startTime = Date.now();
      const ohlcv = await dataManager.fetchOHLCV(symbol, TIMEFRAME, BAR_COUNT);
      const fetchTime = Date.now() - startTime;

      if (!ohlcv || ohlcv.length < 50) {
        throw new Error(`Insufficient data: got ${ohlcv?.length || 0} bars, need at least 50`);
      }

      console.log(`  ✓ Fetched ${ohlcv.length} bars in ${fetchTime}ms`);

      // Run strategy pipeline
      const pipelineStart = Date.now();
      const decision = await runStrategyPipeline(ohlcv, symbol);
      const pipelineTime = Date.now() - pipelineStart;

      console.log(`  ✓ Pipeline completed in ${pipelineTime}ms`);
      console.log(`  📈 Action: ${decision.action}`);
      console.log(`  📊 Score: ${decision.score.toFixed(3)}`);
      console.log(`  🎯 Confidence: ${decision.confidence.toFixed(3)}`);

      if (decision.reasoning && decision.reasoning.length > 0) {
        console.log(`  💡 Top Reasons:`);
        decision.reasoning.slice(0, 3).forEach((reason, idx) => {
          console.log(`     ${idx + 1}. ${reason}`);
        });
      }

      // Validate decision structure
      if (!decision.action || !['BUY', 'SELL', 'HOLD'].includes(decision.action)) {
        throw new Error(`Invalid action: ${decision.action}`);
      }

      if (typeof decision.score !== 'number' || isNaN(decision.score)) {
        throw new Error(`Invalid score: ${decision.score}`);
      }

      if (typeof decision.confidence !== 'number' || isNaN(decision.confidence)) {
        throw new Error(`Invalid confidence: ${decision.confidence}`);
      }

      passedTests++;
      console.log(`  ✅ ${symbol} PASSED`);

    } catch (error: any) {
      failedTests++;
      const errorMsg = error?.message || String(error);
      errors.push({ symbol, error: errorMsg });
      console.log(`  ❌ ${symbol} FAILED: ${errorMsg}`);
      logger.error(`Pipeline test failed for ${symbol}`, {}, error);
    }
  }

  // Summary
  console.log('\n================================');
  console.log('📋 Test Summary');
  console.log('================================');
  console.log(`Total symbols tested: ${TEST_SYMBOLS.length}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ symbol, error }) => {
      console.log(`  - ${symbol}: ${error}`);
    });
  }

  // Exit with appropriate code
  if (failedTests > 0) {
    console.log('\n⚠️  Some tests failed. Review errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests
testPipeline().catch((error) => {
  console.error('❌ Fatal error running pipeline tests:', error);
  process.exit(1);
});
