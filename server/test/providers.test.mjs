import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportJWK, exportPKCS8, generateKeyPair, jwtVerify, SignJWT } from 'jose';
import { createProviders } from '../dist/providers.mjs';

const publicOrigin = new URL('https://auth.example.com');
const input = { state: 'provider-state', nonce: 'oidc-nonce', providerVerifier: 'server-verifier' };

test('Google signs in only with a valid token for this client and authorization', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const badPair = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'test', alg: 'RS256' };
  let token;
  const { google } = await createProviders(publicOrigin, {
    GOOGLE_CLIENT_ID: 'google-client', GOOGLE_CLIENT_SECRET: 'google-secret'
  }, async (url, req) => {
    if (url.toString() === 'https://www.googleapis.com/oauth2/v3/certs') {
      return Response.json({ keys: [jwk] });
    }
    assert.equal(url.toString(), 'https://oauth2.googleapis.com/token');
    assert.equal(req.method, 'POST');
    assert.deepEqual(Object.fromEntries(req.body), {
      grant_type: 'authorization_code', client_id: 'google-client', client_secret: 'google-secret',
      redirect_uri: 'https://auth.example.com/v1/auth/callback/google', code: 'from-google',
      code_verifier: input.providerVerifier,
    });
    return Response.json({ id_token: token, access_token: 'unused' });
  });

  const redirect = google.authorize(input);
  assert.equal(redirect.origin, 'https://accounts.google.com');
  assert.equal(redirect.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(redirect.searchParams.get('nonce'), input.nonce);
  async function sign(overrides = {}, signer = privateKey) {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      sub: 'google-subject', iss: 'https://accounts.google.com', aud: 'google-client',
      nonce: input.nonce, iat: now, exp: now + 300, ...overrides,
    }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).sign(signer);
  }
  for (const invalid of [
    await sign({ nonce: 'wrong' }), await sign({ iss: 'https://else.example' }),
    await sign({ aud: 'wrong-client' }), await sign({ exp: 1 }), await sign({ exp: undefined }),
    await sign({ sub: '' }), await sign({}, badPair.privateKey),
  ]) {
    token = invalid;
    await assert.rejects(google.identify('from-google', input));
  }
  token = await sign();
  assert.deepEqual(await google.identify('from-google', input), { subject: 'google-subject' });
});

test('Apple sends form_post and authenticates token exchange with a short-lived ES256 client secret', async () => {
  const appleKey = await generateKeyPair('ES256', { extractable: true });
  const jwks = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(jwks.publicKey), kid: 'apple-test', alg: 'RS256' };
  let nonce = input.nonce;
  const { apple } = await createProviders(publicOrigin, {
    APPLE_CLIENT_ID: 'bugmap-services-id', APPLE_TEAM_ID: 'team-id',
    APPLE_KEY_ID: 'p8-key-id', APPLE_PRIVATE_KEY: await exportPKCS8(appleKey.privateKey),
  }, async (url, req) => {
    if (url.toString() === 'https://appleid.apple.com/auth/keys') {
      return Response.json({ keys: [jwk] });
    }
    assert.equal(url.toString(), 'https://appleid.apple.com/auth/token');
    assert.equal(req.body.get('redirect_uri'), 'https://auth.example.com/v1/auth/callback/apple');
    assert.equal(req.body.get('code'), 'from-apple');
    assert.equal(req.body.get('code_verifier'), null);
    const { protectedHeader, payload } = await jwtVerify(req.body.get('client_secret'), appleKey.publicKey, {
      algorithms: ['ES256'], audience: 'https://appleid.apple.com',
      issuer: 'team-id', subject: 'bugmap-services-id', requiredClaims: ['iat', 'exp'],
    });
    assert.equal(protectedHeader.kid, 'p8-key-id');
    assert.ok(payload.exp - payload.iat <= 300);

    const idToken = await new SignJWT({ nonce })
      .setIssuer('https://appleid.apple.com').setAudience('bugmap-services-id').setSubject('apple-subject')
      .setIssuedAt().setExpirationTime('5m').setProtectedHeader({ alg: 'RS256', kid: 'apple-test' })
      .sign(jwks.privateKey);
    return Response.json({ id_token: idToken });
  });
  const redirect = apple.authorize(input);
  assert.equal(redirect.origin, 'https://appleid.apple.com');
  assert.equal(redirect.searchParams.get('response_mode'), 'form_post');
  assert.equal(redirect.searchParams.get('response_type'), 'code');
  assert.equal(redirect.searchParams.get('nonce'), input.nonce);
  assert.deepEqual(await apple.identify('from-apple', input), { subject: 'apple-subject' });
  nonce = 'wrong';
  await assert.rejects(apple.identify('from-apple', input));
});

test('Kakao gets the subject from bearer-authenticated user info and preserves a 64-bit ID', async () => {
  const { kakao } = await createProviders(publicOrigin, {
    KAKAO_CLIENT_ID: 'rest-key', KAKAO_CLIENT_SECRET: 'kakao-secret'
  }, async (url, req) => {
    if (url.toString() === 'https://kauth.kakao.com/oauth/token') {
      assert.equal(req.body.get('client_id'), 'rest-key');
      assert.equal(req.body.get('code_verifier'), input.providerVerifier);
      return Response.json({ access_token: 'kakao-token', id_token: 'not-used' });
    }
    assert.equal(url.toString(), 'https://kapi.kakao.com/v2/user/me');
    assert.equal(new Headers(req.headers).get('authorization'), 'Bearer kakao-token');
    return new Response('{"id":9007199254740995,"kakao_account":{"email":"same@example.com"}}');
  });
  const redirect = kakao.authorize(input);
  assert.equal(redirect.origin, 'https://kauth.kakao.com');
  assert.equal(redirect.searchParams.get('code_challenge_method'), 'S256');
  assert.deepEqual(await kakao.identify('from-kakao', input), { subject: '9007199254740995' });
});
