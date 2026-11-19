import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { fillPipeline, png, digest } from './fixtures.mjs';
const cli = fileURLToPath(new URL('../bin/design-harness', import.meta.url));
const hook = fileURLToPath(new URL('../hooks/run.mjs', import.meta.url));
function fixture(t) {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'figma-guard-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const base = join(root, 'work/demo'); fillPipeline(base);
  const put = (p, v) => { mkdirSync(join(base, p, '..'), { recursive: true }); writeFileSync(join(base, p), typeof v === 'string' ? v : JSON.stringify(v)); };
  const run = (...a) => spawnSync(process.execPath, [cli, ...a, '--root', root, '--project', 'demo'], { encoding: 'utf8' });
  const invoke = (event, extra = {}) => {
    const r = spawnSync(process.execPath, [hook, event], { cwd: root, input: JSON.stringify({ cwd: root, hook_event_name: event, tool_name: 'mcp__codex_apps__figma__use_figma', tool_input: { fileKey: 'DemoFile' }, ...extra }), encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout);
  };
  const approve = () => { for (const s of [1, 4, 5]) assert.equal(run('approve', String(s), '--by', 'fixture human').status, 0); };
  return { root, base, put, run, invoke, approve };
}
test('lint:figma validates actual node data and check rejects stale or failed lint', t => {
  const f = fixture(t);
  let r = f.run('lint:figma', '--force', '--json'); assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(readFileSync(join(f.base, '06-figma/nodes.json')));
  data.nodes[0].children = [{ id: '2:1', type: 'TEXT', name: 'Bad copy', width: 80, height: 30, characters: '무조건 성공', fontSize: 13, fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] }];
  f.put('06-figma/nodes.json', data);
  r = f.run('check', '--json'); assert.match(r.stdout, /Stale.*figma/i);
  r = f.run('lint:figma', '--force', '--json'); assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /forbidden-copy/); assert.match(r.stdout, /font-size/); assert.match(r.stdout, /color/);
});
test('Figma writes require valid system approval and exact configured file', t => {
  const f = fixture(t);
  assert.equal(f.invoke('PreToolUse').hookSpecificOutput.permissionDecision, 'deny');
  f.approve();
  assert.equal(f.invoke('PreToolUse').hookSpecificOutput?.permissionDecision, undefined);
  for (const input of [{ fileKey: 'OtherFile' }, {}, { fileKey: 'DemoFile', file_key: 'OtherFile' }]) {
    assert.equal(f.invoke('PreToolUse', { tool_input: input }).hookSpecificOutput.permissionDecision, 'deny');
  }
  f.put('control/figma.json', { fileKey: 'OtherFile', pageId: '0:1' });
  assert.equal(f.invoke('PreToolUse', { tool_input: { fileKey: 'OtherFile' } }).hookSpecificOutput.permissionDecision, 'deny');
});
test('read-only tools pass; unknown Figma writes and file creation fail closed', t => {
  const f = fixture(t);
  assert.deepEqual(f.invoke('PreToolUse', { tool_name: 'mcp__figma__get_metadata', tool_input: {} }), {});
  assert.equal(f.invoke('PreToolUse', { tool_name: 'mcp__figma__create_new_file', tool_input: {} }).hookSpecificOutput.permissionDecision, 'deny');
  f.approve();
  assert.equal(f.invoke('PreToolUse', { tool_name: 'mcp__figma__future_write', tool_input: {} }).hookSpecificOutput.permissionDecision, 'deny');
});
test('post write prompts fresh node export and Stop runs check without approval loops', t => {
  const f = fixture(t);
  assert.match(f.invoke('PostToolUse').hookSpecificOutput.additionalContext, /nodes.json/);
  const stop = f.invoke('Stop'); assert.match(stop.systemMessage, /prd/); assert.equal(stop.decision, undefined);
  assert.equal(f.invoke('Stop', { stop_hook_active: true }).decision, undefined);
  f.approve();
  f.put('05-design-system/preview.svg', 'changed');
  assert.equal(f.invoke('PreToolUse').hookSpecificOutput.permissionDecision, 'deny');
});
test('missing target/export, wrong file, duplicate node IDs, incomplete map and symlinks fail', t => {
  const f = fixture(t);
  const original = readFileSync(join(f.base, '06-figma/nodes.json'), 'utf8');
  for (const data of [{}, { ...JSON.parse(original), fileKey: 'OtherFile' }, { ...JSON.parse(original), nodes: [] }, { ...JSON.parse(original), nodes: [...JSON.parse(original).nodes, ...JSON.parse(original).nodes] }]) {
    f.put('06-figma/nodes.json', data); assert.equal(f.run('lint:figma', '--force').status, 2);
  }
  f.put('06-figma/nodes.json', original);
  f.put('06-figma/node-map.json', { nodes: [{ screen: 'map', state: 'default', nodeId: '9:9' }] });
  assert.equal(f.run('lint:figma', '--force').status, 2);
});

