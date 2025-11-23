import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AlertTriangle, Activity, RefreshCw, Database, Clock } from 'lucide-react';
import { errorTracker } from '../lib/errorTracking';
import { performanceMonitor } from '../lib/performanceMonitor';
import { getRegisteredCacheStats } from '../lib/cache';
import { getHealthHistory, subscribeToHealthHistory, HealthHistoryEntry } from '../lib/useHealthCheck';
import { getInFlightRequestCount, getInFlightRequestKeys } from '../lib/requestDeduplication';

const MONITORING_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MONITORING_VIEW === 'true';

const useErrors = (limit: number) =>
  useSyncExternalStore(
    (listener) => errorTracker.subscribe(listener),
    () => errorTracker.getRecentErrors(limit),
    () => errorTracker.getRecentErrors(limit)
  );

const usePerfSamples = (limit: number) =>
  useSyncExternalStore(
    (listener) => performanceMonitor.subscribe(listener),
    () => performanceMonitor.getRecentSamples(limit),
    () => performanceMonitor.getRecentSamples(limit)
  );

const useHealthHistoryEntries = (limit: number) =>
  useSyncExternalStore(
    (listener) => subscribeToHealthHistory(listener),
    () => getHealthHistory(limit),
    () => getHealthHistory(limit)
  );

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; muted?: string }> = ({
  label,
  value,
  icon,
  muted,
}) => (
  <div className="rounded-xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
    <div className="flex items-center justify-between">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <div className="text-slate-400">{icon}</div>
    </div>
    <dd className="mt-2 text-3xl font-semibold text-slate-900">{value}</dd>
    {muted ? <p className="mt-1 text-xs text-slate-500">{muted}</p> : null}
  </div>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode; actions?: React.ReactNode }> = ({
  title,
  children,
  actions,
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
    <header className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {actions}
    </header>
    {children}
  </section>
);

function formatDuration(ms: number | null | undefined) {
  if (!ms && ms !== 0) return '—';
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

const MonitoringView: React.FC = () => {
  const errors = useErrors(25);
  const perfSamples = usePerfSamples(25);
  const healthHistory = useHealthHistoryEntries(20);
  const errorStats = useMemo(() => errorTracker.getStats(), [errors]);
  const perfStats = useMemo(() => performanceMonitor.getStats(), [perfSamples]);
  const [cacheStats, setCacheStats] = useState(() => getRegisteredCacheStats());
  const [dedupStats, setDedupStats] = useState(() => ({
    count: getInFlightRequestCount(),
    keys: getInFlightRequestKeys(),
  }));

  useEffect(() => {
    const cacheInterval = setInterval(() => setCacheStats(getRegisteredCacheStats()), 4000);
    const dedupInterval = setInterval(
      () => setDedupStats({ count: getInFlightRequestCount(), keys: getInFlightRequestKeys() }),
      3000
    );
    return () => {
      clearInterval(cacheInterval);
      clearInterval(dedupInterval);
    };
  }, []);

  const averageHitRate = useMemo(() => {
    if (!cacheStats.length) return 0;
    const total = cacheStats.reduce((acc, stat) => acc + (stat.hitRate ?? 0), 0);
    return (total / cacheStats.length) * 100;
  }, [cacheStats]);

  if (!MONITORING_ENABLED) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">
        <AlertTriangle className="mx-auto h-10 w-10" />
        <p className="mt-4 text-lg font-semibold">Monitoring dashboard disabled</p>
        <p className="mt-2 text-sm text-amber-800">
          Set VITE_ENABLE_MONITORING_VIEW=true or run in development mode to access this view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-500">Diagnostics</p>
        <h1 className="text-3xl font-bold text-slate-900">Monitoring Dashboard</h1>
        <p className="mt-1 text-slate-600">Real-time visibility into cache health, API performance, and error trends.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Errors (24h)"
          value={String(errorStats.total)}
          icon={<AlertTriangle className="h-5 w-5" />}
          muted={`Recoveries: ${errorStats.recoveryCount}`}
        />
        <StatCard
          label="Avg Cache Hit Rate"
          value={`${averageHitRate.toFixed(0)}%`}
          icon={<Database className="h-5 w-5" />}
          muted={`${cacheStats.length} caches tracked`}
        />
        <StatCard
          label="Active Requests"
          value={String(dedupStats.count)}
          icon={<RefreshCw className="h-5 w-5" />}
          muted={dedupStats.count ? 'Deduping in-flight requests' : 'Idle'}
        />
        <StatCard
          label="Perf Samples"
          value={String(perfStats.total)}
          icon={<Clock className="h-5 w-5" />}
          muted={`Last updated: ${perfStats.lastUpdated ? new Date(perfStats.lastUpdated).toLocaleTimeString() : '—'}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Recent Errors"
          actions={
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:border-red-200 hover:text-red-600"
              onClick={() => errorTracker.clear()}
            >
              Clear log
            </button>
          }
        >
          <div className="space-y-3">
            {errors.length === 0 ? (
              <p className="text-sm text-slate-500">No errors recorded.</p>
            ) : (
              errors.map((error) => (
                <div
                  key={error.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-700"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold capitalize">{error.category}</span>
                    <time>{new Date(error.timestamp).toLocaleTimeString()}</time>
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{error.message}</p>
                  <p className="text-xs text-slate-500">
                    {error.context.component} · {error.context.action || 'unknown action'}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Performance Samples">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2">Operation</th>
                  <th className="py-2">Duration</th>
                  <th className="py-2">Meta</th>
                </tr>
              </thead>
              <tbody>
                {perfSamples.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-500">
                      No samples collected yet.
                    </td>
                  </tr>
                ) : (
                  perfSamples.map((sample) => (
                    <tr key={sample.id} className="border-t border-slate-100">
                      <td className="py-2 font-medium text-slate-900">{sample.name}</td>
                      <td className="py-2">{sample.duration.toFixed(1)} ms</td>
                      <td className="py-2 text-xs text-slate-500">
                        {sample.meta ? JSON.stringify(sample.meta) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Health History">
          <div className="space-y-2">
            {healthHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No health checks recorded yet.</p>
            ) : (
              healthHistory.map((entry: HealthHistoryEntry, index) => (
                <div
                  key={`${entry.checkedAt}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-semibold capitalize text-slate-900">{entry.status}</p>
                    <p className="text-xs text-slate-500">{entry.error ?? 'Healthy'}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{new Date(entry.checkedAt).toLocaleTimeString()}</div>
                    <div>{entry.fromCache ? 'cache' : formatDuration(entry.latency)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Cache & Request Insights">
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Caches</p>
              <ul className="mt-2 space-y-2">
                {cacheStats.length === 0 ? (
                  <li className="text-slate-500">No caches registered.</li>
                ) : (
                  cacheStats.map((stat) => (
                    <li key={stat.name} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{stat.name}</span>
                        <span className="text-xs text-slate-500">
                          {stat.size}/{stat.maxSize}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{(stat.hitRate * 100).toFixed(0)}% hit rate</p>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">In-flight Requests</p>
              {dedupStats.count === 0 ? (
                <p className="mt-2 text-slate-500">No pending requests.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {dedupStats.keys.slice(0, 5).map((key) => (
                    <li key={key} className="truncate">
                      {key}
                    </li>
                  ))}
                  {dedupStats.keys.length > 5 && <li>+{dedupStats.keys.length - 5} more…</li>}
                </ul>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default MonitoringView;

