import { createRemoteJWKSet, customFetch, importPKCS8, jwtVerify, SignJWT } from 'jose';
import { digest } from './store.mjs';
import type { ProviderId } from './store.mjs';

interface AuthorizationRequest {
  state: string;
  nonce: string;
  providerVerifier: string;
}

export interface Provider {
  authorize(input: AuthorizationRequest): URL;
  identify(code: string, input: Pick<AuthorizationRequest, 'nonce' | 'providerVerifier'>): Promise<{ subject: string }>;
}

export type Providers = Partial<Record<ProviderId, Provider>>;
type Fetch = typeof fetch;
type Environment = Record<string, string | undefined>;

function credentials(env: Environment, keys: string[]): string[] | undefined {
  const values = keys.map(name => env[name]?.trim() ?? '');
  if (values.every(value => !value)) return;
  if (values.some(value => !value)) {
    throw new Error(`Set all provider variables: ${keys.join(', ')}`);
  }
  return values;
}

async function requestJson(fetcher: Fetch, url: string, options: RequestInit = {}): Promise<string> {
  const response = await fetcher(url, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('Provider returned a failure');
  return response.text();
}

interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  callbackUrl: string;
  clientId: string;
  clientSecret: () => string | Promise<string>;
  scope?: string;
  formPost?: boolean;
  pkce?: boolean;
  resolveSubject: (response: Record<string, unknown>, nonce: string) => Promise<string>;
}

function createProvider(config: ProviderConfig, fetcher: Fetch): Provider {
  return {
    authorize({ state, nonce, providerVerifier }) {
      const url = new URL(config.authorizeUrl);
      url.search = new URLSearchParams({
        response_type: 'code', client_id: config.clientId, redirect_uri: config.callbackUrl, state,
      }).toString();
      if (config.scope) url.searchParams.set('scope', config.scope);
      if (config.scope || config.formPost) url.searchParams.set('nonce', nonce);
      if (config.formPost) url.searchParams.set('response_mode', 'form_post');
      if (config.pkce) {
        url.searchParams.set('code_challenge', digest(providerVerifier));
        url.searchParams.set('code_challenge_method', 'S256');
      }
      return url;
    },
    async identify(code, { nonce, providerVerifier }) {
      const form = new URLSearchParams({
        grant_type: 'authorization_code', code, redirect_uri: config.callbackUrl,
        client_id: config.clientId, client_secret: await config.clientSecret(),
      });
      if (config.pkce) form.set('code_verifier', providerVerifier);
      const response = await requestJson(fetcher, config.tokenUrl, { method: 'POST', body: form });
      return { subject: await config.resolveSubject(JSON.parse(response), nonce) };
    },
  };
}

function oidcSubject(fetcher: Fetch, jwksUrl: string, issuer: string | string[], audience: string) {
  const jwks = createRemoteJWKSet(new URL(jwksUrl), { [customFetch]: fetcher });
  return async (response: Record<string, unknown>, nonce: string) => {
    if (typeof response.id_token !== 'string') throw new Error('Provider did not return an ID token');
    const { payload } = await jwtVerify(response.id_token, jwks, {
      issuer, audience, algorithms: ['RS256'], maxTokenAge: '10m',
      requiredClaims: ['sub', 'exp', 'iat', 'nonce'],
    });
    const audienceCount = Array.isArray(payload.aud) ? payload.aud.length : 1;
    if (payload.nonce !== nonce || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 ||
        ((audienceCount > 1 || payload.azp !== undefined) && payload.azp !== audience)) {
      throw new Error('Provider returned an invalid ID token');
    }
    return payload.sub;
  };
}

export async function createProviders(
  origin: URL, env: Environment, fetcher: Fetch = fetch,
): Promise<Providers> {
  const providers: Providers = {};
  const callback = (provider: ProviderId) => new URL(`/v1/auth/callback/${provider}`, origin).href;

  const kakao = credentials(env, ['KAKAO_CLIENT_ID', 'KAKAO_CLIENT_SECRET']);
  if (kakao) {
    const [clientId, secret] = kakao;
    providers.kakao = createProvider({
      authorizeUrl: 'https://kauth.kakao.com/oauth/authorize',
      tokenUrl: 'https://kauth.kakao.com/oauth/token',
      callbackUrl: callback('kakao'),
      clientId, clientSecret: () => secret, pkce: true,
      async resolveSubject(response) {
        if (typeof response.access_token !== 'string' || !response.access_token) {
          throw new Error('Kakao did not return an access token');
        }
        const text = await requestJson(fetcher, 'https://kapi.kakao.com/v2/user/me', {
          headers: { authorization: `Bearer ${response.access_token}` },
        });
        // Kakao user IDs are 64-bit JSON numbers. Keep the wire value without rounding it.
        const { id } = JSON.parse(text, (key, value, context?: { source: string }) => {
          return key === 'id' && typeof value === 'number' ? context?.source : value;
        });
        if (typeof id !== 'string' || !/^[1-9][0-9]{0,18}$/.test(id)) {
          throw new Error('Kakao did not return a valid user ID');
        }
        return id;
      },
    }, fetcher);
  }

  const google = credentials(env, ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']);
  if (google) {
    const [clientId, secret] = google;
    providers.google = createProvider({
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      callbackUrl: callback('google'),
      clientId, clientSecret: () => secret, scope: 'openid', pkce: true,
      resolveSubject: oidcSubject(
        fetcher, 'https://www.googleapis.com/oauth2/v3/certs',
        ['https://accounts.google.com', 'accounts.google.com'], clientId,
      ),
    }, fetcher);
  }

  const apple = credentials(env, ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY']);
  if (apple) {
    const [clientId, teamId, keyId, pem] = apple;
    const signingKey = await importPKCS8(pem.replaceAll('\\n', '\n'), 'ES256');
    providers.apple = createProvider({
      authorizeUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      callbackUrl: callback('apple'),
      clientId, formPost: true,
      clientSecret: () => new SignJWT({})
        .setProtectedHeader({ alg: 'ES256', kid: keyId }).setIssuer(teamId)
        .setSubject(clientId).setAudience('https://appleid.apple.com')
        .setIssuedAt().setExpirationTime('5m').sign(signingKey),
      resolveSubject: oidcSubject(fetcher, 'https://appleid.apple.com/auth/keys', 'https://appleid.apple.com', clientId),
    }, fetcher);
  }

  return providers;
}
