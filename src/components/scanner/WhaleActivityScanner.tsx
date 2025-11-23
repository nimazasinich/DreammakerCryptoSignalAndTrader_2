import React, { useEffect, useState } from 'react';
import { Logger } from '../../core/Logger.js';
import { Waves, TrendingUp, TrendingDown, AlertCircle, Activity } from 'lucide-react';
import { useTheme } from '../Theme/ThemeProvider';
import { dataManager } from '../../services/dataManager';

interface WhaleTransaction {
  symbol: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'LARGE_TRADE';
  amount: number;
  price: number;
  timestamp: number;
  exchange?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface WhaleActivity {
  symbol: string;
  transactions: WhaleTransaction[];
  netFlow: number;
  totalVolume: number;
  alertLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}


const logger = Logger.getInstance();

export const WhaleActivityScanner: React.FC = () => {
  const { theme } = useTheme();
  const [activities, setActivities] = useState<Record<string, WhaleActivity>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSymbols] = useState<string[]>(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT']);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;
    const abortController = new AbortController();
    
    const scanWhaleActivity = async () => {
      if (!isMounted || abortController.signal.aborted) return;
      
      try {
        setIsLoading(true);
        const results: Record<string, WhaleActivity> = {};

        for (const symbol of selectedSymbols) {
          if (abortController.signal.aborted) break;
          
          try {
            const whaleResponse = await dataManager.trackWhaleActivity(symbol.replace('USDT', ''));
            
            if (!isMounted || abortController.signal.aborted) break;
            
            const whaleResult = whaleResponse?.whaleActivity || whaleResponse;
            
            if (whaleResult) {
              // Limit transactions array size to prevent memory leak
              const allTransactions = whaleResult.recentTransactions || whaleResult.transactions || [];
              const limitedTransactions = Array.isArray(allTransactions) 
                ? allTransactions.slice(0, 50).map((t: any) => ({
                    symbol,
                    type: t.type || t.transactionType || 'LARGE_TRADE',
                    amount: t.amount || t.value || 0,
                    price: t.price || 0,
                    timestamp: t.timestamp || t.time || Date.now(),
                    exchange: t.exchange || t.exchangeName,
                    impact: t.impact || (t.amount > 1000000 ? 'HIGH' : t.amount > 500000 ? 'MEDIUM' : 'LOW')
                  }))
                : [];

              const netFlow = whaleResult.netFlow || whaleResult.exchangeFlow?.netFlow || 0;
              const totalVolume = whaleResult.totalVolume || whaleResult.totalTransactionValue || 0;
              
              // Determine alert level
              let alertLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
              if ((limitedTransactions?.length || 0) > 5 || Math.abs(netFlow) > 1000000 || totalVolume > 10000000) {
                alertLevel = 'HIGH';
              } else if ((limitedTransactions?.length || 0) > 2 || Math.abs(netFlow) > 500000 || totalVolume > 5000000) {
                alertLevel = 'MEDIUM';
              }

              results[symbol] = {
                symbol,
                transactions: limitedTransactions,
                netFlow,
                totalVolume,
                alertLevel
              };
            }
          } catch (error) {
            if (!abortController.signal.aborted && isMounted) {
              logger.error(`Failed to scan whale activity for ${symbol}:`, {}, error);
            }
          }
        }

        if (isMounted && !abortController.signal.aborted) {
          // Limit number of activities to prevent memory leak
          const limitedResults: Record<string, WhaleActivity> = {};
          const symbolKeys = Object.keys(results).slice(0, 50);
          symbolKeys.forEach(key => {
            limitedResults[key] = results[key];
          });
          setActivities(limitedResults);
        }
      } catch (error) {
        if (!abortController.signal.aborted && isMounted) {
          logger.error('Failed to scan whale activity:', {}, error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial scan
    scanWhaleActivity();
    
    // Set up interval
    interval = setInterval(() => {
      if (isMounted) {
        scanWhaleActivity();
      }
    }, 60000); // Refresh every minute

    return () => {
      isMounted = false;
      abortController.abort();
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedSymbols.join(',')]); // Use join to prevent array reference changes

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-400 bg-red-900/20 border-red-800/30';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/20 border-yellow-800/30';
      default: return 'text-green-400 bg-green-900/20 border-green-800/30';
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Waves className="w-6 h-6 text-blue-400" />
          <h3 className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Whale Activity Scanner
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className={`w-4 h-4 ${
            isLoading ? 'animate-pulse text-blue-400' : 'text-green-400'
          }`} />
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isLoading ? 'Tracking...' : `${Object.keys(activities).length} assets monitored`}
          </span>
        </div>
      </div>

      {/* Activity Cards */}
      {isLoading && Object.keys(activities).length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-body text-text-tertiary">
              Tracking whale transactions...
            </p>
          </div>
        </div>
      ) : Object.keys(activities).length === 0 ? (
        <div className={`${
          theme === 'dark' 
            ? 'bg-white/5 border-blue-800/30' 
            : 'bg-white/80 border-blue-200/50'
        } backdrop-blur-md rounded-xl p-8 border text-center`}>
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No whale activity detected.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(activities).map((activity) => (
            <div
              key={activity.symbol}
              className={`${
                theme === 'dark' 
                  ? 'bg-white/10 border-blue-800/30' 
                  : 'bg-white/80 border-blue-200/50'
              } backdrop-blur-md rounded-xl p-6 border transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h4 className={`text-lg font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {activity.symbol.replace('USDT', '')}
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getAlertColor(activity.alertLevel)}`}>
                    {activity.alertLevel} ALERT
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {activity.netFlow > 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                  <span className={`font-semibold ${
                    activity.netFlow > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatAmount(Math.abs(activity.netFlow))}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className={`${
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                } rounded-lg p-3`}>
                  <div className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Transactions
                  </div>
                  <div className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {activity.transactions.length}
                  </div>
                </div>
                <div className={`${
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                } rounded-lg p-3`}>
                  <div className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Total Volume
                  </div>
                  <div className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {formatAmount(activity.totalVolume)}
                  </div>
                </div>
                <div className={`${
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                } rounded-lg p-3`}>
                  <div className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Net Flow
                  </div>
                  <div className={`text-xl font-bold ${
                    activity.netFlow > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {activity.netFlow > 0 ? '+' : ''}{formatAmount(activity.netFlow)}
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              {(activity.transactions?.length || 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700 dark:border-gray-600">
                  <h5 className={`text-sm font-semibold mb-3 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Recent Transactions
                  </h5>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activity.transactions.slice(0, 5).map((tx, index) => (
                      <div
                        key={index}
                        className={`${
                          theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50'
                        } rounded-lg p-3 flex items-center justify-between`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-2 h-2 rounded-full ${
                            tx.type === 'DEPOSIT' ? 'bg-red-400' :
                            tx.type === 'WITHDRAWAL' ? 'bg-green-400' : 'bg-blue-400'
                          }`}></div>
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {tx.type}
                            </div>
                            <div className={`text-xs ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {tx.exchange || 'Unknown'} • {new Date(tx.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {formatAmount(tx.amount)}
                          </div>
                          <div className={`text-xs ${
                            tx.impact === 'HIGH' ? 'text-red-400' :
                            tx.impact === 'MEDIUM' ? 'text-yellow-400' : 'text-gray-400'
                          }`}>
                            {tx.impact} impact
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

