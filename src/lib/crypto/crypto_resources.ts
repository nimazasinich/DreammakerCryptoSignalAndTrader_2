// crypto_resources.ts — unified TS with 150+ Hugging Face sources (dynamic catalog) + Safe F&G aggregator
// English-only comments. Keys intentionally embedded per user request.

export type Category =
  | 'market'
  | 'news'
  | 'sentiment'
  | 'onchain'
  | 'block_explorer'
  | 'whales'
  | 'generic'
  | 'hf';

export interface EndpointDef {
  path: string;
  method?: 'GET' | 'POST';
  sampleParams?: Record<string, string | number>;
  authLocation?: 'header' | 'query';
  authName?: string;
  authValue?: string;
  contentType?: string;
}

export interface CryptoResource {
  id: string;
  category: Category;
  name: string;
  baseUrl: string;
  free: boolean;
  rateLimit?: string;
  endpoints?: Record<string, EndpointDef>;
}

export interface MarketQuote {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h?: number;
  marketCap?: number;
  source: string;
  raw: any;
}

export interface NewsItem {
  title: string;
  link: string;
  publishedAt?: string;
  source: string;
}

export interface OHLCVRow {
  timestamp: number | string;
  open: number; high: number; low: number; close: number; volume: number;
  [k: string]: any;
}

export interface FNGPoint {
  value: number;     // 0..100
  classification: string;
  at?: string;
  source: string;
  raw?: any;
}

const EMBEDDED_KEYS = {
  CMC: '04cf4b5b-9868-465c-8ba0-9f2e78c92eb1',
  ETHERSCAN: 'SZHYFZK2RR8H9TIMJBVW54V4H81K2Z2KR2',
  ETHERSCAN_BACKUP: 'T6IR8VJHX2NE6ZJW2S3FDVN1TYG4PYYI45',
  BSCSCAN: 'K62RKHGXTDCG53RU4MCG6XABIMJKTN19IT',
  CRYPTOCOMPARE: 'e79c8e6d4c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f',

  // Optional free keys - use environment variables to avoid GitHub push protection
  MESSARI: '',
  SANTIMENT: '',
  COINMETRICS: '',
  HUGGINGFACE: process.env.HUGGINGFACE_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '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',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

class HttpError extends Error {
  constructor(public status: number, public url: string, public body?: string) {
    super(`HTTP ${status} for ${url}`);
  }
}

function buildURL(base: string, path = '', params?: Record<string, any>): string {
  const hasQ = path.includes('?');
  const url = base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
  if (!params || Object.keys(params).length === 0) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    qs.set(k, String(v));
  }
  return url + (hasQ ? '&' : '?') + qs.toString();
}

async function fetchRaw(
  url: string,
  opts: { headers?: Record<string, string>; timeoutMs?: number; retries?: number; retryDelayMs?: number; body?: any; method?: 'GET'|'POST' } = {}
): Promise<Response> {
  const { headers = {}, timeoutMs = 12000, retries = 1, retryDelayMs = 600, body, method = 'GET' } = opts;
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: ac.signal, method, body });
      clearTimeout(id);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        if (res.status === 429 && attempt < retries) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }
        throw new HttpError(res.status, url, text);
      }
      return res;
    } catch (e) {
      clearTimeout(id);
      lastErr = e;
      if (attempt < retries) { await sleep(retryDelayMs * (attempt + 1)); continue; }
    }
  }
  throw lastErr;
}

async function fetchJSON<T = any>(
  url: string,
  opts: { headers?: Record<string, string>; timeoutMs?: number; retries?: number; retryDelayMs?: number; body?: any; method?: 'GET'|'POST' } = {}
): Promise<T> {
  const res = await fetchRaw(url, opts);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) return res.json() as Promise<T>;
  const text = await res.text();
  try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
}

function ensureNonEmpty(obj: any, label: string) {
  if (obj == null) console.error(`${label}: empty response`);
  if (Array.isArray(obj) && obj.length === 0) console.error(`${label}: empty array`);
  if (typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length === 0)
    console.error(`${label}: empty object`);
}

function normalizeSymbol(q: string) { return q.trim().toLowerCase(); }

function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((s) => s.trim());
  const out: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((s) => s.trim());
    const row: any = {};
    header.forEach((h, idx) => { row[h] = cols[idx]; });
    out.push(row);
  }
  return out;
}

function parseRssSimple(xml: string, source: string, limit = 20): NewsItem[] {
  const items: NewsItem[] = [];
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of chunks) {
    const item = raw.split(/<\/item>/i)[0] || '';
    const get = (tag: string) => {
      const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : undefined;
    };
    const title = get('title'); const link = get('link') || get('guid'); const pub = get('pubDate') || get('updated') || get('dc:date');
    if (title && link) items.push({ title, link, publishedAt: pub, source });
    if ((items?.length || 0) >= limit) break;
  }
  return items;
}

/* ===================== BASE RESOURCES ===================== */

