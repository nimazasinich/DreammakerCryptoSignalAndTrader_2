# API Testing Module

> ماژول قدرتمند برای تست خودکار API با قابلیت‌های پیشرفته

## 🚀 شروع سریع

### نصب

تمام وابستگی‌ها از قبل نصب شده‌اند. فقط کافیست:

```bash
npm install
```

### اجرای اولین تست

```bash
# تست تمام endpoint‌ها
npm run test:api

# تست Market API
npm run test:api:market

# تست Performance
npm run test:api:performance
```

## 📦 ساختار ماژول

```
src/testing/
├── api-test-framework.ts    # چارچوب اصلی تست
├── request-validator.ts      # اعتبارسنجی درخواست‌ها
├── integration-tests.ts      # تست‌های یکپارچه‌سازی
├── market-api.test.ts        # تست‌های Market API
├── cli.ts                    # ابزار CLI
├── index.ts                  # Export ماژول‌ها
└── README.md                 # این فایل
```

## 🎯 ویژگی‌ها

### ✅ تست خودکار
- اجرای خودکار تست‌ها
- Retry هوشمند برای درخواست‌های ناموفق
- Timeout قابل تنظیم
- گزارش‌دهی جامع

### ✅ اعتبارسنجی
- اعتبارسنجی Request و Response
- Schema Validation
- Type Checking
- Custom Validators

### ✅ مدیریت خطا
- مدیریت هوشمند خطاها
- گزارش دقیق خطاها
- Graceful Error Handling

### ✅ Performance Testing
- تست Concurrent Requests
- Load Testing
- Response Time Monitoring

### ✅ Security Testing
- تست SQL Injection
- تست XSS
- Rate Limiting
- Input Sanitization

## 📚 استفاده

### 1. استفاده از CLI

```bash
# تمام تست‌ها
tsx src/testing/cli.ts all

# تست‌های خاص
tsx src/testing/cli.ts market
tsx src/testing/cli.ts performance
tsx src/testing/cli.ts security

# تست Concurrent
tsx src/testing/cli.ts concurrent 50

# تست Load
tsx src/testing/cli.ts load 20 30

# با گزارش
tsx src/testing/cli.ts all --output ./reports --format markdown
```

### 2. استفاده در کد

```typescript
import { APITestFramework, TestCase } from './testing';

const framework = new APITestFramework({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  retries: 3,
});

const tests: TestCase[] = [
  {
    name: 'Test Health Endpoint',
    method: 'GET',
    endpoint: '/api/health',
    expectedStatus: 200,
  },
];

const result = await framework.runSuite('My Tests', tests);
console.log(result);
```

### 3. استفاده با Vitest

```typescript
import { describe, it, expect } from 'vitest';
import { APITestFramework } from './testing';

describe('API Tests', () => {
  it('should pass health check', async () => {
    const framework = new APITestFramework({
      baseURL: 'http://localhost:3001',
    });

    const result = await framework.runTest({
      name: 'Health Check',
      method: 'GET',
      endpoint: '/api/health',
      expectedStatus: 200,
    });

    expect(result.passed).toBe(true);
  });
});
```

## 🔧 پیکربندی

### متغیرهای محیطی

```env
API_BASE_URL=http://localhost:3001
```

### تنظیمات Framework

```typescript
const config = {
  baseURL: 'http://localhost:3001',
  timeout: 10000,           // 10 ثانیه
  retries: 3,               // 3 بار تلاش مجدد
  retryDelay: 1000,         // 1 ثانیه تاخیر
  headers: {
    'Content-Type': 'application/json',
  },
};
```

## 📊 گزارش‌ها

### فرمت‌های گزارش

1. **Console**: نمایش در ترمینال
2. **JSON**: فایل JSON
3. **Markdown**: فایل Markdown

### مثال گزارش

```bash
# گزارش JSON
tsx src/testing/cli.ts all --output ./reports --format json

# گزارش Markdown
tsx src/testing/cli.ts all --output ./reports --format markdown

# هر دو
tsx src/testing/cli.ts all --output ./reports --format console
```

