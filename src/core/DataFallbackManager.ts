// src/core/DataFallbackManager.ts
import { Logger } from './Logger.js';
import { ProviderHealthMonitor } from './ProviderHealthMonitor.js';
import { AdvancedCache } from './AdvancedCache.js';
import fs from 'fs';
import path from 'path';

export interface FallbackAttempt {
  provider: string;
  success: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

export interface FallbackResult<T = any> {
  data: T | null;
  source: string;
  attempts: FallbackAttempt[];
  totalTime: number;
  success: boolean;
  usedCache: boolean;
  usedGitHubFile: boolean;
}

export interface FallbackOptions {
  category: string;
  cacheKey?: string;
  cacheTTL?: number;
  maxAttempts?: number;
  timeout?: number;
  useGitHubFallback?: boolean;
}

export class DataFallbackManager {
  private static instance: DataFallbackManager;
  private logger = Logger.getInstance();
  private healthMonitor = ProviderHealthMonitor.getInstance();
  private cache = AdvancedCache.getInstance();
  private providersConfig: any;
  private gitHubFileData: any = null;

  private constructor() {
    this.loadProvidersConfig();
    this.loadGitHubFallbackData();
  }

  public static getInstance(): DataFallbackManager {
    if (!DataFallbackManager.instance) {
      DataFallbackManager.instance = new DataFallbackManager();
    }
    return DataFallbackManager.instance;
  }

  private loadProvidersConfig(): void {
    try {
      const configPath = path.join(process.cwd(), 'config', 'providers_config.json');
      const rawData = fs.readFileSync(configPath, 'utf-8');
      this.providersConfig = JSON.parse(rawData);
      this.logger.info('DataFallbackManager: Providers config loaded');
    } catch (error) {
      this.logger.error('Failed to load providers config', { error });
    }
  }

  private loadGitHubFallbackData(): void {
    try {
      // Load the "api - Copy.txt" file content as a fallback data source
      const gitHubFilePath = path.join(process.cwd(), 'api - Copy.txt');
      if (fs.existsSync(gitHubFilePath)) {
        const rawData = fs.readFileSync(gitHubFilePath, 'utf-8');

        // Parse the file and extract API keys and configurations
        this.gitHubFileData = this.parseGitHubFile(rawData);

        this.logger.info('DataFallbackManager: GitHub fallback file loaded', {
          keysFound: Object.keys(this.gitHubFileData.keys || {}).length
        });
      }
    } catch (error) {
      this.logger.warn('Failed to load GitHub fallback file', { error });
    }
  }

  private parseGitHubFile(content: string): any {
    const data: any = {
      keys: {},
      providers: {},
      endpoints: []
    };

    const lines = content.split('\n');

    // Extract API keys
    const keyPatterns = [
      { name: 'coinmarketcap', regex: /COINMARKETCAP_KEY:\s*([a-f0-9-]+)/i },
      { name: 'cryptocompare', regex: /CRYPTOCOMPARE_KEY:\s*([a-f0-9]+)/i },
      { name: 'newsapi', regex: /NEWSAPI_KEY:\s*([a-zA-Z0-9_]+)/i },
      { name: 'etherscan', regex: /eherscann[_0-9]*\s+([A-Z0-9]+)/i },
      { name: 'bscscan', regex: /Bscscan\s+([A-Z0-9]+)/i },
      { name: 'tronscan', regex: /tronscan\s+([a-f0-9-]+)/i }
    ];

    for (const line of lines) {
      for (const pattern of keyPatterns) {
        const match = line.match(pattern.regex);
        if (match && match[1]) {
          data.keys[pattern.name] = match[1];
        }
      }
    }

    return data;
  }

