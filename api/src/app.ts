import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import crypto from 'crypto';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import apiRouter from './routes';
import { errorHandler } from './middlewares/errorHandler';
import logger from './utils/logger';

dotenv.config();

const app = express();

// ─── Security & performance middleware ────────────────────────────────────
app.use(helmet());
app.use(compression());

// ─── CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.DEMO_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all if FRONTEND_URL is '*'
      if (process.env.FRONTEND_URL === '*') {
        return callback(null, true);
      }
      // Allow requests with no origin (curl, mobile apps, Postman)
      if (!origin) {
        return callback(null, true);
      }
      // Allow exact matches
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow any Vercel deployment URL
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-API-Secret'],
    exposedHeaders: ['X-Request-ID', 'X-Response-Time', 'X-Cache', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-RateLimit-Plan', 'X-RateLimit-Burst'],
    credentials: true,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request ID + response timing ─────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  const startTime = process.hrtime.bigint();

  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    logger.info(`${req.method} ${req.originalUrl}`, {
      requestId,
      statusCode: res.statusCode,
      durationMs: durationMs.toFixed(2),
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress,
    });
  });

  next();
});

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Village Data API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── Swagger UI (public, no auth required) ────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Village API Docs',
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui { background: transparent; }
    body { background: #0f172a; }
  `,
  swaggerOptions: { persistAuthorization: true },
}));

// Expose raw JSON spec for frontend consumption
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── API Routes ───────────────────────────────────────────────────────────
app.use('/v1', apiRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

export default app;
