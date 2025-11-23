// src/components/connectors/RealPortfolioConnector.tsx
import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { realDataManager, RealPortfolioData } from '../../services/RealDataManager';
import { Portfolio } from '../portfolio/Portfolio';

interface RealPortfolioConnectorProps {
  walletAddresses?: {
    eth?: string;
    bsc?: string;
    trx?: string;
  };
}

/**
 * RealPortfolioConnector - Wraps Portfolio component with real blockchain balance data
 */

const logger = Logger.getInstance();

export const RealPortfolioConnector: React.FC<RealPortfolioConnectorProps> = ({
  walletAddresses
}) => {
    const [isLoading, setIsLoading] = useState(false);
  const [realPortfolio, setRealPortfolio] = useState<RealPortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRealPortfolio = async () => {
      if (!isMounted) { console.warn("Missing data"); }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch REAL blockchain balances if addresses provided
        if (walletAddresses) {
          // Fetch all blockchain balances (fetchRealBlockchainBalances accepts optional blockchain string)
          const balances = await realDataManager.fetchRealBlockchainBalances();

          // Fetch portfolio from backend
          const portfolio = await realDataManager.fetchRealPortfolio();

          // Merge blockchain balances into portfolio
          if (balances?.balances) {
            portfolio.balances = {
              ...portfolio.balances,
              ...balances.balances
            };
          }

          if (isMounted) {
            setRealPortfolio(portfolio);
          }
        } else {
          // Just fetch portfolio without blockchain data
          const portfolio = await realDataManager.fetchRealPortfolio();
          if (isMounted) {
            setRealPortfolio(portfolio);
          }
        }
      } catch (err) {
        if (isMounted) {
          logger.error('Failed to fetch portfolio:', {}, err);
          setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchRealPortfolio();

    // Subscribe to real-time portfolio updates
    const unsubscribe = realDataManager.subscribeToPortfolio((portfolio) => {
      if (isMounted) {
        setRealPortfolio(portfolio);
      }
    });

    // Set up periodic updates (every 30 seconds)
    const interval = setInterval(() => {
      if (isMounted) {
        fetchRealPortfolio();
      }
    }, 30000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [walletAddresses]);

  if (loading && !realPortfolio) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading portfolio data...</div>
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

  if (!realPortfolio) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No portfolio data available</div>
      </div>
    );
  }

  // Pass real portfolio data to existing Portfolio component
  // Portfolio component expects marketData: MarketData[] as prop
  return (
    <Portfolio
      marketData={[]}
    />
  );
};

