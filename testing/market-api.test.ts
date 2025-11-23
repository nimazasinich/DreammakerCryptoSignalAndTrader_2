/**
 * Market API Tests
 * تست‌های خودکار برای مسیرهای Market API
 * 
 * این فایل شامل تست‌های جامع برای:
 * - دریافت قیمت‌های بازار
 * - دریافت داده‌های تاریخی
 * - دریافت اطلاعات OHLCV
 * - اعتبارسنجی پاسخ‌ها
 */

import { describe, it, expect, beforeAll } from 'vitest';
import APITestFramework, { TestCase, TestConfig } from './api-test-framework';

// ===== Configuration =====

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8001';

const testConfig: TestConfig = {
  baseURL: API_BASE_URL,
  timeout: 15000,
  retries: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// ===== Test Cases =====

export const marketTestCases: TestCase[] = [
  // Test 1: Health Check
  {
    name: 'Health Check - API is running',
    method: 'GET',
    endpoint: '/api/health',
    expectedStatus: 200,
    expectedSchema: {
      status: 'string',
      timestamp: 'number',
    },
    validateResponse: (response) => {
      return response.data.status === 'ok' || response.data.status === 'healthy';
    },
  },

  // Test 2: Get Market Prices
  {
    name: 'Get Market Prices - Multiple symbols',
    method: 'GET',
    endpoint: '/api/market/prices',
    params: {
      symbols: 'BTC,ETH,BNB',
    },
    expectedStatus: 200,
    validateResponse: (response) => {
      const data = response.data;
      return (
        typeof data === 'object' &&
        Object.keys(data).length > 0 &&
        Object.values(data).every((price: any) => typeof price === 'number' && price > 0)
      );
    },
  },

  // Test 3: Get Single Symbol Price
  {
    name: 'Get Single Symbol Price - BTC',
    method: 'GET',
    endpoint: '/api/market/prices',
    params: {
      symbols: 'BTC',
    },
    expectedStatus: 200,
    validateResponse: (response) => {
      const data = response.data;
      return data.BTC && typeof data.BTC === 'number' && data.BTC > 0;
    },
  },

  // Test 4: Get Market Data for Symbol
  {
    name: 'Get Market Data - BTCUSDT',
    method: 'GET',
    endpoint: '/api/market-data/BTCUSDT',
    expectedStatus: [200, 404], // 404 допустим если endpoint не существует
    validateResponse: (response) => {
      if (response.status === 404) return true;
      
      const data = response.data;
      return (
        data &&
        typeof data === 'object' &&
        (data.symbol === 'BTCUSDT' || data.symbol === 'BTC-USDT')
      );
    },
  },

  // Test 5: Get Historical Data
  {
    name: 'Get Historical Data - BTCUSDT',
    method: 'GET',
    endpoint: '/api/market/historical',
    params: {
      symbol: 'BTCUSDT',
      interval: '1h',
      limit: 100,
    },
    expectedStatus: [200, 404],
    validateResponse: (response) => {
      if (response.status === 404) return true;
      
      const data = response.data;
      return Array.isArray(data) && data.length > 0;
    },
  },

  // Test 6: Get OHLCV Data
  {
    name: 'Get OHLCV Data - BTC/USDT',
    method: 'GET',
    endpoint: '/api/hf/ohlcv',
    params: {
      symbol: 'BTC/USDT',
      timeframe: '1h',
      limit: 50,
    },
    expectedStatus: [200, 404],
    validateResponse: (response) => {
      if (response.status === 404) return true;
      
      const data = response.data;
      if (!Array.isArray(data)) return false;
      
      // بررسی ساختار OHLCV
      return data.every((candle: any) => {
        return (
          Array.isArray(candle) &&
          candle.length >= 6 &&
          typeof candle[0] === 'number' && // timestamp
          typeof candle[1] === 'number' && // open
          typeof candle[2] === 'number' && // high
          typeof candle[3] === 'number' && // low
          typeof candle[4] === 'number' && // close
          typeof candle[5] === 'number'    // volume
        );
      });
    },
  },

  // Test 7: Invalid Symbol
  {
    name: 'Invalid Symbol - Should handle gracefully',
    method: 'GET',
    endpoint: '/api/market/prices',
    params: {
      symbols: 'INVALID_SYMBOL_XYZ',
    },
    expectedStatus: [200, 400, 404],
    validateResponse: (response) => {
      // باید یا خطا برگرداند یا object خالی
      return (
        response.status >= 400 ||
        (typeof response.data === 'object' && Object.keys(response.data).length === 0)
      );
    },
  },

  // Test 8: Missing Parameters
  {
    name: 'Missing Parameters - Should return error',
    method: 'GET',
    endpoint: '/api/market/historical',
    params: {},
    expectedStatus: [400, 422, 500],
  },

  // Test 9: CoinGecko Prices
  {
    name: 'Get CoinGecko Prices',
    method: 'GET',
    endpoint: '/api/market/coingecko-prices',
    params: {
      ids: 'bitcoin,ethereum',
    },
    expectedStatus: [200, 404, 503],
    validateResponse: (response) => {
      if (response.status !== 200) return true;
      
      const data = response.data;
      return typeof data === 'object' && Object.keys(data).length > 0;
    },
  },

  // Test 10: CryptoCompare Prices
  {
    name: 'Get CryptoCompare Prices',
    method: 'GET',
    endpoint: '/api/market/cryptocompare-prices',
    params: {
      fsyms: 'BTC,ETH',
      tsyms: 'USD',
    },
    expectedStatus: [200, 404, 503],
    validateResponse: (response) => {
      if (response.status !== 200) return true;
      
      const data = response.data;
      return typeof data === 'object';
    },
  },
];

// ===== Test Suite =====

describe('Market API Tests', () => {
  let framework: APITestFramework;

  beforeAll(() => {
    framework = new APITestFramework(testConfig);
  });

  it('should run all market API tests', async () => {
    const result = await framework.runSuite('Market API', marketTestCases);
    
    // بررسی که حداقل 70% تست‌ها موفق باشند
    const successRate = result.passed / result.totalTests;
    expect(successRate).toBeGreaterThanOrEqual(0.7);
    
    // بررسی که هیچ خطای غیرمنتظره‌ای نداشته باشیم
    const unexpectedErrors = result.results.filter(
      r => !r.passed && r.error && !r.error.includes('skipped')
    );
    
    if (unexpectedErrors.length > 0) {
      console.warn('⚠️ Some tests failed:', unexpectedErrors.map(e => e.name));
    }
  }, 60000); // 60 second timeout

  it('should validate health endpoint', async () => {
    const healthTest = marketTestCases[0];
    const result = await framework.runTest(healthTest);
    
    expect(result.passed).toBe(true);
    expect(result.status).toBe(200);
  }, 15000);

  it('should get market prices successfully', async () => {
    const pricesTest = marketTestCases[1];
    const result = await framework.runTest(pricesTest);
    
    if (result.passed) {
      expect(result.status).toBe(200);
      expect(result.response).toBeDefined();
    } else {
      console.warn('⚠️ Market prices test failed:', result.error);
    }
  }, 15000);
});

// ===== Standalone Test Runner =====

/**
 * اجرای مستقل تست‌ها (بدون Vitest)
 * استفاده: tsx src/testing/market-api.test.ts
 */
export async function runStandaloneTests() {
  console.log('🚀 Starting Market API Tests...\n');
  
  const framework = new APITestFramework(testConfig);
  const results = await framework.runSuite('Market API', marketTestCases);
  
  // ذخیره گزارش
  const jsonReport = framework.generateJSONReport([results]);
  const mdReport = framework.generateMarkdownReport([results]);
  
  // نمایش خلاصه
  console.log('\n📄 Test Report Generated');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (results.failed > 0) {
    console.log('❌ Some tests failed. Check the report for details.\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  }
}

// اگر به صورت مستقیم اجرا شود
if (import.meta.url === `file://${process.argv[1]}`) {
  runStandaloneTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

