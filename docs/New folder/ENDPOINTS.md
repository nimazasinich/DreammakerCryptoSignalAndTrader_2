# API Endpoint Documentation
## BOLT AI REST & WebSocket API Reference

**Document Version:** 1.0  
**Last Updated:** 2025-11-06  
**Base URL:** `http://localhost:3001`  
**WebSocket URL:** `ws://localhost:3001/ws`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Market Data Endpoints](#market-data-endpoints)
3. [AI/ML Endpoints](#aiml-endpoints)
4. [Signal Generation Endpoints](#signal-generation-endpoints)
5. [Trading Endpoints](#trading-endpoints)
6. [Portfolio Endpoints](#portfolio-endpoints)
7. [Blockchain Data Endpoints](#blockchain-data-endpoints)
8. [Analysis Endpoints](#analysis-endpoints)
9. [Sentiment & News Endpoints](#sentiment--news-endpoints)
10. [Health & System Endpoints](#health--system-endpoints)
11. [Settings Endpoints](#settings-endpoints)
12. [Futures Trading Endpoints](#futures-trading-endpoints)
13. [WebSocket Protocol](#websocket-protocol)

---

## Authentication

**Status:** ⚠️ **NOT IMPLEMENTED**

Currently, all endpoints are publicly accessible without authentication. This is suitable for single-user local development but **must be secured before public deployment**.

**Planned (TODO):**
- JWT bearer token authentication
- API key authentication for programmatic access
- Rate limiting per user/key

---

## Market Data Endpoints

### Get Multiple Real-Time Prices

**Endpoint:** `GET /api/market/prices`

**Description:** Fetches current prices for multiple symbols from real APIs (CoinGecko, CryptoCompare, CoinMarketCap with fallback).

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbols` | string | No | `BTC,ETH,SOL` | Comma-separated list of symbols |

**Request Example:**
```bash
GET /api/market/prices?symbols=BTC,ETH,SOL,ADA
```

**Response:**
```json
{
  "success": true,
  "data": {
    "BTC": {
      "symbol": "BTC",
      "price": 43250.50,
      "change24h": 1250.30,
      "changePercent24h": 2.98,
      "volume24h": 28500000000,
      "marketCap": 845000000000
    },
    "ETH": { /* ... */ }
  },
  "source": "real_api",
  "timestamp": 1699281234567
}
```

**Code Reference:** `src/server-real-data.ts:88-103`

---

### Get Aggregated Market Data

**Endpoint:** `GET /api/market-data/:symbol`

**Description:** Fetches comprehensive market data for a single symbol, including price, volume, and market stats.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | Cryptocurrency symbol (e.g., `BTC`, `BTCUSDT`) |

**Request Example:**
```bash
GET /api/market-data/BTC
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC",
    "currentPrice": 43250.50,
    "volume24h": 28500000000,
    "marketCap": 845000000000,
    "priceChange24h": 1250.30,
    "priceChangePercent24h": 2.98,
    "high24h": 43500.00,
    "low24h": 41800.00,
    "circulatingSupply": 19500000,
    "totalSupply": 21000000
  },
  "source": "real_api"
}
```

**Code Reference:** `src/server-real-data.ts:105-122`

---

### Get Historical Market Data

**Endpoint:** `GET /api/market/historical`

**Description:** Retrieves historical OHLCV (Open, High, Low, Close, Volume) candle data for charting.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | No | `BTCUSDT` | Trading pair symbol |
| `timeframe` | string | No | `1h` | Candle interval: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w` |
| `limit` | number | No | `500` | Number of candles to retrieve (max 1000) |

**Request Example:**
```bash
GET /api/market/historical?symbol=BTCUSDT&timeframe=1h&limit=100
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "time": 1699281234567,
      "open": 43100.00,
      "high": 43300.00,
      "low": 43050.00,
      "close": 43250.00,
      "volume": 1250.45
    }
    /* ...99 more candles */
  ],
  "source": "real_historical_api",
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "count": 100
}
```

**Code Reference:** `src/server-real-data.ts:125-174`

---

### Get OHLCV Data (Hugging Face Format)

**Endpoint:** `GET /api/hf/ohlcv`

**Description:** Historical OHLCV data formatted for machine learning pipelines (alternative endpoint).

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | No | `BTC` | Cryptocurrency symbol |
| `days` | number | No | `30` | Historical days to retrieve |

**Request Example:**
```bash
GET /api/hf/ohlcv?symbol=BTC&days=90
```

**Response:**
```json
{
  "success": true,
  "data": [ /* OHLCV array */ ],
  "source": "real_historical_api"
}
```

**Code Reference:** `src/server-real-data.ts:176-195`

---

## AI/ML Endpoints

### Get AI Prediction (Simple)

**Endpoint:** `GET /api/ai/predict`

**Description:** Get AI directional prediction (BUY/SELL/HOLD) for a symbol using trained neural network.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | No | `BTC` | Cryptocurrency symbol |
| `type` | string | No | `directional` | Prediction type: `directional` or `full` |

**Request Example:**
```bash
GET /api/ai/predict?symbol=BTC&type=directional
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC",
    "prediction": "BUY",
    "confidence": 0.78,
    "direction": "bullish",
    "probabilities": {
      "bull": 0.78,
      "bear": 0.12,
      "neutral": 0.10
    },
    "reasoning": [
      "Strong bullish momentum detected",
      "RSI oversold recovery in progress",
      "Volume spike indicates accumulation"
    ],
    "timestamp": 1699281234567
  },
  "source": "real_ai_model"
}
```

**Code Reference:** `src/server-real-data.ts:687-761`

---

### Post AI Prediction (Advanced)

**Endpoint:** `POST /api/ai/predict`

**Description:** Get AI prediction with custom market data input.

**Request Body:**
```json
{
  "symbol": "BTC",
  "marketData": [
    {
      "timestamp": 1699281234567,
      "open": 43100,
      "high": 43300,
      "low": 43050,
      "close": 43250,
      "volume": 1250.45
    }
    /* Optional: provide historical data */
  ]
}
```

**Response:** Same as GET `/api/ai/predict`

**Code Reference:** `src/server-real-data.ts:763-814`

---

### Train AI Model

**Endpoint:** `POST /api/ai/train`

**Description:** Initiate AI model training with real historical market data.

**Request Body:**
```json
{
  "symbols": ["BTC", "ETH", "SOL"],
  "historicalDays": 365,
  "epochs": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accuracy": 0.73,
    "loss": 0.24,
    "epochs": 100,
    "dataPoints": 262800,
    "timestamp": 1699281234567
  },
  "source": "real_ai_training"
}
```

**Code Reference:** `src/server-real-data.ts:816-848`

---

### Get Training Metrics

**Endpoint:** `GET /api/training-metrics`

**Description:** Retrieve historical AI model training metrics (loss, accuracy, gradient norms).

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | `100` | Number of metric records to return |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "epoch": 1,
      "timestamp": 1699281234567,
      "loss": { "mse": 0.05, "mae": 0.03, "rSquared": 0.85 },
      "accuracy": { "directional": 0.65, "classification": 0.70 },
      "gradientNorm": 0.12,
      "learningRate": 0.001,
      "stabilityMetrics": { "nanCount": 0, "infCount": 0, "resetCount": 0 },
      "explorationStats": { "epsilon": 0.1, "explorationRatio": 0.2, "exploitationRatio": 0.8 }
    }
    /* ...more epochs */
  ],
  "modelStats": { /* model statistics */ }
}
```

**Code Reference:** `src/server-real-data.ts:901-927`

---

## Signal Generation Endpoints

### Analyze Signal

**Endpoint:** `POST /api/signals/analyze`

**Description:** Analyze a specific symbol to generate trading signal with technical features and AI prediction.

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "bars": 100
}
```

**Response:**
```json
{
  "success": true,
  "symbol": "BTCUSDT",
  "features": {
    "rsi": 58.3,
    "macd": {
      "value": 125.5,
      "signal": 110.2,
      "histogram": 15.3
    }
  },
  "prediction": {
    "direction": "bullish",
    "confidence": 0.72
  }
}
```

**Code Reference:** `src/server-real-data.ts:476-531`

---

### Generate Signals

**Endpoint:** `POST /api/signals/generate`

**Description:** Generate trading signals for multiple symbols using configured signal generator.

**Request Body:**
```json
{
  "symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
  "sources": ["AI", "TECHNICAL", "PATTERN"]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "signal-abc123",
      "symbol": "BTCUSDT",
      "timestamp": 1699281234567,
      "action": "BUY",
      "confidence": 0.85,
      "reasoning": ["Strong bullish momentum", "RSI oversold recovery"],
      "timeframe": "1h",
      "source": "AI_SIGNAL"
    }
    /* ...more signals */
  ],
  "source": "real_ai_signals"
}
```

**Code Reference:** `src/server-real-data.ts:533-555`

---

### Get Signal History

**Endpoint:** `GET /api/signals/history`

**Description:** Retrieve historical trading signals with performance tracking.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | `100` | Number of signals to return |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "signal-1",
      "symbol": "BTCUSDT",
      "timestamp": 1699281234567,
      "action": "BUY",
      "confidence": 0.85,
      "reasoning": ["Strong bullish momentum", "RSI oversold recovery"],
      "timeframe": "1h",
      "source": "AI_SIGNAL"
    }
    /* ...more signals */
  ],
  "source": "real_signal_history"
}
```

**Code Reference:** `src/server-real-data.ts:557-628`

---

### Get Signal Statistics

**Endpoint:** `GET /api/signals/statistics`

**Description:** Get aggregate statistics for signal performance (win rate, average confidence, etc.).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSignals": 1250,
    "buySignals": 620,
    "sellSignals": 480,
    "holdSignals": 150,
    "averageConfidence": 0.74,
    "winRate": 0.68,
    "profitFactor": 1.85
  },
  "source": "real_signal_stats"
}
```

**Code Reference:** `src/server-real-data.ts:630-643`

---

### Get Current Signal

**Endpoint:** `GET /api/signals/current`

**Description:** Get the current live signal for a symbol with market data.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | No | `BTCUSDT` | Trading pair symbol |

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "price": 43250.50,
    "timestamp": "2025-11-06T12:34:56.789Z",
    "signal": {
      "type": "BUY",
      "confidence": 0.78,
      "reason": "Bullish momentum with RSI recovery"
    },
    "marketData": { /* full market data */ }
  },
  "source": "real_time"
}
```

**Code Reference:** `src/server-real-data.ts:646-680`

---

## Trading Endpoints

### Get Positions

**Endpoint:** `GET /api/positions`

**Description:** Retrieve current open trading positions.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | No | Filter by trading pair |

**Response:**
```json
{
  "success": true,
  "positions": [
    {
      "id": "pos-123",
      "symbol": "BTCUSDT",
      "side": "LONG",
      "size": 0.5,
      "entryPrice": 42000.00,
      "currentPrice": 43250.50,
      "unrealizedPnL": 625.25,
      "unrealizedPnLPercent": 2.98
    }
  ],
  "count": 1,
  "timestamp": 1699281234567
}
```

**Code Reference:** `src/server-real-data.ts:447-469`

---

## Portfolio Endpoints

### Get Portfolio Overview

**Endpoint:** `GET /api/portfolio`

**Description:** Get portfolio summary with total value and P&L.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `addresses` | JSON array string | No | Blockchain addresses to track |

**Request Example:**
```bash
GET /api/portfolio?addresses=["0x742d35Cc...","0xAbc123..."]
```

**Response:**
```json
{
  "success": true,
  "portfolio": {
    "totalValue": 125000.50,
    "totalChangePercent": 3.45,
    "dayPnL": 4200.30,
    "dayPnLPercent": 3.45,
    "activePositions": 8,
    "totalPositions": 12,
    "details": [ /* per-address balances */ ]
  },
  "source": "real_blockchain_api"
}
```

**Code Reference:** `src/server-real-data.ts:374-417`

---

### Get Portfolio Performance

**Endpoint:** `GET /api/portfolio/performance`

**Description:** Detailed performance metrics per blockchain address.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `addresses` | JSON array string | Yes | Array of blockchain addresses |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "address": "0x742d35Cc...",
      "totalValue": 85000.00,
      "chain": "ethereum",
      "balance": "2.5"
    }
  ],
  "source": "real_blockchain_api"
}
```

**Code Reference:** `src/server-real-data.ts:419-444`

---

## Blockchain Data Endpoints

### Get Blockchain Balance

**Endpoint:** `GET /api/blockchain/balances/:address`

**Description:** Query native token balance for a blockchain address (ETH, BNB, TRX).

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | Blockchain address (0x... format) |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `network` | string | No | `ethereum` | Blockchain network: `ethereum`, `bsc`, `tron` |

**Request Example:**
```bash
GET /api/blockchain/balances/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?network=ethereum
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chain": "ethereum",
    "balance": "2500000000000000000",
    "balanceFormatted": 2.5,
    "timestamp": 1699281234567
  },
  "source": "real_blockchain_api"
}
```

**Code Reference:** `src/server-real-data.ts:201-241`

---

### Get Transaction History

**Endpoint:** `GET /api/blockchain/transactions/:address`

**Description:** Retrieve transaction history for a blockchain address.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | Blockchain address |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `network` | string | No | `ethereum` | Blockchain network |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "hash": "0xabc123...",
      "from": "0x742d35Cc...",
      "to": "0xDef456...",
      "value": "1000000000000000000",
      "timestamp": 1699281234,
      "blockNumber": 18500000
    }
  ],
  "source": "real_blockchain_api"
}
```

**Code Reference:** `src/server-real-data.ts:243-263`

---

## Analysis Endpoints

### Smart Money Concepts (SMC) Analysis

**Endpoint:** `GET /api/analysis/smc`

**Description:** Detect Smart Money Concepts patterns (order blocks, FVG, BOS, liquidity zones).

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | No | `BTC` | Cryptocurrency symbol |
| `timeframe` | string | No | `1d` | Analysis timeframe |

**Response:**
```json
{
  "success": true,
  "data": {
    "orderBlocks": [
      {
        "type": "BULLISH",
        "high": 43500.00,
        "low": 43200.00,
        "strength": 0.85,
        "timestamp": 1699281234567
      }
    ],
    "fairValueGaps": [ /* FVG array */ ],
    "liquidityZones": [ /* liquidity zones */ ],
    "breakOfStructure": {
      "detected": true,
      "type": "BULLISH_BOS",
      "strength": 0.78
    }
  },
  "source": "real_pattern_detection",
  "dataPoints": 90
}
```

**Code Reference:** `src/server-real-data.ts:347-368`

---

### Elliott Wave Analysis

**Endpoint:** `POST /api/analysis/elliott`

**Description:** Perform Elliott Wave pattern detection and wave counting.

**Request Body:**
```json
{
  "symbol": "BTC"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentWave": "Wave 3",
    "waveCount": { "impulse": 3, "corrective": 2 },
    "completionProbability": 0.75,
    "nextDirection": "UP",
    "fibonacciLevels": [
      { "level": 0.236, "price": 45500.00 },
      { "level": 0.382, "price": 46200.00 },
      { "level": 0.618, "price": 47000.00 }
    ],
    "confidence": 0.72
  },
  "source": "real_elliott_wave_analysis"
}
```

**Code Reference:** `src/server-real-data.ts:933-962`

---

### Harmonic Pattern Detection

**Endpoint:** `POST /api/analysis/harmonic`

**Description:** Detect harmonic patterns (Gartley, Bat, Butterfly, Crab, ABCD).

**Request Body:**
```json
{
  "symbol": "BTC"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "type": "GARTLEY",
        "points": {
          "X": { "price": 40000, "timestamp": 1699000000000 },
          "A": { "price": 44000, "timestamp": 1699100000000 },
          "B": { "price": 42000, "timestamp": 1699200000000 },
          "C": { "price": 43500, "timestamp": 1699250000000 },
          "D": { "price": 41500, "timestamp": 1699281234567 }
        },
        "completionProbability": 0.82,
        "reliabilityScore": 0.75
      }
    ]
  },
  "source": "real_harmonic_pattern_detection",
  "dataPoints": 90
}
```

**Code Reference:** `src/server-real-data.ts:964-985`

---

## Sentiment & News Endpoints

### Fear & Greed Index

**Endpoint:** `GET /api/sentiment/fear-greed`

**Description:** Get current cryptocurrency market Fear & Greed Index.

**Response:**
```json
{
  "success": true,
  "data": {
    "value": 65,
    "classification": "GREED",
    "timestamp": 1699281234567
  },
  "source": "real_fear_greed_api"
}
```

**Code Reference:** `src/server-real-data.ts:269-282`

---

### Sentiment History

**Endpoint:** `GET /api/sentiment/history`

**Description:** Historical Fear & Greed Index values.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `days` | number | No | `30` | Historical days to retrieve |

**Response:**
```json
{
  "success": true,
  "data": [ /* array of sentiment values */ ],
  "source": "real_fear_greed_api"
}
```

**Code Reference:** `src/server-real-data.ts:284-299`

---

### Latest News

**Endpoint:** `GET /api/news/latest`

**Description:** Retrieve latest cryptocurrency news from aggregated sources.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | `20` | Number of news articles |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "title": "Bitcoin Breaks $44K Resistance",
      "source": "CryptoPanic",
      "url": "https://...",
      "published": 1699281234567,
      "sentiment": "positive"
    }
  ],
  "source": "real_news_api"
}
```

