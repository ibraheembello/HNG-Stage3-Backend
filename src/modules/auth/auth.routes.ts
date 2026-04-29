import { Router, Request, Response } from 'express';
import * as ctrl from './auth.controller';
import { authRateLimiter } from '../../middleware/rateLimit';
import { requireAuth } from '../../middleware/auth';

const router = Router();

const methodNotAllowed = (allowed: string[]) => (req: Request, res: Response) => {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${req.method} not allowed; expected ${allowed.join(' or ')}`,
      details: null,
    },
  });
};

// Browser entry point — server-side PKCE + 302 to GitHub's authorize URL.
router.get('/github', authRateLimiter, ctrl.startGitHub);
// JSON form — used by the CLI which sends its own code_challenge.
router.post('/github', authRateLimiter, ctrl.startGitHub);
router.all('/github', methodNotAllowed(['GET', 'POST']));

router.get('/github/callback', ctrl.githubCallback);
router.all('/github/callback', methodNotAllowed(['GET']));

router.post('/github/cli/exchange', authRateLimiter, ctrl.cliExchange);
router.all('/github/cli/exchange', methodNotAllowed(['POST']));

router.post('/refresh', authRateLimiter, ctrl.refresh);
router.all('/refresh', methodNotAllowed(['POST']));

router.post('/logout', ctrl.logout);
router.all('/logout', methodNotAllowed(['POST']));

router.get('/me', requireAuth, ctrl.me);
router.all('/me', methodNotAllowed(['GET']));

router.get('/csrf', ctrl.getCsrf);

export default router;
