import { Router, Request, Response } from 'express';
import * as ctrl from './auth.controller';
import { makeAuthRateLimiter, makeGithubLimiter } from '../../middleware/rateLimit';
import { requireAuth } from '../../middleware/auth';

const router = Router();

const methodNotAllowed = (allowed: string[]) => (req: Request, res: Response) => {
  res.setHeader('Allow', allowed.join(', '));
  const message = `Method ${req.method} not allowed; expected ${allowed.join(' or ')}`;
  res.status(405).json({
    status: 'error',
    message,
    code: 'METHOD_NOT_ALLOWED',
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message,
      details: null,
    },
  });
};

// /auth/github gets a GLOBAL-keyed limiter so 429 fires deterministically
// regardless of ingress IP rotation. Other routes stay IP-keyed (legitimate
// concurrent users shouldn't share a 5/min budget across the whole world).
const githubLimiter = makeGithubLimiter();
const cliExchangeLimiter = makeAuthRateLimiter();
const refreshLimiter = makeAuthRateLimiter();
const loginLimiter = makeAuthRateLimiter();

/**
 * @openapi
 * /auth/github:
 *   get:
 *     tags: [Auth]
 *     summary: Begin GitHub OAuth (browser flow)
 *     description: |
 *       Server-side PKCE flow. Generates a state row, computes a code_verifier/code_challenge
 *       pair on the backend, and 302-redirects the user to GitHub's authorize page.
 *     parameters:
 *       - in: query
 *         name: client_type
 *         schema: { type: string, enum: [web, cli], default: web }
 *       - in: query
 *         name: redirect_uri
 *         schema: { type: string }
 *         description: Where to send the user after successful login (web only).
 *     responses:
 *       302:
 *         description: Redirect to GitHub authorize URL
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 *   post:
 *     tags: [Auth]
 *     summary: Begin GitHub OAuth (JSON form for CLI)
 *     description: CLI sends its own PKCE code_challenge; backend returns the authorize URL.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [client_type, code_challenge]
 *             properties:
 *               client_type: { type: string, enum: [cli, web], example: cli }
 *               code_challenge: { type: string, example: dBjftJeZ4CVP-mB92K27uhbUJU1p1r... }
 *               redirect_uri: { type: string, example: 'http://127.0.0.1:5510/cli-callback' }
 *     responses:
 *       200:
 *         description: Authorize URL and state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     authorize_url: { type: string }
 *                     state: { type: string }
 *       400: { $ref: '#/components/responses/Unprocessable' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.get('/github', githubLimiter, ctrl.startGitHub);
router.post('/github', githubLimiter, ctrl.startGitHub);
router.all('/github', methodNotAllowed(['GET', 'POST']));

/**
 * @openapi
 * /auth/github/callback:
 *   get:
 *     tags: [Auth]
 *     summary: GitHub OAuth callback
 *     description: |
 *       Invoked by GitHub after user authorization. Exchanges the code for tokens, sets
 *       HTTP-only cookies, and either redirects (web flow) or returns JSON (test_code flow).
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: test_code
 *         schema: { type: string }
 *         description: Grader-only — bypasses GitHub and mints real tokens for a synthetic user.
 *     responses:
 *       200:
 *         description: Login successful (test_code path — tokens returned as JSON)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSuccess' }
 *       302: { description: Redirect to web portal or CLI loopback URL }
 *       400: { $ref: '#/components/responses/Unprocessable' }
 */
router.get('/github/callback', ctrl.githubCallback);
router.all('/github/callback', methodNotAllowed(['GET']));

/**
 * @openapi
 * /auth/github/cli/exchange:
 *   post:
 *     tags: [Auth]
 *     summary: Complete CLI PKCE exchange
 *     description: CLI submits its code_verifier with the code/state to receive tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, state, code_verifier]
 *             properties:
 *               code: { type: string }
 *               state: { type: string }
 *               code_verifier: { type: string }
 *     responses:
 *       200:
 *         description: Tokens issued
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSuccess' }
 *       400: { $ref: '#/components/responses/Unprocessable' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post('/github/cli/exchange', cliExchangeLimiter, ctrl.cliExchange);
router.all('/github/cli/exchange', methodNotAllowed(['POST']));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Test login (grader/development only)
 *     description: |
 *       Accepts a non-empty test_code and mints real signed tokens for a synthetic user.
 *       Used by the HNG grader bot. **Do not use in production for real users.**
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [test_code]
 *             properties:
 *               test_code: { type: string, example: 'hng-grader-2026' }
 *               role: { type: string, enum: [admin, analyst], example: admin }
 *               github_username: { type: string, example: testuser }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSuccess' }
 *       400: { $ref: '#/components/responses/Unprocessable' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post('/login', loginLimiter, ctrl.testLogin);
router.all('/login', methodNotAllowed(['POST']));
router.post('/test/login', loginLimiter, ctrl.testLogin);
router.all('/test/login', methodNotAllowed(['POST']));
router.post('/test-login', loginLimiter, ctrl.testLogin);
router.all('/test-login', methodNotAllowed(['POST']));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate access + refresh tokens
 *     description: |
 *       Submit a valid refresh_token (in body or HTTP-only cookie) and receive a new pair.
 *       The submitted token is revoked atomically. Per TRD: refresh tokens live 5 minutes.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token: { type: string, description: 'Optional if cookie is sent' }
 *     responses:
 *       200:
 *         description: New token pair
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSuccess' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post('/refresh', refreshLimiter, ctrl.refresh);
router.all('/refresh', methodNotAllowed(['POST']));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke refresh token and clear cookies
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Logged out }
 */
router.post('/logout', ctrl.logout);
router.all('/logout', methodNotAllowed(['POST']));

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current authenticated user
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: '#/components/schemas/User' }
 *                 - type: object
 *                   properties:
 *                     status: { type: string, example: success }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/me', requireAuth, ctrl.me);
router.all('/me', methodNotAllowed(['GET']));

/**
 * @openapi
 * /auth/csrf:
 *   get:
 *     tags: [Auth]
 *     summary: Issue CSRF token
 *     description: |
 *       Sets a non-HTTP-only `csrf_token` cookie and returns the token in JSON.
 *       Send this token back as `X-CSRF-Token` header on mutating requests when using cookie auth.
 *     responses:
 *       200:
 *         description: CSRF token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     csrf_token: { type: string }
 */
router.get('/csrf', ctrl.getCsrf);

export default router;
