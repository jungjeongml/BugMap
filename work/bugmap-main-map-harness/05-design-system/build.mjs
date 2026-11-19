import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
const local = (path) => new URL(path, import.meta.url);
const read = (path) => readFileSync(local(path));
const { colors, layout, typography } = JSON.parse(read('tokens.json'));
const { strings } = JSON.parse(read('copy.json'));
const project = resolve(repo, 'work/bugmap-main-map-harness');
const { screens } = JSON.parse(readFileSync(resolve(project, '04-wireframes/wireframes.json')));
const [screen] = screens;
if (screens.length !== 1 || screen.id !== 'main-map' || screen.state !== 'default') throw new Error('One main-map/default wireframe required');
const b = (id) => {
  const block = screen.blocks.find((item) => item.id === id);
  if (!block) throw new Error('Missing approved block: ' + id);
  return block;
};
const numberAttrs = (obj) => Object.entries(obj).map(([key, value]) => key + '="' + value + '"').join(' ');
const position = ({ x, y, width, height }) => ({ x, y, width, height });
const { width, height } = layout.viewport;
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const data = (mime, bytes) => 'data:' + mime + ';base64,' + bytes.toString('base64');

const originalMap = readFileSync(resolve(repo, 'design/main-map/map-background.svg'));
const shades = {
  '#e6ebe6':'mapLand',
  '#d3dfd3':'mapBlock1',
  '#c5d8c7':'mapBlock2',
  '#dbe4d9':'mapBlock3',
  '#b4cdb9':'mapBlock4',
  '#cadac9':'mapBlock5',
  '#e1e7dd':'mapBlock6',
  '#bcd2bd':'mapBlock7',
  '#8fb49a':'mapPark',
  '#a8c7ad':'mapParkContour',
  '#e9efe5':'mapSeam',
  '#edf1e9':'mapMinorRoad',
  '#b5c3b7':'mapMajorRoadCasing',
  '#fafbf7':'mapMajorRoad',
  '#c1d7d2':'mapWaterBank',
  '#a9c7c2':'mapWater',
  '#dee8cd':'mapTrail',
};
const map = originalMap.toString().replace(/#[0-9a-f]{6}/gi, (match) => {
  const shade = colors[shades[match.toLowerCase()]];
  if (!shade) throw new Error('Unknown map shade: ' + match);
  return shade;
});
writeFileSync(local('assets/map-dark.svg'), map + '\n');

const iconFiles = ['map','users-round','message-circle','user-round','locate-fixed','search','plus','info'];
const iconPackage = resolve(repo, 'node_modules/lucide-react-native');
const packageVersion = JSON.parse(readFileSync(resolve(iconPackage,'package.json'))).version;
const glyphs = Object.fromEntries(iconFiles.map((name) => {
  const source = readFileSync(resolve(iconPackage,'dist/cjs/icons',name + '.js'),'utf8');
  const info = source.match(/const __iconData = (\{[\s\S]+?\});/);
  if (!info) throw new Error('Cannot read approved Lucide icon: ' + name);
  const { node } = runInNewContext('(' + info[1] + ')', Object.create(null), {timeout:100});
  const paths = node.map(([tag, attrs]) => '<' + tag + ' ' + numberAttrs(Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'key'))) + '/>').join('');
  return [name, paths];
}));
const icon = (name,x,y,size,stroke) =>
  '<svg aria-hidden="true" x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + glyphs[name] + '</svg>';
const rect = (p,fill,radius,stroke) =>
  '<rect ' + numberAttrs(position(p)) + ' rx="' + radius + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '"' : '') + '/>';
const txt = (id,key,type,x,y,fill,anchor='start',outline=false) => {
  const style=typography[type];
  const outlineAttributes=outline?' paint-order="stroke" stroke="' + colors.mapLabelOutline + '" stroke-width="3" stroke-linejoin="round"':'';
  return '<text id="' + id + '" x="' + x + '" y="' + y + '" text-anchor="' + anchor + '" dominant-baseline="central" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-size="' + style.fontSize + '" font-weight="' + style.fontWeight + '" fill="' + fill + '"' + outlineAttributes + '>' + xml(strings[key]) + '</text>';
};
const group = (id,label,p,contents,role='button',extra='') =>
  '<g id="' + id + '" role="' + role + '" aria-label="' + xml(label) + '" data-target="true"' + extra + '><rect class="hit" ' + numberAttrs(position(p)) + ' fill="transparent" pointer-events="all"/>' + contents + '</g>';
