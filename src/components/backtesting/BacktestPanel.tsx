import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import {
  PlayCircle,
  PauseCircle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
  AlertCircle,
  Download
} from 'lucide-react';
import { BacktestResult, MarketData } from '../../types';
import { backtestService } from '../../services/backtestService';
import { marketDataService } from '../../services/marketDataService';
import { dataManager } from '../../services/dataManager';
import { RealBacktestEngine } from '../../services/RealBacktestEngine.js';
import { showToast } from '../ui/Toast';
import { useConfirmModal } from '../ui/ConfirmModal';

interface BacktestPanelProps {
  symbol: string;
  timeframe: string;
}


const logger = Logger.getInstance();

export const BacktestPanel: React.FC<BacktestPanelProps> = ({ symbol, timeframe }) => {
  const { confirm, ModalComponent } = useConfirmModal();
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [historicalData, setHistoricalData] = useState<MarketData[]>([]);

  useEffect(() => {
    loadHistoricalData();
  }, [symbol, timeframe]);

  const loadHistoricalData = async () => {
    try {
      // Use marketDataService directly since dataManager.getHistoricalData may not be available
      const data = await marketDataService.getHistoricalData(symbol, timeframe, 1000);
      setHistoricalData(data);
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Error loading historical data:', {}, error);
    }
  };

  const runRealBacktest = async () => {
    if (!historicalData.length) return;
    setIsRunning(true);
    setProgress(0);
    setError(false);
    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const engine = RealBacktestEngine.getInstance();
      const now = Date.now();
      const first = historicalData[0]?.timestamp || now - 1000 * 60 * 60 * 24 * 30;
      const last = historicalData[historicalData.length - 1]?.timestamp || now;
      const res = await engine.runBacktest(symbol, timeframe, historicalData.length, {
        startDate: typeof first === 'number' ? first : first.getTime(),
        endDate: typeof last === 'number' ? last : last.getTime(),
        initialCapital: 10000,
        feeRate: 0.0005,
        slippageRate: 0.0005,
        maxPositionSize: 0.2
      });

      clearInterval(progressInterval);
      setProgress(100);
      setBacktestResult(res);

      setTimeout(() => setProgress(0), 1000);
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Real backtest error:', {}, error);
      setError(true);
    } finally {
      setIsRunning(false);
    }
  };

  const runBacktest = async () => {
    if (historicalData.length < 100) {
      showToast('warning', 'Insufficient Data', 'Need at least 100 data points for backtesting');
      return;
    }

    setIsRunning(true);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await backtestService.runWalkForwardBacktest(
        historicalData,
        symbol,
        timeframe
      );

      clearInterval(progressInterval);
      setProgress(100);
      setBacktestResult(result);

      setTimeout(() => setProgress(0), 1000);
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Backtest error:', {}, error);
      showToast('error', 'Backtest Error', 'Error running backtest. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: number): string => {
    return `$${Math.abs(value).toFixed(2)}`;
  };

  const exportResults = () => {
    if (!backtestResult) { console.warn("Missing data"); }

    const csvContent = [
      'Trade ID,Symbol,Side,Entry Time,Exit Time,Entry Price,Exit Price,PnL,Confidence',
      ...(backtestResult.trades || []).map(trade => {
        const entryTime = typeof trade.entryTime === 'number'
          ? new Date(trade.entryTime).toISOString()
          : trade.entryTime.toISOString();
        const exitTime = typeof trade.exitTime === 'number'
          ? new Date(trade.exitTime).toISOString()
          : trade.exitTime.toISOString();
        return `${trade.id || 'N/A'},${trade.symbol},${trade.side},${entryTime},${exitTime},${trade.entryPrice},${trade.exitPrice},${trade.pnl},${trade.confidence}`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_${symbol}_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <ModalComponent />
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Walk-Forward Backtesting
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runRealBacktest}
              disabled={isRunning || historicalData.length < 100}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <PauseCircle className="h-4 w-4" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {isRunning ? 'Running...' : 'Run Backtest'}
            </button>
            {backtestResult && (
              <button
                type="button"
                onClick={exportResults}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Progress Bar */}
        {isRunning && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Data Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">Data Points</div>
              <div className="text-lg font-semibold text-gray-900">
                {historicalData.length.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Symbol</div>
              <div className="text-lg font-semibold text-gray-900">{symbol}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Timeframe</div>
              <div className="text-lg font-semibold text-gray-900">{timeframe}</div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <div className="text-xs text-red-600">Backtest failed</div>}

        {/* Results */}
        {backtestResult ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-emerald-700">Total PnL</div>
                    <div className="text-2xl font-bold text-emerald-900">
                      {formatCurrency(backtestResult?.trades?.reduce((sum, t) => sum + t.pnl, 0))}
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-emerald-600" />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-700">Total Trades</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {backtestResult.totalTrades}
                    </div>
                  </div>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-700">Win Rate</div>
                    <div className="text-2xl font-bold text-green-900">
                      {formatPercent(backtestResult.winRate)}
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-purple-700">Sharpe Ratio</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {backtestResult.sharpeRatio.toFixed(2)}
                    </div>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-red-700">Max Drawdown</div>
                    <div className="text-2xl font-bold text-red-900">
                      {formatPercent(backtestResult.maxDrawdown)}
                    </div>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Directional Accuracy</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatPercent(backtestResult.directionalAccuracy)}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${backtestResult.directionalAccuracy * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Profit Factor</div>
                  <div className="text-xl font-bold text-gray-900">
                    {backtestResult.profitFactor === Infinity ? '∞' : backtestResult.profitFactor.toFixed(2)}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Sortino Ratio</div>
                  <div className="text-xl font-bold text-gray-900">
                    {backtestResult.sortinoRatio.toFixed(2)}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">VaR (95%)</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatPercent(backtestResult.var95)}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Start Date</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {backtestResult.startDate.toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">End Date</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {backtestResult.endDate.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Acceptance Criteria (MarkTechPost Standards)
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Directional Accuracy ≥ 70%</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    backtestResult.directionalAccuracy >= 0.7
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {backtestResult.directionalAccuracy >= 0.7 ? '✓ PASS' : '✗ FAIL'} ({formatPercent(backtestResult.directionalAccuracy)})
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Max Drawdown ≤ 20%</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    backtestResult.maxDrawdown <= 0.2
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {backtestResult.maxDrawdown <= 0.2 ? '✓ PASS' : '✗ FAIL'} ({formatPercent(backtestResult.maxDrawdown)})
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Sharpe Ratio ≥ 1.0</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    backtestResult.sharpeRatio >= 1.0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {backtestResult.sharpeRatio >= 1.0 ? '✓ PASS' : '✗ FAIL'} ({backtestResult.sharpeRatio.toFixed(2)})
                  </span>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    backtestResult.directionalAccuracy >= 0.7 && 
                    backtestResult.maxDrawdown <= 0.2 && 
                    backtestResult.sharpeRatio >= 1.0
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`} />
                  <span className="font-medium text-gray-900">
                    Overall Status: {
                      backtestResult.directionalAccuracy >= 0.7 && 
                      backtestResult.maxDrawdown <= 0.2 && 
                      backtestResult.sharpeRatio >= 1.0
                        ? 'ACCEPTED ✓'
                        : 'NEEDS IMPROVEMENT ✗'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            {(backtestResult.trades?.length || 0) > 0 && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Trades</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Side
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entry Price
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Exit Price
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PnL
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Confidence
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {backtestResult.trades.slice(-10).reverse().map((trade, index) => (
                        <tr key={index}>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              trade.side === 'LONG' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {trade.side}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${trade.entryPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${trade.exitPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPercent(trade.confidence)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Backtest Results</h4>
            <p className="text-gray-600 mb-6">
              Run a walk-forward backtest to analyze AI performance over historical data.
            </p>
            <p className="text-sm text-gray-500">
              Data points available: {historicalData.length.toLocaleString()}
              <br />
              (Minimum 100 required for backtesting)
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};