import { useState, useEffect, useCallback, useRef } from 'react';

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  source: string;
  timestamp: number;
  high24h?: number;
  low24h?: number;
  marketCap?: number;
}

export interface UseRealtimePrices {
  prices: Record<string, PriceData>;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdate: number;
}

export function useRealtimePrices(
  symbols: string[],
  intervalMs: number = 5000
): UseRealtimePrices {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0 || !isMountedRef.current) return;

    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const symbolsParam = symbols.join(',');
      const response = await fetch(
        `/api/market/prices?symbols=${symbolsParam}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data && isMountedRef.current) {
        const priceMap: Record<string, PriceData> = {};
        result.data.forEach((price: PriceData) => {
          priceMap[price.symbol] = price;
        });
        setPrices(priceMap);
        setIsConnected(true);
        setError(null);
        setLastUpdate(Date.now());
      }

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error('[useRealtimePrices] Fetch error:', err);
        setError(err);
        setIsConnected(false);
        setIsLoading(false);
      }
    }
  }, [symbols]);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchPrices();

    // Set up interval for continuous updates
    const interval = setInterval(fetchPrices, intervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPrices, intervalMs]);

  return {
    prices,
    isConnected,
    isLoading,
    error,
    refresh: fetchPrices,
    lastUpdate
  };
}
