import type { Redis } from 'ioredis';
let redis: Redis | null = null;
let memo = new Map<string, { v: any; t: number; ttl: number }>();

export async function connectRedisIfAvailable() {
  if (redis || !process.env.REDIS_URL) return;
  const { default: IORedis } = await import('ioredis');
  redis = new IORedis(process.env.REDIS_URL as string, { lazyConnect: true });
  try { await redis.connect(); } catch { redis = null; }
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (redis) {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) as T : null;
  }
  const x = memo.get(key);
  if (!x) return null;
  if (Date.now() - x.t > x.ttl) { memo.delete(key); return null; }
  return x.v as T;
}

export async function cacheSet(key: string, val: any, ttlMs = 30_000): Promise<void> {
  if (redis) {
    await redis.set(key, JSON.stringify(val), 'PX', ttlMs);
    return;
  }
  memo.set(key, { v: val, t: Date.now(), ttl: ttlMs });
  if (memo.size > 256) {
    const first = memo.keys().next().value;
    memo.delete(first);
  }
}