export const resources: CryptoResource[] = [
  // Market
  { id: 'coinpaprika', category: 'market', name: 'CoinPaprika', baseUrl: 'https://api.coinpaprika.com/v1', free: true, endpoints: {
      search: { path: '/search', sampleParams: { q: 'bitcoin', c: 'currencies', limit: 1 } },
      tickerById: { path: '/tickers/{id}', sampleParams: { quotes: 'USD' } },
  }},
  { id: 'coincap', category: 'market', name: 'CoinCap', baseUrl: 'https://api.coincap.io/v2', free: true, endpoints: {
      assets: { path: '/assets', sampleParams: { search: 'bitcoin', limit: 1 } },
      assetById: { path: '/assets/{id}' },
  }},
  { id: 'coingecko', category: 'market', name: 'CoinGecko', baseUrl: 'https://api.coingecko.com/api/v3', free: true, endpoints: {
      simplePrice: { path: '/simple/price?ids={ids}&vs_currencies={fiats}' },
  }},
  { id: 'defillama', category: 'market', name: 'DefiLlama (Prices)', baseUrl: 'https://coins.llama.fi', free: true, endpoints: {
      pricesCurrent: { path: '/prices/current/{coins}' },
  }},
  { id: 'binance', category: 'market', name: 'Binance Public', baseUrl: 'https://api.binance.com', free: true, endpoints: {
      klines: { path: '/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}' },
      ticker: { path: '/api/v3/ticker/price?symbol={symbol}' },
  }},
  { id: 'cryptocompare', category: 'market', name: 'CryptoCompare', baseUrl: 'https://min-api.cryptocompare.com', free: true, endpoints: {
      histominute: { path: '/data/v2/histominute?fsym={fsym}&tsym={tsym}&limit={limit}&api_key=' + EMBEDDED_KEYS.CRYPTOCOMPARE },
      histohour: { path: '/data/v2/histohour?fsym={fsym}&tsym={tsym}&limit={limit}&api_key=' + EMBEDDED_KEYS.CRYPTOCOMPARE },
      histoday: { path: '/data/v2/histoday?fsym={fsym}&tsym={tsym}&limit={limit}&api_key=' + EMBEDDED_KEYS.CRYPTOCOMPARE },
  }},
  { id: 'cmc', category: 'market', name: 'CoinMarketCap', baseUrl: 'https://pro-api.coinmarketcap.com/v1', free: false, endpoints: {
      quotes: { path: '/cryptocurrency/quotes/latest?symbol={symbol}', authLocation: 'header', authName: 'X-CMC_PRO_API_KEY', authValue: EMBEDDED_KEYS.CMC },
  }},

  // News
  { id: 'coinstats_news', category: 'news', name: 'CoinStats News', baseUrl: 'https://api.coinstats.app', free: true, endpoints: { feed: { path: '/public/v1/news' } }},
  { id: 'cryptopanic', category: 'news', name: 'CryptoPanic', baseUrl: 'https://cryptopanic.com', free: true, endpoints: { public: { path: '/api/v1/posts/?public=true' } }},
  { id: 'rss_cointelegraph', category: 'news', name: 'Cointelegraph RSS', baseUrl: 'https://cointelegraph.com', free: true, endpoints: { feed: { path: '/rss' } }},
  { id: 'rss_coindesk', category: 'news', name: 'CoinDesk RSS', baseUrl: 'https://www.coindesk.com', free: true, endpoints: { feed: { path: '/arc/outboundfeeds/rss/?outputType=xml' } }},
  { id: 'rss_decrypt', category: 'news', name: 'Decrypt RSS', baseUrl: 'https://decrypt.co', free: true, endpoints: { feed: { path: '/feed' } }},

  // Sentiment / F&G
  { id: 'altme_fng', category: 'sentiment', name: 'Alternative.me F&G', baseUrl: 'https://api.alternative.me', free: true, endpoints: {
      latest:  { path: '/fng/', sampleParams: { limit: 1 } },
      history: { path: '/fng/', sampleParams: { limit: 30 } },
  }},
  { id: 'cfgi_v1', category: 'sentiment', name: 'CFGI API v1', baseUrl: 'https://api.cfgi.io', free: true, endpoints: {
      latest: { path: '/v1/fear-greed' },
  }},
  { id: 'cfgi_legacy', category: 'sentiment', name: 'CFGI Legacy', baseUrl: 'https://cfgi.io', free: true, endpoints: {
      latest: { path: '/api' },
  }},

  // On-chain / explorers
  { id: 'etherscan_primary', category: 'block_explorer', name: 'Etherscan', baseUrl: 'https://api.etherscan.io/api', free: false, endpoints: {
      balance: { path: '/?module=account&action=balance&address={address}&tag=latest&apikey=' + EMBEDDED_KEYS.ETHERSCAN },
  }},
  { id: 'etherscan_backup', category: 'block_explorer', name: 'Etherscan Backup', baseUrl: 'https://api.etherscan.io/api', free: false, endpoints: {
      balance: { path: '/?module=account&action=balance&address={address}&tag=latest&apikey=' + EMBEDDED_KEYS.ETHERSCAN_BACKUP },
  }},
  { id: 'blockscout_eth', category: 'block_explorer', name: 'Blockscout (ETH)', baseUrl: 'https://eth.blockscout.com', free: true, endpoints: {
      balance: { path: '/api?module=account&action=balance&address={address}' },
  }},

  // HF Inference (for sentiment)
  { id: 'hf_model_cryptobert', category: 'hf', name: 'HF Inference cryptobert', baseUrl: 'https://api-inference.huggingface.co/models/ElKulako/cryptobert', free: true, endpoints: {
      classify: { path: '', method: 'POST', contentType: 'application/json' },
  }},
  { id: 'hf_model_kcryptobert', category: 'hf', name: 'HF Inference kk08/CryptoBERT', baseUrl: 'https://api-inference.huggingface.co/models/kk08/CryptoBERT', free: true, endpoints: {
      classify: { path: '', method: 'POST', contentType: 'application/json' },
  }},

  // Optional enrichers (not used unless keys provided)
  { id: 'messari', category: 'market', name: 'Messari', baseUrl: 'https://data.messari.io/api/v1', free: true, endpoints: {
      asset: { path: '/assets/{slug}/metrics/market-data', authLocation: 'header', authName: 'x-messari-api-key', authValue: EMBEDDED_KEYS.MESSARI },
  }},
  { id: 'coinmetrics', category: 'market', name: 'CoinMetrics Community', baseUrl: 'https://community-api.coinmetrics.io/v4', free: true, endpoints: {
      assetMetrics: { path: '/timeseries/asset-metrics?assets={asset}&metrics={metrics}&start_time={start}&end_time={end}&frequency={freq}', authLocation: 'header', authName: 'Authorization', authValue: EMBEDDED_KEYS.COINMETRICS ? `Bearer ${EMBEDDED_KEYS.COINMETRICS}` : '' },
  }},
];

