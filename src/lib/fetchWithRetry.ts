import { dedupedFetch } from './requestDeduplication';
import { calculateBackoff, wait } from './exponentialBackoff';

const DEBUG_LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb';

/**
 * fetchWithRetry - Resilient fetch with exponential backoff, deduplication, and timeout handling.
 */

export interface FetchWithRetryOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  dedupe?: boolean;
  dedupeKey?: string;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: number;
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

class FetchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

class FetchRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchRetryError';
  }
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = 10000, signal: userSignal, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  let userAbortHandler: (() => void) | null = null;

  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort();
    } else {
      userAbortHandler = () => controller.abort();
      userSignal.addEventListener('abort', userAbortHandler, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (userSignal && userAbortHandler) {
      userSignal.removeEventListener('abort', userAbortHandler);
    }
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (userSignal && userAbortHandler) {
      userSignal.removeEventListener('abort', userAbortHandler);
    }
    if ((error as Error).name === 'AbortError') {
      throw new FetchTimeoutError(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Fetch with retry and exponential backoff
 *
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout and retries
 * @returns Response promise
 *
 * @example
 * const response = await fetchWithRetry('/api/market/ohlcv?symbol=BTCUSDT', {
 *   timeout: 10000,
 *   retries: 3
 * });
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = 10000,
    retries = 3,
    dedupe = true,
    dedupeKey,
    baseDelay = 1000,
    maxDelay = 30_000,
    jitter = 0.1,
    onRetry,
    ...fetchOptions
  } = options;

  const attemptRequest = async () => {
    let lastError: Error | null = null;
    const isHFRequest = url.includes('huggingface') || url.includes('hf_engine') || url.includes('/api/market/ohlcv');

    // #region agent log
    fetch(DEBUG_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'fetchWithRetry.ts:105',
        message: 'fetchWithRetry entry',
        data: { url, retries, isHFRequest },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'F'
      })
    }).catch(() => {});
    // #endregion

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, {
          ...fetchOptions,
          timeout,
        });

        if (response.ok || (response.status >= 400 && response.status < 500)) {
          // #region agent log
          fetch(DEBUG_LOG_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'fetchWithRetry.ts:115',
              message: 'fetchWithRetry success',
              data: { url, attempt: attempt + 1, status: response.status, isHFRequest },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'pre-fix',
              hypothesisId: 'F'
            })
          }).catch(() => {});
          // #endregion
          return response;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        // #region agent log
        fetch(DEBUG_LOG_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'fetchWithRetry.ts:119',
            message: 'fetchWithRetry non-retryable status',
            data: { url, attempt: attempt + 1, status: response.status, isHFRequest },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'B'
          })
        }).catch(() => {});
        // #endregion
      } catch (error) {
        lastError = error as Error;
        // #region agent log
        fetch(DEBUG_LOG_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'fetchWithRetry.ts:122',
            message: 'fetchWithRetry error',
            data: { url, attempt: attempt + 1, errorMessage: (error as Error).message, isHFRequest },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'F'
          })
        }).catch(() => {});
        // #endregion
      }

      if (attempt < retries) {
        const delay = calculateBackoff(attempt, baseDelay, maxDelay, jitter);
        // #region agent log
        fetch(DEBUG_LOG_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'fetchWithRetry.ts:124',
            message: 'fetchWithRetry retry with backoff',
            data: { url, attempt: attempt + 1, retries, delay, isHFRequest },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'F'
          })
        }).catch(() => {});
        // #endregion
        onRetry?.(attempt + 1, delay, lastError);
        await wait(delay);
      }
    }

    // #region agent log
    fetch(DEBUG_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'fetchWithRetry.ts:131',
        message: 'fetchWithRetry all retries exhausted',
        data: { url, retries, errorMessage: lastError?.message, isHFRequest },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'F'
      })
    }).catch(() => {});
    // #endregion
    throw new FetchRetryError(
      `Failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  };

  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  const canDedup = dedupe && method === 'GET';
  const dedupeIdentifier = canDedup ? dedupeKey ?? buildDedupeKey(url, fetchOptions) : null;

  return canDedup ? dedupedFetch(dedupeIdentifier, attemptRequest) : attemptRequest();
}

function buildDedupeKey(url: string, options: RequestInit) {
  const method = (options.method ?? 'GET').toUpperCase();
  return `${method}:${url}`;
}
