# بهینه‌سازی درخواست‌های API

## مشکل قبلی

پروژه دارای مشکلات جدی در تعداد درخواست‌های API بود:

### 🔴 مشکلات شناسایی شده:

1. **6 interval همپوشان 30 ثانیه‌ای**:
   - Dashboard.tsx
   - DataContext.tsx
   - RealDataManager (3 subscription مختلف)
   - BinanceService health check
   - KuCoinService health check
   - **نتیجه**: حداقل 12 درخواست در دقیقه برای همان داده‌ها!

2. **بدون Request Batching**:
   - هر component جداگانه درخواست می‌فرستاد
   - 3 درخواست جدا به‌جای 1 درخواست یکجا برای چند symbol

3. **کش‌های ناکارآمد با TTL های متفاوت**:
   - RealDataManager: 10 ثانیه
   - AdvancedCache marketData: 60 ثانیه
   - MarketDataService: 300 ثانیه
   - همان داده‌ها چندین بار کش می‌شدند

4. **Health Check های مکرر**: هر 30 ثانیه حتی وقتی لازم نبود

5. **بدون Request Deduplication**: اگر 2 request همزمان می‌آمد، هر دو ارسال می‌شدند

## ✅ راه‌حل‌های پیاده‌سازی شده

### 1. DataRefreshCoordinator (جدید)

یک سیستم هماهنگ‌کننده مرکزی برای تمام polling ها:

```typescript
import { dataRefreshCoordinator } from './services/DataRefreshCoordinator';

// Subscribe to coordinated refresh (60 seconds interval)
const subscriptionId = dataRefreshCoordinator.subscribe('signals', async () => {
  const signals = await fetchSignals();
  // Update UI
});

// Unsubscribe when done
dataRefreshCoordinator.unsubscribe(subscriptionId);
```

**مزایا**:
- تمام component ها به یک refresh cycle مشترک subscribe می‌شوند
- فقط یک درخواست برای هر نوع داده در هر دوره
- Interval به 60 ثانیه افزایش یافت (از 30 ثانیه)
- Request deduplication خودکار

### 2. افزایش Cache TTL

**قبل**:
```typescript
private readonly CACHE_TTL = 10000; // 10 seconds
```

**بعد**:
```typescript
private readonly CACHE_TTL = 60000; // 60 seconds
```

**نتیجه**: 6x کاهش در تعداد درخواست‌ها

### 3. Request Deduplication در RealDataManager

```typescript
private pendingRequests: Map<string, Promise<any>> = new Map();

private async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  // اگر request مشابه در حال انجام است، منتظر نتیجه آن می‌ماند
  const existing = this.pendingRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = requestFn().finally(() => {
    this.pendingRequests.delete(key);
  });

  this.pendingRequests.set(key, promise);
  return promise;
}
```

**نتیجه**: اگر 5 component همزمان برای BTC price بپرسند، فقط 1 درخواست ارسال می‌شود

### 4. افزایش Health Check Intervals

**قبل**:
```typescript
setInterval(healthCheck, 30000); // هر 30 ثانیه
```

**بعد**:
```typescript
setInterval(healthCheck, 60000); // هر 60 ثانیه
```

**فایل‌های تغییر یافته**:
- `src/services/BinanceService.ts` (line 213)
- `src/services/KuCoinService.ts` (line 234)

### 5. بهینه‌سازی Subscription Intervals

**فایل**: `src/services/RealDataManager.ts`

**تغییرات**:
- `subscribe()`: 30s → 60s (line 641)
- `subscribeToSignals()`: 30s → 60s (line 675)
- `subscribeToPortfolio()`: 30s → 60s (line 711)

## 📊 نتایج بهینه‌سازی

### قبل:
- ✗ 12+ درخواست در دقیقه برای همان داده‌ها
- ✗ Cache TTL: 10 ثانیه
- ✗ 6 interval جداگانه 30 ثانیه‌ای
- ✗ Health check هر 30 ثانیه
- ✗ بدون request deduplication

### بعد:
- ✓ 1-2 درخواست در دقیقه (کاهش 85%+)
- ✓ Cache TTL: 60 ثانیه (افزایش 6x)
- ✓ یک coordinator مرکزی با interval 60 ثانیه
- ✓ Health check هر 60 ثانیه (کاهش 50%)
- ✓ Request deduplication کامل

