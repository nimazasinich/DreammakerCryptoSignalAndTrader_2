# API Integration Guide

## Overview

This project now includes a comprehensive multi-source API integration system that provides:

- ✅ **Load Balancing**: Automatic distribution of requests across multiple API providers
- ✅ **Auto-Failover**: Seamless switching to backup providers when primary fails
- ✅ **Health Monitoring**: Real-time tracking of API provider health and performance
- ✅ **Smart Caching**: TTL-based caching to reduce API calls and improve performance
- ✅ **Round-Robin Distribution**: Prevents rate limiting by rotating through providers
- ✅ **CORS Proxy Support**: Automatic proxy fallback for cross-origin requests

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                          │
│  (Components, Services, Business Logic)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
    ┌──────▼─────────┐    ┌───────▼────────┐
    │  Adapters      │    │ UnifiedData    │
    │  (Backward     │    │ Service        │
    │  Compatible)   │    │                │
    └──────┬─────────┘    └───────┬────────┘
           │                      │
           └──────────┬───────────┘
                      │
           ┌──────────▼───────────┐
           │ EnhancedAPIClient    │
           │ (Load Balancer)      │
           └──────────┬───────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼───┐   ┌────▼───┐   ┌────▼───┐
   │Provider│   │Provider│   │Provider│
   │   1    │   │   2    │   │   3    │
   └────────┘   └────────┘   └────────┘
```

## New Services

### 1. EnhancedAPIClient

**Location**: `src/services/EnhancedAPIClient.ts`

**Purpose**: Core load balancing and health tracking engine

**Features**:
- Round-robin request distribution
- Provider health monitoring
- Automatic failover
- Response caching with TTL
- Request statistics tracking

**Usage**:
```typescript
import { EnhancedAPIClient } from './services/EnhancedAPIClient';

const client = new EnhancedAPIClient(
  60000,  // cacheTTL: 1 minute
  3,      // maxConsecutiveFailures
  60000   // healthCheckInterval: 1 minute
);

const data = await client.fetchWithLoadBalancing(
  'marketData',
  primaryConfig,
  fallbackConfigs,
  '/endpoint',
  { param1: 'value' }
);
```

### 2. UnifiedDataService

**Location**: `src/services/UnifiedDataService.ts`

**Purpose**: Single interface for all cryptocurrency data

**Available Methods**:

#### Market Data
```typescript
// Get single price
const price = await unifiedService.getPrice('BTC', 'usd');

// Get multiple prices
const prices = await unifiedService.getPrices(['BTC', 'ETH', 'BNB'], 'usd');

// Get trending coins
const trending = await unifiedService.getTrending();
```

#### News
```typescript
// Get latest news
const news = await unifiedService.getNews(50, ['BTC', 'ETH']);
```

#### Sentiment
```typescript
// Get Fear & Greed Index
const fearGreed = await unifiedService.getFearGreedIndex();
```

#### Whale Tracking
```typescript
// Get large transactions
const whales = await unifiedService.getWhaleTransactions(1000000);
```

#### Health & Stats
```typescript
// Get health status
const health = await unifiedService.getHealthStatus();

// Get provider health details
const providerHealth = await unifiedService.getProviderHealth();

// Reset provider health
unifiedService.resetProviderHealth('marketData', 'coingecko');
```

### 3. APIHealthChecker

**Location**: `src/services/APIHealthChecker.ts`

**Purpose**: Validate and test all configured API endpoints

**Usage**:
```typescript
import { APIHealthChecker } from './services/APIHealthChecker';

const checker = APIHealthChecker.getInstance();

// Quick check of essential APIs
const quickCheck = await checker.quickCheck();
// Returns: { marketData: true, sentiment: true, news: true }

// Comprehensive check of all APIs
const report = await checker.checkAllAPIs();

// Print report to console
checker.printReport(report);
```

### 4. Service Adapters

**Locations**:
- `src/services/EnhancedMarketDataServiceAdapter.ts`
- `src/services/EnhancedSentimentServiceAdapter.ts`

**Purpose**: Provide backward compatibility with existing services while leveraging new multi-source capabilities

**Usage**:
```typescript
// Drop-in replacement for MultiProviderMarketDataService
import { EnhancedMarketDataServiceAdapter } from './services/EnhancedMarketDataServiceAdapter';

const service = EnhancedMarketDataServiceAdapter.getInstance();
const price = await service.getPrice('BTC');

