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
const recordEntryDesign = 'work/bugmap-record-entry-harness/05-design-system';
const approvedInputs = [
  [wireframe, '899b024b7b56c7fc93e1c72d8760d4b464890fce36ed499b4becc0daf6f853a6'],
  [cluster + '/04-wireframes/captures/main-map/cluster-selected.png', '5a665be4e91ec247073d1c9196b51c93e1d7fa593602729ef03bb066185341e7'],
  [cluster + '/04-wireframes/captures/main-map/cluster-selected-overflow.png', 'dc1a4d8d36ee0c60f721feb2b31f38de8ac4191eefaa011cd2bc75393b40cc3c'],
  [main + '/06-figma/captures/main-map-default.png', '3c391df201a8b53222204ba5594e87db41ca6ce24f2b103d50ae5cd54ede9b2c'],
  [mainDesign + '/tokens.json', '1dc4c4ef4a3d94ffe91a66af610a3e56c3712ed860f433cacdaeb776c805d76d'],
];
for (const [file, expected] of approvedInputs) {
  if (sha(read(file)) !== expected) throw new Error('Source changed: ' + file);
}
const { screens } = json(wireframe);
const { width, height, safeArea, sourceCamera } = screens[0];
const bounds = ({ x, y, width, height }) => ({ x, y, width, height });
const fromNearby = json(nearbyDesign + '/photo-sources.json').photos;
const specimen = json(recordEntryDesign + '/photo-sources.json').photos.find((photo) => photo.id === 'specimen-1');
const butterflies = JSON.parse(readLocal('butterfly-sources.json'));
const sourcePhotos = [...fromNearby, specimen, ...butterflies];
const photos = new Map(sourcePhotos.map((photo) => [photo.id, photo]));
for (const photo of sourcePhotos) {
  const { path, dimensions, bytes, sha256 } = photo.preview;
  const localButterfly = butterflies.includes(photo);
  const source = localButterfly ? photo.original.url
    : (photo === specimen ? recordEntryDesign : nearbyDesign) + '/' + path;
  const metadata = { dimensions, license: photo.license, author: photo.author, title: photo.title };
  const file = localButterfly ? { file: path, source, sha256, bytes, ...metadata }
    : asset(path, source, photo.preview, metadata);
  const buffer = readLocal(path);
  if (sha(buffer) !== sha256 || buffer.length !== bytes ||
      buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
      buffer.readUInt32BE(16) !== dimensions.width ||
      buffer.readUInt32BE(20) !== dimensions.height) throw new Error('Invalid photo asset: ' + path);
  files.push(file);
}

