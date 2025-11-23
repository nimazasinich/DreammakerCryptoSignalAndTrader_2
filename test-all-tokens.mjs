#!/usr/bin/env node
/**
 * Complete Token Verification Test
 * Tests both HuggingFace and NewsAPI tokens
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load env file
dotenv.config({ path: './env' });

const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY;
const BASE_URL = 'http://localhost:8001';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

function log(color, ...args) {
  console.log(color, ...args, COLORS.reset);
}

function formatToken(token) {
  if (!token) return 'NOT SET';
  if (token.length < 15) return token;
  return token.substring(0, 12) + '...' + token.substring(token.length - 4);
}

async function testHuggingFaceToken() {
  log(COLORS.cyan, '\n' + '='.repeat(80));
  log(COLORS.cyan + COLORS.bold, '🤖 HUGGINGFACE TOKEN TEST');
  log(COLORS.cyan, '='.repeat(80));

  log(COLORS.blue, `\n📋 Token: ${formatToken(HF_TOKEN)}`);
  log(COLORS.blue, `   Format: ${HF_TOKEN && HF_TOKEN.startsWith('hf_') ? '✅ Valid (hf_...)' : '❌ Invalid format'}`);

  if (!HF_TOKEN) {
    log(COLORS.red, '\n❌ No HuggingFace token found');
    return { valid: false, working: false };
  }

  // Test 1: Direct HF API
  log(COLORS.cyan, '\n🔍 Test 1: Direct HuggingFace API Validation');
  let isValid = false;
  try {
    const response = await fetch('https://huggingface.co/api/whoami', {
      headers: { 'Authorization': `Bearer ${HF_TOKEN}` }
    });

    if (response.ok) {
      const data = await response.json();
      log(COLORS.green, '   ✅ Token is VALID');
      log(COLORS.blue, `   👤 User: ${data.name || 'Unknown'}`);
      log(COLORS.blue, `   📧 Email: ${data.email || 'Not provided'}`);
      isValid = true;
    } else {
      log(COLORS.red, `   ❌ Token INVALID (${response.status})`);
      const error = await response.text();
      log(COLORS.yellow, `   Error: ${error.substring(0, 100)}`);
    }
  } catch (error) {
    log(COLORS.red, `   ❌ Error: ${error.message}`);
  }

  // Test 2: HF Inference API
  log(COLORS.cyan, '\n🔍 Test 2: HuggingFace Inference API');
  let inferenceWorks = false;
  try {
    const response = await fetch('https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: 'Bitcoin is great!' })
    });

    if (response.ok) {
      log(COLORS.green, '   ✅ Inference API accessible');
      inferenceWorks = true;
    } else if (response.status === 503) {
      log(COLORS.yellow, '   ⚠️  Model loading (503) - Token works but model not ready');
      inferenceWorks = true;
    } else {
      log(COLORS.red, `   ❌ Inference API failed (${response.status})`);
    }
  } catch (error) {
    log(COLORS.red, `   ❌ Error: ${error.message}`);
  }

  return { valid: isValid, working: inferenceWorks };
}

async function testNewsAPIToken() {
  log(COLORS.cyan, '\n' + '='.repeat(80));
  log(COLORS.cyan + COLORS.bold, '📰 NEWSAPI TOKEN TEST');
  log(COLORS.cyan, '='.repeat(80));

  log(COLORS.blue, `\n📋 Token: ${formatToken(NEWS_API_KEY)}`);
  log(COLORS.blue, `   Length: ${NEWS_API_KEY ? NEWS_API_KEY.length + ' characters' : 'N/A'}`);

  if (!NEWS_API_KEY) {
    log(COLORS.red, '\n❌ No NewsAPI token found');
    return { valid: false, working: false };
  }

  // Test 1: Direct NewsAPI
  log(COLORS.cyan, '\n🔍 Test 1: Direct NewsAPI Validation');
  let isValid = false;
  let articlesCount = 0;
  try {
    const response = await fetch(`https://newsapi.org/v2/everything?q=bitcoin&pageSize=5&apiKey=${NEWS_API_KEY}`);
    const data = await response.json();

    if (response.ok && data.status === 'ok') {
      log(COLORS.green, '   ✅ Token is VALID');
      log(COLORS.blue, `   📊 Total Results: ${data.totalResults || 0}`);
      log(COLORS.blue, `   📰 Articles Retrieved: ${data.articles?.length || 0}`);
      articlesCount = data.articles?.length || 0;
      isValid = true;

      if (data.articles && data.articles.length > 0) {
        log(COLORS.blue, `   📄 Sample: "${data.articles[0].title?.substring(0, 60)}..."`);
      }
    } else {
      log(COLORS.red, `   ❌ Token INVALID (${response.status})`);
      log(COLORS.yellow, `   Error: ${data.message || 'Unknown error'}`);
      
      if (data.code === 'apiKeyInvalid') {
        log(COLORS.yellow, '   💡 Token format is invalid');
      } else if (data.code === 'rateLimited') {
        log(COLORS.yellow, '   💡 Rate limit exceeded');
      }
    }
  } catch (error) {
    log(COLORS.red, `   ❌ Error: ${error.message}`);
  }

  // Test 2: Server endpoint
  log(COLORS.cyan, '\n🔍 Test 2: Server News Endpoint');
  let serverWorks = false;
  try {
    const response = await fetch(`${BASE_URL}/api/news?limit=5`);
    const data = await response.json();

    if (response.ok && data.success) {
      log(COLORS.green, '   ✅ Server news endpoint working');
      log(COLORS.blue, `   📰 News items: ${data.data?.length || 0}`);
      serverWorks = true;
    } else {
      log(COLORS.yellow, '   ⚠️  Server endpoint returned but may use fallback');
    }
  } catch (error) {
    log(COLORS.red, `   ❌ Error: ${error.message}`);
  }

  return { valid: isValid, working: serverWorks, articlesCount };
}

async function runAllTests() {
  log(COLORS.magenta + COLORS.bold, '\n' + '█'.repeat(80));
  log(COLORS.magenta + COLORS.bold, '  🔐 COMPLETE TOKEN VERIFICATION TEST');
  log(COLORS.magenta + COLORS.bold, '█'.repeat(80));

  // Test HuggingFace
  const hfResults = await testHuggingFaceToken();

  // Test NewsAPI
  const newsResults = await testNewsAPIToken();

  // Summary
  log(COLORS.magenta, '\n' + '='.repeat(80));
  log(COLORS.magenta + COLORS.bold, '📊 FINAL SUMMARY');
  log(COLORS.magenta, '='.repeat(80));

  log(COLORS.cyan, '\n🤖 HuggingFace Token:');
  if (hfResults.valid) {
    log(COLORS.green, '   ✅ Token is VALID and authenticated');
    log(COLORS.green, '   ✅ Can access HuggingFace API');
    if (hfResults.working) {
      log(COLORS.green, '   ✅ Inference API accessible');
    }
  } else {
    log(COLORS.red, '   ❌ Token is INVALID or not working');
    log(COLORS.yellow, '   💡 Get new token from: https://huggingface.co/settings/tokens');
    log(COLORS.yellow, '   💡 Update in env file: HF_TOKEN=your_new_token');
  }

  log(COLORS.cyan, '\n📰 NewsAPI Token:');
  if (newsResults.valid) {
    log(COLORS.green, '   ✅ Token is VALID and authenticated');
    log(COLORS.green, `   ✅ Can fetch news articles (${newsResults.articlesCount} retrieved)`);
    if (newsResults.working) {
      log(COLORS.green, '   ✅ Server integration working');
    }
  } else {
    log(COLORS.red, '   ❌ Token is INVALID or not working');
    log(COLORS.yellow, '   💡 Get new token from: https://newsapi.org/register');
    log(COLORS.yellow, '   💡 Update in env file: NEWS_API_KEY=your_new_token');
  }

  log(COLORS.cyan, '\n🎯 Overall Status:');
  const totalValid = (hfResults.valid ? 1 : 0) + (newsResults.valid ? 1 : 0);
  const totalTokens = 2;
  
  if (totalValid === totalTokens) {
    log(COLORS.green + COLORS.bold, `   ✅ EXCELLENT! All ${totalTokens} tokens are valid and working`);
  } else if (totalValid > 0) {
    log(COLORS.yellow + COLORS.bold, `   ⚠️  PARTIAL: ${totalValid}/${totalTokens} tokens are valid`);
    log(COLORS.yellow, '   System will use fallback mechanisms for invalid tokens');
  } else {
    log(COLORS.red + COLORS.bold, '   ❌ CRITICAL: No valid tokens found');
    log(COLORS.yellow, '   System will rely entirely on fallback mechanisms');
  }

  log(COLORS.cyan, '\n📝 Recommendations:');
  if (!hfResults.valid) {
    log(COLORS.yellow, '   1. Update HuggingFace token for AI features');
  }
  if (!newsResults.valid) {
    log(COLORS.yellow, '   2. Update NewsAPI token for news features');
  }
  if (hfResults.valid && newsResults.valid) {
    log(COLORS.green, '   ✅ All tokens configured correctly!');
    log(COLORS.blue, '   ℹ️  Remember to restart server after token updates');
  } else {
    log(COLORS.yellow, '   3. Restart server after updating tokens');
    log(COLORS.yellow, '   4. Run this test again to verify');
  }

  log(COLORS.magenta, '\n' + '='.repeat(80) + '\n');

  // Exit code
  if (totalValid === 0) {
    process.exit(1);
  }
}

runAllTests().catch(error => {
  log(COLORS.red, '\n💥 Test suite failed:', error);
  process.exit(1);
});

