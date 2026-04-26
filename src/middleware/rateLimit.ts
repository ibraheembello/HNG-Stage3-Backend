import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const buildLimiter = (max: number, windowMs: number) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests, please try again later',
          details: null,
        },
      });
    },
  });

export const globalRateLimiter = buildLimiter(
  env.RATE_LIMIT_MAX,
  env.RATE_LIMIT_WINDOW_MS
);

export const authRateLimiter = buildLimiter(
  env.AUTH_RATE_LIMIT_MAX,
  env.RATE_LIMIT_WINDOW_MS
);
