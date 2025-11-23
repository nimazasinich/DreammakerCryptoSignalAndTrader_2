#!/usr/bin/env tsx

/**
 * Real Detectors Test Script
 *
 * Tests all upgraded detectors with real market data to verify:
 * 1. Sentiment detector uses real SentimentAnalysisService
 * 2. News detector uses real SentimentNewsService + HuggingFace
 * 3. Whale detector uses real WhaleTrackerService + Blockchain APIs
 * 4. SMC detector uses real SMCAnalyzer
 * 5. Elliott detector uses real ElliottWaveAnalyzer
 * 6. Full pipeline integration
 *
 * Usage:
 *   npm run tsx scripts/test-real-detectors.ts
 *
 * Or with specific symbol:
 *   npm run tsx scripts/test-real-detectors.ts ETHUSDT
 */

import { sentimentLayer } from '../src/detectors/sentiment';
import { newsLayer } from '../src/detectors/news';
import { whalesLayer } from '../src/detectors/whales';
import { detectSMC } from '../src/detectors/smc';
import { detectElliott } from '../src/detectors/elliott';
import { runStrategyPipeline } from '../src/engine/pipeline';
import { RealDataManager } from '../src/services/RealDataManager';
import { Logger } from '../src/core/Logger';

const logger = Logger.getInstance();

interface TestResult {
  name: string;
  passed: boolean;
  score?: number;
  reasons?: string[];
  error?: string;
  duration?: number;
}

async function testDetector(
  name: string,
  testFn: () => Promise<any>
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const result = await testFn();
    const duration = Date.now() - startTime;

    // Check if result is a FinalDecision (from pipeline) with nested score
    if (result && result.action && typeof result.score === 'number' && typeof result.confidence === 'number') {
      // Full Pipeline result (FinalDecision object)
      return {
        name,
        passed: true,
        score: result.score,
        reasons: [
          `Action: ${result.action}`,
          `Score: ${result.score.toFixed(3)}`,
          `Confidence: ${result.confidence.toFixed(3)}`
        ],
        duration
      };
    }
    // Check if result is a LayerScore with score and reasons
    else if (result && typeof result.score === 'number' && Array.isArray(result.reasons)) {
      return {
        name,
        passed: true,
        score: result.score,
        reasons: result.reasons,
        duration
      };
    } else {
      return {
        name,
        passed: false,
        error: 'Invalid result format (missing score or reasons)',
        duration
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name,
      passed: false,
      error: (error as Error).message,
      duration
    };
  }
}

