import { object, json, hashes } from './io.mjs';
export const designInputs = ['05-design-system/tokens.json', '05-design-system/components.json', '05-design-system/copy.json'];
export const id = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value);
export const text = value => typeof value === 'string' && !!value.trim();
export function viewport(value) {
  if (!object(value) || !['width', 'height'].every(k => Number.isInteger(value[k]) && value[k] >= 44 && value[k] <= 4096)) throw new Error('Viewport width/height must be integers in 44..4096');
  return { width: value.width, height: value.height };
}
export function refs(base) {
  const data = json(base, '02-research/refs.json');
  const seen = new Set();
  if (!object(data) || !Array.isArray(data.references) || !data.references.length) throw new Error('refs.json requires references');
  return data.references.map(ref => {
    if (!object(ref) || !id(ref.id) || seen.has(ref.id.toLowerCase())) throw new Error('Invalid or duplicate reference ID');
    seen.add(ref.id.toLowerCase());
    const url = new URL(ref.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('References require HTTP(S) URLs without credentials');
    return { id: ref.id, url: url.href, viewport: viewport(ref.viewport ?? { width: 390, height: 844 }) };
  });
}
export function wireframes(base) {
  const data = json(base, '04-wireframes/wireframes.json');
  if (!object(data) || !Array.isArray(data.screens) || !data.screens.length) throw new Error('wireframes.json requires screens');
  const seen = new Set();
  for (const screen of data.screens) {
    if (!object(screen) || !id(screen.id) || !id(screen.state) || !text(screen.title)) throw new Error('Screen needs id, state, title');
    const key = `${screen.id}/${screen.state}`;
    if (seen.has(key.toLowerCase())) throw new Error(`Duplicate screen state: ${key}`);
    seen.add(key.toLowerCase()); viewport(screen);
    if (!Array.isArray(screen.blocks)) throw new Error(`Missing blocks: ${key}`);
    for (const block of screen.blocks) {
      if (!object(block) || !['text', 'button', 'input', 'image', 'box'].includes(block.type)
        || !['x', 'y', 'width', 'height'].every(k => Number.isFinite(block[k]))
        || block.x < 0 || block.y < 0 || block.width <= 0 || block.height <= 0
        || block.x + block.width > screen.width || block.y + block.height > screen.height) throw new Error(`Block out of bounds: ${key}`);
      if (block.type === 'button' && (block.width < 44 || block.height < 44)) throw new Error(`Button smaller than 44px: ${key}`);
      if (block.text !== undefined && typeof block.text !== 'string') throw new Error('Block text must be a string');
    }
  }
  return data.screens;
}
export function design(base) {
  const [tokens, components, copy] = designInputs.map(path => json(base, path));
  if (!object(tokens) || !object(tokens.colors) || !Object.keys(tokens.colors).length
    || !Object.values(tokens.colors).every(v => typeof v === 'string' && /^#(?:[a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(v))) throw new Error('tokens.colors needs nonempty named hex colors');
  const sizes = {};
  if (tokens.fontSizes !== undefined) {
    if (!object(tokens.fontSizes)) throw new Error('fontSizes must be an object');
    for (const [name, value] of Object.entries(tokens.fontSizes)) sizes[`fontSizes.${name}`] = size(value);
  }
  if (tokens.typography !== undefined) {
    if (!object(tokens.typography)) throw new Error('typography must be an object');
    for (const [name, value] of Object.entries(tokens.typography)) sizes[`typography.${name}.fontSize`] = size(value?.fontSize);
  }
  if (!Object.keys(sizes).length) throw new Error('tokens needs fontSizes or typography.fontSize');
  const tokenNames = new Set([...Object.keys(tokens.colors).map(k => `colors.${k}`), ...Object.keys(sizes)]);
  if (!object(components) || !Object.keys(components).length) throw new Error('components.json requires named components');
  for (const [name, component] of Object.entries(components)) {
    if (!text(name) || !object(component) || !text(component.description) || !Array.isArray(component.tokens)
      || !component.tokens.length || !component.tokens.every(t => tokenNames.has(t))
      || !Array.isArray(component.states) || !component.states.length || !component.states.every(text)) throw new Error(`Invalid component or unknown token: ${name}`);
  }
  if (!object(copy) || !object(copy.strings) || !Object.keys(copy.strings).length || !Object.values(copy.strings).every(text)
    || !Array.isArray(copy.forbidden) || !copy.forbidden.every(text)) throw new Error('copy.json needs strings and a forbidden array');
  for (const value of Object.values(copy.strings)) if (copy.forbidden.some(term => normalize(value).includes(normalize(term)))) throw new Error('Approved copy contains forbidden wording');
  return { tokens, components, copy, sizes, inputs: hashes(base, designInputs) };
}
function size(value) {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+(?:\.\d+)?px$/.test(value) ? Number.parseFloat(value) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 256) throw new Error('Font sizes must be positive px values in 0..256');
  return n;
}
export const normalize = value => value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en');
export function reviewThreshold(base) {
  const project = json(base, 'control/project.json');
  const threshold = project?.reviewMinScore ?? 4;
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0 || threshold > 5) throw new Error('reviewMinScore must be in 0..5');
  return threshold;
}
// 승인된 디자인 시스템 캡처가 시각 비교의 기준이다: <screen>--<state>.html → <가로>x<세로>-<state>.png, 상태가 없으면 default.
export function visualBaselinePath(htmlPath, size) {
  const name = htmlPath.split('/').pop().replace(/\.html$/, '');
  const state = name.includes('--') ? name.split('--').pop() : 'default';
  if (!id(state)) throw new Error(`Invalid state in HTML name: ${htmlPath}`);
  return `05-design-system/captures/${size.width}x${size.height}-${state}.png`;
}
export function visualTolerance(base) {
  const project = json(base, 'control/project.json');
  const ratio = project?.visualMaxDiffRatio ?? 0.0005, delta = project?.visualChannelDelta ?? 16;
  if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 0 || ratio > 1) throw new Error('visualMaxDiffRatio must be in 0..1');
  if (!Number.isInteger(delta) || delta < 0 || delta > 255) throw new Error('visualChannelDelta must be an integer in 0..255');
  return { ratio, delta };
}
export function viewports(base) {
  const project = json(base, 'control/project.json');
  const values = project?.viewports ?? [{ width: 390, height: 844 }];
  if (!Array.isArray(values) || !values.length) throw new Error('viewports must not be empty');
  return [...new Map(values.map(v => { const p = viewport(v); return [`${p.width}x${p.height}`, p]; })).values()];
}
