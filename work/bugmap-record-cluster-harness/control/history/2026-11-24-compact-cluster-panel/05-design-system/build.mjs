import { createHash } from 'node:crypto';
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
const local = (path) => new URL(path, import.meta.url);
const remote = (path) => join(repo, path);
const read = (path) => readFileSync(remote(path));
const readLocal = (path) => readFileSync(local(path));
const json = (path) => JSON.parse(read(path));
const write = (path, content) => writeFileSync(local(path), content + '\n');
const writeJson = (path, content) => write(path, JSON.stringify(content, null, 2));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const cluster = 'work/bugmap-record-cluster-harness';
const main = 'work/bugmap-main-map-harness';
const nearby = 'work/bugmap-nearby-discoveries-harness';
const mainDesign = main + '/05-design-system';
const nearbyDesign = nearby + '/05-design-system';
const wireframe = cluster + '/04-wireframes/wireframes.json';
const approvedInputs = [
  [wireframe, '600c9b37a99101d3348f7fe1d739811a6efea9902b35602b3872870ccc612d85'],
  [cluster + '/04-wireframes/captures/main-map/cluster-selected.png', '1595d6629dd3d755f6cd79d4587598e44c123426744244a46938ea9e4f326026'],
  [main + '/06-figma/captures/main-map-default.png', '3c391df201a8b53222204ba5594e87db41ca6ce24f2b103d50ae5cd54ede9b2c'],
  [mainDesign + '/tokens.json', '1dc4c4ef4a3d94ffe91a66af610a3e56c3712ed860f433cacdaeb776c805d76d'],
];
for (const [path, expected] of approvedInputs) {
  if (sha(read(path)) !== expected) throw new Error('Source changed: ' + path);
}
const { screens: [screen] } = json(wireframe);
const { width, height, safeArea } = screen;
const blocks = Object.fromEntries(screen.blocks.map((block) => [block.id, block]));
const bounds = ({ x, y, width, height }) => ({ x, y, width, height });
const asset = (path, source, expected, metadata = {}) => {
  const bytes = read(source);
  if (sha(bytes) !== expected.sha256 || bytes.length !== expected.bytes) {
    throw new Error('Asset differs from source manifest: ' + source);
  }
  cpSync(remote(source), local(path));
  return { file: path, source, sha256: sha(bytes), bytes: bytes.length, ...metadata };
};
const { files: mapAssets, sourceMap } = json(mainDesign + '/assets-manifest.json');
const files = mapAssets.map((definition) => asset(definition.file, mainDesign + '/' + definition.file, definition));
const photoById = Object.fromEntries(json(nearbyDesign + '/photo-sources.json').photos.map((photo) => [photo.id, photo]));
const rows = Object.entries({ 'record-demo-01': 'stag-beetle', 'record-demo-02': 'dragonfly', 'record-demo-03': 'ladybird' }).map(([id, photoId]) => {
  const { recordId, detailRecordId, publicCoordinateGroup, accessibleName, prototype } = blocks[id + '-row'];
  return {
    recordId, detailRecordId, publicCoordinateGroup, accessibleName, prototype,
    name: blocks[id + '-text-1'].text,
    discoveryDate: blocks[id + '-text-2'].text,
    photo: photoById[photoId],
  };
});
for (const { recordId, photo } of rows) {
  const path = photo.preview.path;
  const bytes = read(nearbyDesign + '/' + path);
  const dimensions = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
      dimensions.width !== photo.preview.dimensions.width || dimensions.height !== photo.preview.dimensions.height) {
    throw new Error('PNG size differs from source manifest: ' + path);
  }
  files.push(asset(path, nearbyDesign + '/' + path, photo.preview, { recordId, dimensions, license: photo.license }));
}

