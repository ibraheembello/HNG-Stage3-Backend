import { Router } from 'express';
import * as ctrl from './users.controller';
import { requireRole } from '../../middleware/rbac';

const router = Router();

router.get('/', requireRole('admin'), ctrl.list);
router.patch('/:id/role', requireRole('admin'), ctrl.setRole);

export default router;
