import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Pool } from 'pg';
import { test } from 'node:test';
import { createAuthApp, parseWebOrigin } from '../dist/app.mjs';
import { AuthStore } from '../dist/auth/auth.store.mjs';

const redirectUri = 'bugmap://auth/callback';
const state = 'app-state';
const verifier = 'abcdefghijklmnopqrstuvwxyz0123456789uvwxyzABC';
const challenge = createHash('sha256').update(verifier).digest('base64url');

async function testDatabase(t) {
  const baseUrl = process.env.AUTH_TEST_DATABASE_URL;
  assert.ok(baseUrl, 'Set AUTH_TEST_DATABASE_URL to a PostgreSQL connection with permission to create schemas');
  const schema = 'auth_test_' + randomUUID().replaceAll('-', '');
  const pool = new Pool({ connectionString: baseUrl, max: 1 });
  t.after(async () => {
    try {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await pool.end();
    }
  });
  const migration = await readFile(new URL('../prisma/migrations/20261126000000_auth/migration.sql', import.meta.url), 'utf8');
  await pool.query(`CREATE SCHEMA "${schema}"; SET search_path TO "${schema}"; ${migration}`);
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schema);
  return { url: url.href, pool };
}

async function launch(t, databaseUrl, providerIds = ['google', 'kakao', 'apple'], webOrigin) {
  databaseUrl ??= (await testDatabase(t)).url;
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
  const app = await createAuthApp(new AuthStore(databaseUrl), providers, webOrigin);
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
    const app = await launch(t, undefined, providerIds);
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
  const app = await launch(t, undefined, ['google'], webOrigin);
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
  assert.deepEqual(user, { userId: user.userId, displayName: null });
  assert.equal(typeof user.userId, 'string');
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
  const nickname = { userId: user.userId, displayName: '숲길관찰자' };
  assert.equal((await app.post('web/nickname', nickname, { cookie })).status, 403);
  assert.equal((await app.post('web/nickname', { ...nickname, userId: 'other' }, { ...headers, cookie })).status, 401);
  const saved = await app.post('web/nickname', nickname, { ...headers, cookie });
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), nickname);
  assert.deepEqual(await (await app.request('web/session', { headers: { cookie } })).json(), nickname);
  assert.equal((await app.post('web/logout', {}, { cookie })).status, 403);
  const logout = await app.post('web/logout', {}, { ...headers, cookie });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /^__Host-bugmap-session=;.*HttpOnly.*Secure.*SameSite=Lax/);
  assert.equal((await app.request('web/session', { headers: { cookie } })).status, 401);
  assert.equal((await app.post('web/logout', {}, headers)).status, 204);
});

test('web OAuth accepts an exact return URI and preserves app state for cancellation', async t => {
  const app = await launch(t, undefined, ['google', 'apple'], webOrigin);
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
  const app = await launch(t, undefined, ['kakao'], origin);
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
  const { url } = await testDatabase(t);
  const original = await launch(t, url, ['google'], new URL('https://app.example.test:8443'));
  const current = await launch(t, url, ['google'], webOrigin);
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
  const app = await launch(t, undefined, ['google']);
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
  const { url } = await testDatabase(t);
  const first = await launch(t, url);
  const second = await launch(t, url);
  const initial = await first.login('kakao');
  assert.deepEqual(Object.keys(initial).sort(), ['accessToken', 'displayName', 'refreshToken', 'userId']);
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

test('saves the first nickname, rejects case-insensitive duplicates and restores the saved value', async t => {
  const app = await launch(t);
  const first = await app.login('google', { code: 'first-observer' });
  const second = await app.login('kakao', { code: 'second-observer' });
  const headers = session => ({ authorization: 'Bearer ' + session.accessToken });
  assert.equal(first.displayName, null);
  assert.equal((await app.post('nickname', { displayName: '숲길' })).status, 401);
  for (const displayName of [' ', '숲', 'a'.repeat(13), 'a\nb']) {
    assert.equal((await app.post('nickname', { displayName }, headers(first))).status, 400);
  }
  const saved = await app.post('nickname', { displayName: ' BugHunter ', userId: second.userId }, headers(first));
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { userId: first.userId, displayName: 'BugHunter' });
  assert.equal((await app.post('nickname', { displayName: 'bughunter' }, headers(second))).status, 409);
  const retry = await app.post('nickname', { displayName: 'BugHunter' }, headers(first));
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).displayName, 'BugHunter');
  assert.equal((await (await app.post('refresh', { refreshToken: first.refreshToken })).json()).displayName, 'BugHunter');
  const returning = await app.login('google', { code: 'first-observer' });
  assert.equal(returning.userId, first.userId);
  assert.equal(returning.displayName, 'BugHunter');

  const third = await app.login('google', { code: 'third-observer' });
  const competing = await Promise.all([second, third].map(session =>
    app.post('nickname', { displayName: '숲길관찰자' }, headers(session))));
  assert.deepEqual(competing.map(response => response.status).sort(), [200, 409]);
});

