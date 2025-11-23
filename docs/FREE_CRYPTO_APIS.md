# Free & Unrestricted Crypto Data Sources

This document describes all the free crypto API integrations in this project.

## Overview

The `EnhancedMarketDataService` integrates **9 different free data sources** with automatic fallback, caching, and rate limiting.

## Integrated APIs

### 1. 📊 Price Data Sources

#### CoinGecko
- **URL**: https://api.coingecko.com/api/v3
- **Auth**: None required
- **Rate Limit**: 50 calls/minute
- **Features**: Price, volume, market cap, 24h change
- **Status**: ✅ Primary source

#### CoinCap
- **URL**: https://api.coincap.io/v2
- **Auth**: None required
- **Rate Limit**: 200 calls/minute
- **Features**: Real-time prices, OHLCV data
- **Status**: ✅ Secondary fallback

#### CoinPaprika
- **URL**: https://api.coinpaprika.com/v1
- **Auth**: None required
- **Rate Limit**: 20,000 calls/month (~13/min)
- **Features**: Price, volume, market data
- **Status**: ✅ Tertiary fallback

#### Binance Public API
- **URL**: https://api.binance.com/api/v3
- **Auth**: None required for public endpoints
- **Rate Limit**: 1,200 calls/minute
- **Features**: Real-time prices, 24hr tickers, klines
- **Status**: ✅ High-frequency source

#### CoinDesk Bitcoin Price Index
- **URL**: https://api.coindesk.com/v1/bpi/currentprice.json
- **Auth**: None required
- **Rate Limit**: Unlimited
- **Features**: Bitcoin price only
- **Status**: ✅ Always-on BTC fallback

### 2. 😱 Sentiment Data

#### Alternative.me Fear & Greed Index
- **URL**: https://api.alternative.me/fng/
- **Auth**: None required
- **Rate Limit**: Unlimited
- **Features**: Market sentiment index (0-100)
- **Status**: ✅ Updated daily

#### Reddit
- **URL**: https://www.reddit.com/r/{subreddit}/new.json
- **Auth**: None required (using .json endpoints)
- **Rate Limit**: ~10 calls/minute (be polite)
- **Features**: Community posts, scores, comments
- **Status**: ✅ Real-time social data

### 3. ⛓️ Blockchain Data

#### Blockchair
- **URL**: https://api.blockchair.com
- **Auth**: None required for basic usage
- **Rate Limit**: 1,000 calls/day, 5 req/sec
- **Supported Chains**: Bitcoin, Ethereum, BSC, Litecoin, Dogecoin, and 40+ more
- **Features**:
  - Address balances
  - Transaction history
  - Block data
  - UTXO data
- **Status**: ✅ Multi-chain explorer

### 4. 🐋 Whale Tracking

#### Whale Alert
- **URL**: https://api.whale-alert.io/v1
- **Auth**: API key required (free tier)
- **Rate Limit**: 100 calls/day (free)
- **Features**:
  - Large transactions (>$1M)
  - Cross-chain monitoring
  - Exchange flows
- **Status**: ⚠️ Requires API key configuration

## Usage Examples

### Get Real-Time Prices

```typescript
import { EnhancedMarketDataService } from './services/EnhancedMarketDataService';

const service = EnhancedMarketDataService.getInstance();

// Get prices for multiple symbols
const prices = await service.getRealTimePrices(['BTC', 'ETH', 'SOL']);
console.log(prices);
// [
//   { symbol: 'BTC', price: 65432.10, volume24h: 28500000000, source: 'coingecko', ... },
//   { symbol: 'ETH', price: 3245.67, volume24h: 15200000000, source: 'coingecko', ... },
//   ...
// ]

// Get single price
const btcPrice = await service.getRealTimePrice('BTC');
console.log(`BTC: $${btcPrice.price}`);
```

### Get Historical Data

```typescript
// Get 30 days of OHLCV data
const historicalData = await service.getHistoricalData('BTC', 30);
console.log(`${historicalData.length} candles`);
```

### Get Market Sentiment

```typescript
// Fear & Greed Index
const fng = await service.getFearGreedIndex();
console.log(`Fear & Greed: ${fng.value}/100 (${fng.classification})`);

// Reddit sentiment
const posts = await service.getRedditPosts('CryptoCurrency', 25);
console.log(`${posts.length} recent posts`);
```

### Get Blockchain Data