**Code Reference:** `src/server-real-data.ts:305-320`

---

### Whale Transactions

**Endpoint:** `GET /api/whale/transactions`

**Description:** Track large cryptocurrency transactions (whale activity).

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | No | `BTCUSDT` | Trading pair to monitor |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "amount": 500.0,
      "direction": "IN",
      "exchange": "Binance",
      "timestamp": 1699281234567,
      "walletCluster": "whale-001"
    }
  ],
  "source": "real_whale_api"
}
```

**Code Reference:** `src/server-real-data.ts:326-341`

---

## Health & System Endpoints

### Health Check

**Endpoint:** `GET /api/health`

**Description:** System health status and service availability.

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

**Code Reference:** `src/server-real-data.ts:991-1006`

---

## Settings Endpoints

### Get Settings

**Endpoint:** `GET /api/settings`

**Description:** Retrieve user settings and preferences.

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": "",
    "apiSecret": "",
    "emailNotifications": true,
    "riskAlerts": true,
    "theme": "dark",
    "tradingPreferences": {
      "defaultLeverage": 1,
      "maxPositionSize": 1000,
      "stopLossPercent": 2,
      "takeProfitPercent": 5
    },
    "notifications": {
      "email": true,
      "push": false,
      "sms": false,
      "telegram": false
    }
  },
  "timestamp": 1699281234567
}
```

