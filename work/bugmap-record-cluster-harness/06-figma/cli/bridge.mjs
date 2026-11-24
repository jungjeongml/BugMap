import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mode = process.argv[2] ?? 'status';
assert.ok(['status','baseline','build','export','preservation'].includes(mode));
const runtime = resolve(process.argv[3] ?? '/private/tmp/bugmap-cluster-cursor-runtime');
const repo = resolve(process.argv[4] ?? '/Users/mac/Documents/BugMap');
const plan = JSON.parse(await readFile(new URL('plan.json',import.meta.url),'utf8'));
const patch = JSON.parse(await readFile(resolve(runtime,'patch.json'),'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const { digest,...inputs } = plan;
assert.equal(hash(JSON.stringify(inputs)),digest);
assert.equal(digest,patch.planDigest);
assert.match(patch.channel,/^[a-f0-9]{8}$/);
const base = resolve(repo,'work/bugmap-record-cluster-harness');
const { check } = await import(pathToFileURL(resolve(repo,'tools/design-harness/harness.mjs')));
const stages = check(base).stages;
assert.ok(stages.slice(0,5).every(item=>item.status==='passed'));
assert.equal(stages[4].upstreamApprovals['design-system'],plan.approval);
for (const [path,expected] of Object.entries(plan.sourceDigests)) assert.equal(hash(await readFile(resolve(base,path))),expected,path);
const ws = new WebSocket('ws://localhost:3055');
function message(type, command, timeout) {
  return new Promise((resolve,reject)=>{
    const id=randomUUID();
    const timer=setTimeout(()=>done(new Error('Temporary Cursor lane did not reply: '+(command??type))),timeout);
    function done(error,result) {
      clearTimeout(timer);
      ws.removeEventListener('message',receive);
      if(error) reject(error);
      else resolve(result);
    }
    function receive(event) {
      const reply=JSON.parse(String(event.data));
      if(reply.channel!==patch.channel || reply.message?.id!==id) return;
      done(reply.message?.error ? new Error(reply.message.error) : null,reply.message?.result);
    }
    ws.addEventListener('message',receive);
    ws.send(JSON.stringify({id,type,channel:patch.channel,...(command?{message:{id,command,
      params:{fileKey:plan.target.fileKey,planDigest:digest}}}:{})}));
  });
}
try {
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Local Cursor websocket connection timed out')),5000);
    ws.addEventListener('open',()=>{clearTimeout(timeout);resolve();},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('Local Cursor websocket connection failed'));},{once:true});
  });
  await message('join',null,5000);
  const command = mode === 'preservation' ? 'baseline' : mode;
  if (patch.modes) assert.ok(patch.modes.includes(command), 'Command does not match staged adapter scope');
  const result=await message('message','bugmap_cluster_'+command,mode==='status'?6500:130000);
  if(command!=='baseline') {
    assert.deepEqual([result.documentName,result.pageId,result.pageName,result.planDigest],
      [plan.target.documentName,plan.target.pageId,plan.target.pageName,digest]);
    assert.ok(result.fileKey===null||result.fileKey===plan.target.fileKey);
    assert.deepEqual(result.markers.map(marker=>marker.id),
      [plan.target.prototypeSource.clusterMarkerId,plan.target.prototypeSource.overflowClusterMarkerId]);
    if(mode==='build') assert.equal(result.screens.length,2);
  }
  await writeFile(resolve(runtime,mode+'.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({mode,fileKey:result.fileKey??null,page:result.pageId??null,
    authored:result.authored?.map(item=>[item.id,item.name]),originalMarkerReactions:result.markers?.map(node=>node.reactions),
    nativeAttributionReactions:result.attributionReactions,fonts:result.fonts}));
} finally { ws.close(); }
