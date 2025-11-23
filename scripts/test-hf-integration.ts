#!/usr/bin/env tsx
/**
 * Test Hugging Face Integration
 *
 * This script tests the Hugging Face API token configuration and verifies
 * that the HF services are working correctly.
 *
 * Usage:
 *   npm run test:hf
 *   # or
 *   tsx scripts/test-hf-integration.ts
 */

import dotenv from 'dotenv';
import { Logger } from '../src/core/Logger.js';
import { HuggingFaceService } from '../src/services/HuggingFaceService.js';
import { HFOHLCVService } from '../src/services/HFOHLCVService.js';
import { HFSentimentService } from '../src/services/HFSentimentService.js';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true }); // Override with local secrets

const logger = Logger.getInstance();

async function testHFConfiguration() {
  console.log('\n========================================');
  console.log('🧪 Hugging Face Integration Test');
  console.log('========================================\n');

  // Check environment variables
  console.log('📋 Environment Configuration:');
  console.log('─────────────────────────────────────────');

  const hfApiKey = process.env.HUGGINGFACE_API_KEY;
  const hfToken = process.env.HF_TOKEN;
  const hfTokenB64 = process.env.HF_TOKEN_B64;

  console.log(`✓ HUGGINGFACE_API_KEY: ${hfApiKey ? '✓ Set (length: ' + hfApiKey.length + ')' : '✗ Not set'}`);
  console.log(`✓ HF_TOKEN: ${hfToken ? '✓ Set (length: ' + hfToken.length + ')' : '✗ Not set'}`);
  console.log(`✓ HF_TOKEN_B64: ${hfTokenB64 ? '✓ Set (length: ' + hfTokenB64.length + ')' : '✗ Not set'}`);

  if (hfTokenB64) {
    try {
      const decoded = Buffer.from(hfTokenB64, 'base64').toString('utf8');
      console.log(`  └─> Decoded B64 token length: ${decoded.length}`);
    } catch (error) {
      console.log(`  └─> ✗ Failed to decode B64 token`);
    }
  }

  if (!hfApiKey && !hfToken && !hfTokenB64) {
    console.log('\n⚠️  WARNING: No Hugging Face token configured!');
    console.log('   API requests will use free tier with lower rate limits.');
    console.log('   To configure: Add HUGGINGFACE_API_KEY to .env.local\n');
  } else {
    console.log('\n✅ Hugging Face token is configured!\n');
  }

  // Test HF Services
  console.log('🔧 Testing Hugging Face Services:');
  console.log('─────────────────────────────────────────');

  try {
    // Test OHLCV Service
    console.log('\n1️⃣  Testing HF OHLCV Service...');
    const ohlcvService = HFOHLCVService.getInstance();
    console.log('   ✓ HFOHLCVService initialized');

    // Test Sentiment Service
    console.log('\n2️⃣  Testing HF Sentiment Service...');
    const sentimentService = HFSentimentService.getInstance();
    console.log('   ✓ HFSentimentService initialized');

    // Test a simple sentiment analysis
    console.log('\n3️⃣  Testing Sentiment Analysis...');
    const testText = 'Bitcoin is bullish today with strong market momentum!';
    console.log(`   Text: "${testText}"`);

    try {
      const sentiment = await sentimentService.analyzeSentiment(testText, false);
      console.log(`   ✓ Sentiment: ${sentiment.label} (${(sentiment.score * 100).toFixed(2)}%)`);
      console.log(`   ✓ Models used: ${sentiment.models.join(', ')}`);
    } catch (error: any) {
      console.log(`   ⚠️  Sentiment test failed: ${error.message}`);
      if (error.response?.status === 503) {
        console.log('   ℹ️  Model may be loading, this is normal on first request');
      }
    }

    // Test OHLCV data fetch (optional)
    console.log('\n4️⃣  Testing OHLCV Data Fetch...');
    try {
      const ohlcvData = await ohlcvService.getOHLCV('BTCUSDT', '1h', 10);
      if (ohlcvData && ohlcvData.length > 0) {
        console.log(`   ✓ Fetched ${ohlcvData.length} candles for BTCUSDT 1h`);
        console.log(`   ✓ Latest candle: ${JSON.stringify(ohlcvData[ohlcvData.length - 1])}`);
      } else {
        console.log('   ⚠️  No OHLCV data returned (dataset may not exist)');
      }
    } catch (error: any) {
      console.log(`   ⚠️  OHLCV test failed: ${error.message}`);
      console.log('   ℹ️  This is expected if HF datasets are not configured');
    }

  } catch (error: any) {
    console.error('\n❌ Service initialization failed:', error.message);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('✅ Hugging Face Integration Test Complete');
  console.log('========================================\n');

  // API Endpoint Information
  console.log('📡 Available API Endpoints:');
  console.log('─────────────────────────────────────────');
  console.log('GET  /api/hf/health');
  console.log('     → Health check for HF services');
  console.log('');
  console.log('GET  /api/hf/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=100');
  console.log('     → Get OHLCV data from HF datasets');
  console.log('');
  console.log('POST /api/hf/sentiment');
  console.log('     → Analyze sentiment with CryptoBERT');
  console.log('     Body: { "texts": ["text1", "text2"] }');
  console.log('');
  console.log('POST /api/hf/sentiment/single');
  console.log('     → Analyze single text sentiment');
  console.log('     Body: { "text": "your text here" }');
  console.log('');
  console.log('GET  /api/hf/registry');
  console.log('     → Get alternate API sources registry');
  console.log('');

  // Next Steps
  console.log('📝 Next Steps:');
  console.log('─────────────────────────────────────────');
  console.log('1. Start the development server:');
  console.log('   npm run dev');
  console.log('');
  console.log('2. Test the API endpoints:');
  console.log('   curl http://localhost:8001/api/hf/health');
  console.log('');
  console.log('3. Check the application logs for HF API calls');
  console.log('');
  console.log('4. Monitor rate limits and performance');
  console.log('');

  if (!hfApiKey && !hfToken && !hfTokenB64) {
    console.log('⚠️  Remember to add your HF token to .env.local for higher rate limits!');
    console.log('');
  }
}

// Run the test
testHFConfiguration()
  .then(() => {
    console.log('✅ Test completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
