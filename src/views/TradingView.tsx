import React, { useState, useEffect } from 'react';
import { useTrading } from '../contexts/TradingContext';
import { useMode } from '../contexts/ModeContext';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Activity, X, Plus, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { Logger } from '../core/Logger';
import { showToast } from '../components/ui/Toast';
import { useConfirmModal } from '../components/ui/ConfirmModal';

interface OrderForm {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  size: number;
  price: number;
  leverage: number;
  stopLoss: number;
  takeProfit: number;
}

interface TradingViewProps {
  disabled?: boolean;
}

const TradingView: React.FC<TradingViewProps> = ({ disabled = false }) => {
  const modeContext = useMode();
  const tradingContext = useTrading();
  const { confirm, ModalComponent } = useConfirmModal();

  if (!modeContext || !tradingContext) {
    return <div>Loading...</div>;
  }

  const { state: { dataMode }, setDataMode } = modeContext;
  const { tradingMode, setMode, balance, positions, orders, placeOrder, closePosition, cancelOrder, refreshData, isLoading } = tradingContext;

  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [currentPrice, setCurrentPrice] = useState(50000);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'limit',
    size: 1,
    price: 50000,
    leverage: 10,
    stopLoss: 0,
    takeProfit: 0
  });
  const [entryPlan, setEntryPlan] = useState<any>(null);
  const [entryPlanLoading, setEntryPlanLoading] = useState(false);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

  useEffect(() => {
    let alive = true;
    const tick = () => alive && refreshData();
    const planTick = () => alive && loadEntryPlan();
    tick();
    planTick();
    const interval = setInterval(tick, 10000);
    const planInterval = setInterval(planTick, 15000);
    return () => {
      alive = false;
      clearInterval(interval);
      clearInterval(planInterval);
    };
  }, [selectedSymbol]);

  const handlePlaceOrder = async () => {
    try {
      await placeOrder(orderForm);
      showToast('success', 'Order Placed', 'Your order has been placed successfully!');
      await refreshData();
    } catch (error: any) {
      showToast('error', 'Order Failed', error.message || 'Failed to place order');
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
      await closePosition(symbol);
      showToast('success', 'Position Closed', `Position for ${symbol} has been closed successfully!`);
      await refreshData();
    } catch (error: any) {
      showToast('error', 'Failed to Close', error.message || 'Failed to close position');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
      showToast('success', 'Order Cancelled', 'Order has been cancelled successfully');
      await refreshData();
    } catch (error: any) {
      showToast('error', 'Cancellation Failed', error.message || 'Failed to cancel order');
    }
  };

  const loadEntryPlan = async () => {
    const logger = Logger.getInstance();
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

  return (
    <>
      <ModalComponent />
      <div className="min-h-screen bg-[color:var(--surface-page)] p-6" style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : {}}>
        {disabled && (
          <div className="max-w-[1800px] mx-auto mb-6 bg-red-100 border-2 border-red-500 rounded-xl p-6 text-center shadow-md">
            <h2 className="text-2xl font-bold text-red-900 mb-2">SPOT Trading Interface Disabled</h2>
            <p className="text-red-800 leading-relaxed">
              This interface is currently disabled because SPOT trading is not implemented.
              Please use the <strong>Leverage</strong> tab for real Futures trading functionality on KuCoin testnet.
            </p>
          </div>
        )}
        <div className="max-w-[1800px] mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-600)] p-3 rounded-xl shadow-md">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[color:var(--text-primary)]">Advanced Trading</h1>
              <p className="text-[color:var(--text-secondary)]">Professional Trading Interface</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="card hover:shadow-md text-[color:var(--text-primary)] p-3 rounded-lg transition-all"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 card rounded-xl p-2">
                <span className="text-xs text-[color:var(--text-secondary)] px-2">Data:</span>
                <button
                  onClick={() => setDataMode('offline')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    dataMode === 'offline'
                      ? 'bg-[color:var(--primary-500)] text-white shadow-md'
                      : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--primary-50)]'
                  }`}
                >
                  Offline
                </button>
                <button
                  onClick={() => setDataMode('online')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    dataMode === 'online'
                      ? 'bg-[color:var(--info)] text-white shadow-md'
                      : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--primary-50)]'
                  }`}
                >
                  Online
                </button>
              </div>

              <div className="flex items-center gap-2 card rounded-xl p-2">
                <span className="text-xs text-[color:var(--text-secondary)] px-2">Trade:</span>
                <button
                  onClick={() => setMode('virtual')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tradingMode === 'virtual'
                      ? 'bg-[color:var(--info)] text-white shadow-md'
                      : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--primary-50)]'
                  }`}
                >
                  Virtual
                </button>
                <button
                  onClick={() => setMode('real')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tradingMode === 'real'
                      ? 'bg-[color:var(--success)] text-white shadow-md'
                      : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--primary-50)]'
                  }`}
                >
                  Real
                </button>
              </div>
            </div>

            {tradingMode === 'real' && (
              <div className="bg-amber-50 border border-[color:var(--warning)] px-4 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[color:var(--warning)]" />
                <span className="text-[color:var(--warning)] font-medium">LIVE TRADING</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-base bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[color:var(--text-secondary)] font-medium">Available Balance</span>
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[color:var(--text-primary)]">${balance.toFixed(2)}</div>
            <div className="text-sm text-blue-600 mt-1 font-medium">{tradingMode === 'virtual' ? 'Virtual' : 'Real'} Account</div>
          </div>

          <div className="card-base bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[color:var(--text-secondary)] font-medium">Open Positions</span>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[color:var(--text-primary)]">{positions.length}</div>
            <div className="text-sm text-emerald-600 mt-1 font-medium">Active Trades</div>
          </div>

          <div className="card-base bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[color:var(--text-secondary)] font-medium">Pending Orders</span>
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[color:var(--text-primary)]">{orders.length}</div>
            <div className="text-sm text-purple-600 mt-1 font-medium">Waiting Execution</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card-base rounded-xl p-6">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Chart Area</h2>
              <div className="bg-[color:var(--surface-muted)] rounded-lg h-96 flex items-center justify-center border border-[color:var(--border)]">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-[color:var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[color:var(--text-secondary)]">Advanced Chart Coming Soon</p>
                  <p className="text-sm text-[color:var(--text-muted)] mt-2">TradingView Integration</p>
                </div>
              </div>
            </div>

            <div className="card-base rounded-xl p-6">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Open Positions</h2>
              {positions.length === 0 ? (
                <div className="text-center py-8 text-[color:var(--text-muted)]">No open positions</div>
              ) : (
                <div className="space-y-3">
                  {(positions || []).map((pos, idx) => (
                    <div key={idx} className="bg-[color:var(--surface-muted)] rounded-lg p-4 border border-[color:var(--border)] hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-[color:var(--text-primary)] font-bold text-lg">{pos.symbol}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              pos.side === 'long'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-red-100 text-red-700 border border-red-300'
                            }`}>
                              {pos.side.toUpperCase()} {pos.leverage}x
                            </span>
                          </div>
                          <div className="flex gap-6 mt-2 text-sm">
                            <div>
                              <span className="text-[color:var(--text-secondary)]">Size:</span>
                              <span className="text-[color:var(--text-primary)] ml-2 font-medium">{pos.size}</span>
                            </div>
                            <div>
                              <span className="text-[color:var(--text-secondary)]">Entry:</span>
                              <span className="text-[color:var(--text-primary)] ml-2 font-medium">${pos.entryPrice?.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-[color:var(--text-secondary)]">Mark:</span>
                              <span className="text-[color:var(--text-primary)] ml-2 font-medium">${pos.markPrice?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            pos.unrealizedPnl >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl?.toFixed(2)} USDT
                          </div>
                          <button
                            onClick={() => handleClosePosition(pos.symbol)}
                            className="mt-2 bg-[color:var(--danger)] hover:bg-red-700 text-white px-4 py-1 rounded text-sm transition-all shadow-sm"
                          >
                            Close Position
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-base rounded-xl p-6">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Open Orders</h2>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-[color:var(--text-muted)]">No pending orders</div>
              ) : (
                <div className="space-y-3">
                  {(orders || []).map((order, idx) => (
                    <div key={idx} className="bg-[color:var(--surface-muted)] rounded-lg p-4 border border-[color:var(--border)] flex items-center justify-between hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-[color:var(--text-primary)] font-bold">{order.symbol}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.side === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {order.side.toUpperCase()}
                          </span>
                          <span className="text-[color:var(--text-secondary)] text-sm">{order.type}</span>
                        </div>
                        <div className="text-sm text-[color:var(--text-secondary)] mt-1">
                          Size: {order.size} @ ${order.price}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelOrder(order.orderId)}
                        className="card hover:shadow-md text-[color:var(--text-primary)] p-2 rounded transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-base rounded-xl p-6">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Place Order</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">Symbol</label>
                  <select
                    value={orderForm.symbol}
                    onChange={(e) => {
                      setOrderForm({...orderForm, symbol: e.target.value});
                      setSelectedSymbol(e.target.value);
                    }}
                    className="w-full bg-[color:var(--surface)] text-[color:var(--text-primary)] rounded-lg px-4 py-2 border border-[color:var(--border)] focus:border-[color:var(--primary-500)] focus:outline-none transition-colors"
                  >
                    {(symbols || []).map(sym => (
                      <option key={sym} value={sym}>{sym}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOrderForm({...orderForm, side: 'buy'})}
                    className={`py-2 rounded-lg font-bold transition-all ${
                      orderForm.side === 'buy'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-emerald-50'
                    }`}
                  >
                    BUY / LONG
                  </button>
                  <button
                    onClick={() => setOrderForm({...orderForm, side: 'sell'})}
                    className={`py-2 rounded-lg font-bold transition-all ${
                      orderForm.side === 'sell'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-red-50'
                    }`}
                  >
                    SELL / SHORT
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOrderForm({...orderForm, type: 'limit'})}
                    className={`py-2 rounded-lg font-medium transition-all ${
                      orderForm.type === 'limit'
                        ? 'bg-[color:var(--primary-500)] text-white shadow-md'
                        : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--primary-50)]'
                    }`}
                  >
                    Limit
                  </button>
                  <button
                    onClick={() => setOrderForm({...orderForm, type: 'market'})}
                    className={`py-2 rounded-lg font-medium transition-all ${
                      orderForm.type === 'market'
                        ? 'bg-[color:var(--primary-500)] text-white shadow-md'
                        : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--primary-50)]'
                    }`}
                  >
                    Market
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">Size (Contracts)</label>
                  <input
                    type="number"
                    value={orderForm.size}
                    onChange={(e) => setOrderForm({...orderForm, size: parseFloat(e.target.value)})}
                    className="w-full bg-[color:var(--surface)] text-[color:var(--text-primary)] rounded-lg px-4 py-2 border border-[color:var(--border)] focus:border-[color:var(--primary-500)] focus:outline-none transition-colors"
                    step="0.01"
                  />
                </div>

                {orderForm.type === 'limit' && (
                  <div>
                    <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">Price</label>
                    <input
                      type="number"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({...orderForm, price: parseFloat(e.target.value)})}
                      className="w-full bg-[color:var(--surface)] text-[color:var(--text-primary)] rounded-lg px-4 py-2 border border-[color:var(--border)] focus:border-[color:var(--primary-500)] focus:outline-none transition-colors"
                      step="0.01"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">Leverage: {orderForm.leverage}x</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={orderForm.leverage}
                    onChange={(e) => setOrderForm({...orderForm, leverage: parseInt(e.target.value)})}
                    className="w-full accent-[color:var(--primary-500)]"
                  />
                  <div className="flex justify-between text-xs text-[color:var(--text-muted)] mt-1">
                    <span>1x</span>
                    <span>50x</span>
                    <span>100x</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">Stop Loss</label>
                    <input
                      type="number"
                      value={orderForm.stopLoss}
                      onChange={(e) => setOrderForm({...orderForm, stopLoss: parseFloat(e.target.value)})}
                      placeholder="Optional"
                      className="w-full bg-[color:var(--surface)] text-[color:var(--text-primary)] rounded-lg px-4 py-2 border border-[color:var(--border)] focus:border-[color:var(--primary-500)] focus:outline-none transition-colors"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">Take Profit</label>
                    <input
                      type="number"
                      value={orderForm.takeProfit}
                      onChange={(e) => setOrderForm({...orderForm, takeProfit: parseFloat(e.target.value)})}
                      placeholder="Optional"
                      className="w-full bg-[color:var(--surface)] text-[color:var(--text-primary)] rounded-lg px-4 py-2 border border-[color:var(--border)] focus:border-[color:var(--primary-500)] focus:outline-none transition-colors"
                      step="0.01"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md hover:shadow-lg ${
                    orderForm.side === 'buy'
                      ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700'
                      : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
                  }`}
                >
                  {orderForm.side === 'buy' ? 'BUY / LONG' : 'SELL / SHORT'} {orderForm.symbol}
                </button>

                {/* Entry plan preview */}
                <div className="mt-6 pt-6 border-t border-[color:var(--border)]">
                  <h3 className="font-semibold text-[color:var(--text-primary)] mb-2">Entry Plan Preview</h3>
                  {entryPlanLoading && <div className="text-sm text-[color:var(--text-secondary)]">Loading…</div>}
                  {!entryPlanLoading && entryPlan?.entryPlan ? (
                    <div className="text-sm text-[color:var(--text-secondary)] grid grid-cols-2 gap-2">
                      <div>SL: {entryPlan.entryPlan.sl}</div>
                      <div>TPs: {entryPlan.entryPlan.tp?.join(', ')}</div>
                      <div>Ladder: {entryPlan.entryPlan.ladder?.join(' / ')}</div>
                      <div>Leverage: {entryPlan.entryPlan.leverage ?? '-'}</div>
                    </div>
                  ) : (
                    !entryPlanLoading && <div className="text-sm text-[color:var(--text-muted)]">Entry plan not available</div>
                  )}
                </div>
              </div>
            </div>

            <div className="card-base bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <Settings className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-amber-900">Quick Tips</h3>
              </div>
              <ul className="text-sm text-amber-800 space-y-2">
                <li>• Data: {dataMode === 'offline' ? 'Offline (synthetic)' : 'Online (live)'}</li>
                <li>• Trading: {tradingMode === 'virtual' ? 'Virtual (practice)' : 'Real (live)'}</li>
                <li>• Use Stop Loss to limit losses</li>
                <li>• Take Profit to secure gains</li>
                <li>• Higher leverage = Higher risk</li>
                <li>• Always manage your risk</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default TradingView;
