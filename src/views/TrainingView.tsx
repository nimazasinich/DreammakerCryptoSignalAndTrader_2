import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Brain,
  CheckCircle,
  Clock,
  Database,
  Play,
  Square,
} from 'lucide-react';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { t } from '../i18n';
import fmt from '../lib/formatNumber';
import createPseudoRandom from '../lib/pseudoRandom';
import { MLTrainingPanel } from '../components/ml/MLTrainingPanel';

type TrainingStatus = 'idle' | 'running' | 'completed';

interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  optimizer: string;
  datasetSize: number;
}

interface TrainingMetrics {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
  learningRate: number;
  timeElapsed: number;
  timeRemaining: number;
}

interface ModelInfo {
  name: string;
  createdAt: string;
  accuracy: number;
  totalTrades: number;
  winRate: number;
}

const DEFAULT_CONFIG: TrainingConfig = {
  epochs: 120,
  batchSize: 64,
  learningRate: 0.001,
  optimizer: 'adamw',
  datasetSize: 50000,
};

const OPTIMIZERS = ['adam', 'adamw', 'rmsprop', 'sgd'];

const TRAINING_STEPS = [
  { key: 'data', icon: Database },
  { key: 'optimise', icon: Brain },
  { key: 'train', icon: Activity },
  { key: 'evaluate', icon: CheckCircle },
] as const;

type ConfigErrors = Partial<Record<keyof TrainingConfig, string>>;

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const validateConfig = (config: TrainingConfig): ConfigErrors => {
  const errors: ConfigErrors = {};

  if (!config.epochs) {
    errors.epochs = t('training.config.errors.required');
  } else if (config.epochs <= 0) {
    errors.epochs = t('training.config.errors.positive');
  }

  if (!config.batchSize) {
    errors.batchSize = t('training.config.errors.required');
  } else if (config.batchSize <= 0) {
    errors.batchSize = t('training.config.errors.positive');
  }

  if (!config.datasetSize) {
    errors.datasetSize = t('training.config.errors.required');
  } else if (config.datasetSize <= 0) {
    errors.datasetSize = t('training.config.errors.positive');
  }

  if (!Number.isFinite(config.learningRate)) {
    errors.learningRate = t('training.config.errors.required');
  } else if (config.learningRate <= 0 || config.learningRate >= 1) {
    errors.learningRate = t('training.config.errors.learningRateRange');
  }

  if (!config.optimizer) {
    errors.optimizer = t('training.config.errors.required');
  }

  return errors;
};

interface SparklineProps {
  label: string;
  data: number[];
  color: string;
  formatter?: (value: number) => string;
}

const Sparkline: React.FC<SparklineProps> = ({ label, data, color, formatter }) => {
  if (!data.length) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-text-muted">
        {t('training.savedModels.empty')}
      </div>
    );
  }

  const recent = data.slice(-60);
  const max = Math.max(...recent);
  const min = Math.min(...recent);
  const range = max - min || 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-text-secondary">
        <span>{label}</span>
        <span className="font-semibold text-text-base">
          {formatter ? formatter(recent[recent.length - 1]) : fmt(recent[recent.length - 1])}
        </span>
      </div>
      <div className="flex h-32 items-end gap-1 rounded-lg border border-border bg-surface-subtle px-2 py-3">
        {(recent || []).map((value, index) => {
          const height = ((value - min) / range) * 100;
          return (
            <div
              key={`${label}-${index}`}
              className="flex-1 rounded-t-lg"
              style={{
                height: `${height}%`,
                minWidth: '2px',
                background: `linear-gradient(180deg, ${color} 0%, ${color}aa 100%)`,
              }}
              title={(formatter ? formatter(value) : fmt(value)) || ''}
            />
          );
        })}
      </div>
    </div>
  );
};