const base = json(mainDesign + '/tokens.json');
const { colors, typography } = base;
for (const key of ['textPlaceholder', 'searchSurface', 'searchBorder', 'activeTabSurface', 'activeTabBorder', 'sheetHandle']) delete colors[key];
delete typography.tab;
delete typography.search;
colors.recordRow = '#192B20';
colors.controlFill = '#26342D';
const font = (fontSize, fontWeight, lineHeight) => ({ fontFamily: 'Pretendard', fontSize, fontWeight, lineHeight });
Object.assign(typography, { panelTitle: font(20, 700, 26), recordName: font(15, 700, 20), recordDate: font(12, 500, 17) });
const layout = {
  viewport: { width, height }, safeArea, minimumTouchTarget: base.layout.minimumTouchTarget,
  sourceCamera: screen.sourceCamera,
  panel: { ...bounds(blocks['cluster-panel']), topRadius: blocks['cluster-panel'].topRadius, bottomRadius: 0, titleX: 20 },
  close: { ...bounds(blocks['cluster-panel-close']), visibleSize: 32, iconSize: 18 },
  row: { radius: 12, minimumHeight: 51, gap: 3, photoRadius: 8, textX: 76, textMaxWidth: 254, iconSize: 18 },
  cluster: { ...base.layout.cluster, selectedOutline: { ...bounds(blocks['selected-marker-outline']), radius: 24, strokeWidth: 2 } },
  logo: { ...base.layout.logo, y: base.layout.logo.y - 64 },
  attribution: bounds(blocks['map-attribution']), gps: bounds(blocks.gps), record: bounds(blocks.record),
  home: base.layout.home,
};
const tokenKeys = (kind, names) => names.map((name) => kind + '.' + name);
const component = (description, colorNames, fontNames, states) => ({
  description, tokens: [...tokenKeys('colors', colorNames), ...tokenKeys('typography', fontNames.map((name) => name + '.fontSize'))], states,
});
const components = {
  map: component('기존 지도 카메라와 모식도 벡터를 재사용한다. 지역명과 현재 위치의 텍스트를 개별 레이어로 유지한다.', ['background', 'mapLand', 'mapWater', 'mapPark', 'mapLabel', 'mapWaterLabel', 'mapLabelOutline', 'location', 'locationHalo', 'text'], ['mapLabel', 'parkLabel', 'riverLabel', 'location'], ['cluster-selected']),
  clusterMarker: component('기록과 집계 값을 한 줄에 두고, 선택 상태는 2px 외곽선과 접근성 선택 상태로 전달한다. 같은 카메라에서 중심을 유지한다.', ['observationMarkerSurface', 'observationMarkerBorder', 'text', 'primary', 'mapLabelOutline'], ['cluster'], ['default', 'selected', 'focus-visible']),
  mapAttribution: component('공식 Mapbox 로고와 44 × 44px 출처 컨트롤을 지도 위에 표시한다. 기존 출처 흐름이 있는 경우 재사용한다.', ['observationMarkerSurface', 'mapPanelBorder', 'textSecondary'], [], ['default', 'focus-visible']),
  mapActions: component('기존 GPS와 기록 작성 조작부를 승인된 좌표에 두고 각각 48px 높이를 사용한다. 대표 화면에서 GPS는 내 위치 아이콘, 작성은 더하기 아이콘과 문구를 표시한다.', ['observationMarkerSurface', 'mapPanelBorder', 'location', 'primary', 'onPrimary'], ['action'], ['inherited']),
  clusterPanel: component('상단 좌우 32px, 하단 모서리 0px의 패널이다. 제목, 닫기와 세 기록을 포함한다. 글자가 커지면 제목과 행을 줄바꿈·확장하고 닫기와 출처를 확보하며 목록을 스크롤한다.', ['mapPanel', 'mapPanelBorder', 'text', 'systemHome'], ['panelTitle'], ['selected']),
  closeButton: component('X 아이콘은 32px 원형 면에 표시한다. 44 × 44px 전체를 누를 수 있게 하고 초점이 보이도록 한다. 닫으면 같은 지도 카메라에서 기존 탐색 상태와 진입 마커 초점을 복원한다.', ['controlFill', 'text', 'primary'], [], ['default', 'focus-visible', 'pressed']),
  recordRow: component('44px 썸네일 옆에 이름과 실제 발견 날짜를 세로로 놓고 오른쪽에 이동 화살표를 표시한다. 기본 행 높이는 51px이다. 각 행은 자체 기록 ID로 사진과 메모 상세에 대응한다. 긴 이름과 날짜는 가변 높이에서 모두 읽을 수 있다.', ['recordRow', 'text', 'textSecondary', 'primary'], ['recordName', 'recordDate'], ['default', 'focus-visible', 'pressed']),
};
const strings = {
  title: blocks['cluster-panel-title'].text, titleFormat: '이 주변 관찰 기록 {count}건',
  close: blocks['cluster-panel-close'].accessibleName, attribution: blocks['map-attribution'].accessibleName,
  gps: blocks.gps.accessibleName, record: blocks.record.accessibleName, mapboxLogo: 'Mapbox',
  north: blocks['map-label-north'].text, park: blocks['map-label-park'].text, river: blocks['map-label-river'].text,
  currentLocation: '내 위치', time: blocks['system-time'].text, markerFormat: '기록 {count}',
  markerSeven: '기록 7', markerThree: '기록 3', markerFive: '기록 5',
  markerSevenAccessible: blocks['record-cluster-seven'].accessibleName,
  markerThreeAccessible: blocks['record-cluster-three'].accessibleName,
  markerFiveAccessible: blocks['record-cluster-five'].accessibleName,
  ...Object.fromEntries(rows.flatMap(({ name, discoveryDate, accessibleName }, n) =>
    [['name' + (n + 1), name], ['date' + (n + 1), discoveryDate], ['recordAccessible' + (n + 1), accessibleName]],
  )),
};
const typographyFallback = { figma: 'Noto Sans KR', weights: [500, 700], localCapture: 'Pretendard 1.3.9' };
writeJson('tokens.json', { colors, typography, typographyFallback, layout });
writeJson('components.json', components);
writeJson('copy.json', { strings, forbidden: ['유전자 검사로 확인', '정확도 98%', '무조건 성공', '실시간 동정'] });
writeJson('photo-sources.json', {
  source: nearbyDesign + '/photo-sources.json',
  sourceCheckedOn: '2026-11-24',
  photos: rows.map(({ photo, ...record }) => ({ ...record, ...photo, name: record.name, sourceName: photo.name })),
});

