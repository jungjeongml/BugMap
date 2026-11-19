import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createAuthApp } from '../dist/app.mjs';
import { AuthStore } from '../dist/store.mjs';

const redirectUri = 'bugmap://auth/callback';
const state = 'app-state';
const verifier = 'abcdefghijklmnopqrstuvwxyz0123456789uvwxyzABC';
const challenge = createHash('sha256').update(verifier).digest('base64url');

async function launch(t, databasePath = ':memory:', providerIds = ['google', 'kakao', 'apple']) {
  const providers = Object.fromEntries(providerIds.map(provider => [provider, {
    authorize(input) {
      const url = new URL('https://provider.example/authorize');
      url.searchParams.set('state', input.state);
      return url;
    },
    async identify(code) {
      if (code === 'invalid') throw new Error('Token validation failed');
      return { subject: code, email: 'same@example.com' };
    }
  }]));
  const app = await createAuthApp(new AuthStore(databasePath), providers);
  t.after(() => app.close());
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  function health() {
    return fetch(base + '/healthz');
  }
  function request(path, options = {}) {
    return fetch(base + '/v1/auth/' + path, { redirect: 'manual', ...options });
  }
  function authorize(provider, overrides = {}) {
    const query = new URLSearchParams({
      redirect_uri: redirectUri, state, code_challenge: challenge, code_challenge_method: 'S256',
      ...overrides
    });
    return request('authorize/' + provider + '?' + query);
  }
  async function begin(provider) {
    const response = await authorize(provider);
    assert.equal(response.status, 302);
    assert.match(response.headers.get('set-cookie'), /HttpOnly.*Secure.*SameSite=None/i);
    const providerState = new URL(response.headers.get('location')).searchParams.get('state');
    assert.notEqual(providerState, state);
    return { providerState, cookie: response.headers.get('set-cookie').split(';')[0] };
  }
  function callback(provider, { providerState, cookie }, result = { code: '12345' }) {
    const params = new URLSearchParams({ state: providerState, ...result });
    const headers = cookie ? { cookie } : {};
    return provider === 'apple'
      ? request('callback/apple', { method: 'POST', body: params, headers })
      : request('callback/' + provider + '?' + params, { headers });
  }
  async function code(provider, result) {
    const response = await callback(provider, await begin(provider), result);
    assert.equal(response.status, 303);
    const location = new URL(response.headers.get('location'));
    assert.equal(location.protocol + '//' + location.hostname + location.pathname, redirectUri);
    assert.equal(location.searchParams.get('state'), state);
    assert.deepEqual([...location.searchParams.keys()].sort(), ['code', 'state']);
    return location.searchParams.get('code');
  }
  function post(path, body) {
    return request(path, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
  function exchange(provider, code, overrides = {}) {
    return post('exchange', { provider, code, redirectUri, codeVerifier: verifier, ...overrides });
  }
  async function login(provider, result) {
    const response = await exchange(provider, await code(provider, result));
    assert.equal(response.status, 200);
    return response.json();
  }
  return { authorize, begin, callback, code, exchange, health, login, post, request };
}

test('reports readiness and provider setup through a public health endpoint', async t => {
  for (const [providerIds, authentication] of [[[], 'unconfigured'], [['google'], 'configured']]) {
    const app = await launch(t, ':memory:', providerIds);
    const result = await app.health();
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { status: 'ready', authentication });
  }
});

test('requires an exact app redirect and an S256 challenge', async t => {
  const app = await launch(t);
  assert.equal((await app.authorize('google', { redirect_uri: redirectUri + '/' })).status, 400);
  assert.equal((await app.authorize('google', { code_challenge_method: 'plain' })).status, 400);
  assert.equal((await app.authorize('google', { code_challenge: 'short' })).status, 400);
});

test('returns an unavailable provider to the app only after validating the request', async t => {
  const app = await launch(t, ':memory:', ['google']);
  const invalid = await app.authorize('apple', { redirect_uri: 'https://else.example' });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers.get('location'), null);
  const unavailable = await app.authorize('apple');
  assert.equal(unavailable.status, 303);
  assert.equal(unavailable.headers.get('location'), redirectUri + '?state=app-state&error=provider_unavailable');
});

