import { Request, Response } from 'express';
import crypto from 'crypto';

export interface RateLimitMeta {
  limit: number;
  remaining: number;
  reset: string;
}

export interface ResponseMeta {
  requestId: string;
  responseTime?: number;
  rateLimit?: RateLimitMeta;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export const sendSuccess = (
  res: Response,
  data: any,
  meta: Partial<ResponseMeta> = {},
  statusCode = 200
) => {
  const requestId = (res.req as any)?.requestId ?? crypto.randomUUID();
  return res.status(statusCode).json({
    success: true,
    count: Array.isArray(data) ? data.length : undefined,
    data,
    meta: {
      requestId,
      ...meta,
    },
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  code?: string
) => {
  const requestId = (res.req as any)?.requestId ?? crypto.randomUUID();
  return res.status(statusCode).json({
    success: false,
    error: { message, ...(code && { code }) },
    meta: { requestId },
  });
};
