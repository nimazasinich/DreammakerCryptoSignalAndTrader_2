import React, { useState, useEffect, useCallback } from 'react';
import { Logger } from '../../core/Logger.js';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Brain,
  AlertTriangle,
  Play,
  Pause,
  BarChart3,
  Settings,
  Wifi,
  WifiOff,
  Target,
  Shield,
  Zap
} from 'lucide-react';
import { MarketData, TradingDecision, TrainingMetrics } from '../../types';
import { marketDataService } from '../../services/marketDataService';
import { aiService } from '../../services/aiService';

interface TradingDashboardProps {
  symbol: string;
  timeframe: string;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: string) => void;
}

interface MarketTicker {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  isConnected: boolean;
}

interface AlertItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
}


const logger = Logger.getInstance();

export const TradingDashboard: React.FC<TradingDashboardProps> = ({
  symbol,
  timeframe,
  onSymbolChange,
  onTimeframeChange
}) => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [currentDecision, setCurrentDecision] = useState<TradingDecision | null>(null);
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics[]>([]);
  const [marketTickers, setMarketTickers] = useState<MarketTicker[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [modelPerformance, setModelPerformance] = useState<any>(null);

  const symbols = marketDataService.getSupportedSymbols();
  const timeframes = marketDataService.getSupportedTimeframes();

  useEffect(() => {
    initializeDashboard();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (symbol && timeframe) {
      loadHistoricalData();
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    if (isLive) {
      startRealTimeUpdates();
    } else {
      stopRealTimeUpdates();
    }
    
    return () => stopRealTimeUpdates();
  }, [isLive, symbol]);

  const initializeDashboard = async () => {
    try {
      setConnectionStatus('connecting');
      
      const initialTickers: MarketTicker[] = (symbols || []).map(sym => ({
        symbol: sym,
        price: 0,
        change24h: 0,
        changePercent24h: 0,
        volume24h: 0,
        isConnected: false
      }));
      setMarketTickers(initialTickers);

      await loadHistoricalData();
      await updateMarketTickers();
      
      setConnectionStatus('connected');
      addAlert('success', 'Dashboard initialized successfully');
      
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Dashboard initialization failed:', {}, error);
      setConnectionStatus('disconnected');
      addAlert('error', 'Failed to initialize dashboard');
    }
  };

  const loadHistoricalData = async () => {
    try {
      const data = await marketDataService.getHistoricalData(symbol, timeframe, 200);
      setMarketData(data);
      
      if ((data?.length || 0) > 0) {
        const decision = await aiService.predict(data.slice(-50));
        setCurrentDecision(decision);
        
        const performance = await aiService.getModelPerformance();
        setModelPerformance(performance);
      }
      
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Error loading historical data:', {}, error);
      addAlert('error', `Failed to load data for ${symbol}`);
    }
  };

  const updateMarketTickers = async () => {
    try {
      const updatedTickers: MarketTicker[] = [];
      
      for (const sym of symbols) {
        try {
          const priceData = await marketDataService.getRealTimePrice(sym);
          
          // Use real change24h from priceData if available, otherwise calculate from price history
          const change24h = priceData.change24h || 
                           (priceData.changePercent24h ? (priceData.changePercent24h / 100) * priceData.close : 0);
          const changePercent24h = priceData.changePercent24h || 
                                  (priceData.change24h ? (priceData.change24h / priceData.close) * 100 : 0);
          
          updatedTickers.push({
            symbol: sym,
            price: priceData.close,
            change24h,
            changePercent24h,
            volume24h: (priceData as any).volume || (priceData as any).volume24h || 0,
            isConnected: true
          });
          
        } catch (error) {
          if (import.meta.env.DEV) logger.error(`Failed to update ticker for ${sym}:`, {}, error);
          updatedTickers.push({
            symbol: sym,
            price: 0,
            change24h: 0,
            changePercent24h: 0,
            volume24h: 0,
            isConnected: false
          });
        }
      }
      
      setMarketTickers(updatedTickers);
      
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Error updating market tickers:', {}, error);
    }
  };

  const startRealTimeUpdates = useCallback(async () => {
    try {
      await marketDataService.subscribeToRealTime([symbol], handleNewMarketData);
      setConnectionStatus('connected');
      addAlert('info', `Started live updates for ${symbol}`);
      
      const tickerInterval = setInterval(updateMarketTickers, 30000);
      
      return () => {
        clearInterval(tickerInterval);
      };
      
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Failed to start real-time updates:', {}, error);
      setConnectionStatus('disconnected');
      addAlert('error', 'Failed to start live updates');
    }
  }, [symbol]);

  const stopRealTimeUpdates = () => {
    marketDataService.disconnect();
    setConnectionStatus('disconnected');
  };

  const handleNewMarketData = async (newData: MarketData) => {
    try {
      setMarketData(prev => {
        const updated = [...prev, newData];
        return updated.slice(-200);
      });

      setMarketTickers(prev => (prev || []).map(ticker => 
        ticker.symbol === newData.symbol 
          ? { 
              ...ticker, 
              price: newData.close,
              isConnected: true 
            }
          : ticker
      ));

      const updatedData = [...marketData, newData].slice(-50);
      const decision = await aiService.predict(updatedData);
      setCurrentDecision(decision);

      const performance = await aiService.getModelPerformance();
      setModelPerformance(performance);

    } catch (error) {
      if (import.meta.env.DEV) logger.error('Error processing new market data:', {}, error);
    }
  };

  const startTraining = async () => {
    if (marketData.length < 50) {
      addAlert('warning', 'Insufficient data for training (minimum 50 candles required)');
      return;
    }

    setIsTraining(true);
    addAlert('info', 'Starting AI model training...');
    
    try {
      const metrics = await aiService.trainModel(marketData);
      setTrainingMetrics(prev => [...prev, metrics]);
      
      const decision = await aiService.predict(marketData.slice(-50));
      setCurrentDecision(decision);
      
      const performance = await aiService.getModelPerformance();
      setModelPerformance(performance);
      
      addAlert('success', `Training completed - Accuracy: ${(metrics.directionalAccuracy * 100).toFixed(1)}%`);
      
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Training error:', {}, error);
      addAlert('error', 'Training failed - please try again');
    } finally {
      setIsTraining(false);
    }
  };

  const toggleLiveUpdates = () => {
    setIsLive(!isLive);
  };

  const addAlert = (type: AlertItem['type'], message: string) => {
    // Generate unique ID using timestamp and a counter
    const alert: AlertItem = {
      id: `alert_${Date.now()}_${alerts.length}`,
      type,
      message,
      timestamp: new Date()
    };
    
    setAlerts(prev => [alert, ...prev.slice(0, 9)]);
    
    if (type !== 'error') {
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
      }, 5000);
    }
  };

  const cleanup = () => {
    stopRealTimeUpdates();
  };

  const formatPrice = (price: number): string => {
    return price < 1 ? price.toFixed(6) : price.toFixed(2);
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatChange = (change: number): string => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LONG': return 'text-green-600 bg-green-50 border-green-200';
      case 'SHORT': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const currentPrice = marketData[marketData.length - 1]?.close || 0;
  const previousPrice = marketData[marketData.length - 2]?.close || currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice > 0 ? priceChange / previousPrice : 0;
  const latestMetrics = trainingMetrics[trainingMetrics.length - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              BOLT AI Trading Dashboard
            </h1>
            <p className="text-gray-600">
              Advanced Neural Network Cryptocurrency Analysis System
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {connectionStatus === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symbol
            </label>
            <select
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(symbols || []).map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(timeframes || []).map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={toggleLiveUpdates}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isLive 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isLive ? <Pause size={16} /> : <Play size={16} />}
              {isLive ? 'Stop Live' : 'Start Live'}
            </button>
            
            <button
              type="button"
              onClick={startTraining}
              disabled={isTraining || marketData.length < 50}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Brain size={16} />
              {isTraining ? 'Training...' : 'Train AI'}
            </button>
          </div>
        </div>
      </div>

      {/* Market Tickers */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Market Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(marketTickers || []).map(ticker => (
              <div 
                key={ticker.symbol}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  symbol === ticker.symbol 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${!ticker.isConnected ? 'opacity-50' : ''}`}
                onClick={() => onSymbolChange(ticker.symbol)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 text-sm">
                    {ticker.symbol.replace('USDT', '')}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    ticker.isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>
                <div className="text-lg font-bold text-gray-800 mb-1">
                  ${formatPrice(ticker.price)}
                </div>
                <div className={`text-sm font-medium ${
                  ticker.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatChange(ticker.changePercent24h)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Current Price */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Price</p>
              <p className="text-2xl font-bold text-gray-900">
                ${formatPrice(currentPrice)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
          <div className={`flex items-center mt-2 text-sm ${
            priceChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {priceChange >= 0 ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)} ({formatPercent(priceChangePercent)})
          </div>
        </div>

        {/* AI Decision */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI Decision</p>
              <p className={`text-xl font-bold px-3 py-1 rounded-full border inline-block ${
                getActionColor(currentDecision?.action || 'FLAT')
              }`}>
                {currentDecision?.action || 'ANALYZING'}
              </p>
            </div>
            <Brain className="h-8 w-8 text-purple-600" />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Confidence: {formatPercent(currentDecision?.confidence || 0)}
          </div>
        </div>

        {/* Bull Probability */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bull Probability</p>
              <p className="text-2xl font-bold text-green-600">
                {formatPercent(currentDecision?.bullProbability || 0)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentDecision?.bullProbability || 0) * 100}%` }}
            />
          </div>
        </div>

        {/* Bear Probability */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bear Probability</p>
              <p className="text-2xl font-bold text-red-600">
                {formatPercent(currentDecision?.bearProbability || 0)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentDecision?.bearProbability || 0) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* AI Analysis and Training Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* AI Decision Analysis */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Decision Analysis
            </h3>
          </div>
          <div className="p-6">
            {currentDecision ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercent(currentDecision.bullProbability)}
                    </div>
                    <div className="text-sm text-gray-600">Bull</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {formatPercent(currentDecision.bearProbability)}
                    </div>
                    <div className="text-sm text-gray-600">Bear</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {formatPercent(currentDecision.neutralProbability)}
                    </div>
                    <div className="text-sm text-gray-600">Neutral</div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Risk Gate</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      currentDecision.riskGate 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {currentDecision.riskGate ? 'PASS' : 'BLOCK'}
                    </span>
                  </div>
                  
                  {currentDecision.uncertainty !== undefined && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Uncertainty</span>
                      <span className="text-sm text-gray-600">
                        {(currentDecision.uncertainty * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  
                  {currentDecision.reasoning && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Analysis:</div>
                      {(currentDecision.reasoning || []).map((reason, index) => (
                        <div key={index} className="text-sm text-gray-600 mb-1">
                          • {reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Waiting for AI analysis...</p>
              </div>
            )}
          </div>
        </div>

        {/* Training Metrics */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Training Metrics
            </h3>
          </div>
          <div className="p-6">
            {latestMetrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Epoch</div>
                    <div className="text-xl font-bold text-gray-900">
                      {latestMetrics.epoch}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Learning Rate</div>
                    <div className="text-xl font-bold text-gray-900">
                      {latestMetrics.learningRate.toFixed(6)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">MSE</div>
                    <div className="text-xl font-bold text-blue-600">
                      {latestMetrics.mse.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">R²</div>
                    <div className="text-xl font-bold text-green-600">
                      {(latestMetrics as any).rSquared?.toFixed(3) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Accuracy</div>
                    <div className="text-xl font-bold text-purple-600">
                      {formatPercent(latestMetrics.directionalAccuracy)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Resets</div>
                    <div className="text-xl font-bold text-orange-600">
                      {latestMetrics.resetEvents}
                    </div>
                  </div>
                </div>

                {modelPerformance && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Model Performance</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Exploration Rate:</span>
                        <span className="font-medium">{((modelPerformance?.explorationRate || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Buffer Size:</span>
                        <span className="font-medium">{modelPerformance.experienceBufferSize.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No training data available</p>
                <button
                  type="button"
                  onClick={startTraining}
                  disabled={marketData.length < 50}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Training
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      {(alerts?.length || 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              System Alerts
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {alerts.slice(0, 5).map(alert => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{alert.message}</span>
                    <span className="text-xs opacity-75">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Disclaimer:</strong> This system is for educational and research purposes only. 
            The AI predictions are experimental and should not be considered as financial advice. 
            Cryptocurrency trading involves substantial risk of loss. Always conduct your own research 
            and consult with financial advisors before making investment decisions.
          </div>
        </div>
      </div>
    </div>
  );
};