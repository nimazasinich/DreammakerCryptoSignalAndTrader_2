/**
 * Centralized Endpoint Configuration
 * Single source of truth for all API URLs and WebSocket connections
 */

// Helper to get environment variables (works in both browser and Node.js)
const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return String(import.meta.env[key] ?? '');
  }
  if (typeof process !== 'undefined' && process.env) {
    return String(process.env[key] ?? '');
  }
  return '';
};

// ============================================================================
// Backend API Configuration
// ============================================================================

export const BACKEND_CONFIG = {
  // Default backend runs on port 8001
  base: getEnv('VITE_API_BASE') || getEnv('VITE_API_URL') || 'http://localhost:8001',
  ws: getEnv('VITE_WS_BASE') || getEnv('VITE_WS_URL') || 'ws://localhost:8001',
  timeout: 10000,
} as const;

// ============================================================================
// HuggingFace Space Configuration (Remote)
// ============================================================================

export const HUGGINGFACE_CONFIG = {
  // HuggingFace Space URL - this is REMOTE, not localhost
  base: getEnv('VITE_HF_ENGINE_URL') || 
        getEnv('HF_ENGINE_BASE_URL') || 
        'https://really-amin-datasourceforcryptocurrency.hf.space',
  timeout: 15000,
  userAgent: 'DreammakerCryptoFrontend/1.0',
} as const;

// ============================================================================
// Direct Provider APIs (Emergency Fallback)
// ============================================================================

export const PROVIDER_CONFIG = {
  coingecko: {
    base: 'https://api.coingecko.com/api/v3',
    timeout: 10000,
  },
  cryptocompare: {
    base: 'https://min-api.cryptocompare.com/data',
    timeout: 10000,
  },
  binance: {
    base: 'https://api.binance.com/api/v3',
    timeout: 8000,
  },
} as const;

// ============================================================================
// Endpoint Definitions
// ============================================================================

export const ENDPOINTS = {
  // Backend API Endpoints (via port 8001)
  backend: {
    // Health & Status
    health: '/api/health',
    systemStatus: '/api/system/status',
    
    // Market Data
    prices: '/api/market/prices',
    marketData: '/api/market-data',
    candlestick: '/market/candlestick',
    ohlcv: '/market/ohlcv',
    
    // HuggingFace Integration (proxied through backend)
    hfHealth: '/api/hf/health',
    hfOHLCV: '/api/hf/ohlcv',
    hfPrices: '/api/market',
    hfMarketOverview: '/api/trending',
    hfProviders: '/api/providers',
    
    // AI & Analysis
    aiPredict: '/ai/predict',
    analysis: {
      harmonic: '/analysis/harmonic',
      elliott: '/analysis/elliott',
      smc: '/analysis/smc',
      sentiment: '/analysis/sentiment',
      whale: '/analysis/whale',
    },
    
    // Trading
    signals: '/api/signals',
    portfolio: '/api/portfolio',
    positions: '/api/positions',
    
    // Blockchain
    blockchainBalances: '/api/blockchain/balances',
    
    // WebSocket
    ws: '/ws',
  },

  // HuggingFace Space Direct Endpoints (as per CLIENT_SERVICES.md)
  huggingface: {
    health: '/api/health',
    info: '/info',
    prices: '/api/market',
    marketHistory: '/api/market/history',
    trending: '/api/trending',
    sentiment: '/api/sentiment',
    sentimentAnalyze: '/api/sentiment/analyze',
    news: '/api/news',
    newsLatest: '/api/news/latest',
    modelsStatus: '/api/models/status',
    modelsList: '/api/models/list',
    providers: '/api/providers',
    logsRecent: '/api/logs/recent',
    logsErrors: '/api/logs/errors',
  },

  // Direct Provider Endpoints (Emergency Fallback)
  providers: {
    coingecko: {
      prices: '/simple/price',
      trending: '/search/trending',
      marketChart: '/coins/{id}/market_chart',
    },
    cryptocompare: {
      price: '/price',
      priceMulti: '/pricemulti',
      historical: '/v2/histohour',
    },
    binance: {
      ticker24h: '/ticker/24hr',
      klines: '/klines',
    },
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build full URL for backend endpoint
 */
export function getBackendUrl(endpoint: string): string {
  const base = BACKEND_CONFIG.base.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Build WebSocket URL for backend
 */
export function getBackendWsUrl(path: string = '/ws'): string {
  const base = BACKEND_CONFIG.ws.replace(/\/$/, '');
  const wsPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${wsPath}`;
}

/**
 * Build full URL for HuggingFace Space endpoint
 */
export function getHuggingFaceUrl(endpoint: string): string {
  const base = HUGGINGFACE_CONFIG.base.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Build full URL for provider endpoint
 */
export function getProviderUrl(provider: 'coingecko' | 'cryptocompare' | 'binance', endpoint: string): string {
  const config = PROVIDER_CONFIG[provider];
  const base = config.base.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Get timeout for specific service
 */
export function getTimeout(service: 'backend' | 'huggingface' | 'provider'): number {
  switch (service) {
    case 'backend':
      return BACKEND_CONFIG.timeout;
    case 'huggingface':
      return HUGGINGFACE_CONFIG.timeout;
    case 'provider':
      return 10000;
    default:
      return 10000;
  }
}

// ============================================================================
// Connection Status Types
// ============================================================================

export interface ConnectionHealth {
  backend: boolean;
  huggingface: boolean;
  websocket: boolean;
  timestamp: number;
}

export interface DataSourceStatus {
  primary: 'backend' | 'huggingface' | 'provider' | 'offline';
  available: string[];
  degraded: boolean;
  message?: string;
}

// ============================================================================
// Export Configuration Summary
// ============================================================================

export const CONFIG_SUMMARY = {
  backend: {
    url: BACKEND_CONFIG.base,
    ws: BACKEND_CONFIG.ws,
    timeout: BACKEND_CONFIG.timeout,
  },
  huggingface: {
    url: HUGGINGFACE_CONFIG.base,
    timeout: HUGGINGFACE_CONFIG.timeout,
  },
  providers: {
    coingecko: PROVIDER_CONFIG.coingecko.base,
    cryptocompare: PROVIDER_CONFIG.cryptocompare.base,
    binance: PROVIDER_CONFIG.binance.base,
  },
} as const;

/**
 * Log configuration on startup (debug mode only)
 */
if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  console.log('🔧 Endpoint Configuration:', CONFIG_SUMMARY);
}

