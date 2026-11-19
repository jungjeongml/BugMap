import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
const local = (file) => new URL(file, import.meta.url);
const read = (file) => readFileSync(local(file));
const json = (file) => JSON.parse(read(file));
const { colors, typography, layout } = json('tokens.json');
const { strings, forbidden } = json('copy.json');
const stagePath = 'work/bugmap-record-entry-harness/04-wireframes/';
const fixturePaths = [stagePath + 'wireframes.json', stagePath + 'full-form/wireframes.json'];
const fixtures = fixturePaths.map((file) => JSON.parse(readFileSync(resolve(repo, file))));
const iconPackage = resolve(repo, 'node_modules/lucide-react-native');
const iconVersion = JSON.parse(readFileSync(resolve(iconPackage, 'package.json'))).version;
const iconNames = read('icons.csv').toString().trim().split('\n').slice(1).map((line) => line.split(',')[0]);
const fontFiles = { 500: 'assets/Pretendard-Medium.woff2', 700: 'assets/Pretendard-Bold.woff2' };
const photoFiles = [1, 2, 3].map((index) => 'assets/photos/specimen-' + index + '.png');
const provenanceFiles = ['photo-sources.json', 'asset-sources.md'];
const data = (mime, bytes) => 'data:' + mime + ';base64,' + bytes.toString('base64');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const xml = (str) => String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const attrs = (values) => Object.entries(values).map(([key, val]) => key + '="' + xml(val) + '"').join(' ');
const position = ({ x, y, width, height }) => ({ x, y, width, height });
const photos = photoFiles.map((file) => data('image/png', read(file)));
const style = Object.entries(fontFiles).map(([weight, file]) =>
  '@font-face{font-family:Pretendard;src:url(' + data('font/woff2', read(file)) + ') format("woff2");font-weight:' + weight + ';font-display:block}').join('\n');

const glyphs = Object.fromEntries(iconNames.map((name) => {
  const source = readFileSync(resolve(iconPackage, 'dist/cjs/icons', name + '.js'), 'utf8');
  const match = source.match(/const __iconData = (\{[\s\S]+?\});/);
  if (!match) throw new Error('Missing Lucide icon: ' + name);
  const { node } = runInNewContext('(' + match[1] + ')', Object.create(null), { timeout: 100 });
  return [name, node.map(([tag, shape]) => '<' + tag + ' ' + attrs(Object.fromEntries(Object.entries(shape).filter(([key]) => key !== 'key'))) + '/>').join('')];
}));

function rect(bounds, fill = 'transparent', radius = 0, border) {
  if (!border) return '<rect ' + attrs({ ...position(bounds), rx: radius, fill: colors[fill] ?? fill }) + '/>';
  const { x, y, width, height } = bounds;
  return '<rect ' + attrs({
    x: x + 0.5, y: y + 0.5, width: width - 1, height: height - 1, rx: radius,
    fill: colors[fill] ?? fill, stroke: colors[border],
  }) + '/>';
}

function label(id, key, type, x, y, fill, backdrop, anchor = 'start') {
  const value = strings[key];
  if (typeof value !== 'string' || forbidden.some((phrase) => value.includes(phrase))) throw new Error('Invalid label: ' + key);
  const { fontFamily, fontSize, fontWeight } = typography[type];
  return '<text ' + attrs({
    id, x, y, fill: colors[fill], 'data-copy': key, 'data-contrast-fill': fill, 'data-contrast-bg': backdrop,
    'text-anchor': anchor, 'dominant-baseline': 'central',
    'font-family': fontFamily + ', system-ui, sans-serif', 'font-size': fontSize, 'font-weight': fontWeight,
  }) + '>' + xml(value) + '</text>';
}

function icon(id, name, x, y, size, fill, backdrop) {
  if (!glyphs[name]) throw new Error('Missing icon artwork: ' + name);
  return '<svg ' + attrs({
    id, x, y, width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true',
    'data-contrast-fill': fill, 'data-contrast-bg': backdrop, fill: 'none', stroke: colors[fill],
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }) + '>' + glyphs[name] + '</svg>';
}

function target(block, key, content, attributes = {}) {
  const { id, action } = block;
  const a11y = { id, role: 'button', 'aria-label': strings[key], 'data-target': 'true', 'data-action': action, ...attributes };
  if (block.enabled === false) a11y['aria-disabled'] = 'true';
  return '<g ' + attrs(a11y) + '><rect class="hit" ' + attrs({ ...position(block), fill: 'transparent' }) + '/>' + content + '</g>';
}

