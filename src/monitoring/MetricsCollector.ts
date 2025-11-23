// src/monitoring/MetricsCollector.ts
import { Logger } from '../core/Logger.js';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface ApiMetrics {
  endpoint: string;
  method: string;
  count: number;
  avgResponseTime: number;
  errorCount: number;
  lastRequest?: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private logger = Logger.getInstance();
  private metrics: Metric[] = [];
  private apiMetrics = new Map<string, ApiMetrics>();
  private maxMetrics = 10000;
  private maxApiMetrics = 1000;

  private constructor() {}

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);

    // Evict old metrics if needed
    if ((this.metrics?.length || 0) > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  recordApiCall(
    endpoint: string,
    method: string,
    responseTime: number,
    isError: boolean = false
  ): void {
    const key = `${method}:${endpoint}`;
    const existing = this.apiMetrics.get(key);

    if (existing) {
      existing.count++;
      existing.avgResponseTime =
        (existing.avgResponseTime * (existing.count - 1) + responseTime) / existing.count;
      existing.errorCount += isError ? 1 : 0;
      existing.lastRequest = Date.now();
    } else {
      if (this.apiMetrics.size >= this.maxApiMetrics) {
        // Remove oldest entry
        const oldestKey = Array.from(this.apiMetrics.keys())[0];
        this.apiMetrics.delete(oldestKey);
      }

      this.apiMetrics.set(key, {
        endpoint,
        method,
        count: 1,
        avgResponseTime: responseTime,
        errorCount: isError ? 1 : 0,
        lastRequest: Date.now()
      });
    }
  }

  getMetrics(name?: string, since?: number): Metric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }

    return filtered;
  }

  getApiMetrics(): ApiMetrics[] {
    return Array.from(this.apiMetrics.values());
  }

  getApiMetricsForEndpoint(endpoint: string, method?: string): ApiMetrics | null {
    const key = method ? `${method}:${endpoint}` : endpoint;
    
    for (const [k, v] of this.apiMetrics.entries()) {
      if (method && k === key) {
        return v;
      }
      if (!method && v.endpoint === endpoint) {
        return v;
      }
    }

    return null;
  }

  getSummary(): {
    totalMetrics: number;
    totalApiCalls: number;
    topEndpoints: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
    errorRate: number;
  } {
    const totalApiCalls = Array.from(this.apiMetrics.values())
      .reduce((sum, m) => sum + m.count, 0);

    const totalErrors = Array.from(this.apiMetrics.values())
      .reduce((sum, m) => sum + m.errorCount, 0);

    const errorRate = totalApiCalls > 0 ? (totalErrors / totalApiCalls) * 100 : 0;

    const topEndpoints = Array.from(this.apiMetrics.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(m => ({
        endpoint: m.endpoint,
        count: m.count,
        avgResponseTime: m.avgResponseTime
      }));

    return {
      totalMetrics: this.metrics.length,
      totalApiCalls,
      topEndpoints,
      errorRate: Math.round(errorRate * 100) / 100
    };
  }

  clear(): void {
    this.metrics = [];
    this.apiMetrics.clear();
    this.logger.info('Metrics cleared');
  }
}

