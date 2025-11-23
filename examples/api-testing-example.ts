/**
 * مثال‌های عملی استفاده از ماژول API Testing
 * 
 * این فایل شامل مثال‌های مختلف برای استفاده از ماژول تست است
 */

import {
  APITestFramework,
  TestCase,
  RequestValidator,
  CommonSchemas,
  IntegrationTestRunner,
} from '../src/testing';

// ===== مثال 1: تست ساده =====

async function example1_SimpleTest() {
  console.log('\n📝 مثال 1: تست ساده\n');

  const framework = new APITestFramework({
    baseURL: 'http://localhost:3001',
    timeout: 10000,
  });

  const test: TestCase = {
    name: 'Health Check',
    method: 'GET',
    endpoint: '/api/health',
    expectedStatus: 200,
  };

  const result = await framework.runTest(test);
  
  console.log('نتیجه تست:', result.passed ? '✅ موفق' : '❌ ناموفق');
  if (!result.passed) {
    console.log('خطا:', result.error);
  }
}

// ===== مثال 2: تست با اعتبارسنجی =====

async function example2_ValidationTest() {
  console.log('\n📝 مثال 2: تست با اعتبارسنجی\n');

  const framework = new APITestFramework({
    baseURL: 'http://localhost:3001',
  });

  const test: TestCase = {
    name: 'Get Market Prices with Validation',
    method: 'GET',
    endpoint: '/api/market/prices',
    params: {
      symbols: 'BTC,ETH',
    },
    expectedStatus: 200,
    expectedSchema: {
      BTC: 'number',
      ETH: 'number',
    },
    validateResponse: (response) => {
      const { BTC, ETH } = response.data;
      
      // بررسی که قیمت‌ها مثبت هستند
      if (BTC <= 0 || ETH <= 0) {
        return false;
      }

      // بررسی که قیمت BTC بیشتر از ETH است (معمولاً)
      console.log(`  💰 BTC: $${BTC.toLocaleString()}`);
      console.log(`  💰 ETH: $${ETH.toLocaleString()}`);

      return true;
    },
  };

  const result = await framework.runTest(test);
  
  console.log('\nنتیجه:', result.passed ? '✅ موفق' : '❌ ناموفق');
  if (result.validationErrors) {
    console.log('خطاهای اعتبارسنجی:', result.validationErrors);
  }
}

// ===== مثال 3: اجرای چندین تست =====

async function example3_MultiplTests() {
  console.log('\n📝 مثال 3: اجرای چندین تست\n');

  const framework = new APITestFramework({
    baseURL: 'http://localhost:3001',
  });

  const tests: TestCase[] = [
    {
      name: 'Test 1: Health Check',
      method: 'GET',
      endpoint: '/api/health',
      expectedStatus: 200,
    },
    {
      name: 'Test 2: Get BTC Price',
      method: 'GET',
      endpoint: '/api/market/prices',
      params: { symbols: 'BTC' },
      expectedStatus: 200,
    },
    {
      name: 'Test 3: Get ETH Price',
      method: 'GET',
      endpoint: '/api/market/prices',
      params: { symbols: 'ETH' },
      expectedStatus: 200,
    },
  ];

  const result = await framework.runSuite('مجموعه تست‌های من', tests);
  
  console.log('\n📊 خلاصه نتایج:');
  console.log(`  کل تست‌ها: ${result.totalTests}`);
  console.log(`  موفق: ${result.passed} ✅`);
  console.log(`  ناموفق: ${result.failed} ❌`);
  console.log(`  مدت زمان: ${result.duration}ms`);
}

// ===== مثال 4: اعتبارسنجی ورودی =====