/* ===================== HF CATALOG (150+ CSV endpoints) ===================== */

type TF = '1m'|'5m'|'15m'|'30m'|'1h'|'4h'|'1d';
const TF_LIST: TF[] = ['1m','5m','15m','30m','1h','4h','1d'];

const HF_BASE_LINXY = 'https://huggingface.co/datasets/linxy/CryptoCoin/resolve/main';
const HF_BASE_WF = {
  BTC: 'https://huggingface.co/datasets/WinkingFace/CryptoLM-Bitcoin-BTC-USDT/resolve/main',
  ETH: 'https://huggingface.co/datasets/WinkingFace/CryptoLM-Ethereum-ETH-USDT/resolve/main',
};

const SYMBOLS_26 = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','TRXUSDT','TONUSDT','AVAXUSDT',
  'SHIBUSDT','DOTUSDT','MATICUSDT','LINKUSDT','LTCUSDT','BCHUSDT','NEARUSDT','ATOMUSDT','XLMUSDT','ETCUSDT',
  'FILUSDT','ICPUSDT','APTUSDT','SUIUSDT','ARBUSDT','OPUSDT',
];

export type HfSource = { id: string; url: string; symbol: string; timeframe?: TF; family: 'linxy'|'winkingface' };

function buildLinxyEntries(): HfSource[] {
  const out: HfSource[] = [];
  for (const sym of SYMBOLS_26) {
    for (const tf of TF_LIST) {
      out.push({
        id: `hf-${sym}-${tf}`,
        url: `${HF_BASE_LINXY}/${sym}_${tf}.csv`,
        symbol: sym,
        timeframe: tf,
        family: 'linxy',
      });
    }
  }
  return out;
}

function buildWfEntries(): HfSource[] {
  return [
    { id: 'hf-wf-btc-data', url: `${HF_BASE_WF.BTC}/data.csv`, symbol: 'BTCUSDT', family: 'winkingface' },
    { id: 'hf-wf-btc-1h',   url: `${HF_BASE_WF.BTC}/BTCUSDT_1h.csv`, symbol: 'BTCUSDT', timeframe: '1h', family: 'winkingface' },
    { id: 'hf-wf-eth-data', url: `${HF_BASE_WF.ETH}/data.csv`, symbol: 'ETHUSDT', family: 'winkingface' },
    { id: 'hf-wf-eth-1h',   url: `${HF_BASE_WF.ETH}/ETHUSDT_1h.csv`, symbol: 'ETHUSDT', timeframe: '1h', family: 'winkingface' },
  ];
}

const HF_CATALOG: HfSource[] = [
  ...buildLinxyEntries(),   // 26 * 7 = 182
  ...buildWfEntries(),      // +4 = 186
];

export function getHFSourcesCount(): number { return HF_CATALOG.length; }
export function listHFSources(symbol?: string): HfSource[] {
  const s = symbol?.toUpperCase();
  return s ? HF_CATALOG.filter(x => x.symbol === s) : HF_CATALOG.slice();
}

/* ===================== GENERIC HELPERS ===================== */

function getRes(id: string) { const r = resources.find((x) => x.id === id); if (!r) console.error(`resource not found: ${id}`); return r; }
export function getResourcesByCategory(category: Category): CryptoResource[] { return resources.filter((r) => r.category === category); }

export async function callResource(resource: CryptoResource, endpointKey: string, params: Record<string, any> = {}) {
  const ep = resource.endpoints?.[endpointKey];
  if (!ep) console.error(`endpoint not found: ${resource.id}.${endpointKey}`);
  let path = ep.path.replace(/{(\w+)}/g, (_, k) => {
    const v = params[k];
    if (v == null) console.error(`missing path param: ${k}`);
    delete params[k];
    return String(v);
  });
  const headers: Record<string, string> = {};
  if (ep.authLocation === 'header' && ep.authName && ep.authValue) headers[ep.authName] = ep.authValue;
  const queryParams = { ...params };
  if (ep.authLocation === 'query' && ep.authName && ep.authValue) queryParams[ep.authName] = ep.authValue;
  const url = buildURL(resource.baseUrl, path, queryParams);
  const method = ep.method || 'GET';
  const data = await fetchJSON<any>(url, { headers, retries: 1, method, body: method === 'POST' ? (ep.contentType?.includes('json') ? JSON.stringify(params.body ?? {}) : params.body) : undefined });
  ensureNonEmpty(data, `${resource.name} ${endpointKey}`);
  return data;
}

/* ===================== MARKET ===================== */

