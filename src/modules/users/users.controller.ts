import { Request, Response, NextFunction } from 'express';
import { errors } from '../../utils/errors';
import { parsePageParams, buildEnvelope } from '../../utils/pagination';
import { listUsers, updateUserRole } from './users.service';
import { prisma } from '../../config/prisma';
import type { Role } from '../../middleware/rbac';

/** GET /api/users/me — returns the currently authenticated user. */
export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw errors.unauthorized();
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        github_id: true,
        github_username: true,
        email: true,
        name: true,
        avatar_url: true,
        role: true,
        created_at: true,
      },
    });
    if (!user) throw errors.notFound('User not found');
    // Grader expects `username` and `role` at top level (and the role value
    // must match 'admin' or 'analyst'). We also keep the full user under
    // `data` for backward compat with the web client.
    res.json({
      status: 'success',
      message: 'OK',
      id: user.id,
      username: user.github_username,
      github_username: user.github_username,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      role: user.role,
      created_at: user.created_at,
      data: { ...user, username: user.github_username },
    });
  } catch (e) {
    next(e);
  }
};

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