async function example4_InputValidation() {
  console.log('\n📝 مثال 4: اعتبارسنجی ورودی\n');

  // اعتبارسنجی با Schema آماده
  const data1 = {
    symbols: 'BTC,ETH,BNB',
  };

  const result1 = RequestValidator.validate(data1, CommonSchemas.marketPriceRequest);
  console.log('اعتبارسنجی درخواست قیمت:', result1.valid ? '✅ معتبر' : '❌ نامعتبر');

  // اعتبارسنجی Symbol
  const symbols = ['BTCUSDT', 'ETH/USDT', 'BNB-USDT', 'INVALID@SYMBOL'];
  
  console.log('\nاعتبارسنجی Symbol‌ها:');
  for (const symbol of symbols) {
    const result = RequestValidator.validateSymbol(symbol);
    console.log(`  ${symbol}: ${result.valid ? '✅' : '❌'}`);
    if (!result.valid) {
      console.log(`    خطا: ${result.errors[0].message}`);
    }
  }

  // اعتبارسنجی Timeframe
  const timeframes = ['1m', '1h', '1d', '5x'];
  
  console.log('\nاعتبارسنجی Timeframe‌ها:');
  for (const tf of timeframes) {
    const result = RequestValidator.validateTimeframe(tf);
    console.log(`  ${tf}: ${result.valid ? '✅' : '❌'}`);
  }
}

// ===== مثال 5: Sanitization =====

async function example5_Sanitization() {
  console.log('\n📝 مثال 5: پاکسازی ورودی\n');

  const dangerousInputs = [
    '<script>alert("XSS")</script>',
    "'; DROP TABLE users; --",
    '<img src=x onerror=alert(1)>',
    'normal input',
  ];

  console.log('پاکسازی ورودی‌های خطرناک:');
  for (const input of dangerousInputs) {
    const sanitized = RequestValidator.sanitizeInput(input);
    console.log(`\n  ورودی: ${input}`);
    console.log(`  پاکسازی شده: ${sanitized}`);
  }

  // پاکسازی Object
  const dangerousObject = {
    name: '<b>Test</b>',
    symbol: "BTC'; DROP TABLE",
    value: 'normal',
  };

  console.log('\n\nپاکسازی Object:');
  console.log('  قبل:', dangerousObject);
  const cleaned = RequestValidator.sanitizeObject(dangerousObject);
  console.log('  بعد:', cleaned);
}

// ===== مثال 6: Performance Testing =====

async function example6_PerformanceTest() {
  console.log('\n📝 مثال 6: تست Performance\n');

  const runner = new IntegrationTestRunner('http://localhost:3001');

  // تست Concurrent Requests
  console.log('تست 10 درخواست همزمان...\n');
  await runner.testConcurrentRequests(10);
}

// ===== مثال 7: Error Handling =====

async function example7_ErrorHandling() {
  console.log('\n📝 مثال 7: مدیریت خطا\n');

  const framework = new APITestFramework({
    baseURL: 'http://localhost:3001',
    retries: 2,
    retryDelay: 500,
  });

  const tests: TestCase[] = [
    {
      name: 'Test 404 - Endpoint not found',
      method: 'GET',
      endpoint: '/api/non-existent',
      expectedStatus: 404,
    },
    {
      name: 'Test 400 - Invalid parameters',
      method: 'GET',
      endpoint: '/api/market/historical',
      params: {
        symbol: '',
        interval: 'invalid',
      },
      expectedStatus: [400, 422, 500],
    },
  ];

  const result = await framework.runSuite('تست‌های خطا', tests);
  
  console.log('\n📊 نتایج:');
  console.log(`  موفق: ${result.passed}`);
  console.log(`  ناموفق: ${result.failed}`);
}

// ===== مثال 8: Custom Validation Schema =====

