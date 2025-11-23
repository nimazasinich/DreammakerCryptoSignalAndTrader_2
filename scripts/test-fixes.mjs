#!/usr/bin/env node
/**
 * اسکریپت تست اصلاحات
 * تست می‌کند که تمام اصلاحات به درستی اعمال شده‌اند
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BLUE = '\x1b[34m';

console.log(`${BLUE}========================================`);
console.log('🔍 تست اصلاحات پروکسی و دریافت داده‌ها');
console.log(`========================================${RESET}\n`);

const tests = [];
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readFile(path) {
  try {
    return readFileSync(join(process.cwd(), path), 'utf-8');
  } catch (error) {
    throw new Error(`فایل ${path} پیدا نشد: ${error.message}`);
  }
}

// ===== تست‌ها =====

test('Circuit Breaker Threshold افزایش یافته', () => {
  const content = readFile('src/lib/net/axiosResilience.ts');
  assert(
    content.includes('CIRCUIT_BREAKER_THRESHOLD = 15'),
    'Circuit breaker threshold باید 15 باشد'
  );
  assert(
    content.includes('CIRCUIT_BREAKER_TIMEOUT_MS = 30_000'),
    'Circuit breaker timeout باید 30 ثانیه باشد'
  );
});

test('Axios Max Retries افزایش یافته', () => {
  const content = readFile('src/lib/net/axiosResilience.ts');
  assert(
    content.includes("ENV_MAX_RETRIES = Number(process.env.AXIOS_MAX_RETRIES ?? '3')"),
    'Max retries باید 3 باشد'
  );
});

test('Axios Default Timeout افزایش یافته', () => {
  const content = readFile('src/server.ts');
  assert(
    content.includes('axios.defaults.timeout = 30000'),
    'Axios default timeout باید 30 ثانیه باشد'
  );
});

test('RealDataManager Timeout ها افزایش یافته', () => {
  const content = readFile('src/services/RealDataManager.ts');
  assert(
    content.includes('timeout: 20000') || content.includes('timeout: 25000'),
    'RealDataManager timeout ها باید افزایش یافته باشند'
  );
});

test('Cache TTL در RealDataManager افزایش یافته', () => {
  const content = readFile('src/services/RealDataManager.ts');
  assert(
    content.includes('CACHE_TTL = 120000'),
    'RealDataManager cache TTL باید 120 ثانیه باشد'
  );
});

test('MultiProviderMarketDataService Cache TTL افزایش یافته', () => {
  const content = readFile('src/services/MultiProviderMarketDataService.ts');
  assert(
    content.includes('priceCache = new TTLCache<PriceData>(15000)'),
    'Price cache TTL باید 15 ثانیه باشد'
  );
  assert(
    content.includes('ohlcvCache = new TTLCache<OHLCVData[]>(120000)'),
    'OHLCV cache TTL باید 120 ثانیه باشد'
  );
});

test('RequestCoordinator ایجاد شده', () => {
  const content = readFile('src/utils/requestCoordinator.ts');
  assert(
    content.includes('export class RequestCoordinator'),
    'RequestCoordinator class باید وجود داشته باشد'
  );
  assert(
    content.includes('async coordinate'),
    'coordinate method باید وجود داشته باشد'
  );
});

test('RequestCoordinator در MultiProviderMarketDataService استفاده شده', () => {
  const content = readFile('src/services/MultiProviderMarketDataService.ts');
  assert(
    content.includes("import { requestCoordinator } from '../utils/requestCoordinator.js'"),
    'RequestCoordinator باید import شده باشد'
  );
  assert(
    content.includes('requestCoordinator.coordinate'),
    'requestCoordinator.coordinate باید استفاده شده باشد'
  );
});

test('UnifiedProxyService MaxRetries افزایش یافته', () => {
  const content = readFile('src/services/UnifiedProxyService.ts');
  assert(
    content.includes('maxRetries: number = 5'),
    'UnifiedProxyService maxRetries باید 5 باشد'
  );
});

test('ENV Variables بهینه شده', () => {
  const content = readFile('env');
  assert(
    content.includes('AXIOS_MAX_RETRIES=3'),
    'AXIOS_MAX_RETRIES باید 3 باشد'
  );
  assert(
    content.includes('BOOT_NO_RETRY=false'),
    'BOOT_NO_RETRY باید false باشد'
  );
  assert(
    content.includes('BOOT_WINDOW_MS=120000'),
    'BOOT_WINDOW_MS باید 120000 باشد'
  );
});

test('DataContext Timeout افزایش یافته', () => {
  const content = readFile('src/contexts/DataContext.tsx');
  assert(
    content.includes('AbortSignal.timeout(5000)'),
    'DataContext timeout باید 5 ثانیه باشد'
  );
});

test('Documentation ایجاد شده', () => {
  const content = readFile('PROXY_AND_DATA_FIXES.md');
  assert(
    content.includes('گزارش کامل اصلاحات'),
    'Documentation فایل باید وجود داشته باشد'
  );
});

// ===== اجرای تست‌ها =====

console.log(`${YELLOW}در حال اجرای ${tests.length} تست...${RESET}\n`);

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  ${RED}خطا: ${error.message}${RESET}`);
    failedTests++;
  }
}

// ===== نتیجه =====

console.log(`\n${BLUE}========================================`);
console.log('📊 نتایج تست');
console.log(`========================================${RESET}`);
console.log(`${GREEN}✓ موفق: ${passedTests}${RESET}`);
console.log(`${RED}✗ ناموفق: ${failedTests}${RESET}`);
console.log(`📝 کل: ${tests.length}\n`);

if (failedTests === 0) {
  console.log(`${GREEN}🎉 تمام تست‌ها موفق بودند!${RESET}`);
  console.log(`${GREEN}✅ اصلاحات به درستی اعمال شده‌اند${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${RED}❌ برخی تست‌ها ناموفق بودند${RESET}`);
  console.log(`${YELLOW}⚠️  لطفا فایل‌های مربوطه را بررسی کنید${RESET}\n`);
  process.exit(1);
}