**Code Reference:** `src/server-real-data.ts:1033-1044`

---

### Update Settings (POST)

**Endpoint:** `POST /api/settings`

**Description:** Update user settings (merges with existing).

**Request Body:** Same structure as GET response `data` object.

**Response:** Updated settings object.

**Code Reference:** `src/server-real-data.ts:1046-1066`

---

### Update Settings (PUT)

**Endpoint:** `PUT /api/settings`

**Description:** Update user settings (same as POST, REST convention).

**Request Body:** Same as POST.

**Response:** Updated settings object.

**Code Reference:** `src/server-real-data.ts:1068-1085`

---

## Backtesting Endpoints

### Run Backtest

**Endpoint:** `POST /api/ai/backtest`

**Description:** Execute strategy backtest using historical real market data.

**Request Body:**
```json
{
  "strategy": "bull_bear_ai",
  "symbol": "BTC",
  "period": "3m"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTrades": 125,
    "winningTrades": 85,
    "losingTrades": 40,
    "winRate": 0.68,
    "profitFactor": 1.85,
    "maxDrawdown": 0.12,
    "sharpeRatio": 2.3,
    "totalReturn": 0.45
  },
  "source": "real_backtest_engine"
}
```

**Code Reference:** `src/server-real-data.ts:871-895`

