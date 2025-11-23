/**
 * Smart Rate Limiter - Provider-specific rate limiting
 * Alternative to TokenBucket for APIs with complex rate limiting requirements
 * 
 * Features:
 * - Provider-specific configurations
 * - Automatic window reset
 * - Status tracking
 * - Multiple provider support
 */
import { Logger } from '../core/Logger.js';

interface ProviderConfig {
  calls: number;
  max: number;
  window: number; // in milliseconds
  resetTime: number;
}

export class SmartRateLimiter {
  private static instance: SmartRateLimiter;
  private providers: Map<string, ProviderConfig> = new Map();
  private logger = Logger.getInstance();
  private resetIntervalId?: NodeJS.Timeout;

  private constructor() {
    // Initialize provider configurations
    this.providers.set('coingecko', {
      calls: 0,
      max: 50,
      window: 60000, // 1 minute
      resetTime: Date.now() + 60000
    });

    this.providers.set('coinmarketcap', {
      calls: 0,
      max: 5,
      window: 1000, // 1 second
      resetTime: Date.now() + 1000
    });

    this.providers.set('cryptocompare', {
      calls: 0,
      max: 100,
      window: 60000, // 1 minute
      resetTime: Date.now() + 60000
    });

    this.providers.set('etherscan', {
      calls: 0,
      max: 5,
      window: 1000, // 1 second
      resetTime: Date.now() + 1000
    });

    this.providers.set('bscscan', {
      calls: 0,
      max: 5,
      window: 1000, // 1 second
      resetTime: Date.now() + 1000
    });

    this.providers.set('tronscan', {
      calls: 0,
      max: 100,
      window: 2000, // 2 seconds (more lenient)
      resetTime: Date.now() + 2000
    });

    // Start reset timer
    this.startResetTimer();
  }

  static getInstance(): SmartRateLimiter {
    if (!SmartRateLimiter.instance) {
      SmartRateLimiter.instance = new SmartRateLimiter();
    }
    return SmartRateLimiter.instance;
  }

  /**
   * Make a request with automatic rate limiting
   */
  async makeRequest<T>(provider: string, request: () => Promise<T>): Promise<T> {
    const config = this.providers.get(provider.toLowerCase());
    
    if (!config) {
      this.logger.warn(`Unknown rate limiter provider: ${provider}`);
      return request();
    }

    // Check if window needs reset
    if (Date.now() >= config.resetTime) {
      config.calls = 0;
      config.resetTime = Date.now() + config.window;
    }

    // Wait if rate limit exceeded
    if (config.calls >= config.max) {
      const waitTime = config.resetTime - Date.now();
      if (waitTime > 0) {
        this.logger.debug(`Rate limit reached for ${provider}, waiting ${waitTime}ms`);
        await this.delay(waitTime);
        config.calls = 0;
        config.resetTime = Date.now() + config.window;
      }
    }

    // Increment call count
    config.calls++;

    try {
      return await request();
    } catch (error) {
      // Decrement on error (retry logic might want to try again)
      config.calls--;
      throw error;
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(provider: string): { calls: number; max: number; remaining: number; resetIn: number } | null {
    const config = this.providers.get(provider.toLowerCase());
    if (!config) return null;

    const resetIn = Math.max(0, config.resetTime - Date.now());

    return {
      calls: config.calls,
      max: config.max,
      remaining: Math.max(0, config.max - config.calls),
      resetIn
    };
  }

  /**
   * Reset rate limiter for a provider
   */
  reset(provider: string): void {
    const config = this.providers.get(provider.toLowerCase());
    if (config) {
      config.calls = 0;
      config.resetTime = Date.now() + config.window;
    }
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    this.providers.forEach((config) => {
      config.calls = 0;
      config.resetTime = Date.now() + config.window;
    });
  }

  /**
   * Get all provider statuses
   */
  getAllStatuses(): Record<string, { calls: number; max: number; remaining: number; resetIn: number }> {
    const statuses: Record<string, any> = {};
    this.providers.forEach((_, provider) => {
      const status = this.getStatus(provider);
      if (status) {
        statuses[provider] = status;
      }
    });
    return statuses;
  }

  private startResetTimer(): void {
    this.resetIntervalId = setInterval(() => {
      const now = Date.now();
      this.providers.forEach((config) => {
        if (now >= config.resetTime) {
          config.calls = 0;
          config.resetTime = now + config.window;
        }
      });
    }, 1000); // Check every second
  }

  stop(): void {
    if (this.resetIntervalId) {
      clearInterval(this.resetIntervalId);
      this.resetIntervalId = undefined;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