const iconReasons = { x: '주변 관찰 기록 닫기', 'chevron-right': '해당 기록 열기', 'locate-fixed': strings.gps, plus: strings.record, info: strings.attribution };
const iconNames = Object.keys(iconReasons);
const lucide = { package: 'lucide-react-native', version: json('node_modules/lucide-react-native/package.json').version, icons: iconNames };
writeJson('assets-manifest.json', {
  sourceMap,
  inputs: approvedInputs.map(([file, sha256]) => ({ file, sha256 })),
  approvedWireframeId: 'ebec90a2-123f-46c4-88c1-b0979cdeccbe',
  lucide,
  files,
});
write('icons.csv', ['name,purpose,catalog_url', ...iconNames.map((name) => name + ',' + iconReasons[name] + ',https://lucide.dev/icons/' + name)].join('\n'));

const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const attrs = (values) => Object.entries(values).map(([key, value]) => key + '="' + escape(value) + '"').join(' ');
const el = (tag, values, content) => '<' + tag + ' ' + attrs(values) + (content === undefined ? '/>' : '>' + content + '</' + tag + '>');
const rect = (box, fill, radius = 0, stroke = 'none', extra = {}) => el('rect', { ...box, rx: radius, fill, stroke, ...extra });
const circle = (cx, cy, r, fill, stroke = 'none', strokeWidth = 1) => el('circle', { cx, cy, r, fill, stroke, 'stroke-width': strokeWidth });
const path = (id, d, fill, stroke = 'none', strokeWidth = 1) => el('path', { id, d, fill, stroke, 'stroke-width': strokeWidth });
const text = (id, key, style, x, y, fill, extra = {}) => {
  const f = typography[style];
  return el('text', { id, x, y, fill, 'data-copy': key, 'data-type': style,
    'font-family': 'Pretendard, sans-serif', 'font-size': f.fontSize, 'font-weight': f.fontWeight,
    'dominant-baseline': 'central', ...extra }, escape(strings[key]));
};
const group = (id, content, extra = {}) => el('g', { id, ...extra }, content);
const target = (id, label, box, content, extra = {}) => group(id,
  rect(bounds(box), 'transparent', 0, 'none', { class: 'hit', 'pointer-events': 'all' }) + content,
  { role: 'button', 'aria-label': label, 'data-target': 'true', ...extra });
