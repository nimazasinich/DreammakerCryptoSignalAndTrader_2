# 🎨 Glass UI Design System

سیستم طراحی جدید با افکت‌های شیشه‌ای، هاله‌های بنفش و انیمیشن‌های جذاب

## ✨ ویژگی‌های اصلی

### 🔮 افکت‌های شیشه‌ای (Glass Morphism)
- پس‌زمینه شفاف با blur
- حاشیه‌های نیم‌دایره (border-radius بزرگ)
- سایه‌های نرم و زیبا
- افکت‌های hover جذاب

### 💜 هاله‌های بنفش (Purple Glow)
- هاله‌های متحرک در پس‌زمینه
- افکت‌های درخشش روی المان‌های فعال
- گرادیانت‌های بنفش دل‌انگیز
- انیمیشن‌های pulse و glow

### 🎭 انیمیشن‌ها
- `animate-float`: حرکت شناور
- `animate-glow`: درخشش متناوب
- `animate-pulse-purple`: pulse با هاله بنفش
- `animate-shimmer`: افکت درخشش

## 🎯 کامپوننت‌های اصلی

### 1. GlassCard
کارت شیشه‌ای با افکت‌های زیبا

```tsx
import { GlassCard } from './components/ui/GlassCard';

<GlassCard hover glow>
  <h3>عنوان</h3>
  <p>محتوا</p>
</GlassCard>
```

**Props:**
- `hover`: افکت hover فعال باشد
- `glow`: هاله بنفش داشته باشد
- `gradient`: از گرادیانت بنفش استفاده کند
- `onClick`: قابل کلیک باشد

### 2. GlassCardWithHeader
کارت با هدر و آیکون

```tsx
import { GlassCardWithHeader } from './components/ui/GlassCard';
import { TrendingUp } from 'lucide-react';

<GlassCardWithHeader
  title="Dashboard"
  subtitle="Real-time data"
  icon={<TrendingUp />}
  action={<button>Action</button>}
  hover
  glow
>
  محتوای کارت
</GlassCardWithHeader>
```

### 3. StatCard
کارت آماری با آیکون و تغییرات

```tsx
import { StatCard } from './components/ui/GlassCard';
import { DollarSign } from 'lucide-react';

<StatCard
  label="Total Balance"
  value="$24,500"
  change="+12.5%"
  changeType="positive"
  icon={<DollarSign />}
/>
```

**changeType:**
- `positive`: سبز (افزایش)
- `negative`: قرمز (کاهش)
- `neutral`: بنفش (بدون تغییر)

### 4. GlassIcon
آیکون‌های SVG سفارشی

```tsx
import { GlassIcon } from './components/ui/GlassIcon';

<GlassIcon
  name="dashboard"
  size={24}
  withGlow
  animated
/>
```

**آیکون‌های موجود:**
- dashboard, chart, market, scanner
- trading, portfolio, settings, health
- risk, strategy, futures, positions

### 5. GlassIconButton
دکمه آیکون با افکت شیشه‌ای

```tsx
import { GlassIconButton } from './components/ui/GlassIcon';

<GlassIconButton
  name="dashboard"
  active
  onClick={() => console.log('clicked')}
/>
```

## 🎨 کلاس‌های Utility

### افکت‌های شیشه‌ای
```css
.glass              /* شیشه معمولی */
.glass-strong       /* شیشه قوی‌تر */
.glass-purple       /* شیشه با گرادیانت بنفش */
```

### هاله‌های بنفش
```css
.purple-glow        /* هاله بزرگ */
.purple-glow-sm     /* هاله کوچک */
.purple-glow-hover  /* هاله در hover */
.inner-purple-glow  /* هاله داخلی */
```

### سایه‌ها
```css
.shadow-glass       /* سایه شیشه‌ای */
.shadow-glass-lg    /* سایه شیشه‌ای بزرگ */
.shadow-glass-xl    /* سایه شیشه‌ای خیلی بزرگ */
.shadow-purple-glow /* سایه با هاله بنفش */
```

## 🎭 انیمیشن‌ها

### استفاده از انیمیشن‌ها
```tsx
<div className="animate-float">شناور</div>
<div className="animate-glow">درخشش</div>
<div className="animate-pulse-purple">pulse بنفش</div>
<div className="animate-shimmer">درخشش حرکتی</div>
```

### تاخیر در انیمیشن
```tsx
<div 
  className="animate-pulse-slow" 
  style={{ animationDelay: '1s' }}
>
  با تاخیر
</div>
```

## 🎨 رنگ‌های بنفش

