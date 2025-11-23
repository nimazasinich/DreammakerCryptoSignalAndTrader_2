import React, { useState, useEffect } from 'react';
import {
  ScoringSnapshot, ConfluenceInfo, EntryPlan, Direction, Action
} from '../types/index';
import { showToast } from '../components/ui/Toast';
import { useConfirmModal } from '../components/ui/ConfirmModal';
import { Logger } from '../core/Logger';

const logger = Logger.getInstance();

export const EnhancedTradingView: React.FC = () => {
  const { confirm, ModalComponent } = useConfirmModal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState<'spot' | 'futures'>('futures');
  const [strategyEnabled, setStrategyEnabled] = useState(false);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframes] = useState(['15m', '1h', '4h']);
  const [leverage, setLeverage] = useState(5);
  const [positionSize, setPositionSize] = useState('100');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [snapshot, setSnapshot] = useState<ScoringSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [trailingEnabled, setTrailingEnabled] = useState(true);
  const [ladderEnabled, setLadderEnabled] = useState(true);

  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

  useEffect(() => {
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  const fetchSnapshot = async () => {
    try {
      const tfsParam = (timeframes || []).map(tf => `tfs=${tf}`).join('&');
      const response = await fetch(`/api/scoring/snapshot?symbol=${symbol}&${tfsParam}`, { mode: "cors", headers: { "Content-Type": "application/json" } });
      const data = await response.json();
      if (data.success && data.snapshot) {
        setSnapshot(data.snapshot);
      } else {
        // Set empty snapshot to show UI
        setSnapshot({
          symbol,
          timestamp: Date.now(),
          results: [],
          final_score: 0,
          direction: 'NEUTRAL' as Direction,
          action: 'HOLD' as Action,
          rationale: '',
          confluence: {} as ConfluenceInfo,
          entryPlan: {} as EntryPlan
        });
      }
    } catch (error) {
      logger.error('Failed to fetch snapshot:', {}, error as Error);
      // Set empty snapshot to show UI
      setSnapshot({
        symbol,
        timestamp: Date.now(),
        results: [],
        final_score: 0,
        direction: 'NEUTRAL' as Direction,
        action: 'HOLD' as Action,
        rationale: '',
        confluence: {} as ConfluenceInfo,
        entryPlan: {} as EntryPlan
      });
    }
  };

  const handlePlaceOrder = async () => {
    if (!snapshot || !strategyEnabled) {
      showToast('warning', 'Strategy Disabled', 'Enable strategy to execute trades.');
      return;
    }

    if (snapshot.action === 'HOLD') {
      showToast('info', 'Hold Signal', 'Current signal is HOLD. No order placed.');
      return;
    }

    setLoading(true);

    try {
      // Place real order using backend API
      const backendPort = import.meta.env.VITE_BACKEND_PORT || '3001';
      const response = await fetch(`http://localhost:${backendPort}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol,
          side: snapshot.action,
          type: 'MARKET',
          qty: parseFloat(positionSize),
          leverage: leverage,
          stopLoss: snapshot.entryPlan?.sl,
          takeProfit: snapshot.entryPlan?.tp
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success || response.ok) {
        showToast('success', 'Order Placed', `${snapshot.action} ${positionSize} ${symbol} at ${leverage}x leverage`);
      } else {
        logger.error('Failed to place order', { error: result.error });
      }
    } catch (error: any) {
      showToast('error', 'Order Failed', error.message || 'Unknown error');
      logger.error('Order placement error:', {}, error);
    } finally {
      setLoading(false);
    }
  };

  const getDirectionColor = (dir: Direction) => {
    if (dir === 'BULLISH') return 'text-green-600';
    if (dir === 'BEARISH') return 'text-red-600';
    return 'text-gray-600';
  };

  const getActionColor = (action: Action) => {
    if (action === 'BUY') return 'bg-green-500 text-white';
    if (action === 'SELL') return 'bg-red-500 text-white';
    return 'bg-gray-400 text-white';
  };

  const renderSignalInsight = () => {
    if (!snapshot) {
      return (
        <div className="text-center py-8 text-gray-500">
          Loading signal insight...
        </div>
      );
    }

    const { direction, final_score, action, rationale, confluence, entryPlan, context } = snapshot;

    return (
      <div className="space-y-4">
        {/* Main Signal */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Direction</p>
            <p className={`text-2xl font-bold ${getDirectionColor(direction)}`}>
              {direction}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Action</p>
            <span className={`px-4 py-2 rounded-lg text-lg font-bold ${getActionColor(action)}`}>
              {action}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Score</p>
            <p className="text-2xl font-bold text-purple-600">
              {(final_score * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Confluence */}
        {confluence && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Confluence Analysis</p>
              <span className={`px-3 py-1 rounded text-xs font-semibold ${confluence.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {confluence.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-gray-500">Agreement</p>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${confluence.agreement * 100}%` }}
                  />
                </div>
                <p className="text-xs font-semibold mt-1">{(confluence.agreement * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">AI</p>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${confluence.ai * 100}%` }}
                  />
                </div>
                <p className="text-xs font-semibold mt-1">{(confluence.ai * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tech</p>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-indigo-500"
                    style={{ width: `${confluence.tech * 100}%` }}
                  />
                </div>
                <p className="text-xs font-semibold mt-1">{(confluence.tech * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Context</p>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-teal-500"
                    style={{ width: `${confluence.context * 100}%` }}
                  />
                </div>
                <p className="text-xs font-semibold mt-1">{(confluence.context * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Entry Plan Preview */}
        {entryPlan && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Entry Plan Preview</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Mode</p>
                <p className="font-semibold">{entryPlan.mode}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stop Loss</p>
                <p className="font-semibold text-red-600">${entryPlan.sl.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Leverage</p>
                <p className="font-semibold text-purple-600">{entryPlan.leverage}x</p>
              </div>
              <div className="col-span-3">
                <p className="text-xs text-gray-500">Take Profit Levels</p>
                <div className="flex gap-2 mt-1">
                  {(entryPlan.tp || []).map((tp, idx) => (
                    <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                      TP{idx + 1}: ${tp.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rationale */}
        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Rationale</p>
          <p className="text-sm text-gray-600">{rationale}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <ModalComponent />
      <div className="min-h-screen bg-surface p-6">
        <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Trading</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('spot')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'spot'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Spot
          </button>
          <button
            onClick={() => setActiveTab('futures')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'futures'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Futures
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Signal Insight Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Signal Insight</h2>
              {renderSignalInsight()}
            </div>
          </div>

          {/* Trading Controls */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-4">
              <h2 className="text-xl font-bold text-gray-800">Controls</h2>

              {/* Strategy Toggle */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="font-semibold text-gray-700">Strategy Execution</span>
                <button
                  onClick={() => setStrategyEnabled(!strategyEnabled)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    strategyEnabled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {strategyEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Symbol */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {(symbols || []).map(sym => (
                    <option key={sym} value={sym}>{sym}</option>
                  ))}
                </select>
              </div>

              {/* Leverage */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Leverage: {leverage}x
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Position Size */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Position Size (USDT)</label>
                <input
                  type="number"
                  value={positionSize}
                  onChange={(e) => setPositionSize(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="100"
                />
              </div>

              {/* Order Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                  <option value="stop">Stop</option>
                </select>
              </div>

              {/* Trailing & Ladder Toggles */}
              <div className="flex gap-2">
                <button
                  onClick={() => setTrailingEnabled(!trailingEnabled)}
                  className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                    trailingEnabled
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  Trailing {trailingEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setLadderEnabled(!ladderEnabled)}
                  className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                    ladderEnabled
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  Ladder {ladderEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={loading || !strategyEnabled}
                className={`w-full px-6 py-3 rounded-lg font-bold text-white transition-all ${
                  loading || !strategyEnabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg'
                }`}
              >
                {loading ? 'Placing...' : strategyEnabled ? 'Place Order' : 'Strategy Disabled'}
              </button>

              {!strategyEnabled && (
                <p className="text-xs text-gray-500 text-center">
                  Strategy is OFF. Signals visible but no orders will be executed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
