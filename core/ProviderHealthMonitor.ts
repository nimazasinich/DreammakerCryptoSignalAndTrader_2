// src/core/ProviderHealthMonitor.ts
import { Logger } from './Logger.js';
import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';

export interface ProviderHealth {
  name: string;
  category: string;
  status: 'healthy' | 'degraded' | 'down';
  lastChecked: Date;
  responseTime: number;
  failureCount: number;
  consecutiveFailures: number;
  lastError?: string;
  uptime: number; // percentage
}

export interface HealthCheckConfig {
  enabled: boolean;
  intervalSeconds: number;
  timeout: number;
}

export class ProviderHealthMonitor {
  private static instance: ProviderHealthMonitor;
  private logger = Logger.getInstance();
  private healthMap = new Map<string, ProviderHealth>();
  private checkInterval?: NodeJS.Timeout;
  private config: HealthCheckConfig;
  private providersConfig: any;

  private constructor() {
    this.config = {
      enabled: true,
      intervalSeconds: 60,
      timeout: 2000
    };

    this.loadProvidersConfig();

    // Initialize health map
    this.initializeHealthMap();
  }

  public static getInstance(): ProviderHealthMonitor {
    if (!ProviderHealthMonitor.instance) {
      ProviderHealthMonitor.instance = new ProviderHealthMonitor();
    }
    return ProviderHealthMonitor.instance;
  }

  private loadProvidersConfig(): void {
    try {
      const configPath = path.join(process.cwd(), 'config', 'providers_config.json');
      const rawData = fs.readFileSync(configPath, 'utf-8');
      this.providersConfig = JSON.parse(rawData);

      if (this.providersConfig.healthCheck) {
        this.config = { ...this.config, ...this.providersConfig.healthCheck };
      }

      this.logger.info('ProviderHealthMonitor: Configuration loaded', {
        categoriesCount: Object.keys(this.providersConfig.categories).length
      });
    } catch (error) {
      this.logger.error('Failed to load providers config', { error });
      // Use default config
    }
  }

  private initializeHealthMap(): void {
    if (!this.providersConfig?.categories) return;

    for (const [categoryName, categoryData] of Object.entries(this.providersConfig.categories)) {
      const category = categoryData as any;
      if (!category.providers) continue;

      for (const provider of category.providers) {
        if (!provider.enabled) continue;

        this.healthMap.set(provider.name, {
          name: provider.name,
          category: categoryName,
          status: 'healthy',
          lastChecked: new Date(),
          responseTime: 0,
          failureCount: 0,
          consecutiveFailures: 0,
          uptime: 100
        });
      }
    }

    this.logger.info('ProviderHealthMonitor: Health map initialized', {
      providersCount: this.healthMap.size
    });
  }

