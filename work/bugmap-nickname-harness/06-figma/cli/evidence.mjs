import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,copyFile,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
const [runtimePath,repoPath,stagePath]=process.argv.slice(2);
const runtime=resolve(runtimePath??'/private/tmp/bugmap-nick-native'),repo=resolve(repoPath??'/Users/mac/Documents/BugMap');
const project=resolve(repo,'work/bugmap-nickname-harness');
const stage=resolve(stagePath??'/private/tmp/bugmap-nick-native/stage');
const source=resolve(project,'05-design-system');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async file=>JSON.parse(await readFile(resolve(runtime,file)));
const write=async (file,value)=>writeFile(resolve(stage,file),JSON.stringify(value,null,2)+'\n');
const plan=JSON.parse(await readFile(new URL('plan.json',import.meta.url)));
const [baseline,build,exported,restore]=await Promise.all(['baseline.json','build.json','export.json','restore.json'].map(read));
for(const data of [baseline,build,exported])
  assert.deepEqual([data.documentName,data.pageId,data.planDigest],[plan.target.documentName,plan.target.pageId,plan.digest]);
assert.deepEqual(baseline.authored,[]);
assert.deepEqual(exported.original,baseline.original);
assert.deepEqual(build.original,baseline.original);
assert.deepEqual(exported.authored,build.authored);
const native=[];
const readback=[];
const original={
  originalRoots:baseline.original.roots,
  originalTreeFingerprints:baseline.original.trees,
  originalFlowStartingPoints:baseline.original.flowStartingPoints,
  loginPngSha256:sha(Buffer.from(baseline.original.png.login,'base64')),
  mapPngSha256:sha(Buffer.from(baseline.original.png.map,'base64')),
  sameAfterDetachedExport:true,
  originalNodesTouched:false
};
const flat=(node)=>[node,...(node.children??[]).flatMap(flat)];
const fonts=new Set();
await mkdir(resolve(stage,'captures'),{recursive:true});
await mkdir(resolve(stage,'web','screens'),{recursive:true});
for(const [index,{node,state,image}] of exported.screens.entries()) {
  assert.deepEqual([node.type,node.width,node.height,state,node.name],['FRAME',390,844,plan.states[index].id,plan.states[index].name]);
  assert.equal(node.children.length,9);
  const byTag=Object.fromEntries(node.children.map(n=>[n.semanticId,n]));
  for(const [tag,expected] of Object.entries(plan.blocks)) {
    const actual=byTag[tag];
    assert.ok(actual,tag);
    assert.deepEqual(Object.fromEntries(Object.keys(expected).map(k=>[k,actual[k]])),expected,tag);
  }
  const ready=state==='ready',invalid=state==='invalid';
  const values=flat(node).filter(n=>n.type==='TEXT');
  for(const n of values)fonts.add(n.fontName.family);
  assert.ok(values.some(n=>n.characters===(ready?plan.strings.validValue:invalid?plan.strings.invalidValue:plan.strings.placeholder)));
  assert.ok(values.some(n=>n.characters===(invalid?plan.strings.tooShort:plan.strings.guidance)));
  assert.ok((byTag.start.reactions??[]).length===(ready?1:0));
  if(ready)assert.deepEqual([byTag.start.reactions[0].trigger.type,byTag.start.reactions[0].actions[0].destinationId],['ON_CLICK','41:81']);
  assert.ok(exported.flowStartingPoints.some(p=>p.nodeId===node.id&&p.name===plan.states[index].flow));
  const path='captures/nickname-setup--'+state+'.png';
  const b=Buffer.from(image,'base64');
  assert.deepEqual([b.readUInt32BE(16),b.readUInt32BE(20)],[390,844]);
  await writeFile(resolve(stage,path),b);
  const web='web/screens/nickname-setup--'+state+'.html';
  await copyFile(resolve(source,'previews','nickname-setup--'+state+'.html'),resolve(stage,web));
  native.push({screen:'nickname-setup',state,nodeId:node.id,width:390,height:844,capture:path,captureSha256:sha(b),web,
    url:'https://www.figma.com/design/'+plan.target.fileKey+'/BugMapHarness?node-id='+node.id.replace(':','-')});
  readback.push({state,frameId:node.id,startButtonId:byTag.start.id,reactions:byTag.start.reactions??[],
    flow:exported.flowStartingPoints.find(p=>p.nodeId===node.id)});
}
assert.equal(fonts.size,1);
await copyFile(resolve(source,'previews','nickname.css'),resolve(stage,'web','screens','nickname.css'));
await cp(resolve(source,'assets'),resolve(stage,'web','assets'),{recursive:true});
await write('nodes.json',{version:1,fileKey:plan.target.fileKey,remoteFileKey:exported.fileKey,pageId:exported.pageId,
  exportedAt:exported.exportedAt,documentName:exported.documentName,fonts:build.fonts,nodes:exported.screens.map(s=>s.node)});
await write('node-map.json',{nodes:native});
await write('prototype-readback.json',{method:'Native Cursor MCP Plugin export after build',fileKey:plan.target.fileKey,
  pageId:exported.pageId,destination:'41:81',originalFlowStartingPoints:baseline.original.flowStartingPoints,
  addedFlows:readback,playerInteractionVerified:false});
await write('preservation.json',original);
await write('cursor-source-restore.json',restore);
await write('components.json',{section:build.section,collection:build.collection,components:exported.components});
await write('fresh-export-check.json',{capturedAt:exported.exportedAt,approvedPlanSha256:plan.digest,
  captures:native.map(({state,nodeId,capture,captureSha256})=>({state,nodeId,capture,captureSha256})),
  preserved:original,sameAuthoredRoots:true});
await mkdir(resolve(stage,'cli'),{recursive:true});
for(const name of ['plugin.js','prepare.mjs','bridge.mjs','evidence.mjs','adapter.mjs','plan.json']) {
 await copyFile(new URL(name,import.meta.url),resolve(stage,'cli',name));
}
console.log(JSON.stringify({stage,pngs:native.map(x=>[x.state,x.nodeId,x.captureSha256]),
  fonts:[...fonts],components:exported.components.length,originalRoots:original.originalRoots.length,
  prototype:readback.map(x=>[x.frameId,x.startButtonId,x.reactions.length])}));
