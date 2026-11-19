import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
const local = (file) => new URL(file, import.meta.url);
const read = (file) => readFileSync(local(file));
const { colors, layout, typography } = JSON.parse(read('tokens.json'));
const { strings, forbidden } = JSON.parse(read('copy.json'));
const { PNG } = createRequire(resolve(repo, 'package.json'))('pngjs');
const { withBrowser } = await import(pathToFileURL(resolve(repo, 'work/bugmap-login-kyro/05-design-system/browser-review.mjs')).href);
const approvedWireframe = readFileSync(resolve(repo, 'work/bugmap-record-entry-harness/04-wireframes/wireframes.json'));
const expandedWireframe = readFileSync(resolve(repo, 'work/bugmap-record-entry-harness/04-wireframes/full-form/wireframes.json'));
const fixtures = [JSON.parse(approvedWireframe), JSON.parse(expandedWireframe)];
const variants = [
  { screen: fixtures[0].screens[0], preview: 'preview.svg', capture: 'captures/390x844-default.png', expanded: false },
  { screen: fixtures[0].screens[1], preview: 'preview-ready.svg', capture: 'captures/390x844-ready.png', expanded: false },
  { screen: fixtures[1].screens[0], preview: 'preview-full-default.svg', capture: 'captures/full-form/390x920-default.png', expanded: true },
  { screen: fixtures[1].screens[1], preview: 'preview-full-ready.svg', capture: 'captures/full-form/390x1018-ready.png', expanded: true },
];
const right = (a) => a.x + a.width;
const bottom = (a) => a.y + a.height;
const within = (a, b) => a.x >= b.x && a.y >= b.y && right(a) <= right(b) && bottom(a) <= bottom(b);
const intersects = (a, b) => a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y;
const disjoint = (boxes) => boxes.every((a, index) => !boxes.slice(index + 1).some((b) => intersects(a, b)));
const sameBox = (a, b) => ['x', 'y', 'width', 'height'].every((key) => a[key] === b[key]);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const getRGB = (hex) => hex.match(/[0-9a-f]{2}/gi).map((pair) => Number.parseInt(pair, 16));
const luminance = (rgb) => rgb.map((channel) => {
  const component = channel / 255;
  return component <= 0.04045 ? component / 12.92 : ((component + 0.055) / 1.055) ** 2.4;
}).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
const contrast = (a, b) => {
  const left = luminance(a);
  const right = luminance(b);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
};
const contrastResult = (id, ratio, threshold) => ({ id, ratio: Number(ratio.toFixed(2)), threshold, passed: ratio >= threshold });

function pixelBackdrops(full, bare, box) {
  const changed = new Map();
  for (let y = Math.max(0, Math.floor(box.y)); y < Math.min(full.height, Math.ceil(bottom(box))); y++) {
    for (let x = Math.max(0, Math.floor(box.x)); x < Math.min(full.width, Math.ceil(right(box))); x++) {
      const position = (y * full.width + x) * 4;
      const rgb = Array.from(bare.data.subarray(position, position + 3));
      if (rgb.some((value, index) => Math.abs(full.data[position + index] - value) >= 24)) {
        const key = rgb.join(',');
        const old = changed.get(key);
        changed.set(key, { rgb, count: (old?.count ?? 0) + 1 });
      }
    }
  }
  return [...changed.values()];
}

