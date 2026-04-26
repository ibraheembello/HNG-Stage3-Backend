import { Router } from 'express';
import * as ctrl from './profiles.controller';
import { requireRole } from '../../middleware/rbac';

const router = Router();

router.get('/', requireRole('admin', 'analyst'), ctrl.list);
router.get('/search', requireRole('admin', 'analyst'), ctrl.search);
router.get('/export', requireRole('admin', 'analyst'), ctrl.exportCsv);
router.get('/:id', requireRole('admin', 'analyst'), ctrl.getById);
router.post('/', requireRole('admin'), ctrl.create);

export default router;
