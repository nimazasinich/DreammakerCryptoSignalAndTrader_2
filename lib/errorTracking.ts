type ErrorCategory = 'network' | 'validation' | 'server' | 'client' | 'recovery';
type ErrorSeverity = 'info' | 'warning' | 'error';

export interface ErrorContext {
  component: string;
  action?: string;
  details?: Record<string, unknown>;
  userAction?: string;
  userAgent?: string;
}

export interface ErrorEvent {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  timestamp: number;
  stack?: string;
  context: ErrorContext;
}

interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  lastErrorAt: number | null;
  recoveryCount: number;
}

const STORAGE_KEY = 'dreammaker.errorLog';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getUserAgent() {
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent;
  }
  return 'server';
}

class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private maxErrors = 200;
  private listeners = new Set<() => void>();

  constructor() {
    this.hydrate();
  }

  track(event: Omit<ErrorEvent, 'id' | 'timestamp' | 'context'> & { context?: Partial<ErrorContext> }) {
    const payload: ErrorEvent = {
      id: generateId(),
      timestamp: Date.now(),
      ...event,
      context: {
        component: event.context?.component ?? 'unknown',
        userAgent: event.context?.userAgent ?? getUserAgent(),
        ...event.context,
      },
    };

    this.errors.push(payload);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    if (import.meta.env.DEV) {
      console.warn('[ErrorTracker]', payload);
    }

    this.persist();
    this.notify();
  }

  trackError(params: {
    category: Exclude<ErrorCategory, 'recovery'>;
    severity?: ErrorSeverity;
    message: string;
    stack?: string;
    context: ErrorContext;
  }) {
    this.track({
      ...params,
      severity: params.severity ?? 'error',
    });
  }

  trackRecovery(context: ErrorContext & { message?: string }) {
    this.track({
      category: 'recovery',
      severity: 'info',
      message: context.message ?? 'Recovered from previous error',
      context,
    });
  }

  getRecentErrors(limit = 20) {
    return this.errors.slice(-limit).reverse();
  }

  getAllErrors() {
    return [...this.errors];
  }

  clear() {
    this.errors = [];
    this.persist();
    this.notify();
  }

  getStats(): ErrorStats {
    const stats: ErrorStats = {
      total: this.errors.length,
      byCategory: {
        network: 0,
        validation: 0,
        server: 0,
        client: 0,
        recovery: 0,
      },
      lastErrorAt: null,
      recoveryCount: 0,
    };

    for (const error of this.errors) {
      stats.byCategory[error.category] += 1;
      if (error.category === 'recovery') {
        stats.recoveryCount += 1;
      } else {
        stats.lastErrorAt = error.timestamp;
      }
    }

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

  private hydrate() {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.errors = parsed.slice(-this.maxErrors);
        }
      }
    } catch (error) {
      console.warn('ErrorTracker hydrate failed', error);
    }
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.errors.slice(-this.maxErrors)));
    } catch (error) {
      console.warn('ErrorTracker persist failed', error);
    }
  }
}

export const errorTracker = new ErrorTracker();

