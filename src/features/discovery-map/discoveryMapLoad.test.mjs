import assert from 'node:assert/strict';
import test from 'node:test';
import { createMapLoadTracker } from './discoveryMapLoad.ts';

test('a generic render cannot clear a failed source until that source recovers', () => {
  const updates = [];
  const map = createMapLoadTracker(status => updates.push(status));

  map.fail('source:streets');
  map.rendered();
  map.recover('source:terrain');
  assert.deepEqual(updates, ['failed']);

  map.recover('source:streets');
  assert.deepEqual(updates, ['failed', 'ready']);
});

test('a lost context keeps a previously rendered map failed until it renders again', () => {
  const updates = [];
  const map = createMapLoadTracker(status => updates.push(status));

  map.rendered();
  map.resetViewport();
  map.fail('context');
  map.recover('context');
  assert.deepEqual(updates, ['ready', 'loading', 'failed', 'loading']);

  map.rendered();
  assert.deepEqual(updates, ['ready', 'loading', 'failed', 'loading', 'ready']);
});
