import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
const moduleURL = (path) => pathToFileURL(resolve(repo, path)).href;
const { withBrowser } = await import(moduleURL('work/bugmap-login-kyro/05-design-system/browser-review.mjs'));
const { inspectStage } = await import(moduleURL('tools/design-harness/stage-checks.mjs'));
const source = resolve(repo, 'work/bugmap-record-cluster-harness/04-wireframes/wireframes.json');
const { screens: [screen] } = JSON.parse(readFileSync(source));
const local = (name) => new URL(name, import.meta.url);
const { colors, typography, layout } = JSON.parse(readFileSync(local('tokens.json')));
const { strings } = JSON.parse(readFileSync(local('copy.json')));
const project = fileURLToPath(new URL('../', import.meta.url));
assert.deepEqual(inspectStage(project, { id: 'design-system' }, {}), []);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const right = ({ x, width }) => x + width;
const bottom = ({ y, height }) => y + height;
const contains = (parent, child) => child.x >= parent.x && child.y >= parent.y && right(child) <= right(parent) && bottom(child) <= bottom(parent);
const overlaps = (a, b) => a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y;
const disjoint = (boxes) => boxes.every((a, n) => !boxes.slice(n + 1).some((b) => overlaps(a, b)));
const bounds = ({ x, y, width, height }) => ({ x, y, width, height });

const luminance = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
  .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
  .reduce((sum, value, n) => sum + value * [.2126, .7152, .0722][n], 0);
const contrast = ([name, ink, surface, required]) => {
  const light = [luminance(colors[ink]), luminance(colors[surface])].sort((a, b) => b - a);
  const ratio = (light[0] + .05) / (light[1] + .05);
  assert.ok(ratio >= required, name);
  return [name, Number(ratio.toFixed(2))];
};
const contrasts = [
  ['panelTitle', 'text', 'mapPanel', 4.5],
  ['recordName', 'text', 'recordRow', 4.5],
  ['recordDate', 'textSecondary', 'recordRow', 4.5],
  ['recordChevron', 'textSecondary', 'recordRow', 3],
  ['closeIcon', 'text', 'controlFill', 3],
  ['recordAction', 'onPrimary', 'primary', 4.5],
  ['mapAttribution', 'textSecondary', 'observationMarkerSurface', 3],
  ['gpsIcon', 'location', 'observationMarkerSurface', 3],
  ['clusterText', 'text', 'observationMarkerSurface', 4.5],
  ['selectedOutlineAgainstMajorRoad', 'primary', 'mapMajorRoad', 3],
  ['mapLabelHalo', 'mapLabel', 'mapLabelOutline', 4.5],
  ['riverLabelHalo', 'mapWaterLabel', 'mapLabelOutline', 4.5],
].map(contrast);

