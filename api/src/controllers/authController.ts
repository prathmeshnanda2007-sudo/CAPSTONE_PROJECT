import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

export const authController = {
  register: async (req: Request, res: Response) => {
    try {
      const { email, password, businessName } = req.body;

      if (!email || !password || !businessName) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          businessName,
          // TODO Phase 3: change to PENDING_APPROVAL once admin approval flow is built
          status: 'ACTIVE',
        }
      });

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1d' }
      );

      res.json({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, businessName: user.businessName, planType: user.planType, role: user.role }
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  },

  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1d' }
      );

      res.json({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, businessName: user.businessName, planType: user.planType, role: user.role }
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
};
