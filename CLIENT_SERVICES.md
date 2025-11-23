Use SVG icon in a state emoji icon# Client Services Architecture

## Overview
This application serves clients through multiple communication channels: **HTTP REST API**, **WebSocket real-time connections**, and **Static file serving** for the web dashboard.

---

## 1. HTTP REST API (Primary Service Layer)

### Server Framework
- **FastAPI** (Python web framework)
- **Uvicorn** ASGI server
- **Port**: 7860 (default, configurable via `PORT` env var)
- **Host**: `0.0.0.0` (accepts connections from any IP)

### API Endpoints (63+ endpoints)

#### **Health & Status**
```
GET  /health                    - Basic health check
GET  /api/health                - API health status
GET  /api/status                - System status with metrics
GET  /api/stats                 - System statistics
```

#### **Market Data**
```
GET  /api/market                - Top cryptocurrencies (BTC, ETH, BNB)
GET  /api/market/history        - Price history from database
GET  /api/trending              - Trending coins from CoinGecko
GET  /api/sentiment             - Fear & Greed Index
```

#### **Sentiment Analysis**
```
GET  /api/sentiment             - Get market sentiment
POST /api/sentiment             - Analyze sentiment (simple)
POST /api/sentiment/analyze     - Advanced sentiment analysis with AI models
GET  /api/sentiment/history     - Sentiment analysis history
```

#### **AI Models & ML**
```
GET  /api/models/status         - AI models status and registry
GET  /api/models/list           - List all available HuggingFace models
POST /api/models/initialize     - Force reload AI models
GET  /api/models/{key}/info     - Get specific model information
POST /api/models/{key}/predict  - Use specific model for prediction
POST /api/models/batch/predict  - Batch predictions with multiple models
```

#### **News & Content**
```
GET  /api/news                  - Get news articles
POST /api/news/analyze          - Analyze news sentiment
POST /api/news/fetch            - Fetch news from external API
GET  /api/news/latest           - Latest analyzed news
POST /api/news/summarize        - Summarize news articles
```

#### **Trading & Analysis**
```
POST /api/trading/decision      - Get AI trading signals (BUY/SELL/HOLD)
POST /api/analyze/text          - Text analysis/generation
POST /api/ai/summarize          - Text summarization
```

#### **Resources & Providers**
```
GET  /api/resources             - Get all API resources
GET  /api/resources/summary     - Resources summary
GET  /api/resources/apis        - API registry
GET  /api/providers             - List all data providers
GET  /api/providers/{id}        - Get provider details
GET  /api/providers/category/{cat} - Providers by category
```

#### **Diagnostics & Monitoring**
```
GET  /api/diagnostics/health    - Comprehensive health status
POST /api/diagnostics/run       - Run system diagnostics
POST /api/diagnostics/run-test  - Run diagnostic test script
POST /api/diagnostics/self-heal - Trigger self-healing for models
GET  /api/logs/recent           - Recent system logs
GET  /api/logs/errors           - Error logs
```

#### **Web UI Pages**
```
GET  /                          - Main dashboard (index.html)
GET  /index.html                - Dashboard page
GET  /ai-tools                  - AI Design Tools page
GET  /test.html                 - Test page
GET  /debug-info                - Debug information
```

#### **Static Files**
```
GET  /static/{path}             - CSS, JavaScript, images
GET  /trading_pairs.txt         - Trading pairs list
```

#### **API Documentation**
```
GET  /docs                      - Interactive API documentation (Swagger UI)
GET  /redoc                     - Alternative API documentation (ReDoc)
```

---

## 2. WebSocket Real-Time Services

### WebSocket Endpoints

#### **Main WebSocket Connection**
```
WS   /ws                        - Main WebSocket endpoint for real-time updates
WS   /ws/live                   - Live data streaming
WS   /ws/market                 - Market data streaming
```

### WebSocket Features

#### **Connection Management**
- **ConnectionManager** class manages all WebSocket connections
- Each client gets a unique `client_id`
- Automatic reconnection handling
- Heartbeat/ping-pong for connection health

#### **Real-Time Data Broadcasting**
- **Market Data**: Price updates, volume changes
- **Sentiment Updates**: Real-time sentiment analysis results
- **News Alerts**: New news articles as they're analyzed
- **System Status**: Health metrics, provider status
- **Trading Signals**: AI-generated trading decisions

#### **Client Subscription Model**
```javascript
// Client can subscribe to specific services
{
  "type": "subscribe",
  "services": ["market_data", "sentiment", "news"]
}

// Server broadcasts only subscribed data
{
  "type": "market_update",
  "data": { "BTC": { "price": 50000, "change": 2.5 } }
}
```

#### **Message Types**
- `connection_established` - Connection confirmed
- `market_update` - Price/volume updates
- `sentiment_update` - Sentiment analysis results
- `news_alert` - New news articles
- `trading_signal` - AI trading decisions
- `system_status` - Health metrics
- `error` - Error notifications

---

## 3. Static File Serving

### Static Assets
```
/static/css/main.css            - Main stylesheet
/static/css/toast.css           - Toast notifications
/static/js/app.js               - Main application logic
/static/js/toast.js             - Toast notification system
/static/js/wsClient.js          - WebSocket client library
/static/js/trading-pairs-loader.js - Trading pairs loader
```

