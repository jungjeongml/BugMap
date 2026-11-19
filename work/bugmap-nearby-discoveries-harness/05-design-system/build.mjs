import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
const local = (path) => new URL(path, import.meta.url);
const read = (path) => readFileSync(local(path));
const { colors, typography, layout } = JSON.parse(read('tokens.json'));
const { strings } = JSON.parse(read('copy.json'));
const { width, height } = layout.viewport;
const wireframePath = 'work/bugmap-nearby-discoveries-harness/04-wireframes/wireframes.json';
const wireframe = readFileSync(resolve(repo, wireframePath));
const { screens } = JSON.parse(wireframe);
const variants = {
  default: { filename: 'preview.svg', countKey: 'countDefault' },
  'radius-3km': { filename: 'preview-radius-3km.svg', countKey: 'countRadius3km' },
};
const records = {
  'stag-beetle': { key: 'stagBeetle', type: 'observed' },
  dragonfly: { key: 'dragonfly', type: 'observed' },
  ladybird: { key: 'ladybird', type: 'collected' },
};
const radii = [['all', 'radiusAll'], ['1km', 'radius1km'], ['3km', 'radius3km'], ['5km', 'radius5km']];
const tabs = [
  ['map', 'tabMap', 'map'],
  ['community', 'tabCommunity', 'users-round'],
  ['chat', 'tabChat', 'message-circle'],
  ['my', 'tabMy', 'user-round'],
];
const iconNames = ['search', ...tabs.map(([, , icon]) => icon)];
const iconPackage = resolve(repo, 'node_modules/lucide-react-native');
const iconVersion = JSON.parse(readFileSync(resolve(iconPackage, 'package.json'))).version;
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const attrs = (values) => Object.entries(values).map(([key, val]) => key + '="' + xml(val) + '"').join(' ');
const position = ({ x, y, width, height }) => ({ x, y, width, height });
const data = (mime, bytes) => 'data:' + mime + ';base64,' + bytes.toString('base64');
const glyphs = Object.fromEntries(iconNames.map((name) => {
  const source = readFileSync(resolve(iconPackage, 'dist/cjs/icons', name + '.js'), 'utf8');
  const match = source.match(/const __iconData = (\{[\s\S]+?\});/);
  if (!match) throw new Error('Missing Lucide icon data: ' + name);
  const { node } = runInNewContext('(' + match[1] + ')', Object.create(null), { timeout: 100 });
  return [name, node.map(([tag, shape]) => '<' + tag + ' ' + attrs(Object.fromEntries(Object.entries(shape).filter(([key]) => key !== 'key'))) + '/>').join('')];
}));
const fontFiles = { 500: 'assets/Pretendard-Medium.woff2', 700: 'assets/Pretendard-Bold.woff2' };
const style = Object.entries(fontFiles).map(([weight, file]) =>
  '@font-face{font-family:Pretendard;src:url(' + data('font/woff2', read(file)) + ') format("woff2");font-weight:' + weight + ';font-display:block}').join('\n');
const photoFiles = Object.keys(records).map((id) => 'assets/photos/' + id + '.png');
const photos = Object.fromEntries(Object.keys(records).map((id, index) => [id, data('image/png', read(photoFiles[index]))]));

