# Complete System Integration Documentation

## Overview
این مستندات اتصال کامل همه مؤلفه‌های سیستم را نشان می‌دهد.

## AI/ML Core Components (src/ai/)

### ✅ همه کامپوننت‌ها پیاده‌سازی شده و اکسپورت شده‌اند:

1. **XavierInitializer** - وزن‌دهی اولیه شبکه عصبی
2. **StableActivations** - توابع فعال‌سازی پایدار (LeakyReLU, Sigmoid, Tanh)
3. **NetworkArchitectures** - معماری‌های شبکه (LSTM, CNN, Attention, Hybrid)
4. **GradientClipper** - کلیپ کردن گرادیان‌ها
5. **AdamWOptimizer** - بهینه‌ساز AdamW
6. **LearningRateScheduler** - زمان‌بندی نرخ یادگیری (Warmup + Cosine Annealing)
7. **InstabilityWatchdog** - نظارت بر پایداری و تشخیص NaN/Inf
8. **ExperienceBuffer** - بافر تجربه با اولویت‌دهی
9. **ExplorationStrategies** - استراتژی‌های اکتشاف (Epsilon-greedy)
10. **TrainingEngine** - موتور آموزش کامل
11. **RealTrainingEngine** - موتور آموزش با داده‌های واقعی
12. **BullBearAgent** - عامل پیش‌بینی احتمالی
13. **BacktestEngine** - موتور بک‌تست واقع‌گرایانه
14. **FeatureEngineering** - خط لوله کامل استخراج ویژگی
15. **TensorFlowModel** - مدل TensorFlow.js

**فایل:** `src/ai/index.ts` - همه کامپوننت‌ها اکسپورت شده‌اند

## Analysis Services (src/services/)

### ✅ همه سرویس‌ها پیاده‌سازی و اکسپورت شده‌اند:

#### Analysis Services:
- **SMCAnalyzer** - تشخیص Smart Money Concepts
- **ElliottWaveAnalyzer** - شمارش خودکار امواج الیوت
- **HarmonicPatternDetector** - تشخیص الگوهای هارمونیک
- **SentimentAnalysisService** - تحلیل احساسات از چند منبع
- **WhaleTrackerService** - نظارت بر فعالیت وال‌ها
- **TechnicalAnalysisService** - تحلیل تکنیکال

#### Market Data Services:
- **BinanceService** - اتصال به صرافی Binance
- **MarketDataIngestionService** - خط لوله دریافت داده‌های بازار
- **RealMarketDataService** - سرویس داده‌های بازار واقعی
- **MultiProviderMarketDataService** - داده از چندین منبع
- **RealTimeDataService** - داده‌های زمان‌واقعی
- **HistoricalDataService** - داده‌های تاریخی
- **HFOHLCVService** - داده از HuggingFace

#### Trading Services:
- **RealTradingService** - معاملات واقعی
- **OrderManagementService** - مدیریت کامل سفارشات (OMS)
- **SignalGeneratorService** - تولید سیگنال زمان‌واقعی

#### Learning Services:
- **ContinuousLearningService** - آموزش خودکار

#### Notification Services:
- **AlertService** - مدیریت هشدارها
- **NotificationService** - اعلان‌ها

#### Data Management Services:
- **RedisService** - لایه کش Redis
- **DataValidationService** - اعتبارسنجی داده
- **EmergencyDataFallbackService** - سرویس پشتیبان اضطراری

#### Sentiment Services:
- **SentimentNewsService** - تحلیل احساسات اخبار
- **HFSentimentService** - احساسات از HuggingFace
- **SocialAggregationService** - تجمیع داده‌های اجتماعی
- **FearGreedService** - شاخص ترس و طمع

#### Backtest Services:
- **backtestService** - سرویس بک‌تست
- **RealBacktestEngine** - موتور بک‌تست واقعی

**فایل:** `src/services/index.ts` - همه سرویس‌ها اکسپورت شده‌اند

## UI Views (src/views/)

### ✅ همه Views پیاده‌سازی شده و به Backend متصل هستند:

1. **DashboardView** (`src/views/DashboardView.tsx`)
   - API Endpoints:
     - `/api/portfolio` - اطلاعات پورتفولیو
     - `/api/positions` - موقعیت‌های فعال
     - `/api/market/prices` - قیمت‌های بازار
     - `/api/signals/history` - تاریخچه سیگنال‌ها
     - `/api/signals/statistics` - آمار سیگنال‌ها
     - `/api/training-metrics` - متریک‌های آموزش

2. **ChartingView** (`src/views/ChartingView.tsx`)
   - API Endpoints:
     - `/api/market-data/{symbol}` - داده‌های چارت
     - `/api/hf/ohlcv` - داده از HuggingFace
     - `/api/analysis/{symbol}` - تحلیل بازار

3. **TrainingView** (`src/views/TrainingView.tsx`)
   - API Endpoints:
     - `/api/training-metrics` - متریک‌های آموزش
   - کامپوننت‌های داخلی:
     - AIPredictor
     - TrainingDashboard

