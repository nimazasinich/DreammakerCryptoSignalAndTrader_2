import React, { useEffect, useMemo, useState, useRef } from 'react';
import { API_BASE } from '../../config/env';
import {
  REFRESH_BASE_MS,
  BACKOFF_MAX_MS,
  BACKOFF_INITIAL_MS,
  MIN_BARS,
  VAR_Z_SCORE,
  ES_MULTIPLIER,
  DEFAULT_MAINTENANCE_MARGIN_RATE,
  LIQUIDATION_BUFFER_THRESHOLDS,
  HOURS_PER_DAY,
  MAX_HISTORY_RECORDS,
  MAX_OHLCV_BARS,
  OHLCV_TIMEFRAME,
  CSV_DECIMAL_PLACES,
} from '../../config/risk';

type Position = {
  symbol: string;
  side: 'long' | 'short' | 'buy' | 'sell' | 'LONG' | 'SHORT' | 'BUY' | 'SELL';
  qty?: number;
  size?: number;
  quantity?: number;
  entryPrice?: number;
  averagePrice?: number;
  markPrice?: number;
  currentPrice?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  pnl?: number;
  leverage?: number;
  marginMode?: 'cross' | 'isolated';
};

type FuturesInfo = {
  maintMarginRate?: number;
  tickSize?: number;
  minQty?: number;
};

type HistoryRow = {
  ts?: number;
  timestamp?: number;
  time?: number;
  realizedPnl?: number;
  equity?: number;
};

