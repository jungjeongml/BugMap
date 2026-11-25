import { AuthError, getAuthApiOrigin, hex, toBase64Url } from './authProtocol.mjs';
import type { AuthProvider } from './authClient';

const pendingStorageKey = 'bugmap.auth.pending';
const pendingLifetimeMs = 10 * 60_000;
const requestTimeoutMs = 15_000;
const hexToken = /^[a-f0-9]{64}$/;
const callbackKeys = ['state', 'code', 'error'] as const;

type WebProvider = Extract<AuthProvider, 'kakao' | 'google'>;
type WebSession = { userId: string; displayName: string | null };
type WebSignInResult = { kind: 'cancelled' } | { kind: 'authenticated'; session: WebSession };
type WebAuthConfig = { apiOrigin: string; webOrigin: string };
type PendingSignIn = { provider: WebProvider; state: string; verifier: string; createdAt: number };

type WebAuthDependencies = {
  crypto: Pick<Crypto, 'getRandomValues' | 'subtle'>;
  now: () => number;
  getStorage: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  getLocation: () => string;
  replaceLocation: (url: string) => void;
  navigate: (url: string) => void;
  request: (path: string, options: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;
};

function getWebOrigin(value: string | undefined): string | null {
  const url = value?.trim();
  if (!url || !/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?\/?$/i.test(url)) return getAuthApiOrigin(value);
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function getWebAuthConfig(
  apiValue: string | undefined,
  webValue: string | undefined,
  locationOrigin: string,
): ({ status: 'ready' } & WebAuthConfig) | { status: 'missing-server' | 'missing-web-origin' | 'web-origin-mismatch' } {
  const apiOrigin = getAuthApiOrigin(apiValue);
  if (!apiOrigin) return { status: 'missing-server' };
  const webOrigin = getWebOrigin(webValue);
  if (!webOrigin) return { status: 'missing-web-origin' };
  if (webOrigin !== locationOrigin) return { status: 'web-origin-mismatch' };
  return { status: 'ready', apiOrigin, webOrigin };
}

function isWebProvider(value: unknown): value is WebProvider {
  return value === 'kakao' || value === 'google';
}

function readPendingSignIn(raw: string | null): PendingSignIn | null {
  if (!raw || raw.length > 1024) return null;
  try {
    const pending: Partial<PendingSignIn> | null = JSON.parse(raw);
    if (pending && isWebProvider(pending.provider)
      && typeof pending.state === 'string' && hexToken.test(pending.state)
      && typeof pending.verifier === 'string' && hexToken.test(pending.verifier)
      && typeof pending.createdAt === 'number' && Number.isFinite(pending.createdAt)) {
      return { provider: pending.provider, state: pending.state, verifier: pending.verifier, createdAt: pending.createdAt };
    }
  } catch {
    // Corrupt local data cannot be used to complete sign-in.
  }
  return null;
}

export function createWebAuthClient({ apiOrigin, webOrigin }: WebAuthConfig, deps: WebAuthDependencies) {
  function useStorage<T>(operation: (storage: ReturnType<WebAuthDependencies['getStorage']>) => T): T {
    try {
      return operation(deps.getStorage());
    } catch {
      throw new AuthError('storage');
    }
  }

  async function requestSession(
    action: 'exchange' | 'session' | 'logout' | 'nickname',
    payload?: Record<string, string>,
  ): Promise<WebSession | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      let response;
      try {
        response = await deps.request('/v1/auth/web/' + action, {
          method: action === 'session' ? 'GET' : 'POST',
          headers: payload ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
          body: payload && JSON.stringify(payload),
          credentials: 'same-origin',
          mode: 'same-origin',
          redirect: 'error',
          referrerPolicy: 'origin',
          cache: 'no-store',
          signal: controller.signal,
        });
      } catch {
        throw new AuthError('network');
      }

      if (response.status === 401) {
        if (action === 'session' || action === 'logout') return null;
        throw new AuthError('expired');
      }
      if (response.status === 429 || response.status >= 500) throw new AuthError('network');
      if (action === 'nickname' && response.status === 409) throw new AuthError('nickname-taken');
      if (!response.ok) throw new AuthError('provider');
      if (action === 'logout') return null;

      const body: unknown = await response.json().catch(() => null);
      if (controller.signal.aborted) throw new AuthError('network');
      if (!body || typeof body !== 'object' || !('userId' in body)
        || typeof body.userId !== 'string' || !body.userId.trim() || !('displayName' in body)
        || (body.displayName !== null && (typeof body.displayName !== 'string' || !body.displayName))) throw new AuthError('provider');
      return { userId: body.userId, displayName: body.displayName };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function signIn(provider: AuthProvider): Promise<{ kind: 'redirected' }> {
    if (!isWebProvider(provider)) throw new AuthError('provider-unavailable');

    let state: string;
    let verifier: string;
    let challenge: string;
    try {
      state = hex(deps.crypto.getRandomValues(new Uint8Array(32)));
      verifier = hex(deps.crypto.getRandomValues(new Uint8Array(32)));
      const digest = await deps.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      challenge = toBase64Url(btoa(String.fromCharCode(...new Uint8Array(digest))));
    } catch {
      throw new AuthError('unavailable');
    }

    useStorage(storage => storage.setItem(pendingStorageKey, JSON.stringify({
      provider, state, verifier, createdAt: deps.now(),
    })));
    const authorizeUrl = new URL('/v1/auth/web/authorize/' + provider, apiOrigin);
    authorizeUrl.search = new URLSearchParams({
      redirect_uri: webOrigin + '/',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();

    try {
      deps.navigate(authorizeUrl.href);
    } catch {
      useStorage(storage => storage.removeItem(pendingStorageKey));
      throw new AuthError('unavailable');
    }
    return { kind: 'redirected' };
  }

  async function completeSignIn(): Promise<WebSignInResult | null> {
    const url = new URL(deps.getLocation());
    if (!callbackKeys.some(key => url.searchParams.has(key))) return null;
    if (url.origin !== webOrigin) throw new AuthError('callback');

    const query = url.search;
    const params = new URLSearchParams(query);
    const hadFragment = Boolean(url.hash);
    for (const key of callbackKeys) url.searchParams.delete(key);
    try {
      deps.replaceLocation(url.href);
      if (query.length > 8192) throw new AuthError('callback');
      decodeURIComponent(query);
    } catch {
      throw new AuthError('callback');
    }

    const states = params.getAll('state');
    const code = params.get('code');
    const error = params.get('error');
    if (url.pathname !== '/' || hadFragment || params.size !== 2 || states.length !== 1
      || !hexToken.test(states[0]) || (code === null) === (error === null)
      || (code !== null && (!code || code.length > 2048))
      || (error !== null && (!error || error.length > 128))) {
      throw new AuthError('callback');
    }

    const pending = useStorage(storage => {
      const record = readPendingSignIn(storage.getItem(pendingStorageKey));
      if (record?.state !== states[0]) return null;
      storage.removeItem(pendingStorageKey);
      return record;
    });
    if (!pending) throw new AuthError('callback');
    const age = deps.now() - pending.createdAt;
    if (age < 0 || age >= pendingLifetimeMs) throw new AuthError('expired');

    if (code === null) {
      if (error === 'access_denied') return { kind: 'cancelled' };
      throw new AuthError(error === 'provider_unavailable' ? 'provider-unavailable' : 'provider');
    }
    const exchanged = await requestSession('exchange', { provider: pending.provider, code, codeVerifier: pending.verifier });
    if (!exchanged) throw new AuthError('provider');
    const session = await restoreSession();
    if (!session || session.userId !== exchanged.userId) throw new AuthError('session-unavailable');
    return { kind: 'authenticated', session };
  }

  function restoreSession(): Promise<WebSession | null> {
    return requestSession('session');
  }

  async function signOut(): Promise<void> {
    await requestSession('logout');
  }

  async function saveNickname(session: Pick<WebSession, 'userId'>, displayName: string): Promise<WebSession> {
    const profile = await requestSession('nickname', { userId: session.userId, displayName });
    if (!profile || profile.userId !== session.userId || profile.displayName === null) throw new AuthError('provider');
    return profile;
  }

  return { signIn, completeSignIn, restoreSession, signOut, saveNickname };
}
