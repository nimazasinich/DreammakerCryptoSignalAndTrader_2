/**
 * Enhanced caching system with TTL, size limits, and stale-while-revalidate functionality
 */

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
}

interface CacheItem<T> {
  value: T;
  timestamp: number;
  isStale: boolean;
}

export class AdvancedCache<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private ttl: number;
  private maxSize: number;
  private staleWhileRevalidate: boolean;
  
  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // Default 5 minutes
    this.maxSize = options.maxSize || 100; // Default 100 items
    this.staleWhileRevalidate = options.staleWhileRevalidate || false;
  }
  
  /**
   * Set a value in the cache
   */
  set(key: string, value: T): void {
    // Enforce size limit - remove oldest item if needed
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      isStale: false
    });
  }
  
  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    const now = Date.now();
    const isExpired = now - item.timestamp > this.ttl;
    
    if (!isExpired) {
      return item.value;
    }
    
    if (this.staleWhileRevalidate) {
      // Mark as stale but return it anyway
      item.isStale = true;
      return item.value;
    }
    
    this.cache.delete(key);
    return null;
  }
  
  /**
   * Get a value with a fetch function that will be called if the value is not in cache
   */
  async getOrFetch(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cachedValue = this.get(key);
    
    if (cachedValue !== null && !this.cache.get(key)?.isStale) {
      return cachedValue;
    }
    
    try {
      const freshValue = await fetchFn();
      this.set(key, freshValue);
      return freshValue;
    } catch (error) {
      // If fetch fails but we have stale data, return it
      if (cachedValue !== null) {
        return cachedValue;
      }
      throw error;
    }
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    const isExpired = Date.now() - item.timestamp > this.ttl;
    return !isExpired;
  }
  
  /**
   * Remove a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get all valid keys in the cache
   */
  keys(): string[] {
    const validKeys: string[] = [];
    const now = Date.now();
    
    this.cache.forEach((item, key) => {
      const isExpired = now - item.timestamp > this.ttl;
      if (!isExpired || this.staleWhileRevalidate) {
        validKeys.push(key);
      }
    });
    
    return validKeys;
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validCount = 0;
    let staleCount = 0;
    
    this.cache.forEach(item => {
      const isExpired = now - item.timestamp > this.ttl;
      if (!isExpired) {
        validCount++;
      } else if (this.staleWhileRevalidate) {
        staleCount++;
      }
    });
    
    return {
      totalItems: this.cache.size,
      validItems: validCount,
      staleItems: staleCount,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }

  get size(): number {
    return this.cache.size;
  }
}

// Export a singleton instance with default settings
export const globalCache = new AdvancedCache();

/**
 * Simple TTL Cache wrapper around AdvancedCache
 * Provides a simpler interface that takes TTL as constructor parameter
 */
export class TTLCache<T> {
  private cache: AdvancedCache<T>;

  constructor(ttlMs: number, maxSize: number = 100) {
    this.cache = new AdvancedCache<T>({
      ttl: ttlMs,
      maxSize: maxSize,
      staleWhileRevalidate: false
    });
  }

  get(key: string): T | null {
    return this.cache.get(key);
  }

  set(key: string, value: T): void {
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

export default AdvancedCache;