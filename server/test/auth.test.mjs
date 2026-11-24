import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createAuthApp, parseWebOrigin } from '../dist/app.mjs';
import { AuthStore } from '../dist/store.mjs';

const redirectUri = 'bugmap://auth/callback';
const state = 'app-state';
const verifier = 'abcdefghijklmnopqrstuvwxyz0123456789uvwxyzABC';
const challenge = createHash('sha256').update(verifier).digest('base64url');

async function launch(t, databasePath = ':memory:', providerIds = ['google', 'kakao', 'apple'], webOrigin) {
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
  const app = await createAuthApp(new AuthStore(databasePath), providers, webOrigin);
  t.after(() => app.close());
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  function health() {
    return fetch(base + '/healthz');
  }
  function request(path, options = {}) {
    return fetch(base + '/v1/auth/' + path, { redirect: 'manual', ...options });
  }
  function authorize(provider, overrides = {}, web = false) {
    const query = new URLSearchParams({
      redirect_uri: web ? webOrigin?.href : redirectUri, state, code_challenge: challenge, code_challenge_method: 'S256',
      ...overrides
    });
    return request((web ? 'web/' : '') + 'authorize/' + provider + '?' + query);
  }
  async function begin(provider, web = false) {
    const response = await authorize(provider, {}, web);
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
  function post(path, body, headers = {}) {
    return request(path, {
      method: 'POST', headers: { 'content-type': 'application/json', ...headers },
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

const webOrigin = new URL('https://app.example.test');

test('web origin configuration accepts only canonical HTTPS and loopback HTTP origins', () => {
  assert.equal(parseWebOrigin(undefined), undefined);
  assert.equal(parseWebOrigin(''), undefined);
  for (const origin of ['https://app.example.test', 'http://localhost:8081', 'http://127.0.0.1:8081', 'http://[::1]:8081']) {
    assert.equal(parseWebOrigin(origin).origin, origin);
  }
  for (const origin of [
    'http://app.example.test', 'http://127.attacker.test', 'https://app.example.test/',
    'https://app.example.test/?query', 'https://app.example.test/#fragment', 'https://user@app.example.test',
  ]) {
    assert.throws(() => parseWebOrigin(origin), /AUTH_WEB_ORIGIN/);
  }
});

test('web callback exchanges a provider code for a session cookie and logout revokes it', async t => {
  const app = await launch(t, ':memory:', ['google'], webOrigin);
  const flow = await app.begin('google', true);
  const callback = await app.callback('google', flow);
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get('referrer-policy'), 'no-referrer');
  const returnUrl = new URL(callback.headers.get('location'));
  assert.equal(returnUrl.origin, webOrigin.origin);
  assert.equal(returnUrl.pathname, '/');
  assert.equal(returnUrl.searchParams.get('state'), state);
  const appCode = returnUrl.searchParams.get('code');
  const headers = { origin: webOrigin.origin };
  const body = { provider: 'google', code: appCode, codeVerifier: verifier };
  assert.equal((await app.post('web/exchange', body)).status, 403);
  assert.equal((await app.post('web/exchange', body, { origin: 'https://other.example.test' })).status, 403);
  const exchanged = await app.post('web/exchange', body, headers);
  assert.equal(exchanged.status, 200);
  assert.equal(exchanged.headers.get('access-control-allow-origin'), null);
  const cookies = exchanged.headers.get('set-cookie');
  assert.match(cookies, /^__Host-bugmap-session=[A-Za-z0-9_-]{43};/);
  assert.match(cookies, /Max-Age=2592000.*Path=\/.*HttpOnly.*Secure.*SameSite=Lax/);
  assert.doesNotMatch(cookies, /Domain=/i);
  const user = await exchanged.json();
  assert.deepEqual(Object.keys(user), ['userId']);
  const cookie = cookies.split(';')[0];
  assert.equal((await app.post('web/exchange', body, headers)).status, 401);
  assert.equal((await app.request('web/session')).status, 401);
  for (let read = 0; read < 2; read++) {
    const session = await app.request('web/session', { headers: { cookie } });
    assert.equal(session.status, 200);
    assert.deepEqual(await session.json(), user);
    assert.equal(session.headers.get('set-cookie'), null);
    assert.equal(session.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await app.post('web/logout', {}, { cookie })).status, 403);
  const logout = await app.post('web/logout', {}, { ...headers, cookie });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /^__Host-bugmap-session=;.*HttpOnly.*Secure.*SameSite=Lax/);
  assert.equal((await app.request('web/session', { headers: { cookie } })).status, 401);
  assert.equal((await app.post('web/logout', {}, headers)).status, 204);
});

test('web OAuth accepts an exact return URI and preserves app state for cancellation', async t => {
  const app = await launch(t, ':memory:', ['google', 'apple'], webOrigin);
  assert.equal((await app.authorize('apple', {}, true)).status, 400);
  assert.equal((await app.authorize('google', { redirect_uri: webOrigin.origin + '/other' }, true)).status, 400);
  assert.equal((await app.authorize('google', { redirect_uri: webOrigin.origin + '/?x=1' }, true)).status, 400);
  const flow = await app.begin('google', true);
  assert.equal((await app.callback('google', { ...flow, cookie: '' })).status, 400);
  assert.equal((await app.callback('google', flow, { state: '' })).status, 400);
  const cancelled = await app.callback('google', flow, { error: 'access_denied' });
  assert.equal(cancelled.status, 303);
  const returnUrl = new URL(cancelled.headers.get('location'));
  assert.equal(returnUrl.origin, webOrigin.origin);
  assert.equal(returnUrl.pathname, '/');
  assert.deepEqual(Object.fromEntries(returnUrl.searchParams), { state, error: 'access_denied' });
  assert.equal((await app.callback('google', flow)).status, 400);
  const unavailable = await app.authorize('kakao', {}, true);
  assert.equal(unavailable.status, 303);
  assert.equal(new URL(unavailable.headers.get('location')).searchParams.get('error'), 'provider_unavailable');
});

test('web and native codes and session tokens stay scoped to their channel', async t => {
  const origin = new URL('http://127.0.0.1:8081');
  const app = await launch(t, ':memory:', ['kakao'], origin);
  const nativeCode = await app.code('kakao');
  const webCallback = await app.callback('kakao', await app.begin('kakao', true));
  const webCode = new URL(webCallback.headers.get('location')).searchParams.get('code');
  const postWebCode = code => app.post('web/exchange',
    { provider: 'kakao', code, codeVerifier: verifier }, { origin: origin.origin });
  assert.equal((await postWebCode(nativeCode)).status, 401);
  assert.equal((await app.exchange('kakao', webCode)).status, 401);
  const web = await postWebCode(webCode);
  const cookie = web.headers.get('set-cookie');
  assert.match(cookie, /^bugmap-session=[A-Za-z0-9_-]{43};/);
  assert.doesNotMatch(cookie, /Secure|Domain=/i);
  const webToken = cookie.match(/^bugmap-session=([^;]+)/)[1];
  assert.equal((await app.post('refresh', { refreshToken: webToken })).status, 401);
  const native = await (await app.exchange('kakao', nativeCode)).json();
  assert.equal((await web.json()).userId, native.userId);
  assert.equal((await app.request('web/session', {
    headers: { cookie: 'bugmap-session=' + native.refreshToken },
  })).status, 401);
});

test('web routes are disabled when the origin is absent', async t => {
  const app = await launch(t);
  assert.equal((await app.authorize('google', { redirect_uri: webOrigin.href }, true)).status, 404);
  assert.equal((await app.request('web/session')).status, 404);
  assert.equal((await app.post('web/exchange', {}, { origin: webOrigin.origin })).status, 404);
  assert.equal((await app.post('web/logout', {}, { origin: webOrigin.origin })).status, 404);
});

test('a web callback started on a different configured origin never redirects to the new origin', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'bugmap-web-auth-'));
  const database = join(dir, 'auth.sqlite');
  const original = await launch(t, database, ['google'], new URL('https://app.example.test:8443'));
  const current = await launch(t, database, ['google'], webOrigin);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const result = await current.callback('google', await original.begin('google', true));
  assert.equal(result.status, 400);
  assert.equal(result.headers.get('location'), null);
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
