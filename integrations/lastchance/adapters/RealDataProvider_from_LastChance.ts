// adapters/RealDataProvider_from_LastChance.ts
// Minimal additive provider to plug into your RealDataManager.
// Real Data Only: no mock fallbacks here.
import { API_BASE } from '../../../src/config/env';

export async function fetchOHLCV(symbol: string, timeframe: string, limit=500) {
  const url = `${API_BASE}/market/candlestick/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(timeframe)}&limit=${limit}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`OHLCV ${res.status}`);
  return res.json();
}

export async function fetchPrices(symbols: string[]) {
  const qs = symbols.map(s=>`symbol=${encodeURIComponent(s)}`).join('&');
  const url = `${API_BASE}/market/prices?${qs}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`prices ${res.status}`);
  return res.json();
}

export async function fetchUniverseTopN(n=300) {
  const url = `${API_BASE}/proxy/coinmarketcap/listings?limit=${n}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`universe ${res.status}`);
  return res.json();
}
