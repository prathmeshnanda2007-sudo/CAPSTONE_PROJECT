import { redis } from '../config/redis';
import logger from './logger';

const CACHE_PREFIX = 'vapi:cache:';

/**
 * TTL constants (seconds)
 */
export const TTL = {
  STATES:       60 * 60,       // 1 hour  — states rarely change
  DISTRICTS:    60 * 60,       // 1 hour
  SUBDISTRICTS: 30 * 60,       // 30 min
  VILLAGE:      30 * 60,       // 30 min  — individual village
  SEARCH:       5  * 60,       // 5 min   — search results
  AUTOCOMPLETE: 5  * 60,       // 5 min
} as const;

/** Read a cached value. Returns null on miss or Redis error. */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get<T>(`${CACHE_PREFIX}${key}`);
    return raw ?? null;
  } catch (err: any) {
    logger.warn('Cache GET failed (degraded mode)', { key, error: err.message });
    return null;
  }
}

/** Write a value to cache with TTL. Silently swallows errors (cache is non-critical). */
export async function setCached(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(`${CACHE_PREFIX}${key}`, ttlSeconds, JSON.stringify(value));
  } catch (err: any) {
    logger.warn('Cache SET failed (degraded mode)', { key, error: err.message });
  }
}

/** Invalidate a specific key (e.g. after admin data change). */
export async function invalidate(key: string): Promise<void> {
  try {
    await redis.del(`${CACHE_PREFIX}${key}`);
  } catch (err: any) {
    logger.warn('Cache DEL failed', { key, error: err.message });
  }
}

/** Build a canonical cache key from parts. */
export const cacheKey = (...parts: (string | number | undefined)[]) =>
  parts.filter(Boolean).join(':');
