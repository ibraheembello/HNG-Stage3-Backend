import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { requestLogger } from './middleware/logger';
import { perUserRateLimiter } from './middleware/rateLimit';
import { csrfProtection } from './middleware/csrf';
import { requireApiVersion } from './middleware/apiVersion';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';

import authRoutes from './modules/auth/auth.routes';
import profileRoutes from './modules/profiles/profiles.routes';
import userRoutes from './modules/users/users.routes';

export const buildApp = (): Application => {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: (origin, cb) => cb(null, origin || true),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'X-Request-Id',
        'X-API-Version',
      ],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(requestLogger);

  // Health (unprotected, no rate limit)
  app.get('/api/v1/health', (_req, res) => {
    res.json({
      status: 'success',
      data: {
        status: 'ok',
        env: env.NODE_ENV,
        time: new Date().toISOString(),
      },
    });
  });

  // Auth routes have their own per-route limiter (10/min, ip-keyed)
  app.use('/api/v1/auth', authRoutes);

  // Profile + user routes: TRD requires X-API-Version: 1 + per-user 60/min limit
  app.use(
    '/api/v1/profiles',
    requireApiVersion('1'),
    requireAuth,
    perUserRateLimiter,
    csrfProtection,
    profileRoutes
  );
  app.use(
    '/api/v1/users',
    requireApiVersion('1'),
    requireAuth,
    perUserRateLimiter,
    csrfProtection,
    userRoutes
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
