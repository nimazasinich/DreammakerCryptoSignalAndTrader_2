/**
 * Test Configuration Module
 * پیکربندی مرکزی و هوشمند برای تست‌ها
 */

import { TestConfig } from './api-test-framework';

export interface SmartTestConfig extends TestConfig {
  // Auto-detect settings
  autoDetectBaseURL?: boolean;
  autoRetry?: boolean;
  adaptiveTimeout?: boolean;
  
  // Smart features
  failFast?: boolean;
  parallelTests?: boolean;
  maxParallel?: number;
  
  // Reporting
  reportFormat?: 'json' | 'markdown' | 'console' | 'all';
  reportDir?: string;
  saveOnFail?: boolean;
  
  // Advanced
  mockMode?: boolean;
  cacheResponses?: boolean;
  reuseConnections?: boolean;
}

export class TestConfigManager {
  private static instance: TestConfigManager;
  private config: SmartTestConfig;

  private constructor() {
    this.config = this.loadDefaultConfig();
  }

  static getInstance(): TestConfigManager {
    if (!TestConfigManager.instance) {
      TestConfigManager.instance = new TestConfigManager();
    }
    return TestConfigManager.instance;
  }

  private loadDefaultConfig(): SmartTestConfig {
    return {
      baseURL: this.detectBaseURL(),
      timeout: this.detectTimeout(),
      retries: 3,
      retryDelay: 1000,
      autoDetectBaseURL: true,
      autoRetry: true,
      adaptiveTimeout: true,
      failFast: false,
      parallelTests: true,
      maxParallel: 5,
      reportFormat: 'console',
      reportDir: './reports',
      saveOnFail: true,
      mockMode: false,
      cacheResponses: false,
      reuseConnections: true,
    };
  }

  private detectBaseURL(): string {
    // Auto-detect from environment or common ports
    if (process.env.API_BASE_URL) {
      return process.env.API_BASE_URL;
    }
    
    const commonPorts = [3001, 3000, 8000, 8001, 5000];
    // در production، اولین port موجود را برمی‌گرداند
    return `http://localhost:${commonPorts[0]}`;
  }

  private detectTimeout(): number {
    // Adaptive timeout based on environment
    if (process.env.NODE_ENV === 'production') {
      return 30000; // 30s for production
    }
    if (process.env.CI) {
      return 20000; // 20s for CI
    }
    return 10000; // 10s for development
  }

  getConfig(): SmartTestConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SmartTestConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  resetConfig(): void {
    this.config = this.loadDefaultConfig();
  }

  // Smart helpers
  shouldRetry(attempt: number, error: any): boolean {
    if (!this.config.autoRetry) return false;
    if (attempt >= (this.config.retries || 3)) return false;
    
    // Don't retry on 4xx errors (client errors)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return false;
    }
    
    return true;
  }

  getAdaptiveTimeout(endpoint: string): number {
    if (!this.config.adaptiveTimeout) {
      return this.config.timeout || 10000;
    }

    // Adaptive timeout based on endpoint type
    if (endpoint.includes('/health')) return 2000;
    if (endpoint.includes('/market/prices')) return 5000;
    if (endpoint.includes('/historical')) return 15000;
    if (endpoint.includes('/backtest')) return 30000;
    
    return this.config.timeout || 10000;
  }
}

// Export singleton instance
export const testConfig = TestConfigManager.getInstance();

