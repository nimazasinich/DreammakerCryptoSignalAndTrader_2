#!/usr/bin/env node
/**
 * HuggingFace Token Test
 * Tests if HF token is properly configured and working
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load .env file
dotenv.config({ path: './env' });

const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
const BASE_URL = 'http://localhost:8001';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, ...args) {
  console.log(color, ...args, COLORS.reset);
}

async function testHFToken() {
  log(COLORS.magenta, '\n' + '='.repeat(80));
  log(COLORS.magenta, '🤖 HUGGINGFACE TOKEN TEST');
  log(COLORS.magenta, '='.repeat(80));

  // Check if token is loaded
  log(COLORS.cyan, '\n📋 Environment Variables:');
  log(COLORS.blue, `   HF_TOKEN: ${HF_TOKEN ? HF_TOKEN.substring(0, 10) + '...' : 'NOT SET'}`);
  log(COLORS.blue, `   HUGGINGFACE_API_KEY: ${process.env.HUGGINGFACE_API_KEY ? process.env.HUGGINGFACE_API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);

  if (!HF_TOKEN) {
    log(COLORS.red, '\n❌ ERROR: No HuggingFace token found in environment!');
    log(COLORS.yellow, '   Please set HF_TOKEN or HUGGINGFACE_API_KEY in env file');
    process.exit(1);
  }

  log(COLORS.green, '\n✅ Token found in environment');

  // Test 1: Direct HF API call
  log(COLORS.cyan, '\n🔍 Test 1: Direct HuggingFace API');
  try {
    const response = await fetch('https://huggingface.co/api/whoami', {
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      log(COLORS.green, '   ✅ Token is VALID');
      log(COLORS.blue, `   User: ${data.name || 'Unknown'}`);
      log(COLORS.blue, `   Type: ${data.type || 'Unknown'}`);
    } else {
      log(COLORS.red, `   ❌ Token validation failed: ${response.status}`);
      const errorText = await response.text();
      log(COLORS.yellow, `   Error: ${errorText.substring(0, 100)}`);
    }
  } catch (error) {
    log(COLORS.red, `   ❌ Error: ${error.message}`);
  }

  // Test 2: Server endpoint
  log(COLORS.cyan, '\n🔍 Test 2: Server Models Status');
  try {
    const response = await fetch(`${BASE_URL}/api/models/status`);
    const data = await response.json();

    if (response.ok && data.success) {
      log(COLORS.green, '   ✅ Server endpoint working');
      log(COLORS.blue, `   Models available: ${data.data?.available || 0}`);
      log(COLORS.blue, `   Models loaded: ${data.data?.loaded || 0}`);
      log(COLORS.blue, `   Status: ${data.data?.status || 'unknown'}`);
    } else {
      log(COLORS.yellow, '   ⚠️  Server endpoint returned data but no models');
      log(COLORS.blue, `   Response: ${JSON.stringify(data, null, 2).substring(0, 200)}`);
    }
  } catch (error) {
    log(COLORS.red, `   ❌ Error: ${error.message}`);
  }

  // Test 3: HF Sentiment Service
  log(COLORS.cyan, '\n🔍 Test 3: Sentiment Analysis (HF)');
  try {
    const response = await fetch(`${BASE_URL}/api/sentiment/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Bitcoin is going to the moon!' })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      log(COLORS.green, '   ✅ Sentiment analysis working');
      log(COLORS.blue, `   Overall score: ${data.data?.overallScore || 'N/A'}`);
    } else {
      log(COLORS.yellow, '   ⚠️  Sentiment analysis returned but may not use HF models');
    }
  } catch (error) {
    log(COLORS.red, `   ❌ Error: ${error.message}`);
  }

  // Summary
  log(COLORS.magenta, '\n' + '='.repeat(80));
  log(COLORS.magenta, '📊 SUMMARY');
  log(COLORS.magenta, '='.repeat(80));
  
  log(COLORS.cyan, '\nToken Status:');
  log(COLORS.green, '  ✅ Token is present in env file');
  log(COLORS.blue, '  ℹ️  Token format: ' + (HF_TOKEN.startsWith('hf_') ? 'Valid (hf_...)' : 'Unknown format'));
  
  log(COLORS.cyan, '\nRecommendations:');
  log(COLORS.yellow, '  1. Ensure server is restarted after updating env file');
  log(COLORS.yellow, '  2. Check server logs for "Hugging Face API key configured"');
  log(COLORS.yellow, '  3. If using HF engine (port 8000), ensure it\'s running');
  log(COLORS.yellow, '  4. Some endpoints may work without token (free tier)');
  
  log(COLORS.magenta, '='.repeat(80) + '\n');
}

testHFToken().catch(error => {
  log(COLORS.red, '\n💥 Test failed:', error);
  process.exit(1);
});

