import React, { useState, useEffect } from 'react';
import { KuCoinFuturesService } from '../services/KuCoinFuturesService.js';
import { Logger } from '../core/Logger.js';
import { showToast } from '../components/ui/Toast';
import { useConfirmModal } from '../components/ui/ConfirmModal';

const logger = Logger.getInstance();

export const FuturesTradingView: React.FC = () => {
  const futuresService = KuCoinFuturesService.getInstance();
  const { confirm, ModalComponent } = useConfirmModal();

  // Trading mode state
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tradingMode, setTradingMode] = useState<'signals-only' | 'auto-trade'>('signals-only');

  // Signal-based states
  const [snapshot, setSnapshot] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState(0);

  // Manual trading states
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [orderbook, setOrderbook] = useState<any>(null);
  const [entryPlan, setEntryPlan] = useState<any>(null);
  const [entryPlanLoading, setEntryPlanLoading] = useState(false);

  // Order form states
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [leverage, setLeverage] = useState(5);
  const [orderSize, setOrderSize] = useState('0.1');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [orderPrice, setOrderPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

  const symbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT'
  ];

  useEffect(() => {
    let alive = true;
    const tick = () => alive && loadData();
    const snapshotTick = () => alive && loadSnapshot();
    const planTick = () => alive && loadEntryPlan();

    tick();
    snapshotTick();
    planTick();

    const interval = setInterval(tick, 5000);
    const snapshotInterval = setInterval(snapshotTick, 15000);
    const planInterval = setInterval(planTick, 15000);

    return () => {
      alive = false;
      clearInterval(interval);
      clearInterval(snapshotInterval);
      clearInterval(planInterval);
    };
  }, [selectedSymbol]);

  const loadData = async () => {
    try {
      const backendPort = import.meta.env.VITE_BACKEND_PORT || '3001';
      const baseUrl = `http://localhost:${backendPort}/api`;
      // Load positions, orders, balance, orderbook in parallel
      const [posRes, ordersRes, balanceRes, orderbookRes] = await Promise.all([
        fetch(`${baseUrl}/futures/positions`, { mode: "cors", headers: { "Content-Type": "application/json" } }).catch(() => ({ json: async () => ({ positions: [] }) })),
        fetch(`${baseUrl}/futures/orders`, { mode: "cors", headers: { "Content-Type": "application/json" } }).catch(() => ({ json: async () => ({ orders: [] }) })),
        fetch(`${baseUrl}/futures/balance`, { mode: "cors", headers: { "Content-Type": "application/json" } }).catch(() => ({ json: async () => ({ balance: null }) })),
        fetch(`${baseUrl}/futures/orderbook?symbol=${selectedSymbol}`, { mode: "cors", headers: { "Content-Type": "application/json" } }).catch(() => ({ json: async () => ({ orderbook: null }) }))
      ]);

      const posData = await posRes.json();
      const ordersData = await ordersRes.json();
      const balanceData = await balanceRes.json();
      const orderbookData = await orderbookRes.json();

      setPositions(posData.positions || []);
      setOrders(ordersData.orders || []);
      setBalance(balanceData.balance);
      setOrderbook(orderbookData.orderbook);
    } catch (error) {
      logger.error('Failed to load trading data', {}, error as Error);
    }
  };

  const loadSnapshot = async () => {
    try {
      const response = await fetch(
        `http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/scoring/snapshot?symbol=${selectedSymbol}&tfs=15m&tfs=1h&tfs=4h`
      , { mode: "cors", headers: { "Content-Type": "application/json" } });
      const data = await response.json();
      if (data.success && data.snapshot) {
        setSnapshot(data.snapshot);

        // Fetch real current price from market data API
        try {
          const backendPort = import.meta.env.VITE_BACKEND_PORT || '3001';
          const normalizedSymbol = selectedSymbol.replace('USDT', '');
          const priceResponse = await fetch(
            `http://localhost:${backendPort}/api/market-data/${normalizedSymbol}`
          , { mode: "cors", headers: { "Content-Type": "application/json" } });
          const priceData = await priceResponse.json();
          if (priceData.success && priceData.data?.price) {
            setCurrentPrice(priceData.data.price);
          } else {
            // Fallback to snapshot price if available
            setCurrentPrice(data.snapshot.currentPrice || 0);
          }
        } catch (priceError) {
          logger.warn('Failed to fetch real price, using snapshot data', {}, priceError as Error);
          setCurrentPrice(data.snapshot.currentPrice || 0);
        }

        // Auto-trade logic
        if (tradingMode === 'auto-trade' && data.snapshot.action !== 'HOLD' && data.snapshot.entryPlan) {
          handleAutoTrade(data.snapshot);
        }
      }
    } catch (error) {
      logger.error('Failed to load snapshot', {}, error as Error);
    }
  };

  const loadEntryPlan = async () => {
    setEntryPlanLoading(true);
    try {
      const backendPort = import.meta.env.VITE_BACKEND_PORT || '3001';
      const url = `http://localhost:${backendPort}/api/scoring/snapshot?symbol=${selectedSymbol}&tfs=15m&tfs=1h&tfs=4h`;
      const response = await fetch(url, { mode: "cors", headers: { "Content-Type": "application/json" } });
      const data = await response.json();
      const snap = data?.snapshot ?? data;
      setEntryPlan(snap?.entryPlan ? snap : null);
    } catch (error) {
      logger.error('Failed to load entry plan', {}, error as Error);
    } finally {
      setEntryPlanLoading(false);
    }
  };

  const handleAutoTrade = async (snap: any) => {
    if (!snap.entryPlan || snap.action === 'HOLD') return;

    try {
      await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: snap.action,
          type: 'MARKET',
          qty: parseFloat(orderSize),
          sl: snap.entryPlan.sl,
          tp: snap.entryPlan.tp,
          leverage: snap.entryPlan.leverage || leverage
        }),
        credentials: 'include'
      });
      logger.info('Auto-trade order placed', { action: snap.action });
    } catch (error) {
      logger.error('Auto-trade failed', {}, error as Error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!orderSize) { logger.warn("Missing order size"); }
    setLoading(true);
    try {
      await fetch(`${API_BASE}/futures/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: orderSide,
          type: orderType,
          size: parseFloat(orderSize),
          price: orderType === 'limit' ? parseFloat(orderPrice) : undefined,
          stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
          takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
          leverage
        }),
        credentials: 'include'
      });
      showToast('success', 'Order Placed', 'Your futures order has been placed successfully!');
      loadData();
    } catch (error: any) {
      showToast('error', 'Order Failed', error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSuggestedOrder = async () => {
    if (!snapshot || !snapshot.entryPlan) {
      showToast('warning', 'No Entry Plan', 'Entry plan is not available for this symbol');
      return;
    }

    const confirmed = await confirm(
      'Place Suggested Order',
      `Place ${snapshot.action} order for ${selectedSymbol}?`,
      'info'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: snapshot.action,
          type: 'MARKET',
          qty: parseFloat(orderSize),
          sl: snapshot.entryPlan.sl,
          tp: snapshot.entryPlan.tp,
          leverage: snapshot.entryPlan.leverage || leverage
        }),
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Order Placed', 'Suggested order has been placed successfully!');
        setOrderSize('0.1');
        loadData();
      } else {
        showToast('error', 'Order Failed', data.error || 'Failed to place suggested order');
      }
    } catch (error: any) {
      showToast('error', 'Order Failed', error.message || 'Failed to place suggested order');
    }
    setLoading(false);
  };

  const handleSetLeverage = async () => {
    try {
      await fetch(`${API_BASE}/futures/leverage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol, leverage })
      });
      showToast('success', 'Leverage Updated', `Leverage set to ${leverage}x successfully!`);
    } catch (error: any) {
      showToast('error', 'Leverage Update Failed', error.message || 'Failed to set leverage');
    }
  };

  const handleClosePosition = async (symbol: string) => {
    const confirmed = await confirm(
      'Close Position',
      `Are you sure you want to close your position for ${symbol}?`,
      'danger'
    );
    if (!confirmed) return;

    try {
      await fetch(`${API_BASE}/futures/positions/${symbol}`, { method: 'DELETE' });
      showToast('success', 'Position Closed', `Position for ${symbol} has been closed successfully!`);
      loadData();
    } catch (error: any) {
      showToast('error', 'Failed to Close', error.message || 'Failed to close position');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await fetch(`${API_BASE}/futures/orders/${orderId}`, { method: 'DELETE' });
      showToast('success', 'Order Cancelled', 'Order has been cancelled successfully');
      loadData();
    } catch (error: any) {
      showToast('error', 'Cancellation Failed', error.message || 'Failed to cancel order');
    }
  };

  const getActionColor = (action: string) => {
    if (action === 'BUY') return 'text-green-600 bg-green-50';
    if (action === 'SELL') return 'text-red-600 bg-red-50';
    return 'text-[color:var(--text-secondary)] bg-[color:var(--surface-muted)]';
  };

  const getActionBgColor = (action: string) => {
    if (action === 'BUY') return 'bg-green-500 hover:bg-green-600';
    if (action === 'SELL') return 'bg-red-500 hover:bg-red-600';
    return 'bg-gray-500 hover:bg-gray-600';
  };

  return (
    <>
      <ModalComponent />
      <div className="min-h-screen bg-[color:var(--surface-page)] p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-6">Futures Trading</h1>

        {/* Balance Display */}
        {balance && (
          <div className="card-base rounded-2xl p-4 mb-6">
            <div className="flex gap-6 text-sm">
              <div className="text-[color:var(--text-secondary)]">Balance: <span className="font-bold text-[color:var(--text-primary)]">${balance.availableBalance?.toFixed(2)}</span></div>
              <div className="text-[color:var(--text-secondary)]">Equity: <span className="font-bold text-[color:var(--text-primary)]">${balance.accountEquity?.toFixed(2)}</span></div>
              <div className="text-[color:var(--text-secondary)]">PnL: <span className={`font-bold ${balance.unrealisedPNL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ${balance.unrealisedPNL?.toFixed(2)}
              </span></div>
            </div>
          </div>
        )}

        {/* Trading Mode Toggle */}
        <div className="card-base rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Trading Mode</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setTradingMode('signals-only')}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all ${
                tradingMode === 'signals-only'
                  ? 'bg-gradient-to-r from-[var(--primary-600)] to-[var(--info)] text-white shadow-lg'
                  : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--primary-50)] border border-[color:var(--border)]'
              }`}
            >
              <div className="text-lg">Signals Only (No Auto-Trading)</div>
              <div className="text-xs opacity-75 mt-1">View signals with manual placement option</div>
            </button>
            <button
              onClick={() => setTradingMode('auto-trade')}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all ${
                tradingMode === 'auto-trade'
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg'
                  : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-emerald-50 border border-[color:var(--border)]'
              }`}
            >
              <div className="text-lg">Auto-Trade</div>
              <div className="text-xs opacity-75 mt-1">Place orders automatically on qualified signals</div>
            </button>
          </div>

          {tradingMode === 'auto-trade' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Warning:</strong> Auto-trade mode is active. Orders will be placed automatically based on qualified signals.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Signal & Entry Plan */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Signal */}
            <div className="card-base rounded-2xl p-6">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Current Signal</h2>

              {snapshot ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-[color:var(--text-secondary)] mb-1">Action</div>
                      <div className={`text-2xl font-bold px-4 py-2 rounded-xl ${getActionColor(snapshot.action)}`}>
                        {snapshot.action}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-[color:var(--text-secondary)] mb-1">Final Score</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {(snapshot.final_score * 100).toFixed(1)}%
                      </div>
                    </div>
                    {snapshot.confluence && (
                      <div className="text-center">
                        <div className="text-sm text-[color:var(--text-secondary)] mb-1">Confluence</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {(snapshot.confluence.score * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-[color:var(--surface-muted)] rounded-xl">
                    <div className="text-sm text-[color:var(--text-secondary)]">
                      <strong>Rationale:</strong> {snapshot.rationale}
                    </div>
                  </div>

                  {/* Entry Plan */}
                  {snapshot.entryPlan && snapshot.action !== 'HOLD' && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <h3 className="text-lg font-bold text-blue-800 mb-3">Entry Plan</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-[color:var(--text-secondary)]">Mode:</span>
                          <span className="font-semibold text-[color:var(--text-primary)] ml-2">{snapshot.entryPlan.mode}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-secondary)]">Leverage:</span>
                          <span className="font-semibold text-purple-600 ml-2">{snapshot.entryPlan.leverage || leverage}x</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-secondary)]">Stop Loss:</span>
                          <span className="font-semibold text-red-600 ml-2">${snapshot.entryPlan.sl.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-secondary)]">Take Profit:</span>
                          <div className="flex gap-1 mt-1">
                            {(snapshot.entryPlan.tp || []).map((tp: number, i: number) => (
                              <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                ${tp.toFixed(0)}
                              </span>
                            ))}
                          </div>
                        </div>
                        {snapshot.entryPlan.ladder && (
                          <div className="col-span-2">
                            <span className="text-[color:var(--text-secondary)]">Ladder:</span>
                            <div className="flex gap-2 mt-1">
                              {(snapshot.entryPlan.ladder || []).map((l: number, i: number) => (
                                <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                  {(l * 100).toFixed(0)}%
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {tradingMode === 'signals-only' && (
                        <button
                          onClick={handlePlaceSuggestedOrder}
                          disabled={loading}
                          className={`w-full mt-4 px-6 py-3 rounded-xl text-white font-bold transition-all ${getActionBgColor(snapshot.action)} disabled:opacity-50`}
                        >
                          {loading ? 'Placing...' : `Place Suggested Order (${snapshot.action})`}
                        </button>
                      )}
                    </div>
                  )}

                  {snapshot.action === 'HOLD' && (
                    <div className="p-4 bg-[color:var(--surface-muted)] rounded-xl text-center">
                      <p className="text-[color:var(--text-secondary)]">No trading opportunities at the moment. Wait for a qualified signal.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Loading signal...</p>
                </div>
              )}
            </div>

            {/* Multi-Timeframe Analysis */}
            {snapshot && snapshot.results && (
              <div className="card-base rounded-2xl p-6" style={{ borderRadius: '14px' }}>
                <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Multi-Timeframe Analysis</h2>
                <div className="space-y-3">
                  {(snapshot.results || []).map((result: any, idx: number) => (
                    <div key={idx} className="p-3 bg-[color:var(--surface-muted)] rounded-xl flex items-center justify-between" style={{ borderRadius: '10px' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[color:var(--text-secondary)]">{result.tf}</span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          result.direction === 'BULLISH' ? 'bg-green-100 text-green-700' :
                          result.direction === 'BEARISH' ? 'bg-red-100 text-red-700' :
                          'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)]'
                        }`}>
                          {result.direction}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-purple-600">
                          {(result.final_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Trading Panel */}
            <div className="card-base rounded-2xl p-6" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Manual Trading</h2>

              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setOrderSide('buy')}
                    className={`flex-1 py-2 rounded-xl ${orderSide === 'buy' ? 'bg-emerald-500 text-white' : 'bg-[color:var(--surface)] border border-[color:var(--border)]'}`}
                    style={{ borderRadius: '12px' }}
                  >
                    Buy / Long
                  </button>
                  <button
                    onClick={() => setOrderSide('sell')}
                    className={`flex-1 py-2 rounded-xl ${orderSide === 'sell' ? 'bg-rose-500 text-white' : 'bg-[color:var(--surface)] border border-[color:var(--border)]'}`}
                    style={{ borderRadius: '12px' }}
                  >
                    Sell / Short
                  </button>
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setOrderType('market')}
                    className={`flex-1 py-2 rounded-xl ${orderType === 'market' ? 'bg-purple-600 text-white' : 'bg-[color:var(--surface)] border border-[color:var(--border)]'}`}
                    style={{ borderRadius: '12px' }}
                  >
                    Market
                  </button>
                  <button
                    onClick={() => setOrderType('limit')}
                    className={`flex-1 py-2 rounded-xl ${orderType === 'limit' ? 'bg-purple-600 text-white' : 'bg-[color:var(--surface)] border border-[color:var(--border)]'}`}
                    style={{ borderRadius: '12px' }}
                  >
                    Limit
                  </button>
                </div>

                {orderType === 'limit' && (
                  <div>
                    <label className="block text-sm mb-2">Price</label>
                    <input
                      type="number"
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[color:var(--surface)] rounded-xl px-3 py-2 border border-[color:var(--border)]"
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm mb-2">Size (Contracts)</label>
                  <input
                    type="number"
                    value={orderSize}
                    onChange={(e) => setOrderSize(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[color:var(--surface)] rounded-xl px-3 py-2 border border-[color:var(--border)]"
                    style={{ borderRadius: '10px' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-2">Stop Loss</label>
                    <input
                      type="number"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      placeholder="Optional"
                      className="w-full bg-[color:var(--surface)] rounded-xl px-3 py-2 border border-[color:var(--border)]"
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Take Profit</label>
                    <input
                      type="number"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      placeholder="Optional"
                      className="w-full bg-[color:var(--surface)] rounded-xl px-3 py-2 border border-[color:var(--border)]"
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={loading || !orderSize}
                  className={`w-full py-3 rounded-xl font-bold text-white ${
                    orderSide === 'buy'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={{ borderRadius: '12px' }}
                >
                  {loading ? 'Processing...' : `${orderSide === 'buy' ? 'BUY' : 'SELL'} ${selectedSymbol}`}
                </button>
              </div>
            </div>

            {/* Open Positions */}
            <div className="card-base rounded-2xl p-6" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Open Positions</h2>
              {positions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No open positions</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-[color:var(--border)]">
                        <th className="pb-2">Symbol</th>
                        <th className="pb-2">Side</th>
                        <th className="pb-2">Size</th>
                        <th className="pb-2">Entry</th>
                        <th className="pb-2">Mark</th>
                        <th className="pb-2">PnL</th>
                        <th className="pb-2">Liq</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(positions || []).map((pos, i) => (
                        <tr key={i} className="border-b border-[color:var(--border)]">
                          <td className="py-3 font-bold">{pos.symbol}</td>
                          <td>
                            <span className={`px-2 py-1 rounded-lg text-xs text-white ${
                              pos.side === 'long' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}>
                              {pos.side === 'long' ? 'LONG' : 'SHORT'}
                            </span>
                          </td>
                          <td>{pos.size}</td>
                          <td>${pos.entryPrice?.toFixed(2)}</td>
                          <td>${pos.markPrice?.toFixed(2)}</td>
                          <td className={pos.unrealizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            ${pos.unrealizedPnl?.toFixed(2)}
                          </td>
                          <td className="text-orange-500">${pos.liquidationPrice?.toFixed(2)}</td>
                          <td>
                            <button
                              onClick={() => handleClosePosition(pos.symbol)}
                              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Open Orders */}
            <div className="card-base rounded-2xl p-6" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Open Orders</h2>
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No open orders</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-[color:var(--border)]">
                        <th className="pb-2">Symbol</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Side</th>
                        <th className="pb-2">Price</th>
                        <th className="pb-2">Size</th>
                        <th className="pb-2">Filled</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(orders || []).map((order, i) => (
                        <tr key={i} className="border-b border-[color:var(--border)]">
                          <td className="py-3">{order.symbol}</td>
                          <td className="uppercase">{order.type}</td>
                          <td>
                            <span className={order.side === 'buy' ? 'text-emerald-600' : 'text-rose-600'}>
                              {order.side === 'buy' ? 'BUY' : 'SELL'}
                            </span>
                          </td>
                          <td>${order.price}</td>
                          <td>{order.size}</td>
                          <td>{order.filledSize || 0}</td>
                          <td>
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-3 py-1 bg-[color:var(--primary-50)] rounded-lg text-xs hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Controls */}
          <div className="space-y-6">
            {/* Symbol & Settings */}
            <div className="card-base rounded-2xl p-6" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-2">Symbol</label>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="w-full px-4 py-2 bg-[color:var(--surface-muted)] border border-[color:var(--border)] rounded-xl text-[color:var(--text-primary)] font-semibold"
                    style={{ borderRadius: '10px' }}
                  >
                    {(symbols || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-2">Current Price</label>
                  <div className="px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                    <span className="text-2xl font-bold text-purple-600">${currentPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-2">
                    Leverage: {leverage}x
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={leverage}
                      onChange={(e) => setLeverage(parseInt(e.target.value))}
                      className="flex-1 px-4 py-2 bg-[color:var(--surface-muted)] border border-[color:var(--border)] rounded-xl"
                      style={{ borderRadius: '10px' }}
                      min="1"
                      max="100"
                    />
                    <button
                      onClick={handleSetLeverage}
                      className="px-4 bg-purple-600 rounded-xl hover:bg-purple-700 text-white"
                      style={{ borderRadius: '10px' }}
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Orderbook */}
            <div className="card-base rounded-2xl p-6" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Orderbook</h2>
              {orderbook ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    {orderbook.asks?.slice(0, 10).reverse().map((ask: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-rose-500">${parseFloat(ask[0]).toFixed(2)}</span>
                        <span className="text-gray-500">{ask[1]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[color:var(--border)] pt-2"></div>
                  <div className="space-y-1">
                    {orderbook.bids?.slice(0, 10).map((bid: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-emerald-500">${parseFloat(bid[0]).toFixed(2)}</span>
                        <span className="text-gray-500">{bid[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Loading...</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="card-base rounded-2xl p-6" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Quick Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-[color:var(--surface-muted)] rounded-xl" style={{ borderRadius: '10px' }}>
                  <span className="text-sm text-[color:var(--text-secondary)]">Mode</span>
                  <span className={`text-sm font-semibold ${tradingMode === 'auto-trade' ? 'text-green-600' : 'text-purple-600'}`}>
                    {tradingMode === 'auto-trade' ? 'Auto' : 'Manual'}
                  </span>
                </div>
                {snapshot && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-[color:var(--surface-muted)] rounded-xl" style={{ borderRadius: '10px' }}>
                      <span className="text-sm text-[color:var(--text-secondary)]">Last Update</span>
                      <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                        {new Date(snapshot.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[color:var(--surface-muted)] rounded-xl" style={{ borderRadius: '10px' }}>
                      <span className="text-sm text-[color:var(--text-secondary)]">Timeframes</span>
                      <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                        {snapshot.results ? snapshot.results.length : 0}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card-base rounded-2xl p-6" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => futuresService.cancelAllOrders()}
                  className="w-full py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600"
                  style={{ borderRadius: '12px' }}
                >
                  Cancel All Orders
                </button>
                <button
                  onClick={loadData}
                  className="w-full py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                  style={{ borderRadius: '12px' }}
                >
                  Refresh Data
                </button>
                <button
                  onClick={loadSnapshot}
                  disabled={loading}
                  className="w-full py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50"
                  style={{ borderRadius: '12px' }}
                >
                  Refresh Signal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};
