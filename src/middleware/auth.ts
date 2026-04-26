import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { errors } from '../utils/errors';

export interface AccessTokenClaims {
  sub: string; // user id
  username: string;
  role: 'admin' | 'analyst';
  iat?: number;
  exp?: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessTokenClaims;
  }
}

const extractBearer = (header: string | undefined): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const bearer = extractBearer(req.headers.authorization);
  const cookieToken = req.cookies?.access_token as string | undefined;
  const token = bearer || cookieToken;

  if (!token) return next(errors.unauthorized('Missing access token'));

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenClaims;
    req.user = payload;
    next();
  } catch {
    next(errors.unauthorized('Invalid or expired access token'));
  }
};

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const bearer = extractBearer(req.headers.authorization);
  const cookieToken = req.cookies?.access_token as string | undefined;
  const token = bearer || cookieToken;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenClaims;
  } catch {
    /* ignore */
  }
  next();
};
