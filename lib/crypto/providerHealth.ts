// src/lib/crypto/providerHealth.ts
// Health-aware provider routing & caching to avoid rate limits and maximize uptime
import {
  pingAll,
  getMarketData,
  getOHLCV,
  getFearGreedAggPlus,
  type OHLCVRow,
  type MarketQuote
} from './crypto_resources';

type ProviderOrder = Array<'coinpaprika'|'coincap'|'coingecko'|'defillama'>;

let lastOrder: ProviderOrder = ['coinpaprika','coincap','coingecko','defillama'];
let lastPingAt = 0;
const HEALTH_TTL_MS = 5 * 60 * 1000; // 5m
const LRU_LIMIT = 64;
const lru = new Map<string, any>();

function lruKey(fn: string, args: any) {
  return `${fn}:${JSON.stringify(args)}`;
}

function lruGet<T>(k: string): T | undefined {
  const v = lru.get(k);
  if (v) {
    lru.delete(k);
    lru.set(k, v);
  }
  return v;
}

function lruSet(k: string, v: any) {
  if (lru.has(k)) lru.delete(k);
  lru.set(k, v);
  if (lru.size > LRU_LIMIT) {
    const firstKey = lru.keys().next().value;
    if (firstKey !== undefined) lru.delete(firstKey);
  }
}

async function refreshOrderIfNeeded() {
  const now = Date.now();
  if (now - lastPingAt < HEALTH_TTL_MS) return;
  lastPingAt = now;

  const results = await pingAll().catch(() => []);

  const toScore = (id: string) => {
    const r = results.find(x => x.id === id);
    if (!r) return 0;
    return (r.ok ? 1 : 0) - Math.min(1, (r.elapsedMs || 0) / 8000); // ok wins; faster wins
  };

  const scored = [
    { id: 'coinpaprika', s: toScore('coinpaprika') },
    { id: 'coincap', s: toScore('coincap') },
    { id: 'coingecko', s: toScore('coingecko') },
    { id: 'defillama', s: toScore('defillama') },
  ].sort((a,b)=>b.s-a.s);

  lastOrder = (scored || []).map(x => x.id) as ProviderOrder;
}

export async function robustMarketData(query: string): Promise<MarketQuote> {
  await refreshOrderIfNeeded();
  const key = lruKey('market', { query, lastOrder });
  const hit = lruGet<MarketQuote>(key);
  if (hit) return hit;

  const res = await getMarketData(query, { providers: lastOrder });
  lruSet(key, res);
  return res;
}

export async function robustOHLCV(
  symbol: string,
  timeframe: '1m'|'5m'|'15m'|'30m'|'1h'|'4h'|'1d'='1h',
  limit=1000
): Promise<OHLCVRow[]> {
  await refreshOrderIfNeeded();
  const key = lruKey('ohlcv', { symbol, timeframe, limit });
  const hit = lruGet<OHLCVRow[]>(key);
  if (hit) return hit;

  const res = await getOHLCV(symbol, timeframe, limit);
  lruSet(key, res);
  return res;
}

export async function robustFearGreed(symbol='BTCUSDT') {
  await refreshOrderIfNeeded();
  const key = lruKey('fng', { symbol });
  const hit = lruGet<any>(key);
  if (hit) return hit;

  const res = await getFearGreedAggPlus(symbol);
  lruSet(key, res);
  return res;
}
