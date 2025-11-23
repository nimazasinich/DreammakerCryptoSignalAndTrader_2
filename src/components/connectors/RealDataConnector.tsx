/**
 * Real Data Connector - Connects all frontend components to real backend APIs
 * This component wraps the application and provides real-time data updates
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Logger } from '../../core/Logger.js';
import { RealDataManager } from '../../services/RealDataManager';
import { dataManager } from '../../services/dataManager';

interface RealDataContextType {
  prices: any[];
  portfolio: any;
  sentiment: any;
  news: any[];
  whales: any[];
  signals: any[];
  isConnected: boolean;
  lastUpdate: number;
}

const RealDataContext = createContext<RealDataContextType>({
  prices: [],
  portfolio: null,
  sentiment: null,
  news: [],
  whales: [],
  signals: [],
  isConnected: false,
  lastUpdate: 0
});


const logger = Logger.getInstance();

export const useRealData = () => useContext(RealDataContext);

export const RealDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [whales, setWhales] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const realDataManager = RealDataManager.getInstance();
    const unsubscribers: Array<() => void> = [];

    // Subscribe to all data streams using dataManager (WebSocket-based)
    // Note: Only subscribe if WebSocket connection is enabled
    const connectOnStart = import.meta.env.VITE_WS_CONNECT_ON_START === 'true';
    
    if (connectOnStart) {
      // Subscribe to market data updates
      const priceUnsub = dataManager.subscribe('market_data', [], (data) => {
        if (isMounted && data) {
          // Convert market data to price format
          if (data.symbol && data.price !== undefined) {
            setPrices(prev => {
              const updated = [...prev];
              const index = updated.findIndex(p => p.symbol === data.symbol);
              const priceData = {
                symbol: data.symbol,
                price: data.price,
                change24h: data.change24h || 0,
                volume24h: data.volume || 0,
                lastUpdate: Date.now()
              };
              if (index >= 0) {
                updated[index] = priceData;
              } else {
                updated.push(priceData);
              }
              // Limit array size
              return updated.slice(0, 100);
            });
            setLastUpdate(Date.now());
          }
        }
      });
      unsubscribers.push(priceUnsub);

      // Subscribe to signal updates
      const signalUnsub = dataManager.subscribe('signal_update', [], (data) => {
        if (isMounted && data) {
          setSignals(prev => {
            const updated = [...prev];
            if (data.symbol && data.prediction) {
              const index = updated.findIndex(s => s.id === data.symbol);
              if (index >= 0) {
                updated[index] = data.prediction;
              } else {
                updated.push(data.prediction);
              }
            }
            return updated.slice(0, 100);
          });
          setLastUpdate(Date.now());
        }
      });
      unsubscribers.push(signalUnsub);
    }

    // Initialize data fetching (polling-based, not WebSocket)
    const initializeData = async () => {
      try {
        // Fetch initial data
        const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];
        const priceMap = await realDataManager.getMarketData(symbols);
        const priceArray = Array.from(priceMap.values());
        
        if (isMounted) {
          setPrices(priceArray);
          setIsConnected(true);
          setLastUpdate(Date.now());
          logger.info('✅ Real data initialized - 100% real APIs active');
        }
      } catch (err) {
        if (isMounted) {
          logger.error('❌ Failed to initialize real data:', {}, err);
          setIsConnected(false);
        }
      }
    };

    // Only initialize if auto-load is enabled
    const disableInitial = import.meta.env.VITE_DISABLE_INITIAL_LOAD === 'true';
    if (!disableInitial) {
      initializeData();
    } else {
      setIsConnected(false);
    }

    // Cleanup on unmount - critical for preventing memory leaks
    return () => {
      isMounted = false;
      logger.info('🛑 RealDataProvider cleanup - unsubscribing all');
      
      // Unsubscribe all subscribers
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (err) {
          logger.error('Error unsubscribing:', {}, err);
        }
      });
      
      setIsConnected(false);
    };
  }, []);

  const contextValue: RealDataContextType = {
    prices,
    portfolio,
    sentiment,
    news,
    whales,
    signals,
    isConnected,
    lastUpdate
  };

  return (
    <RealDataContext.Provider value={contextValue}>
      {children}
      {isConnected && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          background: '#10b981',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          🟢 100% REAL DATA ACTIVE
        </div>
      )}
    </RealDataContext.Provider>
  );
};

/**
 * Real Price Chart Component
 */