async function tryCoinPaprika(query: string): Promise<MarketQuote | null> {
  const base = getRes('coinpaprika');
  const q = normalizeSymbol(query);
  let id = q.includes('-') ? q : undefined;
  if (!id) {
    const s = await fetchJSON<any>(buildURL(base.baseUrl, base.endpoints!.search.path, { q, c: 'currencies', limit: 1 }), { retries: 1 });
    id = s?.currencies?.[0]?.id; if (!id) return null;
  }
  const j = await fetchJSON<any>(buildURL(base.baseUrl, base.endpoints!.tickerById.path.replace('{id}', id), { quotes: 'USD' }), { retries: 1 });
  const price = j?.quotes?.USD?.price; if (typeof price !== 'number') return null;
  return { id, symbol: j?.symbol ?? '', name: j?.name ?? id, price, change24h: j?.quotes?.USD?.percent_change_24h, marketCap: j?.quotes?.USD?.market_cap, source: 'CoinPaprika', raw: j };
}

async function tryCoinCap(query: string): Promise<MarketQuote | null> {
  const base = getRes('coincap'); const q = normalizeSymbol(query);
  const res = await fetchJSON<any>(buildURL(base.baseUrl, base.endpoints!.assets.path, { search: q, limit: 1 }), { retries: 1 });
  let a = res?.data?.[0];
  if (!a) { const direct = await fetchJSON<any>(buildURL(base.baseUrl, base.endpoints!.assetById.path.replace('{id}', q)), { retries: 1 }).catch(() => null); a = direct?.data; if (!a) return null; }
  return { id: a.id, symbol: a.symbol, name: a.name, price: Number(a.priceUsd), change24h: Number(a.changePercent24Hr), marketCap: Number(a.marketCapUsd), source: 'CoinCap', raw: res };
}

const COINGECKO_IDS: Record<string, string> = { btc: 'bitcoin', bitcoin: 'bitcoin', eth: 'ethereum', ethereum: 'ethereum', sol: 'solana', solana: 'solana', xrp: 'ripple', ripple: 'ripple' };
async function tryDefiLlama(query: string): Promise<MarketQuote | null> {
  const base = getRes('defillama'); const key = COINGECKO_IDS[normalizeSymbol(query)] || normalizeSymbol(query);
  const url = buildURL(base.baseUrl, base.endpoints!.pricesCurrent.path.replace('{coins}', `coingecko:${key}`));
  const data = await fetchJSON<any>(url, { retries: 1 }).catch(() => null);
  const price = data?.coins?.[`coingecko:${key}`]?.price; if (typeof price !== 'number') return null;
  return { id: key, symbol: key.toUpperCase(), name: key, price, source: 'DefiLlama', raw: data };
}

async function tryCoinGeckoSimple(query: string): Promise<MarketQuote | null> {
  const base = getRes('coingecko');
  const id = COINGECKO_IDS[normalizeSymbol(query)] || normalizeSymbol(query);
  const data = await fetchJSON<any>(buildURL(base.baseUrl, base.endpoints!.simplePrice.path.replace('{ids}', id).replace('{fiats}', 'usd')), { retries: 1 }).catch(()=>null);
  const price = data?.[id]?.usd;
  if (typeof price !== 'number') return null;
  return { id, symbol: id.toUpperCase(), name: id, price, source: 'CoinGecko', raw: data };
}

export async function getMarketData(query: string, opts: { providers?: Array<'coinpaprika' | 'coincap' | 'defillama' | 'coingecko'> } = {}): Promise<MarketQuote> {
  // Default order: CoinGecko first (most reliable), then DefiLlama
  // CoinPaprika and CoinCap disabled - tested and confirmed returning empty results
  const order = opts.providers ?? ['coingecko', 'defillama'];
  const errors: any[] = [];
  const trials: Array<() => Promise<MarketQuote | null>> = (order || []).map((p) => {
    if (p === 'coinpaprika') return () => tryCoinPaprika(query);
    if (p === 'coincap') return () => tryCoinCap(query);
    if (p === 'coingecko') return () => tryCoinGeckoSimple(query);
    if (p === 'defillama') return () => tryDefiLlama(query);
    return async () => null;
  });
  for (const t of trials) { try { const out = await t(); if (out) return out; } catch (e) { errors.push(e); } }
  console.error(`market providers failed for "${query}": ${(errors || []).map((e: any) => e?.message).join(' | ')}`);
}

/* ===================== OHLCV (HF-first with 150+ sources) ===================== */

function tfToBinance(tf: TF): string {
  const m: Record<TF, string> = { '1m':'1m','5m':'5m','15m':'15m','30m':'30m','1h':'1h','4h':'4h','1d':'1d' };
  return m[tf] || '1h';
}
function splitSymbol(sym: string) {
  const m = sym.toUpperCase().match(/^([A-Z0-9]{2,10})(USDT|USD|USDC|BTC|ETH)$/);
  if (m) return { fsym: m[1], tsym: m[2] };
  return { fsym: sym.slice(0,3).toUpperCase(), tsym: 'USDT' };
}

