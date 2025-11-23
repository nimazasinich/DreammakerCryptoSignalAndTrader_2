// src/core/AdvancedCache.ts
import { Request, Response } from 'express';
import { Logger } from './Logger.js';
import { RedisService } from '../services/RedisService.js';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  serialize?: boolean; // Whether to serialize/deserialize
}

export class AdvancedCache {
  private static instance: AdvancedCache;
  private logger = Logger.getInstance();
  private redisService: RedisService | null = null;
  private memoryCache = new Map<string, { value: any; expires: number; tags: string[] }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private maxMemorySize = 10000; // Maximum items in memory cache
  private redisAvailable = false;

  private constructor() {
    // Initialize Redis asynchronously (non-blocking)
    this.initializeRedis().catch(() => {
      // Silent fail - will use memory cache
    });
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redisService = RedisService.getInstance();
      // Try to initialize Redis connection
      await this.redisService.initialize();
      this.redisAvailable = true;
      this.logger.info('AdvancedCache initialized with Redis support');
    } catch (error) {
      this.logger.warn('Redis not available, using memory cache only', {}, error as Error);
      this.redisAvailable = false;
      // Continue with memory cache only
    }
  }

  static getInstance(): AdvancedCache {
    if (!AdvancedCache.instance) {
      AdvancedCache.instance = new AdvancedCache();
    }
    return AdvancedCache.instance;
  }

  /**
   * Get value from cache (Redis first, then memory)
   */
  async get<T = any>(key: string): Promise<T | null> {
    // Check pending requests for deduplication
    if (this.pendingRequests.has(key)) {
      this.logger.debug('Cache request deduplication', { key });
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const fetchPromise = this._fetchFromCache<T>(key);
    this.pendingRequests.set(key, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  private async _fetchFromCache<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.redisAvailable && this.redisService) {
        try {
          const redisValue = await this.redisService.getCachedData<T>(key);
          if (redisValue !== null) {
            this.logger.debug('Cache hit (Redis)', { key });
            return redisValue;
          }
        } catch (error) {
          // Redis error - fallback to memory
          this.logger.debug('Redis fetch failed, using memory cache', { key });
          this.redisAvailable = false;
        }
      }

      // Fallback to memory
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && memoryEntry.expires > Date.now()) {
        this.logger.debug('Cache hit (Memory)', { key });
        return memoryEntry.value as T;
      }

      // Remove expired entry
      if (memoryEntry) {
        this.memoryCache.delete(key);
      }

      this.logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      this.logger.warn('Cache get error', { key }, error as Error);
      // Fallback to memory on Redis error
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && memoryEntry.expires > Date.now()) {
        return memoryEntry.value as T;
      }
      return null;
    }
  }

  /**
   * Set value in cache (both Redis and memory)
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const { ttl = 300, tags = [], serialize = true } = options;
    const expires = Date.now() + (ttl * 1000);

    const serializedValue = serialize ? JSON.stringify(value) : value;

    try {
      // Set in Redis if available
      if (this.redisAvailable && this.redisService) {
        try {
          await this.redisService.cacheData(key, value, ttl);
        } catch (error) {
          this.logger.debug('Redis set failed, using memory only', { key });
          this.redisAvailable = false;
        }
      }
    } catch (error) {
      // Silent fail - will use memory cache
    }

    // Set in memory
    this.memoryCache.set(key, { value, expires, tags });

    // Evict oldest entries if memory cache is full
    if (this.memoryCache.size > this.maxMemorySize) {
      this.evictOldestEntries();
    }

    this.logger.debug('Cache set', { key, ttl, tags: tags.length });
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.redisAvailable && this.redisService) {
        try {
          await this.redisService.invalidateCache(key);
        } catch (error) {
          this.logger.debug('Redis delete failed, continuing with memory', { key });
        }
      }
    } catch (error) {
      // Silent fail
    }

    this.memoryCache.delete(key);
    this.logger.debug('Cache deleted', { key });
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;

    // Invalidate memory cache entries
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }

    // In Redis, we'd need to maintain a tag index
    // For now, we'll delete keys that might match the pattern
    // In production, use Redis Sets or RedisJSON for tag-based invalidation

    this.logger.info('Cache invalidated by tags', { tags, count: invalidated });
    return invalidated;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.redisAvailable && this.redisService) {
        try {
          await this.redisService.flushAll();
        } catch (error) {
          this.logger.debug('Redis flush failed, clearing memory only');
        }
      }
    } catch (error) {
      // Silent fail
    }

    this.memoryCache.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Evict oldest entries from memory cache
   */
  private evictOldestEntries(): void {
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].expires - b[1].expires);

    const toEvict = Math.floor(this.maxMemorySize * 0.1); // Evict 10%
    for (let i = 0; i < toEvict; i++) {
      this.memoryCache.delete(entries[i][0]);
    }

    this.logger.debug('Evicted oldest cache entries', { count: toEvict });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    memoryMaxSize: number;
    pendingRequests: number;
    memoryEntries: Array<{ key: string; expires: number; tags: string[] }>;
  } {
    return {
      memorySize: this.memoryCache.size,
      memoryMaxSize: this.maxMemorySize,
      pendingRequests: this.pendingRequests.size,
      memoryEntries: Array.from(this.memoryCache.entries()).map(([key, entry]) => ({
        key,
        expires: entry.expires,
        tags: entry.tags
      }))
    };
  }
}