### پالت رنگی
- `purple-50`: #FAF5FF (خیلی روشن)
- `purple-100`: #F3E8FF
- `purple-200`: #E9D5FF
- `purple-300`: #D8B4FE
- `purple-400`: #C084FC
- `purple-500`: #A855F7 (اصلی)
- `purple-600`: #9333EA
- `purple-700`: #7E22CE
- `purple-800`: #6B21A8
- `purple-900`: #581C87 (خیلی تیره)

### استفاده از رنگ‌ها
```tsx
<div className="bg-purple-500 text-white">متن سفید روی بنفش</div>
<div className="text-purple-900">متن بنفش تیره</div>
<div className="border-purple-300">حاشیه بنفش روشن</div>
```

## 🔘 دکمه‌ها

### دکمه اصلی (Primary)
```tsx
<button className="btn-primary">
  <Icon />
  متن دکمه
</button>
```

**ویژگی‌ها:**
- گرادیانت بنفش
- سایه با هاله بنفش
- افکت hover با scale
- انیمیشن smooth

### دکمه ثانویه (Secondary)
```tsx
<button className="btn-secondary">
  <Icon />
  متن دکمه
</button>
```

**ویژگی‌ها:**
- پس‌زمینه شیشه‌ای
- حاشیه بنفش
- افکت hover

## 📝 فیلدهای ورودی

### Input Field
```tsx
<input
  type="text"
  placeholder="Enter text..."
  className="input-field"
/>
```

**ویژگی‌ها:**
- پس‌زمینه شیشه‌ای
- حاشیه بنفش
- افکت focus با هاله
- گوشه‌های نیم‌دایره

## 🎯 نکات طراحی

### 1. گوشه‌های نیم‌دایره
همه المان‌ها از border-radius بزرگ استفاده می‌کنند:
- `rounded-2xl`: 16px
- `rounded-3xl`: 24px
- برای کارت‌ها: 24px یا بیشتر

### 2. هاله‌های پس‌زمینه
برای ایجاد هاله‌های بنفش در پس‌زمینه:

```tsx
<div className="relative">
  <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow" />
  <div className="relative z-10">محتوا</div>
</div>
```

### 3. افکت Hover
برای افکت‌های hover جذاب:

```tsx
<div className="transition-all duration-300 hover:scale-105 hover:shadow-purple-glow-sm">
  محتوا
</div>
```

### 4. Backdrop Blur
برای افکت شیشه‌ای:

```tsx
<div className="backdrop-blur-glass bg-white/80">
  محتوا
</div>
```

## 🚀 مثال کامل

```tsx
import React from 'react';
import { GlassCard, StatCard } from './components/ui/GlassCard';
import { GlassIconButton } from './components/ui/GlassIcon';
import { TrendingUp } from 'lucide-react';

export const Dashboard = () => {
  return (
    <div className="p-8 space-y-6">
      {/* کارت‌های آماری */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          label="Balance"
          value="$24,500"
          change="+12.5%"
          changeType="positive"
          icon={<TrendingUp />}
        />
        {/* ... */}
      </div>

      {/* کارت اصلی */}
      <GlassCard hover glow>
        <h2 className="text-2xl font-bold text-purple-900 mb-4">
          Trading Dashboard
        </h2>
        <div className="space-y-4">
          {/* محتوا */}
        </div>
      </GlassCard>

      {/* آیکون‌ها */}
      <div className="flex gap-4">
        <GlassIconButton name="dashboard" active />
        <GlassIconButton name="chart" />
        <GlassIconButton name="market" />
      </div>
    </div>
  );
};
```

## 📦 فایل‌های مرتبط

- `tailwind.config.js`: تنظیمات Tailwind
- `src/index.css`: استایل‌های گلوبال
- `src/components/ui/GlassCard.tsx`: کامپوننت‌های کارت
- `src/components/ui/GlassIcon.tsx`: کامپوننت‌های آیکون
- `src/components/ui/StatusRibbon.tsx`: نوار وضعیت
- `src/components/Navigation/Sidebar.tsx`: منوی کناری
- `src/App.tsx`: کامپوننت اصلی

## 🎉 نتیجه

با این سیستم طراحی، شما می‌توانید:
- ✅ UI های جذاب و مدرن بسازید
- ✅ از افکت‌های شیشه‌ای استفاده کنید
- ✅ هاله‌های بنفش زیبا اضافه کنید
- ✅ انیمیشن‌های smooth داشته باشید
- ✅ تجربه کاربری عالی ارائه دهید

**نکته:** تمام کامپوننت‌ها responsive هستند و روی موبایل هم به خوبی کار می‌کنند! 📱✨

