import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
const local = (path) => new URL(path, import.meta.url);
const read = (path) => readFileSync(local(path));
const { colors, layout, typography } = JSON.parse(read('tokens.json'));
const { strings } = JSON.parse(read('copy.json'));
const { PNG } = createRequire(resolve(repo, 'package.json'))('pngjs');
const { withBrowser } = await import(pathToFileURL(resolve(repo, 'work/bugmap-login-kyro/05-design-system/browser-review.mjs')).href);
const wireframe = readFileSync(resolve(repo, 'work/bugmap-nearby-discoveries-harness/04-wireframes/wireframes.json'));
const { screens } = JSON.parse(wireframe);
const viewport = layout.viewport;

const right = (box) => box.x + box.width;
const bottom = (box) => box.y + box.height;
const within = (box, region) => box.x >= region.x && box.y >= region.y && right(box) <= right(region) && bottom(box) <= bottom(region);
const intersects = (a, b) => a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y;
const sameBox = (a, b) => ['x', 'y', 'width', 'height'].every((key) => a[key] === b[key]);
const noOverlap = (boxes) => boxes.every((a, index) => !boxes.slice(index + 1).some((b) => intersects(a, b)));
const scope = { x: 0, y: 0, ...viewport };
const safe = { ...scope, y: layout.safeArea.top, height: scope.height - layout.safeArea.top - layout.safeArea.bottom };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

