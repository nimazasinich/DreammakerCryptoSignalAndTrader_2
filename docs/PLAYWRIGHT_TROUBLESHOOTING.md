# راهنمای رفع مشکلات Playwright

## خطای `connect EACCES ::1:xxxxx`

### توضیح مشکل

این خطا زمانی رخ می‌دهد که Playwright نمی‌تواند به سرور محلی متصل شود. دلایل احتمالی:

1. **مشکل IPv6**: ویندوز سعی می‌کند از IPv6 (`::1`) استفاده کند که ممکن است مسدود باشد
2. **پورت در حال استفاده**: پورت‌های 5173 یا 3001 قبلاً در حال استفاده هستند
3. **Timeout کوتاه**: سرور زمان کافی برای راه‌اندازی ندارد
4. **فایروال/آنتی‌ویروس**: نرم‌افزارهای امنیتی اتصالات محلی را مسدود می‌کنند
5. **دسترسی‌های شبکه**: مشکلات مربوط به دسترسی‌های سیستمی

## راه‌حل‌های پیاده‌سازی شده

### 1. تغییر از `localhost` به `127.0.0.1` ✅

**چرا این کار را کردیم؟**
- `localhost` ممکن است به IPv6 (`::1`) یا IPv4 (`127.0.0.1`) resolve شود
- استفاده مستقیم از `127.0.0.1` مطمئن می‌شود که از IPv4 استفاده می‌شود
- این مشکلات مربوط به IPv6 در ویندوز را حل می‌کند

**تغییرات در `playwright.config.ts`:**
```typescript
baseURL: 'http://127.0.0.1:5173',  // قبلاً: 'http://localhost:5173'
```

### 2. افزایش Timeout ✅

**چرا این کار را کردیم؟**
- سرور ممکن است زمان بیشتری برای راه‌اندازی نیاز داشته باشد
- بخصوص در ویندوز، راه‌اندازی کندتر است

**تغییرات:**
```typescript
timeout: 180000,  // 3 دقیقه (قبلاً: 120000)
navigationTimeout: 30000,  // 30 ثانیه
actionTimeout: 10000,  // 10 ثانیه
```

### 3. فعال‌سازی `reuseExistingServer` ✅

**چرا این کار را کردیم؟**
- اگر سرور قبلاً در حال اجرا است، از آن استفاده می‌کند
- از راه‌اندازی مجدد و تداخل پورت جلوگیری می‌کند

**تغییرات:**
```typescript
reuseExistingServer: true,
```

### 4. کاهش Workers به 1 ✅

**چرا این کار را کردیم؟**
- اجرای موازی تست‌ها می‌تواند باعث تداخل شود
- یک worker مطمئن می‌شود که تست‌ها به صورت ترتیبی اجرا می‌شوند

**تغییرات:**
```typescript
workers: 1,
fullyParallel: false,
```

### 5. افزودن Retry ✅

**چرا این کار را کردیم؟**
- تست‌های ناموفق یک بار دیگر اجرا می‌شوند
- مشکلات موقت شبکه را حل می‌کند

**تغییرات:**
```typescript
retries: process.env.CI ? 2 : 1,
```

## روش‌های استفاده

### روش 1: استفاده از اسکریپت خودکار (توصیه می‌شود برای ویندوز)

```bash
npm run e2e:smoke:win
```

این اسکریپت:
- ✅ وضعیت سرور را چک می‌کند
- ✅ در صورت نیاز، سرور را اجرا می‌کند
- ✅ منتظر راه‌اندازی کامل می‌ماند
- ✅ تست‌ها را اجرا می‌کند

### روش 2: اجرای دستی (کنترل بیشتر)

**مرحله 1: اجرای سرور**
```bash
npm run dev
```

منتظر بمانید تا این پیام‌ها را ببینید:
```
Frontend: http://localhost:5173
Backend:  http://localhost:3001
```

**مرحله 2: اجرای تست‌ها (در ترمینال جدید)**
```bash
npm run e2e:smoke
```

### روش 3: استفاده از UI Mode

