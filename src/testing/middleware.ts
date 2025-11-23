/**
 * Express Middleware for API Testing
 * یکپارچه‌سازی خودکار با Express
 */

import { Request, Response, NextFunction } from 'express';
import { testConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

interface TestMetrics {
  totalRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  endpoints: Map<string, EndpointMetrics>;
}

interface EndpointMetrics {
  count: number;
  failures: number;
  avgTime: number;
  lastError?: string;
}

export class TestingMiddleware {
  private metrics: TestMetrics;
  private enabled: boolean;

  constructor() {
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      endpoints: new Map(),
    };
    
    this.enabled = this.loadConfig();
  }

  private loadConfig(): boolean {
    const configPath = path.join(process.cwd(), 'config', 'testing.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.enabled || false;
    }
    return false;
  }

  /**
   * Middleware برای جمع‌آوری metrics
   */
  metricsCollector() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.enabled) {
        return next();
      }

      const startTime = Date.now();
      const endpoint = `${req.method} ${req.path}`;

      // Override res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        const duration = Date.now() - startTime;
        this.recordMetrics(endpoint, duration, res.statusCode);
        return originalJson(body);
      };

      // Handle errors
      res.on('finish', () => {
        if (res.statusCode >= 400) {
          this.recordFailure(endpoint);
        }
      });

      next();
    };
  }

  private recordMetrics(endpoint: string, duration: number, statusCode: number) {
    this.metrics.totalRequests++;
    
    // Update average response time
    const total = this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + duration;
    this.metrics.avgResponseTime = total / this.metrics.totalRequests;

    // Update endpoint metrics
    let endpointMetrics = this.metrics.endpoints.get(endpoint);
    if (!endpointMetrics) {
      endpointMetrics = { count: 0, failures: 0, avgTime: 0 };
      this.metrics.endpoints.set(endpoint, endpointMetrics);
    }

    endpointMetrics.count++;
    const endpointTotal = endpointMetrics.avgTime * (endpointMetrics.count - 1) + duration;
    endpointMetrics.avgTime = endpointTotal / endpointMetrics.count;
  }

  private recordFailure(endpoint: string) {
    this.metrics.failedRequests++;
    
    const endpointMetrics = this.metrics.endpoints.get(endpoint);
    if (endpointMetrics) {
      endpointMetrics.failures++;
    }
  }

  /**
   * Endpoint برای دریافت metrics
   */
  getMetricsEndpoint() {
    return (req: Request, res: Response) => {
      const metrics = {
        totalRequests: this.metrics.totalRequests,
        failedRequests: this.metrics.failedRequests,
        successRate: this.metrics.totalRequests > 0 
          ? ((this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests * 100).toFixed(2)
          : '0',
        avgResponseTime: Math.round(this.metrics.avgResponseTime),
        endpoints: Array.from(this.metrics.endpoints.entries()).map(([path, metrics]) => ({
          path,
          count: metrics.count,
          failures: metrics.failures,
          avgTime: Math.round(metrics.avgTime),
          successRate: ((metrics.count - metrics.failures) / metrics.count * 100).toFixed(2),
        })),
      };

      res.json(metrics);
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      endpoints: new Map(),
    };
  }
}

/**
 * Health check endpoint با اطلاعات تست
 */
export function healthCheckWithTests() {
  return (req: Request, res: Response) => {
    const config = testConfig.getConfig();
    
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      testing: {
        enabled: config.baseURL !== undefined,
        baseURL: config.baseURL,
        parallelTests: config.parallelTests,
        adaptiveTimeout: config.adaptiveTimeout,
      },
    });
  };
}

export default TestingMiddleware;

