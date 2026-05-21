import express from 'express';
const router = express.Router();

import villageRoutes from './villageRoutes';
import adminRoutes   from './adminRoutes';
import { authController }      from '../controllers/authController';
import { apiKeyController }    from '../controllers/apiKeyController';
import { dashboardController } from '../controllers/dashboardController';
import { requireAuth }         from '../middlewares/authMiddleware';
import { attachUserContext }   from '../middlewares/attachUserContext';
import { apiRateLimiter, planAwareRateLimiter } from '../middlewares/rateLimiter';

// ─── Public Auth routes (IP-based limiter: 300 req / 15 min) ─────────────────
router.post('/auth/register', apiRateLimiter, authController.register);
router.post('/auth/login',    apiRateLimiter, authController.login);

// ─── Protected Dashboard routes (JWT) ────────────────────────────────────────
router.get('/dashboard/metrics', requireAuth, dashboardController.getMetrics);
router.get('/dashboard/stats',   requireAuth, dashboardController.getHourlyStats);

// ─── Protected API Key routes (JWT) ──────────────────────────────────────────
router.post('/keys',              requireAuth, apiKeyController.createKey);
router.get('/keys',               requireAuth, apiKeyController.getKeys);
router.patch('/keys/:id/revoke',  requireAuth, apiKeyController.revokeKey);
router.delete('/keys/:id',        requireAuth, apiKeyController.deleteKey);

// ─── Geo Data API ─────────────────────────────────────────────────────────────
// Middleware chain:
//  1. attachUserContext — dual-auth (JWT or X-API-Key+Secret), anonymous fallback,
//                         fires real-time ApiLog with actual responseTime on finish
//  2. planAwareRateLimiter — enforces per-user daily quota + burst (Redis)
router.use('/geo', attachUserContext, planAwareRateLimiter, villageRoutes);

// ─── Admin API ────────────────────────────────────────────────────────────────
router.use('/admin', adminRoutes);

export default router;
