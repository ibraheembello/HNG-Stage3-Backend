import { Router } from 'express';
import * as ctrl from './auth.controller';
import { authRateLimiter } from '../../middleware/rateLimit';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.post('/github', authRateLimiter, ctrl.startGitHub);
router.get('/github/callback', ctrl.githubCallback);
router.post('/github/cli/exchange', authRateLimiter, ctrl.cliExchange);
router.post('/refresh', authRateLimiter, ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.me);
router.get('/csrf', ctrl.getCsrf);

export default router;