type OHLCVBar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export default function RiskCenterPro() {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [hist, setHist] = useState<HistoryRow[]>([]);
  const [futInfo, setFutInfo] = useState<Record<string, FuturesInfo>>({});
  const [symbolVol, setSymbolVol] = useState<Record<string, { vol: number; var95: number; es95: number }>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  async function fetchJSON(url: string) {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) console.error(`HTTP ${res.status}`);
    return res.json();
  }

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      // Fetch positions and history in parallel
      const [posResult, histResult] = await Promise.allSettled([
        fetchJSON(`${API_BASE}/positions/open`),
        fetchJSON(`${API_BASE}/positions/history?limit=${MAX_HISTORY_RECORDS}`),
      ]);

      const posData = posResult.status === 'fulfilled' ? posResult.value : null;
      const histData = histResult.status === 'fulfilled' ? histResult.value : null;

      // Extract positions array from response
      let p: Position[] = [];
      if (posData) {
        if (Array.isArray(posData)) {
          p = posData;
        } else if (posData.success && Array.isArray(posData.positions)) {
          p = posData.positions;
        } else if (posData.positions && Array.isArray(posData.positions)) {
          p = posData.positions;
        }
      }

      // Extract history array
      let histRows: HistoryRow[] = [];
      if (histData) {
        if (Array.isArray(histData)) {
          histRows = histData;
        } else if (histData.success && Array.isArray(histData.history)) {
          histRows = histData.history;
        } else if (histData.history && Array.isArray(histData.history)) {
          histRows = histData.history;
        }
      }

      // Fetch futures info for each symbol
      const futMap: Record<string, FuturesInfo> = {};
      await Promise.all(
        (p || []).map(async (pos: Position) => {
          try {
            const fi = await fetchJSON(`${API_BASE}/futures/info?symbol=${pos.symbol}`);
            futMap[pos.symbol] = fi || {};
          } catch {
            // Ignore futures info errors - not all symbols may be futures
          }
        })
      );

      // Fetch OHLCV for volatility calculations
      const volMap: Record<string, { vol: number; var95: number; es95: number }> = {};
      await Promise.all(
        (p || []).map(async (pos: Position) => {
          try {
            const ohlcv = await fetchJSON(
              `${API_BASE}/market/ohlcv?symbol=${pos.symbol}&timeframe=${OHLCV_TIMEFRAME}&limit=${MAX_OHLCV_BARS}`
            );
            let bars: OHLCVBar[] = [];
            if (Array.isArray(ohlcv)) {
              bars = ohlcv;
            } else if (ohlcv.success && Array.isArray(ohlcv.data)) {
              bars = ohlcv.data;
            } else if (Array.isArray(ohlcv.bars)) {
              bars = ohlcv.bars;
            }

            if ((bars?.length || 0) >= MIN_BARS) {
              // Calculate hourly returns
              const returns: number[] = [];
              for (let i = 1; i < bars.length; i++) {
                const ret = (bars[i].close - bars[i - 1].close) / bars[i - 1].close;
                returns.push(ret);
              }

              // Calculate volatility (standard deviation of returns)
              const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
              const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
              const hourlyVol = Math.sqrt(variance);

              // Annualize to daily volatility using configured hours per day
              const dailyVol = hourlyVol * Math.sqrt(HOURS_PER_DAY);

              // Calculate VaR using configured confidence level
              const var95 = VAR_Z_SCORE * dailyVol;

              // Calculate Expected Shortfall (CVaR) using configured multiplier
              const es95 = ES_MULTIPLIER * dailyVol;

              volMap[pos.symbol] = {
                vol: dailyVol,
                var95,
                es95,
              };
            }
          } catch {
            // Ignore OHLCV errors - not all symbols may have data
          }
        })
      );

      setFutInfo(futMap);
      setSymbolVol(volMap);
      setPositions(p);
      setHist(histRows);
    } catch (e: any) {
      setErr(e?.message || 'fetch_failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!auto) { console.warn("Missing data"); }
    let backoff = BACKOFF_INITIAL_MS;
    const tick = async () => {
      try {
        await refresh();
        backoff = BACKOFF_INITIAL_MS; // Reset on success
      } catch {
        backoff = Math.min(backoff * 2, BACKOFF_MAX_MS);
      }
      // @ts-ignore
      timer.current = window.setTimeout(tick, backoff);
    };
    // @ts-ignore
    timer.current = window.setTimeout(tick, REFRESH_BASE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [auto]);

  // ---------- Calculations ----------

  const exposures = useMemo(() => {
    const bySym: Record<string, number> = {};
    let long = 0;
    let short = 0;
    let total = 0;

    for (const p of positions) {
      const qty = p.qty ?? p.size ?? p.quantity ?? 0;
      const mark = p.markPrice ?? p.currentPrice ?? p.entryPrice ?? p.averagePrice ?? 0;
      const exp = Math.abs(qty * mark);
      bySym[p.symbol] = (bySym[p.symbol] || 0) + exp;
      total += exp;

      const side = (p.side || '').toLowerCase();
      if (side === 'long' || side === 'buy') {
        long += exp;
      } else {
        short += exp;
      }
    }

    const topEntry = Object.entries(bySym).sort((a, b) => b[1] - a[1])[0];
    const top = topEntry?.[1] ?? 0;

    return {
      bySym,
      total,
      long,
      short,
      topPct: total ? (top / total) * 100 : 0,
    };
  }, [positions]);

  const equity = useMemo(() => {
    const rows = Array.isArray(hist) ? hist : [];
    const eq: { t: number; v: number }[] = [];
    let base = 0;
    let cur = 0;

    for (const r of rows) {
      const t = r.ts ?? r.timestamp ?? r.time ?? 0;
      const v = r.equity != null ? r.equity : ((cur += r.realizedPnl || 0), base + cur);
      if (t && Number.isFinite(v)) {
        eq.push({ t: +t, v: +v });
      }
    }

    return eq.sort((a, b) => a.t - b.t);
  }, [hist]);

  function maxDrawdown(series: { t: number; v: number }[]) {
    let peak = -Infinity;
    let mdd = 0;
    for (const p of series) {
      peak = Math.max(peak, p.v);
      if (peak > 0) {
        mdd = Math.max(mdd, (peak - p.v) / peak);
      }
    }
    return mdd;
  }

  const mdd = useMemo(() => maxDrawdown(equity), [equity]);

  function estimateLiqBuffer(p: Position, info?: FuturesInfo) {
    const qty = p.qty ?? p.size ?? p.quantity ?? 0;
    const entry = p.entryPrice ?? p.averagePrice ?? 0;
    const mark = p.markPrice ?? p.currentPrice ?? entry;

    if (!p.leverage || !entry || !mark) return null;

    const k = info?.maintMarginRate ?? DEFAULT_MAINTENANCE_MARGIN_RATE;
    const side = (p.side || '').toLowerCase();
    const long = side === 'long' || side === 'buy';

    const liq = long
      ? entry * (1 - (1 / p.leverage) * (1 + k))
      : entry * (1 + (1 / p.leverage) * (1 + k));

    const dist = long ? (mark - liq) / mark : (liq - mark) / mark;

    return Number.isFinite(dist) ? dist : null;
  }

  // Calculate average leverage and margin utilization
  const leverageStats = useMemo(() => {
    let totalNotional = 0;
    let totalEquity = 0;
    let hasFutures = false;

    for (const p of positions) {
      const qty = p.qty ?? p.size ?? p.quantity ?? 0;
      const mark = p.markPrice ?? p.currentPrice ?? p.entryPrice ?? p.averagePrice ?? 0;
      const notional = Math.abs(qty * mark);

      if (p.leverage && p.leverage > 1) {
        hasFutures = true;
        totalNotional += notional;
        totalEquity += notional / p.leverage;
      }
    }

    const effectiveLeverage = totalEquity > 0 ? totalNotional / totalEquity : 1;

    return {
      hasFutures,
      effectiveLeverage,
      totalNotional,
      totalEquity,
    };
  }, [positions]);

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ['symbol', 'exposureUsd', 'var95Pct', 'es95Pct', 'liqBufferPct'];
    const rows = Object.entries(exposures.bySym)
      .sort((a, b) => b[1] - a[1])
      .map(([sym, usd]) => {
        const pos = positions.find((p) => p.symbol === sym);
        const liq = pos ? estimateLiqBuffer(pos, futInfo[sym]) : null;
        const vol = symbolVol[sym];

        return [
          sym,
          usd.toFixed(CSV_DECIMAL_PLACES),
          vol ? (vol.var95 * 100).toFixed(CSV_DECIMAL_PLACES) : '',
          vol ? (vol.es95 * 100).toFixed(CSV_DECIMAL_PLACES) : '',
          liq != null ? (liq * 100).toFixed(CSV_DECIMAL_PLACES) : '',
        ];
      });

    const csv = [headers.join(','), ...(rows || []).map((a) => a.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_risk_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // UI
  if (loading && positions.length === 0) {
    return (
      <div
        className="animate-pulse h-40 rounded-lg"
        style={{ background: 'linear-gradient(180deg,#f3f4f6,#e5e7eb)' }}
      />
    );
  }

  if (err && positions.length === 0) {
    return (
      <div className="card p-4 bg-red-50 border border-red-200">
        <div className="text-red-700 text-sm">Risk data error: {err}</div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="text-gray-500">No positions to analyze</div>
      </div>
    );
  }

  // Build table rows for exposure
  const expRows = Object.entries(exposures.bySym)
    .sort((a, b) => b[1] - a[1])
    .map(([sym, usd]) => ({ sym, usd }));

  return (
    <div className="grid gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Risk Center</h3>
        <div className="flex items-center gap-3">
          <label className="text-sm flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
              className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-700">Auto-refresh</span>
          </label>
          <button
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={handleExportCSV}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Exposure Summary Cards */}
      <div className="grid md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Total Exposure
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${exposures.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Long Exposure
          </div>
          <div className="text-2xl font-bold text-green-600">
            ${exposures.long.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Short Exposure
          </div>
          <div className="text-2xl font-bold text-red-600">
            ${exposures.short.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Top Symbol Concentration
          </div>
          <div className="text-2xl font-bold text-orange-600">{exposures.topPct.toFixed(1)}%</div>
        </div>
      </div>

      {/* Leverage Stats (only show if futures positions exist) */}
      {leverageStats.hasFutures && (
        <div className="grid md:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Effective Leverage
            </div>
            <div className="text-xl font-bold text-purple-600">
              {leverageStats.effectiveLeverage.toFixed(2)}x
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Total Notional
            </div>
            <div className="text-xl font-bold text-gray-900">
              ${leverageStats.totalNotional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Equity Used
            </div>
            <div className="text-xl font-bold text-gray-900">
              ${leverageStats.totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      )}

      {/* Equity Curve + MDD (only show if equity data exists) */}
      {(equity?.length || 0) >= 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-900">Equity Curve</div>
            <div className="px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded-md">
              Max Drawdown: {(mdd * 100).toFixed(1)}%
            </div>
          </div>
          <svg width="100%" height="80" className="text-blue-600">
            {(() => {
              const w = 800;
              const h = 80;
              const xs = (equity || []).map((x) => x.t);
              const ys = (equity || []).map((x) => x.v);
              const xmin = Math.min(...xs);
              const xmax = Math.max(...xs);
              const ymin = Math.min(...ys);
              const ymax = Math.max(...ys);
              const path = ys
                .map((v, i) => {
                  const x = ((xs[i] - xmin) / (xmax - xmin || 1)) * w;
                  const y = h - ((v - ymin) / (ymax - ymin || 1)) * (h - 10);
                  return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ');
              return <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />;
            })()}
          </svg>
        </div>
      )}

      {/* Position Details Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Exposure (USD)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  VaR (95%)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  ES (95%)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Liq Buffer
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(expRows || []).map((r) => {
                const pos = positions.find((p) => p.symbol === r.sym);
                const liq = pos ? estimateLiqBuffer(pos, futInfo[r.sym]) : null;
                const vol = symbolVol[r.sym];

                return (
                  <tr key={r.sym} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">{r.sym}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm text-gray-900">
                        ${r.usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm text-red-600 font-medium">
                        {vol ? `${(vol.var95 * 100).toFixed(2)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm text-red-700 font-medium">
                        {vol ? `${(vol.es95 * 100).toFixed(2)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-medium ${
                          liq == null
                            ? 'text-gray-400'
                            : liq > LIQUIDATION_BUFFER_THRESHOLDS.SAFE
                            ? 'text-green-600'
                            : liq > LIQUIDATION_BUFFER_THRESHOLDS.WARNING
                            ? 'text-orange-600'
                            : 'text-red-600'
                        }`}
                      >
                        {liq == null ? '—' : `${(liq * 100).toFixed(1)}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info footer */}
      {err && (
        <div className="text-xs text-gray-500 text-center">
          Some metrics may be incomplete due to data availability issues.
        </div>
      )}
    </div>
  );
}
