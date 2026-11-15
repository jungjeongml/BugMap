import { createServer } from 'node:http';
import { extname, relative } from 'node:path';
import { withBrowser } from './browser.mjs';
import { refs, design, viewports, visualBaselinePath, visualTolerance } from './contracts.mjs';
import { wireframePlan } from './documents.mjs';
import { webInputs } from './snapshots.mjs';
import { webCapturePath } from './stage-checks.mjs';
import { read, preflight, writeBundle, evidence, hashes, stringify, within, safeStat } from './io.mjs';
import { inspectWeb, compareCaptures } from './web-rules.mjs';
export async function captureRefs(base, options) {
  const references = refs(base), inputs = hashes(base, ['02-research/refs.json']);
  const paths = references.map(r => `02-research/captures/${r.id}.png`);
  preflight(base, [...paths, '02-research/captures.json'], options.force);
  const outputs = {}, results = [];
  await withBrowser(options, async page => {
    for (const [i, ref] of references.entries()) {
      await page.goto(ref.url, ref.viewport);
      const meta = await page.evaluate('({finalUrl: location.href, title: document.title})');
      if (!['http:', 'https:'].includes(new URL(meta.finalUrl).protocol)) throw new Error('Reference redirected outside HTTP(S)');
      outputs[paths[i]] = await page.screenshot();
      results.push({ ...ref, ...meta, capture: paths[i] });
    }
  });
  const report = { ...evidence('refs:capture', inputs, outputs), references: results };
  writeBundle(base, { ...outputs, '02-research/captures.json': stringify(report) }, options.force);
  return report;
}
export async function createWireframes(base, options) {
  const { screens, inputs, outputs } = wireframePlan(base);
  const pngs = screens.map(s => `04-wireframes/captures/${s.id}/${s.state}.png`);
  preflight(base, [...Object.keys(outputs), ...pngs, '04-wireframes/wireframes-report.json'], options.force);
  await withBrowser(options, async page => {
    for (const [i, screen] of screens.entries()) {
      const svg = outputs[`04-wireframes/${screen.id}/${screen.state}.svg`];
      await page.goto(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, { width: screen.width, height: screen.height });
      outputs[pngs[i]] = await page.screenshot();
    }
  });
  const report = evidence('wireframe', inputs, outputs);
  writeBundle(base, { ...outputs, '04-wireframes/wireframes-report.json': stringify(report) }, options.force);
  return report;
}
async function serve(base) {
  const webRoot = within(base, '06-figma/web');
  const server = createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
      const absolute = within(webRoot, path);
      const rel = relative(base, absolute).split('\\').join('/');
      const bytes = read(base, rel);
      const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' }[extname(path)] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }); res.end(bytes);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
export async function lintWeb(base, options) {
  const { tokens, copy, sizes: fonts } = design(base);
  const { html, inputs } = webInputs(base), sizes = viewports(base), tolerance = visualTolerance(base);
  const pngs = html.flatMap(path => sizes.map(v => webCapturePath(path, v)));
  preflight(base, [...pngs, '07-validation/web-lint.json'], options.force);
  const { server, origin } = await serve(base);
  const outputs = {}, runs = [];
  try {
    await withBrowser(options, async page => {
      for (const path of html) for (const size of sizes) {
        const url = `${origin}/${path.slice('06-figma/web/'.length).split('/').map(encodeURIComponent).join('/')}`;
        await page.goto(url, size);
        const result = await page.evaluate(`(${inspectWeb.toString()})(${JSON.stringify({ colors: tokens.colors, fontSizes: Object.values(fonts), forbidden: copy.forbidden, origin })})`);
        if (new URL(result.finalUrl).origin !== origin) throw new Error(`HTML navigated outside project: ${path}`);
        const capture = webCapturePath(path, size);
        outputs[capture] = await page.screenshot();
        const reference = visualBaselinePath(path, size);
        let visual = { reference };
        if (!safeStat(within(base, reference))?.isFile()) {
          result.issues.push({ code: 'visual-baseline-missing', selector: 'document', property: 'capture', value: reference });
        } else {
          const toURL = bytes => `data:image/png;base64,${bytes.toString('base64')}`;
          const diff = await page.evaluate(`(${compareCaptures.toString()})(${JSON.stringify({ actual: toURL(outputs[capture]), expected: toURL(read(base, reference)), delta: tolerance.delta })})`);
          visual = { reference, ...diff };
          if (diff.sizeMismatch) result.issues.push({ code: 'visual-diff', selector: 'document', property: reference, value: `크기 다름: 실제 ${diff.actual}, 승인 ${diff.expected}` });
          else if (diff.ratio > tolerance.ratio) {
            const { x, y, width, height } = diff.box;
            result.issues.push({ code: 'visual-diff', selector: 'document', property: reference,
              value: `${(diff.ratio * 100).toFixed(3)}% 변경 (허용 ${(tolerance.ratio * 100).toFixed(3)}%), 변경 영역 x=${x} y=${y} ${width}x${height}` });
          }
        }
        runs.push({ html: path, viewport: size, capture, issues: result.issues, title: result.title, visual });
      }
    });
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  const report = { ...evidence('lint:web', inputs, outputs), minTarget: 44, runs };
  writeBundle(base, { ...outputs, '07-validation/web-lint.json': stringify(report) }, options.force);
  return report;
}
