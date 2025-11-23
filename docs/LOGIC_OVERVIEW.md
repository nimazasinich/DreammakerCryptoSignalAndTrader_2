## Core Business Logic
- **Market ingestion**: `MarketDataIngestionService` (`src/services/MarketDataIngestionService.ts:24-198`) subscribes to Binance streams and cron tasks, normalises candles, validates them, persists via `Database.insertMarketData`, and publishes to Redis.
- **Analytics suite**: Technical/structural features are derived in `FeatureEngineering.extractAllFeatures` (`src/ai/FeatureEngineering.ts:48-144`) using SMC/Elliott/harmonic detectors. Sentiment and whale services synthesise supplementary scores (partly simulated).
- **AI signal generation**: `BullBearAgent.predict` (`src/ai/BullBearAgent.ts:46-179`) converts recent market windows into features, performs Monte Carlo dropout, and selects LONG/SHORT/HOLD actions. `SignalGeneratorService` packages multi-timeframe predictions, applies confidence/confluence rules, and notifies subscribers.
- **Backtesting**: `BacktestEngine.runBacktest` (`src/ai/BacktestEngine.ts:18-123`) replays historical candles, calls the agent for decisions, simulates fills/fees/slippage, and aggregates performance metrics.
- **Order management**: `OrderManagementService` (`src/services/OrderManagementService.ts:9-736`) orchestrates simulated OMS operations (market/limit/stop/trailing/OCO), updates in-memory positions, and records portfolio metrics.
- **Alerting & notifications**: `AlertService` tracks alert lifecycles and performance, triggers `NotificationService` to emit desktop/Telegram/email stubs (`src/services/NotificationService.ts:61-146`), and exposes analytics.

## Important Algorithms
```text
SignalGeneratorService.generateSignal(symbol)
  ensure rate limit window elapsed
  fetch multi-timeframe market data from Database
  for each timeframe:
    run BullBearAgent.predict(marketData)
  compute confluence score across timeframes
  if config.confluenceRequired and score < threshold -> skip
  create Signal object with reasoning & feature attribution
  update statistics, history, notify subscribers
```

```text
BullBearAgent.predict(marketData)
  require initialization
  features = extractFeatures(last 100 candles)
  mcSamples = [simulateForwardPass(features) for N iterations]
  meanProbs = average(mcSamples)
  uncertainty = stdev(mcSamples)
  action = choose LONG/SHORT/HOLD against thresholds
  reasoning = explain probabilities & feature heuristics
  return {probabilities, confidence=1-uncertainty, action, reasoning}
```

```text
SMCAnalyzer.analyzeFullSMC(data)
  liquidityZones = detectLiquidityZones(data)
  orderBlocks = detectOrderBlocks(data)
  fairValueGaps = detectFairValueGaps(data)
  breakOfStructure = detectBreakOfStructure(data)
  log summary & return aggregated SmartMoneyFeatures
```

## Validation Rules & Edge Cases
- `DataValidationService` enforces strict OHLC rules (positive prices, high ≥ open/close, low ≤ open/close, range sanity) and flags stale/future timestamps (`src/services/DataValidationService.ts:35-145`).
- `ConfigManager.validateConfig` requires Binance API key and database path; missing keys trigger fallback config generation but still leave the service without usable credentials (`src/core/ConfigManager.ts:77-89`).
- `OrderManagementService` rejects cancellable states, auto-cancels paired OCO orders, and computes realised/unrealised PnL against stored closes (`src/services/OrderManagementService.ts:329-520`).
- `ExperienceBuffer.initializePriorityTree` contains a non-terminating loop (`src/ai/ExperienceBuffer.ts:69-75`); as written it will hang during construction and must be fixed before training features are usable.
- Notification and fallback services perform external HTTP calls without retries beyond logging—errors bubble up to API callers (`src/services/NotificationService.ts:102-125`, `src/services/EmergencyDataFallbackService.ts:78-147`).

## State Management
- **Backend**: All services are singletons; state (redis connections, experience buffer, signal history, positions) lives in-process. Continuous learning and signal generator store timers on the service instance.
- **Frontend**: React Context providers control navigation (`src/components/Navigation/NavigationProvider.tsx`), theme (`src/components/Theme/ThemeProvider.tsx`), accessibility (`src/components/Accessibility/AccessibilityProvider.tsx`), and live data subscriptions (`src/components/LiveDataContext.tsx`). Each provider persists preferences in localStorage and exposes hooks.
- **Experience replay**: `TrainingEngine` reuses the shared `ExperienceBuffer`, but due to the current bug it cannot initialise correctly; once fixed, sampling/updating mutates global buffer state.
- **WebSocket clients**: `dataManager` stores one shared `WebSocket` instance and a listener registry (`src/services/dataManager.ts:217-309`) to multiplex frontend subscriptions.

## Execution Paths
- **`POST /api/ai/predict`** (`src/server.ts:457-489`): validates symbol, fetches ~100 recent candles from SQLite, ensures sufficient data, runs `BullBearAgent.predict`, and returns probabilities/action/confidence.
- **`POST /api/orders/market`** (`src/server.ts:1457-1478`): constructs an order, `OrderManagementService.createMarketOrder` executes immediately using the latest stored close price, logs fills/fees, updates positions/portfolio, and returns the simulated order record.
- **WebSocket `signal_update` subscription** (`src/server.ts:1794-1875`): upon receiving `{type:'subscribe', event:'signal_update', symbols:['BTCUSDT']}`, server schedules a per-symbol interval that fetches market data from SQLite, calls `BullBearAgent.predict`, and streams `{type:'signal_update', data:{symbol, prediction}}` every minute.
- **`POST /api/continuous-learning/start`** (`src/server.ts:1295-1313`): merges client config into `ContinuousLearningService`, initialises the training network (`TrainingEngine.initializeNetwork`), measures baseline accuracy, kicks off the learning cycle timer, and responds with live statistics.
