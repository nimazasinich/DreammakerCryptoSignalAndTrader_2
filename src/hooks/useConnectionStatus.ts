/**
 * Connection Status Hook
 * Provides real-time connection status and health information
 */

import { useState, useEffect, useCallback } from 'react';
import { connectionMonitor } from '../services/ConnectionMonitor';
import type { ConnectionHealth, DataSourceStatus } from '../config/endpoints';

interface UseConnectionStatusReturn {
  health: ConnectionHealth | null;
  status: DataSourceStatus | null;
  statusMessage: string;
  isHealthy: boolean;
  isDegraded: boolean;
  isOffline: boolean;
  refresh: () => Promise<void>;
  loading: boolean;
}

export function useConnectionStatus(autoRefresh = true, refreshInterval = 30000): UseConnectionStatusReturn {
  const [health, setHealth] = useState<ConnectionHealth | null>(null);
  const [status, setStatus] = useState<DataSourceStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Checking connection...');
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const [healthData, statusData, message] = await Promise.all([
        connectionMonitor.getHealthStatus(),
        connectionMonitor.getDataSourceStatus(),
        connectionMonitor.getStatusMessage(),
      ]);

      setHealth(healthData);
      setStatus(statusData);
      setStatusMessage(message);
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
      setStatusMessage('❌ Unable to check connection status');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Set up auto-refresh
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchStatus]);

  const isHealthy = health?.backend === true && health?.huggingface === true;
  const isDegraded = status?.degraded === true;
  const isOffline = status?.primary === 'offline';

  return {
    health,
    status,
    statusMessage,
    isHealthy,
    isDegraded,
    isOffline,
    refresh,
    loading,
  };
}