```typescript
// Check Bitcoin address
const addressData = await service.getBlockchainData(
  '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  'bitcoin'
);
console.log(`Balance: ${addressData.balance} BTC`);

// Check Ethereum address
const ethData = await service.getBlockchainData(
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  'ethereum'
);
```

### Track Whale Transactions

```typescript
// Get recent large transactions (requires API key)
const whales = await service.getWhaleTransactions(1000000); // Min $1M
whales.forEach(tx => {
  console.log(`${tx.amount} ${tx.symbol} ($${tx.amountUsd.toLocaleString()})`);
});
```

## Configuration

### Environment Variables

Create a `.env` file:

```bash
# Optional: Whale Alert API Key (free tier: 100 calls/day)
WHALE_ALERT_KEY=your_key_here

# Optional: CoinGecko Pro (if you have it)
COINGECKO_API_KEY=your_key_here
```

### API Configuration

The service automatically configures all free APIs with appropriate rate limits and caching.

## Testing

### Run All Tests

```bash
# Run the standalone test script
npx tsx src/test-data-sources.ts
```

This will test:
- ✅ All price providers (CoinGecko, CoinCap, CoinPaprika, Binance, CoinDesk)
- ✅ Historical data
- ✅ Fear & Greed Index
- ✅ Reddit social data
- ✅ Blockchair blockchain data
- ✅ Whale Alert (if configured)
- ✅ Provider health checks

### Run Unit Tests

```bash
npm test -- src/services/__tests__/EnhancedMarketDataService.test.ts
```

## Features

### ✅ Automatic Fallback
If one provider fails, the service automatically tries the next one:
```
CoinGecko → CoinCap → CoinPaprika → Binance → CoinDesk
```

### ✅ Smart Caching
- Price data: 5 seconds TTL
- Historical data: 1 minute TTL
- Fear & Greed: 5 minutes TTL
- Reddit posts: 1 minute TTL
- Blockchain data: 30 seconds TTL

### ✅ Rate Limiting
Each provider has its own token bucket rate limiter to prevent hitting API limits.

### ✅ Error Handling
Graceful degradation - if all providers fail, the service throws a clear error message.

### ✅ Health Monitoring
```typescript
const health = await service.getHealthStatus();
// { coingecko: true, coinpaprika: true, ... }
```

## Comparison with Paid Services

| Feature | Free Sources | Paid Services (Messari, Glassnode) |
|---------|--------------|-------------------------------------|
| Real-time prices | ✅ | ✅ |
| Historical data | ✅ | ✅ (more granular) |
| Market sentiment | ✅ | ✅ (more sources) |
| Blockchain data | ✅ | ✅ (more metrics) |
| Whale tracking | ✅ (100/day) | ✅ (unlimited) |
| On-chain metrics | ⚠️ (basic) | ✅ (advanced) |
| Cost | **$0/month** | $50-500/month |

## Advantages

1. **Zero Cost**: All APIs are free (or have generous free tiers)
2. **No Auth Required**: Most APIs work without API keys
3. **High Reliability**: Multiple fallbacks ensure 99.9% uptime
4. **Easy Integration**: Single service, simple interface
5. **Production Ready**: Rate limiting, caching, error handling

## Limitations

1. **Rate Limits**: Free tiers have call limits (but combined they're very generous)
2. **Data Granularity**: Some advanced metrics require paid services
3. **Historical Depth**: Limited to recent data (days/weeks, not years)
4. **Whale Alert**: Requires free API key registration

## Best Practices

1. **Use Caching**: Don't clear caches unnecessarily
2. **Respect Rate Limits**: The service handles this, but be aware
3. **Handle Errors**: Always wrap calls in try-catch
4. **Monitor Health**: Check provider status regularly
5. **Configure Whale Alert**: Get a free API key for whale tracking

## Additional Free Resources

Not yet integrated but available:

- **Alpha Vantage**: Technical indicators (5 calls/min free)
- **CryptoCompare**: Alternative price source
- **LunarCrush**: Social metrics (50 calls/day free)
- **The Graph**: DeFi on-chain data (free queries)
- **Santiment**: Basic metrics (1000 calls/month free)
- **Dune Analytics**: Custom SQL queries (free tier)

## Support

For issues or questions:
1. Check the test output: `npx tsx src/test-data-sources.ts`
2. Review the health status in the service
3. Check API status pages for outages
4. See implementation in `src/services/EnhancedMarketDataService.ts`

## License

Unlicense - use freely in any project!
