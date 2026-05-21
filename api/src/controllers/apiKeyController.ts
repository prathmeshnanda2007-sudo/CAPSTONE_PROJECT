import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/responseFormatter';

const PLAN_KEY_LIMITS: Record<string, number> = {
  Free: 2,
  Premium: 5,
  Pro: 5,
  Unlimited: 5,
};

export const apiKeyController = {
  // ─── Create Key ───────────────────────────────────────────────────────────
  createKey: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return sendError(res, 'Key name must be at least 2 characters', 400, 'INVALID_INPUT');
      }

      // Enforce per-plan key limit
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return sendError(res, 'User not found', 404);

      const existingKeyCount = await prisma.apiKey.count({
        where: { userId, status: 'Active' },
      });
      const limit = PLAN_KEY_LIMITS[user.planType] ?? 2;
      if (existingKeyCount >= limit) {
        return sendError(
          res,
          `Your ${user.planType} plan allows a maximum of ${limit} active API keys`,
          403,
          'KEY_LIMIT_REACHED'
        );
      }

      // PRD format: ak_[32hex] public key  +  as_[32hex] secret
      const rawKey    = `ak_${crypto.randomBytes(16).toString('hex')}`; // ak_ + 32 hex chars
      const rawSecret = `as_${crypto.randomBytes(16).toString('hex')}`; // as_ + 32 hex chars
      const secretHash = await bcrypt.hash(rawSecret, 10);

      const newKey = await prisma.apiKey.create({
        data: {
          name: name.trim(),
          key: rawKey,          // stored plaintext — used for O(1) indexed lookup
          secretHash,           // bcrypt hash of secret — never returned again after this
          userId,
        },
      });

      // Secret returned ONCE — user must store it securely
      return sendSuccess(res, {
        id: newKey.id,
        name: newKey.name,
        key: rawKey,           // full public key — shown in dashboard (masked after this)
        secret: rawSecret,     // ⚠️ shown ONCE — store securely
        status: newKey.status,
        createdAt: newKey.createdAt,
      }, {}, 201);
    } catch (error) {
      console.error(error);
      return sendError(res, 'Internal Server Error');
    }
  },

  // ─── List Keys ────────────────────────────────────────────────────────────
  getKeys: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const keys = await prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          key: true,        // show full public key in dashboard
          status: true,
          createdAt: true,
          lastUsed: true,
          expiresAt: true,
        },
      });
      // Mask key for display: ak_abcd...wxyz
      const maskedKeys = keys.map((k) => ({
        ...k,
        keyDisplay: `${k.key.substring(0, 10)}...${k.key.slice(-4)}`,
      }));
      return sendSuccess(res, maskedKeys);
    } catch (error) {
      return sendError(res, 'Internal Server Error');
    }
  },

  // ─── Revoke Key ───────────────────────────────────────────────────────────
  revokeKey: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const key = await prisma.apiKey.findUnique({ where: { id } });
      if (!key || key.userId !== userId) {
        return sendError(res, 'Key not found', 404, 'NOT_FOUND');
      }

      await prisma.apiKey.update({
        where: { id },
        data: { status: 'Revoked' },
      });
      return sendSuccess(res, { message: 'API key revoked successfully' });
    } catch (error) {
      return sendError(res, 'Internal Server Error');
    }
  },

  // ─── Delete Key ───────────────────────────────────────────────────────────
  deleteKey: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const key = await prisma.apiKey.findUnique({ where: { id } });
      if (!key || key.userId !== userId) {
        return sendError(res, 'Key not found', 404, 'NOT_FOUND');
      }

      await prisma.apiKey.delete({ where: { id } });
      return sendSuccess(res, { message: 'API key deleted' });
    } catch (error) {
      return sendError(res, 'Internal Server Error');
    }
  },
};
