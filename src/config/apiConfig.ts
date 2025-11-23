// src/config/apiConfig.ts
export const marketProviders = {
  primary: { name: 'coingecko', base: 'https://api.coingecko.com/api/v3' },
  fallbacks: [
    { name: 'cryptocompare', base: 'https://min-api.cryptocompare.com/data' },
    { name: 'coincap', base: 'https://api.coincap.io/v2' },
    { name: 'binance', base: 'https://api.binance.com/api/v3' }
  ],
  // sane defaults
  ttlMs: 60_000,
  backoff: { baseMs: 500, maxMs: 8000, factor: 2, jitter: 0.25 }
};

