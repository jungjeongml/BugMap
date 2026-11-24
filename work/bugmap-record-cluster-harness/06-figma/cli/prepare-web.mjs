import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = process.argv[2] ?? fileURLToPath(new URL('../../../../', import.meta.url));
const source = resolve(repo, 'work/bugmap-record-cluster-harness/05-design-system');
const require = createRequire(resolve(repo, 'package.json'));
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const parser = new DOMParser();
const serializer = new XMLSerializer();
const read = file => readFile(resolve(source, file), 'utf8');
const web = new URL('../web/', import.meta.url);
const put = (file, content) => writeFile(new URL(file, web), content);
const { colors, typography, layout } = JSON.parse(await read('tokens.json'));
const { strings } = JSON.parse(await read('copy.json'));
const { photos, usage } = JSON.parse(await read('photo-sources.json'));
const { files } = JSON.parse(await read('assets-manifest.json'));
const images = new Map(photos.map(({ id, preview }) => [id, preview.path]));

for (const { file } of files.filter(({ file }) => file.startsWith('assets/'))) {
  const dest = new URL(file, web);
  await mkdir(dirname(fileURLToPath(dest)), { recursive: true });
  await copyFile(resolve(source, file), dest);
}

const palette = Object.entries(colors).map(([name, hex]) => `  --${name}: ${hex};`).join('\n');
await put('main-map.css', `@font-face {
  font-family: Pretendard;
  src: url("assets/Pretendard-Medium.woff2") format("woff2");
  font-weight: 500;
  font-display: block;
}
@font-face {
  font-family: Pretendard;
  src: url("assets/Pretendard-Bold.woff2") format("woff2");
  font-weight: 700;
  font-display: block;
}
:root {
${palette}
}
html, body { margin: 0; }
body {
  color: var(--text);
  background: var(--background);
  font: 500 ${typography.recordDate.fontSize}px Pretendard, sans-serif;
}
main {
  width: ${layout.viewport.width}px;
  margin-inline: auto;
}
main svg { display: block; }
#map-label-river { visibility: hidden; }
.record-scroll {
  width: 100%;
  height: 100%;
  overflow: hidden auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.record-scroll::-webkit-scrollbar { display: none; }
[data-record-id] { cursor: pointer; }
[data-record-id]:focus { outline: none; }
[data-record-id]:focus-visible > rect:nth-child(2) { stroke: var(--focusRing); stroke-width: 2px; }
[data-record-id]:active > rect:nth-child(2) { fill: var(--pressedSurface); }
`);

await put('main-map.js', `const screen = document.querySelector('main');
const list = document.querySelector('#record-scroll');
const content = list.querySelector('svg');
const heading = document.querySelector('#cluster-panel-title');
const rows = [...content.querySelectorAll('[data-record-id]')];

if (rows.length === 7 && new URLSearchParams(location.search).get('records') === '4') {
  for (const row of rows.splice(4)) row.remove();
  const bounds = rows.at(-1).querySelector('.hit');
  const viewBox = content.viewBox.baseVal;
  const height = Number(bounds.getAttribute('y')) + Number(bounds.getAttribute('height')) - viewBox.y;
  content.setAttribute('height', height);
  content.setAttribute('viewBox', [viewBox.x, viewBox.y, viewBox.width, height].join(' '));
  heading.textContent = screen.dataset.panelTitleFormat.replace('{count}', rows.length);
  const selected = document.querySelector('[aria-pressed="true"]');
  selected.querySelector('text').textContent = screen.dataset.markerFormat.replace('{count}', rows.length);
  selected.setAttribute('aria-label', screen.dataset.fixtureMarkerAccessible);
  document.title = heading.textContent;
}

const labels = [...list.querySelectorAll('[data-record-id] text')];
function updateLabels() {
  const viewport = list.getBoundingClientRect();
  for (const label of labels) {
    const box = label.getBoundingClientRect();
    label.style.visibility = box.top >= viewport.top && box.bottom <= viewport.bottom ? 'visible' : 'hidden';
  }
}
list.addEventListener('scroll', updateLabels, { passive: true });
document.fonts.ready.then(updateLabels);
updateLabels();

function openRecord(event) {
  const row = event.target.closest('[data-record-id]');
  if (!row) return;
  if (event.type === 'keydown') {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
  }
  const recordId = row.dataset.recordId;
  screen.dataset.lastRecordId = recordId;
  screen.dispatchEvent(new CustomEvent('bugmap:record', { detail: { recordId }, bubbles: true }));
}
list.addEventListener('click', openRecord);
list.addEventListener('keydown', openRecord);
`);

const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
for (const { state, records } of usage) {
  const overflow = state === 'cluster-selected-overflow';
  const doc = parser.parseFromString(await read(overflow ? 'preview-overflow.svg' : 'preview.svg'), 'image/svg+xml');
  const svg = doc.documentElement;
  svg.setAttribute('fill', 'none');
  const typeStyle = svg.getElementsByTagName('style')[0];
  typeStyle.parentNode.removeChild(typeStyle);
  const list = doc.getElementById('record-list');
  const { x, y, width, height } = layout.states[state].listViewport;
  const lastRow = records.at(-1).rowBoundsAtStart;
  const contentHeight = lastRow.y + lastRow.height - y;
  const clip = doc.getElementById('record-list-viewport');
  clip.parentNode.removeChild(clip);
  list.removeAttribute('clip-path');
  const title = doc.getElementById('cluster-panel-title');
  title.setAttribute('role', 'heading');
  title.setAttribute('aria-level', '1');
  for (const { recordId } of records) doc.getElementById(recordId + '-row').setAttribute('tabindex', '0');
  for (const image of Array.from(svg.getElementsByTagName('image'))) {
    const paths = { 'map-vector': 'assets/map-dark.svg', 'mapbox-logo': 'assets/mapbox-logo.svg' };
    const path = images.get(image.getAttribute('data-photo')) ?? paths[image.getAttribute('id')];
    assert.ok(path, 'Unmapped approved asset: ' + image.getAttribute('id'));
    image.setAttribute('href', path);
  }

  const content = `<foreignObject x="${x}" y="${y}" width="${width}" height="${height}">
<div xmlns="http://www.w3.org/1999/xhtml" id="record-scroll" class="record-scroll" role="region" aria-labelledby="cluster-panel-title">
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${contentHeight}" viewBox="${x} ${y} ${width} ${contentHeight}" fill="none">
${serializer.serializeToString(list)}
</svg>
</div>
</foreignObject>`;
  list.parentNode.replaceChild(doc.createComment('scrolling record list'), list);
  const fixture = strings.markerFormat.replace('{count}', '4') + '개, 선택됨';
  const markup = serializer.serializeToString(svg).replace('<!--scrolling record list-->', content);
  await put(`main-map--${state}.html`, `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title.textContent)}</title>
<link rel="stylesheet" href="main-map.css">
<script defer src="main-map.js"></script>
</head>
<body>
<main data-panel-title-format="${escape(strings.titleFormat)}" data-marker-format="${escape(strings.markerFormat)}" data-fixture-marker-accessible="${escape(fixture)}">
${markup}
</main>
</body>
</html>
`);
}
