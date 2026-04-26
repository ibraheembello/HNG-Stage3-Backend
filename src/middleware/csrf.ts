import { Request, Response, NextFunction } from 'express';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { env, isProd } from '../config/env';
import { errors } from '../utils/errors';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const sign = (raw: string): string =>
  createHmac('sha256', env.CSRF_SECRET).update(raw).digest('hex');

const buildToken = (): { raw: string; signed: string } => {
  const raw = randomBytes(24).toString('hex');
  return { raw, signed: `${raw}.${sign(raw)}` };
};

const verifyToken = (signed: string | undefined): boolean => {
  if (!signed || typeof signed !== 'string') return false;
  const idx = signed.lastIndexOf('.');
  if (idx <= 0) return false;
  const raw = signed.slice(0, idx);
  const provided = signed.slice(idx + 1);
  const expected = sign(raw);
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
};

export const issueCsrfCookie = (res: Response): string => {
  const { signed } = buildToken();
  res.cookie(CSRF_COOKIE, signed, {
    httpOnly: false,
    secure: isProd || env.COOKIE_SECURE,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: 60 * 60 * 1000,
  });
  return signed;
};

export const csrfProtection = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (SAFE_METHODS.has(req.method)) return next();

  // Bearer-token requests (CLI / non-cookie clients) skip CSRF — the threat model is browser CSRF only
  const hasBearer = !!req.headers.authorization?.startsWith('Bearer ');
  if (hasBearer) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken)
    return next(errors.forbidden('CSRF token missing'));
  if (cookieToken !== headerToken)
    return next(errors.forbidden('CSRF token mismatch'));
  if (!verifyToken(cookieToken))
    return next(errors.forbidden('CSRF token invalid'));

  next();
};
