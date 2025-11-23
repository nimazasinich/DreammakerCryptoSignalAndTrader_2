/**
 * Simple in-memory cache with TTL and LRU eviction.
 *
 * Designed for lightweight client-side caching of API responses or expensive computations.
 */

export interface CacheConfig {
  /**
   * Maximum number of entries to keep at any given time.
   */
  maxSize?: number;
  /**
   * Default time-to-live (in ms) applied when callers do not provide a TTL.
   */
  defaultTTL?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
}

export class SimpleCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0 };
  private listeners = new Set<() => void>();

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize ?? 100;
    this.defaultTTL = config.defaultTTL ?? 30_000;
  }

  /**
   * Retrieve an entry if it exists and has not expired.
   */
  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses += 1;
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.stats.misses += 1;
      return null;
    }

    entry.lastAccessed = Date.now();
    this.stats.hits += 1;
    return entry.value;
  }

  /**
   * Store a value with an optional TTL override.
   */
  set(key: string, value: T, ttl?: number) {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + (ttl ?? this.defaultTTL),
      lastAccessed: now,
    };

    this.store.set(key, entry);

    if (this.store.size > this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.notify();
  }

  /**
   * Remove a specific entry.
   */
  invalidate(key: string) {
    this.store.delete(key);
    this.notify();
  }

  /**
   * Clear all entries and reset stats.
   */
  clear() {
    this.store.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
    this.notify();
  }

  /**
   * Returns cache statistics for monitoring.
   */
  getStats() {
    const { hits, misses, evictions } = this.stats;
    const total = hits + misses;
    return {
      size: this.store.size,
      maxSize: this.maxSize,
      hits,
      misses,
      hitRate: total === 0 ? 0 : hits / total,
      evictions,
    };
  }

  /**
   * Convenient helper to lazily populate cache entries.
   */
  async getOrSet(key: string, loader: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await loader();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Update max size at runtime.
   */
  setMaxSize(maxSize: number) {
    this.maxSize = Math.max(1, maxSize);
    while (this.store.size > this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
    this.notify();
  }

  /**
   * Update default TTL at runtime.
   */
  setDefaultTTL(ttl: number) {
    this.defaultTTL = Math.max(0, ttl);
    this.notify();
  }

  private evictLeastRecentlyUsed() {
    let lruKey: string | null = null;
    let lruAccess = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < lruAccess) {
        lruAccess = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey !== null) {
      this.store.delete(lruKey);
      this.stats.evictions += 1;
      this.notify();
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const globalCache = new SimpleCache<any>();

const registeredCaches = new Map<string, SimpleCache<any>>();

export function registerCache(name: string, cache: SimpleCache<any>) {
  if (!registeredCaches.has(name)) {
    registeredCaches.set(name, cache);
  }
  return () => registeredCaches.delete(name);
}

export function getRegisteredCacheStats() {
  return Array.from(registeredCaches.entries()).map(([name, cache]) => ({
    name,
    ...cache.getStats(),
  }));
}