---

### Simple Backtest (Legacy)

**Endpoint:** `GET /api/backtest`

**Description:** Simplified backtest endpoint (placeholder, needs implementation).

**Status:** ⚠️ TODO (returns stub response)

**Code Reference:** `src/server-real-data.ts:854-869`

---

---

## Futures Trading Endpoints

**Status:** ✅ **AVAILABLE** (requires `FEATURE_FUTURES=true`)

**Feature Flag:** Set `FEATURE_FUTURES=true` in `.env` to enable futures trading endpoints.

**Requirements:**
- KuCoin Futures API credentials (`KUCOIN_FUTURES_KEY`, `KUCOIN_FUTURES_SECRET`, `KUCOIN_FUTURES_PASSPHRASE`)
- Exchange enabled (`EXCHANGE_KUCOIN=true`)

### Get Positions

**Endpoint:** `GET /api/futures/positions`

**Description:** Get all open futures positions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDTM",
      "side": "long",
      "size": 1.5,
      "entryPrice": 43250.00,
      "markPrice": 43500.00,
      "leverage": 10,
      "unrealizedPnl": 375.00,
      "liquidationPrice": 40000.00,
      "marginMode": "isolated"
    }
  ],
  "timestamp": 1699281234567
}
```

### Close Position

**Endpoint:** `DELETE /api/futures/positions/:symbol`

**Description:** Close an open position by placing a market order in the opposite direction.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | Trading pair symbol (e.g., "BTCUSDTM") |

**Request Example:**
```bash
DELETE /api/futures/positions/BTCUSDTM
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "647d1b9d8f0c8c0001f8d9a1",
    "symbol": "BTCUSDTM",
    "side": "sell",
    "type": "market",
    "size": 1.5,
    "status": "pending",
    "reduceOnly": true
  },
  "timestamp": 1699281234567
}
```

**Error Responses:**
- `400` - Invalid symbol format
- `404` - Position not found for symbol
- `500` - Server error during order placement

### Place Order

**Endpoint:** `POST /api/futures/orders`

**Description:** Place a futures order.

**Request Body:**
```json
{
  "symbol": "BTCUSDTM",
  "side": "buy",
  "type": "market",
  "qty": 1,
  "leverage": 10,
  "stopLoss": 42000,
  "takeProfit": 45000,
  "reduceOnly": false
}
```

**Required Fields:**
- `symbol` - Trading pair (e.g., "BTCUSDTM")
- `side` - "buy" or "sell"
- `type` - "market" or "limit"
- `qty` - Order quantity

**Optional Fields:**
- `price` - Required for limit orders
- `leverage` - Leverage multiplier (1-100)
- `stopLoss` - Stop loss price
- `takeProfit` - Take profit price
- `reduceOnly` - Boolean, reduce position only

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "647d1b9d8f0c8c0001f8d9a1",
    "symbol": "BTCUSDTM",
    "side": "buy",
    "type": "market",
    "size": 1,
    "status": "pending"
  },
  "timestamp": 1699281234567
}
```

