import assert from 'node:assert/strict';
import test from 'node:test';
import { getPublicMapboxToken } from '../../config/mapbox.mjs';
import { isDiscoveryMapPreview } from './discoveryMapConfig.ts';

test('opens the discovery map preview only for the exact query in a web development build', () => {
  assert.equal(isDiscoveryMapPreview(true, 'web', '?preview=discovery-map'), true);
  assert.equal(isDiscoveryMapPreview(false, 'web', '?preview=discovery-map'), false);
  assert.equal(isDiscoveryMapPreview(true, 'ios', '?preview=discovery-map'), false);
  assert.equal(isDiscoveryMapPreview(true, 'android', '?preview=discovery-map'), false);
  assert.equal(isDiscoveryMapPreview(true, 'web'), false);
  assert.equal(isDiscoveryMapPreview(true, 'web', '?preview=false'), false);
});

test('accepts only public Mapbox tokens for a client-side SDK', () => {
  assert.equal(getPublicMapboxToken('  pk.example-token.test_value  '), 'pk.example-token.test_value');
  for (const token of [undefined, '', '  ', 'bad-token', 'sk.example.signature', 'pk.a.b&foo=true']) {
    assert.equal(getPublicMapboxToken(token), null);
  }
});
