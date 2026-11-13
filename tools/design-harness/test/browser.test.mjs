import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, realpathSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { browserPath } from '../browser.mjs';
import { fillPipeline } from './fixtures.mjs';
const cli = fileURLToPath(new URL('../bin/design-harness', import.meta.url));
let browser;
try { browser = browserPath(process.env.DESIGN_HARNESS_BROWSER); } catch {}
const goodCSS = 'body{margin:16px;color:#111827;background:#fff;font:14px sans-serif}h1{font-size:20px}button{border:0;min-width:44px;height:44px;font-size:14px;background:#15803d;color:#fff}';

test('real browser captures refs and SVG, lints cascade/viewport/copy, then hands off approved versions', { skip: !browser && 'Install Chromium to run browser integration', timeout: 120000 }, async t => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'harness-browser-'));
  const base = join(root, 'work/demo');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  fillPipeline(base);
  const put = (path, value) => { mkdirSync(join(base, path, '..'), { recursive: true }); writeFileSync(join(base, path), typeof value === 'string' ? value : JSON.stringify(value)); };
  const read = path => readFileSync(join(base, path), 'utf8');
  async function run(...args) {
    return await new Promise((resolve, reject) => {
      const browserArgs = ['refs:capture', 'wireframe', 'lint:web'].includes(args[0]) ? ['--browser', browser] : [];
      const child = spawn(process.execPath, [cli, ...args, ...browserArgs, '--root', root, '--project', 'demo']);
      let stdout = '', stderr = '';
      child.stdout.on('data', b => { stdout += b; }); child.stderr.on('data', b => { stderr += b; });
      child.on('error', reject); child.on('exit', status => resolve({ status, stdout, stderr }));
    });
  }
  async function success(...args) { const result = await run(...args); assert.equal(result.status, 0, result.stderr || result.stdout); return result; }
  const server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<h1>레퍼런스 지도</h1><p>곤충 관찰</p>'); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/`;
  put('02-research/refs.json', { references: [{ id: 'maps', url, viewport: { width: 390, height: 844 } }] });
  const refs = JSON.parse((await success('refs:capture', '--force', '--json')).stdout);
  assert.equal(refs.references[0].finalUrl, url);
  assert.equal(readFileSync(join(base, '02-research/captures/maps.png')).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  put('04-wireframes/wireframes.json', { screens: [{ id: 'map', state: 'default', title: '지도', width: 390, height: 844,
    blocks: [{ type: 'text', x: 16, y: 24, width: 358, height: 40, text: '발견 지도 < & >' },
      { type: 'image', x: 16, y: 80, width: 358, height: 560, text: '지도 영역' },
      { type: 'button', x: 214, y: 720, width: 160, height: 48, text: '발견 기록하기' }] }] });
  await success('wireframe', '--force');
  assert.ok(read('04-wireframes/map/default.svg').includes('&lt; &amp; &gt;'));
  await success('design-md', '--force');
  put('control/project.json', { id: 'demo', viewports: [{ width: 390, height: 844 }, { width: 1024, height: 768 }] });
  put('06-figma/web/style.css', goodCSS);
  put('06-figma/web/index.html', '<!doctype html><html lang="ko"><meta charset="utf-8"><link rel="stylesheet" href="style.css"><h1>발견 지도</h1><p>곤충 관찰</p><button id="save">기록 저장</button></html>');
  // 승인 캡처가 없으면 시각 비교를 건너뛰지 않고 실패한다. 디자인 시스템 캡처로 기준을 만든 뒤 다시 검사한다.
  const missing = await run('lint:web', '--force', '--json');
  assert.equal(missing.status, 1);
  const first = JSON.parse(missing.stdout);
  assert.ok(first.runs.every(r => r.issues.length === 1 && r.issues[0].code === 'visual-baseline-missing'), missing.stdout);
  for (const r of first.runs) copyFileSync(join(base, r.capture), join(base, r.visual.reference));
  const clean = JSON.parse((await success('lint:web', '--force', '--json')).stdout);
  assert.equal(clean.runs.length, 2);
  assert.ok(clean.runs.every(run => run.issues.length === 0));
  // Mutating external CSS, not only inline styles, must affect actual computed lint.
  put('06-figma/web/style.css', `${goodCSS}button{height:40px;color:red;font-size:17px}`);
  put('06-figma/web/index.html', '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="style.css"><p>정확도 <strong>98%</strong></p><button id="save" aria-label="무조건 성공">저장</button><span style="display:none;color:red">hidden</span></html>');
  const bad = await run('lint:web', '--force', '--json');
  assert.equal(bad.status, 1, bad.stderr);
  const codes = new Set(JSON.parse(bad.stdout).runs.flatMap(r => r.issues.map(i => i.code)));
  for (const code of ['color', 'font-size', 'touch-target', 'forbidden-copy']) assert.ok(codes.has(code), `${code}: ${bad.stdout}`);
  // Responsive and pseudo-element violations must be checked at every configured size.
  put('06-figma/web/style.css', `${goodCSS}button::after{content:"무조건 성공";font-size:17px;color:red}@media(min-width:800px){button{height:40px}}`);
  put('06-figma/web/index.html', '<!doctype html><link rel="stylesheet" href="style.css"><button>저장</button>');
  const responsive = JSON.parse((await run('lint:web', '--force', '--json')).stdout);
  assert.ok(responsive.runs[0].issues.some(i => i.selector.endsWith('::after') && i.code === 'forbidden-copy'));
  assert.equal(responsive.runs[0].issues.some(i => i.code === 'touch-target'), false);
  assert.ok(responsive.runs[1].issues.some(i => i.code === 'touch-target'));
  put('06-figma/web/style.css', `${goodCSS}#visible{visibility:visible;min-width:0;width:30px;height:30px;color:red;font-size:17px}`);
  put('06-figma/web/index.html', '<!doctype html><link rel="stylesheet" href="style.css"><div style="visibility:hidden"><button id="visible">저장</button></div>');
  const overridden = await run('lint:web', '--force', '--json');
  const visibleIssues = JSON.parse(overridden.stdout).runs[0].issues.filter(i => i.selector === 'button#visible');
  for (const code of ['color', 'font-size', 'touch-target']) assert.ok(visibleIssues.some(i => i.code === code), `visibility override missed ${code}`);
  put('06-figma/web/style.css', goodCSS);
  put('06-figma/web/index.html', '<!doctype html><html lang="ko"><meta charset="utf-8"><link rel="stylesheet" href="style.css"><h1>발견 지도</h1><p>곤충 관찰</p><button id="save">기록 저장</button></html>');
  await success('lint:web', '--force');
  await success('lint:figma', '--force');
  await success('review', 'validation', '--by', '수진', '--score', '4', '--notes', '모바일·데스크톱 검토');
  for (const stage of ['1', '4', '5', '7']) await success('approve', stage, '--by', '수진');
  await success('handoff');
  const handoff = read('08-handoff/HANDOFF.md');
  assert.ok(handoff.includes('Implementation notes')); assert.ok(handoff.includes('05-design-system/DESIGN.md'));
  await success('approve', '8', '--by', '수진');
  assert.equal(JSON.parse((await success('check', '--json')).stdout).complete, true);
  {
    const qaDir = process.env.DESIGN_HARNESS_QA_DIR ?? join(realpathSync(tmpdir()), 'bugmap-design-harness-qa');
    mkdirSync(join(qaDir, 'web'), { recursive: true });
    copyFileSync(join(base, '06-figma/web/index.html'), join(qaDir, 'web/index.html'));
    copyFileSync(join(base, '06-figma/web/style.css'), join(qaDir, 'web/style.css'));
    for (const [source, target] of [['04-wireframes/captures/map/default.png', 'wireframe.png'], ['04-wireframes/map/default.svg', 'wireframe.svg'], [clean.runs[0].capture, 'web-mobile.png'], ['05-design-system/DESIGN.md', 'DESIGN.md'], ['08-handoff/HANDOFF.md', 'HANDOFF.md']]) copyFileSync(join(base, source), join(qaDir, target));
  }
  put('06-figma/web/style.css', `${goodCSS}p{color:red}`);
  const stale = JSON.parse((await run('check', '--json')).stdout);
  assert.equal(stale.stages[6].status, 'needs_revision');
  assert.ok(stale.stages[6].issues.some(issue => issue.includes('Stale')));
});