function statusArea(time) {
  const ink = colors.text;
  return '<g id="system-status" aria-hidden="true">'
    + label('time-label', 'systemTime', 'systemTime', time.x + 8, time.y + time.height / 2, 'text', 'background')
    + '<g fill="' + ink + '" transform="translate(304 20)"><rect y="8" width="3" height="4" rx="1"/><rect x="4.5" y="6" width="3" height="6" rx="1"/><rect x="9" y="3" width="3" height="9" rx="1"/><rect x="13.5" width="3" height="12" rx="1"/></g>'
    + '<g transform="translate(327 21)" stroke="' + ink + '" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M0 3Q7.5-3 15 3M2.8 6Q7.5 2.1 12.2 6M5.5 8.8Q7.5 7.2 9.5 8.8"/><circle cx="7.5" cy="11.1" r=".5" fill="' + ink + '"/></g>'
    + '<g transform="translate(348 20)" stroke="' + ink + '"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" opacity=".62"/><rect x="2.4" y="2.4" width="17.2" height="7.2" rx="1.4" fill="' + ink + '" stroke="none"/><path d="M23 4.5v3" stroke-linecap="round" opacity=".62"/></g></g>';
}

const sectionTitles = {
  'species-title': 'speciesTitle', 'type-title': 'typeTitle', 'observed-at-title': 'observedAt',
};
const qualifiedTitles = {
  'photo-title': ['photos', 'required', 40],
  'location-title': ['locationTitle', 'required', 66],
  'memo-title': ['memoTitle', 'optional', 44],
};
function fieldButton(block, key, leading, { muted, trailing, a11y, detail, leadInk } = {}) {
  const { id, x, y, width, height } = block;
  const centerY = y + height / 2;
  const { radius, iconSize, padding } = layout.controls;
  const x1 = x + padding;
  return target(block, a11y ?? key,
    rect(block, 'formField', radius, 'controlOutline') +
    icon(id + '-icon', leading, x1, centerY - iconSize / 2, iconSize, leadInk ?? 'textSecondary', 'formField') +
    label(id + '-label', key, 'value', x1 + iconSize + 8, centerY, muted ? 'textPlaceholder' : 'text', 'formField') +
    (detail ? label(id + '-detail', detail, 'meta', x + width - 36, centerY, 'textSecondary', 'formField', 'end') : '') +
    (trailing ? icon(id + '-trailing', trailing, x + width - padding - iconSize, centerY - iconSize / 2, iconSize, 'textSecondary', 'formField') : ''));
}

function photoAdd(block) {
  const { id, x, y, width, height, enabled } = block;
  const key = id === 'camera' ? 'camera' : 'gallery';
  const glyph = id === 'camera' ? 'camera' : 'images';
  const surface = enabled ? 'photoTile' : 'formField';
  const border = enabled ? 'controlOutline' : 'formFieldBorder';
  const textInk = enabled ? 'text' : 'disabledText';
  const iconInk = enabled ? 'primary' : 'disabledText';
  const cy = y + height / 2;
  return target(block, key,
    rect(block, surface, layout.controls.radius, border) +
    icon(id + '-icon', glyph, x + width / 2 - 44, cy - 10, 20, iconInk, surface) +
    label(id + '-label', key, 'action', x + width / 2 - 14, cy, textInk, surface));
}

