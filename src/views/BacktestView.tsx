import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle,
  Play,
  RefreshCw,
  Shield,
  TrendingUp,
  AlertTriangle,
  Zap,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { t } from '../i18n';
import fmt from '../lib/formatNumber';
import createPseudoRandom from '../lib/pseudoRandom';
import { useBacktestContext } from '../contexts/BacktestContext';
import { BacktestPanel } from '../components/backtesting/BacktestPanel';

type BacktestStatus = 'idle' | 'running' | 'completed';

interface BacktestConfig {
  symbols: string;
  lookback: number;
  capital: number;
  risk: number;
  slippage: number;
}

interface BacktestResult {
  symbol: string;
  price: number;
  successRate: number;
  risk: number;
  whaleActivity: 'High' | 'Medium' | 'Low';
  smartMoney: number;
  elliottWave: string;
  priceAction: 'Bullish' | 'Bearish' | 'Neutral';
  ict: string;
  finalScore: number;
  trades: number;
  pnl: number;
}

interface AggregateMetrics {
  cagr: number;
  sharpe: number;
  drawdown: number;
  winRate: number;
  profitFactor: number;
  trades: number;
}

type ConfigErrors = Partial<Record<keyof BacktestConfig, string>>;

const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT'];

const BASE_PRICES: Record<string, number> = {
  BTCUSDT: 42000,
  ETHUSDT: 2200,
  BNBUSDT: 310,
  SOLUSDT: 140,
  ADAUSDT: 0.55,
};

const TIMELINE_STEPS = ['data', 'signals', 'risk', 'allocation'] as const;

const DEFAULT_CONFIG: BacktestConfig = {
  symbols: DEFAULT_SYMBOLS.join(', '),
  lookback: 120,
  capital: 100_000,
  risk: 1,
  slippage: 0.1,
};

const parseSymbols = (input: string): string[] => {
  const parsed = input
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  return parsed.length ? parsed : DEFAULT_SYMBOLS;
};

const validateConfig = (config: BacktestConfig): ConfigErrors => {
  const errors: ConfigErrors = {};

  if (!config.symbols.trim()) {
    errors.symbols = t('backtest.config.errors.required');
  }
  if (!config.lookback || config.lookback <= 0) {
    errors.lookback = t('backtest.config.errors.positive');
  }
  if (!config.capital || config.capital <= 0) {
    errors.capital = t('backtest.config.errors.positive');
  }
  if (!config.risk || config.risk <= 0) {
    errors.risk = t('backtest.config.errors.positive');
  }
  if (config.slippage < 0) {
    errors.slippage = t('backtest.config.errors.required');
  }

  return errors;
};

const generateResults = (config: BacktestConfig): BacktestResult[] => {
  const symbols = parseSymbols(config.symbols);
  const seed =
    Math.round(config.capital) +
    config.lookback * 37 +
    Math.round(config.risk * 100) * 11 +
    Math.round(config.slippage * 1000);
  const rng = createPseudoRandom(seed);

  const activityLevels: BacktestResult['whaleActivity'][] = ['High', 'Medium', 'Low'];
  const priceActions: BacktestResult['priceAction'][] = ['Bullish', 'Bearish', 'Neutral'];

  const results = (symbols || []).map((symbol) => {
    const basePrice = BASE_PRICES[symbol] ?? Math.max(0.5, 10 + rng() * 2000);
    const successRate = 55 + rng() * 35;
    const risk = 10 + rng() * 10;
    const smartMoney = 45 + rng() * 40;
    const elliottWave = `Wave ${1 + Math.floor(rng() * 5)}`;
    const priceAction = priceActions[Math.floor(rng() * priceActions.length)];
    const whaleActivity = activityLevels[Math.floor(rng() * activityLevels.length)];
    const ictRangeLow = basePrice * (0.96 + rng() * 0.02);
    const ictRangeHigh = basePrice * (1.02 - rng() * 0.02);
    const finalScore = 60 + rng() * 40;
    const trades = Math.round(120 + rng() * 180);
    const pnl = -5 + rng() * 25;

    return {
      symbol,
      price: basePrice,
      successRate,
      risk,
      whaleActivity,
      smartMoney,
      elliottWave,
      priceAction,
      ict: `$${fmt(ictRangeLow, { maximumFractionDigits: 0 })} - $${fmt(ictRangeHigh, { maximumFractionDigits: 0 })}`,
      finalScore,
      trades,
      pnl,
    } satisfies BacktestResult;
  });

  return results.sort((a, b) => b.finalScore - a.finalScore);
};