### Static File Features
- **Automatic serving** via FastAPI StaticFiles
- **CORS enabled** for cross-origin requests
- **Content-Type headers** properly set
- **Caching support** (via version query params: `?v=6`)

---

## 4. Client Interaction Patterns

### Pattern 1: Traditional HTTP Request/Response

```javascript
// Client makes HTTP request
fetch('/api/market')
  .then(res => res.json())
  .then(data => {
    // Update UI with market data
    displayMarketData(data);
  });
```

### Pattern 2: WebSocket Real-Time Updates

```javascript
// Client connects to WebSocket
const ws = new WebSocket('ws://localhost:7860/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'market_update':
      updatePriceDisplay(data.data);
      break;
    case 'sentiment_update':
      updateSentimentGauge(data.data);
      break;
  }
};

// Subscribe to specific services
ws.send(JSON.stringify({
  type: 'subscribe',
  services: ['market_data', 'sentiment']
}));
```

### Pattern 3: Polling (Fallback)

```javascript
// Poll API every 30 seconds
setInterval(() => {
  fetch('/api/market')
    .then(res => res.json())
    .then(updateMarketData);
}, 30000);
```

---

## 5. CORS & Security

### CORS Configuration
```python
CORS Middleware:
  - allow_origins: ["*"]  # All origins allowed
  - allow_credentials: True
  - allow_methods: ["*"]  # All HTTP methods
  - allow_headers: ["*"]  # All headers
```

### Security Features
- **Content-Type validation** for HTML responses
- **X-Content-Type-Options: nosniff** header
- **Rate limiting** (via monitoring/rate_limiter.py)
- **Input validation** via Pydantic models
- **SQL injection protection** via parameterized queries

---

## 6. Data Flow Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       ├─── HTTP GET/POST ────┐
       │                       │
       └─── WebSocket ─────────┤
                               │
                    ┌──────────▼──────────┐
                    │   FastAPI Server    │
                    │  (api_server_ext)   │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐   ┌─────────▼─────────┐  ┌────────▼────────┐
│  AI Models     │   │  External APIs    │  │   Database      │
│  (HuggingFace) │   │  (CoinGecko, etc) │  │   (SQLite)      │
└────────────────┘   └───────────────────┘  └─────────────────┘
```

---

## 7. Service Initialization

### Startup Sequence
1. **Database initialization** - Create tables if needed
2. **Load providers** - Load from `providers_config_extended.json`
3. **Initialize AI models** - Load HuggingFace models
4. **Start WebSocket manager** - Initialize connection manager
5. **Mount static files** - Serve CSS/JS assets
6. **Register routes** - All API endpoints
7. **Start server** - Uvicorn on port 7860

### Lifespan Management
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_database()
    load_providers()
    initialize_models()
    
    yield  # Server runs here
    
    # Shutdown
    cleanup()
```

---

## 8. Client Types Supported

### 1. Web Browser (Primary)
- **HTML Dashboard** (`index.html`)
- **JavaScript SPA** (Single Page Application)
- **Real-time updates** via WebSocket
- **Responsive design** (mobile-friendly)

### 2. API Clients
- **REST API consumers** (Python, Node.js, etc.)
- **Mobile apps** (iOS/Android)
- **Third-party integrations**
- **Automated trading bots**

### 3. WebSocket Clients
- **Real-time dashboards**
- **Trading applications**
- **Monitoring tools**
- **Alert systems**

---

## 9. Error Handling

### HTTP Error Responses
```json
{
  "status": "error",
  "error": "Error message",
  "timestamp": "2025-01-27T12:00:00"
}
```

### WebSocket Error Messages
```json
{
  "type": "error",
  "code": "MODEL_UNAVAILABLE",
  "message": "AI model not loaded",
  "timestamp": "2025-01-27T12:00:00"
}
```

### Graceful Degradation
- **Fallback to database** if external APIs fail
- **Lexical sentiment** if AI models unavailable
- **Cached data** if real-time unavailable
- **Error messages** instead of crashes

---

## 10. Performance & Scalability

### Caching
- **Database caching** for market data
- **In-memory caching** for provider health
- **Model result caching** for AI predictions

### Rate Limiting
- **Per-client rate limits** via `rate_limiter.py`
- **Provider-level rate limits** for external APIs
- **WebSocket message throttling**

### Async Operations
- **Async/await** for all I/O operations
- **Non-blocking** WebSocket handling
- **Concurrent request processing**

---

## 11. Monitoring & Diagnostics

### Health Checks
- `/api/health` - Basic health
- `/api/diagnostics/health` - Comprehensive health
- `/api/status` - System status

### Logging
- **Structured logging** via `utils/logger.py`
- **Log levels**: DEBUG, INFO, WARNING, ERROR
- **Log rotation** and file management

### Metrics
- **Provider health** tracking
- **Model availability** status
- **Response times** monitoring
- **Error rates** tracking

---

## Summary

The application serves clients through:

1. **63+ REST API endpoints** for data access
2. **WebSocket connections** for real-time updates
3. **Static file serving** for web dashboard
4. **Interactive API docs** at `/docs`
5. **Multiple client types** supported (browser, API, WebSocket)
6. **Robust error handling** and graceful degradation
7. **Comprehensive monitoring** and diagnostics

**Primary Entry Point**: `http://localhost:7860/` (or configured port)

**API Documentation**: `http://localhost:7860/docs`

**WebSocket Endpoint**: `ws://localhost:7860/ws`

