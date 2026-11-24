import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import test from 'node:test';
import { createWebAuthClient, getWebAuthConfig } from './webAuthClient.ts';

const apiOrigin = 'https://auth.example.test';
const webOrigin = 'http://localhost:8081';

function fixture() {
  const storage = new Map();
  const events = [];
  let href = webOrigin + '/';
  let timestamp = 100_000;
  let response = { status: 200, body: { userId: 'insect-observer' } };
  let sessionResponse;
  const client = createWebAuthClient({ apiOrigin, webOrigin }, {
    crypto: webcrypto,
    now: () => timestamp,
    getStorage: () => ({
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    }),
    getLocation: () => href,
    replaceLocation: url => {
      href = new URL(url, href).href;
      events.push({ type: 'replace', url: href });
    },
    navigate: url => events.push({ type: 'navigate', url }),
    request: async (path, options) => {
      events.push({ type: 'request', path, options, hasPending: storage.size > 0 });
      const result = path === '/v1/auth/web/session' ? sessionResponse ?? response : response;
      return {
        ok: result.status >= 200 && result.status < 300,
        status: result.status,
        json: async () => result.body,
      };
    },
  });

  return {
    client,
    storage,
    events,
    setResponse: (status, body) => { response = { status, body }; },
    setSessionResponse: (status, body) => { sessionResponse = { status, body }; },
    setLocation: value => { href = new URL(value, webOrigin).href; },
    advance: milliseconds => { timestamp += milliseconds; },
  };
}

test('enables browser auth at exactly the configured HTTPS or loopback origin', () => {
  assert.deepEqual(getWebAuthConfig(apiOrigin, webOrigin, webOrigin), { status: 'ready', apiOrigin, webOrigin });
  const loopback = 'http://127.0.0.1:8081';
  assert.deepEqual(getWebAuthConfig(apiOrigin, loopback, loopback), { status: 'ready', apiOrigin, webOrigin: loopback });
  const https = 'https://bugmap.example.test';
  assert.deepEqual(getWebAuthConfig(apiOrigin, https + '/', https), { status: 'ready', apiOrigin, webOrigin: https });
  assert.equal(getWebAuthConfig(apiOrigin, webOrigin, 'http://localhost:8082').status, 'web-origin-mismatch');
  assert.equal(getWebAuthConfig(apiOrigin, 'http://localhost.example.test', 'http://localhost.example.test').status, 'missing-web-origin');
  assert.equal(getWebAuthConfig(apiOrigin, https + '/subpath', https).status, 'missing-web-origin');
  assert.equal(getWebAuthConfig('http://auth.example.test', webOrigin, webOrigin).status, 'missing-server');
});

