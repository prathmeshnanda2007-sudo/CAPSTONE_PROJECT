import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1] as string;

  try {
    const secret = (process.env.JWT_SECRET || 'secret') as string;
    const decoded = jwt.verify(token, secret) as any;
    (req as any).userId = decoded.userId;
    (req as any).userRole = decoded.role;   // ← attach role for adminMiddleware
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
