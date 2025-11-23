import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Logger } from '../core/Logger.js';
import {
  TrendingUp, TrendingDown, Activity, BarChart3, Layers,
  Maximize2, Settings, Download, Share2, Clock, RefreshCw,
  ChevronDown, Eye, EyeOff, Grid, Zap, Target, Minus,
  Search, Plus, X
} from 'lucide-react';
import { dataManager } from '../services/dataManager';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import ChartFrame from '../components/ui/ChartFrame';
import { useOHLC, OHLCBar } from '../hooks/useOHLC';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';
import { useSafeAsync } from '../hooks/useSafeAsync';
import BacktestButton from '../components/backtesting/BacktestButton';
import ErrorStateCard from '../components/ui/ErrorStateCard';
import { ChartSkeleton } from '../components/ui/Skeleton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const logger = Logger.getInstance();

// Use OHLCBar type from useOHLC hook
type ChartData = OHLCBar;

interface Indicator {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  values?: number[];
}

interface ChartSettings {
  chartType: 'candlestick' | 'line' | 'area';
  showVolume: boolean;
  showGrid: boolean;
  indicators: Indicator[];
}

// Extended symbol list with popular crypto assets
const ALL_SYMBOLS = [
  { value: 'BTC/USDT', label: 'Bitcoin', ticker: 'BTC' },
  { value: 'ETH/USDT', label: 'Ethereum', ticker: 'ETH' },
  { value: 'BNB/USDT', label: 'BNB', ticker: 'BNB' },
  { value: 'SOL/USDT', label: 'Solana', ticker: 'SOL' },
  { value: 'ADA/USDT', label: 'Cardano', ticker: 'ADA' },
  { value: 'DOGE/USDT', label: 'Dogecoin', ticker: 'DOGE' },
  { value: 'XRP/USDT', label: 'Ripple', ticker: 'XRP' },
  { value: 'DOT/USDT', label: 'Polkadot', ticker: 'DOT' },
  { value: 'AVAX/USDT', label: 'Avalanche', ticker: 'AVAX' },
  { value: 'MATIC/USDT', label: 'Polygon', ticker: 'MATIC' },
  { value: 'LINK/USDT', label: 'Chainlink', ticker: 'LINK' },
  { value: 'UNI/USDT', label: 'Uniswap', ticker: 'UNI' },
  { value: 'ATOM/USDT', label: 'Cosmos', ticker: 'ATOM' },
  { value: 'LTC/USDT', label: 'Litecoin', ticker: 'LTC' },
  { value: 'NEAR/USDT', label: 'NEAR Protocol', ticker: 'NEAR' },
  { value: 'APT/USDT', label: 'Aptos', ticker: 'APT' },
  { value: 'ARB/USDT', label: 'Arbitrum', ticker: 'ARB' },
  { value: 'OP/USDT', label: 'Optimism', ticker: 'OP' },
  { value: 'SUI/USDT', label: 'Sui', ticker: 'SUI' },
  { value: 'INJ/USDT', label: 'Injective', ticker: 'INJ' }
];

