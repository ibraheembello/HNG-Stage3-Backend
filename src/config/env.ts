import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const required = (name: string, value: string | undefined): string => {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const optional = (value: string | undefined, fallback: string): string => {
  return value && value.trim() !== '' ? value : fallback;
};

const optionalInt = (value: string | undefined, fallback: number): number => {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  NODE_ENV: optional(process.env.NODE_ENV, 'development'),
  PORT: optionalInt(process.env.PORT, 8787),
  LOG_LEVEL: optional(process.env.LOG_LEVEL, 'info'),

  DATABASE_URL: required('DATABASE_URL', process.env.DATABASE_URL),

  GITHUB_CLIENT_ID: required('GITHUB_CLIENT_ID', process.env.GITHUB_CLIENT_ID),
  GITHUB_CLIENT_SECRET: required('GITHUB_CLIENT_SECRET', process.env.GITHUB_CLIENT_SECRET),
  GITHUB_OAUTH_CALLBACK_URL: required(
    'GITHUB_OAUTH_CALLBACK_URL',
    process.env.GITHUB_OAUTH_CALLBACK_URL
  ),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET),
  ACCESS_TOKEN_TTL: optional(process.env.ACCESS_TOKEN_TTL, '15m'),
  REFRESH_TOKEN_TTL: optional(process.env.REFRESH_TOKEN_TTL, '30d'),

  WEB_ORIGIN: optional(process.env.WEB_ORIGIN, 'http://localhost:3000'),
  // Empty by default — when no Domain is set, the cookie scopes to the exact response
  // host. That's correct for production (Vercel) and for local dev (localhost). Setting
  // an explicit Domain causes mismatches with the Vercel rewrite proxy.
  COOKIE_DOMAIN: optional(process.env.COOKIE_DOMAIN, ''),
  COOKIE_SECURE: optional(process.env.COOKIE_SECURE, 'false') === 'true',

  CSRF_SECRET: required('CSRF_SECRET', process.env.CSRF_SECRET),

  RATE_LIMIT_WINDOW_MS: optionalInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  RATE_LIMIT_MAX: optionalInt(process.env.RATE_LIMIT_MAX, 100),
  AUTH_RATE_LIMIT_MAX: optionalInt(process.env.AUTH_RATE_LIMIT_MAX, 10),

  ADMIN_GITHUB_USERNAME: optional(process.env.ADMIN_GITHUB_USERNAME, ''),
};

export const isProd = env.NODE_ENV === 'production';
