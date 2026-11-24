import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { basename, extname, resolve } from 'node:path';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
const project = 'bugmap-nickname-harness';
const { withBrowser } = await import(pathToFileURL(resolve(repo, 'tools/design-harness/browser.mjs')));
const { inspectWeb } = await import(pathToFileURL(resolve(repo, 'tools/design-harness/web-rules.mjs')));
const local = (path) => new URL(path, import.meta.url);
const read = (path) => readFileSync(local(path));
const save = (path, value) => writeFileSync(local(path), value);
const json = (path) => JSON.parse(read(path));
const { colors, typography, layout } = json('tokens.json');
const { strings, forbidden } = json('copy.json');
const sourceWireframe = readFileSync(resolve(repo, 'work', project, '04-wireframes/wireframes.json'));
const { screens } = JSON.parse(sourceWireframe);
const states = ['initial', 'ready', 'invalid'];
const approvedLayouts = Object.fromEntries(layout.viewportWidths.map((width) => {
  const statesAtWidth = screens.filter((screen) => screen.width === width);
  if (statesAtWidth.length !== states.length) throw new Error('Approval reference lacks the three target states');
  const [first, ...other] = statesAtWidth;
  const coords = (screen) => Object.fromEntries(screen.blocks.map(({ id, x, y, width, height }) => [id, { x, y, width, height }]));
  const geometry = coords(first);
  if (other.some((screen) => JSON.stringify(coords(screen)) !== JSON.stringify(geometry))) throw new Error('Approved state layouts differ');
  return [width, { width, height: first.height, safeArea: first.safeArea, blocks: geometry }];
}));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const saveJSON = (name, value) => save(name, JSON.stringify(value, null, 2) + '\n');
const esc = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const type = (role) => {
  const { fontSize, fontWeight, lineHeight } = typography[role];
  return `font-size:${fontSize}px;font-weight:${fontWeight};line-height:${lineHeight}px`;
};
function layoutCss(screen) {
  const blockCss = Object.entries(screen.blocks).map(([id, { x, y, width, height }]) =>
    `#${id}{left:${x}px;top:${y}px;width:${width}px;height:${height}px}`).join('\n');
  return `.screen{width:${screen.width}px;height:${screen.height}px}\n${blockCss}\n`;
}
const style = `
@font-face{font-family:Pretendard;src:url('../assets/Pretendard-Medium.woff2') format('woff2');font-weight:500;font-display:block}
@font-face{font-family:Pretendard;src:url('../assets/Pretendard-Bold.woff2') format('woff2');font-weight:700;font-display:block}
:root{${Object.entries(colors).map(([key, value]) => `--${key}:${value}`).join(';')}}
*{box-sizing:border-box} body,h1,p{margin:0}
body,.screen{background-color:var(--background);color:var(--text);font-family:Pretendard,sans-serif}
.screen{position:relative;overflow:hidden}
.block{position:absolute;margin:0}
#status-bar{display:flex;align-items:center;justify-content:space-between;padding:0 11px;${type('system')}}
.status-icons{display:block;width:69px;height:16px}
#brand-visual{background-color:var(--brandSurface);border:1px solid var(--brandBorder);border-radius:${layout.brandRadius}px;overflow:hidden;display:flex;align-items:center}
#brand-visual img{width:103px;height:auto;position:relative;left:17px}
.topography{position:absolute;right:0;top:0;width:70%;height:100%}
#title{display:flex;align-items:center;letter-spacing:-0.55px;${type('title')}}
#description{display:flex;align-items:center;color:var(--textSecondary);${type('description')}}
#field-label{display:flex;align-items:center;${type('fieldLabel')}}
#nickname{display:block;background:var(--field);color:var(--text);border:1px solid var(--fieldBorder);border-radius:${layout.fieldRadius}px;padding:0 ${layout.fieldPadding - 1}px;outline:0;${type('fieldValue')}}
#nickname::placeholder{color:var(--textPlaceholder);opacity:1;${type('fieldValue')}}
.screen[data-state=initial] #nickname{border:2px solid var(--accent);padding:0 ${layout.fieldPadding - 2}px 0 ${layout.fieldPadding + 1}px}
.screen[data-state=invalid] #nickname{border:2px solid var(--error);padding:0 ${layout.fieldPadding - 2}px}
.caret{position:absolute;background-color:var(--accent);height:21px;width:2px;border-radius:1px;top:calc(var(--input-y) + 15px);left:33px}
#helper{display:flex;align-items:center;gap:6px;color:var(--textPlaceholder);${type('helper')}}
.screen[data-state=invalid] #helper{color:var(--error)}
#start{display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:${layout.buttonRadius}px;background-color:var(--accent);color:var(--onAccent);${type('button')}}
#start:disabled{background-color:var(--disabledSurface);color:var(--disabledText);border:1px solid var(--disabledBorder)}
#keyboard{padding:15px 8px 0;border:1px solid var(--keyboardRim);border-bottom:0;border-radius:22px 22px 0 0;background:var(--keyboardBase)}
.keyrow{display:flex;gap:5px;margin-bottom:8px;justify-content:center}
.keyrow:nth-child(2){padding:0 15px}
.keyrow:nth-child(3){padding:0 2px}
.key{flex:1;height:44px;display:flex;align-items:center;justify-content:center;background:var(--keyboardKey);border-radius:8px;color:var(--text);${type('key')}}
.key.alt{flex:1.35;background:var(--keyboardAlt);${type('keyAction')}}
.key.space{flex:4}
.key.done{flex:1.8;background:var(--keyboardAlt);${type('keyAction')}}
.footerkeys{display:flex;height:43px;align-items:center;justify-content:space-between;padding:0 10px;color:var(--keyboardSecondary);${type('keyAction')}}
.home{position:absolute;width:134px;height:4px;border-radius:2px;bottom:10px;left:50%;transform:translateX(-50%);background:var(--keyboardSecondary)}
${layoutCss(approvedLayouts[390])}.screen{--input-y:294px}
@media(max-width:374px){${layoutCss(approvedLayouts[360])}.screen{--input-y:262px}#keyboard{padding-top:13px}.key{height:42px}}
`;
const brandMark = `<svg class="topography" fill="none" viewBox="0 0 244 94" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke-width="1" stroke-linecap="round">
    <path stroke="${colors.contourMuted}" d="M-5 10c27 0 41-17 72-17 33 0 45 16 73 14 30-2 53-22 89-17M12 82c22 0 35 11 63 10 30-1 50-17 85-14 38 3 67 20 86 11M52 100c32 2 50-13 83-13 30 0 66 20 106 15"/>
    <path stroke="${colors.contourMuted}" d="M31 29c16-2 29-18 52-18 19 0 33 8 52 7 24-1 47-19 75-16 16 2 29 9 38 18M30 47c20-3 38-23 57-23 22 0 33 6 51 5 25-2 45-18 69-17 21 1 34 9 43 21M25 68c21 2 43 7 62 5 19-2 38-11 50-13 24-4 45 12 70 13 18 1 35-4 49-10"/>
    <path stroke="${colors.contourMid}" d="M70 50c6-10 22-19 37-18 13 1 26 8 40 6 24-3 41-18 63-16 17 2 29 10 31 20 3 12-14 23-31 23-21 0-37-14-59-12-14 1-26 9-41 10-16 2-31-1-40-13z"/>
    <path stroke="${colors.contourEmphasis}" d="M143 47c21-1 38-16 59-16 14 0 26 6 28 13 3 10-10 14-23 14-25-1-39-14-64-11z"/>
  </g>
  <circle cx="177" cy="43" r="24" fill="${colors.markerSoft}" stroke="${colors.contourEmphasis}"/>
  <circle cx="177" cy="43" r="16" fill="${colors.accent}"/>
  <g transform="translate(168 34) scale(.75)" fill="none" stroke="${colors.onAccent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13V6a3 3 0 1 1 6 0v1.13M12 20v-9M2 11h4m12 0h4M3 21l4-4M17 17l4 4M3 6l4 3m10 0 4-3"/>
    <rect x="6" y="7" width="12" height="13" rx="6"/>
  </g>
  <circle cx="119" cy="35" r="2" fill="${colors.contourEmphasis}"/>
  <circle cx="225" cy="74" r="2" fill="${colors.contourEmphasis}"/>
</svg>`;
const status = `<svg class="status-icons" viewBox="0 0 69 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 13v-3h3v3H2zm4 0V8h3v5H6zm4 0V6h3v7h-3zm4 0V3h3v10h-3z" fill="${colors.text}"/>
  <path d="M24 6c4-4 10-4 14 0m-11 3c2.5-2.5 5.5-2.5 8 0m-6 2c1.2-1.2 2.8-1.2 4 0" stroke="${colors.text}" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="31" cy="13" r=".9" fill="${colors.text}"/><rect x="44" y="3.5" width="22" height="9" rx="2" stroke="${colors.text}"/><rect x="46" y="5.5" width="18" height="5" rx="1" fill="${colors.text}"/><path d="M68 6v4" stroke="${colors.text}"/>
</svg>`;
function key(label, className = '') { return `<span class="key ${className}">${label}</span>`; }
function keyrow(content) { return `<div class="keyrow">${content}</div>`; }
const letters = (row) => [...row].map((ch) => key(ch)).join('');
const keyboard = `<div id="keyboard" class="block" aria-hidden="true">
  ${keyrow(letters('ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ'))}${keyrow(letters('ㅁㄴㅇㄹㅎㅗㅓㅏㅣ'))}
  ${keyrow(key('⇧', 'alt') + letters('ㅋㅌㅊㅍㅠㅜㅡ') + key('⌫', 'alt'))}
  ${keyrow(key('123', 'alt') + key('한/영', 'alt') + key('스페이스', 'space') + key('완료', 'done'))}
  <div class="footerkeys"><span>한국어</span></div><div class="home"></div>
</div>`;
function screenMarkup(state, assetsPath = '../assets') {
  const ready = state === 'ready';
  const invalid = state === 'invalid';
  const value = ready ? strings.validValue : invalid ? strings.invalidValue : '';
  return `<main class="screen" data-state="${state}" aria-labelledby="title">
  <div class="block" id="status-bar" aria-hidden="true"><span>9:41</span>${status}</div>
  <div class="block" id="brand-visual" aria-hidden="true">${brandMark}<img src="${assetsPath}/bugmap-logo-vector-lime.svg" alt="" /></div>
  <h1 class="block" id="title">${esc(strings.title)}</h1>
  <p class="block" id="description">${esc(strings.description)}</p>
  <label class="block" id="field-label" for="nickname">${esc(strings.fieldLabel)}</label>
  <input class="block" id="nickname" aria-describedby="helper" aria-invalid="${invalid}" type="text" readonly="readonly"
    value="${esc(value)}" placeholder="${esc(strings.placeholder)}" />${state === 'initial' ? '<span class="caret" aria-hidden="true"></span>' : ''}
  <p class="block" id="helper"${invalid ? ' role="alert"' : ''}>${esc(invalid ? strings.tooShort : strings.guidance)}</p>
  <button class="block" id="start" type="button"${ready ? '' : ' disabled="disabled"'}>${esc(strings.start)}</button>
  ${keyboard}
</main>`;
}
const previews = states.map((state) => `previews/nickname-setup--${state}.html`);
mkdirSync(local('previews'), { recursive: true });
mkdirSync(local('captures'), { recursive: true });
save('previews/nickname.css', style);
states.forEach((state, index) => save(previews[index], `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>BugMap 닉네임 설정</title><link rel="stylesheet" href="nickname.css"></head><body>${screenMarkup(state)}</body></html>\n`));
save('preview.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844" role="img" aria-label="BugMap 닉네임 설정">
<foreignObject width="390" height="844"><div xmlns="http://www.w3.org/1999/xhtml">
<style><![CDATA[${style.replaceAll('../assets/', 'assets/')}]]></style>
${screenMarkup('initial', 'assets')}
</div></foreignObject></svg>\n`);
saveJSON('layout.json', {
  wireframeSha256: hash(sourceWireframe),
  viewports: approvedLayouts,
  states: {
    initial: { fieldVariant: 'focused-empty', fieldStroke: 'accent', fieldStrokeWidth: 2, value: '', helper: 'guidance', cta: 'disabled' },
    ready: { fieldVariant: 'valid', fieldStroke: 'fieldBorder', fieldStrokeWidth: 1, value: 'validValue', helper: 'guidance', cta: 'enabled' },
    invalid: { fieldVariant: 'invalid', fieldStroke: 'error', fieldStrokeWidth: 2, value: 'invalidValue', helper: 'tooShort', cta: 'disabled' }
  }
});

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const files = new Set([...previews, 'previews/nickname.css', 'assets/Pretendard-Medium.woff2', 'assets/Pretendard-Bold.woff2', 'assets/bugmap-logo-vector-lime.svg', 'preview.svg']);
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname.slice(1);
  if (path === 'favicon.ico') return res.writeHead(204).end();
  if (!files.has(path)) return res.writeHead(404).end();
  return res.writeHead(200, { 'Content-Type': mime[extname(path)] }).end(read(path));
});
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const origin = `http://127.0.0.1:${server.address().port}`;
const captures = [];
const contrast = (first, second) => {
  const linear = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const [high, low] = [linear(colors[first]), linear(colors[second])].sort((a, b) => b - a);
  return (high + .05) / (low + .05);
};
const contrastChecks = Object.fromEntries([
  ['text', 'background', 4.5], ['textSecondary', 'background', 4.5], ['text', 'field', 4.5],
  ['textPlaceholder', 'field', 4.5], ['textPlaceholder', 'background', 4.5], ['error', 'background', 4.5],
  ['error', 'field', 3], ['accent', 'field', 3], ['fieldBorder', 'field', 3], ['onAccent', 'accent', 4.5],
  ['disabledText', 'disabledSurface', 4.5]
].map(([foreground, background, minimum]) => {
  const ratio = contrast(foreground, background);
  return [`${foreground}/${background}`, { ratio: Number(ratio.toFixed(2)), minimum, pass: ratio >= minimum }];
}));
const styles = { colors, fontSizes: Object.values(typography).map(({ fontSize }) => fontSize), forbidden, origin };
try {
  await withBrowser({}, async (page) => {
    for (const width of layout.viewportWidths) {
      const expected = approvedLayouts[width];
      const size = { width, height: expected.height };
      for (const state of states) {
        const url = `${origin}/previews/nickname-setup--${state}.html`;
        await page.goto(url, size);
        const geometry = await page.evaluate(`(() => {
          const boxes = {};
          for (const el of document.querySelectorAll('.block')) {
            const { x, y, width, height } = el.getBoundingClientRect();
            boxes[el.id] = { x, y, width, height };
          }
          const fonts = [...document.fonts].map(({ family, weight, status }) => ({ family, weight, status }));
          const field = document.getElementById('nickname');
          return { boxes, fonts, value: field.value, invalid: field.getAttribute('aria-invalid'),
            disabled: document.getElementById('start').disabled, message: document.getElementById('helper').textContent,
            brandWidth: document.querySelector('#brand-visual img').naturalWidth };
        })()`);
        const check = await page.evaluate(`(${inspectWeb.toString()})(${JSON.stringify(styles)})`);
        const targetMin = Math.min(...['start', 'nickname'].flatMap((key) => [geometry.boxes[key].width, geometry.boxes[key].height]));
        const keyboardGap = geometry.boxes.keyboard.y - geometry.boxes.start.y - geometry.boxes.start.height;
        const expectedValue = state === 'initial' ? '' : state === 'ready' ? strings.validValue : strings.invalidValue;
        const output = `captures/${width}x${expected.height}-${state}.png`;
        const bytes = await page.screenshot();
        save(output, bytes);
        const issues = check.issues;
        if (JSON.stringify(geometry.boxes) !== JSON.stringify(expected.blocks)) issues.push({ code: 'approved-box-mismatch' });
        if (targetMin < layout.minimumTarget || keyboardGap !== layout.keyboardGap) issues.push({ code: 'target-or-keyboard-gap' });
        if (!geometry.brandWidth || geometry.fonts.filter((font) => font.status === 'loaded').length !== 2) issues.push({ code: 'font-or-logo-not-loaded' });
        if (geometry.value !== expectedValue || geometry.invalid !== String(state === 'invalid') ||
            geometry.disabled !== (state !== 'ready') || geometry.message !== (state === 'invalid' ? strings.tooShort : strings.guidance)) {
          issues.push({ code: 'state-copy-or-semantics' });
        }
        captures.push({ state, ...size, output, sha256: hash(bytes), targetMin, keyboardGap, geometry, issues });
      }
    }
    await page.goto(`${origin}/preview.svg`, { width: 390, height: 844 });
    const svgOk = await page.evaluate('Boolean(document.querySelector("svg foreignObject main #title"))');
    if (!svgOk) throw new Error('preview.svg failed to render');
  });
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
const sources = ['tokens.json', 'components.json', 'copy.json', 'icons.csv', 'render.mjs', 'layout.json', 'preview.svg',
  'previews/nickname.css', ...previews, ...[...files].filter((name) => name.startsWith('assets/'))];
saveJSON('render-report.json', {
  command: 'node 05-design-system/render.mjs <repo>',
  approvalWireframeSha256: hash(sourceWireframe),
  inputs: Object.fromEntries(sources.map((file) => [file, hash(read(file))])),
  contrastChecks,
  captures
});
const errors = captures.flatMap((capture) => capture.issues.map((issue) => ({ capture: basename(capture.output), issue })));
if (errors.length || Object.values(contrastChecks).some(({ pass }) => !pass)) {
  console.error(JSON.stringify({ errors, contrastChecks }, null, 2));
  process.exitCode = 1;
} else {
  console.log('6 captures, approved geometry, state semantics, local fonts and contrast confirmed');
}
