#!/usr/bin/env tsx
/**
 * API Health Check Script
 *
 * Tests all configured API endpoints and generates a comprehensive health report
 * Usage: npm run test:api-health
 */

import { APIHealthChecker } from '../src/services/APIHealthChecker.js';
import { UnifiedDataService } from '../src/services/UnifiedDataService.js';
import { Logger } from '../src/core/Logger.js';

const logger = Logger.getInstance();

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         API Health Check & Validation Test Suite             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const healthChecker = APIHealthChecker.getInstance();
  const unifiedService = UnifiedDataService.getInstance();

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Quick Check of Essential APIs
  // ──────────────────────────────────────────────────────────────────────────

  console.log('⚡ Running quick check of essential APIs...\n');

  const quickCheck = await healthChecker.quickCheck();

  console.log('Quick Check Results:');
  console.log(`  Market Data: ${quickCheck.marketData ? '✅' : '❌'}`);
  console.log(`  Sentiment:   ${quickCheck.sentiment ? '✅' : '❌'}`);
  console.log(`  News:        ${quickCheck.news ? '✅' : '❌'}`);
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Functional Tests - Test Real API Calls
  // ──────────────────────────────────────────────────────────────────────────

  console.log('🧪 Running functional tests...\n');

  // Test 1: Get Bitcoin Price
  console.log('Test 1: Fetching Bitcoin price...');
  try {
    const btcPrice = await unifiedService.getPrice('BTC');
    console.log(`  ✅ Success: BTC = $${btcPrice.price.toLocaleString()} (source: ${btcPrice.source})`);
    console.log(`     Volume 24h: $${(btcPrice.volume24h || 0).toLocaleString()}`);
    console.log(`     Change 24h: ${(btcPrice.changePercent24h || 0).toFixed(2)}%`);
  } catch (error) {
    console.log(`  ❌ Failed: ${(error as Error).message}`);
  }
  console.log('');

  // Test 2: Get Multiple Prices
  console.log('Test 2: Fetching multiple cryptocurrency prices...');
  try {
    const symbols = ['BTC', 'ETH', 'BNB'];
    const prices = await unifiedService.getPrices(symbols);
    console.log(`  ✅ Success: Fetched ${prices.length} prices`);
    prices.forEach(p => {
      console.log(`     ${p.symbol}: $${p.price.toLocaleString()} (${p.source})`);
    });
  } catch (error) {
    console.log(`  ❌ Failed: ${(error as Error).message}`);
  }
  console.log('');

  // Test 3: Get Trending Cryptocurrencies
  console.log('Test 3: Fetching trending cryptocurrencies...');
  try {
    const trending = await unifiedService.getTrending();
    console.log(`  ✅ Success: Found ${trending.length} trending coins`);
    trending.slice(0, 5).forEach((coin, i) => {
      console.log(`     ${i + 1}. ${coin.name} (${coin.symbol}) - Rank: ${coin.rank}`);
    });
  } catch (error) {
    console.log(`  ❌ Failed: ${(error as Error).message}`);
  }
  console.log('');

  // Test 4: Get Fear & Greed Index
  console.log('Test 4: Fetching Fear & Greed Index...');
  try {
    const fearGreed = await unifiedService.getFearGreedIndex();
    console.log(`  ✅ Success: Fear & Greed = ${fearGreed.breakdown?.fearGreed} (${fearGreed.classification})`);
    console.log(`     Normalized: ${fearGreed.value} (-100 to +100 scale)`);
  } catch (error) {
    console.log(`  ❌ Failed: ${(error as Error).message}`);
  }
  console.log('');

  // Test 5: Get Crypto News
  console.log('Test 5: Fetching latest crypto news...');
  try {
    const news = await unifiedService.getNews(5);
    console.log(`  ✅ Success: Fetched ${news.length} news items`);
    news.forEach((item, i) => {
      console.log(`     ${i + 1}. ${item.title.substring(0, 60)}... (${item.source})`);
    });
  } catch (error) {
    console.log(`  ❌ Failed: ${(error as Error).message}`);
  }
  console.log('');

  // Test 6: Get Whale Transactions
  console.log('Test 6: Fetching whale transactions...');
  try {
    const whales = await unifiedService.getWhaleTransactions();
    console.log(`  ✅ Success: Found ${whales.length} whale transactions`);
    if (whales.length > 0) {
      whales.slice(0, 3).forEach((tx, i) => {
        console.log(`     ${i + 1}. ${tx.amount.toLocaleString()} ${tx.symbol} (${tx.blockchain})`);
      });
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${(error as Error).message}`);
  }
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Load Balancer Statistics
  // ──────────────────────────────────────────────────────────────────────────

  console.log('📊 Load Balancer Statistics:\n');

  const healthStatus = unifiedService.getHealthStatus();

  console.log('Market Data:');
  console.log(`  Total Requests: ${healthStatus.marketData.totalRequests}`);
  console.log(`  Successful: ${healthStatus.marketData.successfulRequests}`);
  console.log(`  Failed: ${healthStatus.marketData.failedRequests}`);
  console.log(`  Avg Response Time: ${healthStatus.marketData.averageResponseTime.toFixed(0)}ms`);
  console.log('');

  console.log('News:');
  console.log(`  Total Requests: ${healthStatus.news.totalRequests}`);
  console.log(`  Successful: ${healthStatus.news.successfulRequests}`);
  console.log(`  Failed: ${healthStatus.news.failedRequests}`);
  console.log('');

  console.log('Sentiment:');
  console.log(`  Total Requests: ${healthStatus.sentiment.totalRequests}`);
  console.log(`  Successful: ${healthStatus.sentiment.successfulRequests}`);
  console.log(`  Failed: ${healthStatus.sentiment.failedRequests}`);
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Provider Health Details
  // ──────────────────────────────────────────────────────────────────────────

  console.log('🏥 Provider Health Details:\n');

  const providerHealth = unifiedService.getProviderHealth();

  ['marketData', 'news', 'sentiment', 'whaleTracking'].forEach(category => {
    const providers = (providerHealth as any)[category];
    if (providers && providers.length > 0) {
      console.log(`${category}:`);
      providers.forEach((health: any) => {
        const status = health.healthy ? '✅' : '❌';
        console.log(`  ${status} ${health.provider}: ${health.successRate.toFixed(1)}% success rate, ${health.averageResponseTime.toFixed(0)}ms avg`);
      });
      console.log('');
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Comprehensive Health Check (All APIs)
  // ──────────────────────────────────────────────────────────────────────────

  console.log('\n🔍 Running comprehensive health check of all configured APIs...\n');
  console.log('⏳ This may take a minute...\n');

  const report = await healthChecker.checkAllAPIs();

  // Print the report
  healthChecker.printReport(report);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Summary & Recommendations
  // ──────────────────────────────────────────────────────────────────────────

  console.log('📋 SUMMARY:\n');

  if (report.successRate >= 80) {
    console.log('✅ EXCELLENT: Most APIs are working correctly!');
  } else if (report.successRate >= 60) {
    console.log('⚠️  GOOD: Most essential APIs are working, but some issues detected.');
  } else if (report.successRate >= 40) {
    console.log('⚠️  WARNING: Many APIs are not working. Check configuration and API keys.');
  } else {
    console.log('❌ CRITICAL: Most APIs are failing. Please check your setup.');
  }

  console.log('');
  console.log(`Total APIs Tested: ${report.totalAPIs}`);
  console.log(`Success Rate: ${report.successRate.toFixed(2)}%`);
  console.log('');

  if (report.recommendations.length > 0) {
    console.log('💡 Action Items:');
    report.recommendations.forEach(rec => console.log(`  • ${rec}`));
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Complete                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Exit with appropriate code
  process.exit(report.successRate >= 50 ? 0 : 1);
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
