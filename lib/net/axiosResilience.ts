/**
 * Network Resilience Layer
 * Provides retry logic and circuit breaker for axios requests
 * Additive enhancement - does not modify existing call sites
 */

import axios, { AxiosError } from 'axios';
import { Logger } from '../../core/Logger.js';
import { getPrimaryDataSource } from '../../config/dataSource.js';

const logger = Logger.getInstance();

// HTTP status codes that should trigger retry
const RETRY_STATUS_CODES = [429, 502, 503, 504];

// Boot window configuration
const BOOT_START = Date.now();
const BOOT_NO_RETRY = process.env.BOOT_NO_RETRY === 'true';
const BOOT_WINDOW_MS = Number(process.env.BOOT_WINDOW_MS || 60000);
const ENV_MAX_RETRIES = Number(process.env.AXIOS_MAX_RETRIES ?? '3'); // افزایش به 3

// Circuit breaker configuration - تنظیمات بهینه شده
const CIRCUIT_BREAKER_THRESHOLD = 15; // افزایش از 5 به 15 برای کاهش false positives
const CIRCUIT_BREAKER_TIMEOUT_MS = 30_000; // افزایش به 30 ثانیه
const MAX_BACKOFF_MS = 12000; // افزایش به 12 ثانیه

// State tracking
let consecutiveFailures = 0;
let circuitBreakerOpenUntil = 0;

/**
 * Sleep helper for backoff delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Request interceptor - checks circuit breaker state
 */
axios.interceptors.request.use(
  async (config) => {
    const now = Date.now();

    // Check if circuit breaker is open
    if (now < circuitBreakerOpenUntil) {
      const remainingMs = circuitBreakerOpenUntil - now;
      logger.warn('Circuit breaker is open, rejecting request', {
        url: config.url,
        remainingMs,
      });

      // Return a rejected promise with a synthetic error
      // This will be caught by the error interceptor or the caller
      return Promise.reject(
        Object.assign(new Error('circuit_open'), {
          config,
          isCircuitOpen: true,
        })
      );
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handles retries and circuit breaker logic
 */
axios.interceptors.response.use(
  (response) => {
    // Success - reset failure counter
    consecutiveFailures = 0;
    return response;
  },
  async (error: AxiosError) => {
    const config: any = error.config;
    const status = error.response?.status;

    // Skip retry if no config (shouldn't happen)
    if (!config) {
      return Promise.reject(error);
    }

    // Initialize retry count if not present
    config.__retryCount = config.__retryCount || 0;
    let MAX_RETRIES = ENV_MAX_RETRIES;
    
    // Disable retries during boot window if configured
    if (BOOT_NO_RETRY && (Date.now() - BOOT_START) < BOOT_WINDOW_MS) {
      MAX_RETRIES = 0;
    }

    // Check if this status code should trigger retry AND we haven't exceeded retry limit
    if (status && RETRY_STATUS_CODES.includes(status) && config.__retryCount < MAX_RETRIES) {
      config.__retryCount++;
      consecutiveFailures++;

      // Calculate exponential backoff
      const backoffMs = Math.min(2000 * config.__retryCount, MAX_BACKOFF_MS);
      const primarySource = getPrimaryDataSource();
      const isHFRequest = config.url?.includes('huggingface') || config.url?.includes('hf_engine') || primarySource === 'huggingface';

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'axiosResilience.ts:109',message:'Axios retry triggered',data:{url:config.url,status,retryAttempt:config.__retryCount,maxRetries:MAX_RETRIES,backoffMs,primarySource,isHFRequest},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      // #endregion agent log

      logger.warn('Retryable error detected, applying backoff', {
        url: config.url,
        status,
        retryAttempt: config.__retryCount,
        maxRetries: MAX_RETRIES,
        consecutiveFailures,
        backoffMs,
        primarySource,
        isHFRequest,
      });

      // Wait before retry
      await sleep(backoffMs);

      // Retry the request
      try {
        const result = await axios.request(config);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'axiosResilience.ts:133',message:'Axios retry succeeded',data:{url:config.url,retryAttempt:config.__retryCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
        // #endregion agent log
        return result;
      } catch (retryError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'axiosResilience.ts:137',message:'Axios retry failed',data:{url:config.url,retryAttempt:config.__retryCount,errorMessage:(retryError as Error).message},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
        // #endregion agent log
        // Retry failed, continue to circuit breaker logic below
        error = retryError as AxiosError;
      }
    }

    // Track consecutive failures (only if not already tracked in retry logic)
    if (!status || !RETRY_STATUS_CODES.includes(status)) {
      consecutiveFailures++;
      const primarySource = getPrimaryDataSource();
      const isHFRequest = config.url?.includes('huggingface') || config.url?.includes('hf_engine') || primarySource === 'huggingface';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'axiosResilience.ts:146',message:'Non-retryable error',data:{url:config.url,status,primarySource,isHFRequest,consecutiveFailures},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      // #endregion agent log
    }

    // Open circuit breaker if threshold reached
    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT_MS;

      logger.error('Circuit breaker opened due to consecutive failures', {
        consecutiveFailures,
        openForMs: CIRCUIT_BREAKER_TIMEOUT_MS,
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Get current circuit breaker state (for diagnostics)
 */
export function getCircuitBreakerState() {
  const now = Date.now();
  const isOpen = now < circuitBreakerOpenUntil;

  return {
    isOpen,
    consecutiveFailures,
    opensAtFailures: CIRCUIT_BREAKER_THRESHOLD,
    remainingMs: isOpen ? circuitBreakerOpenUntil - now : 0,
  };
}

/**
 * Reset circuit breaker manually (for testing/diagnostics)
 */
export function resetCircuitBreaker() {
  consecutiveFailures = 0;
  circuitBreakerOpenUntil = 0;
  logger.info('Circuit breaker manually reset');
}

logger.info('Network resilience layer initialized', {
  retryStatusCodes: RETRY_STATUS_CODES,
  circuitBreakerThreshold: CIRCUIT_BREAKER_THRESHOLD,
  circuitBreakerTimeoutMs: CIRCUIT_BREAKER_TIMEOUT_MS,
  maxBackoffMs: MAX_BACKOFF_MS,
});
