import { inspectStage } from './stage-checks.mjs';
import { safeStat, isPlatformMetadata, sameRecordedHashes } from './io.mjs';
import { readdirSync, readFileSync, openSync, closeSync, writeFileSync, renameSync, unlinkSync, realpathSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

import { stages } from './stage-definitions.mjs';
export { stages };

export function projectPath(root, project) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(project)) throw new Error('Invalid project ID');
  return join(realpathSync(resolve(root)), 'work', project);
}

function inspectFile(base, path, hashes, issues) {
  const key = relative(base, path).split(sep).join('/');
  try {
    const stat = safeStat(path);
    if (!stat?.isFile()) { issues.push(`Missing file: ${key}`); return; }
    const bytes = readFileSync(path);
    if (!bytes.length || !bytes.toString('utf8').trim()) issues.push(`Empty file: ${key}`);
    if (key.endsWith('.json')) {
      try { JSON.parse(bytes.toString('utf8')); }
      catch { issues.push(`Invalid JSON: ${key}`); }
    }
    hashes[key] = createHash('sha256').update(bytes).digest('hex');
  } catch (error) { issues.push(`${key}: ${error.message}`); }
}

function walk(base, path, hashes, issues) {
  try {
    const stat = safeStat(path);
    if (!stat) return;
    if (stat.isFile()) { if (!isPlatformMetadata(path)) inspectFile(base, path, hashes, issues); return; }
    if (!stat.isDirectory()) { issues.push(`Unsupported file: ${relative(base, path)}`); return; }
    for (const name of readdirSync(path).sort()) walk(base, join(path, name), hashes, issues);
  } catch (error) { issues.push(error.message); }
}

function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function same(a, b) {
  return JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
}

function loadApprovals(base) {
  const path = join(base, 'control/approvals.json');
  if (!safeStat(path)) return { version: 1, approvals: [] };
  const log = JSON.parse(readFileSync(path, 'utf8'));
  const ids = new Set();
  if (log.version !== 1 || !Array.isArray(log.approvals)) throw new Error('Invalid approvals.json schema');
  for (const entry of log.approvals) {
    if (!object(entry) || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)
      || !stages.some(s => s.id === entry.stage) || typeof entry.by !== 'string' || !entry.by.trim()
      || typeof entry.at !== 'string' || !Number.isFinite(Date.parse(entry.at))
      || !object(entry.files) || !Object.keys(entry.files).length
      || !Object.values(entry.files).every(hash => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash))
      || !object(entry.upstreamApprovals)
      || !Object.entries(entry.upstreamApprovals).every(([stage, id]) => stages.some(s => s.id === stage) && ids.has(id))) {
      throw new Error('Invalid approval entry in approvals.json');
    }
    ids.add(entry.id);
  }
  return log;
}

export function check(base) {
  const log = loadApprovals(base);
  const common = {};
  const commonIssues = [];
  for (const file of ['README.md', 'control/project.json', 'control/decisions.md']) {
    inspectFile(base, join(base, file), common, commonIssues);
  }
  if (safeStat(join(base, 'control/figma.json'))) inspectFile(base, join(base, 'control/figma.json'), common, commonIssues);
  const files = { ...common };
  const upstreamApprovals = {};
  let priorPassed = commonIssues.length === 0;
  const results = stages.map((stage, index) => {
    const hashes = {};
    const issues = index === 0 ? [...commonIssues] : [];
    walk(base, join(base, stage.dir), hashes, issues);
    for (const file of stage.files) {
      const key = `${stage.dir}/${file}`;
      if (file.endsWith('/')) {
        if (!Object.keys(hashes).some(path => path.startsWith(key))) issues.push(`Empty or missing directory: ${key}`);
      } else if (!(key in hashes)) issues.push(`Missing file: ${key}`);
    }
    issues.push(...inspectStage(base, stage, upstreamApprovals));
    Object.assign(files, hashes);
    const structurallyReady = issues.length === 0;
    const latest = [...log.approvals].reverse().find(entry => entry.stage === stage.id);
    const valid = latest && sameRecordedHashes(base, latest.files, files) && same(latest.upstreamApprovals, upstreamApprovals);
    let status;
    if (!priorPassed && index > 0) status = 'blocked';
    else if (latest && !valid) status = 'needs_revision';
    else if (issues.length) status = 'in_progress';
    else if (stage.approval && !valid) status = 'awaiting_approval';
    else status = 'passed';
    if (status === 'needs_revision') issues.push('Approval invalid: files or upstream approvals changed');
    if (status === 'awaiting_approval') issues.push(`Approval required: approve ${stage.id} --by <name>`);
    if (status === 'blocked') issues.push('Previous stage has not passed');
    // A stale approval must not prevent reapproval, but structural issues must.
    const canApprove = (index === 0 ? commonIssues.length === 0 : priorPassed)
      && structurallyReady;
    if (status === 'passed' && latest && valid) upstreamApprovals[stage.id] = latest.id;
    priorPassed = priorPassed && status === 'passed';
    return { stage: stage.id, number: index + 1, status, issues, canApprove,
      files: { ...files }, upstreamApprovals: { ...upstreamApprovals } };
  });
  return { currentStage: results.find(stage => stage.status !== 'passed')?.stage ?? null,
    complete: results.every(stage => stage.status === 'passed'),
    scope: 'Artifact, capture, token, web lint and human-review checks; exported Figma node lint; product behavior and visual Figma verification remain manual.', stages: results };
}

export function approve(base, stageName, by) {
  const stage = stages.find((s, i) => s.id === stageName || String(i + 1) === stageName);
  if (!stage) throw new Error(`Unknown stage: ${stageName}`);
  if (!by?.trim()) throw new Error('--by <name> is required');
  const control = join(base, 'control');
  if (!safeStat(control)?.isDirectory()) throw new Error('Missing control directory');
  const lock = join(control, '.approvals.lock');
  safeStat(lock);
  const fd = openSync(lock, 'wx');
  const temp = join(control, `.approvals-${randomUUID()}.tmp`);
  try {
    const report = check(base);
    const result = report.stages.find(s => s.stage === stage.id);
    if (!result.canApprove) throw new Error(`Cannot approve ${stage.id}: ${result.issues.join('; ')}`);
    const log = loadApprovals(base);
    // When reapproving a passed stage, do not make its own old approval a dependency.
    const upstream = { ...result.upstreamApprovals };
    delete upstream[stage.id];
    const entry = { id: randomUUID(), stage: stage.id, by: by.trim(), at: new Date().toISOString(),
      files: result.files, upstreamApprovals: upstream };
    log.approvals.push(entry);
    writeFileSync(temp, `${JSON.stringify(log, null, 2)}\n`, { flag: 'wx' });
    renameSync(temp, join(control, 'approvals.json'));
    return entry;
  } finally {
    closeSync(fd);
    try { unlinkSync(temp); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    unlinkSync(lock);
  }
}
