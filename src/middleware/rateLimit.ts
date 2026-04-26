import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../config/env';

const tooManyHandler = (_req: Request, res: any) => {
  res.status(429).json({
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later',
      details: null,
    },
  });
};

/**
 * Per-user limiter: keys by authenticated user id when present,
 * otherwise falls back to ip. Used on non-auth endpoints (TRD: 60 rpm).
 */
export const perUserRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'anonymous',
  handler: tooManyHandler,
});

/**
 * Auth-route limiter: keys by ip (no user yet). TRD: 10 rpm.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooManyHandler,
});
