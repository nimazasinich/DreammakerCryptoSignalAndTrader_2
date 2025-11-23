/**
 * مثال استفاده از قابلیت‌های هوشمند تست
 */

import { SmartTestRunner, testConfig, pluginManager, LoggerPlugin } from '../src/testing';

// ===== مثال 1: استفاده ساده =====
async function example1() {
  console.log('\n📝 مثال 1: استفاده ساده از Smart Runner\n');

  const runner = new SmartTestRunner();
  
  const tests = [
    {
      name: 'Health Check',
      method: 'GET' as const,
      endpoint: '/api/health',
      expectedStatus: 200,
    },
  ];

  const result = await runner.runTests(tests);
  console.log(`✅ نتیجه: ${result.passed} موفق، ${result.failed} ناموفق`);
}

// ===== مثال 2: با تنظیمات سفارشی =====
async function example2() {
  console.log('\n📝 مثال 2: با تنظیمات سفارشی\n');

  const runner = new SmartTestRunner({
    baseURL: 'http://localhost:3001',
    parallelTests: true,
    maxParallel: 10,
    failFast: true,
    reportFormat: 'json',
    reportDir: './my-reports',
  });

  const tests = [
    {
      name: 'Test 1',
      method: 'GET' as const,
      endpoint: '/api/health',
      expectedStatus: 200,
    },
    {
      name: 'Test 2',
      method: 'GET' as const,
      endpoint: '/api/market/prices',
      params: { symbols: 'BTC' },
      expectedStatus: 200,
    },
  ];

  const result = await runner.runTests(tests);
  await runner.generateReport([result]);
}

// ===== مثال 3: با Plugin =====
async function example3() {
  console.log('\n📝 مثال 3: با Plugin\n');

  // ثبت plugin
  pluginManager.register(LoggerPlugin);

  const runner = new SmartTestRunner();
  
  const tests = [
    {
      name: 'Test with Plugin',
      method: 'GET' as const,
      endpoint: '/api/health',
      expectedStatus: 200,
    },
  ];

  await runner.runTests(tests);
}

// ===== مثال 4: تغییر تنظیمات Global =====
async function example4() {
  console.log('\n📝 مثال 4: تغییر تنظیمات Global\n');

  // تغییر تنظیمات
  testConfig.updateConfig({
    timeout: 5000,
    retries: 5,
    parallelTests: false,
  });

  console.log('تنظیمات فعلی:', testConfig.getConfig());

  // بازگشت به تنظیمات پیش‌فرض
  testConfig.resetConfig();
}

// ===== مثال 5: استفاده از Cache =====
async function example5() {
  console.log('\n📝 مثال 5: استفاده از Cache\n');

  const runner = new SmartTestRunner({
    cacheResponses: true,
  });

  const tests = [
    {
      name: 'Cached Test',
      method: 'GET' as const,
      endpoint: '/api/health',
      expectedStatus: 200,
    },
  ];

  // اولین اجرا
  console.log('اجرای اول (بدون cache):');
  await runner.runTests(tests);

  // دومین اجرا (با cache)
  console.log('\nاجرای دوم (با cache):');
  await runner.runTests(tests);

  // پاک کردن cache
  runner.clearCache();
}

// اجرای همه مثال‌ها
async function main() {
  await example1();
  await example2();
  await example3();
  await example4();
  await example5();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