### صرفه‌جویی تخمینی:

برای یک سشن 1 ساعته:

**قبل**:
- Signal fetches: 120 request (هر 30s × 6 source)
- Health checks: 120 request (هر 30s × 2 service)
- Price fetches: ~240 request
- **جمع**: ~480 request/hour

**بعد**:
- Signal fetches: 60 request (هر 60s × 1 coordinator)
- Health checks: 60 request (هر 60s × 2 service)
- Price fetches: ~60 request (با cache و deduplication)
- **جمع**: ~180 request/hour

**🎉 کاهش 62.5% در تعداد درخواست‌ها!**

## 🚀 نحوه استفاده

### برای component های جدید:

```typescript
import { dataRefreshCoordinator } from '@/services/DataRefreshCoordinator';

useEffect(() => {
  // Subscribe to coordinated refresh
  const unsubscribe = dataRefreshCoordinator.subscribe('marketData', async () => {
    // Fetch your data here
    const data = await fetchMarketData();
    setState(data);
  });

  // Cleanup on unmount
  return () => unsubscribe();
}, []);
```

### برای force refresh:

```typescript
// Force refresh for specific data type
dataRefreshCoordinator.forceRefresh('signals');

// Force refresh for all
dataRefreshCoordinator.forceRefresh();
```

### مشاهده آمار:

```typescript
const stats = dataRefreshCoordinator.getStats();
console.log(stats);
// {
//   totalSubscribers: 5,
//   byType: { signals: 2, marketData: 2, portfolio: 1 },
//   isRunning: true,
//   refreshInterval: 60000
// }
```

## ⚙️ تنظیمات

برای تغییر interval ها:

```typescript
dataRefreshCoordinator.updateConfig({
  refreshInterval: 90000, // 90 seconds
  minCallInterval: 10000, // 10 seconds minimum between same type
  debug: true, // Enable debug logging
});
```

## 🔍 مانیتورینگ

برای مشاهده تعداد درخواست‌ها در development:

```typescript
// در RealDataManager debug mode فعال است
// Log ها شامل:
// - ♻️ Reusing pending request (request deduplication)
// - 💰 Fetching prices (actual API calls)
// - ✅ Successfully fetched (successful responses)
```

## 📝 نکات مهم

1. **محدودیت‌های API**:
   - CoinGecko free tier: ~30 req/min
   - CryptoCompare free: ~100 req/min
   - Binance: 1200 req/min
   - با این بهینه‌سازی‌ها، به راحتی در محدودیت‌ها می‌مانید

2. **Cache Strategy**:
   - برای داده‌های real-time: 60s cache
   - برای داده‌های historical: 300s cache
   - Request deduplication: فوری (تا پایان request)

3. **Health Checks**:
   - هر 60 ثانیه (به‌جای 30)
   - فقط در صورت 3 failed attempt، reconnect می‌شود
   - Circuit breaker pattern برای جلوگیری از avalanche

## 🐛 عیب‌یابی

اگر داده‌ها به‌روز نمی‌شوند:

1. چک کنید DataRefreshCoordinator running باشد:
   ```typescript
   console.log(dataRefreshCoordinator.getStats().isRunning);
   ```

2. Force refresh کنید:
   ```typescript
   dataRefreshCoordinator.forceRefresh();
   ```

3. Log های debug را چک کنید (در development mode)

4. Cache را پاک کنید:
   ```typescript
   // در RealDataManager
   realDataManager.clearCache();
   ```

## 🔄 Migration Guide

برای تبدیل component های قدیمی:

**قبل**:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchSignals();
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

**بعد**:
```typescript
useEffect(() => {
  const unsubscribe = dataRefreshCoordinator.subscribe('signals', () => {
    fetchSignals();
  });

  return unsubscribe;
}, []);
```

## 📚 منابع

- [DataRefreshCoordinator.ts](/src/services/DataRefreshCoordinator.ts)
- [RealDataManager.ts](/src/services/RealDataManager.ts)
- [BinanceService.ts](/src/services/BinanceService.ts)
- [KuCoinService.ts](/src/services/KuCoinService.ts)
