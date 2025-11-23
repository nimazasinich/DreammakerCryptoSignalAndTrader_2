# Dependency Map

## Backend Core
- `src/server.ts` wires Express routes and WebSocket handlers to singleton services. It imports `Logger`, `ConfigManager`, `Database`, multiple analysis services, AI engines, and orchestrates lifecycle events (startup, shutdown, subscriptions).
- HTTP endpoints call directly into service singletons (e.g., `/api/ai/predict` → `BullBearAgent.predict`, `/api/orders/*` → `OrderManagementService` methods). There is no separate controller layer—business logic lives inside the services.

## Service Layer Relationships
- `BinanceService` → depends on `axios`, native `crypto`, `WebSocket`, `ConfigManager` (for API keys) and `Logger`. It enforces rate limiting, maintains HTTP & WS clients, and is the primary external market data provider.
- `MarketDataIngestionService` → consumes `BinanceService`, `Database`, `RedisService`, `DataValidationService`, and `EmergencyDataFallbackService`. It schedules cron jobs and websocket subscriptions, normalises/validates data, writes SQLite rows, and publishes to Redis.
- `RedisService` → wraps `ioredis`, driven by `ConfigManager`, and is shared by ingestion plus cache endpoints.
- `DataValidationService` → pure in-memory validator used by ingestion; feeds metrics to health APIs.
- `EmergencyDataFallbackService` → uses `axios`, `cheerio`, `jsdom` to fetch alt market data when Binance fails.
- `AlertService` ↔ `NotificationService`: alerts trigger notifications (desktop console + optional Telegram/email scaffold). `NotificationService` pulls creds from config/env and issues outbound network calls.
- `SignalGeneratorService` → pulls historical candles from `Database`, leverages `BullBearAgent`, `FeatureEngineering` and pushes websocket broadcasts.
- `OrderManagementService` → uses `Database` for persistence/logging, calls its own helper to fetch latest price (from DB) and manages in-memory positions/orders. Interacts with API endpoints for OMS features.
- `ContinuousLearningService` → orchestrates `TrainingEngine`, `BullBearAgent`, market/sentiment/whale analyzers, and persists progress via `Database`.
- `SentimentAnalysisService`, `WhaleTrackerService`, `SMCAnalyzer`, `ElliottWaveAnalyzer`, `HarmonicPatternDetector` provide analytical signals; several rely on pseudo-random simulation instead of live integrations.

## AI Layer
- `TrainingEngine` → aggregates `XavierInitializer`, `StableActivations`, `NetworkArchitectures`, `GradientClipper`, `AdamWOptimizer`, `LearningRateScheduler`, `InstabilityWatchdog`, and the shared `ExperienceBuffer`. Emits synthetic training metrics.
- `BullBearAgent` → depends on `TrainingEngine`, `ExplorationStrategies`, and `FeatureEngineering`. Uses Monte Carlo dropout-style sampling (simulated) to derive bull/bear/hold probabilities.
- `FeatureEngineering` → imports `SMCAnalyzer`, `ElliottWaveAnalyzer`, `HarmonicPatternDetector` to transform OHLCV windows into feature vectors consumed by AI components and the backtest engine.
- `BacktestEngine` → uses `BullBearAgent` for signal generation while iterating over stored market data.

### Data Layer
- `Database` → wraps `EncryptedDatabase`, exposes repositories for market data and training metrics (`MarketDataRepository`, `TrainingMetricsRepository`).
- `EncryptedDatabase` → constructs paths under `data/`, handles pseudo encryption (random key persisted to `.dbkey`), runs `DatabaseMigrations`, and initialises repositories.
- `DatabaseMigrations` → defines SQL schema (market_data, training_metrics, experience_buffer, backtest tables, etc.).

### Shared Infrastructure
- `ConfigManager` → reads/writes `config/api.json`, falls back to environment variables for secrets, and is required by services (Binance, Redis, Notification).
- `Logger` → writes JSON lines under `logs/`, attaches correlation IDs and prints to console; imported across almost every module.
- `types/index.ts` → centralises shared TypeScript interfaces used by frontend, backend services, and AI modules.

## Frontend
- `src/main.tsx` → boots `App`.
- `App.tsx` → composes providers (`ThemeProvider`, `AccessibilityProvider`, `LiveDataProvider`, `NavigationProvider`) and renders one of the view components.
- `components/LiveDataContext` → depends on `dataManager`, maintains websocket subscriptions (`/ws`), and exposes hooks for market data, signals, and health.
- `services/dataManager` → encapsulates fetch/WebSocket calls to the backend (`VITE_API_BASE`, `VITE_WS_BASE`), mapping frontend requests to Express endpoints.
- Views (`src/views/*.tsx`) stitch together UI components from `components/*`, call `dataManager`, and subscribe to `LiveDataContext` for realtime updates.

## External Integrations Summary
- REST: Binance REST (`/api/v3`), CoinGecko, CoinMarketCap (via scraping), CryptoCompare, Alternative.me Fear & Greed API, Telegram Bot API.
- Streaming: Binance websockets for klines/tickers; internal `/ws` websockets for clients.
- Storage: SQLite via `better-sqlite3`, optional Redis cache via `ioredis`.
- Scheduling: `node-cron` for ingestion.

## Notable Couplings & Risks
- Many services are singletons with hidden state; testing or parallel execution is difficult without explicit reset methods.
- `ExperienceBuffer.initializePriorityTree` contains an infinite `while` loop (no counter increment) invoked at module load, so any code path constructing the buffer will hang.
- Duplicate Express route declarations for `/api/ai/train-step`, `/api/ai/train-epoch`, `/api/ai/predict`, `/api/ai/extract-features` exist in `server.ts`; last definition wins but indicates refactor drift.
- Frontend `dataManager` defaults to `http://localhost:8001` while backend listens on `3001`, requiring environment overrides to function together.
- Several analytics services generate random/simulated metrics, which means downstream consumers must tolerate placeholder data.
