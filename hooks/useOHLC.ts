/**
 * useOHLC - SWR-like hook for OHLC data
 *
 * Features:
 * - Auto-fetch on mount and symbol/timeframe change
 * - Keeps last good data visible during refetch
 * - Auto retry on failure with exponential backoff
 * - Explicit reload function
 * - No demo/mock data in Online mode
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithRetry } from '../lib/fetchWithRetry';
import { API_BASE, requiresRealData } from '../config/env';
import { MIN_BARS } from '../config/risk';
import { Logger } from '../core/Logger';
import { SimpleCache, registerCache } from '../lib/cache';
import { errorTracker } from '../lib/errorTracking';
import { measurePerformance } from '../lib/performanceMonitor';
import { useOnlineStatus } from './useOnlineStatus';

const logger = Logger.getInstance();
const OHLC_CACHE_TTL = 30_000;

interface CachedOHLCEntry {
  data: OHLCBar[];
  updatedAt: number;
}

const ohlcCache = new SimpleCache<CachedOHLCEntry>({
  maxSize: 200,
  defaultTTL: OHLC_CACHE_TTL,
});

registerCache('ohlc', ohlcCache);

const makeCacheKey = (symbol: string, timeframe: string, limit: number) =>
  `${symbol}-${timeframe}-${limit}`;

export interface OHLCBar {
  t: number;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
}

export interface UseOHLCResult {
  data: OHLCBar[] | null;
  loading: boolean;
  error: string | null;
  updatedAt: number | null;
  reload: () => void;
  nextRetryInMs?: number | null;
}

/**
 * Hook to fetch OHLC data with resilience
 *
 * @param symbol - Trading pair symbol (e.g., 'BTC/USDT')
 * @param timeframe - Timeframe (e.g., '1h', '4h', '1d')
 * @param limit - Number of bars to fetch (default: 500)
 * @returns OHLC data, loading state, error, and reload function
 *
 * @example
 * const { data, loading, error, reload } = useOHLC('BTC/USDT', '1h', 500);
 */
export function useOHLC(
  symbol: string,
  timeframe: string,
  limit: number = 500
): UseOHLCResult {
  const [data, setData] = useState<OHLCBar[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [nextRetryInMs, setNextRetryInMs] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { isOnline } = useOnlineStatus();
  const wasOfflineRef = useRef<boolean>(!isOnline);

  const fetchData = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    const cacheKey = makeCacheKey(symbol, timeframe, limit);

    if (force) {
      ohlcCache.invalidate(cacheKey);
    } else {
      const cached = ohlcCache.get(cacheKey);
      if (cached) {
        setData(cached.data);
        setUpdatedAt(cached.updatedAt);
        setError(null);
        setLoading(false);
        return;
      }
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!isOnline) {
      setError('Waiting for network connection…');
      setLoading(false);
      setNextRetryInMs(null);
      return;
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);
    setNextRetryInMs(null);

    try {
      // Convert symbol to Binance format (BTC/USDT -> BTCUSDT)
      const binanceSymbol = symbol.replace('/', '');

      const url = `${API_BASE}/market/ohlcv?symbol=${binanceSymbol}&timeframe=${timeframe}&limit=${limit}`;

      logger.info('Fetching OHLC data:', { symbol: binanceSymbol, timeframe, limit });

      await measurePerformance('useOHLC.fetch', async () => {
        const response = await fetchWithRetry(url, {
          signal: abortControllerRef.current.signal,
          timeout: 10000,
          retries: 4,
          baseDelay: 1000,
          maxDelay: 30_000,
          dedupeKey: url,
          onRetry: (_attempt, delay) => {
            setNextRetryInMs(delay);
          },
        });

        if (!response.ok) {
          console.error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();

        // Validate response structure
        if (!Array.isArray(json)) {
          console.error('Invalid response: expected array of OHLC bars');
        }

        // Transform to consistent format
        const bars: OHLCBar[] = (json || []).map((bar: any) => ({
          t: bar.t ?? bar.timestamp ?? bar.time ?? Date.now(),
          o: bar.o ?? bar.open ?? 0,
          h: bar.h ?? bar.high ?? 0,
          l: bar.l ?? bar.low ?? 0,
          c: bar.c ?? bar.close ?? 0,
          v: bar.v ?? bar.volume ?? 0,
        }));

        // Validate minimum data requirement
        if (bars.length < MIN_BARS) {
          console.error(`Insufficient data: got ${bars.length} bars, need at least ${MIN_BARS}`);
        }

        const now = Date.now();
        const payload: CachedOHLCEntry = {
          data: bars,
          updatedAt: now,
        };

        ohlcCache.set(cacheKey, payload, OHLC_CACHE_TTL);

        setData(payload.data);
        setUpdatedAt(payload.updatedAt);
        setError(null);

        logger.info('OHLC data loaded successfully:', {
          symbol: binanceSymbol,
          bars: bars.length,
        });

        errorTracker.trackRecovery({
          component: 'useOHLC',
          action: 'fetch',
          details: { symbol: binanceSymbol, timeframe, limit },
          message: 'OHLC data refreshed successfully',
        });
      }, { symbol: binanceSymbol, timeframe, limit });
    } catch (err: any) {
      // Don't overwrite data on error (keep last good data visible)
      const errorMessage = err.name === 'AbortError'
        ? 'Request cancelled'
        : err.message || 'Failed to fetch OHLC data';

      setError(errorMessage);

      logger.error('Failed to fetch OHLC data:', { symbol, timeframe, limit }, err);

      errorTracker.trackError({
        category: err?.status >= 500 ? 'server' : 'network',
        message: errorMessage,
        stack: err?.stack,
        context: {
          component: 'useOHLC',
          action: 'fetch',
          details: { symbol, timeframe, limit },
        },
      });

      // In Online mode, never use mock/synthetic data
      if (requiresRealData()) {
        logger.warn('Online mode: no fallback to mock data');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      setNextRetryInMs(null);
    }
  }, [symbol, timeframe, limit, isOnline]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchData();

    // Cleanup: abort pending request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Auto refresh once we come back online after being offline
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      fetchData({ force: true });
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, fetchData]);

  // Explicit reload function
  const reload = useCallback(() => {
    fetchData({ force: true });
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    updatedAt,
    reload,
    nextRetryInMs,
  };
}
