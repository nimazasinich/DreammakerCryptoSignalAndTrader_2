// #region agent log
fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConfigManager.ts:1',message:'ConfigManager module loading',data:{isBrowser:typeof window!=='undefined',hasProcess:typeof process!=='undefined',hasRequire:typeof require!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
// #endregion agent log

// Conditional imports for Node.js only - prevent browser bundling
let readFileSync: typeof import('fs')['readFileSync'];
let writeFileSync: typeof import('fs')['writeFileSync'];
let existsSync: typeof import('fs')['existsSync'];
let join: typeof import('path')['join'];

// Only import fs/path in Node.js environment
const isNode = typeof process !== 'undefined' && process.versions?.node;
if (isNode) {
  try {
    const fs = require('fs');
    const path = require('path');
    readFileSync = fs.readFileSync;
    writeFileSync = fs.writeFileSync;
    existsSync = fs.existsSync;
    join = path.join;
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConfigManager.ts:22',message:'Failed to require fs/path',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion agent log
  }
}

import { ApiConfig } from '../types/index.js';
import { Logger } from './Logger.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ApiConfig;
  private configPath: string;
  private logger = Logger.getInstance();

  private constructor() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConfigManager.ts:37',message:'ConfigManager constructor entry',data:{isNode,hasJoin:!!join,hasReadFileSync:!!readFileSync,isBrowser:typeof window!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion agent log
    
    if (!isNode || !join) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConfigManager.ts:42',message:'ConfigManager in browser mode',data:{isNode,hasJoin:!!join},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion agent log
      // Browser environment - use default config without file system
      this.config = this.getDefaultConfig();
      return;
    }
    
    this.configPath = join(process.cwd(), 'config', 'api.json');
    this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConfigManager.ts:62',message:'loadConfig entry',data:{hasExistsSync:!!existsSync,configPath:this.configPath,isNode},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion agent log
    
    if (!isNode || !existsSync || !readFileSync) {
      // Browser environment - use default config
      this.config = this.getDefaultConfig();
      return;
    }
    
    try {
      if (!existsSync(this.configPath)) {
        this.logger.warn('Config file not found, creating default configuration');
        this.config = this.getDefaultConfig();
        this.saveConfig();
        return;
      }

      const configData = readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      // Validate required fields
      this.validateConfig();
      
      this.logger.info('Configuration loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load configuration', {}, error as Error);
      this.config = this.getDefaultConfig();
      this.saveConfig();
    }
  }

  private getDefaultConfig(): ApiConfig {
    return {
      binance: {
        apiKey: (typeof process !== 'undefined' && process.env?.BINANCE_API_KEY) || '',
        secretKey: (typeof process !== 'undefined' && process.env?.BINANCE_SECRET_KEY) || '',
        testnet: true,
        rateLimits: {
          requestsPerSecond: 10,
          dailyLimit: 100000
        }
      },
      kucoin: {
        apiKey: (typeof process !== 'undefined' && process.env?.KUCOIN_API_KEY) || '',
        secretKey: (typeof process !== 'undefined' && process.env?.KUCOIN_SECRET_KEY) || '',
        passphrase: (typeof process !== 'undefined' && process.env?.KUCOIN_PASSPHRASE) || '',
        testnet: true,
        rateLimits: {
          requestsPerSecond: 30,
          requestsPerMinute: 1800
        }
      },
      telegram: {
        botToken: (typeof process !== 'undefined' && process.env?.TELEGRAM_BOT_TOKEN) || '',
        chatId: (typeof process !== 'undefined' && process.env?.TELEGRAM_CHAT_ID) || ''
      },
      database: {
        path: isNode && join ? join(process.cwd(), 'data', 'boltai.db') : 'data/boltai.db',
        encrypted: true,
        backupEnabled: true
      },
      redis: {
        host: 'localhost',
        port: 6379,
        password: (typeof process !== 'undefined' && process.env?.REDIS_PASSWORD) || undefined
      }
    };
  }

  private createDefaultConfig(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  private validateConfig(): void {
    // فعال کردن حالت واقعی با داده‌های واقعی
    if (!this.config.exchange) {
      this.config.exchange = {};
    }

    this.config.exchange.demoMode = false;
    this.config.exchange.realDataMode = true;
    this.config.exchange.primarySource = 'coinmarketcap';
    this.config.exchange.fallbackSources = ['cryptocompare', 'coingecko'];
    this.config.exchange.tradingEnabled = false;

    this.logger.info('✅ REAL MARKET DATA MODE ACTIVATED');
    this.logger.info('📊 Using real data from: CoinMarketCap, CryptoCompare, CoinGecko');
    this.logger.info('📰 Real news from: NewsAPI, CryptoPanic');
    this.logger.info('😱 Real sentiment from: Fear & Greed Index');

    if (!this.config.binance?.apiKey) {
      this.logger.warn('Binance API key not set (optional for real data mode)');
    }
    
    if (!this.config.database?.path) {
      console.error('Database path is required');
    }
  }

  private saveConfig(): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConfigManager.ts:164',message:'saveConfig entry',data:{isNode,hasWriteFileSync:!!writeFileSync,hasConfigPath:!!this.configPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion agent log
    
    if (!isNode || !writeFileSync || !this.configPath) {
      // Browser environment - skip file save
      return;
    }
    
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      this.logger.info('Configuration saved successfully');
    } catch (error) {
      this.logger.error('Failed to save configuration', {}, error as Error);
    }
  }

  getConfig(): ApiConfig {
    return this.config;
  }

  updateConfig(updates: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  getBinanceConfig() {
    return this.config.binance;
  }

  getKuCoinConfig() {
    return this.config.kucoin || {
      apiKey: (typeof process !== 'undefined' && process.env?.KUCOIN_API_KEY) || '',
      secretKey: (typeof process !== 'undefined' && process.env?.KUCOIN_SECRET_KEY) || '',
      passphrase: (typeof process !== 'undefined' && process.env?.KUCOIN_PASSPHRASE) || '',
      testnet: true,
      rateLimits: {
        requestsPerSecond: 30,
        requestsPerMinute: 1800
      }
    };
  }

  getTelegramConfig() {
    return this.config.telegram;
  }

  getDatabaseConfig() {
    return this.config.database;
  }

  getRedisConfig() {
    return this.config.redis;
  }

  isRealDataMode(): boolean {
    return this.config.exchange?.realDataMode === true;
  }

  isDemoMode(): boolean {
    return this.config.exchange?.demoMode === true;
  }

  getExchangeConfig() {
    return this.config.exchange || {};
  }

  getMarketDataConfig() {
    return this.config.marketData || {};
  }

  getAnalysisConfig() {
    return this.config.analysis || {};
  }

  getApisConfig() {
    return this.config.apis || {};
  }

  getApiPriority(): string[] {
    return this.config.apiPriority || ['coingecko', 'binance', 'coinmarketcap', 'cryptocompare'];
  }

  getCacheConfig() {
    return this.config.cache || {
      ttl: {
        market_data: 120,
        news: 600,
        sentiment: 3600,
        fear_greed: 300,
        social: 300,
        hf_ohlcv: 180,
        hf_sentiment: 900
      }
    };
  }

  getDynamicWeightingConfig() {
    return this.config.dynamicWeighting || {
      updateInterval: 300000,
      minWeight: 0.05,
      maxWeight: 0.5,
      accuracyFactor: 0.4,
      freshnessFactor: 0.2,
      qualityFactor: 0.2,
      volatilityFactor: 0.2
    };
  }
}