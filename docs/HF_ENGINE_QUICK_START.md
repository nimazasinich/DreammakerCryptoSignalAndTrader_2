# HuggingFace Data Engine - Quick Start Guide

## 🚀 Quick Reference

### Configuration (env file)

```env
PRIMARY_DATA_SOURCE=huggingface
HF_ENGINE_ENABLED=true
HF_ENGINE_BASE_URL=https://really-amin-datasourceforcryptocurrency.hf.space
HF_ENGINE_TIMEOUT_MS=15000
```

### Run Integration Tests

```bash
npm run test:hf-engine
```

## 📊 Common Use Cases

### 1. Get Market Prices

```typescript
import { primaryDataSourceService } from './services/PrimaryDataSourceService';

// Get multiple prices
const prices = await primaryDataSourceService.getMarketPrices(['BTC', 'ETH', 'SOL']);

// Get single price
const btcPrice = await primaryDataSourceService.getPrice('BTC');
console.log(`BTC: $${btcPrice.price}`);
```

### 2. Get Market Overview

```typescript
import { HFDataEngineAdapter } from './services/HFDataEngineAdapter';

const result = await HFDataEngineAdapter.getMarketOverview();
if (result.ok) {
  console.log('Total Market Cap:', result.data.totalMarketCap);
  console.log('BTC Dominance:', result.data.btcDominance);
}
```

### 3. Sentiment Analysis

```typescript
import { HFDataEngineAdapter } from './services/HFDataEngineAdapter';

const result = await HFDataEngineAdapter.getSentiment(
  'Bitcoin is showing strong bullish momentum today'
);

if (result.ok) {
  console.log('Sentiment:', result.data.sentiment);  // 'positive'
  console.log('Confidence:', result.data.confidence); // 0.95
}
```

### 4. Check Engine Health

```typescript
import { primaryDataSourceService } from './services/PrimaryDataSourceService';

const health = await primaryDataSourceService.getHealthStatus();
console.log('Status:', health.health.status);
console.log('Active Providers:', health.providers.length);
```

### 5. Get Providers List

```typescript
import { HFDataEngineAdapter } from './services/HFDataEngineAdapter';

const result = await HFDataEngineAdapter.getProviders();
if (result.ok) {
  result.data.providers.forEach(provider => {
    console.log(`${provider.name}: ${provider.status}`);
  });
}
```

## 🔧 Direct API Calls

### Using HFDataEngineClient

```typescript
import { hfDataEngineClient } from './services/HFDataEngineClient';

// Health check
const health = await hfDataEngineClient.getHealth();

// Get prices with limit
const prices = await hfDataEngineClient.getTopPrices(10);

// Market overview
const overview = await hfDataEngineClient.getMarketOverview();

// Sentiment analysis
const sentiment = await hfDataEngineClient.runHfSentiment('text to analyze');

// Get logs
const logs = await hfDataEngineClient.getLogs(20);
```

## 🌐 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hf-engine/health` | GET | Health check |
| `/api/hf-engine/prices` | GET | Top cryptocurrency prices |
| `/api/hf-engine/market/overview` | GET | Market overview |
| `/api/hf-engine/hf/sentiment` | POST | Sentiment analysis |
| `/api/hf-engine/providers` | GET | Data providers list |
| `/api/hf-engine/logs` | GET | System logs |

## 🎯 Priority System

The system automatically prioritizes data sources:

```
1. HuggingFace Data Engine ← PRIMARY (always tried first)
   ↓ (on failure)
2. Multi-Provider Service (CoinGecko, Binance, etc.)
   ↓ (on failure)
3. Enhanced Service
   ↓ (on failure)
4. Fallback/Cached Data
```

## ⚠️ Error Handling

All methods handle errors gracefully:

```typescript
try {
  const prices = await primaryDataSourceService.getMarketPrices(['BTC']);
  // prices will be empty array if all sources fail
  if (prices.length === 0) {
    console.log('No data available');
  }
} catch (error) {
  // This will rarely throw - fallbacks prevent it
  console.error('Fatal error:', error);
}
```

