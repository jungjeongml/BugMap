import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = process.argv[2] ?? fileURLToPath(new URL('../../../', import.meta.url));
const project = resolve(repo, 'work/bugmap-record-cluster-harness');
const output = resolve(process.argv[3] ?? '/private/tmp/bugmap-cluster-adaptive');
const assets = pathToFileURL(project + '/06-figma/web/assets/');
const read = async name => JSON.parse(await readFile(resolve(project, '05-design-system', name + '.json'), 'utf8'));
const { colors, typography, layout } = await read('tokens');
const { strings } = await read('copy');
const { photos, usage } = await read('photo-sources');
const photoPaths = new Map(photos.map(({id,preview}) => [id, preview.path.replace(/^assets\//, '')]));
const { withBrowser } = await import(pathToFileURL(resolve(repo, 'work/bugmap-login-kyro/05-design-system/browser-review.mjs')));
const records = usage.find(item => item.state === 'cluster-selected-overflow').records;
const longName = '사진 속 칠성무당벌레 관찰';
const asset = file => new URL(file, assets).href;
const fontData = async weight => 'data:font/woff2;base64,' +
  (await readFile(new URL('Pretendard-' + weight + '.woff2', assets))).toString('base64');
const [medium, bold] = await Promise.all([fontData('Medium'), fontData('Bold')]);
const esc = text => String(text).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const colorsCSS = Object.entries(colors).map(([key,value]) => `--${key}:${value}`).join(';');
const thumbnail = Math.min(layout.row.photoSize,64);
const file = await mkdtemp(join(tmpdir(),'bugmap-adaptive-'));
await mkdir(join(output,'captures'),{recursive:true});

function html(scale) {
  return `<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(strings.titleSeven)}</title><style>
@font-face {font-family:Pretendard; src:url("${medium}") format("woff2");font-weight:500}
@font-face {font-family:Pretendard; src:url("${bold}") format("woff2");font-weight:700}
:root{${colorsCSS};font-family:Pretendard,sans-serif;color:var(--text);background:var(--mapPanel)}
*{box-sizing:border-box}
body{margin:0}
main{height:100dvh;display:flex;flex-direction:column;background:var(--mapPanel)}
.map{position:relative;flex:0 0 ${scale===2 ? 29 : 36}dvh;background:var(--mapLand) url("${asset('map-dark.svg')}") top center/100% auto no-repeat}
.place{position:absolute;top:48%;left:33%;font-size:15px;font-weight:700;color:var(--mapLabel)}
button{font:inherit;color:inherit;cursor:pointer}
.marker{position:absolute;min-height:44px;min-width:64px;padding:0 10px;border:1px solid var(--observationMarkerBorder);border-radius:24px;background:var(--observationMarkerSurface);font-weight:700;font-size:12px}
#selected{left:14%;top:26%;outline:2px solid var(--primary);outline-offset:2px}
#other{right:14%;top:54%}
#logo{position:absolute;bottom:12px;left:12px;width:88px;height:23px}
#attribution{position:absolute;right:8px;bottom:4px;width:44px;height:44px;border:0;background:none}
#attribution span,#close span{border-radius:50%;display:grid;place-items:center;margin:auto}
#attribution span{width:28px;height:28px;background:var(--observationMarkerSurface);border:1px solid var(--mapPanelBorder)}
.sheet{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;border:1px solid var(--mapPanelBorder);border-top-left-radius:32px;border-top-right-radius:32px;background:var(--mapPanel);overflow:hidden}
header{display:flex;gap:12px;align-items:flex-start;padding:14px 15px 12px}
h1{flex:1;min-width:0;font-size:${typography.panelTitle.fontSize*scale}px;line-height:1.12;word-break:keep-all;overflow-wrap:anywhere;margin:0}
#close{flex:0 0 48px;height:48px;border:0;background:none;padding:0}
#close span{width:38px;height:38px;background:var(--controlFill);font-size:22px}
#list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;padding:0 15px}
#list::-webkit-scrollbar{display:none}
.row{min-height:${layout.row.minimumHeight}px;width:100%;display:grid;grid-template-columns:${thumbnail}px minmax(0,1fr) 18px;gap:10px;align-items:center;padding:12px;margin:0 0 8px;border:0;border-radius:${layout.row.radius}px;text-align:left;background:var(--recordRow)}
.row:last-child{margin-bottom:0}
.row:focus-visible{outline:2px solid var(--focusRing);outline-offset:-4px}
.row:active{background:var(--pressedSurface)}
.row img{width:${thumbnail}px;height:${thumbnail}px;border-radius:${layout.row.photoRadius}px;object-fit:cover}
.copy{display:grid;gap:4px;min-width:0}
.name,.date{word-break:keep-all;overflow-wrap:anywhere}
.name{font-size:${typography.recordName.fontSize*scale}px;line-height:1.17;font-weight:700}
.date{font-size:${typography.recordDate.fontSize*scale}px;line-height:1.2;color:var(--textSecondary)}
.chevron{font-size:20px;color:var(--textSecondary);text-align:center}
footer{flex:0 0 ${layout.safeArea.bottom}px;display:grid;place-items:end center;padding-bottom:10px}
footer span{width:134px;height:4px;border-radius:2px;background:var(--systemHome)}
</style><main>
<div class="map"><span class="place">${esc(strings.park)}</span>
<button class="marker" id="selected" aria-pressed="true">${esc(strings.markerSeven)}</button><button class="marker" id="other" aria-pressed="false">${esc(strings.markerThree)}</button>
<img id="logo" src="${asset('mapbox-logo.svg')}" alt="Mapbox">
<button id="attribution" aria-label="${esc(strings.attribution)}"><span aria-hidden="true">ⓘ</span></button></div>
<section class="sheet" aria-labelledby="title"><header><h1 id="title">${esc(strings.titleSeven)}</h1><button id="close" aria-label="${esc(strings.close)}"><span aria-hidden="true">×</span></button></header>
<div id="list" role="region" aria-labelledby="title">
${records.map(({recordId,name,discoveryDate,photoId},index)=>`<button type="button" class="row" data-id="${esc(recordId)}"><img src="${asset(photoPaths.get(photoId))}" alt=""><span class="copy"><strong class="name">${esc(index===0?longName:name)}</strong><span class="date">${esc(discoveryDate)}</span></span><span class="chevron" aria-hidden="true">›</span></button>`).join('\n')}
</div><footer aria-hidden="true"><span></span></footer></section></main>
<script>const list=document.querySelector('#list');list.addEventListener('click',event=>{const row=event.target.closest('[data-id]');if(row)list.dataset.selected=row.dataset.id});</script>`;
}

const viewport = { width:320, height:700 };
const capturePath = name => join(output,'captures',name);
const captures=[];
const results=[];
try {
  await withBrowser({},async page=>{
    const inspect=()=>page.evaluate(`(() => {
      const q=s=>document.querySelector(s);
      const list=q('#list');
      const box=e=>{const {x,y,width,height}=e.getBoundingClientRect();return {x,y,width,height};};
      const position=(element)=>{
        const range=document.createRange(); range.selectNodeContents(element);
        return [...range.getClientRects()].map(rect=>({x:rect.x,y:rect.y,width:rect.width,height:rect.height}));
      };
      return {
        viewport:{width:innerWidth,height:innerHeight}, scrollTop:list.scrollTop, scrollMax:list.scrollHeight-list.clientHeight,
        sheet:box(q('.sheet')), selected:box(q('#selected')), other:box(q('#other')), map:box(q('.map')),
        close:box(q('#close')), title:box(q('#title')), list:box(list), logo:box(q('#logo')), attribution:box(q('#attribution')),
        picked:list.dataset.selected??null, loadedImages:[...document.images].every(image=>image.complete&&image.naturalWidth>0),
        loadedFonts:[...document.fonts].every(font=>font.family==='Pretendard'&&font.status==='loaded'),
        rows:[...list.querySelectorAll('.row')].map(row=>{
          const name=row.querySelector('.name'),date=row.querySelector('.date'),copy=row.querySelector('.copy');
          return {id:row.dataset.id, box:box(row), name:box(name), date:box(date), photo:box(row.querySelector('img')),
            copy:box(copy),lines:position(name),dateLines:position(date),nameSize:parseFloat(getComputedStyle(name).fontSize)};
        })
      };
    })()`);
    const bottom=box=>box.y+box.height;
    const right=box=>box.x+box.width;
    const overlaps=(a,b)=>a.x<right(b)&&b.x<right(a)&&a.y<bottom(b)&&b.y<bottom(a);
    const recordCapture=async name=>{
      const png=await page.screenshot();
      await writeFile(capturePath(name),png);
      const item={file:'captures/'+name, sha256:createHash('sha256').update(png).digest('hex')};
      captures.push(item);
      return item;
    };
    for(const scale of [1,2]){
      const source=join(file,'probe-'+scale+'.html');
      await writeFile(source,html(scale));
      await page.goto(pathToFileURL(source).href,viewport);
      const initial=await inspect();
      assert.deepEqual(initial.viewport,viewport);
      assert.equal(initial.rows.length,7);
      assert.ok(initial.loadedImages && initial.loadedFonts);
      assert.ok(initial.rows[0].lines.length>1,'Long name wraps');
      assert.equal(initial.rows[0].nameSize,typography.recordName.fontSize*scale);
      assert.ok(initial.title.height>0 && right(initial.title)<=initial.close.x);
      assert.ok(initial.list.height>=initial.rows[0].box.height,
        'Long row can be read in full: ' + initial.rows[0].box.height + ' within ' + initial.list.height);
      for(const key of ['selected','other','logo','attribution']){
        const control=initial[key];
        assert.ok(control.y>=0 && control.x>=0 && right(control)<=initial.viewport.width && bottom(control)<=initial.sheet.y,key);
      }
      for(const key of ['close','attribution','selected','other']) assert.ok(initial[key].width>=44&&initial[key].height>=44,key);
      assert.ok(!overlaps(initial.selected,initial.other) && !overlaps(initial.other,initial.attribution));
      const checkedRows=[];
      const start=await recordCapture(scale*100+'-start.png');
      for(const row of initial.rows){
        assert.ok(row.box.height>=44 && row.box.width>=44);
        assert.ok(right(row.photo)<=row.copy.x&&bottom(row.name)<=row.date.y);
        for (const line of [...row.lines,...row.dateLines])assert.ok(line.x>=row.copy.x-.5&&right(line)<=right(row.copy)+.5,row.id);
        await page.evaluate(`document.querySelector('[data-id="${row.id}"]').scrollIntoView({block:"nearest"})`);
        const visible=await inspect();
        const positioned=visible.rows.find(item=>item.id===row.id).box;
        assert.ok(positioned.y>=visible.list.y-1&&bottom(positioned)<=bottom(visible.list)+1,row.id);
        checkedRows.push(row.id);
      }
      await page.evaluate('document.querySelector("#list").scrollTop=0');
      await page.cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:160,y:initial.list.y+50,deltaX:0,deltaY:3000});
      await page.evaluate(`new Promise((resolve,reject)=>{
        const list=document.querySelector('#list');const t=performance.now();
        function wait(){
          if(list.scrollTop>=list.scrollHeight-list.clientHeight-1)resolve();
          else if(performance.now()-t>2200)reject(new Error('Wheel did not reach end'));
          else requestAnimationFrame(wait);
        }
        wait();
      })`);
      const end=await inspect(),last=end.rows.at(-1);
      assert.deepEqual(end.title,initial.title);
      assert.deepEqual(end.close,initial.close);
      assert.ok(last.box.y>=end.list.y-1&&bottom(last.box)<=bottom(end.list)+1);
      assert.ok(bottom(last.box)<=viewport.height-layout.safeArea.bottom+.5);
      const finish=await recordCapture(scale*100+'-end.png');
      const x=last.box.x+last.box.width/2,y=last.box.y+last.box.height/2;
      for(const type of ['mousePressed','mouseReleased']) await page.cdp('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1});
      const clicked=(await inspect()).picked;
      assert.equal(clicked,last.id);
      results.push({scale,viewport,initial,end,longName,longRowLines:initial.rows[0].lines.length,checkedRows,clicked,captures:[start,finish]});
    }
  });
  await writeFile(join(output,'adaptive-layout.json'),JSON.stringify({source:'responsive validation probe from approved stage 05 data and stage 06 local assets',results,captures},null,2)+'\n');
  console.log(JSON.stringify(results.map(({scale,checkedRows,clicked,longRowLines,initial})=>({scale,checkedRows:checkedRows.length,click:clicked,longRowLines,rowHeight:initial.rows[0].box.height,listHeight:initial.list.height}))));
} finally { await rm(file,{recursive:true,force:true}); }
