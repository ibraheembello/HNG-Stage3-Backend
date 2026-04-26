import { Router } from 'express';
import * as ctrl from './profiles.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();

// Both roles can read profile data and export it
router.get('/', requireAuth, requireRole('admin', 'analyst'), ctrl.list);
router.get('/search', requireAuth, requireRole('admin', 'analyst'), ctrl.search);
router.get('/export', requireAuth, requireRole('admin', 'analyst'), ctrl.exportCsv);
router.get('/:id', requireAuth, requireRole('admin', 'analyst'), ctrl.getById);

export default router;
