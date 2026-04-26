import { Request, Response, NextFunction } from 'express';
import { errors } from '../utils/errors';

/**
 * TRD: every profile endpoint must require the `X-API-Version: 1` header.
 * Returns 400 Bad Request if the header is missing or the version is not supported.
 */
export const requireApiVersion = (expected: string) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const provided = req.header('x-api-version');
    if (!provided) {
      return next(errors.badRequest('Missing required header: X-API-Version'));
    }
    if (provided.trim() !== expected) {
      return next(errors.badRequest(`Unsupported API version: ${provided}`));
    }
    next();
  };
