import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database';
import logger from '../utils/logger';

/**
 * attachUserContext — Soft dual-auth middleware for geo routes.
 *
 * Priority order:
 *  1. Authorization: Bearer <JWT>   → dashboard users
 *  2. X-API-Key + X-API-Secret      → B2B API clients
 *  3. Neither                       → anonymous (IP-based rate limiting still applies)
 *
 * On every authenticated request it registers a res.on('finish') listener that
 * writes an ApiLog row with the ACTUAL response time (in ms) and status code.
 * This replaces the old hardcoded responseTime: 0 approach.
 */
export const attachUserContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const start        = Date.now();
  const authHeader   = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key']    as string | undefined;
  const apiSecHeader = req.headers['x-api-secret'] as string | undefined;

  let userId:   string | undefined;
  let apiKeyId: string | undefined;
  let planType: string | undefined;

  // ── 1. JWT Bearer ────────────────────────────────────────────────────────
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token   = authHeader.split(' ')[1];
      const secret  = (process.env.JWT_SECRET || 'secret') as string;
      const decoded = jwt.verify(token, secret) as any;
      userId                  = decoded.userId;
      (req as any).userId     = decoded.userId;
      (req as any).userRole   = decoded.role;
      // planType comes from DB when needed by rate limiter — leave undefined here
      // so planAwareRateLimiter uses userId to look up plan if required
    } catch {
      // Invalid/expired JWT — fall through to anonymous
    }
  }

  // ── 2. API Key + Secret ──────────────────────────────────────────────────
  else if (apiKeyHeader && apiSecHeader) {
    try {
      const keyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKeyHeader },
        include: {
          user: { select: { id: true, planType: true, status: true, role: true } },
        },
      });

      if (
        keyRecord &&
        keyRecord.status === 'Active' &&
        keyRecord.user.status === 'ACTIVE' &&
        (!keyRecord.expiresAt || keyRecord.expiresAt > new Date())
      ) {
        const secretValid = await bcrypt.compare(apiSecHeader, keyRecord.secretHash);
        if (secretValid) {
          userId   = keyRecord.userId;
          apiKeyId = keyRecord.id;
          planType = keyRecord.user.planType;

          (req as any).userId   = userId;
          (req as any).apiKeyId = apiKeyId;
          (req as any).planType = planType;
          (req as any).userRole = keyRecord.user.role;

          // Fire-and-forget: update lastUsed timestamp
          prisma.apiKey
            .update({ where: { id: keyRecord.id }, data: { lastUsed: new Date() } })
            .catch(e => logger.error('lastUsed update failed', { error: e.message }));
        } else {
          // Wrong secret — reject explicitly rather than silently falling through
          res.status(401).json({
            success: false,
            error: { message: 'Invalid API secret', code: 'INVALID_API_SECRET' },
          });
          return;
        }
      } else if (keyRecord) {
        // Key exists but is revoked / expired / account suspended
        const code = keyRecord.status !== 'Active' ? 'REVOKED_KEY'
          : keyRecord.expiresAt && keyRecord.expiresAt <= new Date() ? 'KEY_EXPIRED'
          : 'ACCOUNT_SUSPENDED';
        res.status(401).json({
          success: false,
          error: { message: `API key rejected: ${code.toLowerCase().replace('_', ' ')}`, code },
        });
        return;
      } else {
        // Key not found at all
        res.status(401).json({
          success: false,
          error: { message: 'Invalid API key', code: 'INVALID_API_KEY' },
        });
        return;
      }
    } catch (e: any) {
      logger.error('attachUserContext API key error', { error: e.message });
      // Don't block request — fall through to anonymous
    }
  }

  // ── 3. Log on response finish (all authenticated requests) ───────────────
  if (userId) {
    const capturedUserId   = userId;
    const capturedApiKeyId = apiKeyId;

    res.on('finish', () => {
      const responseTime = Date.now() - start;
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req.socket?.remoteAddress ??
        null;

      prisma.apiLog
        .create({
          data: {
            endpoint:     req.originalUrl,
            method:       req.method,
            responseTime,
            statusCode:   res.statusCode,
            ipAddress:    ip,
            userId:       capturedUserId,
            apiKeyId:     capturedApiKeyId ?? null,
          },
        })
        .catch(e => logger.error('ApiLog write failed', { error: e.message }));
    });
  }

  next();
};
