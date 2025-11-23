/**
 * LiveDataContext
 * Provides WebSocket real-time data to React components
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { MarketData, PredictionData } from '../types';
import { dataManager } from '../services/dataManager';
import { showToast } from './ui/Toast';

interface LiveDataContextValue {
  // Market data
  marketData: Map<string, MarketData>;
  subscribeToMarketData: (symbols: string[], callback: (data: MarketData) => void) => () => void;
  
  // Signal updates
  signals: Map<string, PredictionData>;
  subscribeToSignals: (symbols: string[], callback: (data: any) => void) => () => void;
  
  // Health status
  health: any;
  subscribeToHealth: (callback: (data: any) => void) => () => void;
  
  // Connection status
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const LiveDataContext = createContext<LiveDataContextValue | undefined>(undefined);

export { LiveDataContext };

export const useLiveData = () => {
  const context = useContext(LiveDataContext);
  if (!context) {
    console.error('useLiveData must be used within LiveDataProvider');
  }
  return context;
};

interface LiveDataProviderProps {
  children: ReactNode;
}

export const LiveDataProvider: React.FC<LiveDataProviderProps> = ({ children }) => {
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [signals, setSignals] = useState<Map<string, PredictionData>>(new Map());
  const [health, setHealth] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let checkInterval: NodeJS.Timeout | null = null;

    // Subscribe to liquidation risk alerts
    const unsubscribeLiquidation = dataManager.subscribe('liquidation_risk', [], (data: any) => {
      if (data?.data) {
        const { symbol, riskLevel, marginRatio, currentPrice, liquidationPrice } = data.data;
        showToast(
          riskLevel === 'high' ? 'error' : 'warning',
          `Liquidation Risk: ${symbol}`,
          `Margin: ${(marginRatio * 100).toFixed(2)}% | Price: $${currentPrice?.toFixed(2)} | Liq: $${liquidationPrice?.toFixed(2)}`
        );
      }
    });

    // Connect WebSocket on mount (gracefully handle failures)
    const connectOnStart = import.meta.env.VITE_WS_CONNECT_ON_START === 'true';
    if (connectOnStart) {
      dataManager.connectWebSocket()
        .then(() => {
          if (isMounted) {
            setIsConnected(true);
          }
        })
        .catch(() => {
          // Connection failed - app can continue without WebSocket
          // Silently handle - browser will log its own error messages
          if (isMounted) {
            setIsConnected(false);
          }
        });
    }

    // Monitor connection status - reduced frequency to prevent leaks
    checkInterval = setInterval(() => {
      if (!isMounted) {
        if (checkInterval) clearInterval(checkInterval);
        return;
      }
      const ws = (dataManager as any).ws;
      const connected = ws && ws.readyState === WebSocket.OPEN;
      setIsConnected(connected);
    }, 5000); // Changed from 1000ms to 5000ms to reduce overhead

    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      // Unsubscribe from liquidation alerts
      unsubscribeLiquidation();
      // Disconnect WebSocket when provider unmounts
      dataManager.disconnectWebSocket();
    };
  }, []);

  const subscribeToMarketData = useCallback((symbols: string[], callback: (data: MarketData) => void) => {
    const MAX_MAP_SIZE = 100; // Limit map size to prevent memory leak
    
    const unsubscribe = dataManager.subscribe('market_data', symbols, (data: MarketData) => {
      if (data && data.symbol) {
        setMarketData(prev => {
          const updated = new Map(prev);
          updated.set(data.symbol, data);
          
          // Limit map size - remove oldest entries if exceeds limit
          if (updated.size > MAX_MAP_SIZE) {
            const firstKey = updated.keys().next().value;
            updated.delete(firstKey);
          }
          
          return updated;
        });
        callback(data);
      }
    });

    return unsubscribe;
  }, []);

  const subscribeToSignals = useCallback((symbols: string[], callback: (data: any) => void) => {
    const MAX_MAP_SIZE = 50; // Limit signals map size
    
    const unsubscribe = dataManager.subscribe('signal_update', symbols, (data: any) => {
      if (data && data.symbol) {
        setSignals(prev => {
          const updated = new Map(prev);
          updated.set(data.symbol, data.prediction || data);
          
          // Limit map size
          if (updated.size > MAX_MAP_SIZE) {
            const firstKey = updated.keys().next().value;
            updated.delete(firstKey);
          }
          
          return updated;
        });
        callback(data);
      }
    });

    return unsubscribe;
  }, []);

  const subscribeToHealth = useCallback((callback: (data: any) => void) => {
    const unsubscribe = dataManager.subscribe('health', [], (data: any) => {
      setHealth(data);
      callback(data);
    });

    return unsubscribe;
  }, []);

  const connect = useCallback(() => {
    dataManager.connectWebSocket()
      .then(() => {
        setIsConnected(true);
      })
      .catch(() => {
        setIsConnected(false);
      });
  }, []);

  const disconnect = useCallback(() => {
    dataManager.disconnectWebSocket();
    setIsConnected(false);
  }, []);

  const value: LiveDataContextValue = {
    marketData,
    subscribeToMarketData,
    signals,
    subscribeToSignals,
    health,
    subscribeToHealth,
    isConnected,
    connect,
    disconnect
  };

  return (
    <LiveDataContext.Provider value={value}>
      {children}
    </LiveDataContext.Provider>
  );
};

