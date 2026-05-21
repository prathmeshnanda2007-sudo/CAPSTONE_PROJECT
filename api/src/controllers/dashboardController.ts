import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/responseFormatter';

const PLAN_DAILY_LIMITS: Record<string, number> = {
  Free:      5_000,
  Premium:   50_000,
  Pro:       300_000,
  Unlimited: 1_000_000,
};

export const dashboardController = {

  // ── GET /v1/dashboard/metrics ─────────────────────────────────────────────
  getMetrics: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { planType: true, businessName: true, email: true, status: true, role: true },
      });
      if (!user) return sendError(res, 'User not found', 404);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalRequests, todayRequests, activeKeys, recentLogs] = await Promise.all([
        prisma.apiLog.count({ where: { userId } }),
        prisma.apiLog.count({ where: { userId, createdAt: { gte: today } } }),
        prisma.apiKey.count({ where: { userId, status: 'Active' } }),
        prisma.apiLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true, endpoint: true, method: true,
            responseTime: true, statusCode: true, createdAt: true,
          },
        }),
      ]);

      const dailyLimit   = PLAN_DAILY_LIMITS[user.planType] ?? 5_000;
      const usagePercent = dailyLimit > 0 ? Math.round((todayRequests / dailyLimit) * 100) : 0;

      return sendSuccess(res, {
        user:           { businessName: user.businessName, email: user.email, planType: user.planType, role: user.role },
        totalRequests,
        todayRequests,
        activeKeys,
        dailyLimit,
        usagePercent,
        recentLogs,
      });
    } catch {
      return sendError(res, 'Internal Server Error');
    }
  },

  // ── GET /v1/dashboard/stats?period=24h|7d|30d ────────────────────────────
  // Returns real time-series request data for the Overview chart.
  getHourlyStats: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const period = (req.query.period as string) || '24h';

      // Determine bucket size and lookback window
      const isHourly = period === '24h';
      const buckets  = isHourly ? 24 : period === '7d' ? 7 : 30;
      const msPerBucket = isHourly ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const since = new Date(Date.now() - buckets * msPerBucket);

      // Fetch all logs in range (avoid expensive GROUP BY for small user sets)
      const logs = await prisma.apiLog.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true, responseTime: true, statusCode: true },
        orderBy: { createdAt: 'asc' },
      });

      // Build bucket labels + initialize counts
      const bucketMap: Record<string, { requests: number; latencySum: number; errors: number }> = {};

      for (let i = buckets - 1; i >= 0; i--) {
        const ts   = new Date(Date.now() - i * msPerBucket);
        const label = isHourly
          ? `${ts.getHours().toString().padStart(2, '0')}:00`
          : ts.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        bucketMap[label] = { requests: 0, latencySum: 0, errors: 0 };
      }

      // Assign each log to its bucket
      for (const log of logs) {
        const ts = new Date(log.createdAt);
        const label = isHourly
          ? `${ts.getHours().toString().padStart(2, '0')}:00`
          : ts.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        if (bucketMap[label]) {
          bucketMap[label].requests++;
          bucketMap[label].latencySum += log.responseTime;
          if (log.statusCode >= 400) bucketMap[label].errors++;
        }
      }

      const chartData = Object.entries(bucketMap).map(([time, d]) => ({
        time,
        requests: d.requests,
        latency:  d.requests > 0 ? Math.round(d.latencySum / d.requests) : 0,
        errors:   d.errors,
      }));

      // Compute top endpoints for this period
      const endpointCounts: Record<string, number> = {};
      for (const log of logs) {
        const key = log.createdAt ? req.originalUrl : 'unknown'; // placeholder
        // Use a simplified path key
        const ep = 'request';
        endpointCounts[ep] = (endpointCounts[ep] ?? 0) + 1;
      }

      // Top endpoints from DB (aggregated properly)
      const topEndpoints = await prisma.apiLog.groupBy({
        by: ['endpoint'],
        _count: { endpoint: true },
        where: { userId, createdAt: { gte: since } },
        orderBy: { _count: { endpoint: 'desc' } },
        take: 5,
      });

      return sendSuccess(res, {
        period,
        chartData,
        topEndpoints: topEndpoints.map(e => ({
          path:    e.endpoint.replace('/v1', ''),
          count:   e._count.endpoint,
          percent: logs.length > 0 ? Math.round((e._count.endpoint / logs.length) * 100) : 0,
        })),
        totalInPeriod: logs.length,
        errorRate: logs.length > 0
          ? Math.round((logs.filter(l => l.statusCode >= 400).length / logs.length) * 100)
          : 0,
        avgLatency: logs.length > 0
          ? Math.round(logs.reduce((s, l) => s + l.responseTime, 0) / logs.length)
          : 0,
      });
    } catch (err: any) {
      return sendError(res, 'Internal Server Error');
    }
  },
};
