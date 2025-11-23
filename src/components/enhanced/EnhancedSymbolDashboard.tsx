import React, { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Brain, Newspaper } from 'lucide-react';
import { fetchOHLC } from '../../services/enhanced/ohlcClient';
import { fetchNews } from '../../services/enhanced/newsProvider';
import { fetchSentimentCompact } from '../../services/enhanced/sentimentProvider';
import { fetchSignals } from '../../services/enhanced/signalsClient';
import NewsPanel from '../news/NewsPanel';
import { PriceChart } from '../market/PriceChart';

type Props = { symbol: string; timeframe: string; hideBottomDuplicateSignals?: boolean };

export default function EnhancedSymbolDashboard({ symbol, timeframe, hideBottomDuplicateSignals = true }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bars, setBars] = React.useState<any[]>([]);
  const [news, setNews] = React.useState<any[]>([]);
  const [sent, setSent] = React.useState<any|null>(null);
  const [signals, setSignals] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string|null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchOnce = React.useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [b, n, s, g] = await Promise.all([
        fetchOHLC(symbol, timeframe, 500),
        fetchNews(symbol.replace('USDT','')),
        fetchSignals(symbol),
        fetchSentimentCompact(),
      ]);
      setBars(b); setNews(n); setSignals(s); setSent(g);
    } catch(e:any) {
      setErr(e?.message || 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  React.useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  // Clean symbol for display (remove USDT suffix)
  const displaySymbol = symbol.replace('USDT', '');

  // Get sentiment color and icon
  const getSentimentStyle = () => {
    if (!sent?.fearGreedValue) return { color: 'text-slate-400', bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.3)' };
    const val = sent.fearGreedValue;
    if (val >= 75) return { color: 'text-emerald-400', bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)' };
    if (val >= 55) return { color: 'text-green-400', bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.3)' };
    if (val >= 45) return { color: 'text-yellow-400', bg: 'rgba(234, 179, 8, 0.2)', border: 'rgba(234, 179, 8, 0.3)' };
    if (val >= 25) return { color: 'text-orange-400', bg: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.3)' };
    return { color: 'text-red-400', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)' };
  };

  return (
    <div className="space-y-6" aria-live="polite" aria-busy={loading ? 'true' : 'false'}>
      {/* Price Chart Section */}
      <div
        className="rounded-2xl overflow-hidden backdrop-blur-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
        }}
      >
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div
            className="p-2 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
            }}
          >
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white" style={{ textShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
              {displaySymbol}/USDT — {timeframe}
            </h3>
            <p className="text-[10px] text-slate-400">Real-time price chart</p>
          </div>
        </div>

        {loading && (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-pulse h-64 w-full rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.03)' }} />
          </div>
        )}

        {!loading && err && (
          <div className="p-6">
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              <p className="text-rose-400 text-sm">Chart data unavailable: {err}</p>
            </div>
          </div>
        )}

        {!loading && !err && (
          <PriceChart
            symbol={displaySymbol}
            autoFetch={false}
            initialTimeframe={timeframe}
          />
        )}
      </div>

      {/* Sentiment & Signals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Sentiment */}
        {sent && (
          <div
            className="rounded-2xl p-6 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(99, 102, 241, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-2 rounded-xl"
                style={{
                  background: getSentimentStyle().bg,
                  border: `1px solid ${getSentimentStyle().border}`,
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
                }}
              >
                <Brain className={`w-4 h-4 ${getSentimentStyle().color}`} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Market Sentiment</h3>
                <p className="text-[10px] text-slate-400">Fear & Greed Index</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-4xl font-bold ${getSentimentStyle().color}`} style={{
                  textShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
                }}>
                  {sent.fearGreedValue ?? sent.overall}
                </div>
                <div className="text-slate-500 text-xs mt-1">/100</div>
              </div>
              <div
                className="px-4 py-2 rounded-xl"
                style={{
                  background: getSentimentStyle().bg,
                  border: `1px solid ${getSentimentStyle().border}`
                }}
              >
                <span className={`text-sm font-bold ${getSentimentStyle().color}`}>
                  {sent.label}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Top Signals Summary */}
        {signals?.length > 0 && (
          <div
            className="rounded-2xl p-6 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-2 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
                }}
              >
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Active Signals</h3>
                <p className="text-[10px] text-slate-400">{signals.length} signals detected</p>
              </div>
            </div>
            <div className="space-y-2">
              {signals.slice(0, 3).map((sig: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    {sig.side?.toLowerCase() === 'buy' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    )}
                    <div>
                      <div className={`text-xs font-bold ${sig.side?.toLowerCase() === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {sig.side?.toUpperCase()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {sig.price?.toFixed?.(4) ?? sig.price}
                      </div>
                    </div>
                  </div>
                  {sig.score != null && (
                    <div className="text-xs text-slate-400">
                      Score: {sig.score.toFixed?.(2) ?? sig.score}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* News Section */}
      <div
        className="rounded-2xl p-6 backdrop-blur-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(6, 182, 212, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="p-2 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              boxShadow: '0 8px 24px rgba(6, 182, 212, 0.3)'
            }}
          >
            <Newspaper className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white" style={{ textShadow: '0 0 20px rgba(6, 182, 212, 0.3)' }}>
              Latest News — {displaySymbol}
            </h3>
            <p className="text-[10px] text-slate-400">Real-time cryptocurrency news</p>
          </div>
        </div>
        <NewsPanel items={news} loading={loading} error={err} onRetry={fetchOnce} />
      </div>
    </div>
  );
}
