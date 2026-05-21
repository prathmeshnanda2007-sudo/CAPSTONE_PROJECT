import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database';
import logger from '../utils/logger';

/**
 * API Key Authentication Middleware
 *
 * PRD format:
 *   X-API-Key:    ak_[32hex]  — public key, stored plaintext in DB (O(1) indexed lookup)
 *   X-API-Secret: as_[32hex]  — secret, bcrypt-hashed in DB
 *
 * Flow: findUnique(key) → check status → bcrypt.compare(secret, hash) → attach userId
 */
export const requireApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey    = req.headers['x-api-key'] as string | undefined;
  const apiSecret = req.headers['x-api-secret'] as string | undefined;

  if (!apiKey || !apiSecret) {
    res.status(401).json({
      success: false,
      error: {
        message: 'X-API-Key and X-API-Secret headers are required',
        code: 'MISSING_CREDENTIALS',
      },
    });
    return;
  }

  try {
    // O(1) indexed lookup — key column has @unique index
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: {
          select: { id: true, planType: true, status: true, role: true },
        },
      },
    });

    if (!keyRecord || keyRecord.status !== 'Active') {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid or revoked API key', code: 'INVALID_API_KEY' },
      });
      return;
    }

    // Check expiry
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      res.status(401).json({
        success: false,
        error: { message: 'API key has expired', code: 'KEY_EXPIRED' },
      });
      return;
    }

    // Verify secret via bcrypt
    const secretValid = await bcrypt.compare(apiSecret, keyRecord.secretHash);
    if (!secretValid) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid API secret', code: 'INVALID_API_SECRET' },
      });
      return;
    }

    // Check user account status
    if (keyRecord.user.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: {
          message: 'Account is not active. Please contact support.',
          code: 'ACCOUNT_NOT_ACTIVE',
        },
      });
      return;
    }

    // Attach context to request
    (req as any).userId   = keyRecord.userId;
    (req as any).apiKeyId = keyRecord.id;
    (req as any).planType = keyRecord.user.planType;

    // Async side-effects — fire and forget
    prisma.apiKey
      .update({ where: { id: keyRecord.id }, data: { lastUsed: new Date() } })
      .catch((e) => logger.error('Failed to update lastUsed', { error: e.message }));

    prisma.apiLog
      .create({
        data: {
          endpoint:     req.originalUrl,
          method:       req.method,
          responseTime: 0, // updated via response interceptor if needed
          statusCode:   200,
          ipAddress:    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? null,
          userId:       keyRecord.userId,
          apiKeyId:     keyRecord.id,
        },
      })
      .catch((e) => logger.error('Failed to write API log', { error: e.message }));

    next();
  } catch (error: any) {
    logger.error('API key middleware error', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
};
