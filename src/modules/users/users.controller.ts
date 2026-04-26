import { Request, Response, NextFunction } from 'express';
import { errors } from '../../utils/errors';
import { parsePageParams, buildEnvelope } from '../../utils/pagination';
import { listUsers, updateUserRole } from './users.service';
import type { Role } from '../../middleware/rbac';

/** GET /api/v1/users */
export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let page: number, limit: number;
    try {
      ({ page, limit } = parsePageParams(req.query.page, req.query.limit, {
        defaultLimit: 20,
        maxLimit: 100,
      }));
    } catch (e: any) {
      throw errors.unprocessable(e.message || 'Invalid pagination');
    }
    const result = await listUsers({ page, limit });
    res.json(
      buildEnvelope({
        data: result.data,
        page: result.page,
        limit: result.limit,
        total: result.total,
        basePath: '/api/v1/users',
        query: {},
      })
    );
  } catch (e) {
    next(e);
  }
};

/** PATCH /api/v1/users/:id/role */
export const setRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.body?.role as Role | undefined;
    if (role !== 'admin' && role !== 'analyst')
      throw errors.unprocessable('role must be "admin" or "analyst"');
    const updated = await updateUserRole(req.params.id, role);
    res.json({ status: 'success', data: updated });
  } catch (e) {
    next(e);
  }
};
