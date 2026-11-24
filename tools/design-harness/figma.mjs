import { imageBindings } from './figma-images.mjs';
import { svgBindings } from './figma-svg.mjs';
import { isFigmaNodeId } from './figma-node-id.mjs';
import { json, object, hashes, stringify, writeBundle } from './io.mjs';
import { design, designInputs, id, normalize, wireframes, text } from './contracts.mjs';

export const figmaFiles = ['control/figma.json', '06-figma/node-map.json', '06-figma/nodes.json'];
export function figmaTarget(base) {
  const target = json(base, 'control/figma.json');
  if (!object(target) || typeof target.fileKey !== 'string' || typeof target.pageId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(target.fileKey ?? '') || !/^\d+:\d+$/.test(target.pageId ?? '')) throw new Error('control/figma.json requires fileKey and pageId');
  return target;
}
export function inspectFigma(base) {
  const target = figmaTarget(base), exported = json(base, '06-figma/nodes.json'), map = json(base, '06-figma/node-map.json');
  if (!object(exported) || exported.version !== 1 || exported.fileKey !== target.fileKey || exported.pageId !== target.pageId
    || typeof exported.exportedAt !== 'string' || !Number.isFinite(Date.parse(exported.exportedAt)) || !Array.isArray(exported.nodes) || !exported.nodes.length) throw new Error('Invalid Figma export or wrong target file/page');
  const { tokens, sizes, copy, components } = design(base);
  const images = imageBindings(base, map?.images);
  const svgs = svgBindings(base, map?.svgAssets);
  const issues = [], ids = new Set();
  const colorHex = value => { let s = value.slice(1).toLowerCase(); if (s.length <= 4) s = [...s].map(c => c + c).join(''); return s.length === 6 ? `${s}ff` : s; };
  const colors = new Set(Object.values(tokens.colors).map(colorHex));
  function visit(node, parentOpacity = 1, parentRotated = false, parentVisible = true, svg) {
    if (!object(node) || !isFigmaNodeId(node.id) || ids.has(node.id) || !text(node.type) || !text(node.name)
      || !['width', 'height'].every(k => Number.isFinite(node[k]) && node[k] >= 0)) throw new Error('Invalid or duplicate Figma node');
    if (node.opacity !== undefined && (!Number.isFinite(node.opacity) || node.opacity < 0 || node.opacity > 1)) throw new Error('Invalid node opacity');
    const rotated = parentRotated || (node.rotation !== undefined && node.rotation !== 0);
    ids.add(node.id);
    const effectiveOpacity = parentOpacity * (node.opacity ?? 1);
    const issue = (rule, detail) => issues.push({ nodeId: node.id, rule, detail });
    const visible = parentVisible && node.visible !== false;
    const logo = svgs.enter(node, svg, rotated, visible, issue);
    if (node.type === 'TEXT') {
      if (typeof node.characters !== 'string' || !Number.isFinite(node.fontSize)) throw new Error(`Incomplete TEXT export: ${node.id}`);
      if (!Object.values(sizes).includes(node.fontSize)) issue('font-size', String(node.fontSize));
      for (const term of copy.forbidden) if (normalize(node.characters).includes(normalize(term))) issue('forbidden-copy', term);
    }
    if (!Array.isArray(node.fills)) throw new Error(`Missing fills: ${node.id}`);
    for (const [index, fill] of node.fills.entries()) {
      if (!object(fill) || typeof fill.type !== 'string') throw new Error('Invalid fill');
      if (fill.visible === false) continue;
      if (fill.type === 'IMAGE') {
        const problem = images.inspect(node, fill, index, effectiveOpacity, rotated);
        if (problem) issue('image-provenance', problem);
        continue;
      }
      if (fill.type !== 'SOLID') { issue('unsupported-fill', fill.type); continue; }
      if (!object(fill.color) || !['r', 'g', 'b'].every(k => Number.isFinite(fill.color[k]) && fill.color[k] >= 0 && fill.color[k] <= 1)
        || (fill.opacity !== undefined && (!Number.isFinite(fill.opacity) || fill.opacity < 0 || fill.opacity > 1))) throw new Error('Invalid solid color');
      const hex = [...['r', 'g', 'b'].map(k => fill.color[k]), fill.opacity ?? 1].map(n => Math.round(n * 255).toString(16).padStart(2, '0')).join('');
      if (!logo && !colors.has(hex)) issue('color', `#${hex}`);
    }
    if (node.type === 'FRAME' && !['HORIZONTAL', 'VERTICAL'].includes(node.layoutMode)) issue('auto-layout', 'FRAME needs HORIZONTAL or VERTICAL');
    if (node.componentName !== undefined && !Object.hasOwn(components, node.componentName)) issue('component', node.componentName);
    if ((node.interactive === true || /button/i.test(node.name)) && (node.width < 44 || node.height < 44)) issue('touch-target', `${node.width}x${node.height}`);
    if (node.children !== undefined && !Array.isArray(node.children)) throw new Error('Invalid children');
    if (logo) svgs.paints(logo, node, effectiveOpacity, issue);
    for (const child of node.children ?? []) visit(child, effectiveOpacity, rotated, visible, logo);
  }
  exported.nodes.forEach(node => visit(node));
  images.verifyUsed();
  const svgAssets = svgs.finish(issues);
  const allScreens = wireframes(base);
  const projectPath = 'control/project.json';
  const { scope } = json(base, projectPath);
  let screens = allScreens;
  if (scope?.figmaRootCount !== undefined) {
    const { screen, states, figmaRootCount } = scope;
    if (!id(screen) || !Array.isArray(states) || !states.every(id) || !Number.isInteger(figmaRootCount)
      || figmaRootCount < 1 || states.length !== figmaRootCount || new Set(states).size !== figmaRootCount) {
      throw new Error('Invalid approved Figma scope');
    }
    screens = allScreens.filter(s => s.id === screen && states.includes(s.state));
    if (screens.length !== figmaRootCount) throw new Error('Approved Figma scope does not match wireframes');
  }
  const roots = new Set(exported.nodes.map(n => n.id)), seen = new Set(), mapped = new Set();
  if (!object(map) || !Array.isArray(map.nodes) || !map.nodes.length) throw new Error('node-map.json requires nodes');
  for (const entry of map.nodes) {
    const key = `${entry.screen}/${entry.state}`;
    if (!screens.some(s => `${s.id}/${s.state}` === key) || seen.has(key) || !roots.has(entry.nodeId) || mapped.has(entry.nodeId)) throw new Error('Invalid node-map coverage');
    seen.add(key); mapped.add(entry.nodeId);
  }
  if (seen.size !== screens.length || mapped.size !== roots.size) throw new Error('Incomplete node-map coverage');
  const scopeInputs = screens.length === allScreens.length ? [] : [projectPath];
  return { version: 1, command: 'lint:figma', inputs: hashes(base, [...figmaFiles, ...designInputs, ...images.inputs, ...svgs.inputs, ...scopeInputs, '04-wireframes/wireframes.json']), issues, nodeCount: ids.size,
    ...(svgAssets.length ? { svgAssets } : {}) };
}
export function lintFigma(base, options = {}) {
  const report = inspectFigma(base);
  writeBundle(base, { '07-validation/figma-lint.json': stringify(report) }, options.force);
  return report;
}
export function verifyFigma(base) {
  const expected = inspectFigma(base), actual = json(base, '07-validation/figma-lint.json');
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Stale or invalid lint:figma report');
  if (expected.issues.length) throw new Error(`Figma lint failed: ${expected.issues.map(i => i.rule).join(', ')}`);
}
