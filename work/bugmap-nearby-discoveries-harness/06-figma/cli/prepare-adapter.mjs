import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const original = resolve(process.argv[2] ?? '/Users/mac/Documents/cursor-talk-to-figma-mcp/src/cursor_mcp_plugin');
const staged = new URL('adapter/', import.meta.url);
const expected = {
  'code.js':'2f454042289d25172a76599ccbdb582a8a6a197b2b554f255a6f12d4f2653c66',
  'ui.html':'bf429c00fd778a79812262907a81385931bf6972dd24b0386da52726dfe74f1c',
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = {};
for (const [path,digest] of Object.entries(expected)) {
  const bytes = await readFile(resolve(original,path));
  if (sha(bytes) !== digest) throw new Error('Cursor original changed: '+path);
  files[path] = bytes.toString('utf8');
}
const digest = {};
const channel = process.argv[3] ?? randomBytes(4).toString('hex');
if (!/^[a-f0-9]{8}$/.test(channel)) throw new Error('Invalid scoped connector channel');
const routes = ['status','baseline','build','export'].map(mode => "    case 'bugmap_nearby_"+mode+"': return await bugMapNearbyCommand('"+mode+"', params);");
const codeMatch = 'async function handleCommand(command, params) {\n  switch (command) {';
if (files['code.js'].split(codeMatch).length !== 2) throw new Error('Cursor router anchor ambiguous');
const uiMatch = 'const channelName = generateChannelName();';
if (files['ui.html'].split(uiMatch).length !== 2) throw new Error('Cursor connect anchor ambiguous');
const payload = await readFile(new URL('embedded-builder.js',import.meta.url),'utf8');
const prepared = {'code.js':files['code.js'].replace(codeMatch,codeMatch+'\n'+routes.join('\n'))+'\n'+payload,
  'ui.html':files['ui.html'].replace(uiMatch,'const channelName = "'+channel+'";')};
for (const type of ['original','prepared']) await mkdir(new URL(type+'/',staged),{recursive:true});
for (const [name,value] of Object.entries(prepared)) {
  await writeFile(new URL('original/'+name,staged),files[name]);
  await writeFile(new URL('prepared/'+name,staged),value);
  digest[name] = {original:expected[name],prepared:sha(value)};
}
await writeFile(new URL('patch.json',staged),JSON.stringify({channel,original,digest,routes},null,2)+'\n');
console.log(JSON.stringify({staged:staged.pathname,channel,digest},null,2));
