import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../../../', import.meta.url));
const moduleURL = (path) => pathToFileURL(resolve(repo, path)).href;
const { withBrowser } = await import(moduleURL('work/bugmap-login-kyro/05-design-system/browser-review.mjs'));
const { inspectStage } = await import(moduleURL('tools/design-harness/stage-checks.mjs'));
const local = (name) => new URL(name, import.meta.url);
const source = resolve(repo, 'work/bugmap-record-cluster-harness/04-wireframes/wireframes.json');
const { screens } = JSON.parse(readFileSync(source));
const { colors, typography, layout } = JSON.parse(readFileSync(local('tokens.json')));
const { strings } = JSON.parse(readFileSync(local('copy.json')));
const project = fileURLToPath(new URL('../', import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const right = ({ x, width }) => x + width;
const bottom = ({ y, height }) => y + height;
const contains = (outer, inner) => outer.x <= inner.x && outer.y <= inner.y && right(inner) <= right(outer) && bottom(inner) <= bottom(outer);
const overlaps = (a, b) => a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y;
const bounds = ({ x, y, width, height }) => ({ x, y, width, height });

const luminance = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
  .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
  .reduce((sum, value, n) => sum + value * [.2126, .7152, .0722][n], 0);
const contrasts = [
  ['panelTitle', 'text', 'mapPanel', 4.5],
  ['recordName', 'text', 'recordRow', 4.5],
  ['recordDate', 'textSecondary', 'recordRow', 4.5],
  ['recordChevron', 'textSecondary', 'recordRow', 3],
  ['closeIcon', 'text', 'controlFill', 3],
  ['closeIconPressed', 'text', 'pressedSurface', 3],
  ['recordNamePressed', 'text', 'pressedSurface', 4.5],
  ['recordDatePressed', 'textSecondary', 'pressedSurface', 4.5],
  ['recordChevronPressed', 'textSecondary', 'pressedSurface', 3],
  ['focusOnMarker', 'focusRing', 'observationMarkerSurface', 3],
  ['focusOnMainRoad', 'focusRing', 'mapMajorRoad', 3],
  ['focusOnPanel', 'focusRing', 'mapPanel', 3],
  ['focusOnRow', 'focusRing', 'recordRow', 3],
  ['focusOnPressed', 'focusRing', 'pressedSurface', 3],
  ['mapAttribution', 'textSecondary', 'observationMarkerSurface', 3],
  ['clusterText', 'text', 'observationMarkerSurface', 4.5],
  ['selectedOutlineAgainstMajorRoad', 'primary', 'mapMajorRoad', 3],
].map(([name, ink, surface, required]) => {
  const [light, dark] = [luminance(colors[ink]), luminance(colors[surface])].sort((a, b) => b - a);
  const ratio = (light + .05) / (dark + .05);
  assert.ok(ratio >= required, name);
  return [name, Number(ratio.toFixed(2))];
});

mkdirSync(local('captures/'), { recursive: true });
await withBrowser({}, async (page) => {
  for (const screen of screens) {
    const state = layout.states[screen.state];
    const overflow = Boolean(screen.recordList);
    await page.goto(local(overflow ? 'preview-overflow.svg' : 'preview.svg').href, layout.viewport);
    const result = await page.evaluate(`(() => {
      const box = (element) => {
        const {x, y, width, height} = element.getBoundingClientRect();
        return {x, y, width, height};
      };
      const byId = (id) => document.getElementById(id);
      const query = (selector) => [...document.querySelectorAll(selector)];
      return {
        targets: query('[data-target]').map((target) => ({
          id: target.id, box: box(target.querySelector('.hit')), label: target.getAttribute('aria-label'),
          pressed: target.getAttribute('aria-pressed'), center: target.getAttribute('data-center'),
          record: target.getAttribute('data-record-id'), detail: target.getAttribute('data-detail-id'),
        })),
        texts: query('text').map((element) => ({ id: element.id, box: box(element), text: element.textContent,
          copy: element.dataset.copy, type: element.dataset.type, size: getComputedStyle(element).fontSize,
          weight: getComputedStyle(element).fontWeight,
        })),
        photos: query('image[data-photo]').map((element) => ({ id: element.id, box: box(element), asset: element.dataset.photo })),
        logo: box(byId('mapbox-logo')),
        panel: box(byId('cluster-panel-surface')),
        outline: box(byId('selected-marker-outline')),
        clip: Object.fromEntries(['x', 'y', 'width', 'height'].map((key) => [key, Number(byId('record-list-viewport').querySelector('rect').getAttribute(key))])),
        clipApplied: byId('record-list').getAttribute('clip-path') === 'url(#record-list-viewport)',
        focusOrder: query('#cluster-panel [data-target]').map((element) => element.id),
        headerOutside: ['cluster-panel-title', 'cluster-panel-close'].every((id) => byId(id).parentNode === byId('cluster-panel')),
      };
    })()`);
    assert.deepEqual(result.panel, bounds(state.panel));
    assert.deepEqual(result.outline, state.selectedOutline);
    assert.deepEqual(result.clip, bounds(state.listViewport));
    assert.ok(result.headerOutside && result.clipApplied);
    assert.deepEqual(result.focusOrder, screen.panelFocusOrder);
    assert.equal(result.targets.find(({ pressed }) => pressed === 'true').id, state.selectedMarker);
    assert.deepEqual(result.logo, state.logo);
    assert.ok(bottom(result.logo) < state.panel.y);
    const targets = new Map(result.targets.map((target) => [target.id, target]));
    for (const element of screen.blocks.filter(({ type, id }) => type === 'button' && !id.endsWith('-visible-top'))) {
      const target = targets.get(element.id);
      assert.deepEqual(target.box, bounds(element), element.id);
      assert.equal(target.label, element.accessibleName, element.id);
      if (!target.record) assert.ok(target.id === 'cluster-panel-close' || bottom(target.box) <= state.panel.y);
    }
    assert.ok(result.targets.every(({ box }) => box.width >= layout.minimumTouchTarget && box.height >= layout.minimumTouchTarget));
    assert.equal(new Set(result.photos.map(({ asset }) => asset)).size, overflow ? 7 : 3);
    const rows = result.targets.filter(({ record }) => record);
    assert.equal(rows.length, overflow ? 7 : 3);
    assert.equal(new Set(rows.map(({ record }) => record)).size, rows.length);
    assert.ok(rows.every(({ record, detail }) => record === detail));
    assert.ok(rows.slice(0, 3).every(({ box }) => contains(result.clip, box)));
    for (const { id, box } of result.photos) assert.ok(contains(targets.get(id.replace('-photo', '-row')).box, box));
    if (overflow) {
      const partial = rows[3];
      const photo = result.photos[3];
      assert.equal(bottom(result.clip) - partial.box.y, state.initialVisible.partialHeight);
      assert.equal(bottom(result.clip) - photo.box.y, state.initialVisible.partialThumbnailHeight);
      assert.ok(result.texts.filter(({ id }) => id.startsWith(partial.record)).every(({ box }) => box.y >= bottom(result.clip)));
      assert.equal(bottom(rows.at(-1).box) - bottom(result.clip), state.scrollEnd.maxScrollTop);
    }
    const title = result.texts.find(({ id }) => id === 'cluster-panel-title');
    assert.ok(contains(bounds(state.title), title.box));
    assert.ok(!overlaps(title.box, state.close));
    await page.cdp('DOM.enable');
    await page.cdp('CSS.enable');
    const { root } = await page.cdp('DOM.getDocument');
    for (const item of result.texts) {
      assert.equal(item.text, strings[item.copy]);
      assert.equal(item.size, typography[item.type].fontSize + 'px');
      assert.equal(item.weight, String(typography[item.type].fontWeight));
      const { nodeId } = await page.cdp('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + item.id });
      const { fonts } = await page.cdp('CSS.getPlatformFontsForNode', { nodeId });
      assert.ok(fonts.length && fonts.every(({ isCustomFont, familyName }) => isCustomFont && familyName.includes('Pretendard')), item.id);
      if (item.type === 'recordName' || item.type === 'recordDate') {
        const row = targets.get(item.id.replace(/-text-[12]$/, '-row')).box;
        assert.ok(contains(row, item.box));
        assert.ok(right(item.box) + 12 < right(row) - layout.row.iconSize - 14);
      }
    }
    const capture = await page.screenshot();
    assert.equal(capture.readUInt32BE(16), layout.viewport.width);
    assert.equal(capture.readUInt32BE(20), layout.viewport.height);
    const file = 'captures/' + layout.viewport.width + 'x' + layout.viewport.height + '-' + screen.state + '.png';
    writeFileSync(local(file), capture);
    console.log(JSON.stringify({
      state: screen.state, file, sha256: sha(capture), png: layout.viewport,
      panel: result.panel, selected: state.selectedMarker, photos: result.photos.length,
      textChecks: result.texts.length, minTarget: Math.min(...result.targets.flatMap(({ box }) => [box.width, box.height])),
      partialRowHeight: overflow ? state.initialVisible.partialHeight : 0,
    }));
  }
});
assert.deepEqual(inspectStage(project, { id: 'design-system' }, {}), []);
console.log(JSON.stringify({ stageContract: 'pass', contrasts: Object.fromEntries(contrasts) }));