test('토큰 검사는 통과하지만 화면이 망가진 결함을 레이아웃 규칙과 승인 캡처 비교로 잡는다', { skip: !browser && 'Install Chromium to run browser integration', timeout: 120000 }, async t => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'harness-layout-'));
  const base = join(root, 'work/demo');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  fillPipeline(base);
  const put = (path, value) => { mkdirSync(join(base, path, '..'), { recursive: true }); writeFileSync(join(base, path), value); };
  const lint = async () => await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'lint:web', '--force', '--json', '--browser', browser, '--root', root, '--project', 'demo']);
    let stdout = '';
    child.stdout.on('data', b => { stdout += b; });
    child.on('error', reject); child.on('exit', status => resolve({ status, report: JSON.parse(stdout || '{"runs":[]}') }));
  });
  const codes = report => new Set(report.runs.flatMap(r => r.issues.map(i => i.code)));
  const css = `${goodCSS}main{background:#fff}.actions{display:flex;gap:12px}`;
  const html = '<!doctype html><html lang="ko"><meta charset="utf-8"><link rel="stylesheet" href="style.css"><main><h1>발견 지도</h1><p>곤충 관찰</p><div class="actions"><button id="save">기록 저장</button><button id="skip">나중에</button></div></main></html>';
  put('06-figma/web/style.css', css); put('06-figma/web/index.html', html);
  const first = await lint();
  for (const r of first.report.runs) copyFileSync(join(base, r.capture), join(base, r.visual.reference));
  const clean = await lint();
  assert.equal(clean.status, 0, JSON.stringify(clean.report.runs.map(r => r.issues)));
  // 모두 토큰 색·토큰 글자 크기·44px 버튼을 유지한 채 화면만 망가뜨린다.
  const cases = [
    ['버튼 숨김', `${css}#skip{display:none}`, 'visual-diff'],
    ['버튼 순서 뒤집기', `${css}.actions{flex-direction:row-reverse}`, 'visual-diff'],
    ['제목과 본문 겹침', `${css}p{margin-top:-40px}`, 'overlap'],
    ['제목 잘림', `${css}h1{width:40px;white-space:nowrap;overflow:hidden}`, 'text-clipped'],
    ['흰 배경에 흰 글자(토큰색)', `${css}p{color:#ffffff}`, 'contrast'],
  ];
  for (const [name, mutated, expected] of cases) {
    put('06-figma/web/style.css', mutated);
    const result = await lint();
    assert.equal(result.status, 1, name);
    const found = codes(result.report);
    assert.ok(found.has(expected), `${name}: ${[...found]}`);
    for (const tokenCode of ['color', 'font-size', 'touch-target']) assert.equal(found.has(tokenCode), false, `${name}는 기존 토큰 규칙으로는 드러나지 않아야 한다`);
  }
});
