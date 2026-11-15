import test from 'node:test';
import assert from 'node:assert/strict';
import { realpathSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const cli = fileURLToPath(new URL('../bin/design-harness', import.meta.url));
function setup(t) {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'harness-stages-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const base = join(root, 'work/demo');
  const put = (path, data) => { mkdirSync(join(base, path, '..'), { recursive: true }); writeFileSync(join(base, path), typeof data === 'string' ? data : JSON.stringify(data)); };
  const run = (...args) => spawnSync(process.execPath, [cli, ...args, '--root', root, '--project', 'demo'], { encoding: 'utf8' });
  const read = path => readFileSync(join(base, path), 'utf8');
  put('README.md', 'Demo'); put('control/project.json', { id: 'demo' }); put('control/decisions.md', 'Decisions');
  return { root, base, put, run, read };
}
const tokens = { colors: { text: '#111827', primary: '#15803d', surface: '#ffffff' }, fontSizes: { body: 14, heading: 20 } };
const components = { button: { description: 'Primary button', tokens: ['colors.primary', 'fontSizes.body'], states: ['default', 'disabled'] } };
const copy = { strings: { save: '기록 저장' }, forbidden: ['정확도 98%', '무조건 성공'] };

test('design-md derives document from all three JSON inputs and refuses implicit overwrite', t => {
  const f = setup(t);
  f.put('05-design-system/tokens.json', tokens); f.put('05-design-system/components.json', components); f.put('05-design-system/copy.json', copy);
  const result = f.run('design-md');
  assert.equal(result.status, 0, result.stderr);
  const md = f.read('05-design-system/DESIGN.md');
  for (const expected of ['#15803d', 'Primary button', '기록 저장', '정확도 98%']) assert.ok(md.includes(expected));
  assert.equal(f.run('design-md').status, 2);
  assert.equal(f.read('05-design-system/DESIGN.md'), md);
  f.put('05-design-system/copy.json', { ...copy, strings: { save: '관찰 저장' } });
  assert.equal(f.run('design-md', '--force').status, 0);
  assert.ok(f.read('05-design-system/DESIGN.md').includes('관찰 저장'));
  f.put('05-design-system/components.json', { button: { ...components.button, tokens: ['colors.missing'] } });
  assert.equal(f.run('design-md', '--force').status, 2);
});

test('review preserves author, score and input version and never approves automatically', t => {
  const f = setup(t); f.put('04-wireframes/review.md', 'Look at layout');
  const result = f.run('review', 'wireframes', '--by', '수진', '--score', '4', '--notes', '구조 확인');
  assert.equal(result.status, 0, result.stderr);
  const entry = JSON.parse(f.read('04-wireframes/reviews.json')).reviews[0];
  assert.equal(entry.by, '수진'); assert.equal(entry.score, 4); assert.equal(entry.notes, '구조 확인');
  assert.match(entry.files['04-wireframes/review.md'], /^[a-f0-9]{64}$/);
  assert.equal(existsSync(join(f.base, 'control/approvals.json')), false);
  assert.equal(f.run('review', '4', '--by', '수진', '--score', '6', '--notes', 'x').status, 2);
});

test('handoff cannot bypass preceding validation and approvals', t => {
  const f = setup(t);
  const result = f.run('handoff');
  assert.equal(result.status, 2);
  assert.equal(existsSync(join(f.base, '08-handoff/HANDOFF.md')), false);
});

test('wireframe rejects duplicate screen states and out-of-bounds blocks before writing', t => {
  const f = setup(t);
  const screen = { id: 'map', state: 'default', title: '지도', width: 390, height: 844, blocks: [{ type: 'button', x: 380, y: 20, width: 100, height: 48, text: '저장' }] };
  f.put('04-wireframes/wireframes.json', { screens: [screen] });
  const invalid = f.run('wireframe');
  assert.equal(invalid.status, 2); assert.match(invalid.stderr, /bounds/);
  assert.equal(existsSync(join(f.base, '04-wireframes/map/default.svg')), false);
  f.put('04-wireframes/wireframes.json', { screens: [{ ...screen, blocks: [] }, { ...screen, blocks: [] }] });
  assert.match(f.run('wireframe').stderr, /Duplicate/);
});

test('check rejects stale capture and design evidence instead of accepting existing files', async t => {
  const { fillPipeline } = await import('./fixtures.mjs');
  const f = setup(t); fillPipeline(f.base);
  f.put('02-research/refs.json', { references: [{ id: 'maps', url: 'https://example.org/', viewport: { width: 390, height: 844 } }] });
  let report = JSON.parse(f.run('check', '--json').stdout);
  assert.ok(report.stages[1].issues.some(issue => issue.includes('Stale')));
  f.put('05-design-system/tokens.json', { ...tokens, colors: { ...tokens.colors, text: '#000000' } });
  report = JSON.parse(f.run('check', '--json').stdout);
  assert.ok(report.stages[4].issues.some(issue => issue.includes('Stale')));
});

test('web lint failures and changed CSS cannot be bypassed by approval', async t => {
  const { fillPipeline } = await import('./fixtures.mjs');
  const f = setup(t); fillPipeline(f.base);
  for (const stage of ['1', '4', '5']) assert.equal(f.run('approve', stage, '--by', '수진').status, 0);
  const lint = JSON.parse(f.read('07-validation/web-lint.json'));
  lint.runs[0].issues.push({ code: 'color', selector: 'button', value: 'red' });
  f.put('07-validation/web-lint.json', lint);
  assert.ok(JSON.parse(f.run('check', '--json').stdout).stages[6].issues.some(issue => issue.includes('Web lint failed')));
  assert.equal(f.run('approve', '7', '--by', '수진').status, 2);
  f.put('06-figma/web/new.css', 'body{color:red}');
  assert.ok(JSON.parse(f.run('check', '--json').stdout).stages[6].issues.some(issue => issue.includes('Stale')));
});

test('validation requires a current human review meeting the configured score', async t => {
  const { fillPipeline } = await import('./fixtures.mjs');
  const f = setup(t); fillPipeline(f.base);
  assert.equal(f.run('review', '7', '--by', '수진', '--score', '3', '--notes', '가독성 수정 필요').status, 0);
  let report = JSON.parse(f.run('check', '--json').stdout);
  assert.ok(report.stages[6].issues.some(issue => issue.includes('below 4')));
  assert.equal(f.run('review', '7', '--by', '수진', '--score', '5', '--notes', '확인').status, 0);
  f.put('07-validation/report.md', 'changed after review');
  report = JSON.parse(f.run('check', '--json').stdout);
  assert.ok(report.stages[6].issues.some(issue => issue.includes('Stale human review')));
  f.put('07-validation/reviews.json', '{');
  const result = f.run('review', '7', '--by', '수진', '--score', '5', '--notes', '확인');
  assert.equal(result.status, 2); assert.equal(f.read('07-validation/reviews.json'), '{');
});

test('generated output paths refuse symlink escape without touching the destination', async t => {
  const { symlinkSync } = await import('node:fs');
  const f = setup(t);
  f.put('05-design-system/tokens.json', tokens); f.put('05-design-system/components.json', components); f.put('05-design-system/copy.json', copy);
  const outside = join(f.root, 'outside.md'); writeFileSync(outside, 'keep me');
  symlinkSync(outside, join(f.base, '05-design-system/DESIGN.md'));
  assert.equal(f.run('design-md', '--force').status, 2);
  assert.equal(readFileSync(outside, 'utf8'), 'keep me');
});

test('handoff records approvals and detects later implementation-note edits', async t => {
  const { fillPipeline } = await import('./fixtures.mjs');
  const f = setup(t); fillPipeline(f.base);
  for (const stage of ['1', '4', '5', '7']) assert.equal(f.run('approve', stage, '--by', '수진').status, 0);
  assert.equal(f.run('handoff').status, 0);
  const manifest = JSON.parse(f.read('08-handoff/manifest.json'));
  assert.deepEqual(Object.keys(manifest.approvals).sort(), ['design-system', 'prd', 'validation', 'wireframes']);
  assert.ok(f.read('08-handoff/HANDOFF.md').includes(manifest.approvals.validation));
  assert.equal(f.run('approve', '8', '--by', '수진').status, 0);
  f.put('08-handoff/implementation-notes.md', 'changed');
  const report = JSON.parse(f.run('check', '--json').stdout);
  assert.equal(report.stages[7].status, 'needs_revision');
  assert.ok(report.stages[7].issues.some(issue => issue.includes('Stale')));
});

test('screen ID captures is checked from JSON outputs rather than rejected by a folder heuristic', async t => {
  const { fillPipeline, png, digest } = await import('./fixtures.mjs');
  const { renderWireframe } = await import('../documents.mjs');
  const f = setup(t); fillPipeline(f.base);
  rmSync(join(f.base, '04-wireframes/map'), { recursive: true });
  const screen = { id: 'captures', state: 'default', title: '캡처 화면', width: 390, height: 844, blocks: [] };
  f.put('04-wireframes/wireframes.json', { screens: [screen] });
  const svg = renderWireframe(screen), image = png();
  f.put('04-wireframes/captures/default.svg', svg);
  mkdirSync(join(f.base, '04-wireframes/captures/captures'), { recursive: true });
  writeFileSync(join(f.base, '04-wireframes/captures/captures/default.png'), image);
  f.put('04-wireframes/wireframes-report.json', { version: 1, generator: 'design-harness', command: 'wireframe', at: new Date().toISOString(),
    inputs: { '04-wireframes/wireframes.json': digest(f.read('04-wireframes/wireframes.json')) },
    outputs: { '04-wireframes/captures/default.svg': digest(svg), '04-wireframes/captures/captures/default.png': digest(image) } });
  assert.equal(f.run('approve', '1', '--by', '수진').status, 0);
  const report = JSON.parse(f.run('check', '--json').stdout);
  assert.equal(report.stages[3].status, 'awaiting_approval');
});

test('줄바꿈(CRLF↔LF)만 바뀐 체크아웃은 승인을 유지하고 실제 내용 변경은 무효화한다', async t => {
  const { fillPipeline } = await import('./fixtures.mjs');
  const f = setup(t); fillPipeline(f.base);
  f.put('01-prd/PRD.md', '# PRD\r\n대상 사용자\r\n');
  assert.equal(f.run('approve', '1', '--by', '수진').status, 0);
  // Git이 커밋 시 LF로 정규화한 저장소를 새로 받은 상황
  f.put('01-prd/PRD.md', '# PRD\n대상 사용자\n');
  assert.equal(JSON.parse(f.run('check', '--json').stdout).stages[0].status, 'passed');
  f.put('01-prd/PRD.md', '# PRD\n다른 사용자\n');
  assert.equal(JSON.parse(f.run('check', '--json').stdout).stages[0].status, 'needs_revision');
});