### Cancel Order

**Endpoint:** `DELETE /api/futures/orders/:id`

**Description:** Cancel a futures order by ID.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Order ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "cancelledOrderIds": ["647d1b9d8f0c8c0001f8d9a1"]
  },
  "timestamp": 1699281234567
}
```

### Cancel All Orders

**Endpoint:** `DELETE /api/futures/orders`

**Description:** Cancel all open orders, optionally filtered by symbol.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | No | Filter by symbol (e.g., "BTCUSDTM") |

**Request Example:**
```bash
DELETE /api/futures/orders?symbol=BTCUSDTM
```

### Get Open Orders

**Endpoint:** `GET /api/futures/orders`

**Description:** Get all open futures orders.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | No | Filter by symbol |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "647d1b9d8f0c8c0001f8d9a1",
      "symbol": "BTCUSDTM",
      "side": "buy",
      "type": "limit",
      "qty": 1,
      "price": 43000,
      "status": "active"
    }
  ],
  "timestamp": 1699281234567
}
```

### Set Leverage

**Endpoint:** `PUT /api/futures/leverage`

**Description:** Set leverage for a symbol.

**Request Body:**
```json
{
  "symbol": "BTCUSDTM",
  "leverage": 10,
  "marginMode": "isolated"
}
```

**Required Fields:**
- `symbol` - Trading pair
- `leverage` - Leverage multiplier (1-100)