function thumbnail(block) {
  const id = block.id;
  const photo = Number(id.split('-').at(-1));
  return '<defs><clipPath id="clip-' + id + '">' + rect(block, 'photoTile', layout.photo.radius) + '</clipPath></defs>' +
    '<image ' + attrs({ id, ...position(block), href: photos[photo - 1], 'clip-path': 'url(#clip-' + id + ')',
      preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', 'data-photo': photo }) + '/>' +
    rect(block, 'transparent', layout.photo.radius, 'photoTileBorder');
}

function deletePhoto(block) {
  const { id, x, y, width, height, photo } = block;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const circle = '<circle ' + attrs({ cx, cy, r: layout.photo.deleteCircle / 2, fill: colors.background }) + '/>';
  const size = layout.photo.deleteIcon;
  return target(block, 'removePhoto' + photo, circle + icon(id + '-icon', 'x', cx - size / 2, cy - size / 2, size, 'text', 'background'));
}

function choice(block, key, glyph, role) {
  const { id, selected, x, y, height } = block;
  const cy = y + height / 2;
  const surface = selected ? 'activeTabSurface' : 'formField';
  const ink = selected ? 'primary' : 'textSecondary';
  const attributes = role === 'radio' ? { role, 'aria-checked': String(selected) } : { 'aria-pressed': String(selected) };
  return target(block, key,
    rect(block, surface, layout.controls.radius, selected ? 'primary' : 'controlOutline') +
    icon(id + '-icon', glyph, x + 12, cy - 8, 16, ink, surface) +
    label(id + '-label', key, role === 'radio' ? 'action' : 'compactAction', x + 36, cy, selected ? 'primary' : 'text', surface), attributes);
}

function renderBlock(block, ready) {
  const { id, type, x, y, width, height, action } = block;
  const centerY = y + height / 2;
  if (qualifiedTitles[id]) {
    const [title, qualifier, offset] = qualifiedTitles[id];
    return label(id + '-label', title, 'section', x, centerY, 'text', 'background') +
      label(id + '-field-status', qualifier, 'meta', x + offset, centerY, 'textPlaceholder', 'background');
  }
  if (id === 'photo-count') return label(id + '-label', ready ? 'photoCountFull' : 'photoCountEmpty', 'count', x + width, centerY, ready ? 'primary' : 'textSecondary', 'background', 'end');
  if (id === 'photo-guidance') return label(id + '-label', ready ? 'photoGuidanceFull' : 'photoGuidanceEmpty', 'meta', x, centerY, 'textSecondary', 'background');
  if (sectionTitles[id]) return label(id + '-label', sectionTitles[id], 'section', x, centerY, 'text', 'background');
  if (id === 'camera' || id === 'gallery') return photoAdd(block);
  if (type === 'image') return thumbnail(block);
  if (action === 'delete-photo') return deletePhoto(block);
  if (id === 'species-unknown') return choice(block, 'speciesUnknown', 'square', 'button');
  if (id === 'type-observed' || id === 'type-collected') return choice(block, id === 'type-observed' ? 'observed' : 'collected', block.selected ? 'circle-dot' : 'circle', 'radio');
  if (id === 'species-name' || id === 'memo-input' || id === 'memo-preview') {
    const memo = id !== 'species-name';
    const key = memo ? 'memoHint' : ready ? 'speciesExample' : 'speciesPlaceholder';
    const content = rect(block, 'formField', layout.controls.radius, 'controlOutline') +
      label(id + '-label', key, 'value', x + 14, memo ? y + 23 : centerY, memo || !ready ? 'textPlaceholder' : 'text', 'formField');
    if (id === 'memo-preview') return '<g id="memo-preview" aria-hidden="true">' + content + '</g>';
    const accessibility = memo ? { role: 'textbox', 'aria-multiline': 'true' } : { role: 'textbox' };
    return target(block, memo ? 'memoTitle' : 'speciesTitle', content, accessibility);
  }
  if (id === 'location-picker') return fieldButton(block, ready ? 'locationExample' : 'locationEmpty', 'map-pin', { muted: !ready, trailing: 'chevron-right', detail: ready ? 'locationChange' : null, a11y: ready ? 'locationSelectedA11y' : 'locationEmpty' });
  if (id === 'use-current-location') return fieldButton(block, 'useCurrentLocation', 'locate-fixed', { leadInk: 'location' });
  if (id === 'observed-date') return fieldButton(block, ready ? 'dateExample' : 'dateEmpty', 'calendar-days', { muted: !ready, trailing: 'chevron-down', a11y: ready ? 'dateSelectedA11y' : 'dateLabel' });
  if (id === 'observed-time') return fieldButton(block, ready ? 'timeExample' : 'timeEmpty', 'clock', { muted: !ready, trailing: 'chevron-down', a11y: ready ? 'timeSelectedA11y' : 'timeLabel' });
  throw new Error('No rendering rule for ' + id);
}

const groupIds = {
  photo: 'photo-section', species: 'species-section', location: 'location-section',
  observedAt: 'observed-at-section', memo: 'memo-section',
};
function preview(screen, original, expanded) {
  const ready = screen.state === 'ready';
  const byId = Object.fromEntries(screen.blocks.map((block) => [block.id, block]));
  const { width, height } = screen;
  const footer = byId['footer-background'];
  const back = byId.back;
  const submit = byId.submit;
  const title = byId['screen-title'];
  const backSize = layout.header.iconSize;
  const { scroll } = original;
  const body = { ...position(scroll), height: expanded ? footer.y - scroll.y : scroll.height };
  const scrollThumb = byId['scroll-indicator'];

  const sections = Object.entries(scroll.groups).map(([key, blocks]) => {
    const visible = blocks.map(({ id }) => byId[id] ?? (id === 'memo-input' ? byId['memo-preview'] : undefined)).filter(Boolean);
    if (!visible.length) return '';
    const content = visible.map((block) => renderBlock(block, ready));
    if (key === 'species') {
      content[4] = '<g id="record-type-choices" role="radiogroup" aria-labelledby="type-title-label">' + content[4];
      content[5] += '</g>';
    }
    return '<g id="' + groupIds[key] + '">' + content.join('\n') + '</g>';
  });

  const submitSurface = ready ? 'primary' : 'formField';
  const markup = [
    '<svg ' + attrs({ xmlns: 'http://www.w3.org/2000/svg', width, height, viewBox: '0 0 ' + width + ' ' + height,
      lang: 'ko', 'aria-labelledby': 'screen-title-label' }) + '>',
    '<title>' + xml(screen.title) + '</title><style>' + style + '</style>',
    rect({ x: 0, y: 0, width, height }, 'background'),
    statusArea(byId['status-time']),
    '<g id="navigation">',
    target(back, 'back', icon('back-icon', 'arrow-left', back.x + 6, back.y + (back.height - backSize) / 2, backSize, 'text', 'background')),
    label('screen-title-label', 'screenTitle', 'screenTitle', width / 2, title.y + title.height / 2, 'text', 'background', 'middle'),
    '</g>',
    '<defs><clipPath id="form-window">' + rect(body, 'background') + '</clipPath></defs>',
    '<g id="record-entry-form" role="group" aria-labelledby="screen-title-label" clip-path="url(#form-window)">',
    ...sections, '</g>',
    ...(scrollThumb ? ['<g id="scroll-indicator" aria-hidden="true">' + rect(scrollThumb, 'controlOutline', 1.5) + '</g>'] : []),
    '<g id="fixed-footer">',
    rect(footer, 'formFooter'),
    '<path d="M0 ' + (footer.y + 0.5) + 'H' + width + '" stroke="' + colors.formFieldBorder + '"/>',
    ...(!ready ? [label('submit-guidance-label', 'submitGuidance', 'meta', width / 2,
      byId['submit-guidance'].y + byId['submit-guidance'].height / 2, 'textSecondary', 'formFooter', 'middle')] : []),
    target(submit, 'submit', rect(submit, submitSurface, layout.submit.radius, ready ? undefined : 'formFieldBorder') +
      label('submit-label', 'submit', 'submit', submit.x + submit.width / 2, submit.y + submit.height / 2,
        ready ? 'onPrimary' : 'disabledText', submitSurface, 'middle')),
    rect({ ...layout.home, y: height - layout.home.bottom }, 'textSecondary', 2),
    '</g></svg>',
  ];
  return markup.join('\n') + '\n';
}

const variants = [
  [fixtures[0].screens[0], 'preview.svg', false],
  [fixtures[0].screens[1], 'preview-ready.svg', false],
  [fixtures[1].screens[0], 'preview-full-default.svg', true],
  [fixtures[1].screens[1], 'preview-full-ready.svg', true],
];
for (const [screen, file, expanded] of variants) {
  const original = fixtures[0].screens.find(({ state }) => state === screen.state);
  if (!original || screen.id !== 'record-entry' || screen.width !== layout.viewport.width || (!expanded && screen.height !== layout.viewport.height)) {
    throw new Error('Unexpected approved wireframe: ' + file);
  }
  writeFileSync(local(file), preview(screen, original, expanded));
}

const assetPaths = [...Object.values(fontFiles), 'assets/pretendard-OFL.txt', 'assets/lucide-ISC.txt', ...photoFiles,
  ...provenanceFiles.filter((file) => existsSync(local(file)))];
const sharedTokenPath = 'src/theme/tokens.ts';
const manifest = {
  approvedWireframe: { file: fixturePaths[0], sha256: sha(readFileSync(resolve(repo, fixturePaths[0]))) },
  expandedWireframe: { file: fixturePaths[1], sha256: sha(readFileSync(resolve(repo, fixturePaths[1]))) },
  sharedDesignTokens: { file: sharedTokenPath, sha256: sha(readFileSync(resolve(repo, sharedTokenPath))) },
  lucide: { package: 'lucide-react-native', version: iconVersion, icons: iconNames },
  files: assetPaths.map((file) => {
    const bytes = read(file);
    const image = file.endsWith('.png') ? { dimensions: { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) } } : {};
    return { file, sha256: sha(bytes), bytes: bytes.length, ...image };
  }),
};
writeFileSync(local('assets-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
