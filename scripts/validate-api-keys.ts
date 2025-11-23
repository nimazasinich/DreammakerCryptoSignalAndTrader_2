#!/usr/bin/env tsx

/**
 * API Keys Validation Script
 *
 * Tests all configured API keys to ensure they are valid and working.
 * This helps identify configuration issues before running the main application.
 */

import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

interface ValidationResult {
  service: string;
  key: string;
  status: 'valid' | 'invalid' | 'missing' | 'untested';
  message: string;
  required: boolean;
}

const results: ValidationResult[] = [];

async function validateCoinMarketCap(): Promise<void> {
  const key = process.env.CMC_API_KEY;

  if (!key || key === 'your_coinmarketcap_api_key_here') {
    results.push({
      service: 'CoinMarketCap',
      key: 'CMC_API_KEY',
      status: 'missing',
      message: 'Not configured',
      required: false
    });
    return;
  }

  try {
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
      headers: { 'X-CMC_PRO_API_KEY': key },
      params: { limit: 1 }
    });

    results.push({
      service: 'CoinMarketCap',
      key: 'CMC_API_KEY',
      status: response.status === 200 ? 'valid' : 'invalid',
      message: response.status === 200 ? 'API key is valid' : 'API returned error',
      required: false
    });
  } catch (error: any) {
    results.push({
      service: 'CoinMarketCap',
      key: 'CMC_API_KEY',
      status: 'invalid',
      message: error.response?.data?.status?.error_message || error.message,
      required: false
    });
  }
}

async function validateCryptoCompare(): Promise<void> {
  const key = process.env.CRYPTOCOMPARE_KEY;

  if (!key || key === 'your_cryptocompare_api_key_here') {
    results.push({
      service: 'CryptoCompare',
      key: 'CRYPTOCOMPARE_KEY',
      status: 'missing',
      message: 'Not configured',
      required: false
    });
    return;
  }

  try {
    const response = await axios.get('https://min-api.cryptocompare.com/data/price', {
      params: { fsym: 'BTC', tsyms: 'USD', api_key: key }
    });

    results.push({
      service: 'CryptoCompare',
      key: 'CRYPTOCOMPARE_KEY',
      status: response.data.USD ? 'valid' : 'invalid',
      message: response.data.USD ? 'API key is valid' : 'Invalid response',
      required: false
    });
  } catch (error: any) {
    results.push({
      service: 'CryptoCompare',
      key: 'CRYPTOCOMPARE_KEY',
      status: 'invalid',
      message: error.response?.data?.Message || error.message,
      required: false
    });
  }
}

async function validateNewsAPI(): Promise<void> {
  // Check both NEWS_API_KEY and NEWSAPI_KEY
  const key = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY;
  const keyName = process.env.NEWS_API_KEY ? 'NEWS_API_KEY' : 'NEWSAPI_KEY';

  if (!key || key.startsWith('pub_') || key === '__your_newsapi_key__') {
    results.push({
      service: 'NewsAPI',
      key: keyName,
      status: 'missing',
      message: 'Not configured or using placeholder',
      required: true
    });
    return;
  }

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: 'bitcoin',
        pageSize: 1,
        apiKey: key
      }
    });

    results.push({
      service: 'NewsAPI',
      key: keyName,
      status: response.data.status === 'ok' ? 'valid' : 'invalid',
      message: response.data.status === 'ok' ? 'API key is valid' : 'Invalid response',
      required: true
    });
  } catch (error: any) {
    results.push({
      service: 'NewsAPI',
      key: keyName,
      status: 'invalid',
      message: error.response?.data?.message || error.message,
      required: true
    });
  }
}

async function validateEtherscan(): Promise<void> {
  const key = process.env.ETHERSCAN_API_KEY;

  if (!key || key === 'your_etherscan_api_key_here') {
    results.push({
      service: 'Etherscan',
      key: 'ETHERSCAN_API_KEY',
      status: 'missing',
      message: 'Not configured',
      required: true
    });
    return;
  }

  try {
    const response = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'account',
        action: 'balance',
        address: '0x0000000000000000000000000000000000000000',
        tag: 'latest',
        apikey: key
      }
    });

    results.push({
      service: 'Etherscan',
      key: 'ETHERSCAN_API_KEY',
      status: response.data.status === '1' ? 'valid' : 'invalid',
      message: response.data.status === '1' ? 'API key is valid' : response.data.message || 'Invalid response',
      required: true
    });
  } catch (error: any) {
    results.push({
      service: 'Etherscan',
      key: 'ETHERSCAN_API_KEY',
      status: 'invalid',
      message: error.response?.data?.message || error.message,
      required: true
    });
  }
}

