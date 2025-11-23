// src/controllers/SystemController.ts
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { Database } from '../data/Database.js';
import { RedisService } from '../services/RedisService.js';
import { AdvancedCache } from '../core/AdvancedCache.js';
import { getDataSourceConfig } from '../config/dataSource.js';
import { HFDataEngineAdapter } from '../services/HFDataEngineAdapter.js';
import { createErrorResponse } from '../utils/errorResponse.js';

export class SystemController {
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  private database = Database.getInstance();
  private redisService = RedisService.getInstance();
  private cache = AdvancedCache.getInstance();

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const timestamp = Date.now();
      const dataSourceConfig = getDataSourceConfig();
      const redisStatus = await this.redisService.getConnectionStatus();
      const dbStatus = await this.database.getHealth();
      const dataSourceResult = await HFDataEngineAdapter.getHealthSummary();

      const dataSource = dataSourceResult.ok
        ? {
            status: 'available',
            primarySource: dataSourceConfig.primarySource,
            providers: dataSourceResult.data.providers,
            engine: dataSourceResult.data.health
          }
        : {
            status: 'unavailable',
            primarySource: dataSourceConfig.primarySource,
            error: dataSourceResult.message,
            reason: dataSourceResult.reason,
            source: dataSourceResult.source
          };

      const servicesHealthy =
        redisStatus.isConnected &&
        Boolean(dbStatus) &&
        dataSourceResult.ok;

      const health = {
        status: servicesHealthy ? 'healthy' : 'degraded',
        timestamp,
        services: {
          database: {
            status: dbStatus ? 'connected' : 'disconnected',
            ...dbStatus
          },
          redis: {
            status: redisStatus.isConnected ? 'connected' : 'disconnected',
            reconnectAttempts: redisStatus.reconnectAttempts
          },
          dataSource
        },
        dataSource: {
          primarySource: dataSourceConfig.primarySource,
          availableSources: dataSourceConfig.availableSources,
          overrides: dataSourceConfig.overrides,
          huggingface: dataSourceConfig.huggingface
        },
        uptime: process.uptime()
      };

      const statusCode = servicesHealthy ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      this.logger.error('Health check failed', {}, error as Error);
      res.status(500).json(
        createErrorResponse({
          source: 'system',
          reason: 'UNKNOWN',
          message: (error as Error).message,
          details: { stack: (error as Error).stack }
        })
      );
    }
  }

  async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const dataSourceConfig = getDataSourceConfig();

      const status = {
        timestamp: Date.now(),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime()
        },
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        config: {
          realDataMode: this.config.isRealDataMode(),
          tradingEnabled: this.config.getExchangeConfig().tradingEnabled,
          dataSource: dataSourceConfig
        }
      };

      res.json(status);
    } catch (error) {
      this.logger.error('Failed to get system status', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get system status',
        message: (error as Error).message
      });
    }
  }

  async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = this.cache.getStats();
      const redisStats = await this.redisService.getStats();

      res.json({
        success: true,
        cache: cacheStats,
        redis: redisStats,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get cache stats', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get cache stats',
        message: (error as Error).message
      });
    }
  }

  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      await this.cache.clear();

      res.json({
        success: true,
        message: 'Cache cleared',
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to clear cache', {}, error as Error);
      res.status(500).json({
        error: 'Failed to clear cache',
        message: (error as Error).message
      });
    }
  }

  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = {
        realDataMode: this.config.isRealDataMode(),
        demoMode: this.config.isDemoMode(),
        exchange: this.config.getExchangeConfig(),
        marketData: this.config.getMarketDataConfig(),
        dataSource: getDataSourceConfig(),
        timestamp: Date.now()
      };

      res.json({
        success: true,
        config,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get config', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get config',
        message: (error as Error).message
      });
    }
  }
}