function checkState(screen, expanded, geometry, full, fonts, photoPixels) {
  const ready = screen.state === 'ready';
  const viewport = { x: 0, y: 0, width: screen.width, height: screen.height };
  const safe = { ...viewport, y: layout.safeArea.top, height: viewport.height - layout.safeArea.top - layout.safeArea.bottom };
  const expectedTargets = screen.blocks.filter((block) => block.action);
  const targets = Object.fromEntries(geometry.targets.map((target) => [target.id, target]));
  const expectedPhoto = [1, 2, 3].map((number) => 'photo-' + number);
  const expectedDeletes = [1, 2, 3].map((number) => 'delete-photo-' + number);
  const expectedFooter = screen.blocks.find(({ id }) => id === 'footer-background');
  const expectedScrollIndicator = screen.blocks.find(({ id }) => id === 'scroll-indicator');
  const expectedMemoPreview = screen.blocks.find(({ id }) => id === 'memo-preview');
  const expectedPhotoCount = ready ? strings.photoCountFull : strings.photoCountEmpty;
  const source = fixtures[0].screens.find(({ state }) => state === screen.state);
  const scrollRoom = source.scroll.contentHeight - source.scroll.height;
  const originalMemo = source.scroll.groups.memo.find(({ id }) => id === 'memo-input');
  const finalMemoGeometry = { ...originalMemo, y: source.scroll.y + originalMemo.y - scrollRoom };
  const expectedBody = { ...source.scroll, height: expanded ? expectedFooter.y - source.scroll.y : source.scroll.height };
  const textPairs = Object.values(typography).map(({ fontSize, fontWeight }) => fontSize + '/' + fontWeight);
  const outlines = geometry.targets.filter(({ role, disabled, stroke }) => role === 'textbox' || (!disabled && stroke && stroke !== 'none'));
  const validOutlines = ['controlOutline', 'primary'].map((name) => 'rgb(' + getRGB(colors[name]).join(', ') + ')');
  const textOf = (id) => geometry.texts.find((text) => text.id === id)?.text;
  const wireText = (id) => screen.blocks.find((block) => block.id === id)?.text;
  const region = (target) => target.id === 'back' ? { x: 0, y: layout.safeArea.top, width: screen.width, height: layout.header.height - layout.safeArea.top }
    : target.id === 'submit' ? expectedFooter : expectedBody;
  return {
    exactViewport: full.width === viewport.width && full.height === viewport.height && sameBox(geometry.viewport, viewport),
    targetGeometryMatches: expectedTargets.length === geometry.targets.length
      && expectedTargets.every((block) => targets[block.id]?.action === block.action && sameBox(block, targets[block.id].box)),
    minimumTouchSafeArea: geometry.targets.every(({ box }) => box.width >= layout.minimumTouchTarget && box.height >= layout.minimumTouchTarget && within(box, safe)),
    separateTargets: disjoint(geometry.targets.map(({ box }) => box)),
    visibleTextAndFit: geometry.texts.every(({ box, target, key, text, fontSize, fontWeight }) => box.width > 0 &&
      within(box, target ? targets[target].box : viewport) && strings[key] === text && !forbidden.some((term) => text.includes(term))
      && textPairs.includes(fontSize + '/' + fontWeight)) && disjoint(geometry.texts.map(({ box }) => box)),
    actualPretendard: Object.values(fonts).every((variants) => variants.length && variants.every((font) => font.isCustomFont && font.familyName.includes('Pretendard'))),
    photoCapacity: geometry.texts.find(({ id }) => id === 'photo-count-label')?.text === expectedPhotoCount
      && targets.camera.disabled === ready && targets.gallery.disabled === ready
      && geometry.photos.map(({ id }) => id).join() === (ready ? expectedPhoto.join() : '')
      && geometry.targets.filter(({ action }) => action === 'delete-photo').map(({ id }) => id).join() === (ready ? expectedDeletes.join() : ''),
    realThumbnailPixels: geometry.photos.every(({ id, box }) => box.width === layout.photo.width && box.height === layout.photo.height && photoPixels[id] > 1000),
    typeSelection: targets['type-observed'].checked === String(ready) && targets['type-collected'].checked === 'false',
    locationAndDate: textOf('location-title-label') + ' ' + textOf('location-title-field-status') === wireText('location-title')
      && (ready ? textOf('location-picker-label') + ' ' + textOf('location-picker-detail') : textOf('location-picker-label')) === wireText('location-picker')
      && textOf('use-current-location-label') === wireText('use-current-location')
      && ['observed-at-title', 'observed-date', 'observed-time'].every((id) => textOf(id + '-label') === wireText(id)),
    footerAndAccessibility: sameBox(geometry.footer, expectedFooter)
      && targets.submit.disabled === !ready && geometry.targets.every((target) => target.label && within(target.box, region(target)))
      && outlines.every(({ stroke }) => validOutlines.includes(stroke)),
    memoReachable: scrollRoom > 0 && within(finalMemoGeometry, source.scroll)
      && (!expanded || targets['memo-input'].multiline === 'true'),
    memoPreview: expectedMemoPreview ? geometry.memoPreview && sameBox(expectedMemoPreview, geometry.memoPreview)
      && textOf('memo-preview-label') === expectedMemoPreview.text : geometry.memoPreview === null,
    scrollIndicator: expectedScrollIndicator ? geometry.scrollIndicator && sameBox(expectedScrollIndicator, geometry.scrollIndicator)
      && within(geometry.scrollIndicator, expectedBody) : geometry.scrollIndicator === null,
  };
}

