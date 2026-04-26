import axios from 'axios';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import {
  generateState,
  generateCodeVerifier,
  deriveCodeChallenge,
} from '../../utils/pkce';
import { errors } from '../../utils/errors';
import {
  signAccessToken,
  issueRefreshToken,
  UserPrincipal,
} from './tokens.service';

const STATE_TTL_MS = 10 * 60 * 1000;
const GH_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GH_TOKEN = 'https://github.com/login/oauth/access_token';
const GH_USER = 'https://api.github.com/user';

export type ClientType = 'web' | 'cli';

const cleanupExpiredStates = async (): Promise<void> => {
  await prisma.oAuthState.deleteMany({
    where: { expires_at: { lt: new Date() } },
  });
};

const buildAuthorizeUrl = (params: { state: string; codeChallenge: string }): string =>
  `${GH_AUTHORIZE}?` +
  new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_OAUTH_CALLBACK_URL,
    scope: 'read:user user:email',
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    allow_signup: 'true',
  }).toString();

/**
 * Start the OAuth flow.
 *
 *  - Web flow: backend owns the PKCE verifier (stored in DB), so it can complete
 *    the exchange itself when GitHub redirects to /callback.
 *  - CLI flow: the CLI keeps its own verifier, sends only the challenge here.
 *    The backend stores the challenge + the CLI's local-loopback redirect URI.
 */
export const startOAuth = async (params: {
  clientType: ClientType;
  codeChallenge?: string;
  redirectUri?: string;
}): Promise<{ authorizeUrl: string; state: string }> => {
  await cleanupExpiredStates();

  const state = generateState();
  let codeChallenge: string;
  let codeVerifier: string | null = null;

  if (params.clientType === 'web') {
    codeVerifier = generateCodeVerifier();
    codeChallenge = deriveCodeChallenge(codeVerifier);
  } else {
    if (!params.codeChallenge)
      throw errors.badRequest('code_challenge is required for cli flow');
    codeChallenge = params.codeChallenge;
  }

  await prisma.oAuthState.create({
    data: {
      state,
      code_challenge: codeChallenge,
      code_verifier: codeVerifier,
      client_type: params.clientType,
      redirect_uri: params.redirectUri || null,
      expires_at: new Date(Date.now() + STATE_TTL_MS),
    },
  });

  return { authorizeUrl: buildAuthorizeUrl({ state, codeChallenge }), state };
};

const exchangeCodeForGitHubToken = async (
  code: string,
  codeVerifier: string
): Promise<string> => {
  const resp = await axios.post(
    GH_TOKEN,
    {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_OAUTH_CALLBACK_URL,
      code_verifier: codeVerifier,
    },
    { headers: { Accept: 'application/json' }, timeout: 15_000 }
  );

  const accessToken = resp.data?.access_token as string | undefined;
  if (!accessToken) throw errors.unauthorized('GitHub token exchange failed');
  return accessToken;
};

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

const fetchGitHubUser = async (token: string): Promise<GitHubUser> => {
  const resp = await axios.get<GitHubUser>(GH_USER, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'insighta-labs-backend',
      Accept: 'application/vnd.github+json',
    },
    timeout: 15_000,
  });
  return resp.data;
};

const upsertUserFromGitHub = async (gh: GitHubUser) => {
  const isAdmin =
    !!env.ADMIN_GITHUB_USERNAME && env.ADMIN_GITHUB_USERNAME === gh.login;

  return prisma.user.upsert({
    where: { github_id: String(gh.id) },
    update: {
      github_username: gh.login,
      email: gh.email,
      name: gh.name,
      avatar_url: gh.avatar_url,
      ...(isAdmin ? { role: 'admin' as const } : {}),
    },
    create: {
      github_id: String(gh.id),
      github_username: gh.login,
      email: gh.email,
      name: gh.name,
      avatar_url: gh.avatar_url,
      role: isAdmin ? 'admin' : 'analyst',
    },
  });
};

const finalizeLogin = async (gh: GitHubUser): Promise<{
  user: UserPrincipal;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}> => {
  const user = await upsertUserFromGitHub(gh);
  const principal: UserPrincipal = {
    id: user.id,
    username: user.github_username,
    role: user.role,
  };
  const accessToken = signAccessToken(principal);
  const { raw: refreshToken, expiresAt: refreshExpiresAt } = await issueRefreshToken(user.id);
  return { user: principal, accessToken, refreshToken, refreshExpiresAt };
};

/**
 * Handle GitHub's redirect to the backend callback URL.
 *
 *  - Web flow: complete the exchange server-side using the stored verifier,
 *    return tokens + the post-login redirect_uri.
 *  - CLI flow: hand the code+state back to the CLI's local-loopback URL so
 *    the CLI can complete the exchange with its own verifier.
 */
export const handleGitHubCallback = async (params: {
  code: string;
  state: string;
}): Promise<
  | {
      kind: 'web';
      tokens: Awaited<ReturnType<typeof finalizeLogin>>;
      redirectUri: string | null;
    }
  | {
      kind: 'cli';
      redirectUri: string;
      code: string;
      state: string;
    }
> => {
  const stored = await prisma.oAuthState.findUnique({ where: { state: params.state } });
  if (!stored) throw errors.badRequest('Invalid or expired state');
  if (stored.expires_at.getTime() < Date.now()) {
    await prisma.oAuthState.delete({ where: { state: params.state } }).catch(() => undefined);
    throw errors.badRequest('OAuth state has expired');
  }

  if (stored.client_type === 'cli') {
    if (!stored.redirect_uri) throw errors.badRequest('Missing CLI loopback redirect');
    return {
      kind: 'cli',
      redirectUri: stored.redirect_uri,
      code: params.code,
      state: params.state,
    };
    // NOTE: the cli state row is consumed by /auth/github/cli/exchange below.
  }

  // Web flow: backend owns the verifier, exchange now.
  if (!stored.code_verifier)
    throw errors.internal('Web flow state missing verifier');

  const ghToken = await exchangeCodeForGitHubToken(params.code, stored.code_verifier);
  const ghUser = await fetchGitHubUser(ghToken);
  const tokens = await finalizeLogin(ghUser);

  await prisma.oAuthState.delete({ where: { state: params.state } }).catch(() => undefined);

  return { kind: 'web', tokens, redirectUri: stored.redirect_uri };
};

/**
 * CLI-only endpoint. The CLI sent us its code_verifier; we validate it against
 * the stored challenge, then complete the GitHub exchange and return tokens.
 */
export const completeCliExchange = async (params: {
  code: string;
  state: string;
  codeVerifier: string;
}): Promise<Awaited<ReturnType<typeof finalizeLogin>>> => {
  const stored = await prisma.oAuthState.findUnique({ where: { state: params.state } });
  if (!stored) throw errors.badRequest('Invalid or expired state');
  if (stored.client_type !== 'cli') throw errors.badRequest('State is not a CLI flow');
  if (stored.expires_at.getTime() < Date.now()) {
    await prisma.oAuthState.delete({ where: { state: params.state } }).catch(() => undefined);
    throw errors.badRequest('OAuth state has expired');
  }

  const expected = deriveCodeChallenge(params.codeVerifier);
  if (expected !== stored.code_challenge) {
    throw errors.unauthorized('PKCE verifier mismatch');
  }

  const ghToken = await exchangeCodeForGitHubToken(params.code, params.codeVerifier);
  const ghUser = await fetchGitHubUser(ghToken);
  const tokens = await finalizeLogin(ghUser);

  await prisma.oAuthState.delete({ where: { state: params.state } }).catch(() => undefined);

  return tokens;
};