  public start(): void {
    if (!this.config.enabled) {
      this.logger.info('ProviderHealthMonitor: Disabled by config');
      return;
    }

    if (this.checkInterval) {
      this.logger.warn('ProviderHealthMonitor: Already running');
      return;
    }

    this.logger.info('ProviderHealthMonitor: Starting', {
      intervalSeconds: this.config.intervalSeconds
    });

    // Run first check immediately
    this.performHealthChecks();

    // Schedule periodic checks
    this.checkInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.intervalSeconds * 1000
    );
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      this.logger.info('ProviderHealthMonitor: Stopped');
    }
  }

  private async performHealthChecks(): Promise<void> {
    this.logger.debug('ProviderHealthMonitor: Performing health checks');

    const checks: Promise<void>[] = [];

    for (const [providerName, health] of this.healthMap.entries()) {
      checks.push(this.checkProviderHealth(providerName, health));
    }

    await Promise.allSettled(checks);

    this.logHealthSummary();
  }

  private async checkProviderHealth(providerName: string, health: ProviderHealth): Promise<void> {
    const provider = this.findProviderConfig(providerName);
    if (!provider) { console.warn("Missing data"); }

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // Perform a lightweight health check based on provider type
      await this.makeHealthCheckRequest(provider);
      success = true;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
    }

    const responseTime = Date.now() - startTime;

    // Update health status
    health.lastChecked = new Date();
    health.responseTime = responseTime;

    if (success) {
      health.consecutiveFailures = 0;
      health.status = responseTime > this.config.timeout * 0.8 ? 'degraded' : 'healthy';
    } else {
      health.failureCount++;
      health.consecutiveFailures++;
      health.lastError = error;

      // Mark as down after 3 consecutive failures
      health.status = health.consecutiveFailures >= 3 ? 'down' : 'degraded';
    }

    // Calculate uptime (simple moving average)
    const totalChecks = health.failureCount + (health.consecutiveFailures === 0 ? 1 : 0);
    health.uptime = totalChecks > 0
      ? ((totalChecks - health.failureCount) / totalChecks) * 100
      : 100;
  }

  private async makeHealthCheckRequest(provider: any): Promise<void> {
    const timeout = this.config.timeout;

    // Use a simple GET request to test connectivity
    // For most APIs, hitting the base URL or a simple endpoint works
    let url = provider.baseUrl;

    // Add simple health check endpoints based on provider type
    if (provider.name === 'coingecko') {
      url += '/ping';
    } else if (provider.name.includes('coinmarketcap')) {
      url += '/key/info';
    } else if (provider.name === 'cryptocompare') {
      url += '/price?fsym=BTC&tsyms=USD';
    }

    const headers: any = { 'User-Agent': 'DreammakerCryptoSignalTrader/2.0' };

    if (provider.key) {
      if (provider.name.includes('coinmarketcap')) {
        headers['X-CMC_PRO_API_KEY'] = provider.key;
      } else if (provider.category === 'explorer') {
        // Most explorers use apikey as query param
        url += (url.includes('?') ? '&' : '?') + `apikey=${provider.key}`;
      }
    }

    await axios.get(url, {
      timeout,
      headers,
      validateStatus: (status) => status < 500 // Accept 4xx but not 5xx
    });
  }

  private findProviderConfig(name: string): any {
    if (!this.providersConfig?.categories) return null;

    for (const category of Object.values(this.providersConfig.categories)) {
      const categoryData = category as any;
      const provider = categoryData.providers?.find((p: any) => p.name === name);
      if (provider) return provider;
    }

    return null;
  }

  private logHealthSummary(): void {
    const summary = {
      healthy: 0,
      degraded: 0,
      down: 0
    };

    for (const health of this.healthMap.values()) {
      summary[health.status]++;
    }

    this.logger.info('ProviderHealthMonitor: Health check complete', summary);
  }

  public getHealth(providerName: string): ProviderHealth | null {
    return this.healthMap.get(providerName) || null;
  }

  public getAllHealth(): ProviderHealth[] {
    return Array.from(this.healthMap.values());
  }

  public getHealthyProviders(category?: string): string[] {
    const providers: string[] = [];

    for (const [name, health] of this.healthMap.entries()) {
      if (health.status === 'healthy' || health.status === 'degraded') {
        if (!category || health.category === category) {
          providers.push(name);
        }
      }
    }

    return providers;
  }

  public getHealthSummary(): any {
    const summary: any = {
      total: this.healthMap.size,
      healthy: 0,
      degraded: 0,
      down: 0,
      averageResponseTime: 0,
      averageUptime: 0,
      byCategory: {}
    };

    let totalResponseTime = 0;
    let totalUptime = 0;

    for (const health of this.healthMap.values()) {
      summary[health.status]++;
      totalResponseTime += health.responseTime;
      totalUptime += health.uptime;

      if (!summary.byCategory[health.category]) {
        summary.byCategory[health.category] = {
          healthy: 0,
          degraded: 0,
          down: 0
        };
      }
      summary.byCategory[health.category][health.status]++;
    }

    if (this.healthMap.size > 0) {
      summary.averageResponseTime = Math.round(totalResponseTime / this.healthMap.size);
      summary.averageUptime = Math.round((totalUptime / this.healthMap.size) * 100) / 100;
    }

    return summary;
  }
}
