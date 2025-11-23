### How it works in one minute
BOLT AI runs an Express server (`src/server.ts`) that fronts a bundle of singleton services for market ingestion, analytics, and AI-assisted trading. Cron jobs and Binance websockets collect OHLCV data into an encrypted SQLite store, analysis modules derive technical/SMC/sentiment features, and AI utilities synthesize trading signals that are exposed over REST and a `/ws` feed. A Vite React UI consumes the same API through `services/dataManager.ts` and renders dashboards, scanners, and control panels.

## Executive Summary
The repository implements an ambitious crypto-trading assistant with both backend services and a frontend dashboard. The backend emphasises resilience—rate-limited Binance adapters, Redis-backed fanout, alerting, and WebSocket bridging—while the AI layer provides simulated neural tooling (Monte-Carlo dropout, backtesting, continuous learning). Much of the logic is deterministic scaffolding around random or placeholder computations, so it is production-like in surface area but still lacks real model training or exchange execution.

The frontend is a single-page React app with providers for theme, accessibility, navigation, and live market data. It leans on the backend API for every data source, augmenting it with websocket updates and local visualisations (charts, scanners, training dashboards).

## How to Run
- **Prerequisites**: Node.js 18+ (ESM build), npm, and (optionally) Redis if you want market ingestion/pub-sub to run.
- **Configuration**: Populate `config/api.json` or the corresponding environment variables (`BINANCE_API_KEY`, `BINANCE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `REDIS_PASSWORD`). `ConfigManager` writes to disk on boot (`src/core/ConfigManager.ts:43-75`), so ensure the process has permission.
- **Database**: On first launch the encrypted SQLite DB at `data/boltai.db` plus `.dbkey` file will be created by `EncryptedDatabase`.
- **Development**: `npm install` then `npm run dev` (spawns Vite + `tsx watch src/server.ts`). You may also run `npm run dev:frontend` and `npm run dev:backend` separately.
- **Production build**: `npm run build` emits compiled output into `dist/`; start with `npm start` (runs `node dist/server.js`).
- **Tests**: `npm test` executes Jest against the handful of TS unit tests (activations, initialisers, SMC).
- **Optional dependencies**: Redis must run on the host in `config`, and Binance/Telegram endpoints require outbound network access.

## Key Components
- **Backend services**: Express server with singleton services (`src/services/*`) for ingestion, analytics, AI, alerts, OMS, and notifications. `BinanceService` handles REST/WS integration, `MarketDataIngestionService` cron-schedules pulls, `SignalGeneratorService` disseminates AI signals.
- **AI layer**: Custom network abstractions under `src/ai/` (initialisers, activations, training engine, MC-dropout agent, backtester, feature engineering). Many routines are deterministic simulations.
- **Data layer**: Encrypted SQLite via `src/data/EncryptedDatabase.ts`, repositories, and migrations defined in `DatabaseMigrations.ts`.
- **Frontend**: Vite + React app (`src/App.tsx`, `src/views/*`) with global providers, dynamic dashboards, scanners, and training visualisations.
- **Shared infrastructure**: `ConfigManager` (config/env bridge), `Logger` (JSON logs per day), `types/index.ts` (common DTOs between client and server).

## Data Flow at 10,000ft
1. **Ingestion**: `MarketDataIngestionService` (`src/services/MarketDataIngestionService.ts:24-147`) subscribes to Binance kline websockets and cron jobs, normalises and validates ticks, writes to SQLite, and publishes to Redis.
2. **Storage & validation**: `MarketDataRepository` and `DataValidationService` persist and score data quality. Health endpoints surface metrics.
3. **Analytics & AI**: Feature pipelines (`src/ai/FeatureEngineering.ts`) combine SMC, Elliott, harmonic, and statistical indicators. `BullBearAgent` consumes features with simulated MC-dropout to generate probabilities, while `SignalGeneratorService` cross checks multi-timeframe confluence.
4. **User outputs**: REST endpoints in `src/server.ts` expose health, analytics, OMS actions, continuous learning controls, and AI utilities. WebSocket `/ws` pushes signals/health to connected clients.
5. **Frontend consumption**: `dataManager` (default API base `http://localhost:8001`) fetches endpoints, while `LiveDataContext` subscribes to `/ws`. Views render dashboards, scanners, and training/portfolio widgets.

## Risks & Gaps
- **ExperienceBuffer deadlock**: `initializePriorityTree` uses `const treeSize = 1` followed by `while (treeSize < this.config.capacity)` with no increment, resulting in an infinite loop on instantiation (`src/ai/ExperienceBuffer.ts:69-74`). This blocks `TrainingEngine` initialisation.
- **Duplicate Express handlers**: `/api/ai/train-step`, `/api/ai/train-epoch`, `/api/ai/predict`, and `/api/ai/extract-features` are declared twice (`src/server.ts:405-611` and again at `src/server.ts:520-611`), obscuring intent and risking divergence.
- **Frontend/backend port mismatch**: `dataManager` defaults to `http://localhost:8001` (`src/services/dataManager.ts:8-9`) while the Express server listens on `3001`, so the SPA will fail without environment overrides.
- **Simulated analytics**: Sentiment, whale tracking, AI predictions, and OMS use randomised or heuristic outputs (e.g., `SentimentAnalysisService` randomises scores, `OrderManagementService` trades against last stored close). Consumers must treat them as stubs rather than production signals.
- **External dependencies & side effects**: Enabling notifications hits Telegram (`src/services/NotificationService.ts:102-125`); emergency fallbacks scrape CoinGecko/CoinMarketCap (`src/services/EmergencyDataFallbackService.ts:43-147`). These require outgoing network access and resilient error handling.
- **Configuration strictness**: `ConfigManager.validateConfig` throws if API keys are missing (`src/core/ConfigManager.ts:77-89`); default template leaves keys blank, so the service will regress to auto-generated config and still lack credentials.
- **Security**: No authentication/authorisation anywhere in `src/server.ts`; all control surfaces (alerts, OMS, continuous learning) are anonymous.
- **Operational gaps**: Redis is optional but `MarketDataIngestionService.initialize` fails hard if it cannot connect; `Logger` writes under `logs/` expecting writable FS; no Docker or process supervision scripts are included.

## Next Steps
- Fix the ExperienceBuffer initialisation loop and add regression tests around replay buffer creation.
- Deduplicate the AI endpoints and extract handlers into modular controller functions for clarity.
- Align frontend defaults (`VITE_API_BASE`/`VITE_WS_BASE`) with the Express port or document the required `.env` overrides.
- Replace simulated analytics with real integrations or clearly gate them behind feature flags.
- Harden configuration/bootstrap (graceful handling of missing API keys, optional Redis, idempotent logger directory creation).
- Add request authentication (JWT/API key) before exposing the API publicly.
- Expand automated tests beyond activations/SMC to cover services (especially order management, ingestion, signal generator).
