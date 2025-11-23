import React, { useEffect, useState } from 'react';
import { Logger } from '../../core/Logger.js';
import { DollarSign, TrendingUp, TrendingDown, Zap, AlertCircle } from 'lucide-react';
import { useTheme } from '../Theme/ThemeProvider';
import { dataManager } from '../../services/dataManager';

interface SmartMoneySignal {
  symbol: string;
  liquidityZone?: { price: number; strength: number };
  orderBlock?: { price: number; direction: 'BULLISH' | 'BEARISH' };
  fairValueGap?: { price: number; fillProbability: number };
  breakOfStructure?: { direction: 'UP' | 'DOWN'; strength: number };
}


const logger = Logger.getInstance();

export const SmartMoneyScanner: React.FC = () => {
  const { theme } = useTheme();
  const [signals, setSignals] = useState<Record<string, SmartMoneySignal>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSymbols] = useState<string[]>(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT']);

  useEffect(() => {
    const scanSmartMoney = async () => {
      try {
        setIsLoading(true);
        const results: Record<string, SmartMoneySignal> = {};

        for (const symbol of selectedSymbols) {
          try {
            const smcResponse = await dataManager.analyzeSMC(symbol.replace('USDT', ''));
            const smcResult = smcResponse?.smc || smcResponse;
            
            if (smcResult) {
              results[symbol] = {
                symbol,
                liquidityZone: smcResult.liquidityZones?.[0] ? {
                  price: smcResult.liquidityZones[0].price || 0,
                  strength: (smcResult.liquidityZones[0].strength || 0) * 100
                } : undefined,
                orderBlock: smcResult.orderBlocks?.[0] ? {
                  price: smcResult.orderBlocks[0].high || smcResult.orderBlocks[0].price || 0,
                  direction: smcResult.orderBlocks[0].type || 'BULLISH'
                } : undefined,
                fairValueGap: smcResult.fairValueGaps?.[0] ? {
                  price: smcResult.fairValueGaps[0].upper || smcResult.fairValueGaps[0].price || 0,
                  fillProbability: (smcResult.fairValueGaps[0].fillProbability || 0) * 100
                } : undefined,
                breakOfStructure: smcResult.breakOfStructure ? {
                  direction: smcResult.breakOfStructure.type?.includes('BULL') ? 'UP' : 'DOWN',
                  strength: (smcResult.breakOfStructure.strength || 0) * 100
                } : undefined
              };
            }
          } catch (error) {
            logger.error(`Failed to scan SMC for ${symbol}:`, {}, error);
          }
        }

        setSignals(results);
      } catch (error) {
        logger.error('Failed to scan smart money:', {}, error);
      } finally {
        setIsLoading(false);
      }
    };

    scanSmartMoney();
    const interval = setInterval(scanSmartMoney, 120000); // Refresh every 2 minutes

    return () => clearInterval(interval);
  }, [selectedSymbols]);

  const getSignalStrength = (signal: SmartMoneySignal): number => {
    let strength = 0;
    if (signal.liquidityZone) strength += signal.liquidityZone.strength * 0.3;
    if (signal.orderBlock) strength += 30;
    if (signal.fairValueGap) strength += signal.fairValueGap.fillProbability * 0.2;
    if (signal.breakOfStructure) strength += signal.breakOfStructure.strength * 0.2;
    return Math.min(100, strength);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <DollarSign className="w-6 h-6 text-blue-400" />
          <h3 className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Smart Money Concepts Scanner
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isLoading ? 'Scanning...' : `${Object.keys(signals).length} signals active`}
          </span>
        </div>
      </div>

      {/* Signals Grid */}
      {isLoading && Object.keys(signals).length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Scanning for smart money activity...
            </p>
          </div>
        </div>
      ) : Object.keys(signals).length === 0 ? (
        <div className={`${
          theme === 'dark' 
            ? 'bg-white/5 border-blue-800/30' 
            : 'bg-white/80 border-blue-200/50'
        } backdrop-blur-md rounded-xl p-8 border text-center`}>
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No smart money signals detected.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(signals).map((signal) => {
            const strength = getSignalStrength(signal);
            return (
              <div
                key={signal.symbol}
                className={`${
                  theme === 'dark' 
                    ? 'bg-white/10 border-blue-800/30' 
                    : 'bg-white/80 border-blue-200/50'
                } backdrop-blur-md rounded-xl p-6 border transition-all hover:scale-105`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`text-lg font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {signal.symbol.replace('USDT', '')}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span className={`text-sm font-semibold ${
                      strength >= 70 ? 'text-green-400' :
                      strength >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {strength.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {signal.liquidityZone && (
                    <div className={`${
                      theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'
                    } rounded-lg p-3`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${
                          theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                        }`}>
                          Liquidity Zone
                        </span>
                        <span className={`text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          ${signal.liquidityZone.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`flex-1 ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                        } rounded-full h-1.5`}>
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${signal.liquidityZone.strength}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-blue-400">
                          {signal.liquidityZone.strength.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {signal.orderBlock && (
                    <div className={`${
                      theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50'
                    } rounded-lg p-3`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${
                          theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                        }`}>
                          Order Block
                        </span>
                        <div className="flex items-center space-x-2">
                          {signal.orderBlock.direction === 'BULLISH' ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`text-xs font-semibold ${
                            signal.orderBlock.direction === 'BULLISH' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {signal.orderBlock.direction}
                          </span>
                        </div>
                      </div>
                      <div className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        ${signal.orderBlock.price.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {signal.fairValueGap && (
                    <div className={`${
                      theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50'
                    } rounded-lg p-3`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${
                          theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'
                        }`}>
                          Fair Value Gap
                        </span>
                        <span className={`text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          ${signal.fairValueGap.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Fill Probability:
                        </span>
                        <span className="text-xs font-semibold text-yellow-400">
                          {signal.fairValueGap.fillProbability.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {signal.breakOfStructure && (
                    <div className={`${
                      theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'
                    } rounded-lg p-3`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${
                          theme === 'dark' ? 'text-green-300' : 'text-green-600'
                        }`}>
                          Break of Structure
                        </span>
                        <div className="flex items-center space-x-2">
                          {signal.breakOfStructure.direction === 'UP' ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`text-xs font-semibold ${
                            signal.breakOfStructure.direction === 'UP' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {signal.breakOfStructure.direction}
                          </span>
                        </div>
                      </div>
                      <div className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Strength: {signal.breakOfStructure.strength.toFixed(0)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

