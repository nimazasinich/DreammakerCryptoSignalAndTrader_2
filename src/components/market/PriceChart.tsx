import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { CandlestickData, TechnicalIndicators } from '../../types';
import { Activity, BarChart3, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { marketDataService } from '../../services/marketDataService';
import SkeletonBlock from '../ui/SkeletonBlock';

interface PriceChartProps {
  symbol: string;
  data?: CandlestickData[];
  indicators?: TechnicalIndicators;
  autoFetch?: boolean;
  initialTimeframe?: string;
}


const logger = Logger.getInstance();

export const PriceChart: React.FC<PriceChartProps> = ({ 
  symbol, 
  data: propData, 
  indicators: propIndicators,
  autoFetch = false,
  initialTimeframe = '1h'
}) => {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [showIndicators, setShowIndicators] = useState(false);
  const [chartData, setChartData] = useState<CandlestickData[]>(propData || []);
  const [indicators, setIndicators] = useState<TechnicalIndicators | undefined>(propIndicators);
  const [loading, setLoading] = useState(false);

  // Fetch real chart data from API
  useEffect(() => {
    if (autoFetch && symbol) {
      fetchChartData();
    }
  }, [symbol, timeframe, autoFetch]); // Removed propData from deps to prevent infinite loop

  useEffect(() => {
    if (propData && (propData?.length || 0) > 0) {
      // Only update if data actually changed (compare length and first/last timestamps)
      setChartData(prev => {
        if (prev.length === 0 || 
            prev.length !== propData.length ||
            prev[0]?.timestamp !== propData[0]?.timestamp ||
            prev[prev.length - 1]?.timestamp !== propData[propData.length - 1]?.timestamp) {
          return propData;
        }
        return prev;
      });
    } else if (!propData || propData.length === 0) {
      // Only clear if we had data before
      setChartData(prev => (prev?.length || 0) > 0 ? [] : prev);
    }
  }, [propData]); // Keep propData but with conditional update

  useEffect(() => {
    if (propIndicators) {
      setIndicators(propIndicators);
    }
  }, [propIndicators]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      // USE REAL DATA ONLY - NO MORE MOCK DATA
      if (import.meta.env.DEV) logger.info(`📊 Loading REAL chart data for ${symbol} (${timeframe})...`);

      const cleanSymbol = symbol.replace('USDT', '').replace('/USDT', '').toUpperCase();

      // Fetch real data from backend API
      const data = await marketDataService.getHistoricalData(`${cleanSymbol}USDT`, timeframe, 100);

      if (Array.isArray(data) && (data?.length || 0) > 0) {
        const candles: CandlestickData[] = data.map((d) => {
          const timestamp = typeof d.timestamp === 'number' ? d.timestamp :
                           d.timestamp instanceof Date ? d.timestamp.getTime() :
                           Date.now();
          return {
            timestamp,
            open: d.open || d.price || 0,
            high: d.high || d.price || 0,
            low: d.low || d.price || 0,
            close: d.close || d.price || 0,
            volume: d.volume || 0
          };
        });

        if (import.meta.env.DEV) logger.info(`✅ Loaded ${candles.length} REAL candles for ${symbol}`);
        setChartData(candles);

        if ((candles?.length || 0) > 0) {
          const calculatedIndicators = calculateIndicators(candles);
          setIndicators(calculatedIndicators);
        }
      } else {
        console.error('No real data available from API');
      }

    } catch (error) {
      logger.error('❌ Error loading REAL chart data:', {}, error);
      // Clear data to show error state instead of showing mock data
      setChartData([]);
      setIndicators(undefined);
    } finally {
      setLoading(false);
    }
  };

  const calculateIndicators = (data: CandlestickData[]): TechnicalIndicators => {
    if (data.length < 20) {
      return {
        rsi: 50,
        macd: { macd: 0, signal: 0, histogram: 0 },
        sma20: data[data.length - 1]?.close || 0,
        bb: { upper: data[data.length - 1]?.close || 0, lower: data[data.length - 1]?.close || 0 }
      };
    }

    const closes = (data || []).map(d => d.close);
    const currentPrice = closes[closes.length - 1];

    // SMA 20
    const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;

    // RSI
    const rsi = calculateRSI(closes, 14);

    // MACD (simplified)
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macd = ema12 - ema26;
    const signal = calculateEMA(closes.slice(-9).map((_, i) => macd), 9);
    const histogram = macd - signal;

    // Bollinger Bands
    const stdDev = calculateStdDev(closes.slice(-20));
    const bbUpper = sma20 + (2 * stdDev);
    const bbLower = sma20 - (2 * stdDev);

    return {
      rsi,
      macd: { macd, signal, histogram },
      sma20,
      bb: { upper: bbUpper, lower: bbLower }
    };
  };

  const calculateRSI = (prices: number[], period: number): number => {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateEMA = (prices: number[], period: number): number => {
    if (prices.length === 0) return 0;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  };

  const calculateStdDev = (values: number[]): number => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = (values || []).map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    if (autoFetch) {
      fetchChartData();
    }
  };

  if (loading && chartData.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <SkeletonBlock height={400} />
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center">
        <p className="text-gray-400">No chart data available</p>
        {autoFetch && (
          <button
            type="button"
            onClick={fetchChartData}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Validate and filter data to prevent NaN values
  const validData = chartData.filter(d => 
    d.high != null && !isNaN(d.high) && isFinite(d.high) &&
    d.low != null && !isNaN(d.low) && isFinite(d.low) &&
    d.open != null && !isNaN(d.open) && isFinite(d.open) &&
    d.close != null && !isNaN(d.close) && isFinite(d.close)
  );

  if (!validData.length) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center">
        <p className="text-gray-400">No valid chart data available</p>
      </div>
    );
  }

  const maxPrice = Math.max(...(validData || []).map(d => d.high));
  const minPrice = Math.min(...(validData || []).map(d => d.low));
  const priceRange = maxPrice - minPrice || 1;

  const getYPosition = (price: number, height: number = 300): number => {
    if (price == null || isNaN(price) || !isFinite(price)) {
      return height / 2; // Return middle if invalid
    }
    const normalized = (price - minPrice) / priceRange;
    const result = height - (normalized * height);
    return isNaN(result) || !isFinite(result) ? height / 2 : result;
  };

  const currentPrice = validData[validData.length - 1]?.close || 0;
  const previousPrice = validData[validData.length - 2]?.close || 0;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-bold text-white">{symbol}/USDT</h3>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-white">
                ${currentPrice.toLocaleString()}
              </span>
              <div className={`flex items-center ${
                priceChange >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {priceChange >= 0 ? (
                  <TrendingUp size={20} className="mr-1" />
                ) : (
                  <TrendingDown size={20} className="mr-1" />
                )}
                <span className="font-semibold">
                  {priceChange >= 0 ? '+' : ''}
                  {priceChangePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <select 
              value={timeframe}
              onChange={(e) => handleTimeframeChange(e.target.value)}
              className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
            
            {autoFetch && (
              <button
                type="button"
                onClick={fetchChartData}
                disabled={loading}
                className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-700 transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
            
            <button
              type="button"
              onClick={() => setChartType(chartType === 'candlestick' ? 'line' : 'candlestick')}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-700 transition-colors"
            >
              {chartType === 'candlestick' ? <Activity size={16} /> : <BarChart3 size={16} />}
            </button>
            
            <button
              type="button"
              onClick={() => setShowIndicators(!showIndicators)}
              className={`px-3 py-1 rounded border transition-colors ${
                showIndicators 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Indicators
            </button>
          </div>
        </div>

        {showIndicators && indicators && (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-800 p-2 rounded">
              <span className="text-gray-400">RSI</span>
              <div className={`font-semibold ${
                indicators.rsi > 70 ? 'text-red-400' : indicators.rsi < 30 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {indicators.rsi.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="text-gray-400">MACD</span>
              <div className={`font-semibold ${
                indicators.macd.histogram > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {indicators.macd.macd.toFixed(4)}
              </div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="text-gray-400">SMA 20</span>
              <div className={`font-semibold ${
                currentPrice > indicators.sma20 ? 'text-green-400' : 'text-red-400'
              }`}>
                ${indicators.sma20.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="text-gray-400">BB %B</span>
              <div className="text-blue-400 font-semibold">
                {(((currentPrice - indicators.bb.lower) / (indicators.bb.upper - indicators.bb.lower)) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="relative h-80 bg-gray-950 rounded border border-gray-800 overflow-hidden">
          <svg width="100%" height="100%" className="absolute inset-0">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Price data visualization */}
            {chartType === 'candlestick' ? (
              (validData || []).map((candle, index) => {
                const x = (index / (validData.length - 1 || 1)) * 100;
                const yHigh = getYPosition(candle.high, 300);
                const yLow = getYPosition(candle.low, 300);
                const yOpen = getYPosition(candle.open, 300);
                const yClose = getYPosition(candle.close, 300);
                const isGreen = candle.close > candle.open;

                // Validate coordinates before rendering
                if ([yHigh, yLow, yOpen, yClose].some(y => isNaN(y) || !isFinite(y))) {
                  return null;
                }

                const bodyHeight = Math.abs(yOpen - yClose) || 1;
                const bodyTop = Math.min(yOpen, yClose);

                return (
                  <g key={index}>
                    {/* Wick */}
                    <line
                      x1={`${x}%`}
                      y1={yHigh}
                      x2={`${x}%`}
                      y2={yLow}
                      stroke={isGreen ? '#10b981' : '#ef4444'}
                      strokeWidth="1"
                    />
                    {/* Body */}
                    <rect
                      x={`${x}%`}
                      y={bodyTop}
                      width="4"
                      height={bodyHeight}
                      fill={isGreen ? '#10b981' : '#ef4444'}
                      transform={`translate(-2, 0)`}
                    />
                  </g>
                );
              }).filter(Boolean)
            ) : (
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                points={(validData || []).map((candle, index) => {
                  const x = (index / (validData.length - 1 || 1)) * 100;
                  const y = getYPosition(candle.close, 300);
                  return isNaN(x) || isNaN(y) ? '' : `${x}%,${y}`;
                }).filter(Boolean).join(' ')}
              />
            )}

            {/* Technical indicators overlay */}
            {showIndicators && indicators && (
              <>
                {/* Bollinger Bands */}
                <polyline
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="1"
                  opacity="0.5"
                  strokeDasharray="3,3"
                  points={(validData || []).map((_, index) => {
                    const x = (index / (validData.length - 1 || 1)) * 100;
                    const y = getYPosition(indicators.bb.upper, 300);
                    return isNaN(x) || isNaN(y) ? '' : `${x}%,${y}`;
                  }).filter(Boolean).join(' ')}
                />
                <polyline
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="1"
                  opacity="0.5"
                  strokeDasharray="3,3"
                  points={(validData || []).map((_, index) => {
                    const x = (index / (validData.length - 1 || 1)) * 100;
                    const y = getYPosition(indicators.bb.lower, 300);
                    return isNaN(x) || isNaN(y) ? '' : `${x}%,${y}`;
                  }).filter(Boolean).join(' ')}
                />
                {/* SMA 20 */}
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  opacity="0.8"
                  points={(validData || []).map((_, index) => {
                    const x = (index / (validData.length - 1 || 1)) * 100;
                    const y = getYPosition(indicators.sma20, 300);
                    return isNaN(x) || isNaN(y) ? '' : `${x}%,${y}`;
                  }).filter(Boolean).join(' ')}
                />
              </>
            )}
          </svg>

          {/* Price labels */}
          <div className="absolute right-2 top-2 text-xs text-gray-400">
            ${maxPrice.toFixed(2)}
          </div>
          <div className="absolute right-2 bottom-2 text-xs text-gray-400">
            ${minPrice.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};