async function tryHF(symbol: string, timeframe: TF, limit = 1000): Promise<OHLCVRow[] | null> {
  const s = symbol.toUpperCase();
  const candidates = HF_CATALOG.filter(x => x.symbol === s && (!x.timeframe || x.timeframe === timeframe));
  for (const c of candidates) {
    try {
      const res = await fetchRaw(c.url, { retries: 0, timeoutMs: 9000 });
      const text = await res.text();
      const rows = parseCSV(text);
      if (!rows.length) continue;
      const out: OHLCVRow[] = (rows || []).map((x: any) => {
        const tRaw = x['timestamp'] ?? x['Open time'] ?? x['time'] ?? x['date'];
        const tNum = Number(tRaw);
        const ts = Number.isFinite(tNum) ? tNum : Date.parse(String(tRaw));
        return {
          timestamp: ts,
          open: Number(x.open ?? x.Open),
          high: Number(x.high ?? x.High),
          low: Number(x.low ?? x.Low),
          close: Number(x.close ?? x.Close),
          volume: Number(x.volume ?? x.Volume ?? x.volumefrom ?? x.volumeto ?? 0),
        };
      }).filter(r => Number.isFinite(r.open) && Number.isFinite(r.close));
      if (out.length) return out.slice(-limit);
    } catch {}
  }
  return null;
}

async function tryBinance(symbol: string, timeframe: TF, limit = 1000): Promise<OHLCVRow[] | null> {
  const r = getRes('binance');
  const url = buildURL(r.baseUrl, r.endpoints!.klines.path, { symbol: symbol.toUpperCase(), interval: tfToBinance(timeframe), limit: Math.min(limit, 1000) });
  const data = await fetchJSON<any>(url, { retries: 1 }).catch(() => null); if (!data || !Array.isArray(data)) return null;
  return (data || []).map((k: any[]) => ({ timestamp: k[0], open: Number(k[1]), high: Number(k[2]), low: Number(k[3]), close: Number(k[4]), volume: Number(k[5]) }));
}

async function tryCryptoCompare(symbol: string, timeframe: TF, limit = 1000): Promise<OHLCVRow[] | null> {
  const { fsym, tsym } = splitSymbol(symbol);
  const cc = getRes('cryptocompare');
  const ep = ((): 'histominute'|'histohour'|'histoday' => {
    if (['1m','5m','15m','30m'].includes(timeframe)) return 'histominute';
    if (['1h','4h'].includes(timeframe)) return 'histohour';
    return 'histoday';
  })();
  const data = await fetchJSON<any>(buildURL(cc.baseUrl, cc.endpoints![ep].path.replace('{fsym}', fsym).replace('{tsym}', tsym).replace('{limit}', String(Math.min(limit, 2000)))), { retries: 1 }).catch(() => null);
  const arr = data?.Data?.Data || data?.Data;
  if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
  return (arr || []).map((x: any) => ({
    timestamp: (x.time ?? x.time_close ?? x.time_open) * 1000,
    open: Number(x.open), high: Number(x.high), low: Number(x.low), close: Number(x.close), volume: Number(x.volumefrom ?? x.volume ?? x.volumeto ?? 0),
  }));
}

export async function getOHLCV(symbol: string, timeframe: TF = '1h', limit = 1000): Promise<OHLCVRow[]> {
  const errors: any[] = [];
  const tries: Array<() => Promise<OHLCVRow[] | null>> = [
    () => tryHF(symbol, timeframe, limit),
    () => tryBinance(symbol, timeframe, limit),
    () => tryCryptoCompare(symbol, timeframe, limit),
  ];
  for (const t of tries) {
    try { const out = await t(); if (out && out.length) return out.slice(-limit); }
    catch (e) { errors.push(e); }
  }
  console.error(`OHLCV failed for ${symbol} ${timeframe}. Errors: ${(errors || []).map((e: any) => e?.message).join(' | ')}`);
}

/* ===================== HF SENTIMENT (with HF token) ===================== */

const HF_MODELS = ['hf_model_cryptobert','hf_model_kcryptobert'] as const;

async function hfClassify(modelResId: typeof HF_MODELS[number], texts: string[]): Promise<any[] | null> {
  const r = getRes(modelResId); const ep = r.endpoints!.classify;
  const headers: Record<string,string> = { 'Content-Type': ep.contentType || 'application/json' };
  if (EMBEDDED_KEYS.HUGGINGFACE) headers['Authorization'] = `Bearer ${EMBEDDED_KEYS.HUGGINGFACE}`;
  const body = JSON.stringify({ inputs: texts });
  const out = await fetchJSON<any>(r.baseUrl + ep.path, { method: 'POST', headers, body, retries: 0, timeoutMs: 15000 }).catch(() => null);
  if (!out) return null;
  if (Array.isArray(out) && Array.isArray(out[0])) return out[0] as any[];
  if (Array.isArray(out)) return out as any[];
  return null;
}

function lexiconSentiment(texts: string[]): { score: number; perText: number[] } {
  const pos = ['moon','pump','bull','breakout','strong','surge','green','buy','long','win','optimistic'];
  const neg = ['dump','bear','crash','weak','sell','short','red','fear','capitulation','loss','panic'];
  const per: number[] = [];
  for (const t of texts) {
    const s = (t || '').toLowerCase();
    let v = 0;
    for (const w of pos) if (s.includes(w)) v += 1;
    for (const w of neg) if (s.includes(w)) v -= 1;
    per.push(Math.max(-1, Math.min(1, v / 3)));
  }
  const score = per.reduce((a,b)=>a+b,0) / Math.max(1, per.length);
  return { score, perText: per };
}

