import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const repo=resolve(process.argv[2]??'/Users/mac/Documents/BugMap');
const source=resolve(repo,'work/bugmap-record-entry-harness/05-design-system');
const {DOMParser,XMLSerializer}=createRequire(resolve(repo,'package.json'))('@xmldom/xmldom');
const parser=new DOMParser();
const serializer=new XMLSerializer();
const read=file=>readFile(resolve(source,file),'utf8');
const web=new URL('../web/',import.meta.url);
const put=(file,body)=>writeFile(new URL(file,web),body);
const {colors,typography,layout}=JSON.parse(await read('tokens.json'));
const {strings}=JSON.parse(await read('copy.json'));
const manifest=JSON.parse(await read('assets-manifest.json'));
const plan=JSON.parse(await readFile(new URL('plan.json',import.meta.url)));
const svgNodes=node=>Array.from(node.childNodes).filter(child=>child.nodeType===1);
const asMarkup=node=>serializer.serializeToString(node);
const markup=(doc,id)=>asMarkup(doc.getElementById(id));
await mkdir(new URL('assets/photos/',web),{recursive:true});
for (const entry of manifest.files.filter(item=>item.file.startsWith('assets/'))) {
  await copyFile(resolve(source,entry.file),new URL(entry.file,web));
}
const css=Object.entries(colors).map(([id,hex])=>'  --'+id+': '+hex+';').join('\n');
await put('record-entry.css',`@font-face {
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
${css}
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  color: var(--text);
  background: var(--background);
  font-family: Pretendard, system-ui, sans-serif;
  font-size: ${typography.value.fontSize}px;
}
.screen { width: 390px; margin-inline: auto; }
.screen > svg { display: block; }
.form-scroll {
  width: 390px;
  height: ${layout.body.height}px;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: none;
  position: relative;
}
.form-scroll::-webkit-scrollbar { display: none; }
.form-scroll > svg { display: block; }
[data-target]:focus { outline: none; }
[data-target]:focus-visible > .hit { stroke: var(--primary); stroke-width: 2px; }
[data-target][aria-disabled="true"] { cursor: default; }
#scroll-indicator { pointer-events: none; }
#memo-viewport-outline { visibility: hidden; }
.screen:has(.form-scroll[data-scroll-at-start="true"]) #memo-viewport-outline { visibility: visible; }
.form-scroll[data-preview-memo="true"][data-scroll-at-start="true"] #memo-input > rect:not(.hit) { visibility: hidden; }
.editor {
  position: absolute;
  background: var(--formField);
  color: var(--text);
  border: 1px solid var(--primary);
  border-radius: ${layout.controls.radius}px;
  font: 500 ${typography.value.fontSize}px/${typography.value.lineHeight}px Pretendard, system-ui, sans-serif;
  padding: 12px 13px;
  resize: none;
}
.editor::placeholder { color: var(--textPlaceholder); }
`);
for (const state of plan.states) {
  const ready=state.state==='ready';
  const expanded=parser.parseFromString(await read('preview-full-'+state.state+'.svg'),'image/svg+xml');
  const start=parser.parseFromString(await read(ready?'preview-ready.svg':'preview.svg'),'image/svg+xml');
  const form=expanded.getElementById('record-entry-form');
  form.removeAttribute('clip-path');
  form.removeAttribute('aria-labelledby');
  form.removeAttribute('role');
  const heading=start.getElementById('screen-title-label');
  heading.setAttribute('role','heading');
  heading.setAttribute('aria-level','1');
  for (const doc of [start,expanded]) {
    for (const node of Array.from(doc.getElementsByTagName('g'))) {
      if (!node.hasAttribute('data-target') || node.getAttribute('aria-disabled')==='true') continue;
      node.setAttribute('tabindex','0');
      if (node.getAttribute('role')==='textbox') node.setAttribute('aria-required',node.getAttribute('id')==='species-name'?'true':'false');
    }
  }
  for (const node of Array.from(form.getElementsByTagName('image'))) {
    const index=node.getAttribute('data-photo');
    const path=plan.assets['specimen-'+index].path;
    assert.ok(node.getAttribute('href').startsWith('data:image/png;base64,'));
    node.setAttribute('href',path);
  }
  const definitions=Array.from(form.getElementsByTagName('defs')).flatMap(svgNodes).map(asMarkup).join('\n');
  const {width,height,scroll}=state;
  const title=strings.screenTitle+' · '+(ready?strings.photoCountFull:strings.photoCountEmpty);
  const memoOutline=ready?'':'<g id="memo-viewport-outline" aria-hidden="true">'+asMarkup(svgNodes(start.getElementById('memo-preview'))[0])+'</g>';
  const html=`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="record-entry.css">
<script defer src="record-entry.js"></script>
</head>
<body>
<main class="screen" aria-labelledby="screen-title-label">
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
${markup(start,'system-status')}
${markup(start,'navigation')}
${memoOutline}
<foreignObject x="${scroll.x}" y="${scroll.y}" width="${scroll.width}" height="${scroll.height}">
<div xmlns="http://www.w3.org/1999/xhtml" id="form-scroll" class="form-scroll" data-preview-memo="${!ready}" data-scroll-at-start="true" aria-label="작성 폼" role="region" tabindex="0">
<svg xmlns="http://www.w3.org/2000/svg" width="${scroll.width}" height="${scroll.contentHeight}" viewBox="0 ${scroll.y} ${scroll.width} ${scroll.contentHeight}" fill="none">
<defs>${definitions}</defs>
${asMarkup(form)}
</svg>
</div>
</foreignObject>
${markup(start,'scroll-indicator')}
${markup(start,'fixed-footer')}
</svg>
</main>
</body>
</html>
`;
  await put('record-entry--'+state.state+'.html',html);
}
