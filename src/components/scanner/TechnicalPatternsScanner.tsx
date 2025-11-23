import React, { useEffect, useState } from 'react';
import { Logger } from '../../core/Logger.js';
import { Search, TrendingUp, TrendingDown, Target, AlertCircle } from 'lucide-react';
import { useTheme } from '../Theme/ThemeProvider';
import { dataManager } from '../../services/dataManager';

interface Pattern {
  symbol: string;
  patternType: string;
  reliability: number;
  direction: 'BULLISH' | 'BEARISH';
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: string;
}


const logger = Logger.getInstance();

export const TechnicalPatternsScanner: React.FC = () => {
  const { theme } = useTheme();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSymbols] = useState<string[]>(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT']);

  useEffect(() => {
    const scanPatterns = async () => {
      try {
        setIsLoading(true);
        const allPatterns: Pattern[] = [];

        for (const symbol of selectedSymbols) {
          try {
            // Scan for Harmonic patterns
            const harmonicResponse = await dataManager.analyzeHarmonic(symbol.replace('USDT', ''));
            const harmonicResult = harmonicResponse?.patterns || harmonicResponse?.harmonic || harmonicResponse;
            
            if (harmonicResult) {
              const patterns = Array.isArray(harmonicResult) ? harmonicResult : (harmonicResult.patterns || []);
              if ((patterns?.length || 0) > 0) {
                patterns.forEach((p: any) => {
                  allPatterns.push({
                    symbol,
                    patternType: p.type || p.pattern || 'Harmonic',
                    reliability: (p.reliabilityScore || p.reliability || p.completionProbability || 0) * 100,
                    direction: p.direction === 'UP' || p.direction === 'BULLISH' ? 'BULLISH' : 'BEARISH',
                    entryPrice: p.points?.C?.price || p.entryPrice,
                    targetPrice: p.prz?.upper || p.points?.D?.price || p.targetPrice,
                    stopLoss: p.prz?.lower || p.stopLoss,
                    timeframe: '1h'
                  });
                });
              }
            }

            // Scan for Elliott Wave patterns
            const elliottResponse = await dataManager.analyzeElliott(symbol.replace('USDT', ''));
            const elliottResult = elliottResponse?.elliott || elliottResponse;
            
            if (elliottResult) {
              const nextDirection = elliottResult.nextExpectedDirection || elliottResult.nextDirection;
              if (nextDirection) {
                allPatterns.push({
                  symbol,
                  patternType: 'Elliott Wave',
                  reliability: (elliottResult.completionProbability || 0) * 100,
                  direction: nextDirection === 'UP' ? 'BULLISH' : 'BEARISH',
                  targetPrice: elliottResult.targetPrice,
                  timeframe: '4h'
                });
              }
            }
          } catch (error) {
            logger.error(`Failed to scan patterns for ${symbol}:`, {}, error);
          }
        }

        // Sort by reliability
        allPatterns.sort((a, b) => b.reliability - a.reliability);
        setPatterns(allPatterns);
      } catch (error) {
        logger.error('Failed to scan technical patterns:', {}, error);
      } finally {
        setIsLoading(false);
      }
    };

    scanPatterns();
    const interval = setInterval(scanPatterns, 120000); // Refresh every 2 minutes

    return () => clearInterval(interval);
  }, [selectedSymbols]);

  const getPatternColor = (pattern: Pattern) => {
    return pattern.direction === 'BULLISH' ? 'text-green-400' : 'text-red-400';
  };

  const getPatternBg = (pattern: Pattern) => {
    return pattern.direction === 'BULLISH'
      ? theme === 'dark' ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-200'
      : theme === 'dark' ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Search className="w-6 h-6 text-blue-400" />
          <h3 className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Technical Patterns Scanner
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isLoading ? 'Scanning...' : `${patterns.length} patterns found`}
          </span>
        </div>
      </div>

      {/* Patterns List */}
      {isLoading && patterns.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-body text-text-tertiary">
              Scanning for technical patterns...
            </p>
          </div>
        </div>
      ) : patterns.length === 0 ? (
        <div className={`${
          theme === 'dark' 
            ? 'bg-white/5 border-blue-800/30' 
            : 'bg-white/80 border-blue-200/50'
        } backdrop-blur-md rounded-xl p-8 border text-center`}>
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No technical patterns detected. Patterns will appear here when found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(patterns || []).map((pattern, index) => (
            <div
              key={`${pattern.symbol}-${pattern.patternType}-${index}`}
              className={`${
                theme === 'dark' 
                  ? 'bg-white/10 border-blue-800/30' 
                  : 'bg-white/80 border-blue-200/50'
              } ${getPatternBg(pattern)} backdrop-blur-md rounded-xl p-6 border transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className={`text-lg font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {pattern.symbol.replace('USDT', '')}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getPatternColor(pattern)} ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      {pattern.patternType}
                    </span>
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {pattern.timeframe}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {pattern.direction === 'BULLISH' ? (
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    )}
                    <span className={`font-semibold ${getPatternColor(pattern)}`}>
                      {pattern.direction}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    pattern.reliability >= 70 ? 'text-green-400' :
                    pattern.reliability >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {pattern.reliability.toFixed(0)}%
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Reliability
                  </div>
                </div>
              </div>

              {/* Price Targets */}
              {(pattern.entryPrice || pattern.targetPrice || pattern.stopLoss) && (
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700 dark:border-gray-600">
                  {pattern.entryPrice && (
                    <div>
                      <div className={`text-xs mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Entry
                      </div>
                      <div className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        ${pattern.entryPrice.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {pattern.targetPrice && (
                    <div>
                      <div className={`text-xs mb-1 flex items-center ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <Target className="w-3 h-3 mr-1" />
                        Target
                      </div>
                      <div className="font-semibold text-green-400">
                        ${pattern.targetPrice.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {pattern.stopLoss && (
                    <div>
                      <div className={`text-xs mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Stop Loss
                      </div>
                      <div className="font-semibold text-red-400">
                        ${pattern.stopLoss.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reliability Bar */}
              <div className="mt-4">
                <div className={`w-full ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                } rounded-full h-2`}>
                  <div
                    className={`h-2 rounded-full transition-all ${
                      pattern.reliability >= 70 ? 'bg-green-500' :
                      pattern.reliability >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${pattern.reliability}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

