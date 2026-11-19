import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
// The local review helper exposes CDP so the report can identify the platform font actually used.
const reviewHelper = resolve(repo, 'work/bugmap-login-kyro/05-design-system/browser-review.mjs');
const { withBrowser } = await import(pathToFileURL(reviewHelper).href);
const require = createRequire(resolve(repo, 'package.json'));
const { PNG } = require('pngjs');
const file = path => new URL(path, import.meta.url);
const read = path => readFileSync(file(path));
const sha256 = data => createHash('sha256').update(data).digest('hex');
const { colors, layout } = JSON.parse(read('tokens.json'));
const { strings } = JSON.parse(read('copy.json'));
const capture = 'captures/390x844-default.png';

function rgb(hex) {
  return hex.match(/[0-9a-f]{2}/gi).map(pair => parseInt(pair, 16));
}

function luminance(channels) {
  const [r, g, b] = channels.map(value => {
    const c = value / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return .2126 * r + .7152 * g + .0722 * b;
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05);
}

function pixels(png, bounds, accept) {
  const result = [];
  const left = Math.max(0, Math.floor(bounds.x));
  const top = Math.max(0, Math.floor(bounds.y));
  const right = Math.min(png.width, Math.ceil(bounds.x + bounds.width));
  const bottom = Math.min(png.height, Math.ceil(bounds.y + bounds.height));
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const offset = (y * png.width + x) * 4;
      if (accept(offset)) result.push([...png.data.subarray(offset, offset + 3)]);
    }
  }
  return result;
}

const results = await withBrowser({}, async page => {
  await page.goto(file('preview.svg').href, layout.viewport);
  await page.cdp('DOM.enable');
  await page.cdp('CSS.enable');
  const { root } = await page.cdp('DOM.getDocument');
  const actualFonts = {};
  for (const key of ['title', 'titleAccent', 'description', 'policy', 'park', 'observationTitle', 'time']) {
    const { nodeId } = await page.cdp('DOM.querySelector', {nodeId: root.nodeId, selector: '#' + key});
    const { fonts } = await page.cdp('CSS.getPlatformFontsForNode', {nodeId});
    actualFonts[key] = fonts;
  }
  const geometry = await page.evaluate(`(() => {
    const box = element => {
      const {x, y, width, height} = element.getBoundingClientRect();
      return {x, y, width, height};
    };
    const bounds = box(document.documentElement);
    const texts = [...document.querySelectorAll('text')].map(el => {
      const style = getComputedStyle(el);
      return {id: el.id, value: el.textContent, fill: style.fill, size: Number.parseFloat(style.fontSize), weight: Number(style.fontWeight), ...box(el)};
    });
    const buttons = [...document.querySelectorAll('.provider-surface')].map(el => ({
      label: el.parentElement.getAttribute('aria-label'),
      cornerRadiusSetting: Number(el.dataset.cornerRadius),
      ...box(el)
    }));
    const logo = document.querySelector('#brand-logo');
    const logoViewport = Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number(logo.getAttribute(key))]));
    const logoInk = box(logo);
    return {
      bounds, texts, buttons, logoViewport, logoInk,
      logoHasNoBackground: !logo.querySelector('rect, image') && getComputedStyle(logo).backgroundColor === 'rgba(0, 0, 0, 0)',
      home: box(document.querySelector('#home-indicator')),
      connection: box(document.querySelector('#system-connection')),
      background: box(document.querySelector('#map-background image')),
      sameViewport: innerWidth === bounds.width && innerHeight === bounds.height
    };
  })()`);
  const screenshot = await page.screenshot();
  await page.evaluate(`document.querySelectorAll('text').forEach(el => el.style.visibility = 'hidden')`);
  const bare = await page.screenshot();
  return { geometry, actualFonts, screenshot, bare };
});

