import { constants } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = resolve(process.argv[2] ?? '/Users/mac/Documents/BugMap');
const mode = process.argv[3] ?? 'status';
if (!['status','draw','export','repair'].includes(mode)) throw new Error('Usage: node draw.mjs BUGMAP_REPO [status|draw|export|repair]');
const channel = 'bm7map26';
const { check } = await import(pathToFileURL(resolve(repo,'tools/design-harness/harness.mjs')).href);
const { figmaTarget } = await import(pathToFileURL(resolve(repo,'tools/design-harness/figma.mjs')).href);
const project = resolve(repo,'work/bugmap-main-map-harness');
const target = figmaTarget(project);
const stages = check(project).stages;
const stage = stages.find((entry) => entry.stage === 'design-system');
const prepared = JSON.parse(await readFile(new URL('./plan.json',import.meta.url),'utf8'));
const sha = (data) => createHash('sha256').update(data).digest('hex');
const {digest, ...unsigned} = prepared;
if (!stages.slice(0,5).every((entry) => entry.status === 'passed') ||
    stage.upstreamApprovals['design-system'] !== prepared.approval ||
    JSON.stringify(target) !== JSON.stringify(prepared.target) ||
    sha(JSON.stringify(unsigned)) !== digest) {
  throw new Error('The target or design approval differs from the prepared bundle.');
}
for (const [key, path] of [
  ['previewSha256','05-design-system/preview.svg'],
  ['mapSha256','05-design-system/assets/map-dark.svg'],
  ['logoSha256','05-design-system/assets/mapbox-logo.svg'],
  ['wireframeSha256','04-wireframes/wireframes.json'],
]) {
  if (sha(await readFile(resolve(project,path))) !== prepared.sources[key]) {
    throw new Error('Approved input changed: ' + path);
  }
}

const ws = new WebSocket('ws://localhost:3055');
function receive(id, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('No desktop plugin response on channel ' + channel));
    },timeout);
    function cleanup() {
      clearTimeout(timer);
      ws.removeEventListener('message',onMessage);
    }
    function onMessage(event) {
      const envelope = JSON.parse(String(event.data));
      const message = envelope.message;
      if (envelope.channel !== channel || message?.id !== id) return;
      cleanup();
      if (message.error) reject(new Error(message.error));
      else resolve(message.result);
    }
    ws.addEventListener('message',onMessage);
  });
}

async function send(envelope, timeout) {
  const reply = receive(envelope.id,timeout);
  ws.send(JSON.stringify({...envelope,channel}));
  return reply;
}

function request(command, timeout = 15000) {
  const id = randomUUID();
  return send({id,type:'message',message:{id,command,params:{fileKey:target.fileKey,planDigest:digest}}},timeout);
}

function verifyTarget(value) {
  if (!value?.ok || value.pageId !== target.pageId || value.pageName !== target.pageName ||
      ![target.documentName, 'BugMapHarness'].includes(value.documentName) || value.planDigest !== digest ||
      (value.fileKey !== null && value.fileKey !== target.fileKey) ||
      !target.existingFrames.every(({id,name}) => value.roots.some((node) =>
        node.id === id && node.name === name && node.type === 'FRAME'))) {
    throw new Error('Desktop Figma target or existing frame identity differs from the approved target.');
  }
}

