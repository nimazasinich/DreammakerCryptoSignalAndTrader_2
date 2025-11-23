# Assimilation Report - Stage 0
## Mission Overview & Capability Inventory

**Document Version:** 1.0  
**Date:** 2025-11-06  
**Baseline Repository:** `crypto-scoring-system-fixed` (Project **B**)  
**Donor Repository:** `DreammakerFinalBoltaiCryptoSignalAndTrader-main` (Project **A**)

---

## Mission Statement

Integrate futures trading capabilities from Project A into Project B while:
- Maintaining B's architecture as source of truth
- Using adapter pattern for exchange logic
- Preserving backward compatibility via feature flags
- Following B's layering (controllers → services → providers → repos → encrypted DB)
- Ensuring zero breaking changes when `FEATURE_FUTURES=false`

---

## Capability Domains

### 1. **Futures Trading** (Primary Target)
- **Status in B:** ✅ Infrastructure exists, ⚠️ Needs completeness check
- **Status in A:** ✅ Complete implementation (`KuCoinFuturesService.ts`)
- **Key Capabilities:**
  - Position management (open/close positions)
  - Order placement (market/limit, stop-loss/take-profit)
  - Leverage management (isolated/cross margin)
  - Funding rate tracking
  - Order cancellation (single/all)
  - Account balance queries

### 2. **Scoring System**
- **Status in B:** ✅ Complete (`src/scoring/`)
- **Status in A:** ✅ Similar implementation
- **Decision:** Keep B's implementation (already complete)

### 3. **Monitoring & Health**
- **Status in B:** ✅ Complete (`src/monitoring/`)
- **Status in A:** ✅ Similar implementation
- **Decision:** Keep B's implementation

### 4. **Providers/Exchange Integrations**
- **Status in B:** ✅ Binance + KuCoin Spot
- **Status in A:** ✅ KuCoin Spot + KuCoin Futures
- **Decision:** Extract A's Futures adapter into B's adapter pattern

### 5. **Realtime/WebSocket**
- **Status in B:** ✅ General WS + Futures-specific channel exists
- **Status in A:** ✅ General WS
- **Decision:** Enhance B's futures channel with A's patterns if needed

### 6. **Redis/Caching**
- **Status in B:** ✅ Optional Redis (`src/services/RedisService.ts`)
- **Status in A:** ✅ Similar implementation
- **Decision:** Keep B's implementation

### 7. **AI/Backtest**
- **Status in B:** ✅ Complete (`src/ai/`)
- **Status in A:** ✅ Similar implementation
- **Decision:** Keep B's implementation

### 8. **Data/Migrations**
- **Status in B:** ✅ Encrypted SQLite + migrations (v6 has futures tables)
- **Status in A:** ✅ SQLite (less structured)
- **Decision:** Use B's migration system (already has futures tables)

### 9. **Security**
- **Status in B:** ✅ Feature flags, encrypted DB, structured logging
- **Status in A:** ⚠️ localStorage for credentials (frontend-only)
- **Decision:** Use B's ENV-based credential management

---

## Service Map (One-Line Per Service)

### Backend Services (B)
- `MarketDataIngestionService` - Cron + WebSocket market data ingestion
- `FuturesService` - Futures trading orchestration (exists, needs verification)
- `OrderManagementService` - Virtual order management
- `SignalGeneratorService` - Multi-source signal aggregation
- `ContinuousLearningService` - AI model retraining orchestrator
- `ScoringService` - Multi-factor opportunity scoring
- `RedisService` - Optional caching/pub-sub
- `AlertService` - Alert lifecycle management
- `NotificationService` - Multi-channel notifications

### Providers/Adapters (B)
- `BinanceService` - Binance Spot API integration
- `KuCoinService` - KuCoin Spot API integration
- `KucoinFuturesAdapter` - KuCoin Futures API integration (exists, needs verification)

### Data Layer (B)
- `EncryptedDatabase` - AES-256-CBC SQLite wrapper
- `DatabaseMigrations` - Version-controlled schema migrations
- `FuturesPositionRepository` - Futures positions CRUD
- `FuturesOrderRepository` - Futures orders CRUD
- `MarketDataRepository` - OHLCV data access
- `TrainingMetricsRepository` - AI training metrics

### Controllers (B)
- `FuturesController` - Futures HTTP endpoints (exists)
- `MarketDataController` - Market data endpoints
- `AIController` - AI prediction endpoints
- `ScoringController` - Scoring endpoints
- `TradingController` - Spot trading endpoints

---

## API Groups

### Market Data (B)
- `GET /api/market/prices` - Multi-symbol prices
- `GET /api/market/historical` - OHLCV candles
- `GET /api/market-data/:symbol` - Aggregated market data

### Futures Trading (B) - **Target Integration**
- `GET /api/futures/positions` - List positions
- `POST /api/futures/orders` - Place order
- `DELETE /api/futures/orders/:id` - Cancel order
- `DELETE /api/futures/orders` - Cancel all orders
- `GET /api/futures/orders` - List open orders
- `PUT /api/futures/leverage` - Set leverage
- `GET /api/futures/account/balance` - Account balance
- `GET /api/futures/orderbook/:symbol` - Orderbook
- `GET /api/futures/funding/:symbol` - Current funding rate
- `GET /api/futures/funding/:symbol/history` - Funding rate history