**Optional Fields:**
- `marginMode` - "isolated" or "cross" (default: "isolated")

### Get Account Balance

**Endpoint:** `GET /api/futures/account/balance`

**Description:** Get futures account balance and equity.

**Response:**
```json
{
  "success": true,
  "data": {
    "availableBalance": 10000.00,
    "accountEquity": 10500.00,
    "unrealisedPNL": 500.00,
    "marginBalance": 10500.00,
    "positionMargin": 1000.00,
    "orderMargin": 0.00
  },
  "timestamp": 1699281234567
}
```

### Get Orderbook

**Endpoint:** `GET /api/futures/orderbook/:symbol`

**Description:** Get orderbook for a symbol.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | Trading pair |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `depth` | number | No | 20 | Orderbook depth |

**Response:**
```json
{
  "success": true,
  "data": {
    "bids": [["43500", "1.5"], ["43499", "2.0"]],
    "asks": [["43501", "1.2"], ["43502", "1.8"]],
    "timestamp": 1699281234567
  },
  "timestamp": 1699281234567
}
```

### Get Funding Rate

**Endpoint:** `GET /api/futures/funding/:symbol`

**Description:** Get current funding rate for a symbol.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | Trading pair |

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDTM",
    "fundingRate": 0.0001,
    "fundingTime": 1699281234567,
    "markPrice": 43500.00,
    "indexPrice": 43495.00
  },
  "timestamp": 1699281234567
}
```

### Get Funding Rate History

**Endpoint:** `GET /api/futures/funding/:symbol/history`

**Description:** Get historical funding rates for a symbol.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | Trading pair |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startTime` | number | No | - | Start timestamp (milliseconds) |
| `endTime` | number | No | - | End timestamp (milliseconds) |
| `limit` | number | No | 100 | Number of records |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDTM",
      "fundingRate": 0.0001,
      "fundingTime": 1699281234567,
      "markPrice": 43500.00,
      "indexPrice": 43495.00
    }
  ],
  "timestamp": 1699281234567
}
```

### Error Responses

When `FEATURE_FUTURES=false`, all futures endpoints return:
```json
{
  "error": "Futures trading is disabled",
  "message": "Set FEATURE_FUTURES=true to enable futures trading"
}
```
Status: `404`

---

**WebSocket URL:** `ws://localhost:3001/ws`

