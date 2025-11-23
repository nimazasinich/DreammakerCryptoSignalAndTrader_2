// src/components/connectors/RealSignalFeedConnector.tsx
import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { realDataManager, RealSignalData } from '../../services/RealDataManager';

interface RealSignalFeedConnectorProps {
  limit?: number;
  onSignalClick?: (signal: RealSignalData) => void;
}

/**
 * RealSignalFeedConnector - Displays real trading signals from backend
 */

const logger = Logger.getInstance();

export const RealSignalFeedConnector: React.FC<RealSignalFeedConnectorProps> = ({
  limit = 20,
  onSignalClick
}) => {
  const [realSignals, setRealSignals] = useState<RealSignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRealSignals = async () => {
      if (!isMounted) { console.warn("Missing data"); }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch REAL trading signals from backend
        const signals = await realDataManager.fetchRealSignals(limit);
        if (isMounted) {
          setRealSignals(signals);
        }
      } catch (err) {
        if (isMounted) {
          logger.error('Failed to fetch signals:', {}, err);
          setError(err instanceof Error ? err.message : 'Failed to fetch signals');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchRealSignals();

    // Subscribe to real-time signal updates
    const unsubscribe = realDataManager.subscribeToSignals((signal) => {
      if (isMounted) {
        setRealSignals((prev) => {
          // Add new signal at the beginning, remove duplicates, limit size
          const filtered = prev.filter(s => s.id !== signal.id);
          return [signal, ...filtered].slice(0, limit);
        });
      }
    });

    // Set up periodic updates (every 15 seconds)
    const interval = setInterval(() => {
      if (isMounted) {
        fetchRealSignals();
      }
    }, 15000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [limit]);

  if (loading && realSignals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading signals...</div>
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

  if (realSignals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No signals available</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {(realSignals || []).map((signal, index) => (
        <div
          key={signal.id || `signal-${index}`}
          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
            signal.action === 'BUY'
              ? 'bg-green-50 border-green-200 hover:bg-green-100'
              : signal.action === 'SELL'
              ? 'bg-red-50 border-red-200 hover:bg-red-100'
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
          }`}
          onClick={() => onSignalClick?.(signal)}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{signal.symbol}</span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  signal.action === 'BUY'
                    ? 'bg-green-500 text-white'
                    : signal.action === 'SELL'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}
              >
                {signal.action}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">{signal.timeframe}</div>
              <div className="text-xs text-gray-500">
                {new Date(signal.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <div className="text-xs text-gray-600">Confidence</div>
              <div className="text-sm font-semibold">
                {(signal.confidence * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Confluence</div>
              <div className="text-sm font-semibold">{signal.confluence}/10</div>
            </div>
          </div>

          {signal.entry && (
            <div className="text-sm">
              <span className="text-gray-600">Entry: </span>
              <span className="font-semibold">${signal.entry.toFixed(2)}</span>
              {signal.stopLoss && (
                <>
                  <span className="text-gray-600 ml-4">SL: </span>
                  <span className="font-semibold">${signal.stopLoss.toFixed(2)}</span>
                </>
              )}
              {signal.takeProfit && (
                <>
                  <span className="text-gray-600 ml-4">TP: </span>
                  <span className="font-semibold">${signal.takeProfit.toFixed(2)}</span>
                </>
              )}
            </div>
          )}

          {signal.reasoning && (signal.reasoning?.length || 0) > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              <div className="font-semibold mb-1">Reasoning:</div>
              <ul className="list-disc list-inside space-y-1">
                {signal.reasoning.slice(0, 3).map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