test('persists nicknames in PostgreSQL with ASCII-only case folding', async t => {
  const { url, pool } = await testDatabase(t);
  const app = await launch(t, url);
  const first = await app.login('google');
  const second = await app.login('kakao');
  for (const [session, displayName] of [[first, 'Écho'], [second, 'écho']]) {
    const saved = await app.post('nickname', { displayName }, {
      authorization: 'Bearer ' + session.accessToken,
    });
    assert.equal(saved.status, 200);
    const result = await pool.query('SELECT display_name FROM users WHERE id = $1', [session.userId]);
    assert.deepEqual(result.rows, [{ display_name: displayName }]);
  }
});

test('concurrent first logins for one provider subject share a user', async t => {
  const app = await launch(t);
  const codes = await Promise.all([app.code('google'), app.code('google')]);
  const responses = await Promise.all(codes.map(code => app.exchange('google', code)));
  assert.deepEqual(responses.map(response => response.status), [200, 200]);
  const [first, second] = await Promise.all(responses.map(response => response.json()));
  assert.equal(first.userId, second.userId);
  assert.notEqual(first.refreshToken, second.refreshToken);
});

test('logout with the prior token wins even if it races refresh', async t => {
  const app = await launch(t);
  const initial = await app.login('google');
  const [refresh, logout] = await Promise.all([
    app.post('refresh', { refreshToken: initial.refreshToken }),
    app.post('logout', { refreshToken: initial.refreshToken }),
  ]);
  assert.equal(logout.status, 204);
  assert.ok([200, 401].includes(refresh.status));
  if (refresh.ok) {
    const rotated = await refresh.json();
    assert.equal((await app.post('refresh', { refreshToken: rotated.refreshToken })).status, 401);
  }
  assert.equal((await app.post('refresh', { refreshToken: initial.refreshToken })).status, 401);
});

test('imports SQLite accounts idempotently and rolls back on a conflicting nickname', async t => {
  const { url, pool } = await testDatabase(t);
  const folder = await mkdtemp(join(tmpdir(), 'bugmap-import-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const path = join(folder, 'accounts.sqlite');
  const sqlite = new DatabaseSync(path);
  t.after(() => sqlite.close());
  sqlite.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, display_name TEXT);
    CREATE TABLE identities (provider TEXT, subject TEXT, user_id TEXT, PRIMARY KEY (provider, subject));
  `);
  const userId = randomUUID();
  sqlite.prepare('INSERT INTO users VALUES (?, ?)').run(userId, 'BugScout');
  sqlite.prepare('INSERT INTO identities VALUES (?, ?, ?)').run('google', 'imported-observer', userId);
  const script = fileURLToPath(new URL('../scripts/import-sqlite-auth.mjs', import.meta.url));
  const runImport = () => promisify(execFile)(process.execPath, [script, path], {
    env: { ...process.env, DATABASE_URL: url },
  });
  await runImport();
  await runImport();
  assert.deepEqual((await pool.query('SELECT count(*)::int AS count FROM sessions')).rows, [{ count: 0 }]);
  const app = await launch(t, url);
  const session = await app.login('google', { code: 'imported-observer' });
  assert.equal(session.userId, userId);
  assert.equal(session.displayName, 'BugScout');

  const unrelatedId = randomUUID();
  sqlite.prepare('INSERT INTO users VALUES (?, ?), (?, ?)').run(
    unrelatedId, 'NewObserver', randomUUID(), 'bugscout',
  );
  await assert.rejects(runImport(), error => error.code === 1 && /accounts or nicknames conflict/.test(error.stderr));
  assert.deepEqual((await pool.query('SELECT id, display_name FROM users')).rows, [
    { id: userId, display_name: 'BugScout' },
  ]);
});