test('hooks resolve subdirectories, reject ambiguity and malformed input, and accept target URLs', t => {
  const f = fixture(t); f.approve();
  const sub = join(f.root, 'src/deep'); mkdirSync(sub, { recursive: true });
  assert.deepEqual(f.invoke('PreToolUse', { cwd: sub, tool_input: { url: 'https://www.figma.com/design/DemoFile/Screen' } }), {});
  const second = join(f.root, 'work/second/control'); mkdirSync(second, { recursive: true }); writeFileSync(join(second, 'project.json'), '{}');
  assert.equal(f.invoke('PreToolUse').hookSpecificOutput.permissionDecision, 'deny');
  writeFileSync(join(f.root, '.design-harness.json'), JSON.stringify({ project: 'demo' }));
  assert.deepEqual(f.invoke('PreToolUse'), {});
  writeFileSync(join(f.root, '.design-harness.json'), '{');
  assert.equal(f.invoke('PreToolUse').hookSpecificOutput.permissionDecision, 'deny');
  const malformed = spawnSync(process.execPath, [hook, 'PreToolUse'], { input: '{', encoding: 'utf8' });
  assert.equal(malformed.status, 0); assert.equal(JSON.parse(malformed.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('project discovery ignores regular work files without bypassing target checks', t => {
  const f = fixture(t); f.approve();
  writeFileSync(join(f.root, 'work/.DS_Store'), 'Finder metadata');
  writeFileSync(join(f.root, 'work/README.md'), 'Workspace notes');
  assert.deepEqual(f.invoke('PreToolUse'), {});
  assert.equal(f.invoke('PreToolUse', { tool_input: { fileKey: 'OtherFile' } }).hookSpecificOutput.permissionDecision, 'deny');
  assert.match(f.invoke('Stop').systemMessage, /design-harness check/);
});

test('lint flags layout, components, touch targets and refuses symlink exports', async t => {
  const f = fixture(t), data = JSON.parse(readFileSync(join(f.base, '06-figma/nodes.json')));
  Object.assign(data.nodes[0], { name: 'Button', width: 20, height: 20, layoutMode: 'NONE', componentName: 'missing' });
  f.put('06-figma/nodes.json', data);
  const result = f.run('lint:figma', '--force', '--json'); assert.equal(result.status, 1, result.stderr);
  const rules = JSON.parse(result.stdout).issues.map(i => i.rule);
  for (const rule of ['auto-layout', 'component', 'touch-target']) assert.ok(rules.includes(rule));
  const { symlinkSync } = await import('node:fs');
  rmSync(join(f.base, '06-figma/nodes.json'));
  const outside = join(f.root, 'outside.json'); writeFileSync(outside, JSON.stringify(data));
  symlinkSync(outside, join(f.base, '06-figma/nodes.json'));
  assert.equal(f.run('lint:figma', '--force').status, 2);
});

test('Figma contracts reject numeric file keys and non-string export timestamps', t => {
  const f = fixture(t), original = JSON.parse(readFileSync(join(f.base, '06-figma/nodes.json')));
  f.put('control/figma.json', { fileKey: 123, pageId: '0:1' });
  f.put('06-figma/nodes.json', { ...original, fileKey: 123 });
  assert.equal(f.run('lint:figma', '--force').status, 2);
  f.put('control/figma.json', { fileKey: 'DemoFile', pageId: '0:1' });
  f.put('06-figma/nodes.json', { ...original, exportedAt: 1 });
  assert.equal(f.run('lint:figma', '--force').status, 2);
});

test('bridge read-only operations remain readable before design approval', t => {
  const f = fixture(t);
  for (const operation of ['list_files', 'get_document', 'get_node', 'get_selection', 'get_styles', 'get_motion_styles', 'get_node_motion', 'save_screenshots']) {
    for (const event of ['PreToolUse', 'PostToolUse']) assert.deepEqual(f.invoke(event, { tool_name: `mcp__figma_agent_mcp__${operation}`, tool_input: {} }), {}, operation);
  }
});

test('IMAGE fills require manifest-backed exact PNG provenance and preserved proportions', t => {
  const f = fixture(t), bytes = png(96, 48), asset = 'assets/brand.png', imageHash = 'a'.repeat(40);
  mkdirSync(join(f.base, '05-design-system/assets'), { recursive: true });
  writeFileSync(join(f.base, '05-design-system', asset), bytes);
  f.put('05-design-system/assets-manifest.json', { files: [{ path: asset, bytes: bytes.length, sha256: digest(bytes), dimensions: { width: 96, height: 48 } }] });
  const data = JSON.parse(readFileSync(join(f.base, '06-figma/nodes.json')));
  data.nodes[0].children = [{ id: '2:1', type: 'RECTANGLE', name: 'Official artwork', width: 96, height: 48, fills: [{ type: 'IMAGE', imageHash, scaleMode: 'FILL' }] }];
  f.put('06-figma/nodes.json', data);
  const map = { nodes: [{ screen: 'map', state: 'default', nodeId: '1:1' }], images: [{ nodeId: '2:1', fillIndex: 0, asset, imageHash }] };
  f.put('06-figma/node-map.json', map);
  let result = f.run('lint:figma', '--force', '--json'); assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.ok(Object.hasOwn(JSON.parse(result.stdout).inputs, '05-design-system/assets/brand.png'));
  data.nodes[0].children[0].fills = [{
    type: 'IMAGE', imageHash, scaleMode: 'FIT', opacity: 1, rotation: 0,
    filters: { contrast: 0, saturation: 0 }, scalingFactor: 1,
    imageTransform: [[1, 0, 0], [0, 1, 0]],
  }];
  f.put('06-figma/nodes.json', data);
  result = f.run('lint:figma', '--force', '--json');
  assert.equal(result.status, 0, 'native FIT export with identity transform: ' + result.stdout + result.stderr);
  for (const patch of [
    { imageHash: 'b'.repeat(40) }, { scaleMode: 'CROP', imageTransform: [[1, 0, 0], [0, 1, 0]] },
    { opacity: .5 }, { rotation: 20 }, { filters: { contrast: .2 } },
    { imageTransform: [[1, 0, .01], [0, 1, 0]] },
    { imageTransform: [[.9, 0, 0], [0, 1, 0]] }, { imageTransform: null },
  ]) {
    data.nodes[0].children[0].fills = [{ type: 'IMAGE', imageHash, scaleMode: 'FILL', ...patch }];
    f.put('06-figma/nodes.json', data); result = f.run('lint:figma', '--force', '--json'); assert.notEqual(result.status, 0, JSON.stringify(patch));
  }
  data.nodes[0].children[0].fills = [{ type: 'IMAGE', imageHash, scaleMode: 'FILL' }];
  for (const target of [data.nodes[0], data.nodes[0].children[0]]) {
    target.rotation = 30; f.put('06-figma/nodes.json', data);
    assert.notEqual(f.run('lint:figma', '--force').status, 0, 'node/ancestor rotation');
    delete target.rotation;
  }
  data.nodes[0].children[0].width = 80;
  f.put('06-figma/nodes.json', data); assert.notEqual(f.run('lint:figma', '--force').status, 0);
  data.nodes[0].children[0].width = 96; f.put('06-figma/nodes.json', data);
  for (const badAsset of ['../outside.png', 'assets/unregistered.png']) {
    f.put('06-figma/node-map.json', { ...map, images: [{ ...map.images[0], asset: badAsset }] });
    assert.notEqual(f.run('lint:figma', '--force').status, 0);
  }
  for (const images of [[], [{ ...map.images[0], nodeId: '9:9' }], [map.images[0], map.images[0]]]) {
    f.put('06-figma/node-map.json', { ...map, images });
    assert.notEqual(f.run('lint:figma', '--force').status, 0);
  }
  f.put('06-figma/node-map.json', map);
  data.nodes[0].opacity = .5; f.put('06-figma/nodes.json', data);
  assert.notEqual(f.run('lint:figma', '--force').status, 0);
  delete data.nodes[0].opacity; f.put('06-figma/nodes.json', data);
  writeFileSync(join(f.base, '05-design-system', asset), png(95, 48));
  assert.notEqual(f.run('lint:figma', '--force').status, 0);
});

test('native instance descendant IDs retain image provenance and duplicate checks', t => {
  const f = fixture(t), bytes = png(96, 48), asset = 'assets/brand.png', imageHash = 'a'.repeat(40);
  mkdirSync(join(f.base, '05-design-system/assets'), { recursive: true });
  writeFileSync(join(f.base, '05-design-system', asset), bytes);
  f.put('05-design-system/assets-manifest.json', { files: [{ path: asset, bytes: bytes.length, sha256: digest(bytes), dimensions: { width: 96, height: 48 } }] });
  const data = JSON.parse(readFileSync(join(f.base, '06-figma/nodes.json')));
  const artwork = { id: 'I71:5;70:31', type: 'RECTANGLE', name: 'Official artwork', width: 96, height: 48, fills: [{ type: 'IMAGE', imageHash, scaleMode: 'FILL' }] };
  data.nodes[0].children = [artwork];
  const map = { nodes: [{ screen: 'map', state: 'default', nodeId: '1:1' }], images: [{ nodeId: artwork.id, fillIndex: 0, asset, imageHash }] };
  f.put('06-figma/nodes.json', data); f.put('06-figma/node-map.json', map);
  let result = f.run('lint:figma', '--force', '--json');
  assert.equal(result.status, 0, result.stderr + result.stdout);
  data.nodes[0].children.push({ ...artwork }); f.put('06-figma/nodes.json', data);
  assert.equal(f.run('lint:figma', '--force').status, 2, 'duplicate IDs still rejected');
  data.nodes[0].children = [artwork]; artwork.fills[0].imageHash = 'b'.repeat(40); f.put('06-figma/nodes.json', data);
  assert.notEqual(f.run('lint:figma', '--force').status, 0, 'image provenance still enforced');
  for (const id of ['I71:5', '71:5;70:31', 'I71:5;', 'I71:5;invalid', 123]) {
    artwork.id = id; f.put('06-figma/nodes.json', data);
    assert.equal(f.run('lint:figma', '--force').status, 2, 'malformed IDs still rejected');
  }
});

 test('image geometry checks reject relative distortion and invalid opacity lineage', t => {
  const f = fixture(t), bytes = png(1, 1000), imageHash = 'a'.repeat(40);
  mkdirSync(join(f.base, '05-design-system/assets'), { recursive: true });
  writeFileSync(join(f.base, '05-design-system/assets/portrait.png'), bytes);
  f.put('05-design-system/assets-manifest.json', { files: [{ path: 'assets/portrait.png', bytes: bytes.length, sha256: digest(bytes), dimensions: { width: 1, height: 1000 } }] });
  const data = JSON.parse(readFileSync(join(f.base, '06-figma/nodes.json')));
  data.nodes[0].children = [{ id: '2:1', type: 'RECTANGLE', name: 'Portrait', width: 2, height: 1000, fills: [{ type: 'IMAGE', imageHash, scaleMode: 'FIT' }] }];
  f.put('06-figma/node-map.json', { nodes: [{ screen: 'map', state: 'default', nodeId: '1:1' }], images: [{ nodeId: '2:1', fillIndex: 0, asset: 'assets/portrait.png', imageHash }] });
  f.put('06-figma/nodes.json', data); assert.notEqual(f.run('lint:figma', '--force').status, 0, '100% distortion');
  data.nodes[0].children[0].width = 1; f.put('06-figma/nodes.json', data); assert.equal(f.run('lint:figma', '--force').status, 0, 'valid FIT');
  data.nodes[0].opacity = .5; data.nodes[0].children[0].opacity = 2; f.put('06-figma/nodes.json', data);
  assert.notEqual(f.run('lint:figma', '--force').status, 0, 'compensating invalid opacity');
});

test('official Mapbox SVG needs pinned bytes and exact scoped fills, strokes and opacity', t => {
  const f = fixture(t), asset = 'assets/mapbox-logo.svg', assetPath = '05-design-system/' + asset;
  const svg = readFileSync(new URL('./assets/mapbox-logo.svg', import.meta.url), 'utf8');
  const manifest = { files: [{ file: asset, bytes: Buffer.byteLength(svg), sha256: digest(svg) }] };
  f.put(assetPath, svg);
  f.put('05-design-system/assets-manifest.json', manifest);
  const data = JSON.parse(readFileSync(join(f.base, '06-figma/nodes.json')));
  const paint = (gray) => ({ type: 'SOLID', color: { r: gray, g: gray, b: gray } });
  const logo = JSON.parse(readFileSync(new URL('./assets/mapbox-logo-node.json', import.meta.url), 'utf8'));
  const [outline, foreground] = logo.children[0].children;
  const withStroke = outline.children[0].children.find(node => node.strokes?.length);
  data.nodes[0].children = [logo];
  const map = { nodes: [{ screen: 'map', state: 'default', nodeId: '1:1' }], svgAssets: [{ nodeId: logo.id, asset }] };
  f.put('06-figma/node-map.json', map);
  const lint = () => {
    f.put('06-figma/nodes.json', data);
    return f.run('lint:figma', '--force', '--json');
  };
  const ok = lint();
  assert.equal(ok.status, 0, ok.stderr + ok.stdout);
  const report = JSON.parse(ok.stdout);
  assert.equal(report.inputs[assetPath], manifest.files[0].sha256);
  assert.equal(report.svgAssets[0].paintCount, 12);
  assert.ok(report.inputs['05-design-system/assets-manifest.json']);

  data.nodes[0].children.push({ id: '2:99', type: 'VECTOR', name: 'UI', width: 24, height: 24, fills: [paint(0)] });
  assert.deepEqual(JSON.parse(lint().stdout).issues.map(({ rule }) => rule), ['color']);
  data.nodes[0].children.pop();

  const expectMismatch = (target, field, replacement) => {
    const previous = target[field];
    target[field] = replacement;
    const result = lint();
    assert.equal(result.status, 1, result.stderr + result.stdout);
    assert.ok(JSON.parse(result.stdout).issues.some(({ rule }) => rule === 'svg-provenance'));
    if (previous === undefined) delete target[field];
    else target[field] = previous;
  };
  expectMismatch(foreground.children[0], 'fills', [paint(0)]);
  expectMismatch(withStroke, 'strokes', [paint(1)]);
  expectMismatch(foreground.children[0], 'strokes', undefined);
  expectMismatch(foreground.children[0], 'vectorPaths', [{ windingRule: 'NONZERO', data: 'M 0 0 H 5 V 5 Z' }]);
  expectMismatch(foreground.children[0], 'blendMode', 'MULTIPLY');
  expectMismatch(outline, 'opacity', .3004);
  expectMismatch(foreground.children[1], 'visible', false);
  expectMismatch(logo, 'width', 100);
  expectMismatch(logo, 'rotation', 15);
  expectMismatch(logo, 'children', [...logo.children, { id: '2:98', type: 'TEXT', name: 'UI', width: 20, height: 20, characters: 'UI', fontSize: 14, fills: [] }]);

  f.put(assetPath, svg + '\n');
  assert.equal(lint().status, 2);
  f.put('05-design-system/assets-manifest.json', { files: [{ file: asset, bytes: Buffer.byteLength(svg + '\n'), sha256: digest(svg + '\n') }] });
  assert.match(lint().stderr, /Unsupported official SVG/);
  f.put(assetPath, svg);
  f.put('05-design-system/assets-manifest.json', manifest);
  const pngAsset = 'assets/brand.png', pngBytes = png(96, 48), imageHash = 'a'.repeat(40);
  writeFileSync(join(f.base, '05-design-system', pngAsset), pngBytes);
  const mixedManifest = { files: [...manifest.files, { path: pngAsset, bytes: pngBytes.length, sha256: digest(pngBytes), dimensions: { width: 96, height: 48 } }] };
  f.put('05-design-system/assets-manifest.json', mixedManifest);
  data.nodes[0].children.push({ id: '2:97', type: 'RECTANGLE', name: 'PNG', width: 96, height: 48, fills: [{ type: 'IMAGE', imageHash, scaleMode: 'FIT' }] });
  f.put('06-figma/node-map.json', { ...map, images: [{ nodeId: '2:97', fillIndex: 0, asset: pngAsset, imageHash }] });
  assert.equal(lint().status, 0);
  data.nodes[0].children.pop();
  f.put('05-design-system/assets-manifest.json', manifest);
  for (const svgAssets of [
    [map.svgAssets[0], map.svgAssets[0]],
    [{ nodeId: '99:99', asset }],
    [{ nodeId: logo.id, asset: 'assets/../mapbox-logo.svg' }],
    [map.svgAssets[0], { nodeId: foreground.id, asset }],
  ]) {
    f.put('06-figma/node-map.json', { ...map, svgAssets });
    assert.equal(lint().status, 2);
  }
});