// Compatible with existing code
const health = service.getHealthStatus();
```

## API Configuration

All API configurations are centralized in `src/config/CentralizedAPIConfig.ts` and sourced from `api-config-complete.txt`.

### Supported API Categories

#### Market Data (15+ providers)
- **Primary**: CoinGecko (no key needed)
- **Fallbacks**: CoinMarketCap, Binance, CoinCap, CoinPaprika, CryptoCompare, etc.

#### News (6+ sources)
- **Primary**: CryptoPanic (no key needed)
- **Fallbacks**: Reddit, NewsAPI, CoinDesk, CoinTelegraph, etc.

#### Sentiment
- **Primary**: Alternative.me Fear & Greed Index (no key needed)
- **Fallbacks**: LunarCrush, Santiment, etc.

#### Whale Tracking
- **Primary**: ClankApp (no key needed)
- **Fallbacks**: Whale Alert, BitQuery, etc.

#### Block Explorers
- Ethereum: Etherscan, BlockScout, Blockchair, etc.
- BSC: BscScan, Ankr, etc.
- Tron: TronScan, TronGrid, etc.

## Environment Configuration

Update your `.env` file with API keys (all optional - fallbacks available):

```bash
# Market Data
CMC_API_KEY=b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c
CMC_API_KEY_2=04cf4b5b-9868-465c-8ba0-9f2e78c92eb1
CRYPTOCOMPARE_KEY=e79c8e6d4c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f

# News
NEWS_API_KEY=pub_346789abc123def456789ghi012345jkl

# Block Explorers
ETHERSCAN_API_KEY=SZHYFZK2RR8H9TIMJBVW54V4H81K2Z2KR2
ETHERSCAN_API_KEY_2=T6IR8VJHX2NE6ZJW2S3FDVN1TYG4PYYI45
BSCSCAN_API_KEY=K62RKHGXTDCG53RU4MCG6XABIMJKTN19IT
TRONSCAN_API_KEY=7ae72726-bffe-4e74-9c33-97b761eeea21
```

**Note**: Most providers work without API keys. Keys are provided for higher rate limits.

## Testing

### Run API Health Check

```bash
npm run test:api-health
```

This will:
1. ✅ Quick check essential APIs
2. 🧪 Run functional tests (fetch actual data)
3. 📊 Display load balancer statistics
4. 🏥 Show provider health details
5. 🔍 Comprehensive health check of all APIs
6. 📋 Generate recommendations

### Expected Output

```
╔═══════════════════════════════════════════════════════════════╗
║         API Health Check & Validation Test Suite             ║
╚═══════════════════════════════════════════════════════════════╝

⚡ Running quick check of essential APIs...

Quick Check Results:
  Market Data: ✅
  Sentiment:   ✅
  News:        ✅

🧪 Running functional tests...

Test 1: Fetching Bitcoin price...
  ✅ Success: BTC = $43,521 (source: coingecko)
     Volume 24h: $21,543,234,123
     Change 24h: 2.34%

...

📊 SUMMARY:

✅ EXCELLENT: Most APIs are working correctly!

Total APIs Tested: 42
Success Rate: 85.71%
```

## Load Balancing Strategy

The system uses **Round-Robin with Health Filtering**:

1. **Request arrives** → Check cache first
2. **Cache miss** → Select next healthy provider via round-robin
3. **Make request** → Record response time
4. **Success** → Update health metrics, cache result
5. **Failure** → Mark failure, try next provider
6. **All failed** → Return error with details

### Health Tracking

Each provider maintains:
- `healthy`: Current health status (boolean)
- `lastSuccess`: Timestamp of last successful request
- `lastFailure`: Timestamp of last failed request
- `consecutiveFailures`: Count of consecutive failures
- `averageResponseTime`: Exponential moving average
- `successRate`: Overall success percentage

### Auto-Recovery

Providers marked as unhealthy are automatically reconsidered after 5 minutes of downtime.

## Integration Examples

### Example 1: Market Data Service

```typescript
import { UnifiedDataService } from './services/UnifiedDataService';

const service = UnifiedDataService.getInstance();

async function getMarketOverview() {
  // Get multiple prices at once
  const prices = await service.getPrices(['BTC', 'ETH', 'BNB']);

  // Get trending coins
  const trending = await service.getTrending();

  return {
    prices,
    trending
  };
}
```

### Example 2: Sentiment Analysis

```typescript
import { EnhancedSentimentServiceAdapter } from './services/EnhancedSentimentServiceAdapter';

const service = EnhancedSentimentServiceAdapter.getInstance();

