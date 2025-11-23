#!/usr/bin/env tsx
/**
 * Standalone test script for all free crypto data sources
 *
 * Run with: npx tsx src/test-data-sources.ts
 *
 * This will test:
 * ✓ CoinGecko (price data)
 * ✓ CoinCap (price data)
 * ✓ CoinPaprika (price data)
 * ✓ Binance (price data)
 * ✓ CoinDesk (BTC price)
 * ✓ Fear & Greed Index (sentiment)
 * ✓ Reddit (social sentiment)
 * ✓ Blockchair (blockchain data)
 * ✓ Whale Alert (large transactions - if configured)
 */

import { EnhancedMarketDataService } from './services/EnhancedMarketDataService.js';

const service = EnhancedMarketDataService.getInstance();

console.log('\n🚀 Testing All Free Crypto Data Sources\n');
console.log('=' .repeat(60));

// Helper to format currency
const fmt = (num: number) => num.toLocaleString('en-US', { maximumFractionDigits: 2 });

async function testPriceData() {
  console.log('\n📊 PRICE DATA SOURCES');
  console.log('-'.repeat(60));

  try {
    const symbols = ['BTC', 'ETH', 'SOL', 'BNB'];
    console.log(`Fetching prices for: ${symbols.join(', ')}...\n`);

    const prices = await service.getRealTimePrices(symbols);

    prices.forEach(p => {
      const change = p.changePercent24h >= 0 ? `+${fmt(p.changePercent24h)}%` : `${fmt(p.changePercent24h)}%`;
      console.log(`${p.symbol.padEnd(6)} $${fmt(p.price).padStart(12)}  ${change.padStart(8)}  [${p.source}]`);
      console.log(`       Vol: $${fmt(p.volume24h)} | MCap: $${fmt(p.marketCap || 0)}`);
    });

    console.log('\n✅ Price data fetch successful!');
  } catch (error: any) {
    console.error('❌ Price data failed:', error.message);
  }
}

async function testHistoricalData() {
  console.log('\n📈 HISTORICAL DATA');
  console.log('-'.repeat(60));

  try {
    console.log('Fetching 7 days of BTC data...\n');
    const data = await service.getHistoricalData('BTC', 7);

    console.log(`Retrieved ${data.length} candles`);
    console.log(`Latest: O=${fmt(data[data.length - 1]?.close)} H=${fmt(data[data.length - 1]?.high)} L=${fmt(data[data.length - 1]?.low)}`);
    console.log(`Oldest: O=${fmt(data[0]?.close)} H=${fmt(data[0]?.high)} L=${fmt(data[0]?.low)}`);

    console.log('\n✅ Historical data fetch successful!');
  } catch (error: any) {
    console.error('❌ Historical data failed:', error.message);
  }
}

async function testFearGreed() {
  console.log('\n😱 FEAR & GREED INDEX');
  console.log('-'.repeat(60));

  try {
    const fng = await service.getFearGreedIndex();

    const emoji = fng.value < 25 ? '😱' : fng.value < 45 ? '😟' : fng.value < 55 ? '😐' : fng.value < 75 ? '😊' : '🤑';
    console.log(`${emoji}  Value: ${fng.value}/100 - ${fng.classification}`);

    if (fng.change24h !== undefined) {
      const changeEmoji = fng.change24h > 0 ? '📈' : fng.change24h < 0 ? '📉' : '➡️';
      console.log(`${changeEmoji}  24h Change: ${fng.change24h > 0 ? '+' : ''}${fng.change24h}`);
    }

    console.log('\n✅ Fear & Greed Index fetch successful!');
  } catch (error: any) {
    console.error('❌ Fear & Greed failed:', error.message);
  }
}

async function testReddit() {
  console.log('\n🗣️  REDDIT SOCIAL DATA');
  console.log('-'.repeat(60));

  try {
    console.log('Fetching r/CryptoCurrency posts...\n');
    const posts = await service.getRedditPosts('CryptoCurrency', 5);

    if ((posts?.length || 0) > 0) {
      posts.forEach((post, i) => {
        console.log(`${i + 1}. ${post.title.substring(0, 55)}...`);
        console.log(`   👤 u/${post.author} | ⬆️  ${post.score} | 💬 ${post.numComments}`);
      });
      console.log('\n✅ Reddit data fetch successful!');
    } else {
      console.log('⚠️  No posts returned (may be rate limited)');
    }
  } catch (error: any) {
    console.error('❌ Reddit failed:', error.message);
  }
}

async function testBlockchain() {
  console.log('\n⛓️  BLOCKCHAIN DATA (Blockchair)');
  console.log('-'.repeat(60));

  try {
    // Satoshi's genesis address
    const btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    console.log(`Fetching data for: ${btcAddress}...\n`);

    const data = await service.getBlockchainData(btcAddress, 'bitcoin');

    if (data) {
      console.log(`Chain:          ${data.chain}`);
      console.log(`Balance:        ${fmt(data.balance / 1e8)} BTC`);
      console.log(`Total Received: ${fmt(data.totalReceived / 1e8)} BTC`);
      console.log(`Total Sent:     ${fmt(data.totalSent / 1e8)} BTC`);
      console.log(`Transactions:   ${data.txCount}`);
      console.log('\n✅ Blockchain data fetch successful!');
    } else {
      console.log('⚠️  No blockchain data returned (may be rate limited)');
    }
  } catch (error: any) {
    console.error('❌ Blockchain data failed:', error.message);
  }
}

async function testWhaleAlert() {
  console.log('\n🐋 WHALE ALERT');
  console.log('-'.repeat(60));

  try {
    const whales = await service.getWhaleTransactions(1000000);

    if ((whales?.length || 0) > 0) {
      console.log(`Found ${whales.length} large transactions:\n`);
      whales.slice(0, 5).forEach((tx, i) => {
        console.log(`${i + 1}. ${fmt(tx.amount)} ${tx.symbol} ($${fmt(tx.amountUsd)})`);
        console.log(`   ${tx.blockchain} | ${new Date(tx.timestamp).toLocaleString()}`);
      });
      console.log('\n✅ Whale Alert fetch successful!');
    } else {
      console.log('⚠️  No whale transactions (API key may not be configured)');
      console.log('   Configure WHALE_ALERT_KEY in .env to enable this feature');
    }
  } catch (error: any) {
    console.log('⚠️  Whale Alert not available:', error.message);
  }
}

async function testHealth() {
  console.log('\n🏥 PROVIDER HEALTH CHECK');
  console.log('-'.repeat(60));

  try {
    const health = await service.getHealthStatus();

    Object.entries(health).forEach(([provider, isHealthy]) => {
      const status = isHealthy ? '✅' : '❌';
      console.log(`${status} ${provider.padEnd(15)} ${isHealthy ? 'Online' : 'Offline'}`);
    });

    const total = Object.keys(health).length;
    const online = Object.values(health).filter(Boolean).length;
    console.log(`\n📊 Summary: ${online}/${total} providers online`);
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  const startTime = Date.now();

  await testPriceData();
  await testHistoricalData();
  await testFearGreed();
  await testReddit();
  await testBlockchain();
  await testWhaleAlert();
  await testHealth();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log(`✅ All tests completed in ${duration}s`);
  console.log('='.repeat(60) + '\n');
}

// Execute
runAllTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