await withBrowser({}, async (page) => {
  await page.goto(local('preview.svg').href, layout.viewport);
  const result = await page.evaluate(`(() => {
    const box = (el) => {
      const {x, y, width, height} = el.getBoundingClientRect();
      return {x, y, width, height};
    };
    const byId = (id) => document.getElementById(id);
    const query = (selector) => [...document.querySelectorAll(selector)];
    const context = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas').getContext('2d');
    const widthOf = (text, font) => { context.font = font; return context.measureText(text).width; };
    return {
      targets: query('[data-target]').map((target) => ({
        id: target.id, box: box(target.querySelector('.hit')), label: target.getAttribute('aria-label'),
        pressed: target.getAttribute('aria-pressed'), center: target.getAttribute('data-center'),
        record: target.getAttribute('data-record-id'), detail: target.getAttribute('data-detail-id'),
      })),
      text: query('text').map((el) => ({ id: el.id, box: box(el), text: el.textContent,
        copy: el.dataset.copy, type: el.dataset.type, size: getComputedStyle(el).fontSize,
        weight: getComputedStyle(el).fontWeight, fill: getComputedStyle(el).fill,
        target: el.closest('[data-target]')?.id ?? null,
      })),
      images: query('image').map((el) => ({ id: el.id, box: box(el), kind: el.getAttribute('href').split(';')[0] })),
      groups: ['map-content','map-controls','cluster-panel','record-list','current-location','system-status'].every((id) => byId(id).tagName === 'g'),
      panelBox: box(byId('cluster-panel-surface')),
      outline: box(byId('selected-marker-outline')),
      keyboardOrderSpec: query('#cluster-panel [data-target]').map((target) => target.id),
      longNameScale200: widthOf('아주 긴 한글 곤충 이름을 표시하는 관찰 기록 예시', '700 30px Pretendard'),
      dateScale200: widthOf('2026.11.23', '500 24px Pretendard'),
    };
  })()`);
  assert.ok(result.groups);
  assert.deepEqual(result.outline, bounds(layout.cluster.selectedOutline));
  assert.deepEqual(result.panelBox, bounds(layout.panel));
  assert.deepEqual(result.keyboardOrderSpec, screen.panelFocusOrder);
  const targets = new Map(result.targets.map((target) => [target.id, target]));
  const approvedButtons = screen.blocks.filter((block) => block.type === 'button');
  assert.equal(targets.size, approvedButtons.length);
  const safe = { x: 0, y: layout.safeArea.top, width: layout.viewport.width, height: layout.viewport.height - layout.safeArea.top - layout.safeArea.bottom };
  for (const approved of approvedButtons) {
    const target = targets.get(approved.id);
    assert.deepEqual(target.box, bounds(approved));
    assert.equal(target.label, approved.accessibleName);
    assert.ok(target.box.width >= 44 && target.box.height >= 44);
    assert.ok(contains(safe, target.box));
    if (approved.recordId) {
      assert.equal(target.record, approved.recordId);
      assert.equal(target.detail, approved.detailRecordId);
    }
  }
  assert.ok(disjoint(result.targets.map(({ box }) => box)));
  assert.deepEqual(result.targets.filter(({ pressed }) => pressed === 'true').map(({ center, id }) => [id, center]), [['record-cluster-three', '300,333']]);
  const photoImages = result.images.filter(({ kind }) => kind === 'data:image/png');
  assert.equal(photoImages.length, 3);
  const vectorImages = result.images.filter(({ kind }) => kind === 'data:image/svg+xml');
  assert.deepEqual(vectorImages.map(({ id }) => id), ['map-vector', 'mapbox-logo']);
  for (const { id, box } of photoImages) {
    assert.deepEqual(box, bounds(screen.blocks.find((block) => block.id === id)));
    assert.ok(contains(targets.get(id.replace('-photo', '-row')).box, box));
  }
  await page.cdp('DOM.enable');
  await page.cdp('CSS.enable');
  const { root } = await page.cdp('DOM.getDocument');
  const approvedColors = new Set(Object.values(colors).filter((color) => color.length === 7).map((color) => 'rgb(' + color.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16)).join(', ') + ')'));
  for (const text of result.text) {
    assert.equal(text.text, strings[text.copy]);
    assert.equal(text.size, typography[text.type].fontSize + 'px');
    assert.equal(text.weight, String(typography[text.type].fontWeight));
    assert.ok(approvedColors.has(text.fill));
    assert.ok(text.box.width > 0 && contains(text.target ? targets.get(text.target).box : { x: 0, y: 0, ...layout.viewport }, text.box));
    const { nodeId } = await page.cdp('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + text.id });
    const { fonts } = await page.cdp('CSS.getPlatformFontsForNode', { nodeId });
    assert.ok(fonts.length > 0 && fonts.every((font) => font.isCustomFont && font.familyName.includes('Pretendard')), text.id);
  }
  assert.ok(disjoint([...result.text, ...photoImages].map(({ box }) => box)));
  assert.ok(bottom(targets.get('record-demo-03-row').box) < bottom(safe));
  assert.ok(result.longNameScale200 > layout.row.textMaxWidth && result.dateScale200 <= layout.row.textMaxWidth);
  const capture = await page.screenshot();
  assert.equal(capture.readUInt32BE(16), layout.viewport.width);
  assert.equal(capture.readUInt32BE(20), layout.viewport.height);
  writeFileSync(local('captures/390x844-cluster-selected.png'), capture);
  console.log(JSON.stringify({
    png: [capture.readUInt32BE(16), capture.readUInt32BE(20)], sha256: sha(capture),
    targets: result.targets.length, textsCheckedByCDP: result.text.length, photoAssets: photoImages.length,
    selected: 'record-cluster-three (300, 333)', panel: result.panelBox,
    minTarget: Math.min(...result.targets.flatMap(({ box }) => [box.width, box.height])),
    contrasts: Object.fromEntries(contrasts), longNameScale200: result.longNameScale200, dateScale200: result.dateScale200,
    rowTextMaximumWidth: layout.row.textMaxWidth, checks: 'pass',
  }, null, 2));
});
