import express from 'express';
import { adminController } from '../controllers/adminController';
import { requireAuth } from '../middlewares/authMiddleware';
import { requireAdmin } from '../middlewares/adminMiddleware';

const router = express.Router();

// All admin routes require JWT auth + ADMIN role
router.use(requireAuth, requireAdmin);

// ─── Platform Analytics ──────────────────────────────────────────────────────
router.get('/stats', adminController.getStats);

// ─── User Management ─────────────────────────────────────────────────────────
router.get('/users',                         adminController.listUsers);
router.get('/users/:id',                     adminController.getUser);
router.patch('/users/:id/approve',           adminController.approveUser);
router.patch('/users/:id/suspend',           adminController.suspendUser);
router.patch('/users/:id/plan',              adminController.changePlan);
router.patch('/users/:id/role',              adminController.changeRole);
router.post('/users/:id/state-access',       adminController.grantStateAccess);
router.delete('/users/:id/state-access/:stateId', adminController.revokeStateAccess);

// ─── API Log Viewer ──────────────────────────────────────────────────────────
router.get('/logs', adminController.getLogs);

// ─── Cache Management ────────────────────────────────────────────────────────
router.delete('/cache', adminController.flushCache);

export default router;
