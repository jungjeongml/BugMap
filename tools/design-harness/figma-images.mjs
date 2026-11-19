import { json, read, sha256, pngSize, object } from './io.mjs';
import { isFigmaNodeId } from './figma-node-id.mjs';

// An import binding connects an unchanged system PNG to the imageHash read back
// from Figma. This checks local provenance/geometry, not remote pixel authenticity.
export function imageBindings(base, mappings) {
  const bindings = new Map(), used = new Set(), inputs = new Set();
  if (mappings !== undefined && !Array.isArray(mappings)) throw new Error('node-map.images must be an array');
  let entries;
  for (const binding of mappings ?? []) {
    if (!object(binding) || !isFigmaNodeId(binding.nodeId)
      || !Number.isInteger(binding.fillIndex) || binding.fillIndex < 0
      || typeof binding.asset !== 'string' || !binding.asset.startsWith('assets/')
      || binding.asset.includes('\\') || binding.asset.split('/').some(p => !p || p === '.' || p === '..')
      || !/^[a-f0-9]{40}$/.test(binding.imageHash ?? '')) throw new Error('Invalid image import binding');
    const key = `${binding.nodeId}/${binding.fillIndex}`;
    if (bindings.has(key)) throw new Error('Duplicate image import binding');
    if (!entries) {
      const manifest = json(base, '05-design-system/assets-manifest.json');
      if (!object(manifest) || !Array.isArray(manifest.files)) throw new Error('Invalid system assets manifest');
      entries = new Map();
      for (const entry of manifest.files) {
        const path = entry?.path ?? entry?.file;
        if (!object(entry) || typeof path !== 'string' || entries.has(path)
            || (entry.path !== undefined && entry.file !== undefined && entry.path !== entry.file)) {
          throw new Error('Invalid or duplicate system asset');
        }
        entries.set(path, entry);
      }
      inputs.add('05-design-system/assets-manifest.json');
    }
    const entry = entries.get(binding.asset), path = `05-design-system/${binding.asset}`;
    if (!entry || !/\.png$/i.test(binding.asset)) throw new Error('Image asset is not a registered system PNG');
    const bytes = read(base, path), dimensions = pngSize(bytes);
    if (entry.sha256 !== sha256(bytes) || entry.bytes !== bytes.length
      || entry.dimensions?.width !== dimensions.width || entry.dimensions?.height !== dimensions.height) throw new Error('Changed or invalid system PNG asset');
    inputs.add(path);
    bindings.set(key, { ...binding, dimensions });
  }
  return {
    inputs,
    inspect(node, fill, index, effectiveOpacity, rotated) {
      const key = `${node.id}/${index}`, binding = bindings.get(key);
      if (!binding) return 'IMAGE fill has no system asset import binding';
      used.add(key);
      if (fill.imageHash !== binding.imageHash) return 'Image hash differs from import binding';
      // Native FIT/FILL exports may include the exact identity matrix.
      const hasImageTransform = fill.imageTransform !== undefined && JSON.stringify(fill.imageTransform) !== '[[1,0,0],[0,1,0]]';
      if (!['FILL', 'FIT'].includes(fill.scaleMode) || (fill.opacity !== undefined && fill.opacity !== 1) || effectiveOpacity !== 1 || rotated
        || (fill.rotation !== undefined && fill.rotation !== 0) || hasImageTransform
        || (fill.filters !== undefined && (!object(fill.filters) || Object.values(fill.filters).some(value => value !== 0)))) return 'Image paint changes the original artwork';
      const { width, height } = binding.dimensions;
      if (node.width <= 0 || node.height <= 0 || Math.abs((node.width / node.height) / (width / height) - 1) > 0.001) return 'Image aspect ratio differs from system PNG';
      return null;
    },
    verifyUsed() { if (used.size !== bindings.size) throw new Error('Unused or orphan image import binding'); },
  };
}
