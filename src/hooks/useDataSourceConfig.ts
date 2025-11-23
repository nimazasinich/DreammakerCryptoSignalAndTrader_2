import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '../lib/api.js';
import type { DataSourceConfigResponse, PrimaryDataSource } from '../types/index.js';

type PrimarySourceOverride = PrimaryDataSource | 'env';

interface UseDataSourceConfigResult {
  config: DataSourceConfigResponse | null;
  loading: boolean;
  error: string | null;
  isUpdating: boolean;
  refresh: () => Promise<void>;
  updatePrimarySource: (source: PrimarySourceOverride) => Promise<void>;
}

export function useDataSourceConfig(pollIntervalMs?: number): UseDataSourceConfigResult {
  const [config, setConfig] = useState<DataSourceConfigResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const isMountedRef = useRef(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet<DataSourceConfigResponse>('/config/data-source');
      if (!isMountedRef.current) return;
      setConfig(response);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load data source config');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const updatePrimarySource = useCallback(
    async (source: PrimarySourceOverride) => {
      setIsUpdating(true);
      try {
        await apiPost('/config/data-source', { primarySource: source });
        await fetchConfig();
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to update data source');
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          setIsUpdating(false);
        }
      }
    },
    [fetchConfig]
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchConfig();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchConfig]);

  useEffect(() => {
    if (!pollIntervalMs) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchConfig();
    }, pollIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchConfig, pollIntervalMs]);

  return {
    config,
    loading,
    error,
    isUpdating,
    refresh: fetchConfig,
    updatePrimarySource
  };
}

export type { PrimarySourceOverride };

