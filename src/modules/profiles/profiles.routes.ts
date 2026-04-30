import { Router } from 'express';
import * as ctrl from './profiles.controller';
import { requireRole } from '../../middleware/rbac';

const router = Router();

/**
 * @openapi
 * /api/v1/profiles:
 *   get:
 *     tags: [Profiles]
 *     summary: List profiles (paginated, filterable)
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
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: gender
 *         schema: { type: string, enum: [male, female] }
 *       - in: query
 *         name: age_group
 *         schema: { type: string, enum: [child, teenager, adult, senior] }
 *       - in: query
 *         name: country_id
 *         schema: { type: string, example: NG }
 *       - in: query
 *         name: min_age
 *         schema: { type: integer, example: 18 }
 *       - in: query
 *         name: max_age
 *         schema: { type: integer, example: 35 }
 *       - in: query
 *         name: min_gender_probability
 *         schema: { type: number, example: 0.8 }
 *       - in: query
 *         name: min_country_probability
 *         schema: { type: number, example: 0.7 }
 *       - in: query
 *         name: sort_by
 *         schema: { type: string, enum: [age, created_at, gender_probability] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated profile list
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedProfiles' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 *   post:
 *     tags: [Profiles]
 *     summary: Create a profile (admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *         csrfHeader: []
 *     parameters:
 *       - in: header
 *         name: X-API-Version
 *         required: true
 *         schema: { type: string, example: '1' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateProfileInput' }
 *     responses:
 *       201:
 *         description: Profile created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: '#/components/schemas/Profile' }
 *                 - type: object
 *                   properties:
 *                     status: { type: string, example: success }
 *                     message: { type: string, example: Profile created }
 *                     data: { $ref: '#/components/schemas/Profile' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */
router.get('/', requireRole('admin', 'analyst'), ctrl.list);

/**
 * @openapi
 * /api/v1/profiles/search:
 *   get:
 *     tags: [Profiles]
 *     summary: Natural-language profile search
 *     description: |
 *       Parses an English query (regex-based, AND-only) into filter clauses.
 *       Examples — `female adults from Nigeria`, `male teenagers age 15 to 19`,
 *       `senior women in NG with high gender confidence`.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Version
 *         required: true
 *         schema: { type: string, example: '1' }
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         example: female adults from Nigeria
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Matching profiles (paginated)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedProfiles' }
 *       400: { $ref: '#/components/responses/Unprocessable' }
 */
router.get('/search', requireRole('admin', 'analyst'), ctrl.search);

/**
 * @openapi
 * /api/v1/profiles/export:
 *   get:
 *     tags: [Profiles]
 *     summary: Export profiles to CSV
 *     description: |
 *       Streams a CSV (`text/csv`) with all matching profiles. Accepts the same filters as
 *       `GET /profiles` plus optional `q` natural-language clause.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Version
 *         required: true
 *         schema: { type: string, example: '1' }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: gender
 *         schema: { type: string, enum: [male, female] }
 *       - in: query
 *         name: country_id
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: CSV download
 *         content:
 *           text/csv:
 *             schema: { type: string, format: binary }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/export', requireRole('admin', 'analyst'), ctrl.exportCsv);

/**
 * @openapi
 * /api/v1/profiles/{id}:
 *   get:
 *     tags: [Profiles]
 *     summary: Get a profile by id
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Version
 *         required: true
 *         schema: { type: string, example: '1' }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Profile found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { $ref: '#/components/schemas/Profile' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   patch:
 *     tags: [Profiles]
 *     summary: Partially update a profile (admin only)
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
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateProfileInput' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Profile' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Profiles]
 *     summary: Replace a profile (admin only)
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
 *           schema: { $ref: '#/components/schemas/CreateProfileInput' }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Profiles]
 *     summary: Delete a profile (admin only)
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
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Profile deleted }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', requireRole('admin', 'analyst'), ctrl.getById);
router.post('/', requireRole('admin'), ctrl.create);
router.patch('/:id', requireRole('admin'), ctrl.update);
router.put('/:id', requireRole('admin'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);

export default router;