const base = json(mainDesign + '/tokens.json');
const { colors, typography } = base;
for (const key of ['textPlaceholder', 'searchSurface', 'searchBorder', 'activeTabSurface', 'activeTabBorder', 'sheetHandle']) delete colors[key];
delete typography.tab;
delete typography.search;
delete typography.action;
colors.recordRow = '#192B20';
colors.controlFill = '#26342D';
colors.focusRing = colors.location;
colors.pressedSurface = colors.mapMinorRoad;
const font = (fontSize, fontWeight, lineHeight) => ({ fontFamily: 'Pretendard', fontSize, fontWeight, lineHeight });
Object.assign(typography, { panelTitle: font(24, 700, 32), recordName: font(18, 700, 24), recordDate: font(14, 500, 20) });
const layout = {
  viewport: { width, height }, safeArea, minimumTouchTarget: base.layout.minimumTouchTarget, sourceCamera,
  row: { minimumHeight: 104, gap: 8, inset: 12, radius: 16, photoSize: 80, photoRadius: 12, textGap: 12, iconSize: 20 },
  cluster: { ...base.layout.cluster, selectedOutline: { radius: 24, strokeWidth: 2 } },
  home: base.layout.home, states: {},
};
const states = [];
for (const screen of screens) {
  const blocks = Object.fromEntries(screen.blocks.map((block) => [block.id, block]));
  const overflow = screen.state === 'cluster-selected-overflow';
  const ids = overflow ? ['ladybird', 'white', 'specimen-1', 'yellow', 'dragonfly', 'stag-beetle', 'swallowtail'] : ['stag-beetle', 'dragonfly', 'ladybird'];
  const records = screen.recordList?.records ?? blocksForShortList(blocks);
  if (records.length !== ids.length || new Set(ids).size !== ids.length) throw new Error('Missing or duplicate photo');
  const rows = records.map(({ discoveredDate: discoveryDate, ...record }, n) => ({
    ...record, discoveryDate, photoId: ids[n],
    accessibleName: record.accessibleName ?? record.name + ', ' + discoveryDate + ' 발견, 기록 열기',
    prototype: 'spec-only',
  }));
  const panel = blocks['cluster-panel'];
  const title = blocks['cluster-panel-title'];
  const close = blocks['cluster-panel-close'];
  const first = rows[0].rowBoundsAtStart;
  const viewport = screen.recordList?.viewport ?? { ...first, height: height - safeArea.bottom - first.y, clip: true };
  const stateLayout = {
    panel: { ...bounds(panel), topRadius: panel.topRadius, bottomRadius: 0 },
    title: { ...bounds(title), x: first.x, width: Math.min(title.width, close.x - first.x - 12) },
    close: { ...bounds(close), visibleSize: 38, iconSize: 22 },
    listViewport: viewport,
    selectedOutline: bounds(blocks['selected-marker-outline']),
    logo: { ...base.layout.logo, x: 12, y: panel.y - 34 },
    attribution: bounds(blocks['map-attribution']),
    selectedMarker: overflow ? 'record-cluster-seven' : 'record-cluster-three',
    headerOutsideScroll: ['cluster-panel-title', 'cluster-panel-close'],
    ...(overflow ? {
      initialVisible: screen.recordList.initialVisible,
      scrollEnd: screen.recordList.scrollEnd,
      exactFourHtmlValidation: screen.recordList.exactFourHtmlValidation,
    } : {}),
  };
  layout.states[screen.state] = stateLayout;
  states.push({ screen, blocks, overflow, layout: stateLayout, rows, title: title.text });
}
function blocksForShortList(blocks) {
  return Object.values(blocks).filter((block) => block.recordId).map((row, n) => ({
    order: n + 1, recordId: row.recordId, detailRecordId: row.detailRecordId,
    name: blocks[row.recordId + '-text-1'].text,
    discoveredDate: blocks[row.recordId + '-text-2'].text,
    publicCoordinateGroup: row.publicCoordinateGroup,
    rowBoundsAtStart: bounds(row),
    thumbnailBoundsAtStart: bounds(blocks[row.recordId + '-photo']),
    accessibleName: row.accessibleName,
  }));
}