## 🔍 Debugging

### Check Configuration

```typescript
import { getDataSourceConfig, getPrimaryDataSource } from './config/dataSource';

console.log('Primary Source:', getPrimaryDataSource());
console.log('Config:', getDataSourceConfig());
```

### Enable Debug Logging

```typescript
import { Logger } from './core/Logger';

const logger = Logger.getInstance();
logger.setLevel('debug'); // 'debug', 'info', 'warn', 'error'
```

## 📦 Response Formats

### Market Price Response

```typescript
{
  symbol: 'BTC',
  price: 98234.56,
  change24h: 1234.56,
  changePercent24h: 1.27,
  volume24h: 45678901234,
  source: 'hf_engine',
  timestamp: 1700000000000
}
```

### Sentiment Response

```typescript
{
  label: 'POSITIVE',      // 'POSITIVE', 'NEGATIVE', 'NEUTRAL'
  score: 0.95,            // 0.0 to 1.0
  sentiment: 'positive',
  confidence: 0.95,
  text: 'original text',
  timestamp: 1700000000000
}
```

### Market Overview Response

```typescript
{
  totalMarketCap: 2500000000000,
  totalVolume24h: 150000000000,
  btcDominance: 52.5,
  ethDominance: 17.8,
  marketCapChange24h: 2.3,
  activeCoins: 12000,
  markets: 50000,
  timestamp: 1700000000000
}
```

## 🧪 Testing

### Run All Tests

```bash
npm run test:hf-engine
```

### Test Individual Endpoints

```bash
# Health check
curl https://really-amin-datasourceforcryptocurrency.hf.space/api/hf-engine/health

# Get prices
curl "https://really-amin-datasourceforcryptocurrency.hf.space/api/hf-engine/prices?limit=3"

# Market overview
curl https://really-amin-datasourceforcryptocurrency.hf.space/api/hf-engine/market/overview

# Sentiment (POST)
curl -X POST "https://really-amin-datasourceforcryptocurrency.hf.space/api/hf-engine/hf/sentiment" \
  -H "Content-Type: application/json" \
  -d '{"text":"Bitcoin is bullish"}'
```

## 🔄 Migration Examples

### Before (Multiple sources)

```typescript
// Old way - direct provider calls
const binancePrice = await binanceService.getPrice('BTCUSDT');
const coinGeckoPrice = await coinGeckoService.getPrice('bitcoin');

// Manual fallback logic
if (!binancePrice) {
  price = coinGeckoPrice;
}
```

### After (Unified via HF Engine)

```typescript
// New way - automatic routing and fallback
const price = await primaryDataSourceService.getPrice('BTC');
// Always returns data if ANY source succeeds
```

## 📚 Additional Resources

- [Complete Integration Guide](./HF_ENGINE_INTEGRATION_COMPLETE.md)
- [API Documentation](./API_INTEGRATION_GUIDE.md)
- [Troubleshooting Guide](./HF_ENGINE_INTEGRATION_COMPLETE.md#troubleshooting)

## 💡 Pro Tips

1. **Use PrimaryDataSourceService for most cases** - It handles all the complexity
2. **Use HFDataEngineAdapter for advanced control** - Direct access to normalized data
3. **Use hfDataEngineClient for raw access** - When you need the raw HF Engine response
4. **Always check result.ok** - When using Adapter methods
5. **Don't implement manual fallback** - The system does it automatically

## 🐛 Common Issues

### Issue: "HF Engine failed, falling back..."

This is **normal** and expected. The system automatically uses fallback sources.

### Issue: Empty data returned

Check:
1. HF Engine URL is correct
2. `PRIMARY_DATA_SOURCE=huggingface` in env
3. `HF_ENGINE_ENABLED=true` in env
4. Network connectivity

### Issue: Timeout errors

Increase timeout:
```env
HF_ENGINE_TIMEOUT_MS=30000  # 30 seconds
```

---

**Happy Coding! 🚀**

