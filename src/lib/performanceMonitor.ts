interface PerformanceSample {
  id: string;
  name: string;
  duration: number;
  timestamp: number;
  meta?: Record<string, unknown>;
}

interface PerformanceStats {
  total: number;
  byName: Record<string, { count: number; avg: number; p95: number }>;
  lastUpdated: number | null;
}

function nanoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const now = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

class PerformanceMonitor {
  private samples: PerformanceSample[] = [];
  private maxSamples = 300;
  private listeners = new Set<() => void>();

  record(sample: Omit<PerformanceSample, 'id' | 'timestamp'> & { timestamp?: number }) {
    const payload: PerformanceSample = {
      id: nanoId(),
      timestamp: sample.timestamp ?? Date.now(),
      ...sample,
    };

    this.samples.push(payload);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    if (import.meta.env.DEV) {
      console.debug('[Perf]', payload.name, `${payload.duration.toFixed(2)}ms`, payload.meta || '');
    }

    this.notify();
  }

  getRecentSamples(limit = 50) {
    return this.samples.slice(-limit).reverse();
  }

  getStats(): PerformanceStats {
    const stats: PerformanceStats = {
      total: this.samples.length,
      byName: {},
      lastUpdated: this.samples.length ? this.samples[this.samples.length - 1].timestamp : null,
    };

    const grouped = new Map<string, number[]>();
    for (const sample of this.samples) {
      if (!grouped.has(sample.name)) {
        grouped.set(sample.name, []);
      }
      grouped.get(sample.name)!.push(sample.duration);
    }

    grouped.forEach((durations, name) => {
      const sorted = [...durations].sort((a, b) => a - b);
      const p95Index = Math.floor(0.95 * (sorted.length - 1));
      const avg = durations.reduce((acc, value) => acc + value, 0) / durations.length;
      stats.byName[name] = {
        count: durations.length,
        avg,
        p95: sorted[p95Index],
      };
    });

    return stats;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T> | T,
  meta?: Record<string, unknown>
): Promise<T> | T {
  const start = now();

  const finalize = (result: T, error?: unknown) => {
    const duration = now() - start;
    performanceMonitor.record({
      name,
      duration,
      meta: { ...meta, success: !error },
    });
    if (error) {
      throw error;
    }
    return result;
  };

  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        (value) => finalize(value),
        (err) => finalize(err as T, err)
      );
    }
    return finalize(result);
  } catch (error) {
    return finalize(undefined as T, error);
  }
}

