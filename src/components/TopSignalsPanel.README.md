# TopSignalsPanel Component

کامپوننت TopSignalsPanel یک پنل مدرن و حرفه‌ای برای نمایش 3 سیگنال برتر AI است که در زیر چارت قیمت قرار می‌گیرد.

## 📦 نصب و راه‌اندازی

کامپوننت به صورت کامل پیاده‌سازی شده و آماده استفاده است.

### ✅ فایل‌های ایجاد شده:

1. **`src/components/TopSignalsPanel.tsx`** - کامپوننت اصلی
2. **`src/components/Dashboard.tsx`** - نمونه استفاده مستقل
3. **`src/services/RealDataManager.ts`** - به‌روزرسانی شده با متدهای سیگنال
4. **`src/views/DashboardView.tsx`** - به‌روزرسانی شده برای استفاده از TopSignalsPanel
5. **`tailwind.config.js`** - به‌روزرسانی شده با رنگ gray-950

## 🚀 استفاده

### روش 1: استفاده در DashboardView (پیاده‌سازی شده)

کامپوننت TopSignalsPanel به صورت خودکار در `DashboardView` اضافه شده است و دقیقاً در زیر چارت قیمت قرار دارد.

برای مشاهده:
```bash
npm run dev
# سپس به صفحه Dashboard بروید
```

### روش 2: استفاده مستقل

```tsx
import TopSignalsPanel from './components/TopSignalsPanel';
import { Signal } from './components/TopSignalsPanel';
import { realDataManager } from './services/RealDataManager';

function MyComponent() {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    const fetchSignals = async () => {
      const data = await realDataManager.getAISignals(10);
      setSignals(data);
    };
    fetchSignals();
  }, []);

  return (
    <TopSignalsPanel 
      signals={signals}
      neuralNetworkAccuracy={85}
      className="w-full"
    />
  );
}
```

### روش 3: استفاده از Dashboard کامل

```tsx
import Dashboard from './components/Dashboard';

function App() {
  return <Dashboard />;
}
```

## 📊 Interface Signal

```typescript
export interface Signal {
  id: string;                              // شناسه یکتا
  symbol: string;                          // نماد ارز (مثل BTC/USDT)
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';  // جهت سیگنال
  confidence: number;                      // درصد اطمینان (0-100)
  timeframe: string;                       // تایم‌فریم (مثل 1h, 4h)
  strength: 'STRONG' | 'MODERATE' | 'WEAK';      // قدرت سیگنال
  timestamp: number;                       // زمان ایجاد
}
```

## 🎨 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `signals` | `Signal[]` | - | آرایه‌ای از سیگنال‌ها |
| `neuralNetworkAccuracy` | `number` | `85` | دقت شبکه عصبی (0-100) |
| `className` | `string` | `''` | کلاس‌های CSS اضافی |

## 🔧 RealDataManager Methods

متدهای جدید اضافه شده:

```typescript
// دریافت سیگنال‌های AI با فرمت مناسب
await realDataManager.getAISignals(limit?: number): Promise<Signal[]>

// دریافت سیگنال‌های خام
await realDataManager.getSignals(): Promise<any[]>
```

## 🎯 ویژگی‌ها

✅ **نمایش Top 3 سیگنال**: به صورت خودکار 3 سیگنال با بالاترین confidence را نمایش می‌دهد
✅ **رنگ‌بندی هوشمند**: رنگ‌های متفاوت برای BULLISH، BEARISH و NEUTRAL
✅ **Confidence Meter**: نمایش بصری درصد اطمینان
✅ **Live Indicator**: نشانگر زنده بودن داده‌ها
✅ **Responsive Design**: سازگار با تمام سایزهای صفحه
✅ **Dark Theme**: طراحی مدرن با تم تیره
✅ **Real-time Update**: به‌روزرسانی خودکار هر 30 ثانیه

## 🎨 رنگ‌بندی

- **BULLISH**: سبز (#10b981)
- **BEARISH**: قرمز (#ef4444)
- **NEUTRAL**: زرد (#f59e0b)
- **STRONG**: سبز (#10b981)
- **MODERATE**: زرد (#f59e0b)
- **WEAK**: قرمز (#ef4444)

## 📱 Responsive Breakpoints

- **Mobile** (< 768px): 1 ستون
- **Tablet** (768px - 1024px): 3 ستون
- **Desktop** (> 1024px): 3 ستون

## 🧪 تست

برای تست کامپوننت:

```bash
# شروع سرور توسعه
npm run dev

# رفتن به Dashboard
http://localhost:5173

# کامپوننت TopSignalsPanel در زیر چارت قیمت نمایش داده می‌شود
```

## 🔄 Auto-refresh

کامپوننت به صورت خودکار هر 30 ثانیه سیگنال‌ها را به‌روزرسانی می‌کند (اگر autoRefresh فعال باشد).

## 🐛 Troubleshooting

### سیگنال‌ها نمایش داده نمی‌شوند

```typescript
// بررسی کنید که داده‌ها به درستی fetch می‌شوند
const signals = await realDataManager.getAISignals();
console.log('Signals:', signals);
```

### خطای import

```typescript
// مطمئن شوید که import به درستی انجام شده
import TopSignalsPanel from './components/TopSignalsPanel';
import { Signal } from './components/TopSignalsPanel';
```

### مشکل styling

```bash
# مطمئن شوید که Tailwind به درستی کار می‌کند
npm run dev

# بررسی tailwind.config.js
# باید gray-950 تعریف شده باشد
```

## 📝 نکات مهم

1. کامپوننت از Tailwind CSS استفاده می‌کند، پس مطمئن شوید که Tailwind در پروژه شما نصب است
2. برای نمایش صحیح، حداقل 3 سیگنال نیاز است
3. اگر کمتر از 3 سیگنال موجود باشد، فقط همان تعداد نمایش داده می‌شود
4. سیگنال‌ها به صورت خودکار بر اساس confidence مرتب می‌شوند

## 🚀 Performance

- کامپوننت lightweight است و تاثیر کمی بر performance دارد
- استفاده از memo برای جلوگیری از re-render های غیرضروری
- داده‌ها به صورت cached در RealDataManager ذخیره می‌شوند

## 📚 مثال کامل

نگاه کنید به:
- `src/views/DashboardView.tsx` - برای نحوه استفاده در Dashboard اصلی
- `src/components/Dashboard.tsx` - برای یک نمونه کامل و مستقل

---

**ساخته شده با ❤️ برای Crypto AI Trading Platform**

