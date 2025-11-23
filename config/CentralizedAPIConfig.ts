/**
 * Centralized API Configuration
 * تنظیمات متمرکز API - بر اساس api-config-complete.txt و api.txt
 *
 * This configuration provides comprehensive API management with:
 * - Multiple fallback sources for each API type
 * - CORS proxy support
 * - Rate limiting configuration
 * - Automatic resolution from env > config > api - Copy.txt > defaults
 * - Never fail - always have alternatives
 */

import { resolveAPIKey, resolveAPIEndpoint, resolveAPIConfig } from './apiSources';

export interface APIConfig {
  name: string;
  baseUrl: string;
  key?: string;
  headerKey?: string; // For APIs that require header authentication (e.g., CMC)
  method?: 'GET' | 'POST' | 'GRAPHQL';
  needsProxy?: boolean;
  rateLimit?: {
    requests: number;
    interval: number; // milliseconds
  };
  enabled?: boolean;
  timeout?: number;
}

export interface APICategory {
  primary: APIConfig;
  fallbacks: APIConfig[];
}

export interface CORSProxy {
  url: string;
  requiresOrigin?: boolean;
  method?: 'GET' | 'POST';
}

export interface CentralizedAPIConfig {
  corsProxies: CORSProxy[];
  blockExplorers: {
    ethereum: APICategory;
    bsc: APICategory;
    tron: APICategory;
  };
  marketData: APICategory;
  news: APICategory;
  sentiment: APICategory;
  whaleTracking: APICategory;
  onChainAnalytics: APICategory;
  rpcNodes: {
    ethereum: string[];
    bsc: string[];
    tron: string[];
    polygon: string[];
  };
}

/**
 * Complete API Configuration
 * Based on api-config-complete.txt and api.txt
 */