  /**
   * Execute a provider function with automatic fallback cascade
   */
  public async executeWithFallback<T = any>(
    providerFunctions: Map<string, () => Promise<T>>,
    options: FallbackOptions
  ): Promise<FallbackResult<T>> {
    const startTime = Date.now();
    const attempts: FallbackAttempt[] = [];
    const maxAttempts = options.maxAttempts || 3;

    // 1. Try cache first
    if (options.cacheKey) {
      const cached = await this.cache.get<T>(options.cacheKey);
      if (cached) {
        this.logger.debug('DataFallbackManager: Cache hit', { key: options.cacheKey });
        return {
          data: cached,
          source: 'cache',
          attempts: [],
          totalTime: Date.now() - startTime,
          success: true,
          usedCache: true,
          usedGitHubFile: false
        };
      }
    }

    // 2. Get healthy providers in priority order
    const healthyProviders = this.getHealthyProvidersInOrder(options.category);
    const providersToTry = Array.from(providerFunctions.keys()).filter(name =>
      healthyProviders.includes(name)
    );

    // Add remaining providers (even if unhealthy) as last resort
    for (const name of providerFunctions.keys()) {
      if (!providersToTry.includes(name)) {
        providersToTry.push(name);
      }
    }

    // 3. Try each provider
    for (let i = 0; i < Math.min(providersToTry.length, maxAttempts); i++) {
      const providerName = providersToTry[i];
      const providerFunc = providerFunctions.get(providerName);

      if (!providerFunc) continue;

      const attemptStart = Date.now();
      try {
        this.logger.debug('DataFallbackManager: Trying provider', {
          provider: providerName,
          attempt: i + 1
        });

        const data = await this.executeWithTimeout(
          providerFunc,
          options.timeout || 3000
        );

        const attemptTime = Date.now() - attemptStart;

        attempts.push({
          provider: providerName,
          success: true,
          responseTime: attemptTime,
          timestamp: new Date()
        });

        // Cache successful result
        if (options.cacheKey && options.cacheTTL) {
          await this.cache.set(options.cacheKey, data, { ttl: options.cacheTTL });
        }

        this.logger.info('DataFallbackManager: Provider success', {
          provider: providerName,
          responseTime: attemptTime
        });

        return {
          data,
          source: providerName,
          attempts,
          totalTime: Date.now() - startTime,
          success: true,
          usedCache: false,
          usedGitHubFile: false
        };

      } catch (error) {
        const attemptTime = Date.now() - attemptStart;
        const errorMessage = error instanceof Error ? error.message : String(error);

        attempts.push({
          provider: providerName,
          success: false,
          responseTime: attemptTime,
          error: errorMessage,
          timestamp: new Date()
        });

        this.logger.warn('DataFallbackManager: Provider failed', {
          provider: providerName,
          error: errorMessage,
          attempt: i + 1
        });
      }
    }

    // 4. Try GitHub file fallback if enabled
    if (options.useGitHubFallback !== false && this.gitHubFileData) {
      try {
        const githubData = this.getDataFromGitHubFile(options.category);
        if (githubData) {
          this.logger.info('DataFallbackManager: Using GitHub file fallback');

          return {
            data: githubData as T,
            source: 'github_file',
            attempts,
            totalTime: Date.now() - startTime,
            success: true,
            usedCache: false,
            usedGitHubFile: true
          };
        }
      } catch (error) {
        this.logger.warn('DataFallbackManager: GitHub fallback failed', { error });
      }
    }

    // 5. All attempts failed
    this.logger.error('DataFallbackManager: All fallback attempts failed', {
      category: options.category,
      attempts: attempts.length
    });

    return {
      data: null,
      source: 'none',
      attempts,
      totalTime: Date.now() - startTime,
      success: false,
      usedCache: false,
      usedGitHubFile: false
    };
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  }

  private getHealthyProvidersInOrder(category: string): string[] {
    const categoryConfig = this.providersConfig?.categories?.[category];
    if (!categoryConfig?.providers) return [];

    // Get all providers sorted by priority
    const providers = [...categoryConfig.providers]
      .filter((p: any) => p.enabled)
      .sort((a: any, b: any) => a.priority - b.priority);

    // Filter to only healthy/degraded providers
    const healthyProviders: string[] = [];
    for (const provider of providers) {
      const health = this.healthMonitor.getHealth(provider.name);
      if (health && (health.status === 'healthy' || health.status === 'degraded')) {
        healthyProviders.push(provider.name);
      }
    }

    return healthyProviders;
  }

  private getDataFromGitHubFile(category: string): any | null {
    // Return relevant data from the GitHub file based on category
    if (!this.gitHubFileData) return null;

    // This is a placeholder - in real implementation, you'd parse
    // specific data structures from the GitHub file based on category
    switch (category) {
      case 'market':
        return null; // Would return price data if available
      case 'news':
        return null; // Would return news data if available
      default:
        return null;
    }
  }

  public getFallbackStatus(): any {
    return {
      gitHubFileLoaded: !!this.gitHubFileData,
      gitHubKeys: this.gitHubFileData?.keys ? Object.keys(this.gitHubFileData.keys) : [],
      providersConfigLoaded: !!this.providersConfig,
      categoriesAvailable: this.providersConfig?.categories
        ? Object.keys(this.providersConfig.categories)
        : []
    };
  }

  public reloadConfig(): void {
    this.loadProvidersConfig();
    this.loadGitHubFallbackData();
    this.logger.info('DataFallbackManager: Configuration reloaded');
  }
}
