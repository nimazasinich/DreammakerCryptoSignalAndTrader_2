# HuggingFace Data Engine - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Dashboard   │  │  API Routes  │  │  Data Context/Providers  │  │
│  │  Components  │  │  (Express)   │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
└─────────┼──────────────────┼──────────────────────┼─────────────────┘
          │                  │                      │
          └──────────────────┴──────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                   PRIMARY DATA SOURCE SERVICE                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  PrimaryDataSourceService.ts                               │    │
│  │  • getMarketPrices(symbols, limit?)                        │    │
│  │  • getPrice(symbol)                                        │    │
│  │  • getMarketOverview()                                     │    │
│  │  • getSentiment(text)                                      │    │
│  │  • getHealthStatus()                                       │    │
│  └────────────────────────────────────────────────────────────┘    │
│                             │                                        │
│              ┌──────────────┴──────────────┐                        │
│              │                              │                        │
└──────────────┼──────────────────────────────┼────────────────────────┘
               │ PRIORITY 1                   │ FALLBACK
               │                              │
┌──────────────▼───────────────┐   ┌─────────▼───────────────────────┐
│  HF DATA ENGINE ADAPTER      │   │  MULTI-PROVIDER SERVICE         │
│  ┌─────────────────────────┐ │   │  ┌───────────────────────────┐ │
│  │ HFDataEngineAdapter.ts  │ │   │  │ MultiProviderMarketData   │ │
│  │ • getMarketPrices()     │ │   │  │ Service.ts                │ │
│  │ • getMarketOverview()   │ │   │  │ • Kraken                  │ │
│  │ • getSentiment()        │ │   │  │ • CoinGecko               │ │
│  │ • getHealthSummary()    │ │   │  │ • Binance                 │ │
│  │ • getProviders()        │ │   │  │ • CoinCap                 │ │
│  │ • getRecentLogs()       │ │   │  │ • CoinPaprika             │ │
│  │                         │ │   │  └───────────────────────────┘ │
│  │ [Data Normalization]    │ │   │                                 │
│  └────────┬────────────────┘ │   └─────────────────────────────────┘
│           │                  │                                       
└───────────┼──────────────────┘   ┌─────────────────────────────────┐
            │                      │  ENHANCED SERVICE (Fallback 2)  │
┌───────────▼──────────────────┐   │  ┌───────────────────────────┐ │
│  HF DATA ENGINE CLIENT       │   │  │ EnhancedMarketDataService │ │
│  ┌─────────────────────────┐ │   │  │ • CoinGecko               │ │
│  │ HFDataEngineClient.ts   │ │   │  │ • CoinDesk                │ │
│  │                         │ │   │  │ • Alternative.me          │ │
│  │ HTTP Request Methods:   │ │   │  └───────────────────────────┘ │
│  │ • getHealth()           │ │   └─────────────────────────────────┘
│  │ • getTopPrices()        │ │
│  │ • getMarketOverview()   │ │
│  │ • runHfSentiment()      │ │
│  │ • getProviders()        │ │
│  │ • getLogs()             │ │
│  │                         │ │
│  │ [Error Handling]        │ │
│  │ [Timeout Management]    │ │
│  │ [Logging]               │ │
│  └────────┬────────────────┘ │
└───────────┼──────────────────┘
            │
            │ HTTPS
            │
┌───────────▼──────────────────────────────────────────────────────────┐
│                   HUGGINGFACE DATA ENGINE                             │
│  https://really-amin-datasourceforcryptocurrency.hf.space            │
│                                                                       │
│  Endpoints:                                                           │
│  • GET  /api/hf-engine/health                                        │
│  • GET  /api/hf-engine/prices?limit={n}                              │
│  • GET  /api/hf-engine/market/overview                               │
│  • POST /api/hf-engine/hf/sentiment                                  │
│  • GET  /api/hf-engine/providers                                     │
│  • GET  /api/hf-engine/logs?limit={n}                                │
│                                                                       │
│  [Aggregates multiple crypto data sources]                           │
│  [AI-powered sentiment analysis]                                     │
│  [Market overview and analytics]                                     │
└───────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

### Successful Request (HF Engine Available)

```
User Request
    │
    ▼
Application Layer (Dashboard/API)
    │
    ▼
PrimaryDataSourceService
    │
    ├─► Check: primarySource === 'huggingface' ? ✓
    │
    ▼
HFDataEngineAdapter
    │
    ├─► Normalize request parameters
    │
    ▼
HFDataEngineClient
    │
    ├─► HTTP GET/POST to HF Engine
    │
    ▼
HuggingFace Data Engine
    │
    ├─► Process request
    ├─► Return data
    │
    ▼
HFDataEngineClient
    │
    ├─► Parse response
    │
    ▼
HFDataEngineAdapter
    │
    ├─► Normalize response
    ├─► Return { ok: true, data: [...], source: 'hf_engine' }
    │
    ▼
PrimaryDataSourceService
    │
    ├─► Return normalized data
    │
    ▼
Application Layer
    │
    ▼
User sees data ✓
```

### Fallback Request (HF Engine Fails)

