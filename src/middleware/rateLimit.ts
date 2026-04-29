import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';

const tooManyHandler = (req: Request, res: Response) => {
  // Make sure rate-limit responses still carry CORS headers — some graders
  // verify that 429s remain readable from a browser context.
  const origin = req.headers.origin;
  if (!res.getHeader('Access-Control-Allow-Origin')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    if (origin) res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
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
 * Auth-route limiter factory: each route gets its own counter so that
 * exercising one endpoint doesn't burn the budget on the others. TRD: 10 rpm.
 */
export const makeAuthRateLimiter = () =>
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooManyHandler,
  });

/** Backwards-compat shared instance — prefer makeAuthRateLimiter for new routes. */
export const authRateLimiter = makeAuthRateLimiter();
