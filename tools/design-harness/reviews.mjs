import { openSync, closeSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { findStage, snapshot } from './snapshots.mjs';
import { json, object, sameRecordedHashes, safeStat, within, writeBundle, stringify } from './io.mjs';
import { text, reviewThreshold } from './contracts.mjs';
function load(base, path, stage) {
  if (!safeStat(within(base, path))) return { version: 1, reviews: [] };
  const log = json(base, path);
  const seen = new Set();
  if (!object(log) || log.version !== 1 || !Array.isArray(log.reviews)) throw new Error('Invalid reviews.json schema');
  for (const r of log.reviews) {
    if (!object(r) || !text(r.id) || seen.has(r.id) || r.stage !== stage || !text(r.by) || !text(r.notes)
      || !Number.isFinite(Date.parse(r.at)) || typeof r.score !== 'number' || !Number.isFinite(r.score) || r.score < 0 || r.score > 5
      || !object(r.files) || !Object.keys(r.files).length || !Object.values(r.files).every(h => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h))) throw new Error('Invalid review record');
    seen.add(r.id);
  }
  return log;
}
export function recordReview(base, name, options) {
  const stage = findStage(name);
  const score = options.score === undefined || !String(options.score).trim() ? NaN : Number(options.score);
  if (!text(options.by) || !text(options.notes) || !Number.isFinite(score) || score < 0 || score > 5) throw new Error('review requires --by, --score 0..5 and --notes');
  if (!safeStat(within(base, stage.dir))?.isDirectory()) throw new Error(`Missing stage directory: ${stage.dir}`);
  const path = `${stage.dir}/reviews.json`;
  const lock = within(base, `control/.reviews-${stage.id}.lock`);
  const fd = openSync(lock, 'wx');
  try {
    const log = load(base, path, stage.id);
    const entry = { id: randomUUID(), stage: stage.id, by: options.by.trim(), score, notes: options.notes.trim(),
      at: new Date().toISOString(), files: snapshot(base, stage.id, [path]) };
    log.reviews.push(entry);
    writeBundle(base, { [path]: stringify(log) }, true);
    return entry;
  } finally { closeSync(fd); unlinkSync(lock); }
}
export function verifyReview(base, name, threshold = reviewThreshold(base)) {
  const stage = findStage(name), path = `${stage.dir}/reviews.json`;
  const record = load(base, path, stage.id).reviews.at(-1);
  if (!record) throw new Error(`Missing human review: ${path}`);
  if (!sameRecordedHashes(base, record.files, snapshot(base, stage.id, [path]))) throw new Error(`Stale human review: ${path}`);
  if (record.score < threshold) throw new Error(`Review score ${record.score} below ${threshold}: ${path}`);
  return record;
}