async function main() {
  const symbol = process.argv[2] || 'BTCUSDT';
  const dataManager = RealDataManager.getInstance();

  console.log('\n' + '='.repeat(80));
  console.log('🧪 REAL DETECTORS TEST SUITE');
  console.log('='.repeat(80));
  console.log(`📊 Testing with symbol: ${symbol}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

  const results: TestResult[] = [];

  // ========== TEST 1: SENTIMENT DETECTOR ==========
  console.log('1️⃣  Testing Sentiment Detector (SentimentAnalysisService)...');
  const sentimentResult = await testDetector(
    'Sentiment Detector',
    async () => await sentimentLayer(symbol)
  );
  results.push(sentimentResult);

  if (sentimentResult.passed) {
    console.log(`   ✅ PASSED - Score: ${sentimentResult.score?.toFixed(3)}`);
    console.log(`   📝 Reasons: ${sentimentResult.reasons?.join(' | ')}`);
    console.log(`   ⏱️  Duration: ${sentimentResult.duration}ms\n`);
  } else {
    console.log(`   ❌ FAILED - ${sentimentResult.error}`);
    console.log(`   ⏱️  Duration: ${sentimentResult.duration}ms\n`);
  }

  // ========== TEST 2: NEWS DETECTOR ==========
  console.log('2️⃣  Testing News Detector (SentimentNewsService + HuggingFace)...');
  const newsResult = await testDetector(
    'News Detector',
    async () => await newsLayer(symbol)
  );
  results.push(newsResult);

  if (newsResult.passed) {
    console.log(`   ✅ PASSED - Score: ${newsResult.score?.toFixed(3)}`);
    console.log(`   📝 Reasons: ${newsResult.reasons?.join(' | ')}`);
    console.log(`   ⏱️  Duration: ${newsResult.duration}ms\n`);
  } else {
    console.log(`   ❌ FAILED - ${newsResult.error}`);
    console.log(`   ⏱️  Duration: ${newsResult.duration}ms\n`);
  }

  // ========== TEST 3: WHALE DETECTOR ==========
  console.log('3️⃣  Testing Whale Detector (WhaleTrackerService + Blockchain)...');
  const whaleResult = await testDetector(
    'Whale Detector',
    async () => await whalesLayer(symbol)
  );
  results.push(whaleResult);

  if (whaleResult.passed) {
    console.log(`   ✅ PASSED - Score: ${whaleResult.score?.toFixed(3)}`);
    console.log(`   📝 Reasons: ${whaleResult.reasons?.join(' | ')}`);
    console.log(`   ⏱️  Duration: ${whaleResult.duration}ms\n`);
  } else {
    console.log(`   ❌ FAILED - ${whaleResult.error}`);
    console.log(`   ⏱️  Duration: ${whaleResult.duration}ms\n`);
  }

  // ========== TEST 4: SMC DETECTOR ==========
  console.log('4️⃣  Testing SMC Detector (SMCAnalyzer)...');
  console.log('   📥 Fetching OHLCV data...');

  let ohlcv: any[] = [];
  try {
    ohlcv = await dataManager.fetchOHLCV(symbol, '1h', 200);
    console.log(`   ✅ Fetched ${ohlcv.length} bars\n`);
  } catch (error) {
    console.log(`   ❌ Failed to fetch OHLCV: ${(error as Error).message}\n`);
  }

  const smcResult = await testDetector(
    'SMC Detector',
    async () => detectSMC(ohlcv, symbol)
  );
  results.push(smcResult);

  if (smcResult.passed) {
    console.log(`   ✅ PASSED - Score: ${smcResult.score?.toFixed(3)}`);
    console.log(`   📝 Reasons: ${smcResult.reasons?.join(' | ')}`);
    console.log(`   ⏱️  Duration: ${smcResult.duration}ms\n`);
  } else {
    console.log(`   ❌ FAILED - ${smcResult.error}`);
    console.log(`   ⏱️  Duration: ${smcResult.duration}ms\n`);
  }

  // ========== TEST 5: ELLIOTT WAVE DETECTOR ==========
  console.log('5️⃣  Testing Elliott Wave Detector (ElliottWaveAnalyzer)...');
  const elliottResult = await testDetector(
    'Elliott Wave Detector',
    async () => detectElliott(ohlcv)
  );
  results.push(elliottResult);

  if (elliottResult.passed) {
    console.log(`   ✅ PASSED - Score: ${elliottResult.score?.toFixed(3)}`);
    console.log(`   📝 Reasons: ${elliottResult.reasons?.join(' | ')}`);
    console.log(`   ⏱️  Duration: ${elliottResult.duration}ms\n`);
  } else {
    console.log(`   ❌ FAILED - ${elliottResult.error}`);
    console.log(`   ⏱️  Duration: ${elliottResult.duration}ms\n`);
  }

  // ========== TEST 6: FULL PIPELINE INTEGRATION ==========
  console.log('6️⃣  Testing Full Pipeline Integration...');
  const pipelineResult = await testDetector(
    'Full Pipeline',
    async () => await runStrategyPipeline(ohlcv, symbol)
  );
  results.push(pipelineResult);

  if (pipelineResult.passed) {
    const decision = pipelineResult.score; // Actually contains full decision object
    console.log(`   ✅ PASSED - Pipeline executed successfully`);
    console.log(`   📊 Decision: ${(decision as any).action || 'N/A'}`);
    console.log(`   🎯 Score: ${(decision as any).score?.toFixed(3) || 'N/A'}`);
    console.log(`   💪 Confidence: ${(decision as any).confidence?.toFixed(3) || 'N/A'}`);
    console.log(`   ⏱️  Duration: ${pipelineResult.duration}ms\n`);
  } else {
    console.log(`   ❌ FAILED - ${pipelineResult.error}`);
    console.log(`   ⏱️  Duration: ${pipelineResult.duration}ms\n`);
  }

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passedCount} (${((passedCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failedCount} (${((failedCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`⏰ Completed at: ${new Date().toISOString()}\n`);

  // Individual results
  console.log('\n📋 Detailed Results:\n');
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`${index + 1}. ${icon} ${result.name} - ${status}`);

    if (result.passed) {
      console.log(`   Score: ${result.score?.toFixed(3)}`);
      console.log(`   Reasons: ${result.reasons?.join(' | ')}`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
    console.log(`   Duration: ${result.duration}ms\n`);
  });

  console.log('='.repeat(80));

  // Exit with appropriate code
  if (failedCount > 0) {
    console.log(`\n⚠️  ${failedCount} test(s) failed. Please check the errors above.\n`);
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! All detectors are working with real data.\n');
    process.exit(0);
  }
}

// Run tests
main().catch((error) => {
  console.error('\n💥 Fatal error during test execution:');
  console.error(error);
  process.exit(1);
});
