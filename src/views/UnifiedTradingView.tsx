import React, { useMemo, useState, useEffect } from 'react';
import { Wallet, TrendingUp, AlertCircle } from 'lucide-react';

// Import existing trading views - do not modify these files
import TradingView from './TradingView';
import { FuturesTradingView } from './FuturesTradingView';
import { ExchangeSelector } from '../components/ExchangeSelector';

type TabKey = 'spot' | 'futures';

type Props = {
  initialTab?: TabKey; // optional: allow deep-link set or wrappers to preselect
};

export default function UnifiedTradingView({ initialTab = 'futures' }: Props) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Optional deep-link: support query parameter ?tab=spot|futures (non-breaking)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get('tab');
    if (q === 'spot' || q === 'futures') setTab(q);
  }, []);

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = useMemo(
    () => [
      { key: 'spot',    label: 'Spot', icon: Wallet },
      { key: 'futures', label: 'Leverage', icon: TrendingUp },
    ],
    []
  );

  return (
    <section className="w-full grid gap-4">
      <header className="trading-header card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary-600)] to-[var(--primary-400)] bg-clip-text text-transparent">
            Trading Platform
          </h2>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">
            Professional trading with advanced features
          </p>
        </div>

        <nav role="tablist" aria-label="Trading type" className="flex gap-3 p-1.5 bg-[color:var(--surface-muted)] rounded-xl">
          {(tabs || []).map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={`trading-tab px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2 font-semibold ${
                  tab === t.key
                    ? 'trading-tab-active bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-600)] text-white shadow-lg'
                    : 'text-[color:var(--text-secondary)] hover:bg-white/50 hover:text-[color:var(--primary-600)]'
                }`}
                onClick={() => setTab(t.key)}
              >
                <Icon className="w-5 h-5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Exchange Selector */}
      <div className="mb-4">
        <ExchangeSelector />
      </div>

      {/* SPOT Trading Warning */}
      {tab === 'spot' && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">SPOT Trading Not Available</h3>
              <p className="text-sm text-red-800 leading-relaxed">
                SPOT trading is not implemented in this build. KuCoin SPOT testnet API integration is not complete.
                The interface below is disabled and for reference only.
                For live trading functionality, please use the <strong>Leverage</strong> tab, which supports real Futures trading on KuCoin testnet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CRITICAL: render exactly ONE page at a time to mimic separate routes */}
      {tab === 'spot'    && <TradingView disabled={true} />}
      {tab === 'futures' && <FuturesTradingView />}
    </section>
  );
}