const uri = (mime, file) => 'data:' + mime + ';base64,' + readLocal(file).toString('base64');
const image = (id, box, file, extra = {}) => el('image', { id, ...box, href: uri(file.endsWith('.png') ? 'image/png' : 'image/svg+xml', file), ...extra });
const glyphs = Object.fromEntries(iconNames.map((name) => {
  const module = read('node_modules/lucide-react-native/dist/cjs/icons/' + name + '.js').toString();
  const definition = module.match(/const __iconData = (\{[\s\S]+?\});/);
  if (!definition) throw new Error('Missing Lucide definition: ' + name);
  const { node } = runInNewContext('(' + definition[1] + ')', Object.create(null), { timeout: 100 });
  return [name, node.map(([tag, { key, ...values }]) => el(tag, values)).join('')];
}));
const icon = (name, x, y, size, stroke) => el('svg', {
  x, y, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke,
  'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true,
  'data-icon': name,
}, glyphs[name]);
const labelHalo = { 'paint-order': 'stroke', stroke: colors.mapLabelOutline, 'stroke-width': 3, 'stroke-linejoin': 'round' };
const marker = (word, selected) => {
  const name = word[0].toUpperCase() + word.slice(1);
  const id = 'record-cluster-' + word;
  const b = blocks[id];
  const y = b.y + b.height / 2;
  const { visibleHeight, radius, selectedOutline } = layout.cluster;
  const outline = selected
    ? rect(bounds(selectedOutline), 'none', selectedOutline.radius, colors.primary, {
      id: 'selected-marker-outline', 'stroke-width': selectedOutline.strokeWidth,
    })
    : '';
  return target(id, strings['marker' + name + 'Accessible'], b,
    outline + rect({ ...bounds(b), y: y - visibleHeight / 2, height: visibleHeight }, colors.observationMarkerSurface, radius, selected ? colors.primary : colors.observationMarkerBorder)
    + circle(b.x + 12, y, 2.5, colors.primary)
    + text(id + '-label', 'marker' + name, 'cluster', b.x + 36, y, colors.text, { 'text-anchor': 'middle' }),
    { 'aria-pressed': selected, 'data-center': (b.x + b.width / 2) + ',' + y });
};
const map = group('map-content',
  rect({ x: 0, y: 0, width, height }, colors.background)
  + image('map-vector', { x: 0, y: 0, width, height }, 'assets/map-dark.svg', { 'aria-hidden': true })
  + text('map-label-north', 'north', 'mapLabel', 260, 126, colors.mapLabel, labelHalo)
  + text('map-label-park', 'park', 'parkLabel', 123, 247, colors.mapLabel, labelHalo)
  + text('map-label-river', 'river', 'riverLabel', 168, 500, colors.mapWaterLabel, labelHalo)
  + group('current-location', circle(182, 307, 18, colors.locationHalo) + circle(182, 307, 6, colors.location, colors.background, 2)
      + text('current-location-label', 'currentLocation', 'location', 201, 307, colors.text, labelHalo))
  + marker('seven', false) + marker('three', true) + marker('five', false));
const controls = group('map-controls',
  image('mapbox-logo', layout.logo, 'assets/mapbox-logo.svg', { 'aria-label': strings.mapboxLogo })
  + target('map-attribution', strings.attribution, layout.attribution,
    circle(352, 504, 14, colors.observationMarkerSurface, colors.mapPanelBorder) + icon('info', 343, 495, 18, colors.textSecondary))
  + target('gps', strings.gps, layout.gps,
    circle(40, 560, 23.5, colors.observationMarkerSurface, colors.mapPanelBorder) + icon('locate-fixed', 28, 548, 24, colors.location))
  + target('record', strings.record, layout.record, rect(layout.record, colors.primary, 24)
    + icon('plus', 206, 548, 24, colors.onPrimary) + text('record-label', 'record', 'action', 238, 560, colors.onPrimary)));
