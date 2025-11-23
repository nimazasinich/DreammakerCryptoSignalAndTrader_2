// Exponential backoff utility for retrying failed API requests

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  retryOn?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 4,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  factor: 2,
  retryOn: (error: any) => {
    // Retry on rate limits (429) and server errors (5xx)
    const status = error?.response?.status || error?.status;
    return status === 429 || (status >= 500 && status < 600);
  }
};

/**
 * Execute a function with exponential backoff retry logic
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function call
 * @throws The last error if all retries fail
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= opts.maxRetries || !opts.retryOn(error)) {
        throw error;
      }

      // Wait before retrying
      await sleep(delay);

      // Increase delay for next attempt
      delay = Math.min(delay * opts.factor, opts.maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Sleep for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a rate-limited version of a function with exponential backoff
 * @param fn - The function to wrap
 * @param options - Retry configuration options
 * @returns A wrapped function with retry logic
 */
export function withRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    return withExponentialBackoff(() => fn(...args), options);
  };
}

/**
 * Extract status code from various error formats
 */
export function getErrorStatus(error: any): number | undefined {
  return error?.response?.status || error?.status || error?.statusCode;
}

/**
 * Check if error is a rate limit error (HTTP 429)
 */
export function isRateLimitError(error: any): boolean {
  return getErrorStatus(error) === 429;
}

/**
 * Check if error is a server error (HTTP 5xx)
 */
export function isServerError(error: any): boolean {
  const status = getErrorStatus(error);
  return status !== undefined && status >= 500 && status < 600;
}

/**
 * Check if error should trigger a retry
 */
export function shouldRetry(error: any): boolean {
  return isRateLimitError(error) || isServerError(error);
}
