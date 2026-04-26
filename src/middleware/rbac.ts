import { Request, Response, NextFunction } from 'express';
import { errors } from '../utils/errors';

export type Role = 'admin' | 'analyst';

export const requireRole =
  (...allowed: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(errors.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(errors.forbidden(`Requires one of roles: ${allowed.join(', ')}`));
    }
    next();
  };