const rowLayers = rows.map(({ recordId, detailRecordId, publicCoordinateGroup, accessibleName, photo }, n) => {
  const id = recordId + '-row';
  const b = blocks[id];
  const thumb = bounds(blocks[recordId + '-photo']);
  const clip = el('clipPath', { id: recordId + '-crop' }, rect(thumb, '#fff', layout.row.photoRadius));
  return target(id, accessibleName, b,
    rect(bounds(b), colors.recordRow, layout.row.radius) + clip
    + image(recordId + '-photo', thumb, photo.preview.path, { 'clip-path': 'url(#' + recordId + '-crop)', 'aria-hidden': true, 'data-photo': photo.id })
    + text(recordId + '-text-1', 'name' + (n + 1), 'recordName', layout.row.textX, b.y + 16, colors.text)
    + text(recordId + '-text-2', 'date' + (n + 1), 'recordDate', layout.row.textX, b.y + 35, colors.textSecondary)
    + icon('chevron-right', 343, b.y + 16.5, layout.row.iconSize, colors.textSecondary),
    { 'data-record-id': recordId, 'data-detail-id': detailRecordId, 'data-public-coordinate-group': publicCoordinateGroup });
});
const panel = group('cluster-panel',
  path('cluster-panel-surface', 'M0 844 V624 A32 32 0 0 1 32 592 H358 A32 32 0 0 1 390 624 V844 Z', colors.mapPanel)
  + path('cluster-panel-border', 'M.5 844 V624 A31.5 31.5 0 0 1 32 592.5 H358 A31.5 31.5 0 0 1 389.5 624 V844', 'none', colors.mapPanelBorder)
  + text('cluster-panel-title', 'title', 'panelTitle', layout.panel.titleX, 618, colors.text)
  + target('cluster-panel-close', strings.close, layout.close,
    circle(352, 618, layout.close.visibleSize / 2, colors.controlFill) + icon('x', 343, 609, layout.close.iconSize, colors.text))
  + group('record-list', rowLayers.join('\n'))
  + rect(layout.home, colors.systemHome, 2, 'none', { id: 'home-indicator', 'aria-hidden': true }),
  { role: 'region', 'aria-labelledby': 'cluster-panel-title' });
const statusBars = [4, 6, 9, 12].map((h, i) => rect({ x: 304 + i * 4.5, y: 32 - h, width: 3, height: h }, colors.systemInk, 1)).join('');
const status = group('system-status',
  text('system-time', 'time', 'systemTime', 24, 27, colors.systemInk)
  + statusBars + path('system-wifi', 'M327 24 Q334.5 18 342 24 M329.8 27 Q334.5 23.1 339.2 27 M332.5 29.8 Q334.5 28.2 336.5 29.8', 'none', colors.systemInk, 1.8)
  + circle(334.5, 32.1, .85, colors.systemInk)
  + rect({ x: 348.5, y: 20.5, width: 21, height: 11 }, 'none', 3, colors.systemInk)
  + rect({ x: 350.4, y: 22.4, width: 17.2, height: 7.2 }, colors.systemInk, 1.4)
  + path('system-battery-terminal', 'M371 24.5v3', 'none', colors.systemInk),
  { 'aria-hidden': true, 'stroke-linecap': 'round' });
const fonts = [[500, 'Medium'], [700, 'Bold']].map(([weight, style]) =>
  '@font-face{font-family:Pretendard;src:url(' + uri('font/woff2', 'assets/Pretendard-' + style + '.woff2') + ') format("woff2");font-weight:' + weight + ';font-display:block}').join('\n');
const preview = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xml:lang="ko" aria-labelledby="screen-title">',
  el('title', { id: 'screen-title' }, escape(screen.title)),
  '<style>' + fonts + '</style>', map, controls, panel, status, '</svg>',
];
write('preview.svg', preview.join('\n'));