function rect(bounds, fill, radius = 0, border) {
  return '<rect ' + attrs({ ...position(bounds), rx: radius, fill: colors[fill], ...(border ? { stroke: colors[border] } : {}) }) + '/>';
}
function outlined(bounds, fill, radius, border) {
  const { x, y, width, height } = bounds;
  return rect({ x: x + 0.5, y: y + 0.5, width: width - 1, height: height - 1 }, fill, radius, border);
}
function icon(id, name, x, y, size, ink, backdrop) {
  return '<svg ' + attrs({ id, x, y, width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true', 'data-contrast-fill': ink, 'data-contrast-bg': backdrop, fill: 'none', stroke: colors[ink], 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) + '>' + glyphs[name] + '</svg>';
}
function label(id, key, type, x, y, color, anchor = 'start') {
  const { fontFamily, fontSize, fontWeight } = typography[type];
  const properties = { id, x, y, fill: colors[color], 'data-copy': key, 'text-anchor': anchor, 'dominant-baseline': 'central', 'font-family': fontFamily + ', system-ui, sans-serif', 'font-size': fontSize, 'font-weight': fontWeight };
  return '<text ' + attrs(properties) + '>' + xml(strings[key]) + '</text>';
}
function target(id, key, bounds, contents, attributes = {}) {
  const a11y = { id, role: 'button', 'aria-label': strings[key], 'data-target': 'true', ...attributes };
  return '<g ' + attrs(a11y) + '><rect class="hit" ' + attrs({ ...position(bounds), fill: 'transparent', 'pointer-events': 'all' }) + '/>' + contents + '</g>';
}
function statusArea() {
  const ink = colors.systemInk;
  return '<g id="system-status" aria-hidden="true">'
    + label('time', 'time', 'systemTime', 24, 27, 'systemInk')
    + '<g fill="' + ink + '" transform="translate(304 20)"><rect y="8" width="3" height="4" rx="1"/><rect x="4.5" y="6" width="3" height="6" rx="1"/><rect x="9" y="3" width="3" height="9" rx="1"/><rect x="13.5" width="3" height="12" rx="1"/></g>'
    + '<g transform="translate(327 21)" stroke="' + ink + '" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M0 3Q7.5-3 15 3M2.8 6Q7.5 2.1 12.2 6M5.5 8.8Q7.5 7.2 9.5 8.8"/><circle cx="7.5" cy="11.1" r=".5" fill="' + ink + '"/></g>'
    + '<g transform="translate(348 20)" stroke="' + ink + '"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" opacity=".62"/><rect x="2.4" y="2.4" width="17.2" height="7.2" rx="1.4" fill="' + ink + '" stroke="none"/><path d="M23 4.5v3" stroke-linecap="round" opacity=".62"/></g></g>';
}
function recordCard(block, photoBounds) {
  const id = block.id.slice('record-'.length);
  const { key, type } = records[id];
  const textX = photoBounds.x + photoBounds.width + 12;
  const dateY = block.y + 85;
  const metaY = block.y + 60;
  const nameY = block.y + 31;
  const collected = type === 'collected';
  const typeInk = collected ? 'primary' : 'textSecondary';
  const typeSurface = collected ? 'activeTabSurface' : 'searchSurface';
  const contents = outlined(block, 'recordSurface', layout.list.cardRadius, 'recordBorder')
    + '<defs><clipPath id="clip-photo-' + id + '">' + rect(photoBounds, 'photoTile', layout.list.photoRadius) + '</clipPath></defs>'
    + rect(photoBounds, 'photoTile', layout.list.photoRadius)
    + '<image ' + attrs({ id: 'photo-' + id, href: photos[id], ...position(photoBounds), 'clip-path': 'url(#clip-photo-' + id + ')', 'aria-hidden': 'true' }) + '/>'
    + label('name-' + id, key + 'Name', 'recordTitle', textX, nameY, 'text')
    + label('distance-' + id, key + 'Distance', 'recordDistance', block.x + block.width - 14, nameY, 'textSecondary', 'end')
    + rect({ x: textX, y: metaY - 10, width: 37, height: 20 }, typeSurface, 5)
    + label('type-' + id, type, 'recordType', textX + 18.5, metaY, typeInk, 'middle')
    + label('place-' + id, key + 'Place', 'recordMeta', textX + 46, metaY, 'textSecondary')
    + label('date-' + id, key + 'Date', 'recordDate', textX, dateY, 'textPlaceholder');
  return target(block.id, key + 'Detail', block, contents, { 'data-record-type': type });
}
function preview(screen) {
  const destination = variants[screen.state];
  const find = (id) => {
    const block = screen.blocks.find((candidate) => candidate.id === id);
    if (!block) throw new Error('Approved block is missing: ' + id);
    return block;
  };
  const { topRadius: radius, y: top } = layout.sheet;
  const markup = [
    '<svg ' + attrs({ xmlns: 'http://www.w3.org/2000/svg', width, height, viewBox: '0 0 ' + width + ' ' + height, lang: 'ko', 'aria-labelledby': 'screen-title' }) + '>',
    '<title id="screen-title">' + xml(screen.title) + '</title><style>' + style + '</style>',
    rect({ x: 0, y: 0, width, height }, 'background'),
    '<path id="nearby-sheet" d="M0 ' + height + 'V' + (top + radius) + 'Q0 ' + top + ' ' + radius + ' ' + top + 'H' + (width - radius) + 'Q' + width + ' ' + top + ' ' + width + ' ' + (top + radius) + 'V' + height + 'Z" fill="' + colors.mapPanel + '" stroke="' + colors.mapPanelBorder + '"/>',
    statusArea(),
    target('sheet-handle', 'collapse', find('drag-handle').dragArea, '<g id="handle-mark" data-contrast-fill="sheetHandle" data-contrast-bg="mapPanel">' + rect(layout.handle, 'sheetHandle', 2) + '</g>'),
  ];
  const search = find('search');
  markup.push(target('search', 'search', search,
    rect(search, 'searchSurface', layout.search.radius, 'searchBorder')
    + icon('search-icon', 'search', search.x + 14, search.y + 12, 24, 'textPlaceholder', 'searchSurface')
    + label('search-label', 'search', 'search', search.x + 48, search.y + search.height / 2, 'textPlaceholder'), { role: 'searchbox' }));
  markup.push('<g id="radius-filters" role="group" aria-label="' + xml(strings.radiusGroup) + '">');
  for (const [id, key] of radii) {
    const chip = find('radius-' + id);
    const style = chip.selected ? ['activeTabSurface', 'primary', 'filterSelected', 'primary'] : ['observationMarkerSurface', 'observationMarkerBorder', 'filter', 'textSecondary'];
    const contents = outlined(chip, style[0], layout.filter.radius, style[1])
      + label('radius-label-' + id, key, style[2], chip.x + chip.width / 2, chip.y + chip.height / 2, style[3], 'middle');
    markup.push(target(chip.id, key, chip, contents, { 'aria-pressed': String(chip.selected) }));
  }
  markup.push('</g>');
  markup.push(label('list-title', 'panelTitle', 'panelTitle', 16, 230, 'text'));
  markup.push(label('record-count', destination.countKey, 'count', 374, 231, 'textSecondary', 'end'));
  markup.push('<defs><clipPath id="list-window">' + rect(layout.list, 'mapPanel') + '</clipPath></defs>');
  markup.push('<g id="record-list" role="group" aria-labelledby="list-title" clip-path="url(#list-window)">');
  for (const block of screen.blocks.filter(({ id, type }) => type === 'button' && id.startsWith('record-'))) {
    markup.push(recordCard(block, find(block.id.replace('record-', 'photo-'))));
  }
  markup.push('</g>');
  markup.push('<g id="fixed-footer">' + rect(layout.footer, 'footerSurface')
    + '<path d="M0 ' + (layout.footer.y + 0.5) + 'H' + width + '" stroke="' + colors.mapPanelBorder + '"/>');
  const showMap = find('map-return');
  markup.push(target('map-return', 'mapReturn', showMap,
    rect(showMap, 'primary', layout.mapReturn.radius)
    + icon('map-return-icon', 'map', showMap.x + 32, showMap.y + 14, 20, 'onPrimary', 'primary')
    + label('map-return-label', 'mapReturn', 'action', showMap.x + 60, showMap.y + showMap.height / 2, 'onPrimary')));
  markup.push('<g id="main-tabs" role="tablist" aria-label="' + xml(strings.tabs) + '">');
  for (const [id, key, name] of tabs) {
    const tab = find('tab-' + id);
    const middle = tab.x + tab.width / 2;
    const ink = tab.selected ? 'primary' : 'textSecondary';
    const visual = tab.selected ? outlined(tab, 'activeTabSurface', layout.tab.radius, 'activeTabBorder') : '';
    markup.push(target(tab.id, key, tab, visual
      + icon('tab-icon-' + id, name, middle - layout.tab.iconSize / 2, layout.tab.iconY, layout.tab.iconSize, ink, tab.selected ? 'activeTabSurface' : 'footerSurface')
      + label('tab-label-' + id, key, 'tab', middle, layout.tab.labelY, ink, 'middle'),
      { role: 'tab', 'aria-selected': String(tab.selected) }));
  }
  markup.push('</g>' + rect(layout.home, 'systemHome', 2) + '</g></svg>');
  return markup.join('\n') + '\n';
}

if (screens.length !== 2 || screens.some((screen) => screen.id !== 'nearby-discoveries' || !variants[screen.state] || screen.width !== width || screen.height !== height)) {
  throw new Error('Two approved 390×844 nearby-discoveries states are required');
}
for (const screen of screens) writeFileSync(local(variants[screen.state].filename), preview(screen));

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const assetPaths = [...Object.values(fontFiles), 'assets/pretendard-OFL.txt', 'assets/lucide-ISC.txt', ...photoFiles, 'photo-sources.json', 'asset-sources.md'];
const manifest = {
  approvedWireframe: { file: wireframePath, sha256: sha(wireframe) },
  sharedDesignTokens: { file: 'work/bugmap-main-map-harness/05-design-system/tokens.json', sha256: sha(readFileSync(resolve(repo, 'work/bugmap-main-map-harness/05-design-system/tokens.json'))) },
  lucide: { package: 'lucide-react-native', version: iconVersion, icons: iconNames },
  files: assetPaths.map((file) => {
    const bytes = read(file);
    const image = file.endsWith('.png') ? { dimensions: { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) } } : {};
    return { file, sha256: sha(bytes), bytes: bytes.length, ...image };
  }),
};
writeFileSync(local('assets-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
