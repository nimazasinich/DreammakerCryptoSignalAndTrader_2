// src/components/connectors/RealPriceChartConnector.tsx
import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { MarketData } from '../../types';
import { useLiveData } from '../LiveDataContext';
import { PriceChart } from '../market/PriceChart';

interface RealPriceChartConnectorProps {
  symbols: string[];
  height?: number;
}

/**
 * RealPriceChartConnector - Wraps PriceChart component with real-time price data from LiveDataContext
 *
 * REFACTORED: Now uses centralized LiveDataContext instead of creating independent subscriptions.
 * This fixes the memory leak caused by duplicate WebSocket subscriptions and polling intervals.
 */

const logger = Logger.getInstance();

export const RealPriceChartConnector: React.FC<RealPriceChartConnectorProps> = ({
  symbols,
  height = 300
}) => {
  const liveDataContext = useLiveData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestPrices, setLatestPrices] = useState<Map<string, MarketData>>(new Map());

  useEffect(() => {
    let isMounted = true;

    if (!liveDataContext) {
      logger.warn('LiveDataContext not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Subscribe to market data for all symbols
      const unsubscribe = liveDataContext.subscribeToMarketData(symbols, (data: MarketData) => {
        if (isMounted && data.symbol) {
          setLatestPrices(prev => {
            const updated = new Map(prev);
            updated.set(data.symbol, data);
            return updated;
          });
        }
      });

      if (isMounted) {
        setLoading(false);
      }

      // Cleanup: unsubscribe when component unmounts or symbols change
      return () => {
        isMounted = false;
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (err) {
      if (isMounted) {
        logger.error('Failed to subscribe to price data:', {}, err);
        setError(err instanceof Error ? err.message : 'Failed to subscribe to price data');
        setLoading(false);
      }
    }
  }, [symbols.join(','), liveDataContext]); // Use join to prevent array reference changes

  if (loading && latestPrices.size === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-gray-500">Loading price data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (latestPrices.size === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-gray-500">No price data available</div>
      </div>
    );
  }

  // Convert Map<string, MarketData> to format expected by PriceChart (CandlestickData)
  const chartData = Array.from(latestPrices.values()).map(marketData => ({
    timestamp: typeof marketData.timestamp === 'number'
      ? marketData.timestamp
      : marketData.timestamp.getTime(),
    open: marketData.open || marketData.price,
    high: marketData.high || marketData.price,
    low: marketData.low || marketData.price,
    close: marketData.close || marketData.price,
    volume: marketData.volume || 0
  }));

  // Use the first symbol for the chart
  const chartSymbol = symbols[0] || 'BTCUSDT';

  // Pass data from LiveDataContext to PriceChart component
  return <PriceChart symbol={chartSymbol} data={chartData} autoFetch={false} />;
};