const tokenKeys = (kind, names) => names.map((name) => kind + '.' + name);
const component = (description, colorNames, fontNames, states) => ({
  description, tokens: [...tokenKeys('colors', colorNames), ...tokenKeys('typography', fontNames.map((name) => name + '.fontSize'))], states,
});
const variants = states.map(({ screen }) => screen.state);
const components = {
  map: component('기존 지도 카메라와 서울숲 모식도 벡터를 재사용한다. 지역명과 현재 위치는 개별 레이어로 유지한다.', ['background', 'mapLand', 'mapWater', 'mapPark', 'mapLabel', 'mapWaterLabel', 'mapLabelOutline', 'location', 'locationHalo', 'text'], ['mapLabel', 'parkLabel', 'riverLabel', 'location'], variants),
  clusterMarker: component('기록과 집계 값을 한 줄에 배치한다. 선택 상태는 칩 바깥 2px primary 윤곽과 접근성 선택 상태로 전달한다. 키보드 포커스는 칩의 안쪽 가장자리에서 2px 띄운 2px focusRing 선으로 표시한다. 선택과 포커스가 함께 있을 때 두 선 사이의 어두운 간격이 보인다. 카메라, 중심, 조작 영역은 그대로다.', ['observationMarkerSurface', 'observationMarkerBorder', 'text', 'primary', 'focusRing', 'mapLabelOutline'], ['cluster'], ['default', 'selected', 'focus-visible']),
  mapAttribution: component('공식 Mapbox 로고와 44 × 44px 출처 조작부를 패널 위 지도에 배치한다. 포커스가 보일 때는 28px 시각 면의 바깥에 2px focusRing을 그려 조작 영역 안에 유지한다. 기존 출처 흐름이 있는 경우 재사용한다.', ['observationMarkerSurface', 'mapPanelBorder', 'textSecondary', 'focusRing'], [], ['default', 'focus-visible']),
  clusterPanel: component('메인 지도 패널에서 표면·외곽선·상단 모서리 32px를 재사용한다. 하단 두 모서리는 0px다. 390 × 844에서 3건은 448px, 7건 시연은 468px 높이다. 제목과 닫기는 목록 스크롤 영역 바깥에 고정한다. 좁은 화면이나 큰 글자에서는 제목이 줄바꿈되어도 닫기 영역과 지도가 보이도록 배치한다.', ['mapPanel', 'mapPanelBorder', 'text', 'systemHome'], ['panelTitle'], variants),
  closeButton: component('38px 원형 면과 22px X를 48 × 48px 조작 영역에 둔다. 포커스가 보일 때는 원형 면 바깥에 2px focusRing을 그려 조작 영역 안에 유지한다. 누르는 동안 원형 면의 채움만 pressedSurface로 바꾸고 X의 색과 크기를 유지한다. 닫을 때 같은 지도로 돌아가 진입 마커 초점을 복원한다.', ['controlFill', 'text', 'focusRing', 'pressedSurface'], [], ['default', 'focus-visible', 'pressed']),
  recordList: component('목록만 세로로 스크롤한다. 390 × 844의 기본 글자 크기에서 3건은 세 행 전체를 보여 준다. 4건 이상은 첫 세 행과 네 번째 행 상단 26px를 보여 준다. 목록이 끝나면 마지막 행 전체가 하단 안전 영역 위에 보인다. 다른 묶음을 열면 목록을 맨 위로 되돌린다.', ['mapPanel', 'recordRow'], [], variants),
  recordRow: component('기본 높이 104px, 간격 8px의 행에 80px 사진, Pretendard 18px Bold 이름, 실제 발견 날짜와 이동 아이콘을 놓는다. 행 모서리 16px와 행 안의 사진 모서리 12px는 간격이 좁은 이 목록의 배치 값이다. 포커스가 보일 때 행 안쪽 가장자리에서 2px 띄운 2px focusRing을 그린다. 누르는 동안 행의 채움만 pressedSurface로 바꾸고 이름·날짜·아이콘 색을 유지한다. 좁은 화면이나 큰 글자에서는 이름을 줄바꿈하고 행을 늘린다. 좌표가 같아도 행마다 자신의 기록 ID로 사진과 메모가 있는 상세에 대응한다.', ['recordRow', 'text', 'textSecondary', 'focusRing', 'pressedSurface'], ['recordName', 'recordDate'], ['default', 'focus-visible', 'pressed']),
};
const [{ blocks }] = states;
const strings = {
  titleThree: states[0].title, titleSeven: states[1].title, titleFormat: '이 주변 관찰 기록 {count}건',
  close: blocks['cluster-panel-close'].accessibleName, attribution: blocks['map-attribution'].accessibleName,
  mapboxLogo: 'Mapbox', north: blocks['map-label-north'].text, park: blocks['map-label-park'].text,
  river: blocks['map-label-river'].text, currentLocation: blocks['location-label'].text,
  time: blocks['system-time'].text, markerFormat: '기록 {count}',
  markerSeven: blocks['record-cluster-seven-label'].text, markerThree: blocks['record-cluster-three-label'].text,
  unknownName: '이름 모름',
};
for (const { rows } of states) {
  for (const { recordId, name, discoveryDate, accessibleName } of rows) {
    strings[recordId + '-name'] = name;
    strings[recordId + '-date'] = discoveryDate;
    strings[recordId + '-accessible'] = accessibleName;
  }
}
const typographyFallback = { figma: 'Noto Sans KR', weights: [500, 700], localCapture: 'Pretendard 1.3.9' };
writeJson('tokens.json', { colors, typography, typographyFallback, layout });
writeJson('components.json', components);
writeJson('copy.json', { strings, forbidden: ['유전자 검사로 확인', '정확도 98%', '무조건 성공', '실시간 동정'] });
writeJson('photo-sources.json', { sourceCheckedOn: '2026-11-24', photos: sourcePhotos, usage: states.map(({ screen, rows }) => ({ state: screen.state, records: rows })) });