async function validateBscScan(): Promise<void> {
  const key = process.env.BSCSCAN_API_KEY;

  if (!key || key === 'your_bscscan_api_key_here') {
    results.push({
      service: 'BscScan',
      key: 'BSCSCAN_API_KEY',
      status: 'missing',
      message: 'Not configured',
      required: true
    });
    return;
  }

  try {
    const response = await axios.get('https://api.bscscan.com/api', {
      params: {
        module: 'account',
        action: 'balance',
        address: '0x0000000000000000000000000000000000000000',
        tag: 'latest',
        apikey: key
      }
    });

    results.push({
      service: 'BscScan',
      key: 'BSCSCAN_API_KEY',
      status: response.data.status === '1' ? 'valid' : 'invalid',
      message: response.data.status === '1' ? 'API key is valid' : response.data.message || 'Invalid response',
      required: true
    });
  } catch (error: any) {
    results.push({
      service: 'BscScan',
      key: 'BSCSCAN_API_KEY',
      status: 'invalid',
      message: error.response?.data?.message || error.message,
      required: true
    });
  }
}

async function validateCoinGecko(): Promise<void> {
  // CoinGecko doesn't require API key for free tier
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: 'bitcoin', vs_currencies: 'usd' }
    });

    results.push({
      service: 'CoinGecko (Free)',
      key: 'N/A',
      status: response.data.bitcoin ? 'valid' : 'invalid',
      message: response.data.bitcoin ? 'API is accessible (no key required)' : 'Invalid response',
      required: true
    });
  } catch (error: any) {
    results.push({
      service: 'CoinGecko (Free)',
      key: 'N/A',
      status: 'invalid',
      message: error.message,
      required: true
    });
  }
}

async function validateFearGreedIndex(): Promise<void> {
  // Alternative.me Fear & Greed Index (no API key required)
  try {
    const response = await axios.get('https://api.alternative.me/fng/');

    results.push({
      service: 'Fear & Greed Index',
      key: 'N/A',
      status: response.data.data ? 'valid' : 'invalid',
      message: response.data.data ? 'API is accessible (no key required)' : 'Invalid response',
      required: true
    });
  } catch (error: any) {
    results.push({
      service: 'Fear & Greed Index',
      key: 'N/A',
      status: 'invalid',
      message: error.message,
      required: true
    });
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔑 API KEYS VALIDATION');
  console.log('='.repeat(80));
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

  console.log('Testing API keys... This may take a few seconds.\n');

  // Test all APIs in parallel
  await Promise.all([
    validateCoinMarketCap(),
    validateCryptoCompare(),
    validateNewsAPI(),
    validateEtherscan(),
    validateBscScan(),
    validateCoinGecko(),
    validateFearGreedIndex()
  ]);

  // Print results
  console.log('='.repeat(80));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(80) + '\n');

  const validCount = results.filter(r => r.status === 'valid').length;
  const invalidCount = results.filter(r => r.status === 'invalid').length;
  const missingCount = results.filter(r => r.status === 'missing').length;
  const requiredMissing = results.filter(r => r.required && r.status !== 'valid').length;

  results.forEach(result => {
    const icon = result.status === 'valid' ? '✅' :
                 result.status === 'invalid' ? '❌' :
                 result.status === 'missing' ? '⚠️' : '⏸️';

    const required = result.required ? '[REQUIRED]' : '[OPTIONAL]';

    console.log(`${icon} ${result.service} ${required}`);
    console.log(`   Key: ${result.key}`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   Message: ${result.message}\n`);
  });

  console.log('='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total APIs tested: ${results.length}`);
  console.log(`✅ Valid: ${validCount}`);
  console.log(`❌ Invalid: ${invalidCount}`);
  console.log(`⚠️  Missing: ${missingCount}`);
  console.log(`🚨 Required but not valid: ${requiredMissing}\n`);

  if (requiredMissing > 0) {
    console.log('⚠️  WARNING: Some required API keys are missing or invalid!');
    console.log('   The application may not work correctly without these keys.\n');

    console.log('📝 REQUIRED ACTIONS:\n');
    results.filter(r => r.required && r.status !== 'valid').forEach(r => {
      console.log(`   - Configure ${r.key} in .env file`);
      if (r.service === 'NewsAPI') {
        console.log(`     Get from: https://newsapi.org/`);
        console.log(`     NOTE: Rename NEWSAPI_KEY to NEWS_API_KEY in .env`);
      } else if (r.service === 'Etherscan') {
        console.log(`     Get from: https://etherscan.io/apis`);
      } else if (r.service === 'BscScan') {
        console.log(`     Get from: https://bscscan.com/apis`);
      }
    });
    console.log('');
  }

  if (requiredMissing > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All required API keys are configured and valid!\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('\n💥 Fatal error during validation:');
  console.error(error);
  process.exit(1);
});
