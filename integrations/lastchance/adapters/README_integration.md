# LastChance Minimal API Bundle — Integration Guide (Minimal Diffs)

This bundle contains a curated set of **real-data** backend snippets (FastAPI) and small **client adapters** you can drop into your project to consume **real OHLC/Prices, Signals/Backtest, Predictions, and WebSocket**.

## What’s Included
- `backend-snippets/backend/api/*.py` — market, signals, predictions, exchanges, monitoring, alerts, proxy, websocket
- `backend-snippets/backend/services/*.py` — market_service, signal_service
- `backend-snippets/backend/websocket/manager.py`
- `backend-snippets/backend/ml/backtester.py`, `backend-snippets/backend/ml/model.py`
- `adapters/RealDataProvider_from_LastChance.ts` — fetch OHLCV/prices/universe
- `adapters/BacktestAPI_from_LastChance.ts` — run server-side backtests & predictions
- `adapters/WSClient_from_LastChance.ts` — open the project WS

## Minimal-Diff Wiring (Frontend)
1. Copy `adapters/*.ts` into your repo (e.g., `<your-root>/integrations/lastchance/`).
2. In your `RealDataManager`, add a provider that calls `fetchOHLCV`/`fetchPrices` before other providers (Binance, CryptoCompare).
3. For **Top-300 symbols**, call `fetchUniverseTopN()` to populate the symbol selector (filter by volume as needed).
4. In **BacktestButton**, POST to `runBacktest({ symbol, timeframe })` (or keep your existing navigation if you run local backtests).
5. In your **LiveDataProvider**, optionally open WS via `openLastChanceWS()` and route messages to your store.

## Minimal-Diff Wiring (Backend) — optional
If you want to rehost any endpoints, copy from `backend-snippets/` into your FastAPI app and mount the routers. ENV values are used for secrets.

## Environment
- `API_BASE` → points to the FastAPI host (e.g., http://localhost:8001/api)
- `WS_BASE`  → ws://localhost:8001
- Ensure CORS allows your frontend origin.

## Real Data Only
These adapters **do not** contain mock or demo fallbacks. If an endpoint returns < 50 bars or non-200, **hide UI sections** (no fake numbers).