const calculateMetrics = (results: BacktestResult[], config: BacktestConfig): AggregateMetrics => {
  if (!results.length) {
    return {
      cagr: 0,
      sharpe: 0,
      drawdown: 0,
      winRate: 0,
      profitFactor: 0,
      trades: 0,
    };
  }

  const averageSuccess = results.reduce((sum, item) => sum + item.successRate, 0) / results.length;
  const averagePnl = results.reduce((sum, item) => sum + item.pnl, 0) / results.length;
  const volatility = results.reduce((sum, item) => sum + Math.pow(item.pnl - averagePnl, 2), 0) / results.length;

  const cagr = Math.max(
    0,
    Math.pow(1 + averagePnl / 100, 365 / config.lookback) - 1,
  );
  const sharpe = volatility === 0 ? 0 : (averagePnl / Math.sqrt(volatility + 1e-6)) * Math.sqrt(252 / config.lookback);
  const drawdown = Math.max(5, 15 + averagePnl / 4);
  const profitFactor = Math.max(0.5, 1.4 + averagePnl / 20);
  const trades = results.reduce((sum, item) => sum + item.trades, 0);

  return {
    cagr,
    sharpe,
    drawdown,
    winRate: averageSuccess,
    profitFactor,
    trades,
  };
};

const BacktestView: React.FC = () => {
  const { symbolParam, timeframe: timeframeParam, clearBacktestParams } = useBacktestContext();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Use parameters from context if available, otherwise use defaults
  const effectiveSymbol = symbolParam ?? 'BTCUSDT';
  const effectiveTimeframe = timeframeParam ?? '1h';

  // Initialize config with context parameters
  const [config, setConfig] = useState<BacktestConfig>({
    ...DEFAULT_CONFIG,
    symbols: symbolParam ?? DEFAULT_CONFIG.symbols,
  });
  const [errors, setErrors] = useState<ConfigErrors>({});
  const [status, setStatus] = useState<BacktestStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [metrics, setMetrics] = useState<AggregateMetrics | null>(null);
  const [backtestMode, setBacktestMode] = useState<'demo' | 'real'>('demo');

  const timerRef = useRef<number | null>(null);

  // Focus heading for accessibility when component mounts
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Update config when context parameters change
  useEffect(() => {
    if (symbolParam) {
      setConfig(prev => ({
        ...prev,
        symbols: symbolParam,
      }));
    }
  }, [symbolParam]);

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleRun = () => {
    const validation = validateConfig(config);
    setErrors(validation);
    if (Object.keys(validation).length) {
      return;
    }

    setStatus('running');
    setProgress(0);
    setResults([]);
    setMetrics(null);

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    let current = 0;
    timerRef.current = window.setInterval(() => {
      current = Math.min(100, current + 12 + Math.min(20, config.lookback / 10));
      setProgress(current);

      if (current >= 100 && timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
        const generated = generateResults(config);
        setResults(generated);
        setMetrics(calculateMetrics(generated, config));
        setStatus('completed');
      }
    }, 220);
  };

  const handleReset = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus('idle');
    setProgress(0);
    setResults([]);
    setMetrics(null);
  };

  const handleChange = <K extends keyof BacktestConfig>(key: K, value: string | number) => {
    setConfig((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'number' ? Number(value) : value,
    }));
  };

  const timeline = useMemo(() => {
    return (TIMELINE_STEPS || []).map((key, index) => {
      const thresholdStart = (index / TIMELINE_STEPS.length) * 100;
      const thresholdEnd = ((index + 1) / TIMELINE_STEPS.length) * 100;
      const state = progress >= thresholdEnd ? 'done' : progress >= thresholdStart ? 'active' : 'pending';
      return { key, state, index };
    });
  }, [progress]);

  const statusLabel = t(`backtest.status.${status}`);

  return (
    <ErrorBoundary>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-12">
        {/* Mode Toggle */}
        <div className="flex items-center justify-end gap-4">
          <span className="text-sm font-medium text-text-secondary">Backtest Mode:</span>
          <button
            type="button"
            onClick={() => setBacktestMode(backtestMode === 'demo' ? 'real' : 'demo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              backtestMode === 'real'
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg'
                : 'bg-surface border border-border text-text-secondary hover:bg-surface-muted'
            }`}
          >
            {backtestMode === 'real' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            <span>{backtestMode === 'real' ? 'Real Backtest' : 'Demo Mode'}</span>
            {backtestMode === 'real' && <Zap className="h-4 w-4" />}
          </button>
        </div>

        {/* Warning Banner: Demo Mode */}
        {backtestMode === 'demo' && (
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 shadow-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600" aria-hidden="true" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-amber-900">⚠️ DEMO MODE: Simulated Results</h2>
                <p className="mt-1 text-sm text-amber-800">
                  Results are generated using deterministic pseudo-random algorithms for demonstration purposes only.
                  This is <strong>NOT</strong> real historical backtesting. Metrics shown do not reflect actual trading performance.
                </p>
                <p className="mt-2 text-xs text-amber-700">
                  Toggle to "Real Backtest" mode above to use actual historical data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real Backtest Info Banner */}
        {backtestMode === 'real' && (
          <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4 shadow-md">
            <div className="flex items-start gap-3">
              <Zap className="h-6 w-6 flex-shrink-0 text-emerald-600" aria-hidden="true" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-emerald-900">✓ REAL BACKTEST MODE</h2>
                <p className="mt-1 text-sm text-emerald-800">
                  Using actual historical market data and real backtest engine with walk-forward analysis.
                  Results reflect genuine strategy performance on historical data.
                </p>
              </div>
            </div>
          </div>
        )}

        {backtestMode === 'demo' && (
          <section className="rounded-2xl border border-border bg-surface shadow-card-soft">
            <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  <span>{statusLabel}</span>
                </div>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-3xl font-semibold text-text-base outline-none"
                >
                  {t('backtest.title')}
                </h1>
                <p className="max-w-xl text-sm text-text-secondary">{t('backtest.subtitle')}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleRun}
                  disabled={status === 'running'}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {t('backtest.actions.run')}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleReset}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t('backtest.actions.reset')}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Real Backtest Panel */}
        {backtestMode === 'real' && (
          <section className="rounded-2xl border border-border bg-surface shadow-sm">
            <BacktestPanel symbol={effectiveSymbol} timeframe={effectiveTimeframe} />
          </section>
        )}

        {/* Demo Backtest Configuration and Results */}
        {backtestMode === 'demo' && (
          <>
            <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-text-base">{t('backtest.config.heading')}</h2>
              </div>
              <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="block font-medium text-text-secondary">{t('backtest.config.fields.symbols')}</span>
                  <input
                    className={`input-field w-full ${errors.symbols ? 'border-danger' : ''}`}
                    value={config.symbols}
                    onChange={(event) => handleChange('symbols', event.target.value)}
                    disabled={status === 'running'}
                    placeholder="BTCUSDT, ETHUSDT, SOLUSDT"
                  />
                  {errors.symbols && <span className="text-xs text-danger">{errors.symbols}</span>}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-text-secondary">{t('backtest.config.fields.lookback')}</span>
                  <input
                    type="number"
                    className={`input-field w-full ${errors.lookback ? 'border-danger' : ''}`}
                    value={config.lookback}
                    onChange={(event) => handleChange('lookback', event.target.value)}
                    disabled={status === 'running'}
                    min={1}
                  />
                  {errors.lookback && <span className="text-xs text-danger">{errors.lookback}</span>}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-text-secondary">{t('backtest.config.fields.capital')}</span>
                  <input
                    type="number"
                    className={`input-field w-full ${errors.capital ? 'border-danger' : ''}`}
                    value={config.capital}
                    onChange={(event) => handleChange('capital', event.target.value)}
                    disabled={status === 'running'}
                    min={1000}
                    step={1000}
                  />
                  {errors.capital && <span className="text-xs text-danger">{errors.capital}</span>}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-text-secondary">{t('backtest.config.fields.risk')}</span>
                  <input
                    type="number"
                    className={`input-field w-full ${errors.risk ? 'border-danger' : ''}`}
                    value={config.risk}
                    onChange={(event) => handleChange('risk', event.target.value)}
                    disabled={status === 'running'}
                    min={0.1}
                    step={0.1}
                  />
                  {errors.risk && <span className="text-xs text-danger">{errors.risk}</span>}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-text-secondary">{t('backtest.config.fields.slippage')}</span>
                  <input
                    type="number"
                    className={`input-field w-full ${errors.slippage ? 'border-danger' : ''}`}
                    value={config.slippage}
                    onChange={(event) => handleChange('slippage', event.target.value)}
                    disabled={status === 'running'}
                    min={0}
                    step={0.1}
                  />
                  {errors.slippage && <span className="text-xs text-danger">{errors.slippage}</span>}
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-text-base">{t('backtest.metrics.heading')}</h2>
                <TrendingUp className="h-4 w-4 text-text-muted" aria-hidden="true" />
              </div>
              {metrics ? (
                <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
                  <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">{t('backtest.metrics.cagr')}</p>
                    <p className="mt-1 text-2xl font-semibold text-text-base tabular-nums">{fmt(metrics.cagr * 100, { maximumFractionDigits: 2 })}%</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">{t('backtest.metrics.sharpe')}</p>
                    <p className="mt-1 text-2xl font-semibold text-text-base tabular-nums">{fmt(metrics.sharpe, { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">{t('backtest.metrics.drawdown')}</p>
                    <p className="mt-1 text-2xl font-semibold text-text-base tabular-nums">{fmt(metrics.drawdown, { maximumFractionDigits: 2 })}%</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">{t('backtest.metrics.winRate')}</p>
                    <p className="mt-1 text-2xl font-semibold text-text-base tabular-nums">{fmt(metrics.winRate, { maximumFractionDigits: 2 })}%</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">{t('backtest.metrics.profitFactor')}</p>
                    <p className="mt-1 text-2xl font-semibold text-text-base tabular-nums">{fmt(metrics.profitFactor, { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">{t('backtest.metrics.trades')}</p>
                    <p className="mt-1 text-2xl font-semibold text-text-base tabular-nums">{fmt(metrics.trades)}</p>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-14 text-sm text-text-muted">{t('backtest.table.empty')}</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-text-base">{t('backtest.progress.heading')}</h2>
                <span className="text-sm font-medium text-primary-600">{progress}%</span>
              </div>
              <div className="space-y-5 px-6 py-6">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <ul className="space-y-4">
                  {(timeline || []).map(({ key, state, index }) => (
                    <li
                      key={key}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                        state === 'done'
                          ? 'border-primary-200 bg-primary-50'
                          : state === 'active'
                            ? 'border-primary-200 bg-surface-muted'
                            : 'border-border bg-surface'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${
                          state === 'done'
                            ? 'bg-primary-500 text-white'
                            : state === 'active'
                              ? 'bg-primary-100 text-primary-600'
                              : 'bg-surface-muted text-text-muted'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-text-base">{t(`backtest.timeline.${key}.title`)}</p>
                        <p className="text-xs text-text-muted">{t(`backtest.timeline.${key}.description`)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {status === 'completed' && (
              <div className="rounded-2xl border border-primary-200 bg-primary-50 px-5 py-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-text-base">{t('backtest.status.completed')}</p>
                    <p className="mt-1 text-xs text-text-muted">{fmt(results.length)} assets evaluated deterministically.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-text-base">{t('backtest.table.heading')}</h2>
            <Shield className="h-4 w-4 text-text-muted" aria-hidden="true" />
          </div>
          {results.length === 0 ? (
            <div className="px-6 py-14 text-sm text-text-muted">{t('backtest.table.empty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.rank')}</th>
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.symbol')}</th>
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.price')}</th>
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.successRate')}</th>
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.risk')}</th>
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.whaleActivity')}</th>
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.smartMoney')}</th>
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.elliottWave')}</th>
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.priceAction')}</th>
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.ict')}</th>
                    <th className="px-4 py-3 font-medium">PNL %</th>
                    <th className="px-4 py-3 font-medium">{t('backtest.table.columns.finalScore')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(results || []).map((result, index) => (
                    <tr key={result.symbol} className="border-b border-border/60">
                      <td className="px-4 py-3 text-text-secondary">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-text-base">{result.symbol}</td>
                      <td className="px-4 py-3 text-text-base tabular-nums">${fmt(result.price, { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-success font-semibold tabular-nums">{fmt(result.successRate, { maximumFractionDigits: 1 })}%</td>
                      <td className="px-4 py-3 text-warning font-semibold tabular-nums">{fmt(result.risk, { maximumFractionDigits: 1 })}%</td>
                      <td className="px-4 py-3 text-text-secondary">{result.whaleActivity}</td>
                      <td className="px-4 py-3 text-text-base tabular-nums">{fmt(result.smartMoney, { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-text-secondary">{result.elliottWave}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            result.priceAction === 'Bullish'
                              ? 'bg-success/20 text-success'
                              : result.priceAction === 'Bearish'
                                ? 'bg-danger/20 text-danger'
                                : 'bg-surface-muted text-text-muted'
                          }`}
                        >
                          {result.priceAction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{result.ict}</td>
                      <td className={`px-4 py-3 font-semibold tabular-nums ${result.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {fmt(result.pnl, { maximumFractionDigits: 1 })}%
                      </td>
                      <td className="px-4 py-3 font-semibold text-text-base tabular-nums">{fmt(result.finalScore, { maximumFractionDigits: 1 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default BacktestView;
