import { Request, Response, NextFunction } from 'express';
import { errors } from '../../utils/errors';
import { parsePageParams } from '../../utils/pagination';
import { listUsers, updateUserRole } from './users.service';
import type { Role } from '../../middleware/rbac';

/** GET /api/v1/users */
export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let page: number, pageSize: number;
    try {
      ({ page, pageSize } = parsePageParams(req.query.page, req.query.pageSize, {
        defaultPageSize: 20,
        maxPageSize: 100,
      }));
    } catch (e: any) {
      throw errors.unprocessable(e.message || 'Invalid pagination');
    }
    const result = await listUsers({ page, pageSize });
    res.json({ data: result.data, pagination: result.pagination });
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
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
};
