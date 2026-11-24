import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [mode,runtimePath,repoPath]=process.argv.slice(2);
assert.ok(['status','baseline','build','export'].includes(mode));
const runtime=resolve(runtimePath??'/private/tmp/bugmap-nick-native');
const repo=resolve(repoPath??'/Users/mac/Documents/BugMap');
const base=resolve(repo,'work/bugmap-nickname-harness');
const patch=JSON.parse(await readFile(resolve(runtime,'patch.json')));
const plan=JSON.parse(await readFile(new URL('plan.json',import.meta.url)));
const {digest,...input}=plan;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(JSON.stringify(input)),digest);
assert.equal(patch.digest,digest);
assert.equal(patch.channel,'c0762782');
const {check}=await import(pathToFileURL(resolve(repo,'tools/design-harness/harness.mjs')));
const r=check(base);
assert.ok(r.stages.slice(0,5).every(s=>s.status==='passed'));
assert.equal(r.stages[4].upstreamApprovals['design-system'],plan.approval);
for(const [path,h] of Object.entries(plan.sourceDigests))assert.equal(sha(await readFile(resolve(base,path))),h,path);
const ws=new WebSocket('ws://localhost:3055');
function request(type,command=null,timeoutMs=10000) {
  return new Promise((resolve,reject)=>{
    const id=randomUUID();
    const timer=setTimeout(()=>done(Error('No Cursor response: '+(command??type))),timeoutMs);
    function done(error,value) {
      clearTimeout(timer);
      ws.removeEventListener('message',receive);
      error?reject(error):resolve(value);
    }
    function receive(event) {
      const a=JSON.parse(String(event.data));
      if(a.channel!==patch.channel||a.message?.id!==id)return;
      done(a.message?.error?Error(a.message.error):null,a.message?.result);
    }
    ws.addEventListener('message',receive);
    ws.send(JSON.stringify({id,type,channel:patch.channel,...(command?{message:{id,command,params:{fileKey:plan.target.fileKey,digest}}}:{})}));
  });
}
try{
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Cursor socket connect timeout')),5000);
    ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Cursor socket connect failed'))},{once:true});
  });
  await request('join');
  const result=await request('message','bugmap_nickname_'+mode,mode==='status'?8000:130000);
  assert.deepEqual([result.documentName,result.pageId,result.pageName,result.planDigest],
    [plan.target.documentName,plan.target.pageId,plan.target.pageName,digest]);
  assert.ok(result.fileKey===null||result.fileKey===plan.target.fileKey);
  assert.deepEqual(result.anchors.map(n=>n.id),[plan.target.baselineLogin,plan.target.successDestination]);
  if(mode==='build'||mode==='export')assert.equal(result.authored.filter(n=>n.type==='FRAME').length,3);
  await writeFile(resolve(runtime,mode+'.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({mode,document:result.documentName,page:result.pageName,authored:result.authored,
    flows:result.flowStartingPoints,fonts:result.fonts,screens:result.screens?.map(s=>[s.state,s.node.id])}));
}finally{ws.close()}
