import { json, object, read, sha256 } from './io.mjs';
import { isFigmaNodeId } from './figma-node-id.mjs';

const manifestPath = '05-design-system/assets-manifest.json';

// Mapbox GL JS's official 88 × 23 wordmark. Figma duplicates the luminance
// mask for the outer circle and text when importing the SVG.
const outline = ['fills:ffffff:0.3', 'fills:000000:0.3', 'fills:000000:0.3',
  'fills:000000:0.3', 'strokes:000000:0.3'];
const profiles = new Map([[
  '138917d58861eb9d24f730936650d3dbb9b045e0897383fd76add833f83546cc',
  { name: 'Mapbox GL JS', geometrySha256: '89691d72fd8d76d9a057b3dd1eddf222db25c93441b49ffb80d57708d190789e', paints: [...outline, ...outline, 'fills:ffffff:0.9', 'fills:ffffff:0.9'] },
]]);
const vectorTypes = new Set(['FRAME', 'GROUP', 'VECTOR']);
const roundedOpacity = value => Number(value.toFixed(6));

// Omit names, Figma IDs and the container position so moving the asset and
// duplicating it do not affect the import signature.
function geometry(node, root = true) {
  return [
    node.type, root ? [node.width, node.height] : [node.x, node.y, node.width, node.height],
    roundedOpacity(node.opacity ?? 1), node.blendMode ?? 'NORMAL',
    node.clipsContent ?? false, node.isMask ?? false, node.strokeWeight ?? null, node.strokeAlign ?? null,
    node.vectorPaths?.map(path => [path.windingRule, path.data]) ?? null,
    (node.children ?? []).map(child => geometry(child, false)),
  ];
}


export function svgBindings(base, mappings = []) {
  if (!Array.isArray(mappings)) throw new Error('node-map.svgAssets must be an array');
  const bindings = new Map(), inputs = new Set(), checks = [];
  if (mappings.length) {
    const manifest = json(base, manifestPath);
    if (!Array.isArray(manifest?.files)) throw new Error('Invalid system assets manifest');
    inputs.add(manifestPath);
    for (const mapping of mappings) {
      if (!object(mapping) || !isFigmaNodeId(mapping.nodeId) || bindings.has(mapping.nodeId)
          || typeof mapping.asset !== 'string' || !/^assets\/(?:[\w-]+\/)*[\w.-]+\.svg$/i.test(mapping.asset)) {
        throw new Error('Invalid or duplicate SVG asset binding');
      }
      const { nodeId, asset } = mapping;
      const entries = manifest.files.filter(entry => entry?.file === asset || entry?.path === asset);
      if (entries.length !== 1 || (entries[0].file !== undefined && entries[0].path !== undefined && entries[0].file !== entries[0].path)) {
        throw new Error('SVG asset must be uniquely registered in the system manifest: ' + asset);
      }
      const path = '05-design-system/' + asset;
      const bytes = read(base, path), digest = sha256(bytes);
      if (entries[0].bytes !== bytes.length || entries[0].sha256 !== digest) {
        throw new Error('Changed or invalid system SVG asset: ' + asset);
      }
      const profile = profiles.get(digest);
      if (!profile) throw new Error('Unsupported official SVG: ' + asset);
      inputs.add(path);
      bindings.set(nodeId, { nodeId, asset, digest, profile, paints: [], used: false });
    }
  }

  return {
    inputs,
    enter(node, parent, rotated, visible, issue) {
      const bound = bindings.get(node.id);
      if (parent && bound) throw new Error('Nested SVG asset bindings are not allowed');
      const binding = bound ?? parent;
      if (!binding) return undefined;
      if (bound) {
        binding.used = true;
        binding.geometrySha256 = sha256(JSON.stringify(geometry(node)));
        if (binding.geometrySha256 !== binding.profile.geometrySha256) {
          issue('svg-provenance', 'Official SVG vector paths, geometry or layer composition differs from its import profile');
        }
      }
      if (!vectorTypes.has(node.type) || node.interactive || rotated || !visible
          || node.effects?.some(effect => effect.visible !== false)) {
        issue('svg-provenance', 'Official SVG subtree contains hidden, rotated, interactive or non-vector artwork');
      }
      return binding;
    },
    paints(binding, node, effectiveOpacity, issue) {
      for (const field of ['fills', 'strokes']) {
        if (node.type === 'VECTOR' && node[field] === undefined) {
          issue('svg-provenance', 'Official SVG vector is missing its exported ' + field);
          continue;
        }
        const paints = node[field] === undefined ? [] : node[field];
        if (!Array.isArray(paints)) throw new Error('Invalid SVG asset paints');
        for (const paint of paints) {
          const rgb = [paint?.color?.r, paint?.color?.g, paint?.color?.b];
          if (node.type !== 'VECTOR' || paint?.type !== 'SOLID' || paint.visible === false
              || (paint.opacity ?? 1) !== 1 || (paint.blendMode ?? 'NORMAL') !== 'NORMAL'
              || Object.keys(paint.boundVariables ?? {}).length || !rgb.every(channel => channel === 0 || channel === 1)) {
            issue('svg-provenance', 'Unexpected paint in official SVG: ' + field);
            continue;
          }
          const color = rgb.map(channel => channel ? 'ff' : '00').join('');
          binding.paints.push(field + ':' + color + ':' + roundedOpacity(effectiveOpacity));
        }
      }
    },
    finish(issues) {
      for (const binding of bindings.values()) {
        const { nodeId, asset, digest, profile, paints, used, geometrySha256 } = binding;
        if (!used) throw new Error('Unused or orphan SVG asset binding: ' + nodeId);
        if (paints.length !== profile.paints.length || !paints.every((paint, i) => paint === profile.paints[i])) {
          issues.push({ nodeId, rule: 'svg-provenance', detail: 'Official SVG paint order, color or opacity differs from ' + profile.name });
        }
        checks.push({ nodeId, asset, sha256: digest, profile: profile.name, geometrySha256, paintCount: paints.length });
      }
      return checks;
    },
  };
}