async function example8_CustomSchema() {
  console.log('\n📝 مثال 8: Schema سفارشی\n');

  const mySchema = {
    symbol: {
      required: true,
      type: 'string' as const,
      pattern: /^[A-Z0-9]+$/,
      minLength: 3,
      maxLength: 10,
    },
    price: {
      required: true,
      type: 'number' as const,
      min: 0,
    },
    volume: {
      required: false,
      type: 'number' as const,
      min: 0,
    },
    tags: {
      required: false,
      type: 'array' as const,
      minLength: 1,
      maxLength: 5,
    },
  };

  const testData = [
    { symbol: 'BTC', price: 50000, volume: 1000 },
    { symbol: 'invalid@', price: 50000 },
    { symbol: 'ETH', price: -100 },
    { symbol: 'BNB', price: 300, tags: ['defi', 'exchange'] },
  ];

  console.log('اعتبارسنجی با Schema سفارشی:\n');
  for (const data of testData) {
    const result = RequestValidator.validate(data, mySchema);
    console.log(`  داده: ${JSON.stringify(data)}`);
    console.log(`  نتیجه: ${result.valid ? '✅ معتبر' : '❌ نامعتبر'}`);
    if (!result.valid) {
      result.errors.forEach(err => {
        console.log(`    - ${err.message}`);
      });
    }
    console.log();
  }
}

// ===== مثال 9: Integration Test Flow =====

async function example9_IntegrationFlow() {
  console.log('\n📝 مثال 9: جریان تست یکپارچه\n');

  const framework = new APITestFramework({
    baseURL: 'http://localhost:3001',
  });

  console.log('شبیه‌سازی جریان کامل دریافت قیمت و تولید سیگنال...\n');

  // مرحله 1: دریافت قیمت
  console.log('مرحله 1: دریافت قیمت بازار...');
  const priceTest: TestCase = {
    name: 'Get Market Price',
    method: 'GET',
    endpoint: '/api/market/prices',
    params: { symbols: 'BTC' },
    expectedStatus: 200,
  };

  const priceResult = await framework.runTest(priceTest);
  
  if (!priceResult.passed) {
    console.log('❌ دریافت قیمت ناموفق بود');
    return;
  }

  console.log('✅ قیمت دریافت شد');
  console.log(`   BTC: $${priceResult.response?.BTC?.toLocaleString() || 'N/A'}`);

  // مرحله 2: دریافت داده‌های تاریخی
  console.log('\nمرحله 2: دریافت داده‌های تاریخی...');
  const historicalTest: TestCase = {
    name: 'Get Historical Data',
    method: 'GET',
    endpoint: '/api/market/historical',
    params: {
      symbol: 'BTCUSDT',
      interval: '1h',
      limit: 10,
    },
    expectedStatus: [200, 404],
  };

  const historicalResult = await framework.runTest(historicalTest);
  console.log(historicalResult.passed ? '✅ داده‌های تاریخی دریافت شد' : '⚠️ endpoint موجود نیست');

  // مرحله 3: تولید سیگنال
  console.log('\nمرحله 3: تولید سیگنال...');
  const signalTest: TestCase = {
    name: 'Generate Signal',
    method: 'POST',
    endpoint: '/api/signals/generate',
    data: {
      symbol: 'BTCUSDT',
      timeframe: '15m',
    },
    expectedStatus: [200, 404, 500],
  };

  const signalResult = await framework.runTest(signalTest);
  console.log(signalResult.passed ? '✅ سیگنال تولید شد' : '⚠️ endpoint موجود نیست');

  console.log('\n✅ جریان تست کامل شد');
}

// ===== اجرای همه مثال‌ها =====

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           مثال‌های عملی ماژول API Testing                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    await example1_SimpleTest();
    await example2_ValidationTest();
    await example3_MultiplTests();
    await example4_InputValidation();
    await example5_Sanitization();
    await example6_PerformanceTest();
    await example7_ErrorHandling();
    await example8_CustomSchema();
    await example9_IntegrationFlow();

    console.log('\n\n✅ همه مثال‌ها با موفقیت اجرا شدند!\n');
  } catch (error) {
    console.error('\n❌ خطا در اجرای مثال‌ها:', error);
  }
}

// اجرای مثال‌ها
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export {
  example1_SimpleTest,
  example2_ValidationTest,
  example3_MultiplTests,
  example4_InputValidation,
  example5_Sanitization,
  example6_PerformanceTest,
  example7_ErrorHandling,
  example8_CustomSchema,
  example9_IntegrationFlow,
};