const circle = (x,y,r,fill,stroke='',strokeWidth=1) =>
  '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + strokeWidth + '"' : '') + '/>';

const logo=read('assets/mapbox-logo.svg');
const medium=read('assets/Pretendard-Medium.woff2');
const bold=read('assets/Pretendard-Bold.woff2');
const preview=[];
preview.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" lang="ko" aria-labelledby="screen-title">');
preview.push('<title id="screen-title">메인 발견 지도</title>');
preview.push('<style>@font-face{font-family:Pretendard;src:url(' + data('font/woff2',medium) + ') format("woff2");font-weight:500;font-display:block}@font-face{font-family:Pretendard;src:url(' + data('font/woff2',bold) + ') format("woff2");font-weight:700;font-display:block}</style>');
preview.push(rect({x:0,y:0,width,height},colors.background,0));
preview.push('<image id="map-image" href="' + data('image/svg+xml',Buffer.from(map)) + '" x="0" y="0" width="' + width + '" height="' + height + '"/>');
preview.push(txt('map-north','north','mapLabel',260,126,colors.mapLabel,'start',true));
preview.push(txt('map-park','park','parkLabel',123,247,colors.mapLabel,'start',true));
preview.push(txt('map-river','river','riverLabel',168,500,colors.mapWaterLabel,'start',true));

for (const [suffix,key] of [['seven','Seven'],['three','Three'],['five','Five']]) {
  const p = b('record-cluster-' + suffix);
  const center = p.y + p.height / 2;
  const visual = {...position(p), y: center - layout.cluster.visibleHeight / 2, height: layout.cluster.visibleHeight};
  const badge = rect(visual,colors.observationMarkerSurface,layout.cluster.radius,colors.observationMarkerBorder)
    + circle(p.x + 12,center,2.5,colors.primary)
    + txt('label-cluster-' + suffix,'cluster' + key,'cluster',p.x + 36,center,colors.text,'middle');
  preview.push(group('cluster-' + suffix,strings['cluster' + key + 'Accessible'],p,badge));
}
preview.push('<g id="current-location">' + circle(182,307,18,colors.locationHalo) +
  circle(182,307,6,colors.location,colors.background,2) +
  txt('location-label','location','location',201,307,colors.text,'start',true) + '</g>');
preview.push('<image id="mapbox-logo" href="' + data('image/svg+xml',logo) + '" ' + numberAttrs(layout.logo) + ' aria-label="Mapbox"/>');
const attribution = b('map-attribution');
preview.push(group('attribution',strings.attribution,attribution,
  circle(352,568,14,colors.observationMarkerSurface,colors.mapPanelBorder) +
  icon('info',343,559,18,colors.textSecondary)));

const gps = b('gps');
preview.push(group('gps',strings.gps,gps,
  circle(gps.x + gps.width/2,gps.y + gps.height/2,gps.height/2 - .5,colors.observationMarkerSurface,colors.mapPanelBorder) +
  icon('locate-fixed',gps.x + 12,gps.y + 12,24,colors.location)));
const record = b('record');
preview.push(group('record',strings.record,record,
  rect(record,colors.primary,record.height / 2) +
  icon('plus',record.x + 16,record.y + 12,24,colors.onPrimary) +
  txt('record-label','record','action',record.x + 48,record.y + record.height / 2,colors.onPrimary)));
