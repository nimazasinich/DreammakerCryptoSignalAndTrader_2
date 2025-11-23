# 🚀 Server Improvements - بهبودهای سرور

## ✨ تغییرات انجام شده:

### 1️⃣ **DashboardDataService** - سرویس بارگذاری هوشمند داشبورد

**فایل:** `src/services/DashboardDataService.ts`

**ویژگی‌ها:**
- ✅ بارگذاری موازی داده‌ها (Parallel Loading)
- ✅ Cache هوشمند با TTL قابل تنظیم
- ✅ Fallback به database در صورت خطا
- ✅ کنترل خطای جامع با Promise.allSettled
- ✅ لاگ کامل برای monitoring
- ✅ بهینه‌سازی برای بارگذاری اولیه

**API:**
```typescript
const dashboardService = DashboardDataService.getInstance();

const data = await dashboardService.loadInitialData({
  symbols: ['BTC/USDT', 'ETH/USDT'],
  includeSignals: true,
  includeMarketOverview: true,
  cacheTimeout: 30000, // 30 seconds
});
```

**داده‌های برگشتی:**
```typescript
{
  prices: [...],           // قیمت‌های فعلی
  marketOverview: {...},   // نمای کلی بازار
  topMovers: {...},        // بیشترین تغییرات
  recentSignals: [...],    // سیگنال‌های اخیر
  systemStatus: {...}      // وضعیت سیستم
}
```

### 2️⃣ **Error Handler Middleware** - مدیریت هوشمند خطاها

**فایل:** `src/middleware/errorHandler.ts`

**ویژگی‌ها:**
- ✅ پیام‌های خطای کاربرپسند (User-Friendly)
- ✅ تشخیص خودکار status code
- ✅ لاگ هوشمند (warn برای 4xx، error برای 5xx)
- ✅ جزئیات بیشتر در حالت development
- ✅ AppError class برای خطاهای سفارشی
- ✅ asyncHandler برای route handlers

**استفاده:**
```typescript
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

// در route handler
router.get('/data', asyncHandler(async (req, res) => {
  if (!req.query.symbol) {
    throw new AppError(
      'Symbol is required',
      400,
      'MISSING_PARAMETER'
    );
  }
  // ...
}));
```

**پیام‌های خطا:**
```typescript
{
  success: false,
  error: {
    message: "User-friendly message",
    code: "ERROR_CODE",
    statusCode: 400
  },
  timestamp: 1234567890
}
```

### 3️⃣ **Dashboard Routes** - مسیرهای API داشبورد

**فایل:** `src/routes/dashboard.ts`

**Endpoints:**

#### `GET /api/dashboard/initial`
بارگذاری داده‌های اولیه داشبورد

**Query Parameters:**
- `symbols`: لیست سمبل‌ها (comma-separated)
- `includeSignals`: شامل سیگنال‌ها (default: true)
- `includeMarketOverview`: شامل نمای کلی (default: true)
- `cache`: زمان cache به میلی‌ثانیه

**مثال:**
```bash
GET /api/dashboard/initial?symbols=BTC/USDT,ETH/USDT&cache=60000
```

#### `GET /api/dashboard/prices`
دریافت فقط قیمت‌ها

**Query Parameters:**
- `symbols`: لیست سمبل‌ها (required)

#### `POST /api/dashboard/cache/clear`
پاکسازی cache

#### `GET /api/dashboard/health`
بررسی سلامت سرویس

## 📋 نحوه اضافه کردن به server.ts:

### مرحله 1: Import کردن

```typescript
// در بالای فایل server.ts بعد از سایر import ها
import { DashboardDataService } from './services/DashboardDataService.js';
import { errorHandler, notFoundHandler, asyncHandler, AppError } from './middleware/errorHandler.js';
import { dashboardRouter } from './routes/dashboard.ts';
```

### مرحله 2: اضافه کردن Routes

```typescript
// بعد از سایر route ها
app.use('/api/dashboard', dashboardRouter);
```

### مرحله 3: اضافه کردن Error Handlers

```typescript
// در انتهای فایل، قبل از app.listen

// 404 Handler
app.use(notFoundHandler);

// Error Handler (باید آخرین middleware باشد)
app.use(errorHandler);
```

### مرحله 4: به‌روزرسانی Route Handlers موجود