async function analyzeCryptoSentiment(symbol: string) {
  // Get comprehensive sentiment
  const sentiment = await service.analyzeSentiment(symbol);

  // Get Fear & Greed Index
  const fearGreed = await service.getFearGreedIndex();

  // Get related news
  const news = await service.getNews(20, [symbol]);

  return {
    sentiment,
    fearGreed,
    news
  };
}
```

### Example 3: Dashboard Data

```typescript
import { UnifiedDataService } from './services/UnifiedDataService';

const service = UnifiedDataService.getInstance();

async function getDashboardData() {
  // Fetch all data in parallel
  const [prices, fearGreed, news, whales] = await Promise.all([
    service.getPrices(['BTC', 'ETH', 'BNB']),
    service.getFearGreedIndex(),
    service.getNews(10),
    service.getWhaleTransactions()
  ]);

  return {
    prices,
    sentiment: fearGreed,
    news,
    whales,
    health: service.getHealthStatus()
  };
}
```

## Performance Optimization

### Caching Strategy

Different data types use different cache TTLs:

- **Price Data**: 5 seconds (real-time)
- **News**: 5 minutes (semi-static)
- **Sentiment**: 5 minutes (slow-changing)
- **Whale Transactions**: 1 minute (event-driven)

### Rate Limit Prevention

1. **Round-robin distribution** spreads load across providers
2. **Smart caching** reduces redundant API calls
3. **Multiple API keys** for high-traffic providers
4. **Automatic provider rotation** when limits hit

## Monitoring & Debugging

### Enable Debug Logging

```typescript
import { Logger } from './core/Logger';

const logger = Logger.getInstance();
logger.setLevel('debug');
```

### View Provider Statistics

```typescript
const service = UnifiedDataService.getInstance();
const stats = service.getHealthStatus();

console.log('Market Data Stats:', stats.marketData);
// {
//   totalRequests: 150,
//   successfulRequests: 142,
//   failedRequests: 8,
//   averageResponseTime: 234
// }
```

### Manual Provider Recovery

```typescript
// Reset specific provider
service.resetProviderHealth('marketData', 'coingecko');

// Reset entire category
service.resetProviderHealth('marketData');

// Reset all providers
service.resetProviderHealth();
```

## Troubleshooting

### Issue: All providers failing

**Solution**:
1. Check internet connection
2. Verify API keys in `.env`
3. Run health check: `npm run test:api-health`
4. Check if providers are experiencing downtime

### Issue: Rate limits exceeded

**Solution**:
1. Increase cache TTL in service constructors
2. Add more API keys for rotation
3. Enable more fallback providers
4. Reduce request frequency

### Issue: Slow response times

**Solution**:
1. Check provider health details
2. Disable slow providers
3. Adjust timeout values in config
4. Use faster fallback providers

## Migration Guide

### From MultiProviderMarketDataService

```typescript
// Before
import { MultiProviderMarketDataService } from './services/MultiProviderMarketDataService';
const service = MultiProviderMarketDataService.getInstance();

// After (backward compatible)
import { EnhancedMarketDataServiceAdapter } from './services/EnhancedMarketDataServiceAdapter';
const service = EnhancedMarketDataServiceAdapter.getInstance();

// Or use new unified service
import { UnifiedDataService } from './services/UnifiedDataService';
const service = UnifiedDataService.getInstance();
```

### From SentimentAnalysisService

```typescript
// Before
import { SentimentAnalysisService } from './services/SentimentAnalysisService';
const service = SentimentAnalysisService.getInstance();

// After (backward compatible)
import { EnhancedSentimentServiceAdapter } from './services/EnhancedSentimentServiceAdapter';
const service = EnhancedSentimentServiceAdapter.getInstance();
```

## Best Practices

1. ✅ **Always use UnifiedDataService** for new code
2. ✅ **Monitor provider health** regularly
3. ✅ **Set appropriate cache TTLs** based on data freshness needs
4. ✅ **Handle errors gracefully** with try-catch
5. ✅ **Use adapters** for backward compatibility
6. ✅ **Run health checks** before deployment
7. ✅ **Keep API keys secure** in environment variables
8. ✅ **Rotate API keys** for high-traffic applications

## Resources

- **API Config**: `api-config-complete.txt`
- **Centralized Config**: `src/config/CentralizedAPIConfig.ts`
- **Test Script**: `scripts/test-api-health.ts`
- **Environment Template**: `.env.example`

## Support

For issues or questions:
1. Run `npm run test:api-health` to diagnose
2. Check logs for detailed error messages
3. Verify API keys and configuration
4. Review provider health status

---

**Last Updated**: 2025-11-09
**Version**: 1.0.0
