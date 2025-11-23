# راهنمای Additive Merge و جلوگیری از Overwrite

این مستندات توضیح می‌دهد چطور **بدون حذف یا overwrite کردن** فایل‌های موجود، تغییرات را به صورت افزوده (additive) اعمال کنیم.

---

## 🎯 هدف

**هیچ چیزی نباید جایگزین شود - همه چیز باید افزوده شود**

این اصل تضمین می‌کند:
- ✅ هیچ Provider موجودی حذف نمی‌شود
- ✅ هیچ API key موجودی از بین نمی‌رود
- ✅ هیچ config موجودی overwrite نمی‌شود
- ✅ UI همیشه با fallback cascade کار می‌کند

---

## 📁 اسکریپت‌های موجود

### 1. `safe-merge-json.mjs` - ادغام ایمن JSON

ادغام دو فایل JSON بدون حذف کلیدهای موجود.

#### استفاده:

```bash
node scripts/safe-merge-json.mjs <base.json> <patch.json> [output.json]
```

#### مثال:

```bash
# ادغام providerهای جدید به config موجود
node scripts/safe-merge-json.mjs \
  config/providers_config.json \
  patches/new-providers.json \
  config/providers_config.json
```

#### ویژگی‌ها:
- ✅ Deep merge: ادغام بازگشتی objectها
- ✅ Array merge: حذف تکراری + حفظ همه المان‌ها
- ✅ Backup خودکار قبل از تغییر
- ✅ گزارش دقیق: چه چیزهایی اضافه/merge شده
- ✅ Non-destructive: هیچ داده‌ای حذف نمی‌شود

#### مثال خروجی:

```
🔄 Starting safe additive merge...

  ➕ Added: config.providers.newsapi
  🔀 Merged array: config.fallbackChain (3 → 5 items)
  ⏭️  Skipped (exists): config.apiKeys.coingecko

✅ Safe merge completed!
   Output: config/providers_config.json
   Stats:
     • Added keys: 12
     • Merged arrays: 3
     • No existing data was removed or overwritten
```

---

### 2. `safe-add-env.sh` - افزودن ایمن به .env.example

افزودن متغیرهای محیطی جدید بدون تغییر موجودها.

#### استفاده:

```bash
bash scripts/safe-add-env.sh [path/to/.env.example]
```

پیش‌فرض: `.env.example` در ریشه پروژه

#### مثال:

```bash
# افزودن کلیدهای جدید
bash scripts/safe-add-env.sh

# یا برای فایل دیگر
bash scripts/safe-add-env.sh config/.env.production
```

#### ویژگی‌ها:
- ✅ فقط کلیدهای جدید اضافه می‌شوند
- ✅ کلیدهای موجود (حتی commented) تغییر نمی‌کنند
- ✅ Backup خودکار
- ✅ گزارش واضح از تغییرات

#### افزودن کلید دلخواه:

در `safe-add-env.sh` از تابع `add_if_missing` استفاده کنید:

```bash
# مثال افزودن کلید جدید:
if add_if_missing "NEW_API_KEY" "default-value" "توضیحات"; then
  ((ADDED++))
fi
```

---

## 🛠 Utility برای کد TypeScript

### `additiveProviderRegistry.ts`

کلاس‌ها و helperهای TypeScript برای مدیریت ایمن providerها.

#### 1. کلاس `AdditiveProviderRegistry<T>`

رجیستری type-safe برای Providerها که از overwrite جلوگیری می‌کند.

```typescript
import { AdditiveProviderRegistry } from '../utils/additiveProviderRegistry.js';

// ایجاد رجیستری
const registry = new AdditiveProviderRegistry<ProviderFunction>('MarketData');

// افزودن providerها (فقط اگر قبلاً نبود)
registry.register('CoinGecko', coinGeckoProvider);
registry.register('Binance', binanceProvider);
registry.register('NewsAPI', newsApiProvider);  // ← جدید، بدون حذف قبلی

// دریافت همه
const allProviders = registry.getAll();  // همه providerها حفظ شده‌اند

// دریافت یکی
const provider = registry.get('CoinGecko');

// بررسی وجود
if (!registry.has('Santiment')) {
  registry.register('Santiment', santimentProvider);
}
```

#### 2. تابع `mergeProviderLists()`

ادغام دو لیست provider بدون حذف موجود.

