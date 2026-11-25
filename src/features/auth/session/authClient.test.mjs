import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { authProvidersFor, createAuthClient, getAuthApiOrigin, shouldRevalidateSession } from './authClient.ts';

const apiOrigin = 'https://auth.example.test';
const redirectUri = 'bugmap://auth/callback';
const state = '11'.repeat(32);
const verifier = 'ab'.repeat(32);
const session = { accessToken: 'access', refreshToken: 'refresh', userId: 'user', displayName: null };

function setup({ token = null, browser, request } = {}) {
  let stored = token;
  const browserCalls = [];
  const apiCalls = [];
  let randomCalls = 0;
  const client = createAuthClient(apiOrigin, {
    randomBytes: async size => Buffer.alloc(size, [0x11, 0xab, 0x22, 0xcd][randomCalls++ % 4]),
    sha256Base64: async value => createHash('sha256').update(value).digest('base64'),
    openAuthSession: async (url, returnTo) => {
      browserCalls.push([url, returnTo]);
      const browserState = new URL(url).searchParams.get('state');
      const code = browserState === state ? 'app_code' : 'retry_code';
      return browser?.(url) ?? { type: 'success', url: `${redirectUri}?code=${code}&state=${browserState}` };
    },
    request: async (url, init) => {
      const body = JSON.parse(init.body);
      apiCalls.push([url, init.method, body]);
      return request?.(url, body, init) ?? Response.json(session);
    },
    refreshTokens: {
      read: async () => stored,
      write: async value => { stored = value; },
      remove: async () => { stored = null; },
    },
  });
  return { client, browserCalls, apiCalls, stored: () => stored };
}

test('restricts the API configuration to an HTTPS origin', () => {
  assert.equal(getAuthApiOrigin(' https://auth.example.test/ '), apiOrigin);
  for (const url of [undefined, 'http://auth.example.test', 'https://user@auth.example.test', 'https://auth.example.test/api', 'https://auth.example.test/?query=1', 'https://auth.example.test/#x']) {
    assert.equal(getAuthApiOrigin(url), null, String(url));
  }
});

test('shows Apple on iOS, Kakao and Google on Android, and no Apple on the web preview', () => {
  assert.deepEqual(authProvidersFor('ios'), ['kakao', 'google', 'apple']);
  assert.deepEqual(authProvidersFor('android'), ['kakao', 'google']);
  assert.deepEqual(authProvidersFor('web'), ['kakao', 'google']);
});

test('sends an S256 challenge to the browser and sends the verifier only on exchange', async () => {
  const { client, browserCalls, apiCalls, stored } = setup();
  assert.deepEqual(await client.signIn('google'), {
    kind: 'authenticated', session: { accessToken: 'access', userId: 'user', displayName: null },
  });

  const [[authorize, returnTo]] = browserCalls;
  const url = new URL(authorize);
  assert.equal(url.origin, apiOrigin);
  assert.equal(url.pathname, '/v1/auth/authorize/google');
  assert.equal(returnTo, redirectUri);
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    redirect_uri: redirectUri,
    state,
    code_challenge: 'JxpBO9M5xXCf3OrsQfFPEen7-1BC1y0zHGXzKyhM0Jo',
    code_challenge_method: 'S256',
  });
  assert.deepEqual(apiCalls, [[`${apiOrigin}/v1/auth/exchange`, 'POST', {
    provider: 'google', code: 'app_code', redirectUri, codeVerifier: verifier,
  }]]);
  assert.equal(stored(), 'refresh');
});

test('rejects an unexpected callback URI, state, duplicate parameters, and fragments before exchange', async () => {
  for (const url of [
    `bugmap://auth/callback-extra?code=c&state=${state}`,
    `https://auth/callback?code=c&state=${state}`,
    `${redirectUri}?code=c&state=bad`,
    `${redirectUri}?code=c&state=${state}&state=${state}`,
    `${redirectUri}?code=c&code=other&state=${state}`,
    `${redirectUri}?code=c&error=access_denied&state=${state}`,
    `${redirectUri}?code=c&state=${state}#access_token=wrong`,
    `${redirectUri}?code=c&state=${state}&refresh_token=wrong`,
    `${redirectUri}?code=%ZZ&state=${state}`,
  ]) {
    const { client, apiCalls, stored } = setup({ browser: () => ({ type: 'success', url }) });
    await assert.rejects(client.signIn('kakao'), { kind: 'callback' });
    assert.deepEqual(apiCalls, []);
    assert.equal(stored(), null);
  }
});

test('closing the browser or denying access leaves the login ready for a fresh attempt', async () => {
  for (const result of [
    { type: 'cancel' },
    { type: 'dismiss' },
    { type: 'success', url: `${redirectUri}?error=access_denied&state=${state}` },
  ]) {
    const { client, apiCalls, stored } = setup({ browser: () => result });
    assert.deepEqual(await client.signIn('apple'), { kind: 'cancelled' });
    assert.deepEqual(apiCalls, []);
    assert.equal(stored(), null);
  }
});

