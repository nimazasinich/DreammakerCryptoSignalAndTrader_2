// src/core/ProviderManager.ts
import { Logger } from './Logger.js';
import { ProviderHealthMonitor } from './ProviderHealthMonitor.js';
import { DataFallbackManager, FallbackOptions } from './DataFallbackManager.js';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import fs from 'fs';
import path from 'path';

export interface ProviderConfig {
  name: string;
  priority: number;
  baseUrl: string;
  key: string;
  category: string;
  rateLimitPerMinute: number;
  enabled: boolean;
  chain?: string;
  isRPC?: boolean;
  requiresGraphQL?: boolean;
}

export interface RequestConfig {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
}

export class ProviderManager {
  private static instance: ProviderManager;
  private logger = Logger.getInstance();
  private healthMonitor = ProviderHealthMonitor.getInstance();
  private fallbackManager = DataFallbackManager.getInstance();
  private providersConfig: any;
  private providersByCategory = new Map<string, ProviderConfig[]>();

  private constructor() {
    this.loadConfig();
    this.initializeProviders();
    this.startHealthMonitoring();
  }

  public static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  private loadConfig(): void {
    try {
      const configPath = path.join(process.cwd(), 'config', 'providers_config.json');
      const rawData = fs.readFileSync(configPath, 'utf-8');
      this.providersConfig = JSON.parse(rawData);
      this.logger.info('ProviderManager: Configuration loaded');
    } catch (error) {
      this.logger.error('ProviderManager: Failed to load config', { error });
      console.error('Failed to load providers configuration');
    }
  }

  private initializeProviders(): void {
    if (!this.providersConfig?.categories) return;

    for (const [categoryName, categoryData] of Object.entries(this.providersConfig.categories)) {
      const category = categoryData as any;
      const providers: ProviderConfig[] = [];

      if (category.providers) {
        for (const provider of category.providers) {
          if (provider.enabled) {
            providers.push({
              name: provider.name,
              priority: provider.priority,
              baseUrl: provider.baseUrl,
              key: provider.key || '',
              category: categoryName,
              rateLimitPerMinute: provider.rateLimitPerMinute,
              enabled: provider.enabled,
              chain: provider.chain,
              isRPC: provider.isRPC,
              requiresGraphQL: provider.requiresGraphQL
            });
          }
        }

        // Sort by priority
        providers.sort((a, b) => a.priority - b.priority);
        this.providersByCategory.set(categoryName, providers);
      }
    }

    this.logger.info('ProviderManager: Providers initialized', {
      categories: this.providersByCategory.size
    });
  }

  private startHealthMonitoring(): void {
    this.healthMonitor.start();
  }

  /**
   * Execute a request with automatic fallback across providers
   */
  public async requestWithFallback<T = any>(
    category: string,
    requestConfig: RequestConfig,
    options?: Partial<FallbackOptions>
  ): Promise<T> {
    const providers = this.providersByCategory.get(category);
    if (!providers || providers.length === 0) {
      console.error(`No providers available for category: ${category}`);
    }

    // Build provider functions map
    const providerFunctions = new Map<string, () => Promise<T>>();

    for (const provider of providers) {
      providerFunctions.set(provider.name, async () => {
        return this.executeProviderRequest<T>(provider, requestConfig);
      });
    }

    // Execute with fallback
    const result = await this.fallbackManager.executeWithFallback<T>(
      providerFunctions,
      {
        category,
        timeout: 3000,
        maxAttempts: 3,
        useGitHubFallback: true,
        ...options
      }
    );

    if (!result.success || result.data === null) {
      console.error(`All providers failed for category: ${category}`);
    }

    return result.data;
  }

