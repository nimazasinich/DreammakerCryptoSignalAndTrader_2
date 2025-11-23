# Search Hits

## Entrypoints & Servers
Command: `rg -n --glob 'src/**' "createServer|app\\.listen|express" -S`
- src/server.ts:1 `import express from 'express';`
- src/server.ts:4 `import { createServer } from 'http';`
- src/server.ts:31 `const app = express();`
- src/server.ts:32 `const server = createServer(app);`
- src/server.ts:118 `app.use(express.json());`
- src/server.ts:1898 `app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => { ... })`

## Routers & Endpoints
Command: `rg -n --glob 'src/**' "(router|routes?|controller|endpoint|@app\\.get|@app\\.post|fastapi\\.APIRouter|express\\.Router|app\\.(get|post|put|patch|delete))" -S`
- src/server.ts:135 `app.get('/api/health', ...)`
- src/server.ts:186 `app.get('/api/data-pipeline/status', ...)`
- src/server.ts:206 `app.post('/api/data-pipeline/emergency-mode', ...)`
- src/server.ts:230 `app.post('/api/data-pipeline/add-symbol', ...)`
- src/server.ts:257 `app.post('/api/binance/toggle-testnet', ...)`
- src/server.ts:278 `app.get('/api/binance/health', ...)`
- src/server.ts:298 `app.get('/api/ai/test-initialization', ...)`
- src/server.ts:343 `app.post('/api/ai/create-network', ...)`
- src/server.ts:405 `app.post('/api/ai/train-step', ...)`
- src/server.ts:437 `app.post('/api/ai/train-epoch', ...)`
- src/server.ts:457 `app.post('/api/ai/predict', ...)`
- src/server.ts:496 `app.post('/api/ai/extract-features', ...)`
- src/server.ts:635 `app.post('/api/ai/backtest', ...)`
- src/server.ts:673 `app.post('/api/alerts', ...)`
- src/server.ts:692 `app.get('/api/alerts', ...)`
- src/server.ts:736 `app.get('/api/alerts/analytics', ...)`
- src/server.ts:784 `app.get('/api/system/status', ...)`
- src/server.ts:817 `app.get('/api/system/cache/stats', ...)`
- src/server.ts:838 `app.post('/api/system/cache/clear', ...)`
- src/server.ts:863 `app.get('/api/market/prices', ...)`
- src/server.ts:908 `app.post('/api/signals/analyze', ...)`
- src/server.ts:956 `app.get('/api/scoring/snapshot', ...)`
- src/server.ts:986 `app.post('/api/scoring/config', ...)`
- src/server.ts:1015 `app.get('/api/market-data/:symbol', ...)`
- src/server.ts:1068 `app.get('/api/price/:symbol', ...)`
- src/server.ts:1088 `app.get('/api/ticker/:symbol?', ...)`
- src/server.ts:1108 `app.get('/api/training-metrics', ...)`
- src/server.ts:1125 `app.get('/api/opportunities', ...)`
- src/server.ts:1155 `app.post('/api/analysis/smc', ...)`
- src/server.ts:1187 `app.post('/api/analysis/elliott', ...)`
- src/server.ts:1219 `app.post('/api/analysis/harmonic', ...)`
- src/server.ts:1251 `app.post('/api/analysis/sentiment', ...)`
- src/server.ts:1273 `app.post('/api/analysis/whale', ...)`
- src/server.ts:1295 `app.post('/api/continuous-learning/start', ...)`
- src/server.ts:1315 `app.post('/api/continuous-learning/stop', ...)`
- src/server.ts:1331 `app.get('/api/continuous-learning/stats', ...)`
- src/server.ts:1350 `app.get('/api/continuous-learning/config', ...)`
- src/server.ts:1367 `app.post('/api/signals/start', ...)`
- src/server.ts:1387 `app.post('/api/signals/stop', ...)`
- src/server.ts:1403 `app.get('/api/signals/history', ...)`
- src/server.ts:1422 `app.get('/api/signals/statistics', ...)`
- src/server.ts:1440 `app.get('/api/signals/config', ...)`
- src/server.ts:1457 `app.post('/api/orders/market', ...)`
- src/server.ts:1480 `app.post('/api/orders/limit', ...)`
- src/server.ts:1506 `app.post('/api/orders/stop-loss', ...)`
- src/server.ts:1530 `app.post('/api/orders/trailing-stop', ...)`
- src/server.ts:1554 `app.post('/api/orders/oco', ...)`
- src/server.ts:1580 `app.delete('/api/orders/:id', ...)`
- src/server.ts:1604 `app.get('/api/orders/:id', ...)`
- src/server.ts:1628 `app.get('/api/orders', ...)`
- src/server.ts:1656 `app.get('/api/positions', ...)`
- src/server.ts:1682 `app.get('/api/portfolio', ...)`

