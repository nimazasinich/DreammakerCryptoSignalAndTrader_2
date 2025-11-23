// Token bucket rate limiter implementation
export class TokenBucket {
  private tokens: number;
  private lastRefill = Date.now();
  
  constructor(private capacity: number, private refillPerSec: number) {
    this.tokens = capacity;
  }
  
  take(cost = 1): boolean {
    const now = Date.now();
    const delta = (now - this.lastRefill) / 1000;
    this.lastRefill = now;
    this.tokens = Math.min(this.capacity, this.tokens + delta * this.refillPerSec);
    
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }
  
  async wait(cost = 1): Promise<void> {
    while (!this.take(cost)) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
  
  getAvailable(): number {
    return this.tokens;
  }
  
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

/**
 * Smart Rate Limiter - Alternative implementation with provider-specific configurations
 * Use this when you need provider-specific rate limiting configurations
 */
export { SmartRateLimiter } from './SmartRateLimiter.js';

/**
 * Enhanced Rate Limiter with Retry Logic
 */
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

export interface RateLimitConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  minInterval: number; // Minimum time between requests (ms)
  backoffMultiplier: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRetries: 4,
  initialDelay: 2000, // 2 seconds
  maxDelay: 16000, // 16 seconds
  minInterval: 1000, // 1 second between requests
  backoffMultiplier: 2,
};

/**
 * Rate-limited fetch with exponential backoff and retry logic
 */
export class RateLimitedFetcher {
  private lastRequestTime: number = 0;
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Wait for rate limit interval
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.config.minInterval) {
      const waitTime = this.config.minInterval - timeSinceLastRequest;
      logger.debug(`Rate limit: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay = Math.min(
      this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxDelay
    );
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return delay + jitter;
  }

  /**
   * Fetch with rate limiting and retry logic
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    await this.waitForRateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.debug(`Attempt ${attempt + 1}/${this.config.maxRetries + 1}: ${url}`);

        const response = await fetch(url, {
          ...options,
          headers: {
            'Accept': 'application/json',
            ...options?.headers,
          },
        });

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter
            ? parseInt(retryAfter) * 1000
            : this.calculateBackoff(attempt);

          if (attempt < this.config.maxRetries) {
            logger.warn(`Rate limited (429), waiting ${waitTime}ms before retry ${attempt + 1}/${this.config.maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            console.error(`Rate limited after ${this.config.maxRetries} retries`);
          }
        }

        // Handle server errors (5xx) with retry
        if (response.status >= 500 && response.status < 600) {
          if (attempt < this.config.maxRetries) {
            const waitTime = this.calculateBackoff(attempt);
            logger.warn(`Server error (${response.status}), retrying in ${waitTime}ms (${attempt + 1}/${this.config.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            console.error(`Server error ${response.status} after ${this.config.maxRetries} retries`);
          }
        }

        // Success or client error (don't retry 4xx except 429)
        return response;

      } catch (error: any) {
        lastError = error;

        // Check if it's a network error that should be retried
        const isNetworkError =
          error.name === 'TypeError' ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('ETIMEDOUT');

        if (isNetworkError && attempt < this.config.maxRetries) {
          const waitTime = this.calculateBackoff(attempt);
          logger.warn(`Network error, retrying in ${waitTime}ms (${attempt + 1}/${this.config.maxRetries}): ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // Don't retry other errors
        if (!isNetworkError) {
          throw error;
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error('All retries exhausted');
  }

  /**
   * Fetch JSON with rate limiting and retry
   */
  async fetchJSON<T = any>(url: string, options?: RequestInit): Promise<T> {
    const response = await this.fetch(url, options);

    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Rate limiter config updated:', config);
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new RateLimitedFetcher();

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RateLimitConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt < finalConfig.maxRetries) {
        const delay = Math.min(
          finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        );
        logger.warn(`Retry ${attempt + 1}/${finalConfig.maxRetries} in ${delay}ms: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retries exhausted');
}