test('binds one-use provider state to the initiator and provider', async t => {
  const app = await launch(t);
  const transaction = await app.begin('google');
  assert.equal((await app.callback('kakao', transaction)).status, 400);
  assert.equal((await app.callback('google', { ...transaction, cookie: '' })).status, 400);
  assert.equal((await app.callback('google', transaction)).status, 303);
  assert.equal((await app.callback('google', transaction)).status, 400);
});

test('normalizes cancel and rejection without reflecting provider details', async t => {
  const app = await launch(t);
  for (const [provider, input, expected] of [
    ['apple', { error: 'user_cancelled_authorize' }, 'access_denied'],
    ['kakao', { error: '<private provider error>' }, 'login_failed'],
    ['google', { code: 'invalid' }, 'login_failed']
  ]) {
    const result = await app.callback(provider, await app.begin(provider), input);
    assert.equal(result.status, 303);
    assert.equal(result.headers.get('location'), redirectUri + '?state=app-state&error=' + expected);
  }
});

test('binds each one-use app code to its provider, redirect and verifier', async t => {
  const app = await launch(t);
  const code = await app.code('apple');
  assert.equal((await app.exchange('kakao', code)).status, 401);
  assert.equal((await app.exchange('apple', code, { redirectUri: redirectUri + '/' })).status, 400);
  assert.equal((await app.exchange('apple', code, {
    codeVerifier: randomBytes(32).toString('base64url')
  })).status, 401);
  const exchanges = await Promise.all([app.exchange('apple', code), app.exchange('apple', code)]);
  assert.deepEqual(exchanges.map(result => result.status).sort(), [200, 401]);
});

test('uses provider subjects as separate identities even when emails coincide', async t => {
  const app = await launch(t);
  const google = await app.login('google');
  const repeat = await app.login('google');
  const otherGoogle = await app.login('google', { code: '67890' });
  const kakao = await app.login('kakao');
  assert.equal(repeat.userId, google.userId);
  assert.notEqual(otherGoogle.userId, google.userId);
  assert.notEqual(kakao.userId, google.userId);
  assert.notEqual(repeat.refreshToken, google.refreshToken);
});

test('rotates a persisted session once and revokes access on logout', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'bugmap-auth-'));
  const path = join(dir, 'auth.sqlite');
  const first = await launch(t, path);
  const second = await launch(t, path);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const initial = await first.login('kakao');
  assert.deepEqual(Object.keys(initial).sort(), ['accessToken', 'refreshToken', 'userId']);
  const access = token => ({ headers: { authorization: 'Bearer ' + token } });
  assert.equal((await second.request('me', access(initial.accessToken))).status, 200);
  const refreshes = await Promise.all([
    first.post('refresh', { refreshToken: initial.refreshToken }),
    second.post('refresh', { refreshToken: initial.refreshToken })
  ]);
  assert.deepEqual(refreshes.map(result => result.status).sort(), [200, 401]);
  const rotatedResponse = refreshes.find(result => result.status === 200);
  assert.equal(rotatedResponse.headers.get('cache-control'), 'no-store');
  const rotated = await rotatedResponse.json();
  assert.equal(rotated.userId, initial.userId);
  assert.notEqual(rotated.refreshToken, initial.refreshToken);
  assert.equal((await first.request('me', access(initial.accessToken))).status, 401);
  assert.equal((await first.request('me', access(rotated.accessToken))).status, 200);
  assert.equal((await second.post('logout', { refreshToken: rotated.refreshToken })).status, 204);
  assert.equal((await first.request('me', access(rotated.accessToken))).status, 401);
  assert.equal((await first.post('refresh', { refreshToken: rotated.refreshToken })).status, 401);
  assert.equal((await first.post('logout', { refreshToken: rotated.refreshToken })).status, 401);
});

test('revokes a refreshed session with the prior token after a lost refresh response', async t => {
  const app = await launch(t);
  const initial = await app.login('google');
  const rotatedResponse = await app.post('refresh', { refreshToken: initial.refreshToken });
  assert.equal(rotatedResponse.status, 200);
  const rotated = await rotatedResponse.json();
  assert.equal((await app.post('refresh', { refreshToken: initial.refreshToken })).status, 401);
  assert.equal((await app.post('logout', { refreshToken: initial.refreshToken })).status, 204);
  assert.equal((await app.post('refresh', { refreshToken: rotated.refreshToken })).status, 401);
  assert.equal((await app.request('me', {
    headers: { authorization: 'Bearer ' + rotated.accessToken },
  })).status, 401);
});