export async function analyzeSentiment(texts: string[]): Promise<{ vote: number; models: string[]; raw: any }> {
  if (!texts || texts.length === 0) return { vote: 0, models: [], raw: [] };
  const results: Record<string, any> = {};
  const votes: number[] = [];
  for (const mid of HF_MODELS) {
    const out = await hfClassify(mid, texts).catch(() => null);
    if (out) {
      results[mid] = out;
      const mapped = (out || []).map((r: any) => {
        const label = String(r?.label ?? '').toLowerCase();
        const score = Number(r?.score ?? 0);
        if (label.includes('bull') || label.includes('pos') || label.includes('label_1')) return +score;
        if (label.includes('bear') || label.includes('neg') || label.includes('label_0')) return -score;
        return 0;
      });
      const v = mapped.reduce((a:number,b:number)=>a+b,0) / Math.max(1, mapped.length);
      votes.push(v);
    }
  }
  if (!votes.length) {
    const lx = lexiconSentiment(texts);
    return { vote: lx.score, models: ['lexicon-fallback'], raw: results };
  }
  const vote = votes.reduce((a,b)=>a+b,0) / votes.length;
  return { vote, models: HF_MODELS as unknown as string[], raw: results };
}

/* ===================== NEWS ===================== */

export async function getNews(opts: { limit?: number } = {}): Promise<NewsItem[]> {
  const limit = Math.max(1, Math.min(50, opts.limit ?? 20));
  const out: NewsItem[] = [];
  try {
    const r = getRes('coinstats_news');
    const j = await fetchJSON<any>(buildURL(r.baseUrl, r.endpoints!.feed.path), { retries: 1 });
    const list: NewsItem[] = j?.news?.map((n: any) => ({
      title: n.title, link: n.link || n.url, publishedAt: n.feedDate ? new Date(n.feedDate).toISOString() : undefined, source: n.source || 'CoinStats',
    })) || [];
    out.push(...list);
  } catch {}
  try {
    const r = getRes('cryptopanic');
    const j = await fetchJSON<any>(buildURL(r.baseUrl, r.endpoints!.public.path), { retries: 1 });
    const list: NewsItem[] = j?.results?.map((n: any) => ({
      title: n.title, link: n.url, publishedAt: n.published_at, source: n.source?.title || 'CryptoPanic',
    })) || [];
    out.push(...list);
  } catch {}
  const feeds = [
    { id: 'rss_cointelegraph', source: 'Cointelegraph' },
    { id: 'rss_coindesk', source: 'CoinDesk' },
    { id: 'rss_decrypt', source: 'Decrypt' },
  ];
  for (const f of feeds) {
    if ((out?.length || 0) >= limit) break;
    try {
      const r = getRes(f.id);
      const xml = await fetchJSON<string>(buildURL(r.baseUrl, r.endpoints!.feed.path), { retries: 1 });
      out.push(...parseRssSimple(String(xml), f.source, limit));
    } catch {}
  }
  return out.slice(0, limit);
}

/* ===================== FEAR & GREED ===================== */

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function clamp100(x: number) { return Math.max(0, Math.min(100, x)); }
function classifyFNG(value: number): string {
  const v = clamp100(Number(value));
  if (v <= 24) return 'Extreme Fear';
  if (v <= 44) return 'Fear';
  if (v <= 55) return 'Neutral';
  if (v <= 74) return 'Greed';
  return 'Extreme Greed';
}

function extractAnyScore(obj: any): number | null {
  if (obj == null) return null;
  const cand: number[] = [];
  const scan = (o: any) => {
    if (!o || typeof o !== 'object') return;
    for (const [, v] of Object.entries(o)) {
      if (typeof v === 'number' && v >= 0 && v <= 100) cand.push(v);
      else if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v)) { const n = Number(v); if (n >= 0 && n <= 100) cand.push(n); }
      else if (typeof v === 'object') scan(v);
    }
  };
  scan(obj);
  if (!cand?.length) return 0;
  cand.sort((a,b)=>a-b);
  return cand[Math.floor(cand.length/2)];
}

export async function getFearGreedAgg(): Promise<{ value: number; classification: string; sources: FNGPoint[] }> {
  const sources: FNGPoint[] = [];
  try {
    const r = getRes('altme_fng');
    const j = await fetchJSON<any>(buildURL(r.baseUrl, r.endpoints!.latest.path, { limit: 1 }), { retries: 1, timeoutMs: 8000 });
    const rec = j?.data?.[0];
    if (rec) {
      const v = Number(rec.value);
      sources.push({ value: v, classification: classifyFNG(v), at: rec.timestamp ? new Date(Number(rec.timestamp) * 1000).toISOString() : undefined, source: 'Alternative.me', raw: j });
    }
  } catch {}
  try {
    const r = getRes('cfgi_v1'); const j = await fetchJSON<any>(buildURL(r.baseUrl, r.endpoints!.latest.path), { retries: 1, timeoutMs: 8000 });
    const v = extractAnyScore(j); if (v != null) sources.push({ value: v, classification: classifyFNG(v), source: 'CFGI v1', raw: j });
  } catch {}
  try {
    const r = getRes('cfgi_legacy'); const j = await fetchJSON<any>(buildURL(r.baseUrl, r.endpoints!.latest.path), { retries: 1, timeoutMs: 8000 });
    const v = extractAnyScore(j); if (v != null) sources.push({ value: v, classification: classifyFNG(v), source: 'CFGI Legacy', raw: j });
  } catch {}

  if (!sources.length) return { value: 50, classification: classifyFNG(50), sources: [{ value: 50, classification: 'Neutral', source: 'Synthetic-Fallback' }] };
  const values = (sources || []).map(s=>s.value).sort((a,b)=>a-b);
  const median = values[Math.floor(values.length/2)];
  return { value: median, classification: classifyFNG(median), sources };
}

/* ---------- Synthetic Fear & Greed fallback ---------- */