**Futures WebSocket URL:** `ws://localhost:3001/ws/futures` (requires `FEATURE_FUTURES=true`)

---

## WebSocket Protocol

### Main WebSocket Channel (`/ws`)

Connects to general WebSocket server for market data, signals, and system updates.

### Connection

**URL:** `ws://localhost:3001/ws`

**Connection Example:**
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  console.log('Connected to BOLT AI WebSocket');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

---

### Server → Client Messages

#### Connection Acknowledged

```json
{
  "type": "connected",
  "message": "BOLT AI - 100% Real Data Stream Active"
}
```

#### Price Update

**Frequency:** Every 10 seconds

```json
{
  "type": "price_update",
  "data": {
    "BTC": {
      "symbol": "BTC",
      "price": 43250.50,
      "change24h": 1250.30,
      "changePercent24h": 2.98
    },
    "ETH": { /* ... */ }
  },
  "timestamp": 1699281234567
}
```

#### Sentiment Update

**Frequency:** Every 60 seconds

```json
{
  "type": "sentiment_update",
  "data": {
    "value": 65,
    "classification": "GREED",
    "timestamp": 1699281234567
  },
  "timestamp": 1699281234567
}
```

#### Signal Update

**Frequency:** Every 3 seconds (when subscribed to a symbol)