```typescript
import { mergeProviderLists } from '../utils/additiveProviderRegistry.js';

// Providerهای اصلی (قبلی)
const coreProviders = [
  { name: 'CoinGecko', fn: () => getCoinGeckoPrices() },
  { name: 'Binance', fn: () => getBinancePrices() },
  { name: 'Kraken', fn: () => getKrakenPrices() }
];

// Providerهای جدید (optional)
const optionalProviders = [
  { name: 'NewsAPI', fn: () => getNews() },
  { name: 'Santiment', fn: () => getSentiment() }
];

// ادغام بدون حذف
const allProviders = mergeProviderLists(
  coreProviders,           // موجود
  optionalProviders,        // جدید
  (p) => p.name,           // کلید یکتا
  'DataProvider'           // نام (برای لاگ)
);

// نتیجه: همه 5 provider موجودند (3 core + 2 optional)
console.log(allProviders.length);  // 5
```

#### 3. تابع `mergeUnique()`

ادغام آرایه‌های primitive بدون تکرار.

```typescript
import { mergeUnique } from '../utils/additiveProviderRegistry.js';

const existingAPIs = ['coingecko', 'binance', 'kraken'];
const newAPIs = ['newsapi', 'santiment', 'coingecko'];  // coingecko تکراری

const merged = mergeUnique(existingAPIs, newAPIs);
// نتیجه: ['coingecko', 'binance', 'kraken', 'newsapi', 'santiment']
```

---

## 🚨 چطور از Overwrite جلوگیری کنیم؟

### ❌ **اشتباه** (Overwrite):

```typescript
// BAD: لیست جدید جای قبلی را می‌گیرد
const providers = [NewAPI1, NewAPI2];  // ❌ قبلی‌ها حذف شدند!
```

### ✅ **صحیح** (Additive):

```typescript
// GOOD: حفظ موجود + افزودن جدید
import { mergeProviderLists } from '../utils/additiveProviderRegistry.js';

const keep = this.providers ?? [];
const newOnes = [NewAPI1, NewAPI2];

this.providers = mergeProviderLists(keep, newOnes, (p) => p.name);
// ✅ همه قبلی‌ها + جدیدها حفظ شده‌اند
```

---

## 📋 Checklist قبل از تغییرات

قبل از هر تغییری که ممکن است providerها، configs یا env variables را تحت تاثیر قرار دهد:

- [ ] آیا از `safe-merge-json.mjs` برای JSON استفاده کردم؟
- [ ] آیا از `safe-add-env.sh` برای .env استفاده کردم؟
- [ ] آیا در کد TypeScript از `mergeProviderLists()` استفاده کردم؟
- [ ] آیا لیست providerها را **overwrite** نکردم؟
- [ ] آیا backup گرفتم؟
- [ ] آیا بعد از تغییر تست کردم که همه providerها فعال هستند؟

---

## 🧪 تست بعد از تغییرات

```bash
# 1. بررسی تعداد providerها
npm run test:providers  # یا هر تستی که تعداد را چک کند

# 2. تست network و fallback cascade
curl -s http://localhost:8001/api/system/diagnostics/netcheck | jq

# 3. تست pipeline
npm run test:pipeline

# 4. بررسی لاگ‌ها برای warning/error
docker compose logs | grep -E "ERROR|WARN|provider"
```

---

## 🔧 عیب‌یابی

### مشکل: UI blank است یا providerها کار نمی‌کنند

**علت احتمالی**: لیست providerها overwrite شده.

**راه حل**:

1. بررسی لاگ‌ها:
   ```bash
   docker compose logs | grep -i "provider"
   ```

2. بررسی تعداد providerها در `MultiProviderMarketDataService.ts`:
   ```bash
   grep -n "providers = \[" src/services/MultiProviderMarketDataService.ts
   ```

3. اگر لیست کوچک شده، از این الگو استفاده کنید:
   ```typescript
   import { AdditiveProviderRegistry } from '../utils/additiveProviderRegistry.js';

   const registry = new AdditiveProviderRegistry<Provider>('MarketData');

   // ثبت همه providerها (قدیم + جدید)
   registry.register('CoinGecko', coinGeckoProvider);
   registry.register('Binance', binanceProvider);
   // ... باقی providerها

   this.providers = registry.getAll();
   ```

### مشکل: برخی کلیدهای .env گم شده‌اند

**راه حل**:

```bash
# اجرای safe-add-env دوباره
bash scripts/safe-add-env.sh

# یا restore از backup
cp .env.example.backup-[TIMESTAMP] .env.example
```

---

## 📚 منابع بیشتر

- [TypeScript Deep Merge Strategies](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [JavaScript Set for Unique Arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [JSON Merge Patch RFC 7386](https://tools.ietf.org/html/rfc7386)

---

**نکته مهم**: همیشه قبل از تغییرات، backup بگیرید و بعد از تغییر تست کنید. 🛡️