## 🧪 نوشتن تست‌های سفارشی

### تست ساده

```typescript
const simpleTest: TestCase = {
  name: 'Simple GET Request',
  method: 'GET',
  endpoint: '/api/data',
  expectedStatus: 200,
};
```

### تست با اعتبارسنجی

```typescript
const validatedTest: TestCase = {
  name: 'Validated Response',
  method: 'GET',
  endpoint: '/api/market/prices',
  params: { symbols: 'BTC,ETH' },
  expectedStatus: 200,
  expectedSchema: {
    BTC: 'number',
    ETH: 'number',
  },
  validateResponse: (response) => {
    return response.data.BTC > 0 && response.data.ETH > 0;
  },
};
```

### تست POST

```typescript
const postTest: TestCase = {
  name: 'Create Signal',
  method: 'POST',
  endpoint: '/api/signals/generate',
  data: {
    symbol: 'BTCUSDT',
    timeframe: '15m',
  },
  expectedStatus: 200,
};
```

## 🔐 اعتبارسنجی

### استفاده از Validator

```typescript
import { RequestValidator, CommonSchemas } from './testing';

// اعتبارسنجی با Schema
const result = RequestValidator.validate(data, CommonSchemas.marketPriceRequest);

if (!result.valid) {
  console.error('Errors:', result.errors);
}

// اعتبارسنجی Symbol
const symbolResult = RequestValidator.validateSymbol('BTCUSDT');

// اعتبارسنجی Timeframe
const timeframeResult = RequestValidator.validateTimeframe('1h');
```

### Schema سفارشی

```typescript
import { ValidationSchema } from './testing';

const mySchema: ValidationSchema = {
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
```

## 🛡️ امنیت

### Sanitization

```typescript
import { RequestValidator } from './testing';

// پاکسازی ورودی
const clean = RequestValidator.sanitizeInput(userInput);

// پاکسازی Object
const cleanObj = RequestValidator.sanitizeObject(requestBody);
```

### استفاده در Express

```typescript
import { validateRequest, sanitizeRequest, CommonSchemas } from './testing';

app.use(sanitizeRequest());

app.get(
  '/api/market/prices',
  validateRequest(CommonSchemas.marketPriceRequest),
  (req, res) => {
    // داده‌ها معتبر و پاکسازی شده‌اند
  }
);
```

## 📈 Performance Testing

### تست Concurrent

```typescript
import { IntegrationTestRunner } from './testing';

const runner = new IntegrationTestRunner();
await runner.testConcurrentRequests(50);
```

### تست Load

```typescript
// 20 درخواست در ثانیه به مدت 30 ثانیه
await runner.testLoadCapacity(20, 30);
```

## 🐛 رفع مشکلات

### خطای Connection Refused

```bash
# مطمئن شوید سرور در حال اجرا است
npm run dev:server

# یا آدرس صحیح را مشخص کنید
tsx src/testing/cli.ts all --base-url http://localhost:8001
```

### خطای Timeout

```typescript
// Timeout را افزایش دهید
const framework = new APITestFramework({
  baseURL: 'http://localhost:3001',
  timeout: 30000, // 30 ثانیه
});
```

### خطای Validation

```typescript
// خطاهای اعتبارسنجی را بررسی کنید
if (!result.passed && result.validationErrors) {
  console.log('Validation Errors:', result.validationErrors);
}
```

## 📖 مستندات کامل

برای مستندات کامل، فایل زیر را مطالعه کنید:

- [راهنمای کامل تست API](../../docs/API_TESTING_GUIDE.md)

## 🤝 مشارکت

برای مشارکت در توسعه این ماژول:

1. تست‌های جدید اضافه کنید
2. مستندات را بهبود دهید
3. Bug Report ارسال کنید
4. Feature Request ارائه دهید

## 📝 لایسنس

Unlicense - استفاده آزاد

---

**ساخته شده با ❤️ برای DreamMaker Crypto Trader**