```typescript
// مثال: تبدیل route handler معمولی به async handler

// قبل:
app.get('/api/data', async (req, res) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// بعد:
app.get('/api/data', asyncHandler(async (req, res) => {
  const data = await fetchData();
  if (!data) {
    throw new AppError('Data not found', 404, 'NOT_FOUND');
  }
  res.json({ success: true, data });
}));
```

## 🎯 مزایا:

### 1. **بهینه‌سازی بارگذاری اولیه**
- ✅ کاهش زمان بارگذاری با parallel requests
- ✅ Cache هوشمند برای کاهش بار سرور
- ✅ Fallback به database برای reliability

### 2. **کنترل خطای بهتر**
- ✅ پیام‌های واضح و کاربرپسند
- ✅ لاگ کامل برای debugging
- ✅ جداسازی خطاهای operational و programming

### 3. **کد تمیزتر**
- ✅ حذف try-catch های تکراری
- ✅ مدیریت متمرکز خطاها
- ✅ async/await بدون نگرانی

### 4. **Monitoring بهتر**
- ✅ لاگ کامل با duration
- ✅ تشخیص cache hit/miss
- ✅ آمار استفاده از API

## 📊 مثال Response:

### موفق:
```json
{
  "success": true,
  "data": {
    "prices": [
      {
        "symbol": "BTC/USDT",
        "price": 45000,
        "change24h": 2.5,
        "volume24h": 1000000,
        "timestamp": 1234567890
      }
    ],
    "marketOverview": {
      "totalMarketCap": 2000000000,
      "totalVolume": 100000000,
      "btcDominance": 45.5,
      "activeCoins": 10000
    },
    "topMovers": {
      "gainers": [...],
      "losers": [...]
    },
    "recentSignals": [...],
    "systemStatus": {
      "dataSource": "huggingface",
      "lastUpdate": 1234567890,
      "health": "healthy"
    }
  },
  "meta": {
    "duration": 150,
    "cached": false,
    "timestamp": 1234567890
  }
}
```

### خطا:
```json
{
  "success": false,
  "error": {
    "message": "Unable to connect to the service. Please check your connection.",
    "code": "ECONNREFUSED",
    "statusCode": 503
  },
  "timestamp": 1234567890
}
```

## 🔧 تنظیمات اضافی:

### Cache TTL
```typescript
// در DashboardDataService.ts
private readonly CACHE_TTL = 30000; // تغییر دهید
```

### Default Symbols
```typescript
// در DashboardDataService.ts
private readonly DEFAULT_SYMBOLS = ['BTC/USDT', 'ETH/USDT', ...];
```

### Error Messages
```typescript
// در errorHandler.ts
const ERROR_MESSAGES: Record<string, string> = {
  // پیام‌های سفارشی خود را اضافه کنید
  'CUSTOM_ERROR': 'Your custom message',
};
```

## 🚀 استفاده در Frontend:

```typescript
// در React component
useEffect(() => {
  const loadDashboard = async () => {
    try {
      const response = await fetch('/api/dashboard/initial?symbols=BTC/USDT,ETH/USDT');
      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
      } else {
        showError(result.error.message);
      }
    } catch (error) {
      showError('Failed to load dashboard');
    }
  };

  loadDashboard();
}, []);
```

## ✅ Checklist:

- [ ] اضافه کردن DashboardDataService.ts
- [ ] اضافه کردن errorHandler.ts
- [ ] اضافه کردن dashboard.ts
- [ ] Import کردن در server.ts
- [ ] اضافه کردن routes
- [ ] اضافه کردن error handlers
- [ ] تست API endpoints
- [ ] به‌روزرسانی frontend
- [ ] تست error scenarios
- [ ] مانیتور کردن performance

## 📝 نکات مهم:

1. **همیشه از asyncHandler استفاده کنید** برای route handlers
2. **AppError را برای خطاهای operational** استفاده کنید
3. **Cache را بر اساس نیاز تنظیم کنید**
4. **لاگ‌ها را مانیتور کنید** برای بهینه‌سازی
5. **از Promise.allSettled استفاده کنید** برای موازی‌سازی

**همه چیز آماده است! سرور حالا هوشمندتر، سریع‌تر و قابل اعتمادتر است! 🎉✨**

