import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = resolve(process.argv[2] ?? '/Users/mac/Documents/BugMap');
const project = resolve(repo, 'work/bugmap-main-map-harness');
const read = (path) => readFile(resolve(project, path), 'utf8');
const json = async (path) => JSON.parse(await read(path));
const { check } = await import(pathToFileURL(resolve(repo, 'tools/design-harness/harness.mjs')).href);
const { figmaTarget } = await import(pathToFileURL(resolve(repo, 'tools/design-harness/figma.mjs')).href);
const approval = 'b95f6ebe-352d-4004-9602-93da1a83250f';
const stages = check(project).stages;
const stage = stages.find((entry) => entry.stage === 'design-system');
if (!stages.slice(0, 5).every((entry) => entry.status === 'passed') ||
    stage.upstreamApprovals['design-system'] !== approval) {
  throw new Error('Approved design-system version does not match this bundle.');
}
const target = figmaTarget(project);
if (target.fileKey !== 'Dan8qlRM20XPkk7Mtd5riw' || target.pageId !== '0:1' ||
    target.documentName !== 'BugMapHaness' ||
    JSON.stringify(target.existingFrames.map((frame) => frame.id)) !== '["7:2","19:2"]') {
  throw new Error('Approved Figma destination does not match this bundle.');
}

const [tokens, copy, wireframes, preview, map, logo, report] = await Promise.all([
  json('05-design-system/tokens.json'), json('05-design-system/copy.json'),
  json('04-wireframes/wireframes.json'), read('05-design-system/preview.svg'),
  read('05-design-system/assets/map-dark.svg'), read('05-design-system/assets/mapbox-logo.svg'),
  json('05-design-system/render-report.json'),
]);
const [screen] = wireframes.screens;
if (wireframes.screens.length !== 1 || screen.id !== 'main-map' || screen.state !== 'default' ||
    screen.width !== 390 || screen.height !== 844 || !report.result) {
  throw new Error('Approved mobile screen and validated render are required.');
}
const blocks = Object.fromEntries(screen.blocks.map((block) => [block.id, block]));
const texts = Object.fromEntries(report.geometry.texts.map((label) => [label.id, label]));
const keys = ['gps', 'record', 'attribution', 'search', 'tab-map', 'tab-community', 'tab-chat', 'tab-my'];
const icons = Object.fromEntries(keys.map((key) => {
  const line = preview.split('\n').find((value) => value.startsWith('<g id="' + key + '"'));
  const svg = line?.match(/<svg [^>]*>[\s\S]*?<\/svg>/)?.[0];
  if (!svg) throw new Error('Missing approved icon: ' + key);
  const [, width, height] = svg.match(/width="([\d.]+)" height="([\d.]+)"/) ?? [];
  if (!width || !height) throw new Error('Missing approved icon geometry: ' + key);
  const body = svg.slice(svg.indexOf('>') + 1, -6);
  const stroke = svg.match(/stroke="(#[0-9a-fA-F]{6})"/)?.[1];
  if (!stroke) throw new Error('Missing approved icon stroke: ' + key);
  return [key, { size: Number(width), svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + width +
    '" height="' + height + '" viewBox="0 0 24 24" fill="none" stroke="' + stroke +
    '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>' }];
}));
const systemGroup = preview.split('\n').filter((line) => /^<g (fill="|transform="translate\((327|348) )/.test(line));
if (systemGroup.length !== 3) throw new Error('Missing approved status indicators.');
const system = '<svg xmlns="http://www.w3.org/2000/svg" width="68" height="14" viewBox="0 0 68 14"><g transform="translate(-304 -20)">' + systemGroup.join('') + '</g></svg>';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const plan = { target, approval, name:'07 · 메인 / 발견 지도', viewport:{width:390,height:844},
  colors:tokens.colors, typography:tokens.typography, layout:tokens.layout, copy:copy.strings,
  blocks, texts, icons, map, logo, system, sources:{
    previewSha256:sha(preview), mapSha256:sha(map), logoSha256:sha(logo),
    wireframeSha256:sha(await read('04-wireframes/wireframes.json')),
  }
};
plan.digest = sha(JSON.stringify(plan));
const plugin = new URL('./plugin.js', import.meta.url);
await writeFile(new URL('./plan.json', import.meta.url), JSON.stringify(plan, null, 2) + '\n');
await writeFile(new URL('./code.js', import.meta.url), 'const PLAN = ' + JSON.stringify(plan) + ';\n' + await readFile(plugin, 'utf8'));
console.log(JSON.stringify({manifest:new URL('./manifest.json', import.meta.url).pathname, planDigest:plan.digest, approvedSources:plan.sources}));
