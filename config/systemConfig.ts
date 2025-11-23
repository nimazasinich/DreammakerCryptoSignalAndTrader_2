/**
 * System Configuration Loader
 *
 * Provides central control over feature flags and system modes.
 * All features must respect these flags.
 *
 * NO DEFAULT OVERRIDES - Flags are authoritative
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../core/Logger.js';
import { TradingMode, TradingMarket } from '../types/index.js';

export interface SystemConfig {
  features: {
    liveScoring: boolean;
    backtest: boolean;
    autoTuning: boolean;
    autoTrade: boolean;
    manualTrade: boolean;
  };
  modes: {
    environment: 'DEV' | 'STAGING' | 'PROD';
    trading: TradingMode;
  };
  trading?: {
    environment: 'DEV' | 'STAGING' | 'PROD';
    mode: TradingMode;
    market: TradingMarket;
  };
}

class SystemConfigManager {
  private static instance: SystemConfigManager;
  private logger = Logger.getInstance();
  private config: SystemConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'system.config.json');
  }

  static getInstance(): SystemConfigManager {
    if (!SystemConfigManager.instance) {
      SystemConfigManager.instance = new SystemConfigManager();
    }
    return SystemConfigManager.instance;
  }

  /**
   * Load system configuration from disk
   */
  private loadConfig(): SystemConfig {
    if (this.config) {
      return this.config;
    }

    try {
      if (!fs.existsSync(this.configPath)) {
        this.logger.warn('system.config.json not found, using defaults', {
          path: this.configPath
        });
        return this.getDefaultConfig();
      }

      const rawData = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(rawData) as SystemConfig;

      this.validateConfig(config);

      this.config = config;
      this.logger.info('System configuration loaded', {
        environment: config.modes.environment,
        trading: config.modes.trading
      });

      return config;
    } catch (error) {
      this.logger.error('Failed to load system configuration', {}, error as Error);
      this.logger.warn('Falling back to default configuration');
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration (fallback)
   */
  private getDefaultConfig(): SystemConfig {
    return {
      features: {
        liveScoring: true,
        backtest: true,
        autoTuning: false,
        autoTrade: false,
        manualTrade: true
      },
      modes: {
        environment: 'DEV',
        trading: 'DRY_RUN'
      }
    };
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(config: any): void {
    if (!config.features || typeof config.features !== 'object') {
      throw new Error('Invalid config: missing features object');
    }

    if (!config.modes || typeof config.modes !== 'object') {
      throw new Error('Invalid config: missing modes object');
    }

    const requiredFeatures = [
      'liveScoring',
      'backtest',
      'autoTuning',
      'autoTrade',
      'manualTrade'
    ];

    for (const feature of requiredFeatures) {
      if (typeof config.features[feature] !== 'boolean') {
        throw new Error(`Invalid config: features.${feature} must be boolean`);
      }
    }

    if (!['DEV', 'STAGING', 'PROD'].includes(config.modes.environment)) {
      throw new Error('Invalid config: modes.environment must be DEV, STAGING, or PROD');
    }

    if (!['OFF', 'DRY_RUN', 'TESTNET'].includes(config.modes.trading)) {
      throw new Error('Invalid config: modes.trading must be OFF, DRY_RUN, or TESTNET');
    }
  }

  /**
   * Get full system configuration
   */
  getSystemConfig(): SystemConfig {
    return this.loadConfig();
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof SystemConfig['features']): boolean {
    const config = this.loadConfig();
    return config.features[feature] || false;
  }

  /**
   * Get current environment mode
   */
  getEnvironment(): 'DEV' | 'STAGING' | 'PROD' {
    const config = this.loadConfig();
    return config.modes.environment;
  }

  /**
   * Get current trading mode
   */
  getTradingMode(): TradingMode {
    const config = this.loadConfig();
    // Prefer new trading.mode over legacy modes.trading
    return config.trading?.mode || config.modes.trading;
  }

  /**
   * Get current trading market
   */
  getTradingMarket(): TradingMarket {
    const config = this.loadConfig();
    // Default to FUTURES if not specified
    return config.trading?.market || 'FUTURES';
  }

  /**
   * Reload configuration from disk (useful for hot-reload)
   */
  reload(): void {
    this.config = null;
    this.loadConfig();
    this.logger.info('System configuration reloaded');
  }
}

// Export singleton instance
const systemConfigManager = SystemConfigManager.getInstance();

export const getSystemConfig = (): SystemConfig =>
  systemConfigManager.getSystemConfig();

export const isFeatureEnabled = (feature: keyof SystemConfig['features']): boolean =>
  systemConfigManager.isFeatureEnabled(feature);

export const getEnvironment = (): 'DEV' | 'STAGING' | 'PROD' =>
  systemConfigManager.getEnvironment();

export const getTradingMode = (): TradingMode =>
  systemConfigManager.getTradingMode();

export const getTradingMarket = (): TradingMarket =>
  systemConfigManager.getTradingMarket();

export const reloadSystemConfig = (): void =>
  systemConfigManager.reload();
