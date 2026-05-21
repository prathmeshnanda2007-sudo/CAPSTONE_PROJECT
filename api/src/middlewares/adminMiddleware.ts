import { Request, Response, NextFunction } from 'express';

/**
 * Requires the requesting user to have role === 'ADMIN'.
 * Must be placed AFTER requireAuth in the middleware chain.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).userRole;

  if (role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. Administrator privileges required.',
        code: 'FORBIDDEN',
      },
    });
  }

  next();
};
