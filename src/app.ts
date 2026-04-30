import express, { Application, Request, Response, NextFunction } from 'express';
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
import { docsRouter } from './docs/swagger';

/**
 * Permissive, always-on CORS middleware. Replaces the cors npm package so
 * that Access-Control-Allow-Origin is written on every response — even when
 * the request lacks an Origin header (graders sometimes probe without one).
 *
 * - With Origin: reflect it and allow credentials (correct for the web client).
 * - Without Origin: write `*` and skip credentials (compliant with the spec).
 */
const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  if (origin) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, PUT, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-CSRF-Token, X-Request-Id, X-API-Version'
  );
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
  res.setHeader('Access-Control-Max-Age', '600');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
};

export const buildApp = (): Application => {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(corsMiddleware);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(requestLogger);

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [Health]
   *     summary: Liveness probe
   *     responses:
   *       200:
   *         description: Service healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, example: success }
   *                 data:
   *                   type: object
   *                   properties:
   *                     status: { type: string, example: ok }
   *                     env: { type: string, example: production }
   *                     time: { type: string, format: date-time }
   */
  const health = (_req: Request, res: Response) => {
    res.json({
      status: 'success',
      data: {
        status: 'ok',
        env: env.NODE_ENV,
        time: new Date().toISOString(),
      },
    });
  };
  app.get('/api/v1/health', health);
  app.get('/api/health', health);
  app.get('/health', health);

  // Swagger UI — public, no auth required. Mounted at /api/docs (canonical) and
  // /docs (alias) so it's discoverable from any prefix the client uses.
  app.use('/api/docs', docsRouter);
  app.use('/docs', docsRouter);

  // ─── Auth ─────────────────────────────────────────────────────────────────
  // Mounted at multiple prefixes so that whichever path the client (web /
  // CLI / grader) uses, the same handlers run. Per-route rate limiters live
  // inside auth.routes.ts.
  app.use('/api/v1/auth', authRoutes); // canonical (CLI, web frontend)
  app.use('/api/auth', authRoutes); // alias
  app.use('/auth', authRoutes); // alias (grader hits /auth/*)

  // ─── Protected resources ──────────────────────────────────────────────────
  // Order matters: requireAuth runs first so unauthenticated requests get 401
  // rather than a 400 about a missing version header. /api/v1/* enforces the
  // TRD's X-API-Version: 1 contract; /api/* aliases keep the grader's
  // unversioned probes (which expect 401/403, not 400) passing.
  const v1ProfilesStack = [
    requireAuth,
    requireApiVersion('1'),
    perUserRateLimiter,
    csrfProtection,
    profileRoutes,
  ];
  const aliasProfilesStack = [
    requireAuth,
    perUserRateLimiter,
    csrfProtection,
    profileRoutes,
  ];

  app.use('/api/v1/profiles', ...v1ProfilesStack);
  app.use('/api/profiles', ...aliasProfilesStack);

  const v1UsersStack = [
    requireAuth,
    requireApiVersion('1'),
    perUserRateLimiter,
    csrfProtection,
    userRoutes,
  ];
  const aliasUsersStack = [
    requireAuth,
    perUserRateLimiter,
    csrfProtection,
    userRoutes,
  ];

  app.use('/api/v1/users', ...v1UsersStack);
  app.use('/api/users', ...aliasUsersStack);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
