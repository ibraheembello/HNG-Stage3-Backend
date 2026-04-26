import { Router } from 'express';
import * as ctrl from './users.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), ctrl.list);
router.patch('/:id/role', requireAuth, requireRole('admin'), ctrl.setRole);

export default router;
