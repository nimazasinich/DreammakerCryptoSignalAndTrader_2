import React, { useState, useEffect } from 'react';
import { Logger } from '../core/Logger';
import { MarketData } from '../types';
import { API_BASE } from '../config/env';
import { REFRESH_BASE_MS } from '../config/risk';
import { RealPortfolioConnector } from '../components/connectors/RealPortfolioConnector';
import RiskCenterPro from '../components/portfolio/RiskCenterPro';
import { showToast } from '../components/ui/Toast';
import { useConfirmModal } from '../components/ui/ConfirmModal';

const logger = Logger.getInstance();

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT' | 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  markPrice: number;
  sl?: number;
  tp?: number[];
  leverage: number;
  pnl: number;
  pnlPercent: number;
}

export const PortfolioPage: React.FC = () => {
  const { confirm, ModalComponent } = useConfirmModal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_BASE_MS);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Fetch market data and positions in parallel
      const [marketRes, positionsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/market/data`, { mode: "cors", headers: { "Content-Type": "application/json" } }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_BASE}/positions/open`, { credentials: 'include' }).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);

      // Handle market data
      if (marketRes.status === 'fulfilled' && marketRes.value) {
        const data = marketRes.value;
        if (Array.isArray(data)) {
          setMarketData(data);
        } else if (data.success && Array.isArray(data.data)) {
          setMarketData(data.data);
        } else if (Array.isArray(data.marketData)) {
          setMarketData(data.marketData);
        }
      }

      // Handle positions
      if (positionsRes.status === 'fulfilled' && positionsRes.value) {
        const data = positionsRes.value;
        let posArray: Position[] = [];
        if (Array.isArray(data)) {
          posArray = data;
        } else if (data.success && Array.isArray(data.positions)) {
          posArray = data.positions;
        } else if (Array.isArray(data.positions)) {
          posArray = data.positions;
        }
        setPositions(posArray);
      }
    } catch (error) {
      logger.error('Failed to load portfolio data:', {}, error as Error);
    }
  };

  const handleClosePosition = async (id: string) => {
    const confirmed = await confirm('Close Position', 'Are you sure you want to close this position?', 'warning');
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/positions/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      if (data.success) {
        await loadData();
        showToast('success', 'Position Closed', data.message || 'Position closed successfully');
      } else {
        showToast('error', 'Close Failed', data.error || 'Failed to close position');
      }
    } catch (error: any) {
      showToast('error', 'Close Failed', error.message || 'Failed to close position');
    }
    setLoading(false);
  };

  const getPnlColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getSideColor = (side: string) => {
    return side === 'LONG' || side === 'BUY'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';
  };

  return (
    <>
      <ModalComponent />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <div className="text-sm text-gray-500">
            Real-time data • Auto-refresh enabled
          </div>
        </div>

        {/* Holdings Summary Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Holdings Summary</h2>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            <RealPortfolioConnector />
          </div>
        </section>

        {/* Open Positions Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Open Positions
            {(positions?.length || 0) > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({positions.length})
              </span>
            )}
          </h2>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            {positions.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-gray-500">No open positions</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your active positions will appear here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Symbol
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Side
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Size
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Entry
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Mark
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Leverage
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        PnL
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(positions || []).map((pos) => (
                      <tr
                        key={pos.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {pos.symbol}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-semibold ${getSideColor(
                              pos.side
                            )}`}
                          >
                            {pos.side}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {pos.size.toFixed(4)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          ${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          ${pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-purple-600 font-semibold">
                          {pos.leverage}x
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className={`font-semibold ${getPnlColor(pos.pnl)}`}>
                            ${pos.pnl.toFixed(2)}
                            <div className="text-xs">({pos.pnlPercent.toFixed(2)}%)</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleClosePosition(pos.id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
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
        </section>

        {/* Risk Center Section */}
        <section>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <RiskCenterPro />
          </div>
        </section>
      </div>
    </div>
    </>
  );
};

export default PortfolioPage;
