/**
 * Strategy Insights View
 *
 * Displays the output of Strategy 1 → 2 → 3 pipeline with:
 * - Global smart scoring overview
 * - Strategy 1/2/3 tables with category breakdown
 * - Adaptive weight status
 */

import React, { useEffect, useState } from 'react';
import {
  PlayCircle,
  TrendingUp,
  Target,
  Award,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings,
  Radio,
  Zap,
  Shield,
  Power
} from 'lucide-react';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { StrategySkeleton } from '../components/ui/Skeleton';
import { useStrategyPipeline } from '../hooks/useStrategyPipeline';
import {
  Strategy1Result,
  Strategy2Result,
  Strategy3Result
} from '../types/strategyPipeline';
import fmt from '../lib/formatNumber';

const StrategyInsightsView: React.FC = () => {
  const {
    data,
    isLoading,
    error,
    isAdaptiveEnabled,
    runDefaultPipeline,
    reset
  } = useStrategyPipeline();

  // Auto-load on mount (optional - can be removed if you want user to trigger manually)
  // useEffect(() => {
  //   runDefaultPipeline();
  // }, [runDefaultPipeline]);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Strategy Insights
            </h1>
            <p className="text-muted">
              HTS Strategy Pipeline with Smart Scoring Dashboard
            </p>
          </div>

          <div className="flex gap-3">
            {data && (
              <button
                onClick={reset}
                className="px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface/80 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={runDefaultPipeline}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Pipeline...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Run Default Pipeline
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-500">Pipeline Error</h3>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <StrategySkeleton />}

        {/* Empty State */}
        {!data && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-lg">
            <BarChart3 className="w-16 h-16 text-muted/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Pipeline Data
            </h3>
            <p className="text-muted text-center max-w-md">
              Click "Run Default Pipeline" to execute Strategy 1 → 2 → 3 and view smart scoring insights
            </p>
          </div>
        )}

        {/* System Status Panel - Always visible */}
        <SystemStatusPanel />

        {/* Results */}
        {data && !isLoading && (
          <>
            {/* Global Scoring Overview */}
            <ScoringOverviewSection
              scoring={data.scoring}
              isAdaptiveEnabled={isAdaptiveEnabled}
            />

            {/* Live Score Section */}
            <LiveScoreSection />

            {/* Tuning Result Panel */}
            <TuningResultPanel />

            {/* Strategy Tables */}
            <Strategy1Table data={data.strategy1.symbols} meta={data.strategy1.meta} />
            <Strategy2Table data={data.strategy2.symbols} meta={data.strategy2.meta} />
            <Strategy3Table data={data.strategy3.symbols} meta={data.strategy3.meta} />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

// ==========================================
// Scoring Overview Section
// ==========================================
interface ScoringOverviewSectionProps {
  scoring: any;
  isAdaptiveEnabled: boolean;
}

const ScoringOverviewSection: React.FC<ScoringOverviewSectionProps> = ({
  scoring,
  isAdaptiveEnabled
}) => {
  const telemetry = scoring.telemetrySummary;
  const effectiveWeights = scoring.effectiveWeights;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <Activity className="w-5 h-5 text-accent" />
        Smart Scoring Overview
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Adaptive Mode Card */}
        <div className="p-4 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Adaptive Mode</span>
            {isAdaptiveEnabled ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-muted" />
            )}
          </div>
          <div className="text-2xl font-bold text-foreground">
            {isAdaptiveEnabled ? 'ON' : 'OFF'}
          </div>
          <div className="text-xs text-muted mt-1">
            {effectiveWeights.isAdaptive ? 'Using adaptive weights' : 'Using static weights'}
          </div>
        </div>

        {/* Total Signals Card */}
        {telemetry && (
          <div className="p-4 bg-surface border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">Total Signals</span>
              <BarChart3 className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {telemetry.totalSignals || 0}
            </div>
            <div className="text-xs text-muted mt-1">
              Tracked in telemetry
            </div>
          </div>
        )}

        {/* Win Rate Card */}
        {telemetry && (
          <div className="p-4 bg-surface border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">Win Rate</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {fmt((telemetry.winRate || 0) * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </div>
            <div className="text-xs text-muted mt-1">
              Overall performance
            </div>
          </div>
        )}

        {/* Best Category Card */}
        {scoring.bestCategory && (
          <div className="p-4 bg-surface border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">Best Category</span>
              <Award className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-foreground uppercase">
              {scoring.bestCategory.name}
            </div>
            <div className="text-xs text-muted mt-1">
              {fmt(scoring.bestCategory.winRate * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% win rate
            </div>
          </div>
        )}
      </div>

      {/* Category Weights */}
      <div className="p-4 bg-surface border border-border rounded-lg">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Category Weights
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(effectiveWeights.categories).map(([name, weight]) => (
            <div key={name}>
              <div className="text-xs text-muted uppercase mb-1">{name}</div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${(weight as number) * 100}%` }}
                />
              </div>
              <div className="text-xs text-foreground mt-1">
                {fmt((weight as number) * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Strategy 1 Table
// ==========================================
interface Strategy1TableProps {
  data: Strategy1Result[];
  meta: any;
}

const Strategy1Table: React.FC<Strategy1TableProps> = ({ data, meta }) => {
  if (data.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          Strategy 1 - Wide Universe Scanning
        </h2>
        <div className="text-sm text-muted">
          {data.length} symbols · {meta.processingTimeMs}ms
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">Symbol</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">Score</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase">Action</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">Core</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">SMC</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">Patterns</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">Sentiment</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">ML</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row) => (
                <tr key={row.symbol} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted">#{row.rank}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{row.symbol}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={getScoreColor(row.finalStrategyScore)}>
                      {fmt(row.finalStrategyScore, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActionBadge action={row.action} />
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-muted">{fmt(row.core, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted">{fmt(row.smc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted">{fmt(row.patterns, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted">{fmt(row.sentiment, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted">{fmt(row.ml, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Strategy 2 Table
// ==========================================
interface Strategy2TableProps {
  data: Strategy2Result[];
  meta: any;
}

const Strategy2Table: React.FC<Strategy2TableProps> = ({ data, meta }) => {
  if (data.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Strategy 2 - Refined Set with ETA
        </h2>
        <div className="text-sm text-muted">
          {data.length} symbols · {meta.processingTimeMs}ms
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">Symbol</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">Score</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">ETA (min)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase">Action</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">Core</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">SMC</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">Patterns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row) => (
                <tr key={row.symbol} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted">#{row.rank}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{row.symbol}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={getScoreColor(row.finalStrategyScore)}>
                      {fmt(row.finalStrategyScore, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-accent font-medium">
                    {row.etaMinutes}m
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActionBadge action={row.action} />
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-muted">{fmt(row.core, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted">{fmt(row.smc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted">{fmt(row.patterns, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Strategy 3 Table
// ==========================================
interface Strategy3TableProps {
  data: Strategy3Result[];
  meta: any;
}

const Strategy3Table: React.FC<Strategy3TableProps> = ({ data, meta }) => {
  if (data.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          Strategy 3 - Top Picks with Entry Plans
        </h2>
        <div className="text-sm text-muted">
          {data.length} symbols · {meta.processingTimeMs}ms
        </div>
      </div>

      <div className="space-y-4">
        {data.map((row) => (
          <div key={row.symbol} className="p-4 bg-surface border border-border rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-foreground">#{row.rank}</span>
                  <span className="text-xl font-semibold text-foreground">{row.symbol}</span>
                  <ActionBadge action={row.bias} />
                </div>
                <div className="mt-1 text-sm text-muted">
                  Score: <span className={getScoreColor(row.finalStrategyScore)}>
                    {fmt(row.finalStrategyScore, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted">Risk-Reward</div>
                <div className="text-lg font-semibold text-accent">1:{row.risk.rr}</div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              <CategoryPill label="Core" value={row.core} />
              <CategoryPill label="SMC" value={row.smc} />
              <CategoryPill label="Patterns" value={row.patterns} />
              <CategoryPill label="Sentiment" value={row.sentiment} />
              <CategoryPill label="ML" value={row.ml} />
            </div>

            {/* Entry Levels */}
            <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-muted/20 rounded-lg">
              <div>
                <div className="text-xs text-muted">Conservative</div>
                <div className="text-sm font-medium text-foreground">{row.entryLevels.conservative}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Base</div>
                <div className="text-sm font-medium text-accent">{row.entryLevels.base}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Aggressive</div>
                <div className="text-sm font-medium text-foreground">{row.entryLevels.aggressive}</div>
              </div>
            </div>

            {/* Summary */}
            <div className="text-xs text-muted border-t border-border pt-3">
              {row.summary}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// Tuning Result Panel
// ==========================================

const TuningResultPanel: React.FC = () => {
  const [tuningResult, setTuningResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatestTuning = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tuning/latest');
      const data = await response.json();

      if (data.success && data.result) {
        setTuningResult(data.result);
      } else {
        setTuningResult(null);
        setError('No tuning runs found');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!tuningResult && !loading && !error) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent" />
            Auto-Tuning Results
          </h3>
        </div>
        <button
          onClick={loadLatestTuning}
          className="px-3 py-2 bg-accent text-accent-foreground rounded-md text-sm hover:bg-accent/90 transition-colors"
        >
          Load Latest Tuning Result
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          <span className="text-sm text-muted">Loading tuning result...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg">
        <div className="flex items-center gap-2 text-muted">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!tuningResult) return null;

  const baseline = tuningResult.baselineMetrics;
  const best = tuningResult.bestCandidate?.metrics;
  const metric = tuningResult.metric;

  // Calculate improvement
  let improvement: number | null = null;
  let improvementText = 'N/A';

  if (baseline && best && baseline[metric] !== null && best[metric] !== null) {
    const baseValue = baseline[metric] as number;
    const bestValue = best[metric] as number;
    improvement = bestValue - baseValue;

    if (improvement > 0) {
      improvementText = `+${fmt(improvement, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
    } else if (improvement < 0) {
      improvementText = fmt(improvement, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      improvementText = 'No change';
    }
  }

  return (
    <div className="p-4 bg-surface border border-border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-4 h-4 text-accent" />
          Latest Tuning Result
        </h3>
        <div className="text-xs text-muted">
          {tuningResult.mode.toUpperCase()} mode · {tuningResult.candidatesTested} candidates tested
        </div>
      </div>

      {tuningResult.error ? (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
          <div className="text-sm text-red-500">Error: {tuningResult.error}</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Metric */}
          <div>
            <div className="text-xs text-muted uppercase mb-1">Metric</div>
            <div className="text-sm font-medium text-foreground">{metric}</div>
          </div>

          {/* Baseline */}
          {baseline && baseline[metric] !== null ? (
            <div>
              <div className="text-xs text-muted uppercase mb-1">Baseline</div>
              <div className="text-sm font-medium text-foreground">
                {fmt(baseline[metric] as number, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs text-muted uppercase mb-1">Baseline</div>
              <div className="text-sm text-muted">No data</div>
            </div>
          )}

          {/* Best */}
          {best && best[metric] !== null ? (
            <div>
              <div className="text-xs text-muted uppercase mb-1">Tuned</div>
              <div className={`text-sm font-medium ${improvement && improvement > 0 ? 'text-green-500' : 'text-foreground'}`}>
                {fmt(best[metric] as number, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                {improvement !== null && (
                  <span className="text-xs ml-2">({improvementText})</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs text-muted uppercase mb-1">Tuned</div>
              <div className="text-sm text-muted">No valid candidate</div>
            </div>
          )}
        </div>
      )}

      {!best && !tuningResult.error && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
          <div className="text-xs text-yellow-600">
            No reliable data (insufficient trades or history)
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// Helper Components
// ==========================================

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const colors = {
    BUY: 'bg-green-500/20 text-green-500 border-green-500/30',
    LONG: 'bg-green-500/20 text-green-500 border-green-500/30',
    SELL: 'bg-red-500/20 text-red-500 border-red-500/30',
    SHORT: 'bg-red-500/20 text-red-500 border-red-500/30',
    HOLD: 'bg-muted/50 text-muted border-border'
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border ${
        colors[action as keyof typeof colors] || colors.HOLD
      }`}
    >
      {action}
    </span>
  );
};

const CategoryPill: React.FC<{ label: string; value: number | null | undefined }> = ({ label, value }) => {
  return (
    <div className="text-center p-2 bg-muted/30 rounded-lg">
      <div className="text-xs text-muted uppercase">{label}</div>
      <div className={`text-sm font-semibold ${value !== null && value !== undefined ? getScoreColor(value) : 'text-muted'}`}>
        {value !== null && value !== undefined
          ? fmt(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : 'No data'}
      </div>
    </div>
  );
};

// ==========================================
// Live Score Section
// ==========================================
const LiveScoreSection: React.FC = () => {
  const [liveScore, setLiveScore] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');

  const fetchLiveScore = async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/scoring/live/${symbol}?timeframe=1h`);
      const data = await response.json();

      if (data.success && data.data) {
        setLiveScore(data.data);
      } else {
        setError('Failed to fetch live score');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveScore(selectedSymbol);
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchLiveScore(selectedSymbol);
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Radio className="w-5 h-5 text-accent animate-pulse" />
          Live Scoring
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm"
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="BNBUSDT">BNB/USDT</option>
            <option value="ADAUSDT">ADA/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
          </select>
          <button
            onClick={() => fetchLiveScore(selectedSymbol)}
            disabled={loading}
            className="px-3 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="text-sm text-red-500">Error: {error}</div>
        </div>
      )}

      {loading && !liveScore && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {liveScore && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Final Score */}
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">Final Score</span>
                <Zap className="w-4 h-4 text-accent" />
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(liveScore.finalScore || 0)}`}>
                {liveScore.finalScore !== null
                  ? fmt(liveScore.finalScore, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                  : 'N/A'}
              </div>
              <div className="text-xs text-muted mt-1">
                {liveScore.action || 'No action'}
              </div>
            </div>

            {/* Confidence */}
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">Confidence</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-foreground">
                {liveScore.confidence !== null
                  ? `${fmt(liveScore.confidence * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                  : 'N/A'}
              </div>
              <div className="text-xs text-muted mt-1">
                Based on {liveScore.meta?.candleCount || 0} candles
              </div>
            </div>

            {/* Data Quality */}
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">Data Quality</span>
                <Activity className="w-4 h-4 text-accent" />
              </div>
              <div className="text-3xl font-bold text-foreground">
                {liveScore.meta?.dataSource === 'real' ? (
                  <span className="text-green-500">REAL</span>
                ) : (
                  <span className="text-orange-500">MOCK</span>
                )}
              </div>
              <div className="text-xs text-muted mt-1">
                {liveScore.meta?.errors?.length || 0} error(s)
              </div>
            </div>
          </div>

          {/* Category Scores */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Category Breakdown</h3>
            <div className="grid grid-cols-5 gap-3">
              <CategoryPill
                label="Core"
                value={liveScore.categoryScores?.core}
              />
              <CategoryPill
                label="SMC"
                value={liveScore.categoryScores?.smc}
              />
              <CategoryPill
                label="Patterns"
                value={liveScore.categoryScores?.patterns}
              />
              <CategoryPill
                label="Sentiment"
                value={liveScore.categoryScores?.sentiment}
              />
              <CategoryPill
                label="ML"
                value={liveScore.categoryScores?.ml}
              />
            </div>
          </div>

          {/* Detector Scores */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Detector Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <DetectorBadge
                label="Smart Money"
                score={liveScore.detectorScores?.smartMoney?.score}
              />
              <DetectorBadge
                label="Elliott"
                score={liveScore.detectorScores?.elliott?.score}
              />
              <DetectorBadge
                label="Harmonic"
                score={liveScore.detectorScores?.harmonic?.score}
              />
              <DetectorBadge
                label="Sentiment"
                score={liveScore.detectorScores?.sentiment}
              />
              <DetectorBadge
                label="Whale Activity"
                score={liveScore.detectorScores?.whaleActivity}
              />
            </div>
          </div>

          {/* Errors */}
          {liveScore.meta?.errors && liveScore.meta.errors.length > 0 && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="text-xs font-semibold text-orange-500 mb-1">
                Data Collection Issues:
              </div>
              <ul className="text-xs text-orange-400 list-disc list-inside">
                {liveScore.meta.errors.map((err: string, idx: number) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Timestamp */}
          <div className="mt-4 text-xs text-muted text-right">
            Last updated: {new Date(liveScore.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// System Status Panel
// ==========================================
const SystemStatusPanel: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSystemStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/system/status');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    // Refresh every 30 seconds
    const interval = setInterval(loadSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          <span className="text-sm text-muted">Loading system status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-500">Failed to load system status: {error}</span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const tradingHealthColor = {
    ok: 'text-green-500',
    unreachable: 'text-red-500',
    off: 'text-muted',
    unknown: 'text-yellow-500'
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          System Status
        </h2>
        <button
          onClick={loadSystemStatus}
          className="p-2 hover:bg-surface/80 rounded-lg transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="w-4 h-4 text-muted hover:text-accent" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Environment */}
        <div className="p-4 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Environment</span>
            <Settings className="w-4 h-4 text-muted" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {status.environment}
          </div>
          <div className="text-xs text-muted mt-1">
            Current mode
          </div>
        </div>

        {/* Trading Mode */}
        <div className="p-4 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Trading Mode</span>
            <Power className="w-4 h-4 text-muted" />
          </div>
          <div className="text-lg font-bold text-foreground">
            {status.trading.mode}
          </div>
          <div className={`text-xs mt-1 font-medium ${tradingHealthColor[status.trading.health as keyof typeof tradingHealthColor]}`}>
            {status.trading.health.toUpperCase()}
          </div>
        </div>

        {/* Live Scoring */}
        <div className="p-4 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Live Scoring</span>
            <Radio className="w-4 h-4 text-muted" />
          </div>
          <div className="text-lg font-bold text-foreground">
            {status.features.liveScoring ? 'ON' : 'OFF'}
          </div>
          <div className="text-xs text-muted mt-1">
            {status.liveScoring.streaming ? 'Streaming' : 'Not streaming'}
          </div>
        </div>

        {/* Auto-Trade */}
        <div className="p-4 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Auto-Trade</span>
            <Zap className="w-4 h-4 text-muted" />
          </div>
          <div className="text-lg font-bold text-foreground">
            {status.features.autoTrade ? 'ON' : 'OFF'}
          </div>
          <div className="text-xs text-muted mt-1">
            Manual: {status.features.manualTrade ? 'ON' : 'OFF'}
          </div>
        </div>

        {/* Tuning Status */}
        <div className="p-4 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Last Tuning</span>
            <Settings className="w-4 h-4 text-muted" />
          </div>
          <div className="text-lg font-bold text-foreground">
            {status.tuning.hasRun ? (
              status.tuning.lastMetric.value !== null
                ? fmt(status.tuning.lastMetric.value, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                : 'N/A'
            ) : (
              'N/A'
            )}
          </div>
          <div className="text-xs text-muted mt-1">
            {status.tuning.hasRun && status.tuning.lastMetric.metric
              ? status.tuning.lastMetric.metric
              : 'No runs'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Helper Components (for Live Score)
// ==========================================
const DetectorBadge: React.FC<{ label: string; score: number | null | undefined }> = ({
  label,
  score
}) => {
  return (
    <div className="text-center p-2 bg-muted/30 rounded-lg">
      <div className="text-xs text-muted uppercase">{label}</div>
      <div className={`text-sm font-semibold ${score !== null && score !== undefined ? getScoreColor(score) : 'text-muted'}`}>
        {score !== null && score !== undefined
          ? fmt(score, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : 'No data'}
      </div>
    </div>
  );
};

// ==========================================
// Helper Functions
// ==========================================

function getScoreColor(score: number): string {
  if (score >= 0.7) return 'text-green-500';
  if (score >= 0.5) return 'text-yellow-500';
  if (score >= 0.3) return 'text-orange-500';
  return 'text-red-500';
}

export default StrategyInsightsView;
