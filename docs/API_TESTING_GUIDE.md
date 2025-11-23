# راهنمای جامع تست API

این راهنما شامل اطلاعات کامل برای استفاده از ماژول تست API است.

## 📋 فهرست مطالب

1. [معرفی](#معرفی)
2. [نصب و راه‌اندازی](#نصب-و-راه‌اندازی)
3. [ساختار ماژول](#ساختار-ماژول)
4. [استفاده از CLI](#استفاده-از-cli)
5. [نوشتن تست‌های سفارشی](#نوشتن-تست‌های-سفارشی)
6. [اعتبارسنجی](#اعتبارسنجی)
7. [مثال‌های کاربردی](#مثال‌های-کاربردی)
8. [بهترین روش‌ها](#بهترین-روش‌ها)

---

## معرفی

ماژول تست API یک چارچوب قدرتمند برای تست خودکار API‌ها است که شامل:

### ✨ ویژگی‌ها

- ✅ **تست خودکار**: اجرای خودکار تست‌ها با قابلیت Retry
- ✅ **اعتبارسنجی**: اعتبارسنجی پیشرفته Request و Response
- ✅ **مدیریت خطا**: مدیریت هوشمند خطاها با گزارش‌دهی جامع
- ✅ **Performance Testing**: تست عملکرد و Load Testing
- ✅ **Security Testing**: تست امنیتی و جلوگیری از حملات
- ✅ **گزارش‌دهی**: تولید گزارش‌های JSON و Markdown
- ✅ **CLI Tool**: ابزار خط فرمان برای اجرای آسان تست‌ها

---

## نصب و راه‌اندازی

### پیش‌نیازها

```bash
Node.js >= 18.0.0
npm >= 9.0.0
```

### نصب وابستگی‌ها

تمام وابستگی‌های مورد نیاز از قبل در `package.json` موجود است:

```bash
npm install
```

### متغیرهای محیطی

فایل `.env` را ایجاد کنید:

```env
API_BASE_URL=http://localhost:3001
```

---

## ساختار ماژول

```
src/testing/
├── api-test-framework.ts    # چارچوب اصلی تست
├── request-validator.ts      # اعتبارسنجی درخواست‌ها
├── integration-tests.ts      # تست‌های یکپارچه‌سازی
├── market-api.test.ts        # تست‌های Market API
├── cli.ts                    # ابزار CLI
└── index.ts                  # Export همه ماژول‌ها
```

### ماژول‌های اصلی

#### 1. API Test Framework (`api-test-framework.ts`)

چارچوب اصلی برای اجرای تست‌ها:

```typescript
import { APITestFramework } from './testing';

const framework = new APITestFramework({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
});
```

#### 2. Request Validator (`request-validator.ts`)

اعتبارسنجی درخواست‌ها:

```typescript
import { RequestValidator, CommonSchemas } from './testing';

const result = RequestValidator.validate(data, CommonSchemas.marketPriceRequest);
```

#### 3. Integration Tests (`integration-tests.ts`)

تست‌های یکپارچه‌سازی:

```typescript
import { IntegrationTestRunner } from './testing';

const runner = new IntegrationTestRunner();
await runner.runAllTests();
```

---

## استفاده از CLI

### دستورات اصلی

#### اجرای تمام تست‌ها

```bash
tsx src/testing/cli.ts all
```

#### تست‌های Market API

```bash
tsx src/testing/cli.ts market
```

#### تست‌های Performance

```bash
tsx src/testing/cli.ts performance
```

#### تست‌های Security

```bash
tsx src/testing/cli.ts security
```

#### تست Concurrent Requests

```bash
# اجرای 50 درخواست همزمان
tsx src/testing/cli.ts concurrent 50
```

#### تست Load Testing

```bash
# 20 درخواست در ثانیه به مدت 30 ثانیه
tsx src/testing/cli.ts load 20 30
```

### گزینه‌های CLI

```bash
--base-url <url>    # آدرس API (پیش‌فرض: http://localhost:3001)
--output <dir>      # دایرکتوری خروجی گزارش‌ها
--format <format>   # فرمت گزارش: json, markdown, console
--verbose           # خروجی کامل
```

### مثال‌های کاربردی CLI

```bash
# تست با آدرس سفارشی
tsx src/testing/cli.ts all --base-url http://localhost:8001

# ذخیره گزارش در فرمت JSON
tsx src/testing/cli.ts market --output ./reports --format json

# تست Performance با خروجی کامل
tsx src/testing/cli.ts performance --verbose

# تست Load با تنظیمات سفارشی
tsx src/testing/cli.ts load 50 60 --output ./reports
```

---

## نوشتن تست‌های سفارشی

### ساختار یک Test Case

```typescript
import { TestCase } from './testing';

const myTest: TestCase = {
  name: 'Test Name',
  method: 'GET',
  endpoint: '/api/endpoint',
  params: {
    key: 'value',
  },
  expectedStatus: 200,
  expectedSchema: {
    field1: 'string',
    field2: 'number',
  },
  validateResponse: (response) => {
    return response.data.field1 === 'expected';
  },
};
```

### مثال: تست سفارشی برای Signal API

```typescript
import APITestFramework, { TestCase } from './testing/api-test-framework';

const signalTests: TestCase[] = [
  {
    name: 'Get Signal for BTCUSDT',
    method: 'POST',
    endpoint: '/api/signals/generate',
    data: {
      symbol: 'BTCUSDT',
      timeframe: '15m',
    },
    expectedStatus: 200,
    expectedSchema: {
      signal: 'string',
      confidence: 'number',
      timestamp: 'number',
    },
    validateResponse: (response) => {
      const { signal, confidence } = response.data;
      return (
        ['BUY', 'SELL', 'HOLD'].includes(signal) &&
        confidence >= 0 &&
        confidence <= 100
      );
    },
  },
];

// اجرای تست‌ها
const framework = new APITestFramework({
  baseURL: 'http://localhost:3001',
});

const result = await framework.runSuite('Signal API', signalTests);
console.log(result);
```

### اجرای تست با Vitest

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import APITestFramework from './testing/api-test-framework';

describe('My API Tests', () => {
  let framework: APITestFramework;

  beforeAll(() => {
    framework = new APITestFramework({
      baseURL: 'http://localhost:3001',
    });
  });

  it('should pass my test', async () => {
    const result = await framework.runTest({
      name: 'Test',
      method: 'GET',
      endpoint: '/api/health',
      expectedStatus: 200,
    });

    expect(result.passed).toBe(true);
  });
});
```

---

## اعتبارسنجی

### استفاده از Request Validator

#### اعتبارسنجی ساده

```typescript
import { RequestValidator, ValidationSchema } from './testing';

const schema: ValidationSchema = {
  symbol: {
    required: true,
    type: 'string',
    pattern: /^[A-Z0-9]+$/,
  },
  limit: {
    required: false,
    type: 'number',
    min: 1,
    max: 1000,
  },
};

const data = {
  symbol: 'BTCUSDT',
  limit: 100,
};

const result = RequestValidator.validate(data, schema);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

#### استفاده از Schema‌های آماده

```typescript
import { RequestValidator, CommonSchemas } from './testing';

// اعتبارسنجی درخواست قیمت بازار
const result = RequestValidator.validate(
  { symbols: 'BTC,ETH' },
  CommonSchemas.marketPriceRequest
);

// اعتبارسنجی درخواست داده‌های تاریخی
const result2 = RequestValidator.validate(
  {
    symbol: 'BTCUSDT',
    interval: '1h',
    limit: 100,
  },
  CommonSchemas.historicalDataRequest
);
```

#### اعتبارسنجی‌های خاص

```typescript
import { RequestValidator } from './testing';

// اعتبارسنجی Symbol
const symbolResult = RequestValidator.validateSymbol('BTCUSDT');

// اعتبارسنجی Timeframe
const timeframeResult = RequestValidator.validateTimeframe('1h');

// اعتبارسنجی Date Range
const dateResult = RequestValidator.validateDateRange(
  '2024-01-01',
  '2024-12-31'
);

// اعتبارسنجی Pagination
const paginationResult = RequestValidator.validatePagination(1, 100);
```

### Sanitization (پاکسازی ورودی)

```typescript
import { RequestValidator } from './testing';

// پاکسازی یک رشته
const clean = RequestValidator.sanitizeInput('<script>alert("XSS")</script>');
// نتیجه: 'scriptalert(XSS)/script'

// پاکسازی یک Object
const cleanObj = RequestValidator.sanitizeObject({
  name: '<b>Test</b>',
  value: 'normal',
});
// نتیجه: { name: 'bTest/b', value: 'normal' }
```

### استفاده به عنوان Express Middleware

```typescript
import express from 'express';
import { validateRequest, sanitizeRequest, CommonSchemas } from './testing';

const app = express();

// Middleware برای Sanitize
app.use(sanitizeRequest());

// Middleware برای اعتبارسنجی
app.get(
  '/api/market/prices',
  validateRequest(CommonSchemas.marketPriceRequest),
  (req, res) => {
    // اگر به اینجا رسید، داده‌ها معتبر هستند
    res.json({ success: true });
  }
);
```

---

## مثال‌های کاربردی

### مثال 1: تست کامل Market API

```typescript
import { IntegrationTestRunner } from './testing';

async function testMarketAPI() {
  const runner = new IntegrationTestRunner('http://localhost:3001');
  
  // اجرای تست‌های Market
  const results = await runner.runAllTests();
  
  // تولید گزارش
  const report = runner.generateComprehensiveReport(results);
  
  console.log(report);
}

testMarketAPI();
```

### مثال 2: تست Performance

```typescript
import { IntegrationTestRunner } from './testing';

async function testPerformance() {
  const runner = new IntegrationTestRunner();
  
  // تست Concurrent Requests
  await runner.testConcurrentRequests(50);
  
  // تست Load Capacity
  await runner.testLoadCapacity(20, 30);
}

testPerformance();
```

### مثال 3: تست Security

```typescript
import { IntegrationTestRunner } from './testing';

async function testSecurity() {
  const runner = new IntegrationTestRunner();
  
  // اجرای تست‌های امنیتی
  const result = await runner.runSecurityTests();
  
  if (result.failed > 0) {
    console.error('⚠️ Security issues detected!');
  }
}

testSecurity();
```

### مثال 4: تست سفارشی با Retry

```typescript
import { APITestFramework, RetryHandler } from './testing';

async function testWithRetry() {
  const framework = new APITestFramework({
    baseURL: 'http://localhost:3001',
    retries: 5,
    retryDelay: 2000,
  });
  
  const result = await framework.runTest({
    name: 'Flaky endpoint',
    method: 'GET',
    endpoint: '/api/sometimes-fails',
    expectedStatus: 200,
  });
  
  console.log(result);
}

testWithRetry();
```

---

## بهترین روش‌ها

### 1. ساختار تست‌ها

✅ **درست:**
```typescript
// تست‌ها را به دسته‌های منطقی تقسیم کنید
const healthTests = [...];
const marketTests = [...];
const signalTests = [...];
```

❌ **نادرست:**
```typescript
// همه تست‌ها در یک آرایه
const allTests = [...];
```

### 2. نام‌گذاری تست‌ها

✅ **درست:**
```typescript
{
  name: 'Get Market Prices - Should return valid prices for BTC and ETH',
  // ...
}
```

❌ **نادرست:**
```typescript
{
  name: 'Test 1',
  // ...
}
```

### 3. اعتبارسنجی Response

✅ **درست:**
```typescript
validateResponse: (response) => {
  const data = response.data;
  
  // بررسی دقیق ساختار
  if (!data || typeof data !== 'object') return false;
  if (!data.price || typeof data.price !== 'number') return false;
  if (data.price <= 0) return false;
  
  return true;
}
```

❌ **نادرست:**
```typescript
validateResponse: (response) => {
  return response.data !== null;
}
```

### 4. مدیریت خطا

✅ **درست:**
```typescript
try {
  const result = await framework.runTest(testCase);
  
  if (!result.passed) {
    console.error('Test failed:', result.error);
    console.error('Validation errors:', result.validationErrors);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

### 5. Timeout مناسب

```typescript
// برای endpoint‌های سریع
{ timeout: 1000 }

// برای endpoint‌های متوسط
{ timeout: 5000 }

// برای endpoint‌های سنگین
{ timeout: 15000 }
```

### 6. استفاده از Environment Variables

```typescript
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_KEY = process.env.API_KEY;
```

### 7. گزارش‌دهی

```typescript
// ذخیره گزارش‌ها با timestamp
const timestamp = new Date().toISOString();
const filename = `test-report-${timestamp}.json`;
```

---

## اجرا در CI/CD

### GitHub Actions

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start server
        run: npm run dev:server &
        
      - name: Wait for server
        run: sleep 10
      
      - name: Run API tests
        run: tsx src/testing/cli.ts all --output ./reports
      
      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: ./reports
```

---

## پشتیبانی و مشارکت

برای گزارش مشکلات یا پیشنهادات:

1. Issue ایجاد کنید
2. Pull Request ارسال کنید
3. مستندات را بهبود دهید

---

## لایسنس

این پروژه تحت لایسنس Unlicense منتشر شده است.

