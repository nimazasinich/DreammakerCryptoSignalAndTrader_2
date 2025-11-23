import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../config/env';
import { SimpleCache, registerCache } from './cache';
import { errorTracker } from './errorTracking';
import { measurePerformance } from './performanceMonitor';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown' | 'offline';

interface HealthResult {
  status: HealthStatus;
  error: string | null;
  checking: boolean;
  checkedAt: number | null;
  refresh: () => void;
  fromCache: boolean;
  latency: number | null;
}

const DEFAULT_ENDPOINTS = ['/health', '/status/health'];
const HEALTH_CACHE_TTL = 10_000;

interface HealthSnapshot {
  status: HealthStatus;
  error: string | null;
  checkedAt: number;
  latency: number | null;
}

export type HealthHistoryEntry = HealthSnapshot & { fromCache: boolean };

const healthCache = new SimpleCache<HealthSnapshot>({
  maxSize: 10,
  defaultTTL: HEALTH_CACHE_TTL,
});

registerCache('health', healthCache);

const CACHE_KEY = 'health-status';
const HEALTH_HISTORY_LIMIT = 200;
const healthHistory: HealthHistoryEntry[] = [];
const historyListeners = new Set<() => void>();

function notifyHistory() {
  historyListeners.forEach((listener) => listener());
}

function recordHealthHistory(entry: HealthHistoryEntry) {
  healthHistory.push(entry);
  if (healthHistory.length > HEALTH_HISTORY_LIMIT) {
    healthHistory.shift();
  }
  notifyHistory();
}

export function getHealthHistory(limit = 30) {
  return healthHistory.slice(-limit).reverse();
}

export function subscribeToHealthHistory(listener: () => void) {
  historyListeners.add(listener);
  return () => {
    historyListeners.delete(listener);
  };
}

export function useHealthCheck(pingMs = 10000, timeoutMs = 3000): HealthResult {
  const [status, setStatus] = useState<HealthStatus>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const mountedRef = useRef(true);
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applySnapshot = useCallback(
    (snapshot: HealthSnapshot, cacheHit: boolean) => {
      if (!mountedRef.current) return;
      setStatus(snapshot.status);
      setError(snapshot.error);
      setCheckedAt(snapshot.checkedAt);
      setFromCache(cacheHit);
      setLatency(snapshot.latency ?? null);
      setChecking(false);
      recordHealthHistory({ ...snapshot, fromCache: cacheHit });
    },
    []
  );

  const endpoints = useMemo(() => {
    const normalizeBase = (base: string) => {
      if (!base) return '';
      return base.endsWith('/') ? base.slice(0, -1) : base;
    };

    const base = normalizeBase(API_BASE);
    return (DEFAULT_ENDPOINTS || []).map((endpoint) => {
      if (endpoint.startsWith('http')) return endpoint;
      return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    });
  }, []);

  const fetchWithTimeout = useCallback(async (url: string): Promise<HealthStatus> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        credentials: 'include'
      });

      if (response.ok) {
        await response.json().catch(() => ({}));
        return 'healthy';
      }

      if (response.status >= 500) {
        console.error(`Server error: HTTP ${response.status}`);
        return 'down';
      }

      if (response.status >= 400) {
        return 'degraded';
      }

      console.error(`HTTP ${response.status}`);
      return 'down';
    } finally {
      clearTimeout(timeoutId);
    }
  }, [timeoutMs]);

  const runCheck = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!isOnline) {
      const snapshot: HealthSnapshot = {
        status: 'offline',
        error: 'Waiting for connection…',
        checkedAt: Date.now(),
        latency: null,
      };
      applySnapshot(snapshot, false);
      return;
    }

    if (!force) {
      const cached = healthCache.get(CACHE_KEY);
      if (cached) {
        applySnapshot(cached, true);
        return;
      }
    } else {
      healthCache.invalidate(CACHE_KEY);
    }

    if (mountedRef.current) {
      setChecking(true);
      setFromCache(false);
      setError(null);
    }

    await measurePerformance('useHealthCheck.check', async () => {
      let derivedStatus: HealthStatus = 'down';
      let derivedError: string | null = null;
      const startTime = Date.now();

      for (const endpoint of endpoints) {
        try {
          const healthStatus = await fetchWithTimeout(endpoint);
          derivedStatus = healthStatus;

          if (healthStatus === 'healthy') {
            derivedError = null;
            break;
          }

          if (healthStatus === 'degraded') {
            derivedError = 'Service degraded';
          }
        } catch (err: any) {
          derivedError = err instanceof Error ? err.message : String(err);
        }
      }

      const snapshot: HealthSnapshot = {
        status: derivedStatus,
        error: derivedError,
        checkedAt: Date.now(),
        latency: Date.now() - startTime,
      };

      healthCache.set(CACHE_KEY, snapshot, HEALTH_CACHE_TTL);
      applySnapshot(snapshot, false);

      if (derivedStatus === 'healthy') {
        errorTracker.trackRecovery({
          component: 'useHealthCheck',
          action: 'health-check',
          details: { endpoints },
          message: 'API health restored',
        });
      } else if (derivedStatus !== 'offline') {
        errorTracker.trackError({
          category: derivedStatus === 'degraded' ? 'server' : 'network',
          severity: derivedStatus === 'down' ? 'error' : 'warning',
          message: derivedError ?? `Health status: ${derivedStatus}`,
          context: {
            component: 'useHealthCheck',
            action: 'health-check',
            details: { endpoints, status: derivedStatus },
          },
        });
      }
    }, { endpoints: endpoints.length });
  }, [applySnapshot, endpoints, fetchWithTimeout, isOnline]);

  useEffect(() => {
    let isMounted = true;
    const check = async (options?: { force?: boolean }) => {
      if (!isMounted) return;
      await runCheck(options);
    };

    check();
    if (!isOnline) {
      return () => {
        isMounted = false;
      };
    }

    const intervalId = setInterval(() => check(), pingMs);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isOnline, pingMs, runCheck]);

  const refresh = useCallback(() => {
    runCheck({ force: true });
  }, [runCheck]);

  return { status, error, checking, checkedAt, refresh, fromCache, latency };
}

export default useHealthCheck;