4. **RiskView** (`src/views/RiskView.tsx`)
   - API Endpoints:
     - `/api/risk/metrics` - متریک‌های ریسک

5. **BacktestView** (`src/views/BacktestView.tsx`)
   - API Endpoints:
     - `/api/backtest` - اجرای بک‌تست

6. **HealthView** (`src/views/HealthView.tsx`)
   - API Endpoints:
     - `/api/health` - وضعیت سیستم

7. **SettingsView** (`src/views/SettingsView.tsx`)
   - API Endpoints:
     - `/api/settings` - تنظیمات

8. **ScannerView** (`src/views/ScannerView.tsx`)
   - API Endpoints:
     - `/api/market/prices` - قیمت‌ها
     - `/api/signals/analyze` - تحلیل سیگنال‌ها
     - `/api/news/crypto` - اخبار کریپتو
     - `/api/alerts` - هشدارها

9. **MarketView** (`src/views/MarketView.tsx`)
   - API Endpoints:
     - `/api/market/prices` - قیمت‌ها
     - `/api/analysis/{symbol}` - تحلیل

## Backend Integration (src/server.ts)

### ✅ همه سرویس‌ها در Backend راه‌اندازی شده‌اند:

```typescript
// همه سرویس‌های Analysis
const smcAnalyzer = SMCAnalyzer.getInstance();
const elliottWaveAnalyzer = ElliottWaveAnalyzer.getInstance();
const harmonicDetector = HarmonicPatternDetector.getInstance();
const sentimentAnalysis = SentimentAnalysisService.getInstance();
const whaleTracker = WhaleTrackerService.getInstance();
const continuousLearning = ContinuousLearningService.getInstance();
const signalGenerator = SignalGeneratorService.getInstance();
const orderManagement = OrderManagementService.getInstance();

// همه سرویس‌های AI
const trainingEngine = TrainingEngine.getInstance();
const bullBearAgent = BullBearAgent.getInstance();
const backtestEngine = BacktestEngine.getInstance();
const featureEngineering = FeatureEngineering.getInstance();

// Controllers برای مدیریت API
const aiController = new AIController();
const analysisController = new AnalysisController();
const tradingController = new TradingController();
const marketDataController = new MarketDataController();
const systemController = new SystemController();
const scoringController = new ScoringController();
```

## Data Flow Integration

### Frontend → Backend:
1. **DashboardView** → `/api/portfolio`, `/api/positions`, `/api/signals/*`
2. **ChartingView** → `/api/market-data/*`, `/api/analysis/*`
3. **TrainingView** → `/api/training-metrics`
4. **ScannerView** → `/api/signals/analyze`, `/api/market/prices`
5. **RiskView** → `/api/risk/metrics`
6. **BacktestView** → `/api/backtest`

### Backend → Services:
1. **API Controllers** → Services → Database/External APIs
2. **WebSocket** → Real-time updates به Frontend
3. **SignalGenerator** → WebSocket notifications
4. **ContinuousLearning** → Auto-training با داده‌های جدید

### Services → AI Core:
1. **MarketDataIngestionService** → FeatureEngineering → BullBearAgent
2. **RealTrainingEngine** → TrainingEngine → Neural Networks
3. **BacktestEngine** → BullBearAgent → Trading Simulation

## WebSocket Integration

### Real-time Data Flow:
- **Market Prices**: `/ws` endpoint → `price_update` events
- **AI Signals**: SignalGenerator → WebSocket → Frontend
- **Training Metrics**: TrainingEngine → WebSocket → TrainingView
- **System Health**: Health monitoring → WebSocket → HealthView

## Complete Component Connectivity

```
Frontend (Views)
    ↓ HTTP/WebSocket
Backend (server.ts)
    ↓ Controllers
Services Layer
    ↓
AI Core (TrainingEngine, BullBearAgent, etc.)
    ↓
External APIs (Binance, HuggingFace, etc.)
    ↓
Database (SQLite)
```

## Verification Checklist

- [x] همه AI Components در `src/ai/index.ts` اکسپورت شده‌اند
- [x] همه Services در `src/services/index.ts` اکسپورت شده‌اند
- [x] همه Views به Backend APIs متصل هستند
- [x] Backend همه سرویس‌ها را راه‌اندازی کرده است
- [x] WebSocket برای Real-time updates راه‌اندازی شده است
- [x] Data Flow بین Frontend و Backend برقرار است
- [x] همه Controllers برای API endpoints پیاده‌سازی شده‌اند

## Usage Example

```typescript
// Frontend: استفاده از AI Components
import { AICore, BullBearAgent, TrainingEngine } from '@/ai';

// استفاده از Services
import { SMCAnalyzer, ElliottWaveAnalyzer } from '@/services';

// استفاده از Views
import { DashboardView, ChartingView, TrainingView } from '@/views';
```

## Status: ✅ 100% Complete Integration

همه مؤلفه‌ها با هم یکپارچه شده‌اند و آماده استفاده هستند.
