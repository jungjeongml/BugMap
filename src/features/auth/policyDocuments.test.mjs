import assert from 'node:assert/strict';
import test from 'node:test';
import * as policyDocuments from './policyDocuments.ts';

const termsEnv = 'EXPO_PUBLIC_BUGMAP_TERMS_URL';
const privacyEnv = 'EXPO_PUBLIC_BUGMAP_PRIVACY_URL';

function setPolicyUrls(t, terms, privacy) {
  for (const [variable, value] of [[termsEnv, terms], [privacyEnv, privacy]]) {
    const previous = process.env[variable];
    if (value === undefined) delete process.env[variable];
    else process.env[variable] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[variable];
      else process.env[variable] = previous;
    });
  }
}

test('opens the terms URL configured for the terms link', async t => {
  setPolicyUrls(t, 'https://example.test/terms', 'https://example.test/privacy');
  const opened = [];

  const result = await policyDocuments.openPolicyDocument('terms', async url => { opened.push(url); });

  assert.deepEqual(opened, ['https://example.test/terms']);
  assert.equal(result, 'opened');
});

test('opens the privacy URL configured for the privacy link', async t => {
  setPolicyUrls(t, 'https://example.test/terms', 'https://example.test/privacy');
  const opened = [];

  const result = await policyDocuments.openPolicyDocument('privacy', async url => { opened.push(url); });

  assert.deepEqual(opened, ['https://example.test/privacy']);
  assert.equal(result, 'opened');
});

test('reports that a document is being prepared when its URL is missing or blank', async t => {
  setPolicyUrls(t, undefined, '  ');
  const opened = [];
  const openUrl = async url => { opened.push(url); };

  assert.equal(await policyDocuments.openPolicyDocument('terms', openUrl), 'pending');
  assert.equal(await policyDocuments.openPolicyDocument('privacy', openUrl), 'pending');
  assert.deepEqual(opened, []);
});

for (const invalidUrl of [
  'http://example.test/terms',
  '/terms',
  'https://',
  'https:///example.test/terms',
  'https://example.test:abc/terms',
  'https://user:secret@example.test/terms',
]) {
  test(`reports an opening failure without launching ${invalidUrl}`, async t => {
    setPolicyUrls(t, invalidUrl, 'https://example.test/privacy');
    const opened = [];

    const result = await policyDocuments.openPolicyDocument('terms', async url => { opened.push(url); });

    assert.equal(result, 'failed');
    assert.deepEqual(opened, []);
  });
}

test('reports an opening failure when the browser rejects the request', async t => {
  setPolicyUrls(t, undefined, 'https://example.test/privacy');
  const opened = [];

  const result = await policyDocuments.openPolicyDocument('privacy', async url => {
    opened.push(url);
    throw new Error('Browser failed to open');
  });

  assert.deepEqual(opened, ['https://example.test/privacy']);
  assert.equal(result, 'failed');
});
