// src/components/connectors/RealChartDataConnector.tsx
import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { MarketData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { AdvancedChart } from '../AdvancedChart';

interface RealChartDataConnectorProps {
  symbol: string;
  timeframe: string;
  limit?: number;
}

/**
 * RealChartDataConnector - Wraps AdvancedChart component with real data from DataContext
 *
 * REFACTORED: Now uses centralized DataContext instead of creating independent API calls.
 * This fixes the memory leak caused by multiple polling intervals and subscriptions.
 */

const logger = Logger.getInstance();

export const RealChartDataConnector: React.FC<RealChartDataConnectorProps> = ({
  symbol,
  timeframe,
  limit = 100
}) => {
  const dataContext = useData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use bars from DataContext - no independent API calls
  const chartData = dataContext?.bars || [];

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!dataContext || !isMounted) return;

      try {
        setLoading(true);
        setError(null);

        // Request data refresh from context if symbol/timeframe changed
        if (dataContext.symbol !== symbol || dataContext.timeframe !== timeframe) {
          dataContext.refresh({ symbol, timeframe });
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          logger.error('Failed to load chart data:', {}, err);
          setError(err instanceof Error ? err.message : 'Failed to load chart data');
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [symbol, timeframe, dataContext]);

  if (loading && chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  // Limit data to requested limit to prevent performance issues
  const limitedData = limit ? chartData.slice(-limit) : chartData;

  // Transform bars to CandleData[] for AdvancedChart
  const candleData = limitedData.map(bar => ({
    time: bar.timestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume
  }));

  // Pass data from context to AdvancedChart component
  return <AdvancedChart data={candleData} symbol={symbol} timeframe={timeframe} />;
};

