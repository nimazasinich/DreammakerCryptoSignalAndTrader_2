// src/utils/AdvancedRateLimiter.ts

/**
 * Advanced Rate Limiter with Retry Logic and Exponential Backoff
 * 
 * Features:
 * - Token bucket algorithm
 * - Handles 429 (Rate Limit) responses
 * - Exponential backoff
 * - Request queuing
 * - Timeout handling
 */

import { Logger } from '../core/Logger.js';

export interface RateLimiterOptions {
  maxTokens: number;       // Maximum token capacity
  refillRate: number;      // Tokens added per second
  maxQueueSize?: number;   // Optional queue size limit (default: 100)
  timeout?: number;        // Optional queue timeout (ms) (default: 30000)
}

interface QueueItem {
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeoutId: NodeJS.Timeout;
}

export class AdvancedRateLimiter {
  private readonly logger = Logger.getInstance();
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly maxQueueSize: number;
  private readonly timeout: number;
  private lastRefill: number;
  private queue: QueueItem[] = [];
  private retryAfter: number = 0; // Unix timestamp (ms)
  private processing = false;

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxTokens;
    this.tokens = options.maxTokens;
    this.refillRate = options.refillRate;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.timeout = options.timeout || 30000;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on time passed
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Acquire a token for making a request
   * Returns a promise that resolves when a token is available
   */
  async acquire(): Promise<void> {
    // Respect retry-after header if present
    if (this.retryAfter > Date.now()) {
      const waitTime = this.retryAfter - Date.now();
      this.logger.warn('Rate limit active, waiting...', { 
        waitTimeMs: waitTime,
        retryAfter: new Date(this.retryAfter).toISOString()
      });
      await this.sleep(waitTime);
      this.retryAfter = 0; // reset
    }

    this.refill();

    // Return immediately when a token is available
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }

    // Reject when the queue is at capacity
    if ((this.queue?.length || 0) >= this.maxQueueSize) {
      console.error('Rate limiter queue is full');
    }

    // Enqueue the request for later processing
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.queue.findIndex(item => item.timeoutId === timeoutId);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error('Rate limiter timeout'));
        }
      }, this.timeout);

      this.queue.push({
        resolve,
        reject,
        timestamp: Date.now(),
        timeoutId
      });

        // Start queue processing
      this.processQueue();
    });
  }

  /**
   * Process the queue and resolve waiting requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while ((this.queue?.length || 0) > 0) {
        this.refill();

        if (this.tokens < 1) {
          // Calculate wait time before token refills
          const timeToNextToken = 1000 / this.refillRate;
          await this.sleep(timeToNextToken);
          continue;
        }

        // Take the next item from the queue
        const item = this.queue.shift();
        if (!item) break;

        // Clear timeout
        clearTimeout(item.timeoutId);

        // Consume a token
        this.tokens -= 1;

        // Resolve queued promise
        item.resolve();
      }
    } finally {
      this.processing = false;

      // Continue processing remaining queue items
      if ((this.queue?.length || 0) > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Handle 429 response from API
   */
  handleRateLimitResponse(retryAfterSeconds: number): void {
    this.retryAfter = Date.now() + (retryAfterSeconds * 1000);
    this.tokens = 0; // Flush tokens

    this.logger.warn('Rate limit hit', {
      retryAfterSeconds,
      retryAfterTime: new Date(this.retryAfter).toISOString(),
      queueSize: this.queue.length
    });
  }

  /**
   * Get current status
   */
  getStatus(): {
    tokens: number;
    maxTokens: number;
    queueSize: number;
    retryAfter: number | null;
  } {
    this.refill();
    return {
      tokens: this.tokens,
      maxTokens: this.maxTokens,
      queueSize: this.queue.length,
      retryAfter: this.retryAfter > Date.now() ? this.retryAfter : null
    };
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    for (const item of this.queue) {
      clearTimeout(item.timeoutId);
      item.reject(new Error('Rate limiter cleared'));
    }
    this.queue = [];
    this.tokens = this.maxTokens;
    this.retryAfter = 0;
  }

  /**
   * Helper: sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Wrapper for making API calls with automatic retry and rate limiting
 */
export class RateLimitedFetcher {
  private readonly logger = Logger.getInstance();
  private readonly limiter: AdvancedRateLimiter;

  constructor(limiter: AdvancedRateLimiter) {
    this.limiter = limiter;
  }

  /**
   * Fetch with automatic retry and exponential backoff
   */
  async fetch<T>(
    fetchFn: () => Promise<T>,
    options: {
      maxRetries?: number;
      backoffMultiplier?: number;
      maxBackoffMs?: number;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      backoffMultiplier = 2,
      maxBackoffMs = 30000
    } = options;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Wait for a token
        await this.limiter.acquire();

        // Perform request
        return await fetchFn();
      } catch (error: any) {
        // Handle 429 responses
        if (error.response?.status === 429) {
          const retryAfter = this.parseRetryAfter(error.response);
          this.limiter.handleRateLimitResponse(retryAfter);

          if (attempt === maxRetries - 1) {
            console.error(`Rate limit exceeded after ${maxRetries} retries`);
          }

          // Exponential backoff
          const backoffMs = Math.min(
            1000 * Math.pow(backoffMultiplier, attempt),
            maxBackoffMs
          );

          this.logger.warn('Retrying after rate limit', {
            attempt: attempt + 1,
            maxRetries,
            backoffMs,
            retryAfter
          });

          await this.sleep(backoffMs);
          continue;
        }

        // Re-throw unexpected errors
        throw error;
      }
    }

    console.error(`Failed after ${maxRetries} retries`);
  }

  /**
   * Parse Retry-After header
   */
  private parseRetryAfter(response: any): number {
    const retryAfter = response.headers?.['retry-after'];
    
    if (!retryAfter) return 60; // Default 60 seconds

    // Interpret numeric values as seconds
    const seconds = parseInt(retryAfter);
    if (!isNaN(seconds)) {
      return seconds;
    }

    // Interpret date strings as absolute timestamps
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, (date.getTime() - Date.now()) / 1000);
    }

    return 60;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example Usage:
 * 
 * const limiter = new AdvancedRateLimiter({
 *   maxTokens: 10,
 *   refillRate: 2  // 2 requests per second
 * });
 * 
 * const fetcher = new RateLimitedFetcher(limiter);
 * 
 * const data = await fetcher.fetch(async (, { mode: "cors", headers: { "Content-Type": "application/json" } }) => {
 *   const response = await axios.get('https://api.example.com/data');
 *   return response.data;
 * });
 */
