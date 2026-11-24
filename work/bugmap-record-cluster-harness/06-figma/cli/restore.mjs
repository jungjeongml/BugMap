import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runtime = resolve(process.argv[2] ?? '/private/tmp/bugmap-cluster-cursor-runtime');
const patch = JSON.parse(await readFile(resolve(runtime,'patch.json')));
const allowed = '/Users/mac/Documents/cursor-talk-to-figma-mcp/src/cursor_mcp_plugin';
assert.equal(patch.original,allowed);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(await readFile(resolve(allowed,'manifest.json'))),patch.manifest);
const files = [];
for (const name of ['code.js','ui.html']) {
  const destination = resolve(allowed,name);
  const original = await readFile(resolve(runtime,'original',name));
  const current = await readFile(destination);
  const originalDigest = patch.digest[name].original;
  const patchedDigest = patch.digest[name].prepared;
  assert.equal(sha(original),originalDigest);
  assert.ok([originalDigest,patchedDigest].includes(sha(current)), 'Unexpected change: '+destination);
  files.push({name,destination,original,expected:originalDigest,before:sha(current)});
}
for (const file of files) if (file.before !== file.expected) await writeFile(file.destination,file.original);
const verified = [];
for (const file of files) {
  const digest = sha(await readFile(file.destination));
  assert.equal(digest,file.expected);
  verified.push({name:file.name,originalSha256:file.expected,restoredSha256:digest});
}
const receipt = {mode:'restore',verifiedAt:new Date().toISOString(),manifestSha256:patch.manifest,files:verified};
await writeFile(new URL('../cursor-source-restore.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
