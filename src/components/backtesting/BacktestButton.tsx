import React, { useState } from 'react';
import { useNavigation } from '../Navigation/NavigationProvider';
import { useBacktestContext } from '../../contexts/BacktestContext';
import { APP_MODE, requiresRealData, API_BASE } from '../../config/env';
import { MIN_BARS } from '../../config/risk';
import { Logger } from '../../core/Logger';

const logger = Logger.getInstance();

type Props = {
  symbolUI: string;       // e.g., "BTC/USDT"
  timeframe: string;      // e.g., "1h"
  label?: string;         // default: "Backtest"
  className?: string;     // pass-through styling
};

export default function BacktestButton({ symbolUI, timeframe, label = 'Backtest', className = '' }: Props) {
  const navigationContext = useNavigation();
  const backtestContext = useBacktestContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!navigationContext || !backtestContext) {
    return null;
  }

  const { setCurrentView } = navigationContext;
  const { setBacktestParams } = backtestContext;

  // Map UI symbol to Binance format (strip slash)
  const symbolParam = symbolUI.includes('/') ? symbolUI.replace('/', '') : symbolUI;

  // Check if OHLC data is ready for the given symbol/timeframe
  const isOHLCReady = async (sym: string, tf: string): Promise<boolean> => {
    try {
      const url = `${API_BASE}/market/ohlcv/ready?symbol=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(tf)}&min=${MIN_BARS}`;
      const res = await fetch(url, { method: 'HEAD', credentials: 'include' });
      return res.ok;
    } catch (err) {
      logger.warn('OHLC readiness check failed:', { symbol: sym, timeframe: tf }, err);
      return false;
    }
  };

  const go = async () => {
    setBusy(true);
    try {
      // In online/strict mode, verify OHLC data is available
      if (APP_MODE === 'online' && requiresRealData()) {
        const ready = await isOHLCReady(symbolParam, timeframe);
        if (!ready) {
          logger.warn('[Backtest] Real OHLC not ready for', { symbol: symbolParam, timeframe });
          console.warn(`Real OHLC for ${symbolParam} (${timeframe}) is not available. Pick another pair/timeframe.`);

          // Minimal UI feedback without new dependencies
          try {
            const statusEl = document.getElementById('bt-status');
            if (statusEl) {
              statusEl.textContent = `Real OHLC not ready for ${symbolParam} (${timeframe}). Pick another pair/timeframe.`;
              statusEl.setAttribute('data-show', '1');
              setTimeout(() => statusEl.removeAttribute('data-show'), 3000);
            }
          } catch {}

          setBusy(false);
          return;
        }
      }

      // Set parameters in context for BacktestView to consume
      setBacktestParams({ symbolParam, timeframe });

      // Navigate to backtest view
      setCurrentView('backtest');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={go}
        aria-label="Open strategy backtest and visualization"
        className={`btn-ghost px-3 py-1 text-sm ${className}`}
        disabled={busy}
      >
        {label}
      </button>
      {/* Lightweight, dependency-free, a11y-friendly status */}
      <span
        id="bt-status"
        role="status"
        aria-live="polite"
        style={{
          marginInlineStart: 8,
          display: 'inline-block',
          opacity: 0,
          transition: 'opacity 0.2s',
          fontSize: '0.875rem',
          color: 'var(--text-warning, #f59e0b)',
        }}
      />
      <style>{`
        #bt-status[data-show="1"] { opacity: 0.9; }
      `}</style>
    </>
  );
}