function rollingStd(arr: number[], win: number): number[] {
  const out: number[] = new Array(arr.length).fill(NaN);
  for (let i=win-1; i<arr.length; i++){
    const slice = arr.slice(i-win+1, i+1);
    const m = slice.reduce((a,b)=>a+b,0)/slice.length;
    const v = slice.reduce((a,b)=>a+(b-m)*(b-m),0)/slice.length;
    out[i] = Math.sqrt(v);
  }
  return out;
}

export async function getSyntheticFNG(symbol = 'BTCUSDT', timeframe: TF = '1h', bars = 300): Promise<FNGPoint> {
  const ohlcv = await getOHLCV(symbol, timeframe, bars).catch(() => []);
  if (!ohlcv.length) {
    return { value: 50, classification: 'Neutral', source: 'Synthetic-Fallback', raw: {} };
  }
  const c = (ohlcv || []).map(r => Number(r.close));
  const v = (ohlcv || []).map(r => Number(r.volume));
  const n = c.length;

  const k1 = 24;
  const roc = n > k1 ? (c[n-1] - c[n-1-k1]) / Math.max(c[n-1-k1], 1e-9) : 0;
  const mom = clamp01((roc + 0.1) / 0.2);

  const rets: number[] = [];
  for (let i=1;i<n;i++) rets.push(Math.log(c[i]/c[i-1] || 1));
  const volArr = rollingStd(rets, Math.min(50, rets.length));
  const vol = volArr[volArr.length-1] || 0;
  const volScaled = clamp01(1 - Math.min(1, vol / 0.02));

  const meanVol = v.slice(-50).reduce((a,b)=>a+b,0) / Math.max(1, Math.min(50, v.length));
  const volPress = clamp01(((v[n-1] / Math.max(meanVol,1e-9)) - 1) / 2);

  let headlines: string[] = [];
  try {
    const news = await getNews({ limit: 15 });
    headlines = (news || []).map(x => x.title).filter(Boolean);
  } catch {}
  const posWords = ['moon','pump','bull','breakout','strong','surge','green','buy','long','win','optimistic'];
  const negWords = ['dump','bear','crash','weak','sell','short','red','fear','capitulation','loss','panic'];
  const sentiScore = (() => {
    if (!headlines.length) return 0;
    let s = 0;
    for (const t of headlines) {
      const l = t.toLowerCase();
      for (const w of posWords) if (l.includes(w)) s += 1;
      for (const w of negWords) if (l.includes(w)) s -= 1;
    }
    const avg = s / Math.max(1, headlines.length * 3);
    return Math.max(-1, Math.min(1, avg));
  })();
  const sentiScaled = clamp01((sentiScore + 1) / 2);

  const w = { momentum: 0.35, volatility: 0.30, sentiment: 0.20, volume: 0.15 };
  const score01 = w.momentum*mom + w.volatility*volScaled + w.sentiment*sentiScaled + w.volume*volPress;
  const value = Math.round(clamp100(score01 * 100));
  return { value, classification: classifyFNG(value), source: 'Synthetic', raw: { roc, vol, volPress, senti: sentiScore } };
}

export async function getFearGreedAggPlus(symbol = 'BTCUSDT'): Promise<{ value: number; classification: string; sources: FNGPoint[] }> {
  try {
    const agg = await getFearGreedAgg();
    return agg;
  } catch {
    const syn = await getSyntheticFNG(symbol).catch(() => ({ value: 50, classification: 'Neutral', source: 'Synthetic-Fallback' } as FNGPoint));
    const sources = [syn];
    // Optional enrichers if keys are present
    try {
      if (EMBEDDED_KEYS.MESSARI) {
        const slug = (normalizeSymbol(symbol).startsWith('eth')) ? 'ethereum' : 'bitcoin';
        const r = getRes('messari');
        const data = await fetchJSON<any>(buildURL(r.baseUrl, r.endpoints!.asset.path.replace('{slug}', slug)), {
          retries: 1, headers: { 'x-messari-api-key': EMBEDDED_KEYS.MESSARI }
        });
        const volUsd = data?.data?.market_data?.real_volume_last_24_hours ?? 0;
        const adj = clamp01(Math.tanh((volUsd || 0) / 1e9));
        const boost = Math.round(clamp100(syn.value * (0.9 + 0.1*adj)));
        return { value: boost, classification: classifyFNG(boost), sources: [syn, { value: adj*100, classification: classifyFNG(adj*100), source: 'Messari-vol', raw: volUsd }] };
      }
    } catch {}
    try {
      if (EMBEDDED_KEYS.COINMETRICS) {
        const asset = (normalizeSymbol(symbol).startsWith('eth')) ? 'eth' : 'btc';
        const r = getRes('coinmetrics');
        const url = buildURL(r.baseUrl, r.endpoints!.assetMetrics.path
          .replace('{asset}', asset)
          .replace('{metrics}', 'PriceUSD')
          .replace('{start}', new Date(Date.now() - 24*3600e3).toISOString())
          .replace('{end}', new Date().toISOString())
          .replace('{freq}', '1h'));
        const cm = await fetchJSON<any>(url, { retries: 1, headers: r.endpoints!.assetMetrics.authValue ? { Authorization: r.endpoints!.assetMetrics.authValue! } : {} });
        const arr = cm?.data || [];
        const last = arr[arr.length-1], prev = arr[arr.length-2];
        const price = Number(last?.values?.[0]); const pricePrev = Number(prev?.values?.[0]);
        const mom = clamp01(((price - pricePrev) / Math.max(pricePrev, 1e-9) + 0.1) / 0.2);
        const val = Math.round(clamp100(0.7*syn.value + 30*mom));
        sources.push({ value: val, classification: classifyFNG(val), source: 'CoinMetrics-mom', raw: cm });
        return { value: val, classification: classifyFNG(val), sources };
      }
    } catch {}
    return { value: syn.value, classification: syn.classification, sources: [syn] };
  }
}