test('reports a provider error without exchanging or exposing the provider error in the message', async () => {
  const { client, apiCalls } = setup({
    browser: () => ({ type: 'success', url: `${redirectUri}?error=private_provider_detail&state=${state}` }),
  });
  await assert.rejects(client.signIn('kakao'), error =>
    error.kind === 'provider' && !error.message.includes('private_provider_detail'));
  assert.deepEqual(apiCalls, []);
});

test('restarts authorization after a failed exchange instead of replaying the one-time code', async () => {
  let attempts = 0;
  const { client, browserCalls, apiCalls, stored } = setup({
    request: () => {
      if (++attempts === 1) throw new TypeError('fetch failed');
      return Response.json(session);
    },
  });
  await assert.rejects(client.signIn('google'), { kind: 'network' });
  assert.equal(stored(), null);
  assert.equal((await client.signIn('google')).kind, 'authenticated');
  assert.deepEqual(browserCalls.map(([url]) => new URL(url).searchParams.get('state')), [state, '22'.repeat(32)]);
  assert.deepEqual(apiCalls.map(([, , body]) => [body.code, body.codeVerifier]), [
    ['app_code', verifier],
    ['retry_code', 'cd'.repeat(32)],
  ]);
});

test('an expired exchange requires a fresh login without creating a session', async () => {
  const { client, stored } = setup({ request: () => new Response(null, { status: 401 }) });
  await assert.rejects(client.signIn('google'), { kind: 'expired' });
  assert.equal(stored(), null);
});

test('restoring sends the stored token and saves its replacement for the next refresh', async () => {
  const { client, apiCalls, stored } = setup({
    token: 'previous',
    request: () => Response.json({ ...session, refreshToken: 'rotated' }),
  });
  assert.deepEqual(await client.restoreSession(), { accessToken: 'access', userId: 'user', displayName: null });
  assert.equal(stored(), 'rotated');
  await client.restoreSession();
  assert.deepEqual(apiCalls, [
    [`${apiOrigin}/v1/auth/refresh`, 'POST', { refreshToken: 'previous' }],
    [`${apiOrigin}/v1/auth/refresh`, 'POST', { refreshToken: 'rotated' }],
  ]);
});

test('restoring a revoked session clears the stored token and stops retrying it', async () => {
  const { client, apiCalls, stored } = setup({
    token: 'expired',
    request: () => new Response(null, { status: 401 }),
  });
  assert.equal(await client.restoreSession(), null);
  assert.equal(stored(), null);
  assert.equal(await client.restoreSession(), null);
  assert.equal(apiCalls.length, 1);
});

test('keeps the refresh token across transient restore and logout failures for explicit retry', async () => {
  let attempts = 0;
  const { client, apiCalls, stored } = setup({
    token: 'previous',
    request: () => ++attempts <= 2 ? new Response(null, { status: 503 }) : new Response(null, { status: 204 }),
  });
  await assert.rejects(client.restoreSession(), { kind: 'network' });
  assert.equal(stored(), 'previous');
  await assert.rejects(client.signOut(), { kind: 'network' });
  assert.equal(stored(), 'previous');
  await client.signOut();
  assert.equal(stored(), null);
  assert.deepEqual(apiCalls.slice(1), [
    [`${apiOrigin}/v1/auth/logout`, 'POST', { refreshToken: 'previous' }],
    [`${apiOrigin}/v1/auth/logout`, 'POST', { refreshToken: 'previous' }],
  ]);
});

test('logout clears the token when the server has already revoked it', async () => {
  const { client, stored } = setup({
    token: 'expired',
    request: () => new Response(null, { status: 401 }),
  });
  await client.signOut();
  assert.equal(stored(), null);
});

test('revalidates a foregrounded session once it reaches the access-token lifetime', () => {
  const verifiedAt = 1_001;
  assert.equal(shouldRevalidateSession(null, verifiedAt + 900_000), false);
  assert.equal(shouldRevalidateSession(verifiedAt, verifiedAt + 899_999), false);
  assert.equal(shouldRevalidateSession(verifiedAt, verifiedAt + 900_000), true);
  assert.equal(shouldRevalidateSession(verifiedAt, verifiedAt - 1), true);
});

test('identifies a validated callback for an unavailable provider', async () => {
  const { client, apiCalls } = setup({
    browser: () => ({ type: 'success', url: `${redirectUri}?error=provider_unavailable&state=${state}` }),
  });
  await assert.rejects(client.signIn('apple'), { kind: 'provider-unavailable' });
  assert.deepEqual(apiCalls, []);
});

test('saves the nickname with a mobile Bearer token and reports expired sessions', async () => {
  const verified = { accessToken: 'access', userId: 'user', displayName: null };
  const { client } = setup({ request(url, body, init) {
    assert.equal(url, apiOrigin + '/v1/auth/nickname');
    assert.equal(init.headers.Authorization, 'Bearer access');
    assert.equal(body.displayName, '숲길');
    return Response.json({ userId: 'user', displayName: '숲길' });
  }});
  assert.deepEqual(await client.saveNickname(verified, '숲길'), { ...verified, displayName: '숲길' });
  const expired = setup({ request: () => new Response(null, { status: 401 }) });
  await assert.rejects(expired.client.saveNickname(verified, '숲길'), { kind: 'expired' });
});
