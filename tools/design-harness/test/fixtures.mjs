import { lintFigma } from '../figma.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createDesignMD, renderWireframe } from '../documents.mjs';
import { recordReview } from '../reviews.mjs';
export const tokens = { colors: { text: '#111827', primary: '#15803d', surface: '#ffffff' }, fontSizes: { body: 14, heading: 20 } };
export const components = { button: { description: 'Primary button', tokens: ['colors.primary', 'fontSizes.body'], states: ['default', 'disabled'] } };
export const copy = { strings: { save: '기록 저장' }, forbidden: ['정확도 98%', '무조건 성공'] };
export const digest = value => createHash('sha256').update(value).digest('hex');
export function png(width = 390, height = 844) {
  function chunk(type, bytes) {
    const t = Buffer.from(type), n = Buffer.alloc(4), crc = Buffer.alloc(4);
    n.writeUInt32BE(bytes.length);
    let sum = 0xffffffff;
    for (const b of Buffer.concat([t, bytes])) { sum ^= b; for (let i = 0; i < 8; i++) sum = (sum >>> 1) ^ (sum & 1 ? 0xedb88320 : 0); }
    crc.writeUInt32BE((sum ^ 0xffffffff) >>> 0);
    return Buffer.concat([n, t, bytes, crc]);
  }
  const head = Buffer.alloc(13); head.writeUInt32BE(width); head.writeUInt32BE(height, 4); head[8] = 8; head[9] = 6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', head), chunk('IDAT', deflateSync(Buffer.alloc((width * 4 + 1) * height))), chunk('IEND', Buffer.alloc(0))]);
}
export function fillPipeline(base) {
  const bytes = {};
  const put = (path, value) => { const b = Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value); mkdirSync(join(base, path, '..'), { recursive: true }); writeFileSync(join(base, path), b); bytes[path] = b; };
  const proof = (command, inputs, outputs, rest = {}) => ({ version: 1, generator: 'design-harness', command, at: '2026-11-13T00:00:00.000Z',
    inputs: Object.fromEntries(inputs.sort().map(path => [path, digest(bytes[path])])), outputs: Object.fromEntries(outputs.sort().map(path => [path, digest(bytes[path])])), ...rest });
  put('README.md', 'Demo'); put('control/project.json', { id: 'demo' }); put('control/decisions.md', 'Decisions');
  for (const path of ['01-prd/PRD.md', '01-prd/requirements.csv', '02-research/sources.md', '02-research/findings.md', '02-research/recommendations.md', '03-structure/screens.csv', '03-structure/flows.mmd', '03-structure/states.csv', '04-wireframes/review.md', '05-design-system/icons.csv', '05-design-system/preview.svg', '06-figma/node-map.json', '06-figma/change-log.md', '07-validation/coverage.csv', '07-validation/report.md', '07-validation/issues.csv', '08-handoff/implementation-notes.md', '08-handoff/open-items.md', '08-handoff/assets/map.svg']) put(path, path.endsWith('.json') ? {} : 'Evidence');
  for (const path of ['05-design-system/captures/map.png', '06-figma/captures/map.png']) put(path, png());
  const reference = { id: 'maps', url: 'https://example.com/', viewport: { width: 390, height: 844 } };
  put('02-research/refs.json', { references: [reference] }); put('02-research/captures/maps.png', png());
  put('02-research/captures.json', proof('refs:capture', ['02-research/refs.json'], ['02-research/captures/maps.png'], { references: [{ ...reference, finalUrl: reference.url, capture: '02-research/captures/maps.png' }] }));
  const screen = { id: 'map', state: 'default', title: '지도', width: 390, height: 844, blocks: [] };
  put('04-wireframes/wireframes.json', { screens: [screen] });
  put('04-wireframes/map/default.svg', renderWireframe(screen)); put('04-wireframes/captures/map/default.png', png());
  put('04-wireframes/wireframes-report.json', proof('wireframe', ['04-wireframes/wireframes.json'], ['04-wireframes/map/default.svg', '04-wireframes/captures/map/default.png']));
  put('05-design-system/tokens.json', tokens); put('05-design-system/components.json', components); put('05-design-system/copy.json', copy);
  createDesignMD(base, {});
  put('06-figma/web/index.html', '<style>body{margin:0;color:#111827;background:#fff;font-size:14px}</style><p>기록 저장</p>');
  const capture = `07-validation/captures/${digest('06-figma/web/index.html').slice(0, 12)}-390x844.png`;
  put(capture, png());
  put('07-validation/web-lint.json', proof('lint:web', ['05-design-system/tokens.json', '05-design-system/components.json', '05-design-system/copy.json', 'control/project.json', '06-figma/web/index.html', '05-design-system/captures/map.png'], [capture],
    { minTarget: 44, runs: [{ html: '06-figma/web/index.html', viewport: { width: 390, height: 844 }, capture, issues: [] }] }));
  put('control/figma.json', { fileKey: 'DemoFile', pageId: '0:1' });
  put('06-figma/node-map.json', { nodes: [{ screen: 'map', state: 'default', nodeId: '1:1' }] });
  put('06-figma/nodes.json', { version: 1, fileKey: 'DemoFile', pageId: '0:1', exportedAt: '2026-11-13T00:00:00Z', nodes: [{ id: '1:1', type: 'FRAME', name: 'Map', width: 390, height: 844, layoutMode: 'VERTICAL', fills: [] }] });
  lintFigma(base);
  recordReview(base, 'validation', { by: '수진', score: '4', notes: '사람 검토 fixture' });
}
