// Feature flags and configuration

// API key precedence (read-only):
// 1) process.env
// 2) "api - Copy.txt" (if present)
// 3) config/api.json

// Helper function to parse boolean environment variables
const parseBool = (v?: string) =>
  (v ?? '').toLowerCase() === 'true' ? true :
  (v ?? '').toLowerCase() === 'false' ? false : undefined;

export const DISABLE_REDIS = process.env.DISABLE_REDIS === 'true';

// News API key aliasing (accept both NEWS_API_KEY and NEWSAPI_KEY)
const NEWS_KEY = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY;

export const ENABLE_CMC = !!process.env.CMC_API_KEY && process.env.CMC_API_KEY !== 'YOUR_KEY_HERE';
export const ENABLE_COINGECKO = true; // CoinGecko is free
export const ENABLE_CRYPTOCOMPARE = !!process.env.CRYPTOCOMPARE_KEY;
export const ENABLE_NEWSAPI = !!NEWS_KEY && NEWS_KEY !== 'YOUR_KEY_HERE';
export const ENABLE_CRYPTOPANIC = !!(process.env.CRYPTOPANIC_KEY || process.env.CRYPOPANIC_KEY);

// Futures Trading Feature Flags (ENV takes precedence over JSON)
const envFutures = parseBool(process.env.FEATURE_FUTURES);
// Note: If config/api.json has futures flag, it would be imported here
// For now, we only use ENV with a default of false
export const FEATURE_FUTURES = envFutures ?? false;
export const EXCHANGE_KUCOIN = process.env.EXCHANGE_KUCOIN !== 'false'; // Default: true

// Performance tuning
export const PROVIDER_TTL_MS = +(process.env.PROVIDER_TTL_MS ?? 60000); // 1 minute
export const PRICE_CACHE_TTL_MS = +(process.env.PRICE_CACHE_TTL_MS ?? 5000); // 5 seconds

