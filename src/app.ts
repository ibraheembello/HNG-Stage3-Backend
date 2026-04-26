import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { requestLogger } from './middleware/logger';
import { globalRateLimiter } from './middleware/rateLimit';
import { csrfProtection } from './middleware/csrf';
import { errorHandler, notFoundHandler } from './middleware/error';

import authRoutes from './modules/auth/auth.routes';
import profileRoutes from './modules/profiles/profiles.routes';
import userRoutes from './modules/users/users.routes';

export const buildApp = (): Application => {
  const app = express();

  app.set('trust proxy', 1);

  // --- Security & infra ---
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS — reflects origin so `credentials: true` works for the web portal,
  // while non-browser clients (CLI / curl) are unaffected by CORS.
  app.use(
    cors({
      origin: (origin, cb) => cb(null, origin || true),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(globalRateLimiter);

  // --- Health (unprotected) ---
  app.get('/api/v1/health', (_req, res) => {
    res.json({
      data: {
        status: 'ok',
        env: env.NODE_ENV,
        time: new Date().toISOString(),
      },
    });
  });

  // CSRF applies before mutating routes — but endpoints decide if they need it
  // via the middleware itself (it's a no-op for safe methods + Bearer requests).
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/profiles', csrfProtection, profileRoutes);
  app.use('/api/v1/users', csrfProtection, userRoutes);

  // --- 404 + error ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
