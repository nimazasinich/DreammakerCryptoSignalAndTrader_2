## Repo Layout & Responsibilities
- `src/server.ts` – single Express entrypoint exposing REST + WebSocket interfaces and wiring all singleton services.
- `src/services/` – domain services (Binance integration, ingestion, Redis bridge, analytics, AI orchestration, alerts, OMS, frontend data manager). Testing lives under `src/services/__tests__/`.
- `src/ai/` – custom ML scaffolding (initialisers, activations, training loop, replay buffer, agent, backtester, feature engineering). Unit tests cover key primitives.
- `src/data/` – encrypted SQLite wrapper, migrations, and repositories for market data and training metrics.
- `src/core/` – infrastructure utilities (`Logger`, `ConfigManager`).
- `src/components/`, `src/views/`, `src/services/dataManager.ts` – React SPA, UI composition, API/WebSocket glue.
- Root configs: Vite (`vite.config.ts`), Tailwind, Jest, ESLint, multiple `tsconfig*.json` for app/node builds.

## Runtime Components
- **Express API & middleware** (`src/server.ts:31-1957`): attaches Helmet, CORS, JSON parsing, correlation logging, REST routes, error handler, and HTTP server startup.
- **WebSocket servers** (`src/server.ts:33-1885`): two `ws` instances – `/ws` primary path broadcasting signals/health and `wss` legacy path. Subscriptions proxy to Binance streams or AI signal loops.
- **Market ingestion worker** (`src/services/MarketDataIngestionService.ts:24-198`): cron schedules (1m/5m/1h/1d) plus Binance websocket listeners normalise/validate data, persist to SQLite, and publish to Redis.
- **Redis cache/pub-sub** (`src/services/RedisService.ts:17-207`): optional, handles pub/sub channels and cache operations used by ingestion, signal broadcast, and cache endpoints.
- **AI/analytics engines**: `BullBearAgent`, `TrainingEngine`, `SignalGeneratorService`, pattern detectors, sentiment/whale simulators; all instantiated at server boot for shared state.
- **Order management subsystem** (`src/services/OrderManagementService.ts:9-736`): in-memory order book with simulated fills, portfolio tracking, and persistence stubs.
- **Continuous learning loop** (`src/services/ContinuousLearningService.ts:28-268`): interval-based retraining orchestrator calling feature engineering, sentiment, whale, and training engine modules.
- **React SPA**: `npm run dev` launches Vite dev server; providers manage theme/accessibility/nav/live data, and views compose dashboard widgets.

## Module Boundaries & Dependencies
- **Integration boundaries**: `BinanceService` (rate-limited HTTP/WS, `ConfigManager`), `EmergencyDataFallbackService` (CoinGecko/CoinMarketCap/CryptoCompare), `NotificationService` (console + Telegram), `SentimentAnalysisService` (Fear & Greed API + simulated feeds).
- **Data boundary**: `EncryptedDatabase` initialises migrations and repositories; services query via `Database` facade (e.g., `MarketDataRepository.findBySymbolAndInterval` for analytics/backtests).
- **AI boundary**: `FeatureEngineering` consumes analytics services; `BullBearAgent` depends on `TrainingEngine` which in turn relies on `ExperienceBuffer`, optimisers, watchdogs. The backtest engine loops over DB data while asking the agent for signals.
- **Frontend boundary**: `dataManager` is the sole fetch/WebSocket client for Express; context providers expose data to component trees, keeping UI and network logic separate.
- **Cross-cutting**: `Logger`/`ConfigManager` are injected everywhere; services leverage them for environment-aware setup and audit logging.

## Data Flow
1. **Acquisition**: Binance REST (`getKlines`, `get24hrTicker`) and websockets feed the ingestion service; outputs are validated (`DataValidationService`) and saved via repositories.
2. **Publishing**: Fresh candles trigger Redis publications and feed in-memory analytics (SMC/Elliott/harmonics, signal generator).
3. **Analytics & AI**: Feature engineering merges technical stats, SMC, Elliot, harmonic features; AI agent simulates predictions which in turn drive signal histories, alerts, and backtests.
4. **API delivery**: Express routes expose health, pipelines, analytics, AI operations, OMS actions, and admin toggles. WebSocket `/ws` pushes signal/health updates; `handleSubscription` can bridge Binance streams directly to clients.
5. **UI consumption**: React views call `dataManager` to fetch REST data (health, metrics, portfolio) and subscribe to `/ws` events via `LiveDataContext`. Components render charts, tickers, training stats, risk panels, and scanner tables.

## Config & Feature Flags
- **Backend configuration**: `ConfigManager` reads `config/api.json` or env vars for Binance, Redis, Telegram, database paths (`src/core/ConfigManager.ts:43-110`). It auto-writes defaults if missing.
- **Environment variables**: `process.env.PORT` / `NODE_ENV` for server setup, `BINANCE_*`, `TELEGRAM_*`, `REDIS_PASSWORD` for credentials. Optional env toggles (e.g., `testnet` flag) exposed via `/api/binance/toggle-testnet`.
- **Service configs**: `SignalGeneratorService` and `ContinuousLearningService` expose runtime-configurable options via API endpoints (e.g., symbol lists, thresholds, auto-learning intervals).
- **Frontend env**: `VITE_API_BASE` / `VITE_WS_BASE` override default API roots (`src/services/dataManager.ts:8-9`). Theme/accessibility states persist in `localStorage`.
- **Feature flags**: None centralised; behaviour toggled by config objects (e.g., `SignalGeneratorService.configure`, `ContinuousLearningService.configure`).

## Error Handling & Observability
- **Logging**: `Logger` writes JSON lines to `logs/bolt-ai-YYYY-MM-DD.log` and prints to console with correlation IDs (`src/core/Logger.ts:12-88`). Services use structured logging extensively.
- **Validation**: `DataValidationService` enforces OHLC sanity checks and tracks error metrics (`src/services/DataValidationService.ts:17-161`). Health endpoints surface this data.
- **Health checks**: `/api/health`, `/api/system/status`, `/api/system/cache/stats`, `/api/binance/health` aggregate service statuses, Redis info, rate limits, clock skew.
- **Error middleware**: Express error handler logs request context and returns generic 500s (`src/server.ts:1898-1911`). Graceful shutdown hooks close cron jobs, Binance WS, Redis, and DB (`src/server.ts:1914-1950`).
- **Gaps**: No circuit breakers around external APIs besides retry/backoff in `BinanceService`; Redis failures bubble up and can halt ingestion start. Telemetry (metrics/tracing) is absent beyond logs and manual health endpoints.