  /**
   * Execute a single provider request
   */
  private async executeProviderRequest<T>(
    provider: ProviderConfig,
    requestConfig: RequestConfig
  ): Promise<T> {
    const url = this.buildUrl(provider, requestConfig.endpoint, requestConfig.params);
    const headers = this.buildHeaders(provider, requestConfig.headers);

    const axiosConfig: AxiosRequestConfig = {
      method: requestConfig.method || 'GET',
      url,
      headers,
      timeout: 5000,
      validateStatus: (status) => status >= 200 && status < 300
    };

    if (requestConfig.data) {
      axiosConfig.data = requestConfig.data;
    }

    this.logger.debug('ProviderManager: Executing request', {
      provider: provider.name,
      url: url.substring(0, 100) // Log truncated URL for security
    });

    try {
      const response = await axios(axiosConfig);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.warn('ProviderManager: Request failed', {
        provider: provider.name,
        status: axiosError.response?.status,
        error: axiosError.message
      });
      throw error;
    }
  }

  private buildUrl(
    provider: ProviderConfig,
    endpoint: string,
    params?: Record<string, any>
  ): string {
    let url = provider.baseUrl;

    // Add endpoint
    if (endpoint) {
      if (!url.endsWith('/') && !endpoint.startsWith('/')) {
        url += '/';
      }
      url += endpoint;
    }

    // Add query parameters
    if (params) {
      const queryParams = new URLSearchParams();

      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }

      const queryString = queryParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    // Add API key as query param for explorer APIs
    if (provider.category === 'explorer' && provider.key) {
      url += (url.includes('?') ? '&' : '?') + `apikey=${provider.key}`;
    }

    return url;
  }

  private buildHeaders(
    provider: ProviderConfig,
    customHeaders?: Record<string, string>
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'DreammakerCryptoSignalTrader/2.0',
      'Accept': 'application/json',
      ...customHeaders
    };

    // Add API key to headers based on provider type
    if (provider.key) {
      if (provider.name.includes('coinmarketcap')) {
        headers['X-CMC_PRO_API_KEY'] = provider.key;
      } else if (provider.name === 'cryptocompare') {
        headers['authorization'] = `Apikey ${provider.key}`;
      } else if (provider.name === 'newsapi') {
        headers['X-Api-Key'] = provider.key;
      } else if (provider.requiresGraphQL) {
        headers['Authorization'] = `Bearer ${provider.key}`;
        headers['Content-Type'] = 'application/json';
      }
    }

    return headers;
  }

  /**
   * Get providers for a specific category
   */
  public getProviders(category: string): ProviderConfig[] {
    return this.providersByCategory.get(category) || [];
  }

  /**
   * Get all categories
   */
  public getCategories(): string[] {
    return Array.from(this.providersByCategory.keys());
  }

  /**
   * Get system status including health and fallback info
   */
  public getSystemStatus(): any {
    const healthSummary = this.healthMonitor.getHealthSummary();
    const fallbackStatus = this.fallbackManager.getFallbackStatus();
    const allHealth = this.healthMonitor.getAllHealth();

    // Determine currently active provider per category
    const activeProviders: Record<string, string> = {};
    for (const category of this.providersByCategory.keys()) {
      const healthyProviders = this.healthMonitor.getHealthyProviders(category);
      const providers = this.providersByCategory.get(category) || [];

      // Find first healthy provider by priority
      for (const provider of providers) {
        if (healthyProviders.includes(provider.name)) {
          activeProviders[category] = provider.name;
          break;
        }
      }

      if (!activeProviders[category] && (providers?.length || 0) > 0) {
        activeProviders[category] = providers[0].name + ' (fallback)';
      }
    }

    return {
      timestamp: new Date().toISOString(),
      health: healthSummary,
      fallback: fallbackStatus,
      activeProviders,
      providers: allHealth,
      categories: Array.from(this.providersByCategory.keys())
    };
  }

  /**
   * Reload configuration
   */
  public reloadConfig(): void {
    this.loadConfig();
    this.initializeProviders();
    this.fallbackManager.reloadConfig();
    this.logger.info('ProviderManager: Configuration reloaded');
  }

  /**
   * Stop the provider manager
   */
  public stop(): void {
    this.healthMonitor.stop();
    this.logger.info('ProviderManager: Stopped');
  }
}
