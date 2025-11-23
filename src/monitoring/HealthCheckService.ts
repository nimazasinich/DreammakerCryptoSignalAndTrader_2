// src/monitoring/HealthCheckService.ts
import { Logger } from '../core/Logger.js';
import { Database } from '../data/Database.js';
import { RedisService } from '../services/RedisService.js';
import { BinanceService } from '../services/BinanceService.js';
import { ConfigManager } from '../core/ConfigManager.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    binance: ServiceHealth;
    externalAPIs: ServiceHealth;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    uptime: number;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  lastCheck?: number;
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private logger = Logger.getInstance();
  private database = Database.getInstance();
  private redisService = RedisService.getInstance();
  private binanceService = BinanceService.getInstance();
  private config = ConfigManager.getInstance();
  private lastHealthCheck: HealthStatus | null = null;

  private constructor() {}

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkBinance(),
      this.checkExternalAPIs()
    ]);

    const [dbHealth, redisHealth, binanceHealth, apiHealth] = (checks || []).map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        status: 'unhealthy' as const,
        error: result.reason?.message || 'Unknown error',
        lastCheck: Date.now()
      };
    });

    const overallStatus = this.calculateOverallStatus([
      dbHealth,
      redisHealth,
      binanceHealth,
      apiHealth
    ]);

    const systemInfo = await this.getSystemInfo();

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: Date.now(),
      services: {
        database: dbHealth,
        redis: redisHealth,
        binance: binanceHealth,
        externalAPIs: apiHealth
      },
      system: systemInfo
    };

    this.lastHealthCheck = healthStatus;
    const duration = Date.now() - startTime;

    this.logger.info('Health check completed', {
      status: overallStatus,
      duration,
      services: Object.keys(healthStatus.services).length
    });

    return healthStatus;
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const health = await this.database.getHealth();
      const latency = Date.now() - startTime;

      return {
        status: health ? 'healthy' : 'degraded',
        latency,
        lastCheck: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
        latency: Date.now() - startTime,
        lastCheck: Date.now()
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const status = await this.redisService.getConnectionStatus();
      const latency = Date.now() - startTime;

      return {
        status: status.isConnected ? 'healthy' : 'unhealthy',
        latency,
        lastCheck: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
        latency: Date.now() - startTime,
        lastCheck: Date.now()
      };
    }
  }

  private async checkBinance(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // Simple ping check
      const testSymbol = 'BTCUSDT';
      await this.binanceService.getCurrentPrice(testSymbol);
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
        lastCheck: Date.now()
      };
    } catch (error) {
      return {
        status: 'degraded',
        error: (error as Error).message,
        latency: Date.now() - startTime,
        lastCheck: Date.now()
      };
    }
  }

  private async checkExternalAPIs(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // Check if real data mode is enabled
      if (!this.config.isRealDataMode()) {
        return {
          status: 'healthy',
          lastCheck: Date.now()
        };
      }

      // Simple fetch test
      const response = await fetch('https://api.alternative.me/fng/?limit=1', {
        signal: AbortSignal.timeout(5000)
      });

      const latency = Date.now() - startTime;
      const isHealthy = response.ok;

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        latency,
        lastCheck: Date.now()
      };
    } catch (error) {
      return {
        status: 'degraded',
        error: (error as Error).message,
        latency: Date.now() - startTime,
        lastCheck: Date.now()
      };
    }
  }

  private calculateOverallStatus(services: ServiceHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = (services || []).map(s => s.status);
    
    if (statuses.every(s => s === 'healthy')) {
      return 'healthy';
    }
    
    if (statuses.some(s => s === 'unhealthy')) {
      return 'unhealthy';
    }
    
    return 'degraded';
  }

  private async getSystemInfo() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    return {
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round(memoryPercentage * 100) / 100
      },
      cpu: {
        usage: 0 // Would need external library for actual CPU usage
      },
      uptime: process.uptime()
    };
  }

  getLastHealthCheck(): HealthStatus | null {
    return this.lastHealthCheck;
  }

  async getDetailedHealth(): Promise<HealthStatus & { dependencies: any }> {
    const health = await this.performHealthCheck();
    
    return {
      ...health,
      dependencies: {
        config: {
          realDataMode: this.config.isRealDataMode(),
          tradingEnabled: this.config.getExchangeConfig().tradingEnabled
        },
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }
}

