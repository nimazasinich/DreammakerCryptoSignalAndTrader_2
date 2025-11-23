export type Provider = 'binance' | 'coingecko' | 'cryptocompare';

const baseMap: Record<string, { binance: string; coingecko: { base: string; quote: string }; cryptocompare: { fsym: string; tsym: string } }> = {
  'BTC/USDT': {
    binance: 'BTCUSDT',
    coingecko: { base: 'bitcoin', quote: 'tether' }, // falls back to USD if needed
    cryptocompare: { fsym: 'BTC', tsym: 'USDT' },
  },
  'ETH/USDT': {
    binance: 'ETHUSDT',
    coingecko: { base: 'ethereum', quote: 'tether' },
    cryptocompare: { fsym: 'ETH', tsym: 'USDT' },
  },
};

export function toBinanceSymbol(uiSymbol: string): string {
  const m = baseMap[uiSymbol];
  return m ? m.binance : uiSymbol.replace('/', '');
}

export function toCoinGeckoPair(uiSymbol: string): { base: string; quote: string } {
  const m = baseMap[uiSymbol];
  if (m) return m.coingecko;
  const [b, q] = uiSymbol.split('/');
  return { base: b?.toLowerCase() ?? 'bitcoin', quote: (q || 'usd').toLowerCase() };
}

export function toCryptoComparePair(uiSymbol: string): { fsym: string; tsym: string } {
  const m = baseMap[uiSymbol];
  if (m) return m.cryptocompare;
  const [b, q] = uiSymbol.split('/');
  return { fsym: (b || 'BTC').toUpperCase(), tsym: (q || 'USD').toUpperCase() };
}
