/**
 * Backend Health Check Utility
 * Monitors backend server availability and provides health status
 */

import React, { useState } from 'react';
import { Logger } from '../core/Logger.js';
import { API_BASE } from '../config/env.js';

const logger = Logger.getInstance();

export interface BackendHealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number | null;
  error: string | null;
  endpoints: {
    [key: string]: {
      available: boolean;
      responseTime: number | null;
    };
  };
}

class BackendHealthMonitor {
  private static instance: BackendHealthMonitor;
  private healthStatus: BackendHealthStatus = {
    isHealthy: false,
    lastCheck: new Date(),
    responseTime: null,
    error: null,
    endpoints: {},
  };
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds
  private healthChangeListeners: Array<(isHealthy: boolean) => void> = [];

  private constructor() {
    this.performHealthCheck();
  }

  static getInstance(): BackendHealthMonitor {
    if (!BackendHealthMonitor.instance) {
      BackendHealthMonitor.instance = new BackendHealthMonitor();
    }
    return BackendHealthMonitor.instance;
  }

  /**
   * Start periodic health checks
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      return; // Already monitoring
    }

    logger.info('Starting backend health monitoring...');
    this.performHealthCheck();

    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop periodic health checks
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Stopped backend health monitoring');
    }
  }

  /**
   * Perform a health check
   */
  async performHealthCheck(): Promise<BackendHealthStatus> {
    const startTime = Date.now();
    const wasHealthy = this.healthStatus.isHealthy;

    try {
      // Check main health endpoint
      const healthEndpoint = `${API_BASE}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(healthEndpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.healthStatus = {
          isHealthy: true,
          lastCheck: new Date(),
          responseTime,
          error: null,
          endpoints: {
            health: { available: true, responseTime },
          },
        };

        logger.info(`Backend is healthy (${responseTime}ms)`);

        // Notify listeners if status changed
        if (!wasHealthy) {
          this.notifyHealthChange(true);
        }
      } else {
        console.error(`Health check failed: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      const errorMsg = error.name === 'AbortError'
        ? 'Backend health check timeout'
        : error.message?.includes('Failed to fetch')
        ? 'Backend server not reachable'
        : error.message || 'Unknown error';

      this.healthStatus = {
        isHealthy: false,
        lastCheck: new Date(),
        responseTime: null,
        error: errorMsg,
        endpoints: {
          health: { available: false, responseTime: null },
        },
      };

      logger.warn(`Backend is unhealthy: ${errorMsg}`);

      // Notify listeners if status changed
      if (wasHealthy) {
        this.notifyHealthChange(false);
      }
    }

    return this.healthStatus;
  }

  /**
   * Check specific endpoint availability
   */
  async checkEndpoint(path: string): Promise<{ available: boolean; responseTime: number | null }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE}/${path}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const available = response.ok;

      this.healthStatus.endpoints[path] = { available, responseTime };

      return { available, responseTime };
    } catch (error) {
      this.healthStatus.endpoints[path] = { available: false, responseTime: null };
      return { available: false, responseTime: null };
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(): BackendHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Check if backend is healthy
   */
  isHealthy(): boolean {
    return this.healthStatus.isHealthy;
  }

  /**
   * Subscribe to health status changes
   */
  onHealthChange(callback: (isHealthy: boolean) => void): () => void {
    this.healthChangeListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.healthChangeListeners.indexOf(callback);
      if (index > -1) {
        this.healthChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of health status change
   */
  private notifyHealthChange(isHealthy: boolean): void {
    this.healthChangeListeners.forEach(callback => {
      try {
        callback(isHealthy);
      } catch (error) {
        logger.error('Error in health change listener:', {}, error as Error);
      }
    });
  }

  /**
   * Force an immediate health check
   */
  async forceCheck(): Promise<BackendHealthStatus> {
    logger.info('Forcing immediate health check...');
    return await this.performHealthCheck();
  }
}

// Export singleton instance
export const backendHealth = BackendHealthMonitor.getInstance();

/**
 * React hook for backend health status
 */
export function useBackendHealth() {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = React.useState<BackendHealthStatus>(
    backendHealth.getHealthStatus()
  );

  React.useEffect(() => {
    // Start monitoring
    backendHealth.startMonitoring();

    // Subscribe to changes
    const unsubscribe = backendHealth.onHealthChange((isHealthy) => {
      setStatus(backendHealth.getHealthStatus());
    });

    // Update status on mount
    setStatus(backendHealth.getHealthStatus());

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...status,
    refresh: () => backendHealth.forceCheck(),
  };
}