/* ===================== ON-CHAIN helpers ===================== */

export async function getEthBalance(address: string): Promise<{ wei: string; source: string; raw: any }> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) console.error('invalid address');
  try { const j = await callResource(getRes('etherscan_primary'), 'balance', { address }); const wei = j?.result; if (wei) return { wei, source: 'Etherscan', raw: j }; } catch {}
  try { const j = await callResource(getRes('etherscan_backup'), 'balance', { address }); const wei = j?.result; if (wei) return { wei, source: 'Etherscan Backup', raw: j }; } catch {}
  const j = await callResource(getRes('blockscout_eth'), 'balance', { address }); const wei = j?.result; if (!wei) console.error('empty'); return { wei, source: 'Blockscout', raw: j };
}

/* ===================== HEALTH / DIAGNOSTICS ===================== */

export async function pingAll(): Promise<Array<{ id: string; name: string; ok: boolean; note?: string; elapsedMs?: number }>> {
  const checks: Array<Promise<{ id: string; name: string; ok: boolean; note?: string; elapsedMs?: number }>> = [];
  const add = (id: string, fn: () => Promise<boolean>) => {
    checks.push((async () => {
      const res = resources.find(r=>r.id===id);
      const t0 = Date.now();
      try { const ok = await fn(); return { id, name: res?.name || id, ok, elapsedMs: Date.now() - t0 }; }
      catch (e: any) { return { id, name: res?.name || id, ok: false, note: e?.message, elapsedMs: Date.now() - t0 }; }
    })());
  };
  add('coinpaprika', async () => {
    const j = await fetchJSON<any>(buildURL(getRes('coinpaprika').baseUrl, getRes('coinpaprika').endpoints!.tickerById.path.replace('{id}','btc-bitcoin'), { quotes: 'USD' }), { timeoutMs: 7000 });
    return typeof j?.quotes?.USD?.price === 'number';
  });
  add('coincap', async () => {
    const j = await fetchJSON<any>(buildURL(getRes('coincap').baseUrl, getRes('coincap').endpoints!.assetById.path.replace('{id}','bitcoin')), { timeoutMs: 7000 });
    return Number(j?.data?.priceUsd) > 0;
  });
  add('coingecko', async () => {
    const j = await fetchJSON<any>(buildURL(getRes('coingecko').baseUrl, getRes('coingecko').endpoints!.simplePrice.path.replace('{ids}','bitcoin').replace('{fiats}','usd')), { timeoutMs: 7000 });
    return Number(j?.bitcoin?.usd) > 0;
  });
  // HF reachability (one CSV file)
  add('hf_linxy_any', async () => {
    const sample = listHFSources().find(x => x.family === 'linxy');
    if (!sample) return false;
    const r = await fetchRaw(sample.url, { timeoutMs: 7000 }).catch(() => null);
    return !!r;
  });
  add('binance', async () => {
    const j = await fetchJSON<any>(buildURL(getRes('binance').baseUrl, getRes('binance').endpoints!.ticker.path, { symbol: 'BTCUSDT' }), { timeoutMs: 7000 });
    return Number(j?.price) > 0;
  });
  add('altme_fng', async () => {
    const j = await fetchJSON<any>(buildURL(getRes('altme_fng').baseUrl, getRes('altme_fng').endpoints!.latest.path, { limit: 1 }), { timeoutMs: 7000 });
    return Array.isArray(j?.data) && (j.data?.length || 0) > 0;
  });
  // Hugging Face inference health (uses embedded token if present)
  add('hf_inference_cryptobert', async () => {
    try {
      const r = getRes('hf_model_cryptobert');
      const ep = r.endpoints!.classify;
      const headers: Record<string,string> = { 'Content-Type': ep.contentType || 'application/json' };
      if (EMBEDDED_KEYS.HUGGINGFACE) headers['Authorization'] = `Bearer ${EMBEDDED_KEYS.HUGGINGFACE}`;
      const body = JSON.stringify({ inputs: ['BTC to the moon'] });
      const out = await fetchJSON<any>(r.baseUrl + ep.path, { method: 'POST', headers, body, retries: 0, timeoutMs: 10000 }).catch(() => null);
      const arr = Array.isArray(out) ? (Array.isArray(out[0]) ? out[0] : out) : [];
      return Array.isArray(arr) && (arr?.length || 0) > 0 && typeof arr[0]?.label === 'string';
    } catch { return false; }
  });
  return Promise.all(checks);
}

/* ===================== QUICK EXAMPLES ===================== */
// (uncomment to test in Node >= 18)
// (async () => {
//   console.log('HF sources count:', getHFSourcesCount()); // ≥186
//   console.log('First 3 HF sources:', listHFSources().slice(0,3));
//   console.log(await pingAll());
//   console.log(await getMarketData('bitcoin'));
//   console.log((await getOHLCV('BTCUSDT','1h',300)).slice(-2));
//   console.log(await analyzeSentiment(['BTC pumps', 'ETH dumps']));
//   console.log(await getFearGreedAggPlus('BTCUSDT'));
// })();