const { geometry, actualFonts, screenshot } = results;
const full = PNG.sync.read(screenshot);
const bare = PNG.sync.read(results.bare);
const { width, height } = layout.viewport;
const compare = (x, y) => Math.abs(x - y) < .05;
const within = (box, top = 0, bottom = height) => box.x >= 0 && box.x + box.width <= width && box.y >= top && box.y + box.height <= bottom;
const labels = Object.keys(strings).filter(key => !layout.providerStack.providerOrder.includes(key));
const checks = {
  oneReferenceViewport: geometry.sameViewport && full.width === width && full.height === height,
  edgeToEdgeMap: JSON.stringify(geometry.background) === JSON.stringify(geometry.bounds),
  transparentVectorLogoBounds: geometry.logoHasNoBackground &&
    Object.keys(layout.logo).every(key => compare(geometry.logoViewport[key], layout.logo[key])) &&
    geometry.logoInk.x >= geometry.logoViewport.x && geometry.logoInk.y >= geometry.logoViewport.y &&
    geometry.logoInk.x + geometry.logoInk.width <= geometry.logoViewport.x + geometry.logoViewport.width &&
    geometry.logoInk.y + geometry.logoInk.height <= geometry.logoViewport.y + geometry.logoViewport.height,
  threeProvidersAndLayout: geometry.buttons.length === 3 && geometry.buttons.every((box, index) => {
    const stack = layout.providerStack;
    const button = layout.providerButton;
    return box.label === strings[stack.providerOrder[index]] &&
      box.x === stack.x && box.y === stack.y + index * (button.height + stack.gap) &&
      box.width === stack.width && box.height === button.height && box.cornerRadiusSetting === button.radius &&
      Math.min(box.width, box.height) >= button.minTarget;
  }),
  allLabelsAndCopy: geometry.texts.length === labels.length && geometry.texts.every(text => labels.includes(text.id) && text.value === strings[text.id]),
  textInViewport: geometry.texts.every(text => text.width > 0 && within(text)),
  contentInSafeArea: [geometry.logoViewport, ...geometry.buttons, ...geometry.texts.filter(text => text.id !== 'time')].every(box => within(box, layout.safeArea.top, height - layout.safeArea.bottom)),
  systemIndicatorsWithinRespectiveAreas: within(geometry.connection, 0, layout.safeArea.top) &&
    within(geometry.texts.find(text => text.id === 'time'), 0, layout.safeArea.top) &&
    within(geometry.home, height - layout.safeArea.bottom)
};

const contrast = geometry.texts.map(text => {
  const foreground = text.fill.match(/\d+/g).map(Number);
  const required = text.size >= 24 || (text.size >= 18.66 && text.weight >= 700) ? 3 : 4.5;
  const backgrounds = pixels(bare, text, offset => {
    const change = [0, 1, 2].reduce((max, i) => Math.max(max, Math.abs(full.data[offset + i] - bare.data[offset + i])), 0);
    return change > 20;
  });
  if (!backgrounds.length) throw new Error(`Text did not render: ${text.id}`);
  const minimum = Math.min(...backgrounds.map(background => ratio(foreground, background)));
  return { name: text.id, ratio: Number(minimum.toFixed(2)), required, passed: minimum >= required };
});
const pair = (name, foreground, background, required) => {
  const value = ratio(rgb(foreground), rgb(background));
  return {name, ratio: Number(value.toFixed(2)), required, passed: value >= required};
};
contrast.push(
  pair('kakao label', colors.kakaoInk, colors.kakaoSurface, 4.5),
  pair('naver label', colors.naverInk, colors.naverSurface, 4.5),
  pair('apple label', colors.appleInk, colors.appleSurface, 4.5)
);
const appleEdge = geometry.buttons.at(-1);
const outside = [appleEdge.x + Math.floor(appleEdge.width / 2), appleEdge.y - 1];
const offset = (outside[1] * full.width + outside[0]) * 4;
const adjacentMap = [...full.data.subarray(offset, offset + 3)];
const edgeRatio = ratio(rgb(colors.appleBorder), adjacentMap);
checks.appleBorderContrastAtTopCenter = edgeRatio >= 3;
const fidelityObservations = [{
  name: 'apple border against adjacent map at top center',
  sample: outside,
  adjacentMap,
  ratio: Number(edgeRatio.toFixed(2)),
  referenceForBoundaryOnly: 3,
  sourceTreatment: 'BugMap 05 outline width kept, color lightened to #68786E for contrast'
}];

mkdirSync(file('captures/'), {recursive: true});
writeFileSync(file(capture), screenshot);
const sourceFile = resolve(repo, 'work/bugmap-login-map-harness/01-prd/evidence/bugmap-05-source.png');
const report = {
  renderedAt: new Date().toISOString(),
  renderer: 'Local Chromium CDP at 1×',
  viewport: layout.viewport,
  state: 'login/default',
  input: {path: 'preview.svg', sha256: sha256(read('preview.svg'))},
  reference: {path: '../01-prd/evidence/bugmap-05-source.png', sha256: sha256(readFileSync(sourceFile))},
  capture: {path: capture, sha256: sha256(screenshot)},
  checks,
  contrast,
  fidelityObservations,
  geometry,
  actualFonts
};
writeFileSync(file('render-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({capture: report.capture, checks, contrast, fidelityObservations}, null, 2));
if (!Object.values(checks).every(Boolean) || !contrast.every(entry => entry.passed)) process.exitCode = 1;
