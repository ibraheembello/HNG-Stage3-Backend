import { Router } from 'express';
import * as ctrl from './users.controller';
import { requireRole } from '../../middleware/rbac';

const router = Router();

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Current authenticated user (alias of /auth/me)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Version
 *         required: true
 *         schema: { type: string, example: '1' }
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/me', ctrl.me);

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Version
 *         required: true
 *         schema: { type: string, example: '1' }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated user list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 total_pages: { type: integer }
 *                 links: { $ref: '#/components/schemas/PaginationLinks' }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', requireRole('admin'), ctrl.list);

/**
 * @openapi
 * /api/v1/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Change a user's role (admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *         csrfHeader: []
 *     parameters:
 *       - in: header
 *         name: X-API-Version
 *         required: true
 *         schema: { type: string, example: '1' }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [admin, analyst] }
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:id/role', requireRole('admin'), ctrl.setRole);

export default router;
