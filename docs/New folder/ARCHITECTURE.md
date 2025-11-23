# Architecture Deep Dive
## BOLT AI Cryptocurrency Neural AI Agent System

**Document Version:** 1.0  
**Last Updated:** 2025-11-06  
**Confidence:** HIGH

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Monorepo Structure](#monorepo-structure)
4. [Runtime Services](#runtime-services)
5. [Data Flow](#data-flow)
6. [Configuration & Environment](#configuration--environment)
7. [Build & Deploy Pipeline](#build--deploy-pipeline)
8. [Observability](#observability)
9. [Security Posture](#security-posture)
10. [Service Dependency Map](#service-dependency-map)

---

## Overview

BOLT AI is a **monolithic full-stack application** (not microservices) with clear separation between:
- **Frontend SPA** (React + Vite) serving static assets
- **Backend API** (Express + TypeScript) handling business logic
- **Embedded Database** (SQLite with encryption)
- **Optional Cache** (Redis for performance scaling)

The architecture follows a **singleton service pattern** where all services are instantiated once at server startup and share state through the ServiceOrchestrator.

---

## System Architecture

### High-Level Component Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  React SPA (Port 5173)                                        │  │
│  │  • 12 Views (Dashboard, Trading, Scanner, etc.)               │  │
│  │  • 70+ Components with lazy loading                           │  │
│  │  • Context Providers for state management                     │  │
│  │  • WebSocket client with auto-reconnect                       │  │
│  └────────────────┬───────────────────────────────────────────────┘  │
└───────────────────┼────────────────────────────────────────────────┘
                    │ HTTP/HTTPS + WebSocket
                    │ REST: /api/*
                    │ WS: ws://*/ws
                    │
┌───────────────────▼────────────────────────────────────────────────┐
│                      APPLICATION LAYER                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Express Server (Port 3001)                                   │  │
│  │  • 60+ REST Endpoints                                         │  │
│  │  • 2 WebSocket Servers (/ws primary, wss legacy)              │  │
│  │  • Helmet + CORS middleware                                   │  │
│  │  • Request logging with correlation IDs                       │  │
│  └──────┬───────────────────────────────────────────────────┬────┘  │
│         │                                                    │       │
│  ┌──────▼─────────┐  ┌─────────────────┐  ┌────────────────▼────┐  │
│  │  Controllers   │  │  Middleware     │  │  WebSocket Handler  │  │
│  │  • Market      │  │  • Auth (TODO)  │  │  • Price streams    │  │
│  │  • Trading     │  │  • Validation   │  │  • Signal updates   │  │
│  │  • AI          │  │  • Error        │  │  • Health ping/pong │  │
│  │  • Analysis    │  │  • Logging      │  │  • Subscriptions    │  │
│  │  • System      │  └─────────────────┘  └─────────────────────┘  │
│  └────────────────┘                                                 │
└───────────────────┬────────────────────────────────────────────────┘
                    │
┌───────────────────▼────────────────────────────────────────────────┐
│                       SERVICE LAYER (64 Services)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │
│  │ Market Data  │ │   AI/ML      │ │   Trading    │ │  System   │ │
│  │              │ │              │ │              │ │           │ │
│  │ • Binance    │ │ • BullBear   │ │ • Order Mgmt │ │ • Logger  │ │
│  │ • KuCoin     │ │   Agent      │ │ • Virtual    │ │ • Config  │ │
│  │ • Multi-     │ │ • Training   │ │   Trading    │ │   Manager │ │
│  │   Provider   │ │   Engine     │ │ • Unified    │ │ • Health  │ │
│  │ • Real-Time  │ │ • Backtest   │ │   Exchange   │ │   Check   │ │
│  │ • Historical │ │   Engine     │ │              │ │ • Metrics │ │
│  │ • CORS Proxy │ │ • Feature    │ │              │ │           │ │
│  │              │ │   Eng.       │ │              │ │           │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────┬─────┘ │
│         │                │                │               │       │
│  ┌──────▼────────────────▼────────────────▼───────────────▼─────┐ │
│  │              Analysis & Intelligence Services                 │ │
│  │  • SMCAnalyzer (Smart Money Concepts)                         │ │
│  │  • ElliottWaveAnalyzer                                        │ │
│  │  • HarmonicPatternDetector                                    │ │
│  │  • TechnicalAnalysisService                                   │ │
│  │  • SentimentAnalysisService                                   │ │
│  │  • FearGreedService                                           │ │
│  │  • WhaleTrackerService                                        │ │
│  │  • BlockchainDataService                                      │ │
│  │  • SignalGeneratorService                                     │ │
│  │  • AdaptiveScoringEngine                                      │ │
│  └───────────────────────────────┬───────────────────────────────┘ │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                          DATA LAYER                                  │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────────────┐   │
│  │   SQLite DB   │  │  Redis Cache   │  │   External APIs      │   │
│  │  (Encrypted)  │  │  (Optional)    │  │                      │   │
│  │               │  │                │  │  • CoinGecko         │   │
│  │ • market_data │  │ • Price cache  │  │  • CryptoCompare     │   │
│  │ • training_   │  │ • Session      │  │  • CoinMarketCap     │   │
│  │   metrics     │  │   store        │  │  • Binance API       │   │
│  │ • experience_ │  │ • Pub/Sub      │  │  • KuCoin API        │   │
│  │   buffer      │  │   channels     │  │  • Etherscan         │   │
│  │ • signals     │  │                │  │  • BscScan           │   │
│  │ • orders      │  │                │  │  • TronScan          │   │
│  │ • portfolios  │  │                │  │  • Fear & Greed API  │   │
│  │               │  │                │  │  • NewsAPI           │   │
│  └───────────────┘  └────────────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

**Type:** Single application (NOT a monorepo)  
**Package Manager:** npm (uses package-lock.json)  
**Build System:** Vite (frontend) + TypeScript compiler (backend)

### Directory Layout

```
/workspace
├── src/                          # All source code
│   ├── server.ts                 # Main Express server (legacy, feature-complete)
│   ├── server-real-data.ts       # Simplified server (100% real data focus)
│   ├── server-simple.ts          # Minimal test server
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root React component
│   │
│   ├── controllers/              # HTTP request handlers (7 controllers)
│   ├── services/                 # Business logic (64 services)
│   ├── ai/                       # Neural network components (18 files)
│   ├── scoring/                  # Scoring system (6 files)
│   ├── data/                     # Database layer
│   │   ├── Database.ts
│   │   ├── EncryptedDatabase.ts
│   │   ├── DatabaseMigrations.ts
│   │   └── repositories/         # Data access objects
│   ├── core/                     # Infrastructure
│   │   ├── Logger.ts             # Structured logging
│   │   ├── ConfigManager.ts      # Config loader
│   │   └── AdvancedCache.ts      # Caching abstraction
│   ├── monitoring/               # Observability
│   │   ├── HealthCheckService.ts
│   │   ├── MetricsCollector.ts
│   │   ├── PerformanceMonitor.ts
│   │   └── AlertManager.ts
│   ├── components/               # React components (70+ files)
│   ├── views/                    # Page-level components (12 views)
│   ├── contexts/                 # React context providers
│   ├── hooks/                    # Custom React hooks
│   ├── config/                   # Frontend config
│   ├── types/                    # TypeScript interfaces
│   ├── utils/                    # Utility functions
│   └── styles/                   # Global styles
│
├── config/                       # Server configuration
│   └── api.json                  # API keys, database paths
│
├── data/                         # Runtime database files
│   └── crypto-agent.db           # SQLite database (git-ignored)
│
├── logs/                         # Application logs (git-ignored)
│   └── bolt-ai-YYYY-MM-DD.log
│
├── scripts/                      # Automation scripts
│   ├── start_all.mjs             # Full stack startup
│   ├── verify_full.mjs           # Health check script
│   ├── github/                   # GitHub CLI wrappers
│   └── migrate/                  # Database migration tools
│
├── tests/                        # Playwright E2E tests
├── docs/                         # Documentation
│   └── recon/                    # This survey documentation
│
├── public/                       # Static assets
├── dist/                         # Build output (git-ignored)
│
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config (backend)
├── tsconfig.app.json             # TypeScript config (frontend)
├── vite.config.ts                # Vite bundler config
├── tailwind.config.js            # TailwindCSS config
├── jest.config.js                # Jest test config
├── playwright.config.ts          # E2E test config
├── Dockerfile                    # Container image
├── railway.json                  # Railway deployment config
├── .env (git-ignored)            # Environment variables
└── env.example                   # Environment template
```

---

## Runtime Services

### Server Entry Points

#### 1. `src/server-real-data.ts` (Primary, Recommended)
- **Purpose:** Production server with 100% real data integration
- **Port:** 3001 (auto-finds free port if occupied)
- **Features:**
  - All REST endpoints for market, AI, trading, analysis
  - WebSocket server at `/ws` path
  - Real external API integrations
  - Graceful error handling with fallbacks
- **Dependencies:** 50+ service singletons instantiated at startup
- **Startup:** `npm run dev:real` or `tsx watch src/server-real-data.ts`

#### 2. `src/server.ts` (Legacy, Feature-Complete)
- **Purpose:** Original full-featured server (3000+ lines)
- **Differences from real-data server:**
  - More endpoints (portfolio management, admin controls)
  - Binance integration as primary exchange
  - Market data ingestion worker with cron jobs
  - More complex initialization sequence
- **Status:** Maintained for backward compatibility

#### 3. `src/server-simple.ts` (Test/Development)
- **Purpose:** Minimal server for testing
- **Use Case:** Quick smoke tests, debugging

### Service Initialization Sequence

```typescript
// 1. Load environment variables
dotenv.config();

// 2. Initialize core infrastructure
const logger = Logger.getInstance();
const configManager = ConfigManager.getInstance();

// 3. Initialize data layer
const database = Database.getInstance();
await database.initialize();

const redisService = RedisService.getInstance(); // Optional
await redisService.connect(); // Gracefully fails if unavailable

// 4. Initialize market data services (in parallel)
const marketDataService = new RealMarketDataService();
const binanceService = BinanceService.getInstance();
const kucoinService = new KuCoinService();

// 5. Initialize analysis services
const smcAnalyzer = SMCAnalyzer.getInstance();
const harmonicDetector = HarmonicPatternDetector.getInstance();
const ellliotWaveAnalyzer = ElliottWaveAnalyzer.getInstance();
const signalGenerator = SignalGeneratorService.getInstance();

// 6. Initialize AI/ML components
const bullBearAgent = BullBearAgent.getInstance();
await bullBearAgent.initialize(); // Async TensorFlow.js setup

const trainingEngine = TrainingEngine.getInstance();
const backtestEngine = BacktestEngine.getInstance();

// 7. Initialize trading services
const orderManagement = OrderManagementService.getInstance();
const virtualTrading = VirtualTradingService.getInstance();

// 8. Initialize monitoring
const healthCheck = HealthCheckService.getInstance();
const metricsCollector = MetricsCollector.getInstance();

// 9. Start Express server
const server = app.listen(port);

// 10. Start WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// 11. Start background workers (optional)
const continuousLearning = ContinuousLearningService.getInstance();
await continuousLearning.start(); // Periodic AI retraining
```

### Service Dependencies

```
MarketDataService
  ├─> BinanceService (rate-limited HTTP client)
  ├─> KuCoinService (exchange API wrapper)
  ├─> MultiProviderMarketDataService
  │     ├─> CoinGecko API
  │     ├─> CryptoCompare API
  │     └─> CoinMarketCap API
  └─> EmergencyDataFallbackService (when primary fails)

SignalGeneratorService
  ├─> MarketDataService (historical data)
  ├─> TechnicalAnalysisService (indicators)
  ├─> SMCAnalyzer (smart money patterns)
  ├─> ElliottWaveAnalyzer (wave counting)
  ├─> HarmonicPatternDetector (harmonic patterns)
  ├─> SentimentAnalysisService (sentiment scores)
  ├─> WhaleTrackerService (large transactions)
  └─> BullBearAgent (AI predictions)

BullBearAgent (AI Agent)
  ├─> FeatureEngineering (feature extraction)
  │     ├─> TechnicalAnalysisService
  │     ├─> SentimentAnalysisService
  │     ├─> WhaleTrackerService
  │     └─> SMCAnalyzer
  ├─> TrainingEngine (model training)
  │     ├─> ExperienceBuffer (replay memory)
  │     ├─> AdamWOptimizer
  │     ├─> XavierInitializer
  │     └─> StableActivations
  └─> Database (training metrics persistence)

OrderManagementService
  ├─> UnifiedExchangeService
  │     ├─> BinanceService
  │     └─> KuCoinService
  ├─> Database (order persistence)
  └─> NotificationService (order alerts)
```

---

## Data Flow

### 1. Market Data Ingestion Flow

```
External APIs → RealMarketDataService → ValidationService → Cache/Database → Analytics Services
                                              ↓
                                         WebSocket Broadcast
                                              ↓
                                     Frontend Updates (React)
```

**Step-by-Step:**

1. **Trigger:** Scheduled intervals or on-demand API requests
2. **Fetch:** `RealMarketDataService.getAggregatedMarketData(symbol)`
   - Tries CoinGecko first (free tier)
   - Falls back to CryptoCompare if rate limited
   - Falls back to CoinMarketCap as last resort
3. **Validate:** `DataValidationService` checks OHLCV sanity
4. **Cache:** Redis stores with TTL (5 seconds for prices, 60 seconds for data)
5. **Persist:** SQLite inserts into `market_data` table
6. **Broadcast:** WebSocket pushes to connected clients
7. **React:** Frontend components re-render with new data

### 2. AI Signal Generation Flow

```
User Request → GET/POST /api/signals/* → SignalGeneratorService
                                              ↓
                                    ┌─────────▼──────────┐
                                    │  Parallel Analysis │
                                    └─────────┬──────────┘
                ┌─────────────┬──────────────┼──────────────┬─────────────┐
                ▼             ▼              ▼              ▼             ▼
         Technical      SMC Patterns   Elliott Wave   Harmonic      AI Prediction
         Indicators                                   Patterns      (BullBearAgent)
                │             │              │              │             │
                └─────────────┴──────────────┴──────────────┴─────────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  Score Combiner    │
                                    │  (Weighted Avg)    │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  Signal Decision   │
                                    │  BUY/SELL/HOLD     │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  Save to DB        │
                                    │  Broadcast WS      │
                                    └────────────────────┘
```

### 3. Frontend Data Flow

```
User Action → React Component → Context Provider → dataManager (API client)
                                                         ↓
                                                    HTTP Request
                                                         ↓
                                                  Express Endpoint
                                                         ↓
                                                    Controller
                                                         ↓
                                                    Service Layer
                                                         ↓
                                                    Response JSON
                                                         ↓
                                          Context State Update
                                                         ↓
                                          React Re-render
```

**WebSocket Data Flow:**

```
Component Mount → useSignalWebSocket hook → WebSocket client
                                                   ↓
                                          Subscribe message
                                                   ↓
                                          Backend WS handler
                                                   ↓
                                          Interval-based data push
                                                   ↓
                                          onMessage callback
                                                   ↓
                                          setState(newData)
                                                   ↓
                                          Component re-render
```

---

## Configuration & Environment

### Environment Variables (`.env` file)

#### Required for Basic Functionality
```bash
# Server
PORT=3001
NODE_ENV=development

# Redis (optional, graceful degradation if missing)
DISABLE_REDIS=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

#### Optional API Keys (Enables Premium Features)
```bash
# Market Data
CMC_API_KEY=****                  # CoinMarketCap (premium tier)
CRYPTOCOMPARE_KEY=****            # CryptoCompare (free tier)

# Blockchain Explorers
ETHERSCAN_API_KEY=****            # Ethereum blockchain
BSCSCAN_API_KEY=****              # Binance Smart Chain
TRONSCAN_API_KEY=****             # Tron blockchain

# Exchange APIs
BINANCE_API_KEY=****
BINANCE_SECRET_KEY=****
KUCOIN_API_KEY=****
KUCOIN_SECRET_KEY=****
KUCOIN_PASSPHRASE=****

# News & Sentiment
NEWSAPI_KEY=****                  # NewsAPI.org
CRYPTOPANIC_KEY=****              # CryptoPanic news

# AI/ML
HUGGINGFACE_API_KEY=****          # Optional, higher rate limits

# Notifications
TELEGRAM_BOT_TOKEN=****
TELEGRAM_CHAT_ID=****

# Database Encryption
SECRET_KEY=****                   # Auto-generated if missing
```

### Configuration Files

#### `config/api.json` (Backend Configuration)
```json
{
  "binance": {
    "apiKey": "from_env",
    "secretKey": "from_env",
    "testnet": false,
    "rateLimitPerMinute": 1200
  },
  "redis": {
    "host": "localhost",
    "port": 6379,
    "password": ""
  },
  "database": {
    "path": "./data/crypto-agent.db",
    "encryptionKey": "auto_generated"
  },
  "telegram": {
    "enabled": false,
    "botToken": "from_env",
    "chatId": "from_env"
  }
}
```

#### `src/config/flags.ts` (Feature Flags)
```typescript
export const FLAGS = {
  ENABLE_REAL_TRADING: false,      // Safety: disable live trading
  ENABLE_AI_TRAINING: true,        // Auto-retrain models
  ENABLE_WEBSOCKET: true,          // Real-time streaming
  ENABLE_REDIS_CACHE: true,        // Optional caching
  ENABLE_TELEGRAM_ALERTS: false,   // Notification system
  ENABLE_CONTINUOUS_LEARNING: true // Background AI retraining
};
```

---

## Build & Deploy Pipeline

### Development Build

```bash
# Frontend only (React SPA)
npm run dev:frontend    # Vite dev server on :5173

# Backend only (Express API)
npm run dev:backend     # tsx watch on server-simple.ts
npm run dev:backend:real # tsx watch on server-real-data.ts

# Full stack (concurrent)
npm run dev             # Both frontend + backend
npm run dev:real        # Recommended: real-data backend
```

### Production Build

```bash
# 1. Build TypeScript backend
npm run build           # tsc --project tsconfig.json → dist/

# 2. Build React frontend
npm run build:frontend  # vite build → dist/ (static assets)

# 3. Start production server
npm start               # node dist/server.js
```

### Docker Containerization

**Dockerfile (Multi-Stage Build):**

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/config ./config

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', ...)"

CMD ["node", "dist/server.js"]
```

**Build & Run:**

```bash
docker build -t bolt-ai:latest .
docker run -p 3001:3001 -p 5173:5173 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  bolt-ai:latest
```

### Railway Deployment

**railway.json:**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100
  }
}
```

**Environment Variables on Railway:**
- All `.env` variables must be configured in Railway dashboard
- Database persists to Railway volume mount

---

## Observability

### Logging

**Logger Implementation:** `src/core/Logger.ts`

**Features:**
- **Structured JSON logging** for machine parsing
- **Log levels:** DEBUG, INFO, WARN, ERROR, CRITICAL
- **Correlation IDs** for request tracing
- **File rotation:** Daily log files in `logs/bolt-ai-YYYY-MM-DD.log`
- **Console output:** Formatted for development

**Example Log Entry:**

```json
{
  "timestamp": "2025-11-06T12:34:56.789Z",
  "level": "INFO",
  "message": "Market data fetched successfully",
  "context": {
    "symbol": "BTC",
    "provider": "CoinGecko",
    "responseTime": 245
  },
  "correlationId": "req-abc123"
}
```

### Health Checks

**Endpoint:** `GET /api/health`

**Response:**

```json
{
  "status": "ok",
  "server": "BOLT AI - 100% Real Data",
  "timestamp": "2025-11-06T12:34:56.789Z",
  "port": 3001,
  "realDataSources": {
    "marketData": "CoinGecko + CryptoCompare + CoinMarketCap",
    "blockchain": "Etherscan + BscScan",
    "sentiment": "Fear & Greed Index",
    "whales": "ClankApp + Whale Alert",
    "ai": "TensorFlow.js",
    "patterns": "Real SMC/Elliott/Harmonic"
  }
}
```

**Additional Health Endpoints:**
- `GET /api/system/status` - Service-level health checks
- `GET /api/binance/health` - Exchange API connectivity
- `GET /api/database/health` - Database connection status

### Metrics Collection

**MetricsCollector:** Tracks in-memory metrics (no external APM)

**Tracked Metrics:**
- Request count per endpoint
- Response times (p50, p95, p99)
- Error rates
- WebSocket connection count
- Cache hit/miss ratio
- AI prediction latency
- Database query times

**Retrieval:** Metrics accessible via `/api/metrics` (not implemented, admin endpoint)

### Performance Monitoring

**PerformanceMonitor:** Tracks resource usage

**Monitored:**
- Memory usage (heap/RSS)
- CPU usage (via process.cpuUsage())
- Event loop lag
- Active handles/requests

**Alert Thresholds:**
- Memory > 80% → WARN
- Memory > 95% → CRITICAL
- Event loop lag > 100ms → WARN

---

## Security Posture

### Authentication & Authorization

**Status:** ⚠️ **NOT IMPLEMENTED**

- **Current:** No authentication layer
- **Impact:** All API endpoints publicly accessible
- **Risk:** HIGH (if deployed to public internet)
- **Recommendation:** Implement JWT or session-based auth before public deployment

**Planned Authentication (TODO):**
- JWT tokens with refresh mechanism
- API key authentication for programmatic access
- Role-based access control (RBAC)

### CORS Configuration

**Status:** ✅ **CONFIGURED**

```typescript
// src/server-real-data.ts
app.use(cors());  // Currently allows all origins
```

**Recommendation:** Restrict origins in production:

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));
```

### Secrets Management

**Database Encryption:**
- **Method:** AES-256-CBC encryption for SQLite database
- **Key Storage:** Auto-generated on first run, stored in git-ignored file
- **Risk:** Key loss = data loss; no rotation mechanism
- **Recommendation:** Migrate to external key management (AWS Secrets Manager, Vault)

**API Key Storage:**
- **Method:** Environment variables (`.env` file)
- **Risk:** Medium (file permissions protect keys, but no encryption at rest)
- **Recommendation:** Use secure env variable providers (Railway secrets, Docker secrets)

**Masked Logging:**
- All API keys masked in logs (`****`)
- Error messages never expose credentials

### Input Validation

**Status:** ⚠️ **PARTIAL**

- **DataValidationService:** Validates market data OHLCV
- **Symbol validation:** Basic sanitization (removes USDT suffix)
- **Missing:** Request body schema validation (no Joi/Zod)
- **Recommendation:** Add schema validation middleware for all POST/PUT endpoints

### Rate Limiting

**Status:** ✅ **PARTIAL**

- **External APIs:** Rate limiting implemented in BinanceService, KuCoinService
- **Express Endpoints:** No rate limiting middleware
- **Risk:** API abuse, DoS attacks
- **Recommendation:** Add express-rate-limit middleware

### Security Headers

**Status:** ✅ **IMPLEMENTED**

```typescript
import helmet from 'helmet';
app.use(helmet());  // Adds security headers
```

**Headers Set:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HTTPS only)

---

## Service Dependency Map

See [SERVICE_MAP.svg](./SERVICE_MAP.svg) for visual diagram.

**Key Dependencies:**

```
Core Infrastructure
├── Logger (no dependencies)
├── ConfigManager (no dependencies)
└── Database
      └── EncryptedDatabase
            └── DatabaseMigrations

Market Data
├── RealMarketDataService
│     ├── CoinGecko API (external)
│     ├── CryptoCompare API (external)
│     └── CoinMarketCap API (external)
├── BinanceService (external API)
├── KuCoinService (external API)
└── EmergencyDataFallbackService

AI/ML
├── BullBearAgent
│     ├── TensorFlow.js (optional)
│     ├── FeatureEngineering
│     └── TrainingEngine
├── BacktestEngine
└── SignalGeneratorService
      ├── Technical Analysis
      ├── SMC Analyzer
      ├── Elliott Wave
      ├── Harmonic Patterns
      └── BullBearAgent

Trading
├── OrderManagementService
│     └── UnifiedExchangeService
│           ├── BinanceService
│           └── KuCoinService
└── VirtualTradingService (no external deps)

Monitoring
├── HealthCheckService
├── MetricsCollector
├── PerformanceMonitor
└── AlertManager
```

---

## Scalability Considerations

### Current Limitations

1. **Single Instance:** No horizontal scaling support
2. **In-Memory State:** Service singletons don't share state across instances
3. **SQLite:** File-based database limits concurrent writes
4. **No Load Balancer:** Direct client connections to Express

### Scaling Path (Recommendations)

#### Short-Term (Current Architecture)
- **Vertical Scaling:** Increase CPU/memory on single instance
- **Redis Full Deployment:** Enable Redis for shared cache/sessions
- **Read Replicas:** SQLite WAL mode for concurrent reads

#### Long-Term (Refactoring Required)
- **Stateless Services:** Remove singleton pattern, use dependency injection
- **PostgreSQL Migration:** Replace SQLite for multi-instance writes
- **Message Queue:** Add RabbitMQ/Kafka for async job processing
- **Microservices:** Split into API gateway + service mesh
- **Kubernetes:** Container orchestration with auto-scaling

---

**Document Maintained By:** Cursor AI Agent  
**Next Review:** On major architecture changes  
**Confidence:** HIGH (based on comprehensive code analysis)
