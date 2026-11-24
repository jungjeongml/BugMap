import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = process.argv[2] ?? fileURLToPath(new URL('../../../../', import.meta.url));
const { withBrowser } = await import(pathToFileURL(resolve(repo, 'work/bugmap-login-kyro/05-design-system/browser-review.mjs')));
const output = resolve(process.argv[3] ?? '/private/tmp/bugmap-cluster-web-scroll');
const webUrl = new URL('../web/main-map--cluster-selected-overflow.html', import.meta.url);
const viewport = { width: 390, height: 844 };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(output, { recursive: true });

const snapshots = await withBrowser({}, async page => {
  const frame = () => page.evaluate(`(() => {
    const list = document.querySelector('#record-scroll');
    const rows = [...list.querySelectorAll('[data-record-id]')];
    const box = e => {
      const { x, y, width, height } = e.getBoundingClientRect();
      return { x, y, width, height };
    };
    const viewport = box(list);
    const visibleHeight = e => {
      const r = box(e);
      return Math.max(0, Math.min(viewport.y + viewport.height, r.y + r.height) - Math.max(viewport.y, r.y));
    };
    return {
      scrollTop: list.scrollTop, viewport,
      title: document.querySelector('#cluster-panel-title').textContent,
      header: box(document.querySelector('#cluster-panel-title')),
      close: box(document.querySelector('#cluster-panel-close .hit')),
      rows: rows.map(row => ({
        id: row.dataset.recordId, box: box(row.querySelector('.hit')),
        height: visibleHeight(row.querySelector('.hit')), photo: visibleHeight(row.querySelector('image')),
        labels: [...row.querySelectorAll('text')].map(text => getComputedStyle(text).visibility)
      })),
      clicked: document.querySelector('main').dataset.lastRecordId ?? null,
    };
  })()`);
  const capture = async name => {
    const bytes = await page.screenshot();
    await writeFile(resolve(output, name), bytes);
    return { name, sha256: sha256(bytes) };
  };
  const results = [];
  for (const count of [7, 4]) {
    if (count === 4) webUrl.searchParams.set('records', '4');
    await page.goto(webUrl.href, viewport);
    const start = await frame();
    assert.equal(start.rows.length, count);
    assert.equal(start.title, '이 주변 관찰 기록 ' + count + '건');
    assert.deepEqual(start.rows.slice(0, 4).map(row => row.height), [104, 104, 104, 26]);
    assert.deepEqual(start.rows.slice(4).map(row => row.height), Array(count - 4).fill(0));
    assert.equal(start.rows[3].photo, 14);
    assert.deepEqual(start.rows[3].labels, ['hidden', 'hidden']);
    const startPng = await capture(count + '-start.png');
    await page.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 180, y: 620, deltaX: 0, deltaY: 600 });
    await page.evaluate(`new Promise((resolve, reject) => {
      const list = document.querySelector('#record-scroll');
      const started = performance.now();
      function wait() {
        if (list.scrollTop === list.scrollHeight - list.clientHeight) {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        } else if (performance.now() - started > 2000) {
          reject(new Error('Wheel did not reach list end'));
        } else requestAnimationFrame(wait);
      }
      wait();
    })`);
    const end = await frame();
    assert.equal(end.scrollTop, count === 4 ? 78 : 414);
    assert.deepEqual(end.header, start.header);
    assert.deepEqual(end.close, start.close);
    const last = end.rows.at(-1);
    assert.equal(last.height, 104);
    assert.equal(last.box.y + last.box.height, 810);
    assert.deepEqual(last.labels, ['visible', 'visible']);
    const endPng = await capture(count + '-end.png');
    const x = last.box.x + last.box.width / 2, y = last.box.y + last.box.height / 2;
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
    const clicked = (await frame()).clicked;
    assert.equal(clicked, last.id);
    results.push({ count, start, end, clicked, captures: [startPng, endPng] });
  }
  return results;
});
await writeFile(resolve(output, 'web-scroll.json'), JSON.stringify({ viewport, snapshots }, null, 2) + '\n');
console.log(JSON.stringify(snapshots.map(({count, start, end, clicked, captures}) => ({count, peek:start.rows[3].height, scrollTop:end.scrollTop, clicked, captures}))));