function checkState(screen, geometry, full, fonts) {
  const expectedBoxes = screen.blocks.filter(({ type }) => ['button', 'input'].includes(type)).map(({ id, ...bounds }) => [id, bounds]);
  expectedBoxes.push(['sheet-handle', screen.blocks.find(({ id }) => id === 'drag-handle').dragArea]);
  const targets = Object.fromEntries(geometry.targets.map((target) => [target.id, target]));
  const expectedRecords = expectedBoxes.map(([id]) => id).filter((id) => id.startsWith('record-'));
  const presentRecords = geometry.targets.filter(({ id }) => id.startsWith('record-'));
  const textPairs = Object.values(typography).map(({ fontSize, fontWeight }) => [fontSize, fontWeight].join('/'));
  return {
    exactViewport: full.width === viewport.width && full.height === viewport.height && sameBox(geometry.viewport, scope),
    approvedTargetPositions: geometry.targets.length === expectedBoxes.length && expectedBoxes.every(([id, bounds]) => targets[id] && sameBox(targets[id].box, bounds)),
    minimumTouchSafeArea: geometry.targets.every(({ box }) => box.width >= layout.minimumTouchTarget && box.height >= layout.minimumTouchTarget && within(box, safe)),
    touchTargetsDisjoint: noOverlap(geometry.targets.map(({ box }) => box)),
    renderedPhrases: geometry.texts.every(({ key, text, fontSize, fontWeight }) => strings[key] === text && textPairs.includes([fontSize, fontWeight].join('/'))),
    visibleTextUnclipped: geometry.texts.every(({ box, target }) => box.width > 0 && within(box, target ? targets[target].box : scope))
      && noOverlap(geometry.texts.map(({ box }) => box))
      && noOverlap(geometry.texts.map(({ box }) => box).concat(geometry.photos.map(({ box }) => box))),
    actualPretendard: Object.values(fonts).every((variants) => variants.length && variants.every((font) => font.isCustomFont && font.familyName.includes('Pretendard'))),
    controlOrder: bottom(targets['sheet-handle'].box) === targets.search.box.y
      && bottom(targets.search.box) < targets['radius-all'].box.y
      && bottom(targets['radius-all'].box) < layout.list.y,
    radiusSingleSelect: geometry.targets.filter(({ pressed }) => pressed === 'true').map(({ id }) => id).join() === (screen.state === 'default' ? 'radius-all' : 'radius-3km'),
    mapTabSingleSelect: geometry.targets.filter(({ role }) => role === 'tab').map(({ selected }) => selected).join() === 'true,false,false,false',
    recordsBoundedAndOrdered: presentRecords.map(({ id }) => id).join() === expectedRecords.join()
      && presentRecords.every(({ box }) => within(box, layout.list))
      && geometry.photos.length === expectedRecords.length
      && geometry.photos.every(({ id, box }) => box.width === layout.list.photoSize && box.height === layout.list.photoSize
        && within(box, targets[id.replace('photo-', 'record-')].box))
      && geometry.texts.find(({ id }) => id === 'record-count').text === '기록 ' + expectedRecords.length + '개',
    footerSeparated: bottom(layout.list) === layout.footer.y
      && [targets['map-return'], ...geometry.targets.filter(({ role }) => role === 'tab')].every(({ box }) => within(box, layout.footer))
      && layout.home.y >= bottom(safe),
  };
}
function pixelsChanged(full, bare, box, threshold = 24) {
  const pixels = [];
  for (let y = Math.max(0, Math.floor(box.y)); y < Math.min(full.height, Math.ceil(bottom(box))); y++) {
    for (let x = Math.max(0, Math.floor(box.x)); x < Math.min(full.width, Math.ceil(right(box))); x++) {
      const position = (y * full.width + x) * 4;
      const channels = Array.from(bare.data.subarray(position, position + 3));
      if (channels.some((value, index) => Math.abs(full.data[position + index] - value) >= threshold)) pixels.push(channels);
    }
  }
  return pixels;
}
function luminance(rgb) {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function contrastResult(id, value, threshold) {
  return { id, ratio: Number(value.toFixed(2)), threshold, passed: value >= threshold };
}
const parseHex = (hex) => hex.match(/[0-9a-f]{2}/gi).map((pair) => Number.parseInt(pair, 16));

mkdirSync(local('captures/'), { recursive: true });
const states = await withBrowser({}, async (page) => {
  await page.cdp('DOM.enable');
  await page.cdp('CSS.enable');
  const results = [];
  for (const screen of screens) {
    const preview = screen.state === 'default' ? 'preview.svg' : 'preview-' + screen.state + '.svg';
    const capture = 'captures/' + viewport.width + 'x' + viewport.height + '-' + screen.state + '.png';
    await page.goto(local(preview).href, viewport);
    const geometry = await page.evaluate(String.raw`(() => {
      const box = (node) => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      };
      return {
        viewport: box(document.documentElement),
        targets: [...document.querySelectorAll('[data-target]')].map(node => ({id: node.id, role: node.getAttribute('role'), label: node.getAttribute('aria-label'), pressed: node.getAttribute('aria-pressed'), selected: node.getAttribute('aria-selected'), box: box(node.querySelector('.hit'))})),
        texts: [...document.querySelectorAll('text')].map(node => {
          const style = getComputedStyle(node);
          return {id: node.id, key: node.dataset.copy, text: node.textContent, ink: style.fill, fontSize: parseFloat(style.fontSize), fontWeight: Number(style.fontWeight), target: node.closest('[data-target]')?.id ?? null, box: box(node)};
        }),
        photos: [...document.querySelectorAll('image')].map(node => ({id: node.id, box: box(node)})),
        symbols: [...document.querySelectorAll('[data-contrast-fill]')].map(node => ({id: node.id, ink: node.dataset.contrastFill, backdrop: node.dataset.contrastBg})),
      };
    })()`);
    const { root } = await page.cdp('DOM.getDocument');
    const fontData = await Promise.all(geometry.texts.map(async ({ id }) => {
      const { nodeId } = await page.cdp('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + id });
      const { fonts } = await page.cdp('CSS.getPlatformFontsForNode', { nodeId });
      return [id, fonts];
    }));
    const fonts = Object.fromEntries(fontData);
    const fullBuffer = await page.screenshot();
    await page.evaluate("document.querySelectorAll('text, image').forEach(node => node.style.visibility = 'hidden')");
    const full = PNG.sync.read(fullBuffer);
    const bare = PNG.sync.read(await page.screenshot());
    const contrasts = geometry.texts.map(({ id, ink, box }) => {
      const background = pixelsChanged(full, bare, box);
      if (!background.length) throw new Error('No rendered text pixels for ' + id);
      const foreground = ink.match(/\d+/g).slice(0, 3).map(Number);
      return contrastResult(id, Math.min(...background.map((rgb) => contrast(foreground, rgb))), 4.5);
    });
    for (const { id, ink, backdrop } of geometry.symbols) {
      contrasts.push(contrastResult(id, contrast(parseHex(colors[ink]), parseHex(colors[backdrop])), 3));
    }
    contrasts.push(contrastResult('selected-chip-outline', contrast(parseHex(colors.primary), parseHex(colors.activeTabSurface)), 3));
    const photoPixelCounts = Object.fromEntries(geometry.photos.map(({ id, box }) => [id, pixelsChanged(full, bare, box).length]));
    const checks = { ...checkState(screen, geometry, full, fonts), actualPhotoPixels: Object.values(photoPixelCounts).every((count) => count >= 1000) };
    writeFileSync(local(capture), fullBuffer);
    results.push({ state: screen.state, files: { [preview]: sha(read(preview)), [capture]: sha(fullBuffer) }, checks, geometry, fonts, contrasts, photoPixelCounts });
  }
  return results;
});
const [all, limited] = states;
const cards = (state) => state.geometry.targets.filter(({ id }) => id.startsWith('record-')).map(({ id }) => id);
const footer = (state) => state.geometry.targets.filter(({ id, role }) => id === 'map-return' || role === 'tab');
const crossStateChecks = {
  boundaryRecordRetained: cards(all).join() === 'record-stag-beetle,record-dragonfly,record-ladybird'
    && cards(limited).join() === 'record-stag-beetle,record-ladybird'
    && limited.geometry.texts.find(({ id }) => id === 'distance-ladybird').text === '3.0 km'
    && all.geometry.texts.find(({ id }) => id === 'distance-dragonfly').text === '4.6 km',
  footerGeometryUnchanged: footer(all).length === 5 && footer(all).every((target, index) => {
    const other = footer(limited)[index];
    return other && other.id === target.id && sameBox(target.box, other.box);
  }),
};
const result = Object.values(crossStateChecks).every(Boolean) && states.every(({ checks, contrasts }) => Object.values(checks).every(Boolean) && contrasts.every(({ passed }) => passed));
const report = { design: 'nearby-discoveries', renderer: 'Chromium CDP 1× from local SVG', viewport, approvedWireframeSha256: sha(wireframe), states, crossStateChecks, result };
writeFileSync(local('render-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  result, crossStateChecks,
  states: states.map(({ state, files, checks, contrasts }) => ({
    state, files, checks, minimumTextContrast: Math.min(...contrasts.filter(({ threshold }) => threshold === 4.5).map(({ ratio }) => ratio)),
    minimumNonTextContrast: Math.min(...contrasts.filter(({ threshold }) => threshold === 3).map(({ ratio }) => ratio)),
    failedContrast: contrasts.filter(({ passed }) => !passed),
  })),
}, null, 2));
if (!result) process.exitCode = 1;
