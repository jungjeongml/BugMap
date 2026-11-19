import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
const local = (path) => new URL(path, import.meta.url);
const read = (path) => readFileSync(local(path));
const { colors, layout } = JSON.parse(read('tokens.json'));
const { strings } = JSON.parse(read('copy.json'));
const { withBrowser } = await import(pathToFileURL(resolve(repo,'work/bugmap-login-kyro/05-design-system/browser-review.mjs')).href);
const { PNG } = createRequire(resolve(repo,'package.json'))('pngjs');
const capture = 'captures/390x844-default.png';
const viewport = layout.viewport;
const results = await withBrowser({}, async (page) => {
  await page.goto(local('preview.svg').href,viewport);
  await page.cdp('DOM.enable');
  await page.cdp('CSS.enable');
  const { root } = await page.cdp('DOM.getDocument');
  const geometry = await page.evaluate(String.raw`(() => {
    const box = (node) => {
      const { x,y,width,height } = node.getBoundingClientRect();
      return {x,y,width,height};
    };
    const css = (node) => {
      const visual = getComputedStyle(node);
      return {fill:visual.fill,fontSize:parseFloat(visual.fontSize),fontWeight:Number(visual.fontWeight)};
    };
    const texts = [...document.querySelectorAll('text')].map(node=>({id:node.id,text:node.textContent,...css(node),box:box(node),group:node.closest('[data-target]')?.id||null}));
    const targets = [...document.querySelectorAll('[data-target]')].map(node=>({id:node.id,role:node.getAttribute('role'),label:node.getAttribute('aria-label'),selected:node.getAttribute('aria-selected'),box:box(node.querySelector('.hit'))}));
    return {texts,targets,viewport:box(document.documentElement),map:box(document.querySelector('#map-image')),logo:box(document.querySelector('#mapbox-logo'))};
  })()`);
  const fonts={};
  for (const {id} of geometry.texts) {
    const {nodeId}=await page.cdp('DOM.querySelector',{nodeId:root.nodeId,selector:'#'+id});
    fonts[id]=(await page.cdp('CSS.getPlatformFontsForNode',{nodeId})).fonts;
  }
  const full=await page.screenshot();
  await page.evaluate("document.querySelectorAll('text').forEach(el=>el.style.visibility='hidden'); document.querySelector('#mapbox-logo').style.visibility='hidden';");
  const bare=await page.screenshot();
  return {geometry,fonts,full,bare};
});
const { geometry, fonts }=results;
const full=PNG.sync.read(results.full);
const bare=PNG.sync.read(results.bare);
const right=(box)=>box.x+box.width;
const bottom=(box)=>box.y+box.height;
const within=(inner,outer)=>inner.x>=outer.x&&inner.y>=outer.y&&right(inner)<=right(outer)&&bottom(inner)<=bottom(outer);
const overlaps=(a,b)=>a.x<right(b)&&right(a)>b.x&&a.y<bottom(b)&&bottom(a)>b.y;
const noOverlaps=(boxes)=>boxes.every((r,i)=>!boxes.slice(i+1).some((other)=>overlaps(r,other)));
const element=(id)=>geometry.targets.find((target)=>target.id===id);
const target=(id)=>element(id).box;
const entire={x:0,y:0,...viewport};
const safe={...entire,y:layout.safeArea.top,height:viewport.height-layout.safeArea.top-layout.safeArea.bottom};
const textById=Object.fromEntries(geometry.texts.map((item)=>[item.id,item]));
const smallNames=['seven','three','five'];
const copyById={
  'time':'time','map-north':'north','map-park':'park','map-river':'river','location-label':'location',
  'label-cluster-seven':'clusterSeven','label-cluster-three':'clusterThree','label-cluster-five':'clusterFive',
  'record-label':'record','search-placeholder':'search',
  'tab-label-map':'tabMap','tab-label-community':'tabCommunity','tab-label-chat':'tabChat','tab-label-my':'tabMy',
};
const changedPixels=(box,threshold=24)=>{
  const pixels=[];
  for(let y=Math.floor(box.y);y<Math.ceil(bottom(box));y++) {
    for(let x=Math.floor(box.x);x<Math.ceil(right(box));x++) {
      if(x<0||x>=full.width||y<0||y>=full.height)continue;
      const index=(y*full.width+x)*4;
      if([0,1,2].some((i)=>Math.abs(full.data[index+i]-bare.data[index+i])>=threshold)) {
        pixels.push(Array.from(bare.data.subarray(index,index+3)));
      }
    }
  }
  return pixels;
};
const checks={
  fullViewportMatches: full.width===viewport.width&&full.height===viewport.height&&within(entire,geometry.viewport)&&within(geometry.viewport,entire),
  edgeToEdgeMap:within(entire,geometry.map)&&within(geometry.map,entire),
  allTextVisibleInViewport: geometry.texts.every(({box})=>box.width>0&&within(box,entire)),
  labelInsideControl: geometry.texts.filter(({group})=>group).every(({box,group})=>within(box,target(group))),
  allCopyMatches: geometry.texts.length===Object.keys(copyById).length&&geometry.texts.every(({id,text})=>text===strings[copyById[id]]),
  allTextsUsePretendard: Object.values(fonts).every((variants)=>variants.length>0&&variants.every((font)=>font.isCustomFont&&font.familyName.includes('Pretendard'))),
  allTargetsSafeAndAtLeast44: geometry.targets.every(({box})=>box.width>=44&&box.height>=44&&within(box,safe)),
  allTargetsDisjoint: noOverlaps(geometry.targets.map(({box})=>box)),
  allTextBoundsDisjoint: noOverlaps(geometry.texts.map(({box})=>box)),
  threeTotalCountClusters: smallNames.every((value,i)=> {
    const id='cluster-'+value;
    const {width,height,y}=target(id);
    const label=textById['label-'+id];
    return [64,44].every((n,index)=>n===[width,height][index])
      && element(id).label===strings[['clusterSevenAccessible','clusterThreeAccessible','clusterFiveAccessible'][i]]
      && Math.abs(label.box.y+label.box.height/2-(y+height/2))<=3;
  }),
  oneActiveOfFourTabs: geometry.targets.filter(({role})=>role==='tab').map(({selected})=>selected).join(',')==='true,false,false,false',
  logoVisibleAndSeparate: within(geometry.logo,safe)&&changedPixels(geometry.logo).length>40&&geometry.targets.every(({box})=>!overlaps(geometry.logo,box)),
  searchDragAndTabsDistinct: target('sheet-handle').y===layout.sheet.y && bottom(target('sheet-handle'))===target('search').y && bottom(target('search'))<target('tab-map').y,
};
function luminance(rgb) {
  const [r,g,b]=rgb.map((unit)=>{
    const v=unit/255;
    return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
  });
  return .2126*r+.7152*g+.0722*b;
}
function ratio(fore,back){
  const a=luminance(fore);
  const b=luminance(back);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
const parseHex=(hex)=>hex.match(/[a-f0-9]{2}/ig).map((pair)=>Number.parseInt(pair,16));
const contrasts=geometry.texts.map(({id,fill,box})=>{
  const fg=fill.match(/\d+/g).slice(0,3).map(Number);
  const pixels=changedPixels(box);
  if(!pixels.length)throw new Error('No rendered glyphs for '+id);
  const minimum=Math.min(...pixels.map((value)=>ratio(fg,value)));
  return {id,measure:'foreground to actual backdrop at text ink samples',ratio:Number(minimum.toFixed(2)),threshold:4.5,passed:minimum>=4.5};
});
for (const [id,fg,bg] of [['sheet-handle','sheetHandle','mapPanel'],['locate-icon','location','observationMarkerSurface'],['map-info-icon','textSecondary','observationMarkerSurface'],['search-icon','textPlaceholder','searchSurface'],['record-icon','onPrimary','primary'],['selected-tab-icon','primary','activeTabSurface'],['inactive-tab-icons','textSecondary','mapPanel']]){
  const value=ratio(parseHex(colors[fg]),parseHex(colors[bg]));
  contrasts.push({id,measure:'icon or handle on solid surface',ratio:Number(value.toFixed(2)),threshold:3,passed:value>=3});
}
const sha=(data)=>createHash('sha256').update(data).digest('hex');
const report={
  design:'main-map/default',renderer:'Chromium CDP 1× from local preview.svg',viewport,
  checks,contrasts,fonts,geometry,
  files:{'preview.svg':sha(read('preview.svg')),[capture]:sha(results.full)},
  result:Object.values(checks).every(Boolean)&&contrasts.every(({passed})=>passed),
};
writeFileSync(local(capture),results.full);
writeFileSync(local('render-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:report.result,failedChecks:Object.keys(checks).filter((name)=>!checks[name]),textAndControlContrast:contrasts.map(({id,ratio,passed})=>[id,ratio,passed]),fonts:Object.fromEntries(Object.entries(fonts).map(([key,values])=>[key,values.map(({familyName,isCustomFont})=>[familyName,isCustomFont])])),sha:report.files},null,2));
if(!report.result)process.exitCode=1;