const TrainingView: React.FC = () => {
  const [config, setConfig] = useState<TrainingConfig>(DEFAULT_CONFIG);
  const [errors, setErrors] = useState<ConfigErrors>({});
  const [status, setStatus] = useState<TrainingStatus>('idle');
  const [metrics, setMetrics] = useState<TrainingMetrics>({
    epoch: 0,
    totalEpochs: DEFAULT_CONFIG.epochs,
    loss: 0,
    accuracy: 0,
    valLoss: 0,
    valAccuracy: 0,
    learningRate: DEFAULT_CONFIG.learningRate,
    timeElapsed: 0,
    timeRemaining: 0,
  });
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [accuracyHistory, setAccuracyHistory] = useState<number[]>([]);
  const [savedModels, setSavedModels] = useState<ModelInfo[]>([]);

  const timerRef = useRef<number | null>(null);

  const progress = metrics.totalEpochs ? metrics.epoch / metrics.totalEpochs : 0;
  const progressPercent = Math.min(100, Math.round(progress * 100));

  const stepStates = useMemo(() => {
    return (TRAINING_STEPS || []).map((step, index) => {
      const Icon = step.icon;
      const thresholdStart = index / TRAINING_STEPS.length;
      const thresholdEnd = (index + 1) / TRAINING_STEPS.length;
      const state = progress >= thresholdEnd ? 'done' : progress >= thresholdStart ? 'active' : 'pending';

      return {
        key: step.key,
        Icon,
        state,
      };
    });
  }, [progress]);

  const stopTraining = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus('idle');
  };

  useEffect(() => () => stopTraining(), []);

  const simulateTraining = (cfg: TrainingConfig) => {
    const seed =
      cfg.epochs * 97 +
      cfg.batchSize * 17 +
      Math.round(cfg.learningRate * 100000) +
      cfg.datasetSize;
    const rng = createPseudoRandom(seed);
    const startedAt = Date.now();
    let epoch = 0;

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      epoch += 1;
      const pct = Math.min(1, epoch / cfg.epochs);
      const baseLoss = 2.4 * Math.exp(-pct * 3) + 0.05;
      const loss = Math.max(0.02, Number((baseLoss + (rng() - 0.5) * 0.04).toFixed(4)));
      const accuracy = Math.min(0.995, 0.55 + pct * 0.42 + (rng() - 0.5) * 0.015);
      const valLoss = Math.max(0.02, Number((loss * (0.98 + (rng() - 0.5) * 0.03)).toFixed(4)));
      const valAccuracy = Math.min(0.995, accuracy * (0.97 + (rng() - 0.5) * 0.015));

      const elapsed = (Date.now() - startedAt) / 1000;
      const avgEpochTime = elapsed / epoch;
      const remaining = Math.max(0, (cfg.epochs - epoch) * avgEpochTime);

      setMetrics({
        epoch,
        totalEpochs: cfg.epochs,
        loss,
        accuracy,
        valLoss,
        valAccuracy,
        learningRate: cfg.learningRate,
        timeElapsed: elapsed,
        timeRemaining: remaining,
      });

      setLossHistory((prev) => [...prev.slice(-199), loss]);
      setAccuracyHistory((prev) => [...prev.slice(-199), accuracy]);

      if (epoch >= cfg.epochs) {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setStatus('completed');
        setSavedModels((prev) => [
          {
            name: `AI-Model-${prev.length + 1}`,
            createdAt: new Date().toISOString(),
            accuracy: accuracy * 100,
            totalTrades: 800 + Math.round(rng() * 600),
            winRate: 55 + rng() * 25,
          },
          ...prev,
        ]);
      }
    }, 200);
  };

  const handleStart = () => {
    const validation = validateConfig(config);
    setErrors(validation);

    if (Object.keys(validation).length) {
      return;
    }

    setStatus('running');
    setLossHistory([]);
    setAccuracyHistory([]);
    setMetrics((prev) => ({
      ...prev,
      epoch: 0,
      totalEpochs: config.epochs,
      learningRate: config.learningRate,
    }));
    simulateTraining(config);
  };

  const handleConfigChange = <K extends keyof TrainingConfig>(key: K, value: number | string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'number' ? Number(value) : value,
    }));
  };

  const currentStatusLabel =
    status === 'running'
      ? t('training.status.running')
      : status === 'completed'
        ? t('training.status.completed')
        : t('training.status.idle');

  return (
    <ErrorBoundary>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-12">
        <section className="rounded-2xl border border-border bg-surface shadow-card-soft">
          <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                <Brain className="h-4 w-4" aria-hidden="true" />
                <span>{currentStatusLabel}</span>
              </div>
              <h1 className="text-3xl font-semibold text-text-base">{t('training.title')}</h1>
              <p className="max-w-xl text-sm text-text-secondary">{t('training.subtitle')}</p>
            </div>
            <div className="flex items-center gap-3">
              {status !== 'running' ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleStart}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {t('training.actions.start')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={stopTraining}
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  {t('training.actions.stop')}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{t('training.progress.epoch')}</p>
            <div className="mt-2 flex items-end gap-1 text-2xl font-semibold text-text-base">
              <span className="tabular-nums">{metrics.epoch}</span>
              <span className="text-base text-text-muted">/ {metrics.totalEpochs}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{t('training.metrics.loss')}</p>
            <div className="mt-2 text-2xl font-semibold text-text-base tabular-nums">{fmt(metrics.loss, {
              minimumFractionDigits: 4,
              maximumFractionDigits: 4,
            })}</div>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{t('training.metrics.accuracy')}</p>
            <div className="mt-2 text-2xl font-semibold text-text-base tabular-nums">{fmt(metrics.accuracy * 100, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}%</div>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">LR</p>
            <div className="mt-2 text-2xl font-semibold text-text-base tabular-nums">{fmt(metrics.learningRate, {
              minimumFractionDigits: 5,
              maximumFractionDigits: 5,
            })}</div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-text-base">{t('training.config.heading')}</h2>
                <p className="mt-1 text-sm text-text-muted">{t('training.config.description')}</p>
              </div>
              <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-text-secondary">{t('training.config.fields.epochs')}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className={`input-field w-full ${errors.epochs ? 'border-danger' : ''}`}
                    value={config.epochs}
                    onChange={(event) => handleConfigChange('epochs', event.target.value)}
                    disabled={status === 'running'}
                    min={1}
                  />
                  {errors.epochs && <span className="text-xs text-danger">{errors.epochs}</span>}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-text-secondary">{t('training.config.fields.batchSize')}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className={`input-field w-full ${errors.batchSize ? 'border-danger' : ''}`}
                    value={config.batchSize}
                    onChange={(event) => handleConfigChange('batchSize', event.target.value)}
                    disabled={status === 'running'}
                    min={1}
                  />
                  {errors.batchSize && <span className="text-xs text-danger">{errors.batchSize}</span>}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-text-secondary">{t('training.config.fields.learningRate')}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.0001"
                    className={`input-field w-full ${errors.learningRate ? 'border-danger' : ''}`}
                    value={config.learningRate}
                    onChange={(event) => handleConfigChange('learningRate', event.target.value)}
                    disabled={status === 'running'}
                    min={0}
                    max={1}
                  />
                  {errors.learningRate && <span className="text-xs text-danger">{errors.learningRate}</span>}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-text-secondary">{t('training.config.fields.optimizer')}</span>
                  <select
                    className={`input-field w-full ${errors.optimizer ? 'border-danger' : ''}`}
                    value={config.optimizer}
                    onChange={(event) => handleConfigChange('optimizer', event.target.value)}
                    disabled={status === 'running'}
                  >
                    {(OPTIMIZERS || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  {errors.optimizer && <span className="text-xs text-danger">{errors.optimizer}</span>}
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="block font-medium text-text-secondary">{t('training.config.fields.datasetSize')}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className={`input-field w-full ${errors.datasetSize ? 'border-danger' : ''}`}
                    value={config.datasetSize}
                    onChange={(event) => handleConfigChange('datasetSize', event.target.value)}
                    disabled={status === 'running'}
                    min={1}
                  />
                  {errors.datasetSize && <span className="text-xs text-danger">{errors.datasetSize}</span>}
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-text-base">{t('training.progress.heading')}</h2>
                <span className="text-sm font-medium text-primary-600">{progressPercent}%</span>
              </div>
              <div className="space-y-6 px-6 py-6">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                    aria-hidden="true"
                  />
                </div>
                <dl className="grid gap-4 text-sm text-text-secondary md:grid-cols-3">
                  <div className="space-y-1">
                    <dt className="flex items-center gap-2 font-medium">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      {t('training.progress.elapsed')}
                    </dt>
                    <dd className="tabular-nums text-text-base">{formatDuration(metrics.timeElapsed)}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="flex items-center gap-2 font-medium">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      {t('training.progress.remaining')}
                    </dt>
                    <dd className="tabular-nums text-text-base">{formatDuration(metrics.timeRemaining)}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="flex items-center gap-2 font-medium">
                      <Activity className="h-4 w-4" aria-hidden="true" />
                      {t('training.metrics.heading')}
                    </dt>
                    <dd className="tabular-nums text-text-base">{fmt(lossHistory.at(-1) ?? 0, {
                      maximumFractionDigits: 4,
                    })} / {fmt((accuracyHistory.at(-1) ?? 0) * 100, {
                      maximumFractionDigits: 2,
                    })}%</dd>
                  </div>
                </dl>
                <div className="grid gap-4 md:grid-cols-2">
                  <Sparkline
                    label={t('training.charts.loss')}
                    data={lossHistory}
                    color="#c084fc"
                    formatter={(value) => fmt(value, { maximumFractionDigits: 4 })}
                  />
                  <Sparkline
                    label={t('training.charts.accuracy')}
                    data={accuracyHistory}
                    color="#7dd3fc"
                    formatter={(value) => `${fmt(value * 100, { maximumFractionDigits: 2 })}%`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-text-base">Workflow</h2>
              </div>
              <ul className="space-y-4 px-6 py-6">
                {(stepStates || []).map(({ key, Icon, state }) => (
                  <li
                    key={key}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${
                      state === 'done'
                        ? 'border-primary-200 bg-primary-50'
                        : state === 'active'
                          ? 'border-primary-200 bg-surface-muted'
                          : 'border-border bg-surface'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        state === 'done'
                          ? 'bg-primary-500 text-white'
                          : state === 'active'
                            ? 'bg-primary-100 text-primary-600'
                            : 'bg-surface-muted text-text-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-base">{t(`training.steps.${key}.title`)}</p>
                      <p className="text-xs text-text-muted">{t(`training.steps.${key}.description`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {status === 'completed' && (
              <div className="rounded-2xl border border-primary-200 bg-primary-50 px-5 py-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-text-base">{t('training.summary.completedTitle')}</p>
                    <p className="mt-1 text-xs text-text-muted">{t('training.summary.completedSubtitle')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-text-base">{t('training.savedModels.heading')}</h2>
            <BarChart3 className="h-4 w-4 text-text-muted" aria-hidden="true" />
          </div>
          {savedModels.length === 0 ? (
            <div className="px-6 py-10 text-sm text-text-muted">{t('training.savedModels.empty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                    <th className="px-6 py-3 font-medium">{t('training.savedModels.model')}</th>
                    <th className="px-6 py-3 font-medium">{t('training.savedModels.created')}</th>
                    <th className="px-6 py-3 font-medium">{t('training.savedModels.accuracy')}</th>
                    <th className="px-6 py-3 font-medium">{t('training.savedModels.winRate')}</th>
                    <th className="px-6 py-3 font-medium">{t('training.savedModels.trades')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(savedModels || []).map((model) => (
                    <tr key={model.name} className="border-b border-border/60">
                      <td className="px-6 py-3 font-medium text-text-base">{model.name}</td>
                      <td className="px-6 py-3 text-text-secondary">
                        {new Date(model.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-3 text-text-base tabular-nums">
                        {fmt(model.accuracy, { maximumFractionDigits: 2 })}%
                      </td>
                      <td className="px-6 py-3 text-text-base tabular-nums">
                        {fmt(model.winRate, { maximumFractionDigits: 2 })}%
                      </td>
                      <td className="px-6 py-3 text-text-base tabular-nums">{fmt(model.totalTrades)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Real ML Training & Backtesting */}
        <section>
          <MLTrainingPanel />
        </section>
      </div>
    </ErrorBoundary>
  );
};

export default TrainingView;