const evidence = new URL('../',import.meta.url);
const save = (name, data) => writeFile(new URL(name,evidence),JSON.stringify(data,null,2)+'\n');

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The local TalkToFigma relay is unavailable.')),5000);
    ws.addEventListener('open',() => {clearTimeout(timer);resolve();},{once:true});
    ws.addEventListener('error',() => {clearTimeout(timer);reject(new Error('The local relay connection failed.'));},{once:true});
  });
  await send({id:randomUUID(),type:'join'},5000);
  const status = await request('bugmap_main_status');
  verifyTarget(status);
  if (mode === 'status') {
    console.log(JSON.stringify(status,null,2));
  } else {
    if (mode === 'repair') {
      const baseline = new URL('before-vector-repair/',evidence);
      await mkdir(new URL('captures/',baseline),{recursive:true});
      for (const name of ['nodes.json','node-map.json','preservation.json','captures/main-map-default.png']) {
        try {
          await copyFile(new URL(name,evidence),new URL(name,baseline),constants.COPYFILE_EXCL);
        } catch (error) {
          if (error.code !== 'EEXIST') throw error;
        }
      }
    }
    const command = mode === 'draw' ? 'bugmap_main_build' :
      mode === 'repair' ? 'bugmap_main_repair' : 'bugmap_main_export';
    const result = await request(command,90000);
    verifyTarget(result.before);
    verifyTarget(result.after);
    const { tree, pngBase64 } = result;
    const png = Buffer.from(pngBase64,'base64');
    const viewport = prepared.viewport;
    const old = status.roots.find(({id}) => id === '19:2');
    const expectedX = old.x + old.width + 96;
    if (result.after.existing !== tree.id || tree.type !== 'FRAME' || tree.name !== prepared.name ||
        tree.width !== viewport.width || tree.height !== viewport.height ||
        tree.x !== expectedX || tree.y !== old.y || png.length < 32 ||
        png.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' ||
        png.readUInt32BE(16) !== viewport.width || png.readUInt32BE(20) !== viewport.height ||
        !result.after.roots.some((node) => node.id === tree.id) ||
        JSON.stringify(result.before.roots.filter((node) => node.id !== tree.id)) !==
          JSON.stringify(result.after.roots.filter((node) => node.id !== tree.id))) {
      throw new Error('Remote frame, preserved roots, or PNG bounds failed verification.');
    }

    const exportedAt = new Date().toISOString();
    const url = new URL(target.fileUrl);
    url.searchParams.set('node-id',tree.id.replace(':','-'));
    const capture = 'captures/main-map-default.png';
    let preservation;
    if (result.preservation) {
      const fingerprint = ({id,tree,png}) => ({ id,treeSha256:sha(JSON.stringify(tree)),pngSha256:sha(Buffer.from(png,'base64')) });
      const before = result.preservation.before.map(fingerprint);
      const after = result.preservation.after.map(fingerprint);
      if (JSON.stringify(before) !== JSON.stringify(after) ||
          JSON.stringify(before.map((item) => item.id)) !== JSON.stringify(target.existingFrames.map((item) => item.id))) {
        throw new Error('Before and after tree or capture evidence failed verification.');
      }
      preservation = {verifiedAt:exportedAt, method:'Actual desktop Figma node trees and PNG exports',
        fileKey:target.fileKey, remoteFileKey:result.after.fileKey, pageId:target.pageId,
        before,after, beforeRoots:result.before.roots,afterRoots:result.after.roots,
        captureSha256:sha(png),planDigest:digest};
    }
    await mkdir(new URL('captures/',evidence),{recursive:true});
    await writeFile(new URL(capture,evidence),png);
    await save('nodes.json',{version:1,fileKey:target.fileKey,remoteFileKey:result.after.fileKey,
      documentName:target.documentName,pageId:target.pageId,exportedAt,fonts:result.fonts,
      localVariables:result.variables,nodes:[tree]});
    await save('node-map.json',{nodes:[{screen:'main-map',state:'default',nodeId:tree.id,url:url.href,
      width:tree.width,height:tree.height,capture}]});
    if (preservation) await save('preservation.json',preservation);
    if (result.repair) await save('vector-repair.json',{ ...result.repair, frame:tree.id, exportedAt, captureSha256:sha(png) });
    console.log(JSON.stringify({frame:tree.id,url:url.href,captureSha256:sha(png),
      preservedExistingFrames:Boolean(preservation),fonts:result.fonts},null,2));
  }
} finally {
  ws.close();
}
