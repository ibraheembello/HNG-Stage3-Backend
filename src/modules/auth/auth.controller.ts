import { Request, Response, NextFunction } from 'express';
import ms from 'ms';
import { env, isProd } from '../../config/env';

const toMs = (value: string): number => {
  const n = (ms as unknown as (v: string) => number)(value);
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`Invalid duration: ${value}`);
  }
  return n;
};
import { errors } from '../../utils/errors';
import { issueCsrfCookie } from '../../middleware/csrf';
import {
  startOAuth,
  handleGitHubCallback,
  completeCliExchange,
  ClientType,
} from './auth.service';
import { rotateRefreshToken, revokeRefreshToken } from './tokens.service';
import { prisma } from '../../config/prisma';

const accessCookieOpts = {
  httpOnly: true,
  secure: isProd || env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
};

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  refreshExpiresAt: Date
) => {
  res.cookie('access_token', accessToken, {
    ...accessCookieOpts,
    maxAge: toMs(env.ACCESS_TOKEN_TTL),
  });
  res.cookie('refresh_token', refreshToken, {
    ...accessCookieOpts,
    expires: refreshExpiresAt,
  });
  issueCsrfCookie(res);
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie('access_token', { ...accessCookieOpts });
  res.clearCookie('refresh_token', { ...accessCookieOpts });
  res.clearCookie('csrf_token', { ...accessCookieOpts, httpOnly: false });
};

/**
 * POST  /auth/github  — JSON form, used by CLI (sends own code_challenge) or
 *                       JS clients that want the authorize URL back.
 * GET   /auth/github  — Browser flow. Backend generates PKCE server-side,
 *                       persists state row, and 302-redirects to GitHub.
 */
export const startGitHub = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isGet = req.method === 'GET';
    const clientType = (
      isGet
        ? (req.query.client_type as string | undefined) ?? 'web'
        : (req.body?.client_type ?? 'web')
    ) as ClientType;

    if (clientType !== 'web' && clientType !== 'cli')
      throw errors.badRequest('client_type must be "web" or "cli"');

    const codeChallenge = isGet
      ? (req.query.code_challenge as string | undefined)
      : req.body?.code_challenge;
    const redirectUri = isGet
      ? (req.query.redirect_uri as string | undefined)
      : req.body?.redirect_uri;

    const { authorizeUrl, state } = await startOAuth({
      clientType,
      codeChallenge,
      redirectUri,
    });

    if (isGet) {
      // Browser flow: send the user straight to GitHub's authorize page.
      // Set explicit CORS headers so a browser-side fetcher can read the redirect
      // target. With credentials, we have to reflect the origin (no wildcard).
      const origin = req.headers.origin;
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Vary', 'Origin');
      if (origin) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      return res.redirect(302, authorizeUrl);
    }

    res.json({ data: { authorize_url: authorizeUrl, state } });
  } catch (e) {
    next(e);
  }
};

/** GET /api/v1/auth/github/callback?code&state — invoked by GitHub */
export const githubCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    if (!code || !state) throw errors.badRequest('Missing code or state');

    const result = await handleGitHubCallback({ code, state });

    if (result.kind === 'cli') {
      const url = new URL(result.redirectUri);
      url.searchParams.set('code', result.code);
      url.searchParams.set('state', result.state);
      return res.redirect(302, url.toString());
    }

    // Web flow — set cookies, redirect to portal
    setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens.refreshExpiresAt
    );
    const target = result.redirectUri || env.WEB_ORIGIN;
    res.redirect(302, target);
  } catch (e) {
    next(e);
  }
};

/** POST /api/v1/auth/github/cli/exchange — CLI completes the flow */
export const cliExchange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state, code_verifier } = req.body ?? {};
    if (!code || !state || !code_verifier)
      throw errors.badRequest('code, state and code_verifier are required');

    const tokens = await completeCliExchange({ code, state, codeVerifier: code_verifier });
    res.json({
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refresh_expires_at: tokens.refreshExpiresAt.toISOString(),
        user: tokens.user,
      },
    });
  } catch (e) {
    next(e);
  }
};

/** POST /api/v1/auth/refresh */
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fromBody = req.body?.refresh_token as string | undefined;
    const fromCookie = req.cookies?.refresh_token as string | undefined;
    const raw = fromBody || fromCookie;
    if (!raw) throw errors.unauthorized('Missing refresh token');

    const result = await rotateRefreshToken(raw);

    if (fromCookie && !fromBody) {
      // Web flow — set new cookies, return user only
      setAuthCookies(res, result.accessToken, result.refreshToken, result.refreshExpiresAt);
      return res.json({ data: { user: result.user } });
    }
    res.json({
      data: {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        refresh_expires_at: result.refreshExpiresAt.toISOString(),
        user: result.user,
      },
    });
  } catch (e) {
    next(e);
  }
};

/** POST /api/v1/auth/logout */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fromBody = req.body?.refresh_token as string | undefined;
    const fromCookie = req.cookies?.refresh_token as string | undefined;
    const raw = fromBody || fromCookie;
    if (raw) await revokeRefreshToken(raw);
    clearAuthCookies(res);
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
};

/** GET /api/v1/auth/me */
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
    res.json({ data: user });
  } catch (e) {
    next(e);
  }
};

/** GET /api/v1/auth/csrf — issues CSRF token cookie for the web client */
export const getCsrf = async (_req: Request, res: Response) => {
  const token = issueCsrfCookie(res);
  res.json({ data: { csrf_token: token } });
};
