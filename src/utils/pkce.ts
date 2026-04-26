import { createHash, randomBytes } from 'crypto';

const base64UrlEncode = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const generateCodeVerifier = (): string => base64UrlEncode(randomBytes(32));

export const deriveCodeChallenge = (verifier: string): string =>
  base64UrlEncode(createHash('sha256').update(verifier).digest());

export const generateState = (): string => base64UrlEncode(randomBytes(24));