const sheet = layout.sheet;
preview.push('<path id="bottom-sheet" d="M0 ' + height + 'V' + (sheet.y + sheet.topRadius) + 'Q0 ' + sheet.y + ' ' + sheet.topRadius + ' ' + sheet.y + 'H' + (width - sheet.topRadius) + 'Q' + width + ' ' + sheet.y + ' ' + width + ' ' + (sheet.y + sheet.topRadius) + 'V' + height + 'Z" fill="' + colors.mapPanel + '" stroke="' + colors.mapPanelBorder + '"/>');
preview.push(group('sheet-handle',strings.expand,{x:0,y:sheet.y,width,height:sheet.dragHeight},rect(layout.handle,colors.sheetHandle,2)));
const search = b('search');
preview.push(group('search',strings.search,search,
  rect(search,colors.searchSurface,layout.search.radius,colors.searchBorder) +
  icon('search',search.x + 14,search.y + 12,24,colors.textPlaceholder) +
  txt('search-placeholder','search','search',search.x + 48,search.y + search.height/2,colors.textPlaceholder),'searchbox'));
preview.push('<g id="main-tabs" role="tablist" aria-label="주요 메뉴">');
for (const [suffix, key, glyph] of [['map','tabMap','map'],['community','tabCommunity','users-round'],['chat','tabChat','message-circle'],['my','tabMy','user-round']]) {
  const tab=b('tab-' + suffix);
  const selected=tab.selected === true;
  const ink = selected ? colors.primary : colors.textSecondary;
  const middle=tab.x + tab.width / 2;
  const tabBackground = selected ? rect({x:tab.x+.5,y:tab.y+.5,width:tab.width-1,height:tab.height-1},colors.activeTabSurface,layout.tab.radius,colors.activeTabBorder) : '';
  preview.push(group('tab-' + suffix,strings[key],tab,
    tabBackground + icon(glyph,middle-layout.tab.iconSize/2,layout.tab.iconY,layout.tab.iconSize,ink)
    + txt('tab-label-' + suffix,key,'tab',middle,layout.tab.labelY,ink,'middle'),
    'tab',' aria-selected="' + selected + '"'));
}
preview.push('</g>');
preview.push(rect(layout.home,colors.systemHome,2));

preview.push('<g id="system-status" aria-hidden="true">');
preview.push(txt('time','time','systemTime',24,27,colors.systemInk));
preview.push('<g fill="' + colors.systemInk + '" transform="translate(304 20)"><rect y="8" width="3" height="4" rx="1"/><rect x="4.5" y="6" width="3" height="6" rx="1"/><rect x="9" y="3" width="3" height="9" rx="1"/><rect x="13.5" width="3" height="12" rx="1"/></g>');
preview.push('<g transform="translate(327 21)" stroke="' + colors.systemInk + '" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M0 3Q7.5-3 15 3M2.8 6Q7.5 2.1 12.2 6M5.5 8.8Q7.5 7.2 9.5 8.8"/><circle cx="7.5" cy="11.1" r=".5" fill="' + colors.systemInk + '"/></g>');
preview.push('<g transform="translate(348 20)" stroke="' + colors.systemInk + '"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" opacity=".62"/><rect x="2.4" y="2.4" width="17.2" height="7.2" rx="1.4" fill="' + colors.systemInk + '" stroke="none"/><path d="M23 4.5v3" stroke-linecap="round" opacity=".62"/></g>');
preview.push('</g></svg>');
writeFileSync(local('preview.svg'),preview.join('\n') + '\n');

const sha=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const paths=['assets/map-dark.svg','assets/mapbox-logo.svg','assets/Pretendard-Medium.woff2','assets/Pretendard-Bold.woff2','assets/pretendard-OFL.txt','assets/lucide-ISC.txt'];
const manifest={
  sourceMap:{file:'design/main-map/map-background.svg',sha256:sha(originalMap),size:[390,844],treatment:'정해진 다크 지도 팔레트로 17개 색 교체. 지형과 경로 도형, 크기 유지.'},
  approvedWireframe:{file:'04-wireframes/wireframes.json',sha256:sha(readFileSync(resolve(project,'04-wireframes/wireframes.json')))},
  lucide:{package:'lucide-react-native',version:packageVersion,icons:iconFiles},
  files:paths.map((file)=>{const bytes=read(file);return {file,sha256:sha(bytes),bytes:bytes.length};}),
};
writeFileSync(local('assets-manifest.json'),JSON.stringify(manifest,null,2) + '\n');
