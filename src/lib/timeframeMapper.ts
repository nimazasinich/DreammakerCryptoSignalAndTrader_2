export function toProviderTF(tf: string, provider: 'binance'|'coingecko'|'cryptocompare'): string {
  // UI uses: 1m, 5m, 15m, 1h, 4h, 1d
  if (provider === 'binance') return tf;              // Binance: '1m','1h','1d'
  if (provider === 'cryptocompare') {
    // REST minute/hour/day endpoints; keep '1h' but map at fetch site
    return tf;
  }
  if (provider === 'coingecko') {
    // Coingecko "days" granularity; for 1h we fallback to other providers
    return tf;
  }
  return tf;
}