const ChartingView: React.FC = () => {
  const { run } = useSafeAsync();
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);

  // Use useOHLC hook for resilient data loading
  const { data: chartData, loading, error: ohlcError, updatedAt, reload, nextRetryInMs } = useOHLC(symbol, timeframe, 500);
  const { isOnline } = useOnlineStatus();
  const [settings, setSettings] = useState<ChartSettings>({
    chartType: 'candlestick',
    showVolume: true,
    showGrid: true,
    indicators: [
      { id: 'ma20', name: 'MA 20', enabled: true, color: '#22c55e' },
      { id: 'ma50', name: 'MA 50', enabled: true, color: '#f59e0b' },
      { id: 'rsi', name: 'RSI', enabled: false, color: '#8b5cf6' },
      { id: 'macd', name: 'MACD', enabled: false, color: '#3b82f6' },
      { id: 'bb', name: 'Bollinger Bands', enabled: false, color: '#ec4899' }
    ]
  });
  const [showSettings, setShowSettings] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  // Available timeframes
  const timeframes = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
    { value: '1w', label: '1w' }
  ];

  // Filtered symbols based on search
  const filteredSymbols = useMemo(() => {
    if (!searchQuery.trim()) return ALL_SYMBOLS;
    const query = searchQuery.toLowerCase();
    return ALL_SYMBOLS.filter(s =>
      s.ticker.toLowerCase().includes(query) ||
      s.label.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Update current price when chartData changes
  useEffect(() => {
    if (chartData && (chartData?.length || 0) > 0) {
      const latest = chartData[chartData.length - 1];
      const previous = chartData[chartData.length - 2];
      setCurrentPrice(latest.c);

      if (previous) {
        const change = ((latest.c - previous.c) / previous.c) * 100;
        setPriceChange(change);
      }
    }
  }, [chartData]);

  // Fetch analysis data
  const fetchAnalysis = useCallback(async () => {
    try {
      const [smcResult, elliottResult] = await Promise.allSettled([
        dataManager.analyzeSMC(symbol),
        dataManager.analyzeElliott(symbol)
      ]);

      const analysisData: any = {};

      if (smcResult.status === 'fulfilled' && smcResult.value?.success) {
        analysisData.smc = smcResult.value.data;
      }

      if (elliottResult.status === 'fulfilled' && elliottResult.value?.success) {
        analysisData.elliott = elliottResult.value.data;
      }

      setAnalysis(analysisData);
    } catch (err) {
      logger.error('Failed to fetch analysis:', {}, err);
    }
  }, [symbol]);

  useDebouncedEffect(() => {
    fetchAnalysis();

    const interval = setInterval(() => {
      fetchAnalysis();
    }, 30000);

    return () => clearInterval(interval);
  }, [symbol, timeframe], 300);

  // Toggle indicator
  const toggleIndicator = (id: string) => {
    setSettings(prev => ({
      ...prev,
      indicators: (prev.indicators || []).map(ind =>
        ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
      )
    }));
  };

  // Get current symbol info
  const currentSymbolInfo = ALL_SYMBOLS.find(s => s.value === symbol);

  // Render simplified candlestick chart
  const renderChart = () => {
    if (loading && (!chartData || chartData.length === 0)) {
      return <ChartSkeleton />;
    }

    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Activity className="w-16 h-16 mx-auto mb-4 text-[color:var(--text-muted)]" />
            <p className="text-[color:var(--text-secondary)]">No chart data available</p>
          </div>
        </div>
      );
    }

    // Get visible data (last 100 candles)
    const visibleData = chartData.slice(-100);
    const maxPrice = Math.max(...(visibleData || []).map(d => d.h));
    const minPrice = Math.min(...(visibleData || []).map(d => d.l));
    const priceRange = maxPrice - minPrice;

    return (
      <div className="relative w-full h-full">
        {/* Price Scale */}
        <div className="absolute left-0 top-0 bottom-0 w-20 flex flex-col justify-between py-4 text-xs text-[color:var(--text-secondary)]">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <div key={ratio} className="text-right pr-2">
              ${(minPrice + priceRange * (1 - ratio)).toFixed(2)}
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="ml-20 mr-4 h-full relative">
          {/* Grid */}
          {settings.showGrid && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={`${ratio * 100}%`}
                  x2="100%"
                  y2={`${ratio * 100}%`}
                  stroke="var(--border)"
                  strokeWidth="1"
                  opacity="0.3"
                />
              ))}
            </svg>
          )}

          {/* Candlesticks */}
          <div className="flex items-end justify-between h-full px-1">
            {(visibleData || []).map((candle, index) => {
              const isGreen = candle.c >= candle.o;
              const bodyTop = Math.max(candle.o, candle.c);
              const bodyBottom = Math.min(candle.o, candle.c);
              const bodyHeight = Math.abs(candle.c - candle.o);

              const topPos = ((maxPrice - bodyTop) / priceRange) * 100;
              const heightPercent = (bodyHeight / priceRange) * 100;
              const wickTopHeight = ((bodyTop - candle.h) / priceRange) * 100;
              const wickBottomHeight = ((candle.l - bodyBottom) / priceRange) * 100;

              return (
                <div
                  key={`candle-${candle.t}-${index}`}
                  className="relative flex-1 h-full"
                  style={{ maxWidth: '8px', minWidth: '2px' }}
                >
                  {/* High wick */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-px ${
                      isGreen ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{
                      top: `${topPos + wickTopHeight}%`,
                      height: `${Math.abs(wickTopHeight)}%`
                    }}
                  />

                  {/* Body */}
                  <div
                    className={`absolute left-0 right-0 ${
                      isGreen ? 'bg-emerald-500' : 'bg-rose-500'
                    } rounded-sm`}
                    style={{
                      top: `${topPos}%`,
                      height: `${Math.max(heightPercent, 0.5)}%`
                    }}
                  />

                  {/* Low wick */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-px ${
                      isGreen ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{
                      top: `${topPos + heightPercent}%`,
                      height: `${Math.abs(wickBottomHeight)}%`
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Volume */}
        {settings.showVolume && (
          <div className="absolute bottom-0 left-20 right-4 h-20 flex items-end justify-between px-1">
            {(visibleData || []).map((candle, index) => {
              const maxVolume = Math.max(...(visibleData || []).map(d => d.v));
              const heightPercent = (candle.v / maxVolume) * 100;
              const isGreen = candle.c >= candle.o;

              return (
                <div
                  key={`volume-${candle.t}-${index}`}
                  className={`flex-1 ${
                    isGreen ? 'bg-emerald-500/30' : 'bg-rose-500/30'
                  } rounded-t`}
                  style={{
                    height: `${heightPercent}%`,
                    maxWidth: '8px',
                    minWidth: '2px'
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen bg-[color:var(--surface-page)] animate-fade-in pb-8 px-6">
        {/* Header */}
        <div className="mb-6 max-w-[1800px] mx-auto">
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[var(--primary-600)] to-[var(--primary-400)] bg-clip-text text-transparent">
            Advanced Charting
          </h1>
          <p className="text-[color:var(--text-secondary)] text-sm">
            Visualize price action and technical momentum in real time
          </p>
        </div>

        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Controls Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Symbol Selector */}
            <div className="md:col-span-3 relative">
              <button
                onClick={() => setShowSymbolPicker(!showSymbolPicker)}
                className="w-full px-4 py-3 rounded-xl text-sm font-bold transition-all card-base hover:shadow-md flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[color:var(--primary-500)]" />
                  <span className="text-[color:var(--text-primary)]">{currentSymbolInfo?.ticker || symbol}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-[color:var(--text-secondary)]" />
              </button>

              {/* Symbol Picker Dropdown */}
              {showSymbolPicker && (
                <div className="absolute top-full mt-2 left-0 right-0 card-base rounded-xl shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-[color:var(--border)]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-muted)]" />
                      <input
                        type="text"
                        placeholder="Search symbols..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text-primary)] text-sm focus:border-[color:var(--primary-500)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {(filteredSymbols || []).map(s => (
                      <button
                        key={s.value}
                        onClick={() => {
                          setSymbol(s.value);
                          setShowSymbolPicker(false);
                          setSearchQuery('');
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-[color:var(--surface-muted)] transition-colors flex items-center justify-between ${
                          symbol === s.value ? 'bg-[color:var(--primary-50)]' : ''
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-[color:var(--text-primary)]">{s.ticker}</div>
                          <div className="text-xs text-[color:var(--text-secondary)]">{s.label}</div>
                        </div>
                        {symbol === s.value && (
                          <div className="w-2 h-2 rounded-full bg-[color:var(--primary-500)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timeframe Buttons */}
            <div className="md:col-span-6 flex gap-2 flex-wrap">
              {(timeframes || []).map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    timeframe === tf.value
                      ? 'bg-gradient-to-r from-[var(--primary-500)] to-[var(--primary-600)] text-white shadow-md'
                      : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--primary-50)] border border-[color:var(--border)]'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-3 flex gap-2">
              <button
                onClick={reload}
                disabled={loading || !isOnline}
                className="flex-1 px-4 py-2 rounded-lg card-base hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Refresh chart data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">{isOnline ? 'Refresh' : 'Offline'}</span>
              </button>

              <BacktestButton
                symbolUI={symbol}
                timeframe={timeframe}
                className="px-4 py-2 rounded-lg card-base hover:shadow-md transition-all text-sm"
              />

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 rounded-lg card-base hover:shadow-md transition-all"
                aria-label="Toggle chart settings"
                title="Toggle chart settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {ohlcError && (
            <div className="mt-4">
              <ErrorStateCard
                title="Unable to load chart data"
                message={ohlcError}
                onRetry={reload}
                hint={
                  nextRetryInMs
                    ? `Automatic retry in ${Math.ceil(nextRetryInMs / 1000)}s`
                    : isOnline
                      ? 'Adjust symbol or timeframe and try again.'
                      : undefined
                }
              />
            </div>
          )}

          {/* Price Info */}
          <div className="card-base rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="text-[color:var(--text-secondary)] text-xs mb-1">Current Price</div>
                <div className="text-2xl font-bold text-[color:var(--text-primary)]">
                  ${currentPrice.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-[color:var(--text-secondary)] text-xs mb-1">24h Change</div>
                <div className={`text-2xl font-bold flex items-center gap-2 ${
                  priceChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {priceChange >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  {priceChange.toFixed(2)}%
                </div>
              </div>

              {analysis?.smc && (
                <div>
                  <div className="text-[color:var(--text-secondary)] text-xs mb-1">Smart Money</div>
                  <div className="text-lg font-bold text-purple-600">
                    {analysis.smc.trend || 'Neutral'}
                  </div>
                </div>
              )}

              {analysis?.elliott && (
                <div>
                  <div className="text-[color:var(--text-secondary)] text-xs mb-1">Elliott Wave</div>
                  <div className="text-lg font-bold text-orange-600">
                    Wave {analysis.elliott.currentWave || '?'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="card-base rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 text-[color:var(--text-primary)]">Chart Settings</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart Type */}
                <div>
                  <label className="text-sm text-[color:var(--text-secondary)] block mb-2">Chart Type</label>
                  <select
                    value={settings.chartType}
                    onChange={(e) => setSettings(prev => ({ ...prev, chartType: e.target.value as any }))}
                    className="w-full px-4 py-2 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--text-primary)]"
                  >
                    <option value="candlestick">Candlestick</option>
                    <option value="line">Line</option>
                    <option value="area">Area</option>
                  </select>
                </div>

                {/* Show Volume */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.showVolume}
                    onChange={(e) => setSettings(prev => ({ ...prev, showVolume: e.target.checked }))}
                    className="w-5 h-5 rounded accent-[color:var(--primary-500)]"
                  />
                  <label className="text-sm text-[color:var(--text-primary)]">Show Volume</label>
                </div>

                {/* Show Grid */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.showGrid}
                    onChange={(e) => setSettings(prev => ({ ...prev, showGrid: e.target.checked }))}
                    className="w-5 h-5 rounded accent-[color:var(--primary-500)]"
                  />
                  <label className="text-sm text-[color:var(--text-primary)]">Show Grid</label>
                </div>
              </div>

              {/* Indicators */}
              <div className="mt-6">
                <h4 className="text-sm font-bold mb-3 text-[color:var(--text-primary)]">Indicators</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(settings.indicators || []).map(indicator => (
                    <button
                      key={indicator.id}
                      onClick={() => toggleIndicator(indicator.id)}
                      className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                        indicator.enabled
                          ? 'bg-blue-100 border border-blue-300 text-blue-700'
                          : 'bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                      }`}
                    >
                      {indicator.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      {indicator.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chart Container */}
          <ChartFrame
            title="Price Chart"
            subtitle={`${currentSymbolInfo?.label || symbol} • ${timeframe}${updatedAt ? ' • updated ' + new Date(updatedAt).toLocaleTimeString() : ''}`}
            loading={loading && !chartData}
            error={error}
            onReload={reload}
            height={settings.showVolume ? 600 : 500}
          >
            {renderChart()}
          </ChartFrame>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-base bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
              <div className="text-emerald-700 text-xs mb-1 font-medium">Daily High</div>
              <div className="text-xl font-bold text-emerald-900">
                ${chartData && (chartData?.length || 0) > 0 ? Math.max(...chartData.slice(-24).map(d => d.h)).toFixed(2) : '0'}
              </div>
            </div>

            <div className="card-base bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-4 border border-rose-200">
              <div className="text-rose-700 text-xs mb-1 font-medium">Daily Low</div>
              <div className="text-xl font-bold text-rose-900">
                ${chartData && (chartData?.length || 0) > 0 ? Math.min(...chartData.slice(-24).map(d => d.l)).toFixed(2) : '0'}
              </div>
            </div>

            <div className="card-base bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <div className="text-blue-700 text-xs mb-1 font-medium">24h Volume</div>
              <div className="text-xl font-bold text-blue-900">
                ${chartData && (chartData?.length || 0) > 0 ? (chartData.slice(-24).reduce((sum, d) => sum + d.v, 0) / 1000000).toFixed(2) : '0'}M
              </div>
            </div>

            <div className="card-base bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
              <div className="text-purple-700 text-xs mb-1 font-medium">Volatility</div>
              <div className="text-xl font-bold text-purple-900">
                {chartData && (chartData?.length || 0) > 0 ? (
                  ((Math.max(...chartData.slice(-24).map(d => d.h)) -
                    Math.min(...chartData.slice(-24).map(d => d.l))) /
                    chartData[chartData.length - 1].c * 100).toFixed(2)
                ) : '0'}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ChartingView;