export const CentralizedAPIConfig: CentralizedAPIConfig = {
  // CORS Proxies - پروکسی‌های CORS
  corsProxies: [
    {
      url: 'https://api.allorigins.win/get?url=',
      requiresOrigin: false,
      method: 'GET'
    },
    {
      url: 'https://proxy.cors.sh/',
      requiresOrigin: true,
      method: 'GET'
    },
    {
      url: 'https://proxy.corsfix.com/?url=',
      requiresOrigin: false,
      method: 'GET'
    },
    {
      url: 'https://api.codetabs.com/v1/proxy?quest=',
      requiresOrigin: false,
      method: 'GET'
    },
    {
      url: 'https://thingproxy.freeboard.io/fetch/',
      requiresOrigin: false,
      method: 'GET'
    }
  ],

  // Block Explorers - کاوشگرهای بلاکچین
  blockExplorers: {
    ethereum: {
      primary: {
        name: 'etherscan',
        baseUrl: 'https://api.etherscan.io/api',
        key: 'SZHYFZK2RR8H9TIMJBVW54V4H81K2Z2KR2',
        method: 'GET',
        needsProxy: false,
        rateLimit: { requests: 5, interval: 1000 },
        enabled: true,
        timeout: 10000
      },
      fallbacks: [
        {
          name: 'etherscan_2',
          baseUrl: 'https://api.etherscan.io/api',
          key: 'T6IR8VJHX2NE6ZJW2S3FDVN1TYG4PYYI45',
          method: 'GET',
          needsProxy: false,
          rateLimit: { requests: 5, interval: 1000 },
          enabled: true
        },
        {
          name: 'blockchair',
          baseUrl: 'https://api.blockchair.com/ethereum',
          key: '',
          method: 'GET',
          needsProxy: false,
          rateLimit: { requests: 1440, interval: 86400000 }, // 1440 per day
          enabled: true
        },
        {
          name: 'blockscout',
          baseUrl: 'https://eth.blockscout.com/api',
          key: '',
          method: 'GET',
          needsProxy: false,
          enabled: true
        },
        {
          name: 'ethplorer',
          baseUrl: 'https://api.ethplorer.io',
          key: 'freekey',
          method: 'GET',
          needsProxy: false,
          enabled: true
        },
        {
          name: 'infura_rpc',
          baseUrl: 'https://mainnet.infura.io/v3',
          key: '',
          method: 'POST',
          needsProxy: false,
          enabled: true
        },
        {
          name: 'alchemy_rpc',
          baseUrl: 'https://eth-mainnet.g.alchemy.com/v2',
          key: '',
          method: 'POST',
          needsProxy: false,
          enabled: true
        },
        {
          name: 'covalent',
          baseUrl: 'https://api.covalenthq.com/v1/1',
          key: '',
          method: 'GET',
          needsProxy: false,
          enabled: true
        }
      ]
    },
    bsc: {
      primary: {
        name: 'bscscan',
        baseUrl: 'https://api.bscscan.com/api',
        key: 'K62RKHGXTDCG53RU4MCG6XABIMJKTN19IT',
        method: 'GET',
        needsProxy: false,
        rateLimit: { requests: 5, interval: 1000 },
        enabled: true,
        timeout: 10000
      },
      fallbacks: [
        {
          name: 'ankr_bsc',
          baseUrl: 'https://rpc.ankr.com/bsc',
          key: '',
          method: 'GET',
          needsProxy: false,
          enabled: true
        },
        {
          name: 'blockchair_bsc',
          baseUrl: 'https://api.blockchair.com/binance-smart-chain',
          key: '',
          method: 'GET',
          needsProxy: false,
          enabled: true
        },
        {
          name: 'nodereal_bsc',
          baseUrl: 'https://bsc-mainnet.nodereal.io/v1',
          key: '',
          method: 'GET',
          needsProxy: false,
          enabled: true
        }
      ]
    },
    tron: {
      primary: {
        name: 'tronscan',
        baseUrl: 'https://apilist.tronscanapi.com/api',
        key: '7ae72726-bffe-4e74-9c33-97b761eeea21',
        method: 'GET',
        needsProxy: false,
        rateLimit: { requests: 10, interval: 1000 },
        enabled: true,
        timeout: 10000
      },
      fallbacks: [
        {
          name: 'trongrid',
          baseUrl: 'https://api.trongrid.io',
          key: '',
          method: 'GET',
          needsProxy: false,
          enabled: true
        },
        {
          name: 'tronstack',
          baseUrl: 'https://api.tronstack.io',
          key: '',
          method: 'GET',
          needsProxy: false,
          enabled: true
        },
        {
          name: 'blockchair_tron',
          baseUrl: 'https://api.blockchair.com/tron',
          key: '',
          method: 'GET',
          needsProxy: false,
          enabled: true
        },
        {
          name: 'tronscan_v2',
          baseUrl: 'https://api.tronscan.org/api',
          key: '',
          method: 'GET',
          needsProxy: false,
          enabled: true
        }
      ]
    }
  },

  // Market Data APIs - APIهای داده‌های بازار
  marketData: {
    primary: {
      name: 'coingecko',
      baseUrl: 'https://api.coingecko.com/api/v3',
      key: '',
      method: 'GET',
      needsProxy: false,
      rateLimit: { requests: 50, interval: 60000 }, // 50 per minute
      enabled: true,
      timeout: 10000
    },
    fallbacks: [
      {
        name: 'coinmarketcap',
        baseUrl: 'https://pro-api.coinmarketcap.com/v1',
        key: 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c',
        headerKey: 'X-CMC_PRO_API_KEY',
        method: 'GET',
        needsProxy: true,
        rateLimit: { requests: 5, interval: 1000 },
        enabled: false  // DISABLED - Limited quota, use free providers first
      },
      {
        name: 'coinmarketcap_2',
        baseUrl: 'https://pro-api.coinmarketcap.com/v1',
        key: '04cf4b5b-9868-465c-8ba0-9f2e78c92eb1',
        headerKey: 'X-CMC_PRO_API_KEY',
        method: 'GET',
        needsProxy: true,
        rateLimit: { requests: 5, interval: 1000 },
        enabled: false  // DISABLED - Limited quota, use free providers first
      },
      {
        name: 'cryptocompare',
        baseUrl: 'https://min-api.cryptocompare.com/data',
        key: 'e79c8e6d4c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f',
        method: 'GET',
        needsProxy: false,
        rateLimit: { requests: 100, interval: 60000 },
        enabled: true
      },
      {
        name: 'coincap',
        baseUrl: 'https://api.coincap.io/v2',
        key: '',
        method: 'GET',
        needsProxy: false,
        rateLimit: { requests: 200, interval: 60000 },
        enabled: false  // DISABLED - 100% failure rate, returning empty results
      },
      {
        name: 'coinpaprika',
        baseUrl: 'https://api.coinpaprika.com/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: false  // DISABLED - 90.9% failure rate, returning empty results
      },
      {
        name: 'binance',
        baseUrl: 'https://api.binance.com/api/v3',
        key: '',
        method: 'GET',
        needsProxy: true, // Only Binance uses proxy
        rateLimit: { requests: 1200, interval: 60000 },
        enabled: false  // DISABLED - 100% failure rate, 451 error (restricted location)
      },
      {
        name: 'coinlore',
        baseUrl: 'https://api.coinlore.net/api',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: false  // DISABLED - 100% failure rate
      },
      {
        name: 'nomics',
        baseUrl: 'https://api.nomics.com/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'messari',
        baseUrl: 'https://data.messari.io/api/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'mobula',
        baseUrl: 'https://api.mobula.io/api/1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'coindesk',
        baseUrl: 'https://api.coindesk.com/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      }
    ]
  },

  // News APIs - APIهای اخبار
  news: {
    primary: {
      name: 'cryptopanic',
      baseUrl: 'https://cryptopanic.com/api/v1',
      key: '',
      method: 'GET',
      needsProxy: false,
      enabled: true,
      timeout: 10000
    },
    fallbacks: [
      {
        name: 'newsapi',
        baseUrl: 'https://newsapi.org/v2',
        key: 'pub_346789abc123def456789ghi012345jkl',
        headerKey: 'X-API-Key',
        method: 'GET',
        needsProxy: true,
        rateLimit: { requests: 100, interval: 86400000 }, // 100 per day
        enabled: true
      },
      {
        name: 'cryptocontrol',
        baseUrl: 'https://cryptocontrol.io/api/v1/public',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'reddit',
        baseUrl: 'https://www.reddit.com/r/CryptoCurrency',
        key: '',
        method: 'GET',
        needsProxy: false,
        rateLimit: { requests: 60, interval: 60000 }, // 60 per minute
        enabled: true
      },
      {
        name: 'coindesk_rss',
        baseUrl: 'https://www.coindesk.com/arc/outboundfeeds/rss',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'cointelegraph',
        baseUrl: 'https://cointelegraph.com/api/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'cryptoslate',
        baseUrl: 'https://api.cryptoslate.com/news',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      }
    ]
  },

  // Sentiment APIs - APIهای احساسات
  sentiment: {
    primary: {
      name: 'alternative_me',
      baseUrl: 'https://api.alternative.me/fng',
      key: '',
      method: 'GET',
      needsProxy: false,
      enabled: true,
      timeout: 10000
    },
    fallbacks: [
      {
        name: 'santiment',
        baseUrl: 'https://api.santiment.net/graphql',
        key: '',
        method: 'GRAPHQL',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'lunarcrush',
        baseUrl: 'https://api.lunarcrush.com/v2',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'thetie',
        baseUrl: 'https://api.thetie.io',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'cryptoquant',
        baseUrl: 'https://api.cryptoquant.com/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'glassnode_social',
        baseUrl: 'https://api.glassnode.com/v1/metrics/social',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'coingecko_community',
        baseUrl: 'https://api.coingecko.com/api/v3',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'messari_social',
        baseUrl: 'https://data.messari.io/api/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'reddit_sentiment',
        baseUrl: 'https://www.reddit.com/r/CryptoCurrency',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      }
    ]
  },

  // Whale Tracking APIs - APIهای ردیابی نهنگ
  whaleTracking: {
    primary: {
      name: 'clankapp',
      baseUrl: 'https://clankapp.com/api',
      key: '',
      method: 'GET',
      needsProxy: false,
      enabled: true,
      timeout: 10000
    },
    fallbacks: [
      {
        name: 'whalealert',
        baseUrl: 'https://api.whale-alert.io/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'bitquery_whale',
        baseUrl: 'https://graphql.bitquery.io',
        key: '',
        method: 'GRAPHQL',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'arkham',
        baseUrl: 'https://api.arkham.com',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'nansen',
        baseUrl: 'https://api.nansen.ai/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'debank',
        baseUrl: 'https://api.debank.com',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'zerion',
        baseUrl: 'https://api.zerion.io',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      }
    ]
  },

  // On-Chain Analytics APIs - APIهای تحلیل زنجیره
  onChainAnalytics: {
    primary: {
      name: 'the_graph',
      baseUrl: 'https://api.thegraph.com/subgraphs/name',
      key: '',
      method: 'GRAPHQL',
      needsProxy: false,
      enabled: true,
      timeout: 15000
    },
    fallbacks: [
      {
        name: 'glassnode',
        baseUrl: 'https://api.glassnode.com/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'intotheblock',
        baseUrl: 'https://api.intotheblock.com/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'covalent',
        baseUrl: 'https://api.covalenthq.com/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'moralis',
        baseUrl: 'https://deep-index.moralis.io/api/v2',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'dune',
        baseUrl: 'https://api.dune.com/api/v1',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      },
      {
        name: 'footprint',
        baseUrl: 'https://api.footprint.network',
        key: '',
        method: 'GET',
        needsProxy: false,
        enabled: true
      }
    ]
  },

  // RPC Nodes - نودهای RPC
  rpcNodes: {
    ethereum: [
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com',
      'https://cloudflare-eth.com',
      'https://rpc.ankr.com/eth',
      'https://eth.drpc.org',
      'https://1rpc.io/eth',
      'https://mainnet.infura.io/v3',
      'https://eth-mainnet.g.alchemy.com/v2'
    ],
    bsc: [
      'https://bsc-dataseed.binance.org',
      'https://bsc-dataseed1.defibit.io',
      'https://bsc-dataseed1.ninicoin.io',
      'https://rpc.ankr.com/bsc',
      'https://bsc-rpc.publicnode.com'
    ],
    tron: [
      'https://api.trongrid.io',
      'https://api.tronstack.io',
      'https://api.nileex.io' // Testnet
    ],
    polygon: [
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon-bor-rpc.publicnode.com'
    ]
  }
};

export default CentralizedAPIConfig;

/**
 * Helper functions to resolve API configurations with fallback chain
 */

/**
 * Gets the API key for a provider using the fallback chain
 */
export function getAPIKey(providerName: string, category?: keyof Omit<CentralizedAPIConfig, 'corsProxies' | 'rpcNodes'>): string {
  let configValue = '';

  // Try to find the provider in the config
  if (category && CentralizedAPIConfig[category]) {
    const categoryConfig = CentralizedAPIConfig[category] as APICategory;
    if (categoryConfig.primary?.name === providerName) {
      configValue = categoryConfig.primary.key || '';
    } else {
      const fallback = categoryConfig.fallbacks?.find(f => f.name === providerName);
      if (fallback) {
        configValue = fallback.key || '';
      }
    }
  }

  // Use the fallback chain resolver
  return resolveAPIKey(providerName, configValue, '');
}

/**
 * Gets the base URL for a provider using the fallback chain
 */
export function getBaseURL(providerName: string, category?: keyof Omit<CentralizedAPIConfig, 'corsProxies' | 'rpcNodes'>): string {
  let configValue = '';

  // Try to find the provider in the config
  if (category && CentralizedAPIConfig[category]) {
    const categoryConfig = CentralizedAPIConfig[category] as APICategory;
    if (categoryConfig.primary?.name === providerName) {
      configValue = categoryConfig.primary.baseUrl || '';
    } else {
      const fallback = categoryConfig.fallbacks?.find(f => f.name === providerName);
      if (fallback) {
        configValue = fallback.baseUrl || '';
      }
    }
  }

  // Use the fallback chain resolver
  return resolveAPIEndpoint(providerName, { baseUrl: configValue }, configValue);
}

/**
 * Gets complete provider config using the fallback chain
 */
export function getProviderConfig(providerName: string, category?: keyof Omit<CentralizedAPIConfig, 'corsProxies' | 'rpcNodes'>): APIConfig | null {
  // Try to find the provider in the config
  if (category && CentralizedAPIConfig[category]) {
    const categoryConfig = CentralizedAPIConfig[category] as APICategory;

    let baseConfig: APIConfig | undefined;

    if (categoryConfig.primary?.name === providerName) {
      baseConfig = categoryConfig.primary;
    } else {
      baseConfig = categoryConfig.fallbacks?.find(f => f.name === providerName);
    }

    if (baseConfig) {
      // Resolve with fallback chain
      const resolved = resolveAPIConfig(providerName, baseConfig);

      return {
        ...baseConfig,
        key: resolved.key,
        baseUrl: resolved.baseUrl || baseConfig.baseUrl,
        enabled: resolved.enabled
      };
    }
  }

  // If not found in category, try direct resolution
  const resolved = resolveAPIConfig(providerName, {});
  if (resolved.key || resolved.baseUrl) {
    return {
      name: providerName,
      baseUrl: resolved.baseUrl,
      key: resolved.key,
      enabled: resolved.enabled,
      method: 'GET'
    };
  }

  return null;
}

/**
 * Gets all enabled providers for a category with their resolved configs
 */
export function getEnabledProviders(category: keyof Omit<CentralizedAPIConfig, 'corsProxies' | 'rpcNodes'>): APIConfig[] {
  const categoryConfig = CentralizedAPIConfig[category] as APICategory;
  if (!categoryConfig) return [];

  const providers: APIConfig[] = [];

  // Add primary if enabled
  if (categoryConfig.primary) {
    const resolved = resolveAPIConfig(categoryConfig.primary.name, categoryConfig.primary);
    if (resolved.enabled && categoryConfig.primary.enabled !== false) {
      providers.push({
        ...categoryConfig.primary,
        key: resolved.key,
        baseUrl: resolved.baseUrl || categoryConfig.primary.baseUrl,
        enabled: true
      });
    }
  }

  // Add fallbacks if enabled
  if (categoryConfig.fallbacks) {
    for (const fallback of categoryConfig.fallbacks) {
      const resolved = resolveAPIConfig(fallback.name, fallback);
      if (resolved.enabled && fallback.enabled !== false) {
        providers.push({
          ...fallback,
          key: resolved.key,
          baseUrl: resolved.baseUrl || fallback.baseUrl,
          enabled: true
        });
      }
    }
  }

  return providers;
}