mkdirSync(local('captures/full-form/'), { recursive: true });
const views = await withBrowser({}, async (page) => {
  await page.cdp('DOM.enable');
  await page.cdp('CSS.enable');
  const results = [];
  for (const variant of variants) {
    const { screen, preview, capture, expanded } = variant;
    await page.goto(local(preview).href, { width: screen.width, height: screen.height });
    const geometry = await page.evaluate(String.raw`(() => {
      const box = (node) => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      };
      const memoOutline = document.querySelector('#memo-preview > rect');
      let memoPreview = null;
      if (memoOutline) {
        const { x, y, width, height } = box(memoOutline);
        const strokeWidth = parseFloat(getComputedStyle(memoOutline).strokeWidth);
        memoPreview = { x: x - strokeWidth / 2, y: y - strokeWidth / 2, width: width + strokeWidth, height: height + strokeWidth };
      }
      return {
        viewport: box(document.documentElement),
        footer: box(document.querySelector('#fixed-footer > rect')),
        memoPreview,
        scrollIndicator: document.querySelector('#scroll-indicator') ? box(document.querySelector('#scroll-indicator')) : null,
        targets: [...document.querySelectorAll('[data-target]')].map(node => ({
          id: node.id, role: node.getAttribute('role'), label: node.getAttribute('aria-label'),
          action: node.dataset.action, disabled: node.getAttribute('aria-disabled') === 'true', checked: node.getAttribute('aria-checked'),
          multiline: node.getAttribute('aria-multiline'),
          stroke: node.querySelector('.hit + rect') ? getComputedStyle(node.querySelector('.hit + rect')).stroke : null,
          box: box(node.querySelector('.hit')),
        })),
        texts: [...document.querySelectorAll('text')].map(node => {
          const style = getComputedStyle(node);
          return { id: node.id, key: node.dataset.copy, text: node.textContent, ink: style.fill, backdrop: node.dataset.contrastBg,
            fontSize: parseFloat(style.fontSize), fontWeight: Number(style.fontWeight), target: node.closest('[data-target]')?.id ?? null, box: box(node) };
        }),
        photos: [...document.querySelectorAll('image[data-photo]')].map(node => ({ id: node.id, box: box(node) })),
        icons: [...document.querySelectorAll('svg[data-contrast-fill]')].map(node => ({
          id: node.id, ink: node.dataset.contrastFill, backdrop: node.dataset.contrastBg,
        })),
      };
    })()`);
    const { root } = await page.cdp('DOM.getDocument');
    const fonts = Object.fromEntries(await Promise.all(geometry.texts.map(async ({ id }) => {
      const { nodeId } = await page.cdp('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + id });
      const { fonts } = await page.cdp('CSS.getPlatformFontsForNode', { nodeId });
      return [id, fonts];
    })));
    const fullBuffer = await page.screenshot();
    await page.evaluate("document.querySelectorAll('text, image').forEach(node => node.style.visibility = 'hidden')");
    const full = PNG.sync.read(fullBuffer);
    const bare = PNG.sync.read(await page.screenshot());
    const photoPixels = Object.fromEntries(geometry.photos.map(({ id, box }) =>
      [id, pixelBackdrops(full, bare, box).reduce((area, { count }) => area + count, 0)]));
    const textContrasts = geometry.texts.map(({ id, ink, box }) => {
      const candidates = pixelBackdrops(full, bare, box);
      if (!candidates.length) throw new Error('No rendered text pixels for ' + id);
      const foreground = ink.match(/\d+/g).slice(0, 3).map(Number);
      return contrastResult(id, Math.min(...candidates.map(({ rgb }) => contrast(foreground, rgb))), 4.5);
    });
    const iconContrasts = geometry.icons.map(({ id, ink, backdrop }) => contrastResult(id, contrast(getRGB(colors[ink]), getRGB(colors[backdrop])), 3));
    const boundaryContrasts = [
      ['field-edge-to-fill', 'controlOutline', 'formField'],
      ['field-edge-to-screen', 'controlOutline', 'background'],
      ['photo-action-edge-to-fill', 'controlOutline', 'photoTile'],
      ['selected-type-edge-to-fill', 'primary', 'activeTabSurface'],
      ['enabled-submit-edge-to-footer', 'primary', 'formFooter'],
      ...(!expanded ? [['scroll-indicator-to-screen', 'controlOutline', 'background']] : []),
    ].map(([id, ink, backdrop]) => contrastResult(id, contrast(getRGB(colors[ink]), getRGB(colors[backdrop])), 3));
    const checks = checkState(screen, expanded, geometry, full, fonts, photoPixels);
    writeFileSync(local(capture), fullBuffer);
    results.push({ state: screen.state, expanded, viewport: { width: screen.width, height: screen.height }, files: { [preview]: sha(read(preview)), [capture]: sha(fullBuffer) }, geometry, fonts, checks, textContrasts, iconContrasts, boundaryContrasts, photoPixels });
  }
  return results;
});

const [empty, full] = views;
const findTarget = (view, id) => view.geometry.targets.find((target) => target.id === id);
const footerMatches = sameBox(findTarget(empty, 'submit').box, findTarget(full, 'submit').box)
  && sameBox(findTarget(empty, 'submit').box, layout.submit) && sameBox(empty.geometry.footer, full.geometry.footer);
const result = footerMatches && views.every((view) => Object.values(view.checks).every(Boolean)
  && [...view.textContrasts, ...view.iconContrasts, ...view.boundaryContrasts].every(({ passed }) => passed));
const report = { design: 'record-entry', renderer: 'Chromium CDP 1× from local SVG', approvedWireframeSha256: sha(approvedWireframe),
  expandedWireframeSha256: sha(expandedWireframe), result, footerMatches, views };
writeFileSync(local('render-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  result, footerMatches,
  views: views.map(({ state, expanded, files, checks, textContrasts, iconContrasts, boundaryContrasts, photoPixels }) => {
    const contrastChecks = [...textContrasts, ...iconContrasts, ...boundaryContrasts];
    return {
      state, expanded, files, failures: Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name),
      minTextContrast: Math.min(...textContrasts.map(({ ratio }) => ratio)),
      minNonTextContrast: Math.min(...[...iconContrasts, ...boundaryContrasts].map(({ ratio }) => ratio)),
      failedContrast: contrastChecks.filter(({ passed }) => !passed), photoPixels,
    };
  }),
}, null, 2));
if (!result) process.exitCode = 1;
