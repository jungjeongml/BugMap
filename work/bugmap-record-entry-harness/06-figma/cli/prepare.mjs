import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = resolve(process.argv[2] ?? '/Users/mac/Documents/BugMap');
const project = resolve(repo, 'work/bugmap-record-entry-harness');
const { check } = await import(pathToFileURL(resolve(repo, 'tools/design-harness/harness.mjs')));
const { DOMParser, XMLSerializer } = createRequire(resolve(repo, 'package.json'))('@xmldom/xmldom');
const stages = check(project).stages;
const approvals = { wireframes: 'f5f36d37-f589-4e50-bc22-536c626a5594', 'design-system': '177a8516-82fe-4689-a7c0-961bf42cd782' };
assert.ok(stages.slice(0, 5).every(({ status }) => status === 'passed'));
for (const [stage, approval] of Object.entries(approvals)) assert.equal(stages[4].upstreamApprovals[stage], approval);
const sourceDigests = {};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = async path => {
  const bytes = await readFile(resolve(project, path));
  sourceDigests[path] = sha(bytes);
  return bytes;
};
const json = async path => JSON.parse(await read(path));
const system = '05-design-system/';
const [target, tokens, copy, components, wireframe, fullWireframe, report, manifest, provenance] = await Promise.all([
  json('control/figma.json'), json(system+'tokens.json'), json(system+'copy.json'), json(system+'components.json'),
  json('04-wireframes/wireframes.json'), json('04-wireframes/full-form/wireframes.json'),
  json(system+'render-report.json'), json(system+'assets-manifest.json'), json(system+'photo-sources.json'),
]);
assert.equal(target.fileKey,'Dan8qlRM20XPkk7Mtd5riw');
assert.equal(target.pageId,'0:1');
assert.equal(target.prototypeSource.nodeId,'41:81');
assert.equal(target.prototypeSource.recordButtonId,'41:443');
assert.ok(report.result);
for (const view of report.views) {
  for (const [path, digest] of Object.entries(view.files)) assert.equal(sha(await read(system+path)), digest, path);
}
const parser = new DOMParser();
const serializer = new XMLSerializer();
const kids = node => Array.from(node.childNodes).filter(child => child.nodeType === 1);
const number = (node, key) => Number(node.getAttribute(key));
const dimensions = node => Object.fromEntries(['x','y','width','height'].map(key => [key,number(node,key)]));
const blockBox = ({ x,y,width,height }) => ({ x,y,width,height });
const componentFor = ({ id, action }) => {
  if (id === 'back') return 'EntryHeader';
  if (id === 'camera' || id === 'gallery') return 'PhotoAddAction';
  if (id.startsWith('delete-photo-')) return 'PhotoThumb';
  if (id === 'species-unknown' || id.startsWith('type-')) return 'EntryChoice';
  if (id === 'location-picker' || id === 'use-current-location') return 'LocationControl';
  if (action === 'submit') return 'EntrySubmit';
  return 'EntryField';
};
const asToken = value => {
  if (!value || value === 'none' || value === 'transparent') return null;
  const item = Object.entries(tokens.colors).find(([, hex]) => hex.toLowerCase() === value.toLowerCase());
  if (!item) throw new Error('Unregistered pigment ' + value);
  return item[0];
};
function leaf(node, id) {
  const uid = node.getAttribute('id') || id;
  if (node.localName === 'text') {
    const key = node.getAttribute('data-copy');
    const text = node.textContent;
    assert.equal(copy.strings[key], text, uid);
    return { kind:'label', id:uid, key, text, x:number(node,'x'), y:number(node,'y'),
      anchor:node.getAttribute('text-anchor'), color:asToken(node.getAttribute('fill')),
      fontSize:number(node,'font-size'), fontWeight:number(node,'font-weight') };
  }
  if (node.localName === 'rect') {
    const box = dimensions(node);
    const stroke = asToken(node.getAttribute('stroke'));
    if (stroke) {
      Object.assign(box,{x:box.x-0.5,y:box.y-0.5,width:box.width+1,height:box.height+1});
    }
    return {kind:'rect',id:uid, ...box, radius:number(node,'rx'), color:asToken(node.getAttribute('fill')), stroke};
  }
  if (node.localName === 'circle') {
    const radius = number(node,'r');
    return {kind:'circle', id:uid, x:number(node,'cx')-radius, y:number(node,'cy')-radius,
      width:2*radius, height:2*radius, color:asToken(node.getAttribute('fill'))};
  }
  if (node.localName === 'svg') {
    const icon = node.cloneNode(true);
    for (const key of ['x','y','id','aria-hidden','data-contrast-fill','data-contrast-bg']) icon.removeAttribute(key);
    return { kind:'vector', id:uid, ...dimensions(node), svg:serializer.serializeToString(icon) };
  }
  throw new Error('Unrecognized approved leaf for '+id+': '+node.localName);
}
function targetFrom(doc, block) {
  const node = doc.getElementById(block.id);
  const [hit, ...visuals] = kids(node);
  assert.deepEqual(dimensions(hit),blockBox(block));
  assert.equal(node.getAttribute('data-action'),block.action);
  assert.ok(block.width >= 44 && block.height >= 44);
  const component = componentFor(block);
  assert.ok(components[component]);
  return { kind:'control', id:block.id, ...blockBox(block), component, action:block.action,
    label:node.getAttribute('aria-label'), role:node.getAttribute('role'),
    enabled:node.getAttribute('aria-disabled') !== 'true',
    selected:node.getAttribute('aria-checked') || node.getAttribute('aria-pressed') || null,
    multiline:node.getAttribute('aria-multiline') === 'true',
    children:visuals.map((child,i) => leaf(child,block.id+'-detail-'+i)) };
}
const regionNames = {photo:'사진',species:'곤충 이름과 기록 유형',location:'발견 위치',observedAt:'발견 날짜·시간',memo:'메모'};
const states = [];
for (const screen of wireframe.screens) {
  const ready = screen.state === 'ready';
  const full = fullWireframe.screens.find(item => item.state === screen.state);
  const expandedName = 'preview-full-'+screen.state+'.svg';
  const startName = ready ? 'preview-ready.svg' : 'preview.svg';
  const expanded = parser.parseFromString((await read(system+expandedName)).toString(), 'image/svg+xml');
  const start = parser.parseFromString((await read(system+startName)).toString(), 'image/svg+xml');
  const byId = Object.fromEntries(screen.blocks.map(block => [block.id,block]));
  const fullById = Object.fromEntries(full.blocks.map(block => [block.id,block]));
  const scroll = {...blockBox(screen.scroll), contentHeight:screen.scroll.contentHeight};
  const sections = Object.entries(screen.scroll.groups).map(([key, blocks]) => ({
    key, name:regionNames[key], children:blocks.map(block => {
      const absolute = fullById[block.id];
      assert.equal(absolute.y, block.y + scroll.y);
      if (block.action) return targetFrom(expanded,absolute);
      if (block.type === 'image') {
        const node = expanded.getElementById(block.id);
        assert.deepEqual(dimensions(node),blockBox(absolute));
        return {kind:'photo',id:block.id, ...blockBox(absolute), asset:'specimen-'+node.getAttribute('data-photo'),
          radius:tokens.layout.photo.radius, stroke:'photoTileBorder'};
      }
      const labels = [expanded.getElementById(block.id+'-label'),expanded.getElementById(block.id+'-field-status')].filter(Boolean);
      assert.ok(labels.length,block.id);
      return {kind:'labels', id:block.id, ...blockBox(absolute), children:labels.map(node=>leaf(node,block.id))};
    }),
  }));
  const status = kids(start.getElementById('system-status')).filter(node=>node.localName === 'g')
    .map(node=>serializer.serializeToString(node).replace('<path d="M23 4.5v3"', '<path fill="none" d="M23 4.5v3"')).join('');
  assert.ok(status);
  const header = [
    leaf(start.getElementById('time-label'),'time-label'),
    {kind:'vector',id:'system-status',x:304,y:20,width:68,height:14,
      svg:'<svg xmlns="http://www.w3.org/2000/svg" width="68" height="14" viewBox="0 0 68 14"><g transform="translate(-304 -20)">'+status+'</g></svg>'},
    targetFrom(start,byId.back),leaf(start.getElementById('screen-title-label'),'screen-title-label'),
  ];
  const footerParts = kids(start.getElementById('fixed-footer'));
  const footer = [ ...(ready ? [] : [leaf(start.getElementById('submit-guidance-label'),'submit-guidance')]),
    {kind:'rect',id:'footer-divider',x:0,y:734,width:390,height:1,radius:0,color:'formFieldBorder'},
    targetFrom(start,byId.submit),leaf(footerParts.at(-1),'home-indicator'),
  ];
  const indicator = leaf(kids(start.getElementById('scroll-indicator'))[0],'scroll-indicator');
  assert.deepEqual(blockBox(indicator),blockBox(byId['scroll-indicator']));
  states.push({state:screen.state, name:'09 · 발견·채집 기록 / '+(ready?'입력 완료 · 3/3장':'첫 진입 · 0/3장'),
    width:screen.width,height:screen.height, scroll, sections, header, footer, indicator});
}
assert.deepEqual(states.map(state => [state.state,state.scroll.contentHeight]),[['default',696],['ready',794]]);
const assets = {};
const assetBytes = {};
for (const photo of provenance.photos) {
  const bytes = await read(system+photo.preview.path);
  assert.equal(bytes.length,photo.preview.bytes);
  assert.equal(sha(bytes),photo.preview.sha256);
  assert.equal(sha(bytes),manifest.files.find(item=>(item.path??item.file)===photo.preview.path).sha256);
  assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[342,270]);
  assetBytes[photo.id] = bytes.toString('base64');
  assets[photo.id] = {path:photo.preview.path,sha256:photo.preview.sha256,author:photo.author,url:photo.sourceUrl,
    license:photo.license,licenseUrl:photo.licenseUrl,treatment:photo.treatment};
}
const plan = { target, approvals, tokens, states, assets, sourceDigests:Object.fromEntries(Object.entries(sourceDigests).sort()) };
plan.digest = sha(JSON.stringify(plan));
const write = (name,data) => writeFile(new URL(name,import.meta.url),data);
await write('plan.json',JSON.stringify(plan,null,2)+'\n');
if (process.argv.includes('--adapter')) {
  const bridge = '/Users/mac/Documents/cursor-talk-to-figma-mcp/src/cursor_mcp_plugin';
  const expected = {
    'code.js':'2f454042289d25172a76599ccbdb582a8a6a197b2b554f255a6f12d4f2653c66',
    'ui.html':'bf429c00fd778a79812262907a81385931bf6972dd24b0386da52726dfe74f1c',
  };
  const source = {};
  for (const [name,digest] of Object.entries(expected)) {
    const bytes = await readFile(resolve(bridge,name));
    assert.equal(sha(bytes),digest,name);
    source[name] = bytes.toString();
  }
  const channel = randomBytes(4).toString('hex');
  const routes = ['status','baseline','build','export','repair'].map(mode => "    case 'bugmap_record_entry_"+mode+"': return await bugMapRecordEntryCommand('"+mode+"', params);");
  const router = 'async function handleCommand(command, params) {\n  switch (command) {';
  const ui = 'const channelName = generateChannelName();';
  assert.equal(source['code.js'].split(router).length,2);
  assert.equal(source['ui.html'].split(ui).length,2);
  const plugin = await readFile(new URL('plugin.js',import.meta.url),'utf8');
  const prepared = {
    'code.js':source['code.js'].replace(router,router+'\n'+routes.join('\n'))+'\nconst RECORD_ENTRY_PLAN = '+JSON.stringify(plan)+';\nconst RECORD_ENTRY_ASSET_BYTES = '+JSON.stringify(assetBytes)+';\n'+plugin,
    'ui.html':source['ui.html'].replace(ui,'const channelName = "'+channel+'";'),
  };
  for (const name of ['original','prepared']) await mkdir(new URL('adapter/'+name+'/',import.meta.url),{recursive:true});
  for (const name of Object.keys(source)) {
    await write('adapter/original/'+name,source[name]);
    await write('adapter/prepared/'+name,prepared[name]);
  }
  await write('adapter/patch.json',JSON.stringify({bridge,channel,expected,prepared:Object.fromEntries(Object.entries(prepared).map(([name,value])=>[name,sha(value)])),planDigest:plan.digest},null,2)+'\n');
}
console.log(JSON.stringify({digest:plan.digest, states:states.map(({state,scroll})=>({state,scroll})), assets:Object.keys(assets)}));
