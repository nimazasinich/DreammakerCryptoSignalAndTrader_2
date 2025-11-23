# Optional Data Providers

This document describes the **optional** alternative data providers that have been added to the project. These are **SAFE, NON-BREAKING additions** that do not replace or interfere with existing functionality.

## Overview

All optional providers are located in `src/services/optional/` and exposed via API routes under `/api/optional/`.

## Keyless Providers (Public APIs)

These providers work **without requiring API keys** and are accessible via `/api/optional/public/`:

### 1. Binance Public Service
- **Endpoints:**
  - `GET /api/optional/public/binance/price?symbol=BTCUSDT`
  - `GET /api/optional/public/binance/klines?symbol=BTCUSDT&interval=1h&limit=100`

### 2. Kraken Public Service
- **Endpoints:**
  - `GET /api/optional/public/kraken/ticker?pair=XBTUSD`

### 3. Bitfinex Public Service
- **Endpoints:**
  - `GET /api/optional/public/bitfinex/ticker?symbol=tBTCUSD`

### 4. News RSS Service
- **Endpoints:**
  - `GET /api/optional/public/rss/news?limit=30`
- **Sources:** CoinDesk, CoinTelegraph RSS feeds

### 5. Alternative.me Fear & Greed Index
- **Endpoints:**
  - `GET /api/optional/public/fng`
  - `GET /api/optional/public/fng/history?limit=7`

## Key-Based Providers

These providers require API keys set in `.env` file:

### 1. NewsAPI Service
- **Requires:** `NEWS_API_KEY`
- **Endpoints:**
  - `GET /api/optional/news/search?q=cryptocurrency&pageSize=10`
  - `GET /api/optional/news/status`

### 2. CoinMarketCap Service
- **Requires:** `CMC_API_KEY`
- **Endpoints:**
  - `GET /api/optional/cmc/listings?limit=10`
  - `GET /api/optional/cmc/quote?symbol=BTC`
  - `GET /api/optional/cmc/info?symbol=BTC`

### 3. CryptoCompare Service
- **Optional:** `CRYPTOCOMPARE_KEY` (works without key but lower rate limits)
- **Endpoints:**
  - `GET /api/optional/cc/pricemulti?fsyms=BTC,ETH&tsyms=USD`
  - `GET /api/optional/cc/histohour?fsym=BTC&tsym=USD&limit=24`

### 4. Santiment Service
- **Requires:** `SANTIMENT_KEY`
- **Endpoints:**
  - `POST /api/optional/santiment/query` (body: `{ query, variables }`)

### 5. WhaleAlert Service
- **Requires:** `WHALEALERT_KEY`
- **Endpoints:**
  - `GET /api/optional/whales/transactions?limit=10`
  - `GET /api/optional/whales/status`

## Testing

Run the test scripts to verify providers are working:

```bash
# Test all keyless providers (no API keys needed)
npm run test:optional:public

# Test NewsAPI (requires NEWS_API_KEY)
npm run test:optional:news

# Test market data providers (requires CMC_API_KEY)
npm run test:optional:market

# Test on-chain providers (requires SANTIMENT_KEY, WHALEALERT_KEY)
npm run test:optional:onchain

# Test all optional providers
npm run test:optional:all
```

## Environment Variables

Add these to your `.env` file (only if you want to use the corresponding provider):

```env
# NewsAPI (provided key from user)
NEWS_API_KEY=968a5e25552b4cb5ba3280361d8444ab

# CoinMarketCap (provided key from user)
CMC_API_KEY=04cf4b5b-9868-465c-8ba0-9f2e78c92eb1

# Optional providers (leave empty if not available)
CRYPTOCOMPARE_KEY=
SANTIMENT_KEY=
WHALEALERT_KEY=
```

## Important Notes

1. **Non-Breaking:** These providers do NOT replace or modify existing services
2. **Optional:** You can use them if needed, or ignore them completely
3. **Safe:** All providers are isolated in `/optional/` folder and routes
4. **Existing Priority:** Your existing detectors and services remain unchanged
5. **Fallback Use:** These can be used as fallback/alternative data sources

## Architecture

```
src/
├── services/
│   ├── optional/              # New optional providers (isolated)
│   │   ├── BinancePublicService.ts
│   │   ├── KrakenPublicService.ts
│   │   ├── BitfinexPublicService.ts
│   │   ├── NewsRssService.ts
│   │   ├── AltFearGreedService.ts
│   │   ├── NewsApiService.ts
│   │   ├── CoinMarketCapService.ts
│   │   ├── CryptoCompareService.ts
│   │   ├── SantimentService.ts
│   │   └── WhaleAlertService.ts
│   └── ... (existing services unchanged)
├── routes/
│   ├── optional-public.ts     # Keyless provider routes
│   ├── optional-news.ts       # NewsAPI routes
│   ├── optional-market.ts     # CMC & CryptoCompare routes
│   ├── optional-onchain.ts    # Santiment & WhaleAlert routes
│   └── ... (existing routes unchanged)
└── detectors/
    └── ... (existing detectors UNCHANGED)
```

## License

These optional providers are part of the DreammakerCryptoSignalAndTrader project.