```json
{
  "type": "signal_update",
  "data": {
    "timestamp": "2025-11-06T12:34:56.789Z",
    "symbol": "BTCUSDT",
    "price": 43250.50,
    "stages": {
      "stage1": { "status": "completed", "progress": 100 },
      "stage2": { "status": "completed", "progress": 100 },
      /* ...all 8 stages */
      "stage8": { 
        "status": "completed", 
        "progress": 100, 
        "signal": "BUY", 
        "confidence": 0.78 
      }
    },
    "decision": {
      "signal": "LONG",
      "confidence": 0.78,
      "reason": "Strong bullish momentum with RSI recovery"
    }
  },
  "timestamp": 1699281234567
}
```

---

### Client → Server Messages

#### Ping (Heartbeat)

```json
{
  "type": "ping",
  "timestamp": 1699281234567
}
```

**Server Response:**
```json
{
  "type": "pong",
  "timestamp": 1699281234567
}
```

#### Subscribe to Streams

```json
{
  "type": "subscribe",
  "streams": ["price_update", "sentiment_update"]
}
```

#### Subscribe to Symbol Signals

```json
{
  "type": "subscribe",
  "symbol": "BTCUSDT"
}
```

**Effect:** Server starts sending `signal_update` messages every 3 seconds for the subscribed symbol.

---

### Futures WebSocket Channel (`/ws/futures`)

**Status:** ✅ **AVAILABLE** (requires `FEATURE_FUTURES=true`)

Connect to `ws://localhost:3001/ws/futures` for real-time futures trading updates.

#### Connection

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/futures');

ws.onopen = () => {
  console.log('Connected to futures channel');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

#### Message Types

**Position Update:**
```json
{
  "type": "position_update",
  "data": [
    {
      "symbol": "BTCUSDTM",
      "side": "long",
      "size": 1.5,
      "entryPrice": 43250.00,
      "markPrice": 43500.00,
      "leverage": 10,
      "unrealizedPnl": 375.00,
      "liquidationPrice": 40000.00,
      "marginMode": "isolated"
    }
  ],
  "timestamp": 1699281234567
}
```

**Order Update:**
```json
{
  "type": "order_update",
  "data": [
    {
      "id": "647d1b9d8f0c8c0001f8d9a1",
      "symbol": "BTCUSDTM",
      "side": "buy",
      "type": "limit",
      "qty": 1,
      "price": 43000,
      "status": "active"
    }
  ],
  "timestamp": 1699281234567
}
```

**Funding Rate Tick:**
```json
{
  "type": "funding_tick",
  "data": {
    "symbol": "BTCUSDTM",
    "rate": 0.0001,
    "timestamp": 1699281234567
  },
  "timestamp": 1699281234567
}
```

**Error:**
```json
{
  "type": "error",
  "message": "Error description"
}
```

#### Client Messages

**Subscribe to Positions:**
```json
{
  "type": "subscribe_positions"
}
```

**Subscribe to Orders:**
```json
{
  "type": "subscribe_orders"
}
```

**Get Positions:**
```json
{
  "type": "get_positions"
}
```

**Get Orders:**
```json
{
  "type": "get_orders"
}
```

**Note:** Positions and orders are automatically updated every 5 seconds when connected.

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": 1699281234567
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (unexpected error)

---

## Rate Limiting

**Status:** ⚠️ NOT IMPLEMENTED (no Express-level rate limiting)

**External API Rate Limits:**
- **CoinGecko:** 50 requests/minute (free tier)
- **CryptoCompare:** 100,000 requests/month (free tier)
- **CoinMarketCap:** 333 requests/day (basic plan)
- **Binance:** 1200 requests/minute
- **KuCoin:** 1800 requests/minute

**Recommendation:** Implement express-rate-limit middleware before public deployment.

---

## Postman Collection

**TODO:** Export Postman collection for easy API testing.

**Manual Testing:**
```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test market prices
curl "http://localhost:3001/api/market/prices?symbols=BTC,ETH"

# Test AI prediction
curl "http://localhost:3001/api/ai/predict?symbol=BTC"

# Test WebSocket
npm install -g wscat
wscat -c ws://localhost:3001/ws
```

---

**Document Maintained By:** Cursor AI Agent  
**API Version:** 1.0 (stable)  
**Breaking Changes:** None since v1.0  
**Confidence:** HIGH
