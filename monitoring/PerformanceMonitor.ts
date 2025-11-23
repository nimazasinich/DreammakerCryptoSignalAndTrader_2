// src/monitoring/PerformanceMonitor.ts
import { Logger } from '../core/Logger.js';
import os from 'os';

export interface PerformanceMetrics {
  timestamp: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    heapUsagePercent: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  system: {
    loadAverage: number[];
    uptime: number;
    platform: string;
    arch: string;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private logger = Logger.getInstance();
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000;
  private startCpuUsage = process.cpuUsage();
  private startTime = Date.now();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  collectMetrics(): PerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.startCpuUsage);
    const elapsedTime = (Date.now() - this.startTime) / 1000; // in seconds

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
        external: memoryUsage.external,
        heapUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user / 1000000, // Convert to milliseconds
        system: cpuUsage.system / 1000000
      },
      system: {
        loadAverage: os.loadavg(),
        uptime: process.uptime(),
        platform: os.platform(),
        arch: os.arch()
      }
    };

    this.metrics.push(metrics);

    // Keep only recent metrics
    if ((this.metrics?.length || 0) > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Reset CPU usage tracking
    this.startCpuUsage = process.cpuUsage();
    this.startTime = Date.now();

    return metrics;
  }

  getRecentMetrics(seconds: number = 60): PerformanceMetrics[] {
    const cutoff = Date.now() - (seconds * 1000);
    return this?.metrics?.filter(m => m.timestamp >= cutoff);
  }

  getAverageMetrics(seconds: number = 60): Partial<PerformanceMetrics> {
    const recent = this.getRecentMetrics(seconds);
    
    if (recent.length === 0) {
      return {};
    }

    const avgMemory = recent.reduce((acc, m) => ({
      heapUsed: acc.heapUsed + m.memory.heapUsed,
      heapTotal: acc.heapTotal + m.memory.heapTotal,
      rss: acc.rss + m.memory.rss
    }), { heapUsed: 0, heapTotal: 0, rss: 0 });

    const count = recent.length;

    return {
      timestamp: Date.now(),
      memory: {
        heapUsed: avgMemory.heapUsed / count,
        heapTotal: avgMemory.heapTotal / count,
        rss: avgMemory.rss / count,
        external: 0,
        heapUsagePercent: (avgMemory.heapUsed / avgMemory.heapTotal) * 100
      }
    };
  }

  checkThresholds(): Array<{ metric: string; value: number; threshold: number; status: string }> {
    const current = this.collectMetrics();
    const alerts: Array<{ metric: string; value: number; threshold: number; status: string }> = [];

    // Memory threshold check (80%)
    if (current.memory.heapUsagePercent > 80) {
      alerts.push({
        metric: 'memory.heapUsagePercent',
        value: current.memory.heapUsagePercent,
        threshold: 80,
        status: 'warning'
      });
    }

    if (current.memory.heapUsagePercent > 90) {
      alerts.push({
        metric: 'memory.heapUsagePercent',
        value: current.memory.heapUsagePercent,
        threshold: 90,
        status: 'critical'
      });
    }

    // CPU load average check
    const loadAvg = current.system.loadAverage[0];
    const cpuCount = os.cpus().length;
    const loadPercent = (loadAvg / cpuCount) * 100;

    if (loadPercent > 80) {
      alerts.push({
        metric: 'cpu.loadAverage',
        value: loadPercent,
        threshold: 80,
        status: 'warning'
      });
    }

    return alerts;
  }
}