### AI/ML (B)
- `GET /api/ai/predict` - Simple prediction
- `POST /api/ai/predict` - Advanced prediction
- `POST /api/ai/train` - Train model
- `GET /api/training-metrics` - Training metrics

### Signals (B)
- `POST /api/signals/analyze` - Analyze symbol
- `POST /api/signals/generate` - Generate signals
- `GET /api/signals/history` - Signal history
- `GET /api/signals/statistics` - Signal stats

### Scoring (B)
- `GET /api/scoring/opportunities` - Top opportunities
- `POST /api/scoring/analyze` - Analyze symbol

---

## Data Model (Encrypted DB)

### Existing Tables (B)
- `schema_migrations` - Migration tracking
- `market_data` - OHLCV candles
- `training_metrics` - AI training metrics
- `experience_buffer` - RL replay memory
- `backtest_results` - Backtest summaries
- `backtest_trades` - Individual trades
- `opportunities` - Trading opportunities
- `alerts` - User alerts

### Futures Tables (B) - Migration v6
- `futures_positions` - Open positions
  - Columns: `id`, `exchange`, `symbol`, `side`, `size`, `entry_price`, `leverage`, `margin_mode`, `liq_price`, `pnl`, `account_id`, `created_at`, `updated_at`
- `futures_orders` - Order history
  - Columns: `id`, `exchange`, `symbol`, `side`, `type`, `qty`, `price`, `status`, `client_order_id`, `meta`, `account_id`, `created_at`, `updated_at`
- `funding_rates` - Funding rate history
  - Columns: `symbol`, `rate`, `time`, `exchange`, `created_at`
- `leverage_settings` - Leverage configurations
  - Columns: `symbol`, `leverage`, `margin_mode`, `exchange`, `account_id`, `updated_at`

**Indexes:**
- `idx_futures_positions_symbol` on `(symbol)`
- `idx_futures_positions_side` on `(side)`
- `idx_futures_orders_symbol` on `(symbol)`
- `idx_futures_orders_status` on `(status)`
- `idx_futures_orders_order_id` on `(order_id)`

---

## Feature Flags

### Current Flags (B)
- `FEATURE_FUTURES` (default: `false`) - Enable futures trading
- `EXCHANGE_KUCOIN` (default: `true`) - Enable KuCoin exchange
- `DISABLE_REDIS` - Disable Redis caching
- Provider flags: `ENABLE_CMC`, `ENABLE_COINGECKO`, `ENABLE_CRYPTOCOMPARE`, etc.

### ENV Variables (B)
- `KUCOIN_FUTURES_KEY` - KuCoin Futures API key
- `KUCOIN_FUTURES_SECRET` - KuCoin Futures API secret
- `KUCOIN_FUTURES_PASSPHRASE` - KuCoin Futures passphrase
- `FUTURES_BASE_URL` - Futures API base URL (default: `https://api-futures.kucoin.com`)

---

## Build/Run Scripts

### B Scripts
- `npm run dev` - Development mode
- `npm run build` - Build for production
- `npm run build:frontend` - Build frontend only
- `npm start` - Production server
- `npm test` - Run tests

### A Scripts
- Similar structure, no significant differences

---

## Security Expectations

### B's Security Model
- ✅ Feature flags for gradual rollout
- ✅ Encrypted database (AES-256-CBC)
- ✅ No secrets in code (ENV-based)
- ✅ Structured logging (no secrets in logs)
- ✅ Request validation in controllers
- ⚠️ No Express-level rate limiting (provider-level only)
- ⚠️ No authentication (single-user system)

### Security Improvements Needed
- Add Express-level rate limiting
- Add input validation middleware (Zod/Joi)
- Consider RBAC for future multi-user support

---

## Known Risks & TODOs

### Integration Risks
1. **A's credentials stored in localStorage** - B uses ENV, need to map A's patterns
2. **A's error handling** - May need alignment with B's `DomainError` patterns
3. **A's rate limiting** - Check if B's adapter has proper rate limiting
4. **Symbol normalization** - A uses `BTCUSDTM`, B may need format mapping

### TODOs
1. Verify `KucoinFuturesAdapter` completeness against A's `KuCoinFuturesService`
2. Ensure funding rate endpoints exist
3. Verify WebSocket channel broadcasts all events
4. Add comprehensive error mapping
5. Test with `FEATURE_FUTURES=false` to ensure zero impact
6. Add rate limiting to futures endpoints
7. Update documentation

---

## Next Steps

1. **Stage 1:** Inventory A's futures implementation in detail
2. **Stage 2:** Create capability matrix and unification plan
3. **Stage 3:** Verify/enhance contracts, flags, ENV
4. **Stage 4:** Verify migrations exist and are correct
5. **Stage 5:** Complete/adjust provider adapter
6. **Stage 6:** Verify API endpoints and WS channel
7. **Stage 7:** Security, monitoring, docs updates

---

**Document Maintained By:** Integration Team  
**Last Updated:** 2025-11-06
