import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Logger } from '../../core/Logger.js';
import { MarketData } from '../../types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { dataManager } from '../../services/dataManager';
import { API_BASE } from '../../config/env.js';

interface MarketTickerProps {
  marketData?: MarketData[];
  symbols?: string[];
  autoFetch?: boolean;
  refreshInterval?: number;
}


const logger = Logger.getInstance();

export const MarketTicker: React.FC<MarketTickerProps> = ({ 
  marketData: propMarketData,
  symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'MATICUSDT'],
  autoFetch = false,
  refreshInterval = 30000 // 30 seconds
}) => {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marketData, setMarketData] = useState<MarketData[]>(propMarketData || []);
  const [animatingPrices, setAnimatingPrices] = useState<Set<string>>(new Set());
  
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);

  const fetchMarketData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const symbolsParam = symbols.join(',');
      const response = await dataManager.fetchData<{
        success: boolean;
        prices: Array<{
          symbol: string;
          price: number;
          change24h: number;
          changePercent24h: number;
          volume: number;
        }>;
      }>(`${API_BASE}/market/prices?symbols=${symbolsParam}`);
      
      if (response && response.success && response.prices && response.prices.length > 0) {
        const formatted: MarketData[] = (response.prices || []).map((p) => ({
          symbol: p.symbol,
          open: p.price,
          high: p.price,
          low: p.price,
          close: p.price,
          price: p.price,
          change24h: p.change24h,
          changePercent24h: p.changePercent24h,
          volume: p.volume || 0,
          timestamp: Date.now()
        }));
        
        // Track price changes for animation
        setMarketData((prevData) => {
          const newAnimating = new Set<string>();
          formatted.forEach((newCoin) => {
            const oldCoin = prevData.find((c) => c.symbol === newCoin.symbol);
            if (oldCoin && oldCoin.price !== newCoin.price) {
              newAnimating.add(newCoin.symbol);
            }
          });
          if (newAnimating.size > 0) {
            setAnimatingPrices(newAnimating);
            // Clear animation after animation duration
            setTimeout(() => setAnimatingPrices(new Set()), 600);
          }
          return formatted;
        });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setError('No market data received');
        if (import.meta.env.DEV) logger.warn('Market data response was empty or invalid:', response);
      }
    } catch (error) {
      setIsLoading(false);
      setError('Failed to fetch market data');
      if (import.meta.env.DEV) logger.error('Failed to fetch market data:', {}, error);
    }
  }, [symbols.join(',')]); // Use symbols.join instead of symbols array

  useEffect(() => {
    if (propMarketData) {
      setMarketData(propMarketData);
    }
  }, [propMarketData]);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;
    
    // Always fetch if autoFetch is true or if no propMarketData is provided
    if (autoFetch || !propMarketData) {
      fetchMarketData();
      
      if (refreshInterval > 0) {
        interval = setInterval(() => {
          if (isMounted) {
            fetchMarketData();
          }
        }, refreshInterval);
      }
    }
    
    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoFetch, refreshInterval, symbolsKey]); // Removed fetchMarketData and propMarketData to avoid infinite loops

  // Show loading or error state
  if (!marketData || marketData.length === 0) {
    if (isLoading && autoFetch) {
      return (
        <div className="bg-gray-900 border-b border-gray-800 overflow-hidden py-2.5 relative">
          <div className="flex items-center justify-center p-3">
            <p className="text-gray-400 text-sm animate-pulse">Loading market data...</p>
          </div>
        </div>
      );
    }
    if (error && autoFetch) {
      return (
        <div className="bg-gray-900 border-b border-gray-800 overflow-hidden py-2.5 relative">
          <div className="flex items-center justify-center p-3">
            <p className="text-red-400 text-sm">Error loading market data. Retrying...</p>
          </div>
        </div>
      );
    }
    // If no autoFetch and no data, show empty state with message
    if (!propMarketData) {
      return (
        <div className="bg-gray-900 border-b border-gray-800 overflow-hidden py-2.5 relative">
          <div className="flex items-center justify-center p-3">
            <p className="text-gray-500 text-sm">No market data available</p>
          </div>
        </div>
      );
    }
    return null;
  }

  // Calculate animation duration based on number of items (faster with more items)
  const animationDuration = Math.max(20, marketData.length * 3);

  return (
    <div className="bg-gray-900 border-b border-gray-800 overflow-hidden py-2.5 relative">
      <style>{`
        @keyframes priceUpdate {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-4px) scale(1.02); opacity: 0.8; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .price-animate {
          animation: priceUpdate 0.6s ease-in-out;
        }
        @keyframes scrollRightToLeft {
          0% { 
            transform: translateX(0);
          }
          100% { 
            transform: translateX(-50%);
          }
        }
        .ticker-scroll-wrapper {
          display: inline-flex;
          white-space: nowrap;
          animation: scrollRightToLeft ${animationDuration}s linear infinite;
        }
        .ticker-scroll-wrapper:hover {
          animation-play-state: paused;
        }
        .ticker-item {
          flex-shrink: 0;
        }
      `}</style>
      <div className="relative overflow-hidden">
        <div className="ticker-scroll-wrapper">
          {/* First set of items */}
          <div className="inline-flex items-center gap-2.5 px-5">
            {(marketData || []).filter(coin => coin && coin.symbol).map((coin, index) => {
          const price = coin.price || coin.close || coin.open || 0;
          const changePercent = coin.changePercent24h || coin.change24h || 0;
          const symbol = coin.symbol || '';
          
          if (!symbol || price === 0) return null;
          
          return (
            <div 
              key={`${symbol}-${index}`} 
              className="ticker-item flex items-center gap-2.5 px-3.5 py-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50"
              style={{
                borderRadius: '8px',
                clipPath: 'polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              <span className="text-gray-300 font-medium text-xs whitespace-nowrap">
                {symbol.replace('USDT', '').replace('USD', '')}
              </span>
              <span className={`text-white font-semibold text-sm whitespace-nowrap ${animatingPrices.has(symbol) ? 'price-animate' : ''}`}>
                ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
              </span>
              <div className={`flex items-center text-xs whitespace-nowrap ${
                changePercent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {changePercent >= 0 ? (
                  <TrendingUp size={12} className="mr-0.5 flex-shrink-0" />
                ) : (
                  <TrendingDown size={12} className="mr-0.5 flex-shrink-0" />
                )}
                <span className="font-medium">
                  {changePercent >= 0 ? '+' : ''}
                  {changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        }).filter(Boolean)}
          </div>
          {/* Duplicate set for seamless infinite loop */}
          <div className="inline-flex items-center gap-2.5 px-5">
            {(marketData || []).filter(coin => coin && coin.symbol).map((coin, index) => {
          const price = coin.price || coin.close || coin.open || 0;
          const changePercent = coin.changePercent24h || coin.change24h || 0;
          const symbol = coin.symbol || '';
          
          if (!symbol || price === 0) return null;
          
          return (
            <div 
              key={`${symbol}-duplicate-${index}`} 
              className="ticker-item flex items-center gap-2.5 px-3.5 py-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50"
              style={{
                borderRadius: '8px',
                clipPath: 'polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              <span className="text-gray-300 font-medium text-xs whitespace-nowrap">
                {symbol.replace('USDT', '').replace('USD', '')}
              </span>
              <span className={`text-white font-semibold text-sm whitespace-nowrap ${animatingPrices.has(symbol) ? 'price-animate' : ''}`}>
                ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
              </span>
              <div className={`flex items-center text-xs whitespace-nowrap ${
                changePercent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {changePercent >= 0 ? (
                  <TrendingUp size={12} className="mr-0.5 flex-shrink-0" />
                ) : (
                  <TrendingDown size={12} className="mr-0.5 flex-shrink-0" />
                )}
                <span className="font-medium">
                  {changePercent >= 0 ? '+' : ''}
                  {changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        }).filter(Boolean)}
          </div>
        </div>
      </div>
    </div>
  );
};