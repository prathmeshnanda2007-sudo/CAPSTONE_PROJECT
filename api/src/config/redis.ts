import { Redis } from '@upstash/redis';
import logger from '../utils/logger';

/**
 * Upstash Redis client (HTTP-based, serverless-compatible).
 * Uses REST API — no persistent TCP connection needed.
 */
export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Verify connection at startup (fire-and-forget, non-blocking).
 */
export async function pingRedis(): Promise<void> {
  try {
    await redis.ping();
    logger.info('Upstash Redis connected ✓');
  } catch (err: any) {
    logger.error('Upstash Redis connection failed — caching disabled', { error: err.message });
  }
}
