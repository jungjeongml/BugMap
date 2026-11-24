import { AuthError, hex, toBase64Url } from './authProtocol.mjs';

export { AuthError, getAuthApiOrigin } from './authProtocol.mjs';

const callbackUri = 'bugmap://auth/callback';
const requestTimeoutMs = 15_000;
// The development auth server issues 15-minute access tokens.
const sessionRevalidationAfterMs = 15 * 60_000;

const commonProviders = ['kakao', 'google'] as const;
const iosProviders = [...commonProviders, 'apple'] as const;

export type AuthProvider = typeof iosProviders[number];

export function authProvidersFor(platform: string): readonly AuthProvider[] {
  return platform === 'ios' ? iosProviders : commonProviders;
}

export function shouldRevalidateSession(verifiedAt: number | null, now: number): boolean {
  return verifiedAt !== null && (now < verifiedAt || now - verifiedAt >= sessionRevalidationAfterMs);
}

export type AuthSession = {
  accessToken: string;
  userId: string;
};

type TokenResponse = AuthSession & { refreshToken: string };
type SignInResult = { kind: 'cancelled' } | { kind: 'authenticated'; session: AuthSession };

type AuthDependencies = {
  randomBytes: (size: number) => Promise<Uint8Array>;
  sha256Base64: (input: string) => Promise<string>;
  openAuthSession: (url: string, returnTo: string) => Promise<{ type: string; url?: string }>;
  request: (url: string, options: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;
  refreshTokens: {
    read: () => Promise<string | null>;
    write: (token: string) => Promise<void>;
    remove: () => Promise<void>;
  };
};

type AuthApiPath = '/v1/auth/exchange' | '/v1/auth/refresh' | '/v1/auth/logout';

function readCallback(url: string, expectedState: string): string | null {
  const prefix = callbackUri + '?';
  if (!url.startsWith(prefix) || url.includes('#')) throw new AuthError('callback');

  let params: URLSearchParams;
  try {
    const query = url.slice(prefix.length);
    // Reject malformed percent encodings on platforms with a forgiving URLSearchParams parser.
    decodeURIComponent(query);
    params = new URLSearchParams(query);
  } catch {
    throw new AuthError('callback');
  }

  const states = params.getAll('state');
  const codes = params.getAll('code');
  const errors = params.getAll('error');
  if (states.length !== 1 || states[0] !== expectedState || params.size !== 2) {
    throw new AuthError('callback');
  }

  if (codes.length === 1 && codes[0]) return codes[0];
  if (errors.length === 1 && errors[0]) {
    if (errors[0] === 'access_denied') return null;
    throw new AuthError(errors[0] === 'provider_unavailable' ? 'provider-unavailable' : 'provider');
  }
  throw new AuthError('callback');
}

function isTokenResponse(value: unknown): value is TokenResponse {
  if (!value || typeof value !== 'object') return false;
  const { accessToken, refreshToken, userId } = value as Partial<TokenResponse>;
  return [accessToken, refreshToken, userId].every(
    item => typeof item === 'string' && item.trim().length > 0,
  );
}

export function createAuthClient(apiOrigin: string, deps: AuthDependencies) {
  async function post(path: AuthApiPath, body: Record<string, string>, acceptUnauthorized = false) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      let response;
      try {
        response = await deps.request(apiOrigin + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
          credentials: 'omit',
          redirect: 'error',
          signal: controller.signal,
        });
      } catch {
        throw new AuthError('network');
      }

      if (response.status === 401) {
        if (acceptUnauthorized) return null;
        throw new AuthError('expired');
      }
      if (response.status === 429 || response.status >= 500) throw new AuthError('network');
      if (!response.ok) throw new AuthError('provider');
      if (path === '/v1/auth/logout') return null;

      const tokens: unknown = await response.json().catch(() => null);
      if (controller.signal.aborted) throw new AuthError('network');
      if (!isTokenResponse(tokens)) throw new AuthError('provider');
      return tokens;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function store<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch {
      throw new AuthError('storage');
    }
  }

  async function saveSession(tokens: TokenResponse): Promise<AuthSession> {
    await store(() => deps.refreshTokens.write(tokens.refreshToken));
    return { accessToken: tokens.accessToken, userId: tokens.userId };
  }

  async function signIn(provider: AuthProvider): Promise<SignInResult> {
    let state: string;
    let verifier: string;
    let challenge: string;
    let browserResult: Awaited<ReturnType<AuthDependencies['openAuthSession']>>;

    try {
      state = hex(await deps.randomBytes(32));
      verifier = hex(await deps.randomBytes(32));
      challenge = toBase64Url(await deps.sha256Base64(verifier));
      const params = new URLSearchParams({
        redirect_uri: callbackUri,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      const authorizeUrl = `${apiOrigin}/v1/auth/authorize/${provider}?${params.toString()}`;
      browserResult = await deps.openAuthSession(authorizeUrl, callbackUri);
    } catch {
      throw new AuthError('unavailable');
    }

    if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') return { kind: 'cancelled' };
    if (browserResult.type !== 'success' || !browserResult.url) throw new AuthError('unavailable');

    const code = readCallback(browserResult.url, state);
    if (code === null) return { kind: 'cancelled' };
    const tokens = await post('/v1/auth/exchange', { provider, code, redirectUri: callbackUri, codeVerifier: verifier });
    if (!tokens) throw new AuthError('provider');
    return { kind: 'authenticated', session: await saveSession(tokens) };
  }

  async function restoreSession(): Promise<AuthSession | null> {
    const refreshToken = await store(deps.refreshTokens.read);
    if (!refreshToken) return null;

    const tokens = await post('/v1/auth/refresh', { refreshToken }, true);
    if (!tokens) {
      await store(deps.refreshTokens.remove);
      return null;
    }
    return saveSession(tokens);
  }

  async function signOut(): Promise<void> {
    const refreshToken = await store(deps.refreshTokens.read);
    if (!refreshToken) return;

    await post('/v1/auth/logout', { refreshToken }, true);
    await store(deps.refreshTokens.remove);
  }

  return { signIn, restoreSession, signOut };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
