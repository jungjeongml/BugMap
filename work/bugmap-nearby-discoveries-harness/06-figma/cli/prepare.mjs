import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = resolve(process.argv[2] ?? '/Users/mac/Documents/BugMap');
const project = resolve(repo, 'work/bugmap-nearby-discoveries-harness');
const { check } = await import(pathToFileURL(resolve(repo, 'tools/design-harness/harness.mjs')));
const { DOMParser, XMLSerializer } = createRequire(resolve(repo, 'package.json'))('@xmldom/xmldom');
const approval = '0d9f3d9e-b894-4fb0-bec1-725024d4c9b0';
const stages = check(project).stages;
if (!stages.slice(0, 5).every(({ status }) => status === 'passed') ||
    stages[4].upstreamApprovals['design-system'] !== approval) throw new Error('Approved Stage 05 changed');
const read = path => readFile(resolve(project, path));
const json = async path => JSON.parse(await read(path));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const [target, tokens, copy, reports, provenance, manifest] = await Promise.all([
  json('control/figma.json'), json('05-design-system/tokens.json'), json('05-design-system/copy.json'),
  json('05-design-system/render-report.json'), json('05-design-system/photo-sources.json'),
  json('05-design-system/assets-manifest.json'),
]);
if (target.fileKey !== 'Dan8qlRM20XPkk7Mtd5riw' || target.pageId !== '0:1' ||
    target.prototypeSource.nodeId !== '41:81' || target.prototypeSource.dragHandleId !== '41:451' ||
    !reports.result || reports.states.length !== 2) throw new Error('Unexpected target or representative states');
const parser = new DOMParser();
const serializer = new XMLSerializer();
const states = [];
const sourceDigests = {};
for (const state of reports.states) {
  const artwork = Object.keys(state.files).find(name => name.endsWith('.svg'));
  for (const [path, digest] of Object.entries(state.files)) {
    const actual = sha(await read('05-design-system/' + path));
    if (actual !== digest) throw new Error('Approved rendered data changed: ' + path);
    sourceDigests['05-design-system/' + path] = actual;
  }
  const doc = parser.parseFromString((await read('05-design-system/' + artwork)).toString(), 'image/svg+xml');
  const geometry = state.geometry;
  const texts = Object.fromEntries(geometry.texts.map(spec => {
    const node = doc.getElementById(spec.id);
    if (!node || node.textContent !== spec.text || copy.strings[spec.key] !== spec.text) throw new Error('Approved copy differs: ' + spec.id);
    return [spec.id, { ...spec, centerY: Number(node.getAttribute('y')), anchorX: Number(node.getAttribute('x')),
      anchor: node.getAttribute('text-anchor'), color: node.getAttribute('fill') }];
  }));
  const icons = {};
  for (const id of ['search-icon', 'map-return-icon', 'tab-icon-map', 'tab-icon-community', 'tab-icon-chat', 'tab-icon-my']) {
    const node = doc.getElementById(id);
    const box = Object.fromEntries(['x','y','width','height'].map(k => [k, Number(node.getAttribute(k))]));
    const vector = node.cloneNode(true);
    for (const key of ['x', 'y', 'id', 'aria-hidden', 'data-contrast-fill', 'data-contrast-bg']) vector.removeAttribute(key);
    icons[id] = {svg:serializer.serializeToString(vector), box};
  }
  const bars = doc.getElementById('system-status');
  const indicators = Array.from(bars.childNodes).filter(node => node.localName === 'g').map(node =>
    serializer.serializeToString(node).replace('<path d="M23 4.5v3"', '<path fill="none" d="M23 4.5v3"')).join('');
  if (!indicators || Object.values(icons).some(({box}) => box.width < 20)) throw new Error('Missing approved vector artwork');
  const statusSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="68" height="14" viewBox="0 0 68 14"><g transform="translate(-304 -20)">' + indicators + '</g></svg>';
  const targets = Object.fromEntries(geometry.targets.map(node => [node.id,node]));
  const photos = Object.fromEntries(geometry.photos.map(node => [node.id,node.box]));
  const name = '08 · 내 주변 발견 / ' + (state.state === 'default' ? '전체' : '3 km 이내');
  states.push({ state:state.state, name, texts, icons, statusSvg, targets, photos });
}
const bytesByAsset = {};
const assets = {};
for (const source of provenance.photos) {
  const path = source.preview.path;
  const png = await read('05-design-system/' + path);
  const registered = manifest.files.find(entry => (entry.path ?? entry.file) === path);
  if (sha(png) !== source.preview.sha256 || registered?.sha256 !== source.preview.sha256 ||
      source.preview.bytes !== png.length || png.readUInt32BE(16) !== 264 || png.readUInt32BE(20) !== 264) {
    throw new Error('Approved source photo changed: ' + source.id);
  }
  sourceDigests['05-design-system/' + path] = sha(png);
  bytesByAsset[source.id] = png.toString('base64');
  assets[source.id] = { path, sha256:sha(png), artist:source.author, url:source.sourceUrl,
    license:source.license, ...(source.licenseUrl ? {licenseUrl:source.licenseUrl} : {}), modifications:'Squared crop and resized to 264×264 PNG' };
}
for (const path of ['04-wireframes/wireframes.json','05-design-system/tokens.json','05-design-system/components.json','05-design-system/copy.json','05-design-system/asset-sources.md','05-design-system/photo-sources.json','05-design-system/assets-manifest.json']) sourceDigests[path] = sha(await read(path));
const plan = { target, approval, colors:tokens.colors, typography:tokens.typography, layout:tokens.layout,
  states, assets, sourceDigests };
plan.digest = sha(JSON.stringify(plan));
await writeFile(new URL('plan.json', import.meta.url), JSON.stringify(plan, null, 2)+'\n');
if (process.argv[3] === 'adapter') {
  const plugin = await readFile(new URL('plugin.js', import.meta.url), 'utf8');
  await writeFile(new URL('embedded-builder.js', import.meta.url),
    'const NEARBY_PLAN = ' + JSON.stringify(plan) + ';\nconst NEARBY_ASSET_BYTES = ' + JSON.stringify(bytesByAsset) + ';\n' + plugin);
}
console.log(JSON.stringify({digest:plan.digest, target:target.fileKey, states:states.map(({state})=>state), photos:Object.keys(assets)}));
