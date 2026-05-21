import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/responseFormatter';
import { invalidate } from '../utils/cache';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PLAN_DAILY_LIMITS: Record<string, number> = {
  Free: 5_000, Premium: 50_000, Pro: 300_000, Unlimited: 1_000_000,
};

export const adminController = {

  // ── GET /v1/admin/stats ─ Platform-wide metrics ───────────────────────────
  getStats: async (req: Request, res: Response) => {
    try {
      const [
        totalUsers, activeUsers, pendingUsers, suspendedUsers,
        totalKeys, totalLogs, todayLogs,
        planBreakdown, topEndpoints,
      ] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
        prisma.user.count({ where: { status: 'PENDING_APPROVAL', deletedAt: null } }),
        prisma.user.count({ where: { status: 'SUSPENDED', deletedAt: null } }),
        prisma.apiKey.count({ where: { status: 'Active' } }),
        prisma.apiLog.count(),
        prisma.apiLog.count({
          where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        }),
        // Plan distribution
        prisma.user.groupBy({
          by: ['planType'],
          _count: { planType: true },
          where: { deletedAt: null },
        }),
        // Top endpoints by usage
        prisma.apiLog.groupBy({
          by: ['endpoint'],
          _count: { endpoint: true },
          orderBy: { _count: { endpoint: 'desc' } },
          take: 5,
        }),
      ]);

      // Daily requests over last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentLogs = await prisma.apiLog.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, statusCode: true },
      });

      // Group by date
      const dailyMap: Record<string, { total: number; errors: number }> = {};
      for (const log of recentLogs) {
        const date = log.createdAt.toISOString().slice(0, 10);
        if (!dailyMap[date]) dailyMap[date] = { total: 0, errors: 0 };
        dailyMap[date].total++;
        if (log.statusCode >= 400) dailyMap[date].errors++;
      }
      const dailyRequests = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v }));

      return sendSuccess(res, {
        users: { total: totalUsers, active: activeUsers, pending: pendingUsers, suspended: suspendedUsers },
        keys: { active: totalKeys },
        requests: { total: totalLogs, today: todayLogs },
        planBreakdown: planBreakdown.map(p => ({ plan: p.planType, count: p._count.planType })),
        topEndpoints: topEndpoints.map(e => ({ endpoint: e.endpoint, count: e._count.endpoint })),
        dailyRequests,
      });
    } catch (err: any) {
      return sendError(res, 'Failed to fetch admin stats');
    }
  },

  // ── GET /v1/admin/users ─ List all users ──────────────────────────────────
  listUsers: async (req: Request, res: Response) => {
    try {
      const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const status = req.query.status as string | undefined;
      const plan   = req.query.plan   as string | undefined;
      const search = req.query.search as string | undefined;
      const skip   = (page - 1) * limit;

      const where: any = { deletedAt: null };
      if (status) where.status = status;
      if (plan)   where.planType = plan;
      if (search) where.OR = [
        { email:        { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where, skip, take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, email: true, businessName: true, phone: true,
            planType: true, role: true, status: true,
            createdAt: true, updatedAt: true,
            _count: { select: { apiKeys: true, apiLogs: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      return sendSuccess(res, users, {
        page, limit, total, totalPages: Math.ceil(total / limit),
      });
    } catch (err: any) {
      return sendError(res, 'Failed to fetch users');
    }
  },

  // ── GET /v1/admin/users/:id ─ User detail ────────────────────────────────
  getUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          apiKeys: {
            select: { id: true, name: true, key: true, status: true, lastUsed: true, createdAt: true, expiresAt: true },
            orderBy: { createdAt: 'desc' },
          },
          stateAccess: {
            include: { state: { select: { id: true, name: true, code: true } } },
          },
          _count: { select: { apiLogs: true } },
        },
      });

      if (!user) return sendError(res, 'User not found', 404, 'NOT_FOUND');

      // Today's request count for this user
      const todayCount = await prisma.apiLog.count({
        where: {
          userId: id,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });

      const dailyLimit = PLAN_DAILY_LIMITS[user.planType] ?? 5_000;

      return sendSuccess(res, {
        ...user,
        passwordHash: undefined,   // never expose hash
        usage: { today: todayCount, limit: dailyLimit, percent: Math.round((todayCount / dailyLimit) * 100) },
      });
    } catch (err: any) {
      return sendError(res, 'Failed to fetch user');
    }
  },

  // ── PATCH /v1/admin/users/:id/approve ─────────────────────────────────────
  approveUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.update({
        where: { id },
        data: { status: 'ACTIVE' },
        select: { id: true, email: true, businessName: true, status: true },
      });
      return sendSuccess(res, user);
    } catch {
      return sendError(res, 'Failed to approve user');
    }
  },

  // ── PATCH /v1/admin/users/:id/suspend ─────────────────────────────────────
  suspendUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.update({
        where: { id },
        data: { status: 'SUSPENDED' },
        select: { id: true, email: true, businessName: true, status: true },
      });
      return sendSuccess(res, user);
    } catch {
      return sendError(res, 'Failed to suspend user');
    }
  },

  // ── PATCH /v1/admin/users/:id/plan ── Change plan ─────────────────────────
  changePlan: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { planType } = req.body;
      const validPlans = ['Free', 'Premium', 'Pro', 'Unlimited'];
      if (!validPlans.includes(planType)) {
        return sendError(res, `Invalid planType. Must be one of: ${validPlans.join(', ')}`, 400, 'INVALID_PLAN');
      }
      const user = await prisma.user.update({
        where: { id },
        data: { planType },
        select: { id: true, email: true, businessName: true, planType: true },
      });
      return sendSuccess(res, user);
    } catch {
      return sendError(res, 'Failed to change plan');
    }
  },

  // ── PATCH /v1/admin/users/:id/role ── Promote/demote role ─────────────────
  changeRole: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!['USER', 'ADMIN'].includes(role)) {
        return sendError(res, 'Invalid role. Must be USER or ADMIN.', 400, 'INVALID_ROLE');
      }
      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, email: true, role: true },
      });
      return sendSuccess(res, user);
    } catch {
      return sendError(res, 'Failed to change role');
    }
  },

  // ── POST /v1/admin/users/:id/state-access ── Grant state access ───────────
  grantStateAccess: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { stateId } = req.body;
      if (!stateId) return sendError(res, 'stateId is required', 400, 'MISSING_FIELD');

      await prisma.userStateAccess.upsert({
        where: { userId_stateId: { userId: id, stateId } },
        create: { userId: id, stateId },
        update: {},
      });

      return sendSuccess(res, { userId: id, stateId, granted: true });
    } catch {
      return sendError(res, 'Failed to grant state access');
    }
  },

  // ── DELETE /v1/admin/users/:id/state-access/:stateId ── Revoke access ─────
  revokeStateAccess: async (req: Request, res: Response) => {
    try {
      const { id, stateId } = req.params;
      await prisma.userStateAccess.delete({
        where: { userId_stateId: { userId: id, stateId } },
      });
      return sendSuccess(res, { userId: id, stateId, revoked: true });
    } catch {
      return sendError(res, 'Failed to revoke state access');
    }
  },

  // ── GET /v1/admin/logs ─ API log viewer ──────────────────────────────────
  getLogs: async (req: Request, res: Response) => {
    try {
      const page       = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit      = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
      const userId     = req.query.userId   as string | undefined;
      const statusCode = req.query.status   as string | undefined;
      const endpoint   = req.query.endpoint as string | undefined;
      const skip       = (page - 1) * limit;

      const where: any = {};
      if (userId)     where.userId = userId;
      if (statusCode) where.statusCode = parseInt(statusCode);
      if (endpoint)   where.endpoint = { contains: endpoint, mode: 'insensitive' };

      const [logs, total] = await Promise.all([
        prisma.apiLog.findMany({
          where, skip, take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user:   { select: { id: true, email: true, businessName: true } },
            apiKey: { select: { id: true, name: true } },
          },
        }),
        prisma.apiLog.count({ where }),
      ]);

      return sendSuccess(res, logs, { page, limit, total, totalPages: Math.ceil(total / limit) });
    } catch (err: any) {
      return sendError(res, 'Failed to fetch logs');
    }
  },

  // ── DELETE /v1/admin/cache ─ Flush Redis cache ────────────────────────────
  flushCache: async (req: Request, res: Response) => {
    try {
      // Invalidate the most-hit cache keys
      const { invalidate } = await import('../utils/cache');
      await invalidate('states:all');
      return sendSuccess(res, { flushed: true, message: 'Cache invalidated successfully' });
    } catch {
      return sendError(res, 'Failed to flush cache');
    }
  },
};
