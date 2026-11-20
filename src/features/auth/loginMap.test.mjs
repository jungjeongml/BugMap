import assert from 'node:assert/strict';
import test from 'node:test';
import { getLoginMapUrl, selectLoginMap } from './loginMapConfig.ts';

test('requests the approved fixed Seoul Forest camera with a public token and custom attribution', () => {
  const url = new URL(getLoginMapUrl('  pk.example_signature.test-value  '));

  assert.equal(url.origin, 'https://api.mapbox.com');
  assert.equal(url.pathname, '/styles/v1/mapbox/dark-v11/static/127.039,37.5425,14,0,0/390x844@2x');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    access_token: 'pk.example_signature.test-value',
    attribution: 'false',
    logo: 'false',
  });
});

test('skips network requests when the token is missing or malformed', () => {
  for (const token of [undefined, '', '  ', 'bad-token', 'sk.example.signature', 'pk.a.b&logo=true']) {
    assert.equal(getLoginMapUrl(token), null);
  }
});

test('shows the bundled illustration until the current map loads, including after a failed load', () => {
  const uri = getLoginMapUrl('pk.example.first');

  assert.equal(selectLoginMap(null, { uri, status: 'loaded' }), 'illustration');
  assert.equal(selectLoginMap(uri, null), 'illustration');
  assert.equal(selectLoginMap(uri, { uri, status: 'failed' }), 'illustration');
  assert.equal(selectLoginMap(uri, { uri, status: 'loaded' }), 'mapbox');
});

test('never shows the old image or its credits after changing tokens', () => {
  const oldUri = getLoginMapUrl('pk.example.first');
  const newUri = getLoginMapUrl('pk.example.second');

  assert.equal(selectLoginMap(newUri, { uri: oldUri, status: 'loaded' }), 'illustration');
  assert.equal(selectLoginMap(newUri, { uri: newUri, status: 'loaded' }), 'mapbox');
});
