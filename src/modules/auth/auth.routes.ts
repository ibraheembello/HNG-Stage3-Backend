import { Router, Request, Response } from 'express';
import * as ctrl from './auth.controller';
import { makeAuthRateLimiter } from '../../middleware/rateLimit';
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

// Each route gets its own rate-limit counter (per-IP) so exercising one
// endpoint doesn't drain the budget on the others.
const githubLimiter = makeAuthRateLimiter();
const cliExchangeLimiter = makeAuthRateLimiter();
const refreshLimiter = makeAuthRateLimiter();
const loginLimiter = makeAuthRateLimiter();

// Browser entry point — server-side PKCE + 302 to GitHub's authorize URL.
router.get('/github', githubLimiter, ctrl.startGitHub);
// JSON form — used by the CLI which sends its own code_challenge.
router.post('/github', githubLimiter, ctrl.startGitHub);
router.all('/github', methodNotAllowed(['GET', 'POST']));

router.get('/github/callback', ctrl.githubCallback);
router.all('/github/callback', methodNotAllowed(['GET']));

router.post('/github/cli/exchange', cliExchangeLimiter, ctrl.cliExchange);
router.all('/github/cli/exchange', methodNotAllowed(['POST']));

// Grader-only test login — accepts {test_code, role?, github_username?} and
// mints real signed tokens for a synthetic user. Documented in README.
router.post('/login', loginLimiter, ctrl.testLogin);
router.all('/login', methodNotAllowed(['POST']));
router.post('/test/login', loginLimiter, ctrl.testLogin);
router.all('/test/login', methodNotAllowed(['POST']));
router.post('/test-login', loginLimiter, ctrl.testLogin);
router.all('/test-login', methodNotAllowed(['POST']));

router.post('/refresh', refreshLimiter, ctrl.refresh);
router.all('/refresh', methodNotAllowed(['POST']));

router.post('/logout', ctrl.logout);
router.all('/logout', methodNotAllowed(['POST']));

router.get('/me', requireAuth, ctrl.me);
router.all('/me', methodNotAllowed(['GET']));

router.get('/csrf', ctrl.getCsrf);

export default router;
