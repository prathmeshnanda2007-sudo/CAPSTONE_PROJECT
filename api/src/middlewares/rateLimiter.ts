import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import logger from '../utils/logger';

/**
 * Plan-based daily limits and per-minute burst limits.
 * Keys:  daily   → requests allowed per calendar day (UTC)
 *        burst   → requests allowed per 60-second window
 */
const PLAN_LIMITS: Record<string, { daily: number; burst: number }> = {
  Free:      { daily:   5_000, burst:   100 },
  Premium:   { daily:  50_000, burst:   500 },
  Pro:       { daily: 300_000, burst: 2_000 },
  Unlimited: { daily: 1_000_000, burst: 5_000 },
};

// Default for unauthenticated / unknown plans
const DEFAULT_LIMITS = PLAN_LIMITS.Free;

/**
 * Returns a UTC date-stamp string (YYYY-MM-DD) for daily bucket keying.
 */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns a Unix timestamp rounded down to the current 60-second window.
 */
function currentMinuteWindow(): number {
  return Math.floor(Date.now() / 60_000) * 60_000;
}

/**
 * planAwareRateLimiter
 *
 * Middleware that enforces:
 *  1. Per-minute burst limit  (sliding 60s window via Redis TTL)
 *  2. Daily quota             (rolling UTC day bucket via Redis TTL to midnight)
 *
 * Attaches X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset headers.
 * Falls back gracefully if Redis is unavailable (allows request, logs warning).
 *
 * Reads planType from:
 *  - (req as any).planType   → set by requireApiKey middleware (API key consumers)
 *  - (req as any).user?.planType → set by requireAuth middleware (JWT users)
 */
export const planAwareRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const planType: string =
    (req as any).planType ??
    (req as any).user?.planType ??
    'Free';

  const limits = PLAN_LIMITS[planType] ?? DEFAULT_LIMITS;

  // Identifier: prefer userId/apiKeyId (per-user), fallback to IP (unauthenticated)
  const identifier: string =
    (req as any).userId ??
    (req as any).apiKeyId ??
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown';

  const burstKey = `vapi:rl:burst:${identifier}:${currentMinuteWindow()}`;
  const dailyKey = `vapi:rl:daily:${identifier}:${todayUTC()}`;

  try {
    // ── Atomic increment + TTL set ─────────────────────────────────────────
    // Use Redis pipeline for a single round-trip
    const pipeline = redis.pipeline();
    pipeline.incr(burstKey);
    pipeline.expire(burstKey, 60);           // TTL = 60 seconds
    pipeline.incr(dailyKey);
    pipeline.expireat(dailyKey, midnightUnix());  // TTL until UTC midnight

    const results = await pipeline.exec();
    const burstCount = results[0] as number;
    const dailyCount = results[2] as number;

    const dailyRemaining = Math.max(0, limits.daily - dailyCount);
    const resetTimestamp  = midnightUnix();

    // Attach PRD-required rate limit headers on every response
    res.setHeader('X-RateLimit-Plan',      planType);
    res.setHeader('X-RateLimit-Limit',     limits.daily);
    res.setHeader('X-RateLimit-Remaining', dailyRemaining);
    res.setHeader('X-RateLimit-Reset',     new Date(resetTimestamp * 1000).toISOString());
    res.setHeader('X-RateLimit-Burst',     limits.burst);

    // ── Burst check (per-minute window) ────────────────────────────────────
    if (burstCount > limits.burst) {
      res.status(429).json({
        success: false,
        error: {
          message: `Rate limit exceeded: max ${limits.burst} requests/minute for ${planType} plan.`,
          code:    'BURST_LIMIT_EXCEEDED',
          retryAfter: 60,
        },
      });
      return;
    }

    // ── Daily quota check ─────────────────────────────────────────────────
    if (dailyCount > limits.daily) {
      res.status(429).json({
        success: false,
        error: {
          message: `Daily quota exhausted: ${limits.daily} requests/day for ${planType} plan. Resets at midnight UTC.`,
          code:    'DAILY_QUOTA_EXCEEDED',
          retryAfter: secondsUntilMidnight(),
        },
      });
      return;
    }

    next();
  } catch (err: any) {
    // Redis unavailable → degrade gracefully, allow request through
    logger.warn('Rate limiter Redis error — allowing request (degraded mode)', {
      error: err.message,
      identifier,
      planType,
    });
    next();
  }
};

/**
 * Basic IP-based rate limiter for public/auth endpoints (no Redis needed initially).
 * Re-exported for backward compatibility with existing routes/index.ts.
 */
import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP.' },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns Unix timestamp for next UTC midnight. */
function midnightUnix(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.floor(midnight.getTime() / 1000);
}

/** Returns seconds remaining until next UTC midnight. */
function secondsUntilMidnight(): number {
  return midnightUnix() - Math.floor(Date.now() / 1000);
}
