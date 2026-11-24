import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = resolve(process.argv[2] ?? '/Users/mac/Documents/BugMap');
const runtime = resolve(process.argv[3] ?? '/private/tmp/bugmap-cluster-cursor-runtime');
const base = resolve(repo, 'work/bugmap-record-cluster-harness');
const read = path => readFile(resolve(base, path));
const json = async path => JSON.parse(await read(path));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const design = path => '05-design-system/' + path;
const { check } = await import(pathToFileURL(resolve(repo, 'tools/design-harness/harness.mjs')));
const stages = check(base).stages;
const approval = '80fd3cc0-9f6c-40a7-a524-7d9cd5a076c3';
assert.ok(stages.slice(0, 5).every(({status}) => status === 'passed'));
assert.equal(stages[4].upstreamApprovals['design-system'], approval);
const target = await json('control/figma.json');
assert.deepEqual([target.fileKey, target.documentName, target.pageId, target.pageName],
  ['Dan8qlRM20XPkk7Mtd5riw', 'BugMapHarness', '0:1', 'Page 1']);
const { colors, typography, layout } = await json(design('tokens.json'));
const { strings } = await json(design('copy.json'));
const { photos, usage } = await json(design('photo-sources.json'));
const { files } = await json(design('assets-manifest.json'));
const sourceDigests = {};
for (const path of [
  'control/figma.json', '04-wireframes/wireframes.json',
  ...['tokens.json','components.json','copy.json','photo-sources.json','assets-manifest.json','asset-sources.md',
    'preview.svg','preview-overflow.svg','captures/390x844-cluster-selected.png','captures/390x844-cluster-selected-overflow.png'].map(design),
]) sourceDigests[path] = sha(await read(path));
const assets = {}, photoBytes = {};
for (const photo of photos) {
  const { path, dimensions, sha256 } = photo.preview;
  const registered = files.find(item => (item.path ?? item.file) === path);
  const bytes = await read(design(path));
  assert.ok(registered?.sha256 === sha256 && sha(bytes) === sha256 && registered.bytes === bytes.length);
  assert.deepEqual(dimensions, {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});
  assets[photo.id] = {path,dimensions,sha256,artist:photo.author,source:photo.sourceUrl,license:photo.license,licenseUrl:photo.licenseUrl};
  sourceDigests[design(path)] = sha256;
  photoBytes[photo.id] = bytes.toString('base64');
}
const { DOMParser, XMLSerializer } = createRequire(resolve(repo, 'package.json'))('@xmldom/xmldom');
const preview = new DOMParser().parseFromString((await read(design('preview.svg'))).toString('utf8'), 'image/svg+xml');
const serializer = new XMLSerializer();
const icons = {};
for (const name of ['x','chevron-right']) {
  const node = Array.from(preview.getElementsByTagName('svg')).find(item => item.getAttribute('data-icon') === name);
  assert.ok(node, name);
  for (const attr of ['x','y','aria-hidden','data-icon']) node.removeAttribute(attr);
  icons[name] = serializer.serializeToString(node);
}
const states = usage.map(({state,records}) => {
  const overflow = state === 'cluster-selected-overflow';
  assert.equal(records.length, overflow ? 7 : 3);
  assert.ok(records.every(record => assets[record.photoId] && strings[record.recordId+'-name'] === record.name &&
    strings[record.recordId+'-date'] === record.discoveryDate));
  return {state, frameName:'07 · 메인 / 주변 관찰 기록 '+records.length+'건', layout:layout.states[state],
    countTitle:overflow ? strings.titleSeven : strings.titleThree, records};
});
const priorNodes = await readFile(resolve(repo, 'work/bugmap-main-map-harness/06-figma/captures/main-map-default.png'));
const plan = { target,approval,sourceDigests,colors,typography,layout,strings,states,icons,assets,
  mapBaselineSha:sha(priorNodes),
  sourceLayerIds:['41:798','41:376','41:379','41:380','41:402'],
  systemLayerIds:['41:489','41:835'], attributionId:'41:427',logoId:'41:819' };
plan.digest = sha(JSON.stringify(plan));
await writeFile(new URL('plan.json', import.meta.url), JSON.stringify(plan,null,2)+'\n');

const original = '/Users/mac/Documents/cursor-talk-to-figma-mcp/src/cursor_mcp_plugin';
const expected = {
  'code.js':'2f454042289d25172a76599ccbdb582a8a6a197b2b554f255a6f12d4f2653c66',
  'ui.html':'bf429c00fd778a79812262907a81385931bf6972dd24b0386da52726dfe74f1c',
  'manifest.json':'678f196adb480f4647c032ca14901e9ab2849baaebd9af2a4b003ece2d1f38ee',
};
const originals = {};
for (const [name,hash] of Object.entries(expected)) {
  const bytes = await readFile(resolve(original,name));
  assert.equal(sha(bytes),hash,'Existing Cursor plugin source changed: '+name);
  originals[name] = bytes;
}
const manifest = JSON.parse(originals['manifest.json']);
assert.deepEqual([manifest.name,manifest.id,manifest.main,manifest.ui],['Cursor MCP Plugin','1485687494525374295','code.js','ui.html']);
const channel = randomBytes(4).toString('hex');
const anchor = 'async function handleCommand(command, params) {\n  switch (command) {';
const uiAnchor = 'const channelName = generateChannelName();';
const code = originals['code.js'].toString('utf8'), ui = originals['ui.html'].toString('utf8');
assert.equal(code.split(anchor).length,2);
assert.equal(ui.split(uiAnchor).length,2);
const modes = process.argv[4] === 'read-only' ? ['status','baseline','export'] : ['status','baseline','build','export'];
const routes = modes.map(mode =>
  "    case 'bugmap_cluster_"+mode+"': return await bugMapClusterCommand('"+mode+"', params);");
const builder = await readFile(new URL('plugin.js',import.meta.url),'utf8');
const prepared = {
  'code.js':code.replace(anchor,anchor+'\n'+routes.join('\n'))+'\nconst CLUSTER_PLAN = '+JSON.stringify(plan)+
    ';\nconst CLUSTER_PHOTOS = '+JSON.stringify(photoBytes)+';\n'+builder,
  'ui.html':ui.replace(uiAnchor,'const channelName = "'+channel+'";'),
};
for (const folder of ['original','prepared']) await mkdir(resolve(runtime,folder),{recursive:true});
for (const [name,bytes] of Object.entries(originals)) await writeFile(resolve(runtime,'original',name),bytes);
for (const [name,value] of Object.entries(prepared)) await writeFile(resolve(runtime,'prepared',name),value);
const digest = Object.fromEntries(Object.entries(prepared).map(([name,value])=>[name,{original:expected[name],prepared:sha(value)}]));
await writeFile(resolve(runtime,'patch.json'),JSON.stringify({original,channel,digest,manifest:expected['manifest.json'],planDigest:plan.digest,modes},null,2)+'\n');
console.log(JSON.stringify({target:target.fileKey,states:states.map(x=>x.state),planDigest:plan.digest,photos:Object.keys(assets),runtime}));