const iconReasons = { x: strings.close, 'chevron-right': '해당 기록 열기', info: strings.attribution };
const iconNames = Object.keys(iconReasons);
const lucide = { package: 'lucide-react-native', version: json('node_modules/lucide-react-native/package.json').version, icons: iconNames };
writeJson('assets-manifest.json', {
  sourceMap,
  inputs: approvedInputs.map(([file, sha256]) => ({ file, sha256 })),
  approvedWireframeId: '8e2b077c-4a3f-487c-bf67-ec2065e5d019',
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
const statusBars = [4, 6, 9, 12].map((h, i) => rect({ x: 304 + i * 4.5, y: 32 - h, width: 3, height: h }, colors.systemInk, 1)).join('');
const status = group('system-status',
  text('system-time', 'time', 'systemTime', 24, 27, colors.systemInk)
  + statusBars + path('system-wifi', 'M327 24 Q334.5 18 342 24 M329.8 27 Q334.5 23.1 339.2 27 M332.5 29.8 Q334.5 28.2 336.5 29.8', 'none', colors.systemInk, 1.8)
  + circle(334.5, 32.1, .85, colors.systemInk)
  + rect({ x: 348.5, y: 20.5, width: 21, height: 11 }, 'none', 3, colors.systemInk)
  + rect({ x: 350.4, y: 22.4, width: 17.2, height: 7.2 }, colors.systemInk, 1.4)
  + path('system-battery-terminal', 'M371 24.5v3', 'none', colors.systemInk),
  { 'aria-hidden': true, 'stroke-linecap': 'round' });
const labelHalo = { 'paint-order': 'stroke', stroke: colors.mapLabelOutline, 'stroke-width': 3, 'stroke-linejoin': 'round' };
const fontsOnDisk = [[500, 'Medium'], [700, 'Bold']].map(([weight, style]) =>
  '@font-face{font-family:Pretendard;src:url(assets/Pretendard-' + style + '.woff2) format("woff2");font-weight:' + weight + ';font-display:block}').join('\n');

for (const { screen, blocks, overflow, layout: stateLayout, rows } of states) {
  const marker = (label, word) => {
    const id = 'record-cluster-' + word;
    const b = blocks[id];
    const selected = id === stateLayout.selectedMarker;
    const y = b.y + b.height / 2;
    const { visibleHeight, radius, selectedOutline } = layout.cluster;
    const outline = selected
      ? rect(stateLayout.selectedOutline, 'none', selectedOutline.radius, colors.primary, {
        id: 'selected-marker-outline', 'stroke-width': selectedOutline.strokeWidth,
      }) : '';
    return target(id, b.accessibleName, b,
      outline + rect({ ...bounds(b), y: y - visibleHeight / 2, height: visibleHeight }, colors.observationMarkerSurface, radius,
        selected ? colors.primary : colors.observationMarkerBorder)
      + circle(b.x + 12, y, 2.5, colors.primary)
      + text(id + '-label', label, 'cluster', b.x + 36, y, colors.text, { 'text-anchor': 'middle' }),
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
    + marker('markerSeven', 'seven') + marker('markerThree', 'three'));

  const attribution = stateLayout.attribution;
  const attrX = attribution.x + attribution.width / 2;
  const attrY = attribution.y + attribution.height / 2;
  const controls = group('map-controls',
    image('mapbox-logo', stateLayout.logo, 'assets/mapbox-logo.svg', { 'aria-label': strings.mapboxLogo })
    + target('map-attribution', strings.attribution, attribution,
      circle(attrX, attrY, 14, colors.observationMarkerSurface, colors.mapPanelBorder)
      + icon('info', attrX - 9, attrY - 9, 18, colors.textSecondary)));

  const { radius, photoRadius, textGap, iconSize } = layout.row;
  const rowLayers = rows.map(({ recordId, detailRecordId, publicCoordinateGroup, accessibleName, photoId, rowBoundsAtStart: row, thumbnailBoundsAtStart: thumb }) => {
    const crop = recordId + '-crop';
    const clip = el('clipPath', { id: crop }, rect(thumb, '#fff', photoRadius));
    const copyX = thumb.x + thumb.width + textGap;
    return target(recordId + '-row', accessibleName, row,
      rect(row, colors.recordRow, radius) + clip
      + image(recordId + '-photo', thumb, photos.get(photoId).preview.path, {
        'clip-path': 'url(#' + crop + ')', 'aria-hidden': true,
        'data-photo': photoId, preserveAspectRatio: 'xMidYMid slice',
      })
      + text(recordId + '-text-1', recordId + '-name', 'recordName', copyX, row.y + 41, colors.text)
      + text(recordId + '-text-2', recordId + '-date', 'recordDate', copyX, row.y + 65, colors.textSecondary)
      + icon('chevron-right', row.x + row.width - iconSize - 14, row.y + (row.height - iconSize) / 2, iconSize, colors.textSecondary),
      { 'data-record-id': recordId, 'data-detail-id': detailRecordId, 'data-public-coordinate-group': publicCoordinateGroup });
  });
  const clipping = el('clipPath', { id: 'record-list-viewport' }, rect(bounds(stateLayout.listViewport), '#fff'));
  const { y, topRadius: r } = stateLayout.panel;
  const panelShape = 'M0 ' + height + ' V' + (y + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + y
    + ' H' + (width - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + width + ' ' + (y + r) + ' V' + height + ' Z';
  const { close, title } = stateLayout;
  const closeX = close.x + close.width / 2;
  const closeY = close.y + close.height / 2;
  const panel = group('cluster-panel',
    path('cluster-panel-surface', panelShape, colors.mapPanel, colors.mapPanelBorder)
    + text('cluster-panel-title', overflow ? 'titleSeven' : 'titleThree', 'panelTitle', title.x, closeY, colors.text)
    + target('cluster-panel-close', strings.close, close,
      circle(closeX, closeY, close.visibleSize / 2, colors.controlFill)
      + icon('x', closeX - close.iconSize / 2, closeY - close.iconSize / 2, close.iconSize, colors.text))
    + clipping + group('record-list', rowLayers.join('\n'), { 'clip-path': 'url(#record-list-viewport)' })
    + rect(layout.home, colors.systemHome, 2, 'none', { id: 'home-indicator', 'aria-hidden': true }),
    { role: 'region', 'aria-labelledby': 'cluster-panel-title' });
  const preview = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xml:lang="ko" aria-labelledby="screen-title">',
    el('title', { id: 'screen-title' }, escape(screen.title)),
    '<style>' + fontsOnDisk + '</style>', map, controls, panel, status, '</svg>',
  ];
  write(overflow ? 'preview-overflow.svg' : 'preview.svg', preview.join('\n'));
}