test('starts supported providers in the same tab with random state and an S256 challenge', async () => {
  const { client, events, storage } = fixture();

  const states = new Set();
  for (const provider of ['kakao', 'google']) {
    assert.deepEqual(await client.signIn(provider), { kind: 'redirected' });
    const target = new URL(events.at(-1).url);
    const [pending] = Array.from(storage.values(), item => JSON.parse(item));
    assert.equal(target.origin, apiOrigin);
    assert.equal(target.pathname, '/v1/auth/web/authorize/' + provider);
    assert.deepEqual(Object.fromEntries(target.searchParams), {
      redirect_uri: webOrigin + '/',
      state: pending.state,
      code_challenge: createHash('sha256').update(pending.verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    assert.deepEqual(Object.keys(pending).sort(), ['createdAt', 'provider', 'state', 'verifier']);
    assert.match(pending.state, /^[a-f0-9]{64}$/);
    assert.match(pending.verifier, /^[a-f0-9]{64}$/);
    assert.equal(pending.provider, provider);
    assert.notEqual(pending.state, pending.verifier);
    states.add(pending.state);
  }
  assert.equal(states.size, 2);
  await assert.rejects(client.signIn('apple'), { kind: 'provider-unavailable' });
});

test('scrubs one valid callback and consumes pending PKCE before guarded same-origin exchange', async () => {
  const { client, events, setLocation, storage } = fixture();
  await client.signIn('google');
  const [pending] = Array.from(storage.values(), item => JSON.parse(item));
  setLocation('/?state=' + pending.state + '&code=one-time-code');

  assert.deepEqual(await client.completeSignIn(), {
    kind: 'authenticated',
    session: { userId: 'insect-observer' },
  });
  const [, replacement, request, sessionRequest] = events;
  assert.deepEqual(replacement, { type: 'replace', url: webOrigin + '/' });
  assert.equal(request.path, '/v1/auth/web/exchange');
  assert.equal(request.hasPending, false);
  assert.equal(request.options.credentials, 'same-origin');
  assert.equal(request.options.mode, 'same-origin');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.referrerPolicy, 'origin');
  assert.deepEqual(JSON.parse(request.options.body), {
    provider: 'google', code: 'one-time-code', codeVerifier: pending.verifier,
  });
  assert.equal(sessionRequest.path, '/v1/auth/web/session');
  assert.equal(sessionRequest.options.credentials, 'same-origin');
  assert.equal(await client.completeSignIn(), null);

  setLocation('/?state=' + pending.state + '&code=one-time-code');
  await assert.rejects(client.completeSignIn(), { kind: 'callback' });
  assert.equal(events.filter(event => event.type === 'request').length, 2);
});

test('requires a cookie-backed session for the exchanged user before reporting successful sign-in', async () => {
  for (const [status, body] of [[401], [200, { userId: 'another-observer' }]]) {
    const { client, setLocation, setSessionResponse, storage } = fixture();
    await client.signIn('kakao');
    const [pending] = Array.from(storage.values(), item => JSON.parse(item));
    setLocation('/?state=' + pending.state + '&code=one-time-code');
    setSessionResponse(status, body);
    await assert.rejects(client.completeSignIn(), { kind: 'session-unavailable' });
    assert.equal(storage.size, 0);
  }
});

test('rejects mismatched, ambiguous and expired responses, and translates provider cancellation', async () => {
  const { client, events, setLocation, storage, advance } = fixture();
  await client.signIn('kakao');
  let [pending] = Array.from(storage.values(), item => JSON.parse(item));

  setLocation('/?state=' + 'a'.repeat(64) + '&code=arbitrary');
  await assert.rejects(client.completeSignIn(), { kind: 'callback' });
  assert.equal(storage.size, 1);

  setLocation('/?state=' + pending.state + '&code=one&error=access_denied');
  await assert.rejects(client.completeSignIn(), { kind: 'callback' });

  setLocation('/other?state=' + pending.state + '&code=one&view=landing');
  await assert.rejects(client.completeSignIn(), { kind: 'callback' });
  assert.equal(events.at(-1).url, webOrigin + '/other?view=landing');

  setLocation('/?state=' + pending.state + '&error=access_denied');
  assert.deepEqual(await client.completeSignIn(), { kind: 'cancelled' });
  assert.equal(storage.size, 0);

  await client.signIn('google');
  [pending] = Array.from(storage.values(), item => JSON.parse(item));
  advance(10 * 60_000);
  setLocation('/?state=' + pending.state + '&code=expired');
  await assert.rejects(client.completeSignIn(), { kind: 'expired' });
  assert.equal(storage.size, 0);
  assert.equal(events.filter(event => event.type === 'request').length, 0);
});

test('restores users from the cookie session and logs out without writing web credentials into JavaScript storage', async () => {
  const { client, events, storage, setResponse } = fixture();
  setResponse(401);
  assert.equal(await client.restoreSession(), null);
  setResponse(200, { userId: 'insect-observer', accessToken: 'unexpected-field' });
  assert.deepEqual(await client.restoreSession(), { userId: 'insect-observer' });
  setResponse(200, { userId: '' });
  await assert.rejects(client.restoreSession(), { kind: 'provider' });
  setResponse(204);
  await client.signOut();

  assert.deepEqual(events.map(({ path, options }) => [path, options.method, options.credentials]), [
    ['/v1/auth/web/session', 'GET', 'same-origin'],
    ['/v1/auth/web/session', 'GET', 'same-origin'],
    ['/v1/auth/web/session', 'GET', 'same-origin'],
    ['/v1/auth/web/logout', 'POST', 'same-origin'],
  ]);
  assert.equal(storage.size, 0);
});
