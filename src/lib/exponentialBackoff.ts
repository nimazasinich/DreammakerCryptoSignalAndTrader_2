/**
 * Exponential backoff helpers with jitter to prevent synchronized retries.
 */

export interface BackoffOptions {
  baseDelay?: number;
  maxDelay?: number;
  jitter?: number;
}

export interface RetryWithBackoffOptions extends BackoffOptions {
  maxAttempts?: number;
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

export function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30_000,
  jitter: number = 0.1
): number {
  const exponential = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitterRange = exponential * jitter;
  const jitterOffset = jitterRange ? (Math.random() * jitterRange) - jitterRange / 2 : 0;
  return Math.max(0, exponential + jitterOffset);
}

export function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryWithBackoffOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30_000,
    jitter = 0.1,
    onRetry,
  } = options;

  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;

      if (attempt >= maxAttempts) {
        break;
      }

      const delay = calculateBackoff(attempt - 1, baseDelay, maxDelay, jitter);
      onRetry?.(attempt, delay, error);
      await wait(delay);
    }
  }

  throw lastError;
}