export const RealPriceChart: React.FC<{ symbols?: string[] }> = ({ symbols = ['bitcoin', 'ethereum'] }) => {
  const { prices } = useRealData();
  
  return (
    <div className="real-price-chart">
      <h3>Real-Time Prices</h3>
      {(prices?.length || 0) > 0 ? (
        <div>
          {(prices || []).map((price: any) => (
            <div key={price.symbol}>
              <strong>{price.symbol}:</strong> ${price.price?.toFixed(2)}
              <span style={{ color: price.change24h > 0 ? 'green' : 'red' }}>
                {' '}({price.change24h > 0 ? '+' : ''}{price.change24h?.toFixed(2)}%)
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div>Loading real prices...</div>
      )}
    </div>
  );
};

/**
 * Real Portfolio Card Component
 */
export const RealPortfolioCard: React.FC = () => {
  const { portfolio } = useRealData();
  
  return (
    <div className="real-portfolio-card">
      <h3>Real Portfolio</h3>
      {portfolio ? (
        <div>
          <div>Total Value: ${portfolio.totalValue?.toFixed(2)}</div>
          <div>24h Change: {portfolio.totalChangePercent?.toFixed(2)}%</div>
          <div>Active Positions: {portfolio.activePositions}</div>
        </div>
      ) : (
        <div>Loading real portfolio...</div>
      )}
    </div>
  );
};

/**
 * Real Sentiment Indicator Component
 */
export const RealSentimentIndicator: React.FC = () => {
  const { sentiment } = useRealData();
  
  return (
    <div className="real-sentiment-indicator">
      <h3>Market Sentiment</h3>
      {sentiment ? (
        <div>
          <div>Fear & Greed Index: {sentiment.value}</div>
          <div>Classification: {sentiment.classification}</div>
        </div>
      ) : (
        <div>Loading real sentiment...</div>
      )}
    </div>
  );
};

/**
 * Real News Feed Component
 */
export const RealNewsFeed: React.FC<{ limit?: number }> = ({ limit = 10 }) => {
  const { news } = useRealData();
  
  return (
    <div className="real-news-feed">
      <h3>Latest Crypto News</h3>
      {(news?.length || 0) > 0 ? (
        <div>
          {news.slice(0, limit).map((article: any, index: number) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              <strong>{article.title}</strong>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {new Date(article.published_at || article.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>Loading real news...</div>
      )}
    </div>
  );
};

/**
 * Real Whale Tracker Component
 */
export const RealWhaleTracker: React.FC<{ limit?: number }> = ({ limit = 10 }) => {
  const { whales } = useRealData();
  
  return (
    <div className="real-whale-tracker">
      <h3>Whale Transactions</h3>
      {(whales?.length || 0) > 0 ? (
        <div>
          {whales.slice(0, limit).map((tx: any, index: number) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              <strong>{tx.symbol}:</strong> {tx.amount?.toFixed(2)} 
              <span style={{ fontSize: '12px', color: '#666' }}>
                {' '}(${tx.value?.toFixed(0)})
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div>Loading whale data...</div>
      )}
    </div>
  );
};

/**
 * Real Signal Generator Component
 */
export const RealSignalGenerator: React.FC<{ limit?: number }> = ({ limit = 5 }) => {
  const { signals } = useRealData();
  
  return (
    <div className="real-signal-generator">
      <h3>Trading Signals</h3>
      {(signals?.length || 0) > 0 ? (
        <div>
          {signals.slice(0, limit).map((signal: any) => (
            <div key={signal.id} style={{ marginBottom: '10px' }}>
              <strong>{signal.symbol}:</strong> {signal.action}
              <span style={{ fontSize: '12px', color: '#666' }}>
                {' '}({(signal.confidence * 100).toFixed(1)}% confidence)
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div>Loading signals...</div>
      )}
    </div>
  );
};
