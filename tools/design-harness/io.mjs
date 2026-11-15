import { lstatSync, readdirSync, readFileSync, mkdirSync, writeFileSync, renameSync, linkSync, unlinkSync } from 'node:fs';
import { resolve, join, relative, sep, dirname, isAbsolute, basename } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const isPlatformMetadata = path => basename(path) === '.DS_Store';
export const artifactHashes = values => Object.fromEntries(Object.entries(values).filter(([path]) => !isPlatformMetadata(path)));

export function safeStat(path) {
  const absolute = resolve(path);
  let current = sep;
  for (const part of absolute.split(sep).filter(Boolean)) {
    current = join(current, part);
    let stat;
    try { stat = lstatSync(current); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`symlink not allowed: ${current}`);
    if (current === absolute) return stat;
    if (!stat.isDirectory()) throw new Error(`Not a directory: ${current}`);
  }
  return lstatSync(absolute);
}
export function within(base, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || path.includes('\\')) throw new Error(`Invalid relative path: ${path}`);
  const absolute = resolve(base, path);
  const rel = relative(resolve(base), absolute);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`Path escapes project: ${path}`);
  safeStat(absolute);
  return absolute;
}
export function read(base, path) {
  const absolute = within(base, path);
  if (!safeStat(absolute)?.isFile()) throw new Error(`Missing file: ${path}`);
  return readFileSync(absolute);
}
export function json(base, path) { return JSON.parse(read(base, path).toString('utf8')); }
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const same = (a, b) => object(a) && object(b) && JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
export function filesUnder(base, path) {
  const files = [];
  function visit(name) {
    const stat = safeStat(within(base, name));
    if (!stat) return;
    if (stat.isFile()) { if (!isPlatformMetadata(name)) files.push(name); }
    else if (stat.isDirectory()) for (const child of readdirSync(within(base, name)).sort()) visit(`${name}/${child}`);
    else throw new Error(`Unsupported file: ${name}`);
  }
  visit(path);
  return files;
}
// Git 체크아웃 설정(core.autocrlf 등)에 따라 텍스트 파일의 줄바꿈이 CRLF↔LF로 바뀌어도
// 승인·리뷰가 무효가 되지 않도록, 줄바꿈만 다른 UTF-8 텍스트는 같은 내용으로 본다.
function lineEndingHashes(bytes) {
  if (bytes.includes(0)) return [];
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) return [];
  const lf = text.replace(/\r\n/g, '\n');
  return [lf, lf.replace(/\n/g, '\r\n')].map(value => sha256(Buffer.from(value, 'utf8')));
}
export function sameRecordedHashes(base, recorded, current) {
  const expected = artifactHashes(recorded), actual = artifactHashes(current);
  const keys = Object.keys(expected).sort();
  if (JSON.stringify(keys) !== JSON.stringify(Object.keys(actual).sort())) return false;
  return keys.every(path => expected[path] === actual[path] || lineEndingHashes(read(base, path)).includes(expected[path]));
}
export function hashes(base, paths) {
  return Object.fromEntries([...new Set(paths)].sort().map(path => [path, sha256(read(base, path))]));
}
export function preflight(base, paths, force = false) {
  for (const path of paths) {
    const stat = safeStat(within(base, path));
    if (stat && (!force || !stat.isFile())) throw new Error(`Refusing to overwrite: ${path}; use --force to regenerate files`);
  }
}
export function writeBundle(base, data, force = false) {
  preflight(base, Object.keys(data), force);
  const temporary = [];
  try {
    for (const [path, bytes] of Object.entries(data)) {
      const absolute = within(base, path);
      mkdirSync(dirname(absolute), { recursive: true });
      safeStat(dirname(absolute));
      const temp = `${absolute}.${randomUUID()}.tmp`;
      writeFileSync(temp, bytes, { flag: 'wx' });
      temporary.push([temp, absolute]);
    }
    for (const [temp, absolute] of temporary) {
      if (force) renameSync(temp, absolute);
      else { linkSync(temp, absolute); unlinkSync(temp); }
    }
  } finally {
    for (const [temp] of temporary) try { unlinkSync(temp); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
export const stringify = data => `${JSON.stringify(data, null, 2)}\n`;
export function evidence(command, inputs, outputs) {
  return { version: 1, generator: 'design-harness', command, at: new Date().toISOString(), inputs,
    outputs: Object.fromEntries(Object.entries(outputs).map(([path, bytes]) => [path, sha256(bytes)])) };
}
export function verifyEvidence(base, path, command, inputs, expectedOutputs) {
  const report = json(base, path);
  if (report.version !== 1 || report.generator !== 'design-harness' || report.command !== command
    || !Number.isFinite(Date.parse(report.at)) || !same(artifactHashes(report.inputs ?? {}), artifactHashes(inputs)) || !object(report.outputs)) {
    throw new Error(`Stale or invalid ${command} evidence: ${path}`);
  }
  const keys = Object.keys(report.outputs).sort();
  if (!keys.length || (expectedOutputs && JSON.stringify(keys) !== JSON.stringify([...expectedOutputs].sort()))
    || !same(report.outputs, hashes(base, keys))) throw new Error(`Changed or missing ${command} outputs: ${path}`);
  return report;
}
export function pngSize(bytes) {
  if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
    || bytes.subarray(12, 16).toString() !== 'IHDR') throw new Error('Invalid PNG capture');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height) throw new Error('Invalid PNG dimensions');
  return { width, height };
}