```
User Request
    │
    ▼
Application Layer
    │
    ▼
PrimaryDataSourceService
    │
    ├─► Try HF Engine
    │   └─► FAIL ✗ (503, timeout, etc.)
    │
    ├─► Log warning: "HF Engine failed, falling back..."
    │
    ├─► Try Multi-Provider Service
    │   └─► SUCCESS ✓ (CoinGecko)
    │
    ├─► Normalize data
    │
    ▼
Application Layer
    │
    ▼
User sees data ✓ (from fallback)
```

### Complete Failure (All Sources Fail)

```
User Request
    │
    ▼
PrimaryDataSourceService
    │
    ├─► Try HF Engine ✗
    ├─► Try Multi-Provider ✗
    ├─► Try Enhanced Service ✗
    │
    ├─► Log error: "All data sources failed"
    │
    ├─► Return empty array / fallback data
    │
    ▼
Application Layer
    │
    ├─► Display "No data available" message
    │
    ▼
User sees error message (graceful degradation)
```

## Component Responsibilities

### 1. HFDataEngineClient
**Role:** Low-level HTTP communication
- Makes HTTP requests to HF Engine
- Handles network errors and timeouts
- Provides detailed error logging
- Manages request/response lifecycle

### 2. HFDataEngineAdapter
**Role:** Data normalization and abstraction
- Converts HF Engine responses to app formats
- Handles missing/null fields
- Provides consistent interfaces
- Error wrapping and translation

### 3. PrimaryDataSourceService
**Role:** Priority management and orchestration
- Enforces HF Engine as primary source
- Implements fallback chain
- Manages data source priority
- Provides unified interface to app

### 4. Multi-Provider Service
**Role:** Secondary data source
- Aggregates multiple free APIs
- Provides fallback when HF Engine fails
- Handles rate limiting per provider
- Independent of HF Engine

### 5. Enhanced Service
**Role:** Tertiary fallback
- Last resort before cached data
- Limited provider set
- Basic functionality only

## Error Handling Flow

```
Request Error
    │
    ▼
Axios Error Caught
    │
    ├─► Is 503? → Log WARNING → Trigger fallback
    │
    ├─► Is timeout? → Log WARNING → Trigger fallback
    │
    ├─► Is ECONNREFUSED? → Log ERROR → Trigger fallback
    │
    ├─► Is 4xx? → Log WARNING → Return error
    │
    └─► Is 5xx? → Log ERROR → Trigger fallback
        │
        ▼
    Fallback Chain
        │
        ├─► Multi-Provider Service
        ├─► Enhanced Service
        └─► Cached Data / Empty Response
```

## Configuration Flow

```
Environment Variables (env file)
    │
    ├─► PRIMARY_DATA_SOURCE=huggingface
    ├─► HF_ENGINE_ENABLED=true
    ├─► HF_ENGINE_BASE_URL=https://...
    └─► HF_ENGINE_TIMEOUT_MS=15000
        │
        ▼
Config Module (dataSource.ts)
    │
    ├─► getPrimaryDataSource() → 'huggingface'
    ├─► isHuggingFaceEnabled() → true
    ├─► getHuggingFaceBaseUrl() → 'https://...'
    └─► getHuggingFaceTimeout() → 15000
        │
        ▼
Services (Runtime)
    │
    ├─► HFDataEngineClient uses URL & timeout
    ├─► PrimaryDataSourceService checks enabled
    └─► Adapters respect priority setting
```

## Key Design Decisions

### 1. Three-Layer Architecture
- **Client Layer:** Raw HTTP communication
- **Adapter Layer:** Data normalization
- **Service Layer:** Business logic and fallback

**Why:** Separation of concerns, easier testing, maintainable

### 2. Automatic Fallback
- No manual intervention required
- Transparent to application code
- Logged for diagnostics

**Why:** Resilience, high availability, better UX

### 3. Data Normalization
- Consistent formats across all sources
- Handle missing fields gracefully
- Add metadata (source, timestamp)

**Why:** Predictable data structures, easier to consume

### 4. Priority-Based Routing
- HF Engine always tried first
- Fallbacks in defined order
- Configuration-driven

**Why:** Flexibility, controllable behavior, easy to change

## Performance Characteristics

### Latency Profile
```
HF Engine Request:     200-1000ms (depending on network)
Fallback Trigger:      +0ms (immediate)
Multi-Provider:        300-800ms
Enhanced Service:      400-1200ms

Total worst case:      ~3000ms (all sources tried)
```

### Caching Strategy
```
Market Prices:   TTL 10s (hot data)
Market Overview: TTL 30s (warm data)
Health Check:    TTL 30s (warm data)
Logs:            TTL 60s (cold data)
```

### Error Recovery Time
```
503 Error:       0ms (immediate fallback)
Timeout:         15s (then fallback)
Connection:      2-5s (then fallback)
```

## Security Considerations

### 1. HTTPS Only
All communication with HF Engine uses HTTPS

### 2. No API Key Required
HF Engine endpoints are public (by design)

### 3. Rate Limiting
Respects rate limits via configuration

### 4. Input Validation
All user inputs validated before sending to HF Engine

### 5. Error Information
Errors logged securely, no sensitive data exposed

---

**Architecture Version:** 1.0.0  
**Last Updated:** November 23, 2025  
**Status:** 🟢 Production Ready