> Note: `/api/ai/train-step`, `/api/ai/train-epoch`, `/api/ai/predict`, and `/api/ai/extract-features` are declared twice in `server.ts` (lines 405–611 & 520–611); the later definition overrides the former.

## WebSocket References
Command: `rg -n --glob 'src/**' "WebSocket|socket\\.io|ws\\(|uvicorn\\.websockets|@app\\.websocket" -S`
- src/server.ts:5 `import { WebSocketServer, WebSocket } from 'ws';`
- src/server.ts:33 `const wss = new WebSocketServer({ server });`
- src/server.ts:35 `const wsServer = new WebSocketServer({ server, path: '/ws' });`
- src/server.ts:78 `const connectedClients = new Set<WebSocket>();`
- src/server.ts:1701–1875 WebSocket connection handling & subscription routing.
- src/services/dataManager.ts:217–309 frontend WS client management.
- src/services/MarketDataIngestionService.ts:52–120 Binance stream subscriptions.
- src/services/BinanceService.ts:27–557 WebSocket multiplexer and stream helpers.

## State / Store Queries
Command: `rg -n --glob 'src/**' "Zustand|create\(|useStore|Redux|createSlice|Context\(" -S`
- src/components/Navigation/NavigationProvider.tsx:14 `createContext(...)`
- src/components/Theme/ThemeProvider.tsx:17 `createContext(...)`
- src/components/Accessibility/AccessibilityProvider.tsx:27 `createContext(...)`
- src/components/LiveDataContext.tsx:29 `createContext(...)`
- src/services/BinanceService.ts:67 `this.httpClient = axios.create(...)` (no Redux/Zustand detected).

## Feature Flags & Environment Access
Command: `rg -n --glob 'src/**' "(FEATURE_|FLAG_|process\\.env|dotenv|validateEnv|pydantic\\.BaseSettings|environs)" -S`
- src/core/ConfigManager.ts:48 `apiKey: process.env.BINANCE_API_KEY || ''`
- src/core/ConfigManager.ts:49 `secretKey: process.env.BINANCE_SECRET_KEY || ''`
- src/core/ConfigManager.ts:57 `botToken: process.env.TELEGRAM_BOT_TOKEN || ''`
- src/core/ConfigManager.ts:58 `chatId: process.env.TELEGRAM_CHAT_ID || ''`
- src/core/ConfigManager.ts:68 `password: process.env.REDIS_PASSWORD`
- src/server.ts:113 `const PORT = process.env.PORT || 3001;`
- src/server.ts:1906 `message: process.env.NODE_ENV === 'development' ? ...`
- src/server.ts:1943 `environment: process.env.NODE_ENV || 'development'`
- src/server.ts:1952 ``${process.env.NODE_ENV || 'development'}` output in startup banner.`

## Config & Build Files
Command: `find . -maxdepth 1 -name '*config*' -o -name 'tsconfig*.json'`
- ./config
- ./eslint.config.js
- ./jest.config.js
- ./postcss.config.js
- ./tailwind.config.js
- ./tsconfig.app.json
- ./tsconfig.json
- ./tsconfig.node.json
- ./vite.config.ts