برای دیباگ و توسعه:
```bash
npm run e2e:ui
```

## رفع مشکلات رایج

### مشکل: پورت در حال استفاده است

**راه‌حل 1: استفاده از اسکریپت kill**
```bash
npm run dev:kill
```

**راه‌حل 2: دستی در PowerShell**
```powershell
# کشتن پروسه روی پورت 5173
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force

# کشتن پروسه روی پورت 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

### مشکل: فایروال یا آنتی‌ویروس

**راه‌حل:**
1. اضافه کردن Node.js به لیست استثناهای فایروال
2. موقتاً غیرفعال کردن آنتی‌ویروس برای تست
3. اجازه دادن به اتصالات localhost در تنظیمات امنیتی

### مشکل: IPv6 مسدود است

**راه‌حل 1: استفاده از تنظیمات جدید (پیاده‌سازی شده)**
- فایل `playwright.config.ts` به‌روزرسانی شده است

**راه‌حل 2: غیرفعال کردن IPv6 (در صورت نیاز)**
```powershell
# اجرا به عنوان Administrator
Disable-NetAdapterBinding -Name "*" -ComponentID ms_tcpip6
```

**توجه:** بعد از این کار نیاز به راه‌اندازی مجدد سیستم دارید.

### مشکل: سرور خیلی کند راه‌اندازی می‌شود

**راه‌حل:**
1. صبر کنید تا سرور کاملاً آماده شود (30-60 ثانیه)
2. timeout در config افزایش یافته است
3. از `reuseExistingServer: true` استفاده کنید

## دستورات مفید

```bash
# اجرای تست‌های smoke
npm run e2e:smoke

# اجرای تست‌های smoke با اسکریپت کمکی (ویندوز)
npm run e2e:smoke:win

# اجرای تست‌ها در UI mode
npm run e2e:ui

# نمایش گزارش آخرین تست
npm run e2e:report

# اجرای همه تست‌ها
npx playwright test

# اجرای تست خاص
npx playwright test e2e/smoke.spec.ts

# اجرای تست‌ها با debug
npx playwright test --debug

# اجرای تست‌ها با headed mode
npx playwright test --headed
```

## چک‌لیست رفع مشکل

اگر هنوز مشکل دارید، این موارد را بررسی کنید:

- [ ] Node.js نسخه 18 یا بالاتر نصب است؟
  ```bash
  node --version
  ```

- [ ] Playwright نصب است؟
  ```bash
  npx playwright install
  ```

- [ ] پورت‌های 5173 و 3001 آزاد هستند؟
  ```powershell
  Get-NetTCPConnection -LocalPort 5173,3001
  ```

- [ ] سرور به درستی اجرا می‌شود؟
  ```bash
  npm run dev
  ```

- [ ] فایروال اتصالات localhost را مسدود نمی‌کند؟

- [ ] آنتی‌ویروس فعال است؟

- [ ] VPN یا Proxy فعال است؟

- [ ] فایل `.env` وجود دارد و به درستی تنظیم شده است؟

## لاگ‌های مفید

برای دیباگ بهتر، این دستورات را اجرا کنید:

```bash
# نمایش لاگ‌های کامل
DEBUG=pw:api npx playwright test

# نمایش لاگ‌های شبکه
DEBUG=pw:browser npx playwright test

# ذخیره trace
npx playwright test --trace on
```

## تماس با پشتیبانی

اگر مشکل حل نشد، لطفاً اطلاعات زیر را ارائه دهید:

1. نسخه Node.js: `node --version`
2. نسخه npm: `npm --version`
3. نسخه Playwright: `npx playwright --version`
4. سیستم عامل: ویندوز 10/11
5. خطای کامل از ترمینال
6. لاگ‌های سرور
7. آیا فایروال/آنتی‌ویروس فعال است؟

## منابع بیشتر

- [مستندات رسمی Playwright](https://playwright.dev/)
- [راهنمای رفع مشکلات Playwright](https://playwright.dev/docs/troubleshooting)
- [GitHub Issues](https://github.com/microsoft/playwright/issues)

