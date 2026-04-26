import jwt, { SignOptions } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import ms from 'ms';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { errors } from '../../utils/errors';
import type { Role } from '../../middleware/rbac';

const toMs = (value: string): number => {
  const n = (ms as unknown as (v: string) => number)(value);
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`Invalid duration: ${value}`);
  }
  return n;
};

export interface UserPrincipal {
  id: string;
  username: string;
  role: Role;
}

const hashRefresh = (raw: string): string =>
  createHash('sha256').update(raw + env.JWT_REFRESH_SECRET).digest('hex');

const issueRawRefresh = (): string => randomBytes(48).toString('hex');

export const signAccessToken = (user: UserPrincipal): string => {
  const opts: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] };
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    env.JWT_ACCESS_SECRET,
    opts
  );
};

export const issueRefreshToken = async (userId: string): Promise<{ raw: string; expiresAt: Date }> => {
  const raw = issueRawRefresh();
  const expiresAt = new Date(Date.now() + toMs(env.REFRESH_TOKEN_TTL));
  await prisma.refreshToken.create({
    data: { user_id: userId, token_hash: hashRefresh(raw), expires_at: expiresAt },
  });
  return { raw, expiresAt };
};

export const rotateRefreshToken = async (raw: string): Promise<{
  user: UserPrincipal;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}> => {
  const tokenHash = hashRefresh(raw);
  const record = await prisma.refreshToken.findUnique({
    where: { token_hash: tokenHash },
    include: { user: true },
  });

  if (!record) throw errors.unauthorized('Invalid refresh token');
  if (record.revoked_at) throw errors.unauthorized('Refresh token revoked');
  if (record.expires_at.getTime() < Date.now())
    throw errors.unauthorized('Refresh token expired');

  const user: UserPrincipal = {
    id: record.user.id,
    username: record.user.github_username,
    role: record.user.role,
  };

  const newRaw = issueRawRefresh();
  const newExpiresAt = new Date(Date.now() + toMs(env.REFRESH_TOKEN_TTL));

  const newRecord = await prisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: hashRefresh(newRaw),
        expires_at: newExpiresAt,
      },
    });
    await tx.refreshToken.update({
      where: { id: record.id },
      data: { revoked_at: new Date(), replaced_by: created.id },
    });
    return created;
  });

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: newRaw,
    refreshExpiresAt: newRecord.expires_at,
  };
};

export const revokeRefreshToken = async (raw: string): Promise<void> => {
  const tokenHash = hashRefresh(raw);
  await prisma.refreshToken
    .update({
      where: { token_hash: tokenHash },
      data: { revoked_at: new Date() },
    })
    .catch(() => undefined); // already revoked or unknown — silent
};

export const revokeAllForUser = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { user_id: userId, revoked_at: null },
    data: { revoked_at: new Date() },
  });
};
