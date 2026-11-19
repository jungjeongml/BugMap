import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mode = process.argv[2] ?? 'status';
if (!['status','baseline','build','export','receipt'].includes(mode)) throw new Error('Usage: node draw.mjs status|baseline|build|export|receipt [channel] [repo root]');
const repo = resolve(process.argv[4] ?? '/Users/mac/Documents/BugMap');
const project = resolve(repo,'work/bugmap-nearby-discoveries-harness');
const { check } = await import(pathToFileURL(resolve(repo,'tools/design-harness/harness.mjs')));
const { figmaTarget } = await import(pathToFileURL(resolve(repo,'tools/design-harness/figma.mjs')));
const stage = check(project).stages;
const target = figmaTarget(project);
const plan = JSON.parse(await readFile(new URL('plan.json',import.meta.url),'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const { digest,...unsigned } = plan;
assert.equal(digest,sha(JSON.stringify(unsigned)));
assert.deepEqual(target,plan.target);
assert.ok(stage.slice(0,5).every(({status})=>status==='passed'));
assert.equal(stage[4].upstreamApprovals['design-system'],plan.approval);
for (const [path,hex] of Object.entries(plan.sourceDigests)) assert.equal(sha(await readFile(resolve(project,path))),hex,path);
const adapter = JSON.parse(await readFile(new URL('adapter/patch.json',import.meta.url),'utf8').catch(error => error.code === 'ENOENT' ? '{}' : Promise.reject(error)));
const channel = process.argv[3] ?? adapter.channel;
if (!/^[a-z0-9]{8}$/.test(channel ?? '')) throw new Error('Provide the confirmed nearby connector channel');
const url = new URL('../',import.meta.url);
const json = (path, data) => writeFile(new URL(path,url),JSON.stringify(data,null,2)+'\n');
const ws = mode === 'receipt' ? null : new WebSocket('ws://localhost:3055');
function message(type, command, timeout) {
  return new Promise((resolve,reject) => {
    const id = randomUUID();
    const timer = setTimeout(() => done(new Error('No nearby plugin reply on '+channel+': '+(command??type))),timeout);
    function done(error,result) {
      clearTimeout(timer);
      ws.removeEventListener('message',receive);
      if (error) reject(error);
      else resolve(result);
    }
    function receive(event) {
      const reply = JSON.parse(String(event.data));
      if (reply.channel !== channel || reply.message?.id !== id) return;
      done(reply.message?.error?new Error(reply.message.error):null,reply.message?.result);
    }
    ws.addEventListener('message',receive);
    ws.send(JSON.stringify({id,type,channel,...(command?{message:{id,command,params:{fileKey:target.fileKey,planDigest:digest}}}:{})}));
  });
}
const request = (mode, timeout=12000) => message('message','bugmap_nearby_'+mode,timeout);
function verifyStatus(status) {
  assert.equal(status.documentName,target.documentName);
  assert.equal(status.pageId,target.pageId);
  assert.equal(status.pageName,target.pageName);
  if (status.fileKey !== null) assert.equal(status.fileKey,target.fileKey);
  assert.equal(status.planDigest,digest);
  assert.equal(status.handle.id,target.prototypeSource.dragHandleId);
  assert.equal(status.handle.width,390);
  assert.equal(status.handle.height,44);
  assert.equal(status.roots.find(({id})=>id===target.prototypeSource.nodeId)?.name,target.prototypeSource.name);
}
function decodePng(data) {
  const png = Buffer.from(data,'base64');
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),390);
  assert.equal(png.readUInt32BE(20),844);
  return png;
}
function descendants(node) {
  return [node,...(node.children??[]).flatMap(descendants)];
}
function navigation(reactions, trigger, destinationId) {
  return reactions.some(r=>r.trigger?.type===trigger && (r.actions??[r.action]).some(a=>a?.type==='NODE' &&
    a.navigation==='NAVIGATE' && a.destinationId===destinationId));
}
function verifyPreservation(preservation, allId) {
  const {before,after} = preservation;
  assert.deepEqual(after.roots,before.roots,'Page roots before new nearby frames');
  const originalFlows = new Set(before.startPoints.map(({nodeId})=>nodeId));
  assert.deepEqual(after.startPoints.filter(({nodeId})=>originalFlows.has(nodeId)),before.startPoints,'Existing prototype start points');
  const addedFlows = after.startPoints.filter(({nodeId})=>!originalFlows.has(nodeId));
  assert.ok(addedFlows.length === 0 || (before.startPoints.length === 0 && addedFlows.length === 1 &&
    addedFlows[0].name === 'Flow 1' && addedFlows[0].nodeId === allId), 'Only the native first-reaction start point on the new frame is permitted');
  assert.ok(navigation(after.handleReactions,'ON_DRAG',allId));
  assert.equal(after.handleReactions.length,before.handleReactions.length+1);
  assert.deepEqual(after.handleReactions.slice(0,-1),before.handleReactions,'Prior handle reactions');
  assert.deepEqual(before.anchors.map(({id})=>id),['7:2','19:2',target.prototypeSource.nodeId]);
  assert.deepEqual(after.anchors.map(({id})=>id),before.anchors.map(({id})=>id));
  const summarize = (list,dropAddedReaction) => list.map(({id,tree,png})=>{
    const normalized = structuredClone(tree);
    if (dropAddedReaction && id === target.prototypeSource.nodeId) {
      const handle = descendants(normalized).find(n=>n.id===target.prototypeSource.dragHandleId);
      assert.ok(handle);
      handle.reactions = before.handleReactions;
    }
    return {id,rawTreeSha256:sha(JSON.stringify(tree)),treeSha256IgnoringAddedDrag:sha(JSON.stringify(normalized)),pngSha256:sha(Buffer.from(png,'base64'))};
  });
  const beforeAnchors = summarize(before.anchors,false);
  const afterAnchors = summarize(after.anchors,true);
  assert.deepEqual(
    beforeAnchors.map(({id,treeSha256IgnoringAddedDrag,pngSha256})=>({id,treeSha256IgnoringAddedDrag,pngSha256})),
    afterAnchors.map(({id,treeSha256IgnoringAddedDrag,pngSha256})=>({id,treeSha256IgnoringAddedDrag,pngSha256})),
    'Existing frame captures and all serialized tree properties except exactly one handle drag route'
  );
  return {method:'Figma desktop native exports and recursive node properties immediately before and after write',
    verifiedAt:new Date().toISOString(),fileKey:target.fileKey,actualPluginFileKey:after.fileKey??null,
    pageId:target.pageId,handleId:target.prototypeSource.dragHandleId,autoGeneratedFlowStartingPoints:addedFlows,
    before:{anchors:beforeAnchors,roots:before.roots,flowStartingPoints:before.startPoints,handleReactions:before.handleReactions},
    after:{anchors:afterAnchors,roots:after.roots,flowStartingPoints:after.startPoints,handleReactions:after.handleReactions}};
}
try {
  if (mode !== 'receipt') await new Promise((resolve,reject) => {
    const timeout = setTimeout(() => reject(new Error('Local Cursor relay timed out')),6000);
    ws.addEventListener('open',()=>{clearTimeout(timeout);resolve();},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('Local Cursor relay connection failed'));},{once:true});
  });
  if (mode !== 'receipt') await message('join',null,5000);
  const status = mode === 'receipt' ? null : await request('status');
  if (status) verifyStatus(status);
  if (mode === 'status') {
    await json('cursor-preflight.json',status);
    console.log(JSON.stringify(status,null,2));
  } else if (mode === 'baseline') {
    const result = await request('baseline',90000);
    await json('cursor-baseline.raw.json',result);
    console.log(JSON.stringify({anchors:result.anchors.map(({id})=>id),handleReactions:result.handleReactions}));
  } else {
    const response = mode === 'receipt'
      ? JSON.parse(await readFile(new URL('cursor-remote-receipt.raw.json',url),'utf8'))
      : await request(mode,120000);
    if (mode === 'build') await json('cursor-remote-receipt.raw.json',response);
    if (mode === 'export') await json('cursor-fresh-export.raw.json',response);
    verifyStatus(response);
    assert.equal(response.screens.length,2);
    const all = response.screens.find(({state})=>state === 'default');
    const radius = response.screens.find(({state})=>state === 'radius-3km');
    assert.ok(all&&radius);
    const main = target.prototypeSource.nodeId;
    const handle = target.prototypeSource.dragHandleId;
    const actions = [{from:main,interactiveNode:handle,trigger:'ON_DRAG',to:all.tree.id,reactions:response.handle.reactions}];
    assert.ok(navigation(response.handle.reactions,'ON_DRAG',all.tree.id));
    const knownImages = new Map(response.imported.map(({path,hash})=>[path,hash]));
    assert.equal(knownImages.size,3);
    const mapped = [];
    const mappedImages = [];
    await mkdir(new URL('captures/',url),{recursive:true});
    for (const screen of [all,radius]) {
      const record = plan.states.find(({state})=>state===screen.state);
      const {tree} = screen;
      assert.equal(tree.name,record.name);
      assert.equal(tree.width,390);
      assert.equal(tree.height,844);
      assert.equal(tree.type,'FRAME');
      const allNodes = descendants(tree);
      assert.ok(allNodes.filter(node=>node.interactive).every(node=>node.width>=44&&node.height>=44));
      const resultCount = allNodes.filter(node=>node.characters===(screen.state==='default'?'기록 3개':'기록 2개'));
      assert.equal(resultCount.length,1);
      const routes = [['map-return',main],screen.state==='default'?['radius-3km',radius.tree.id]:['radius-all',all.tree.id]];
      for (const [semanticId,destination] of routes) {
        const node = allNodes.find(node=>node.semanticId===semanticId);
        assert.ok(node && navigation(node.reactions??[],'ON_CLICK',destination),'Read-back of '+semanticId);
        actions.push({from:tree.id,interactiveNode:node.id,trigger:'ON_CLICK',to:destination,reactions:node.reactions});
      }
      const images = [];
      for (const node of allNodes) for (const [fillIndex,fill] of node.fills.entries()) {
        if (fill.type !== 'IMAGE') continue;
        assert.ok(node.assetPath && knownImages.get(node.assetPath)===fill.imageHash);
        assert.match(fill.imageHash,/^[a-f0-9]{40}$/);
        assert.equal(fill.scaleMode,'FIT');
        assert.equal(node.width,88);
        assert.equal(node.height,88);
        images.push({nodeId:node.id,fillIndex,asset:node.assetPath,imageHash:fill.imageHash});
      }
      assert.equal(images.length,screen.state==='default'?3:2);
      mappedImages.push(...images);
      const figmaUrl = new URL(target.fileUrl);
      figmaUrl.searchParams.set('node-id',tree.id.replace(':','-'));
      const capture = 'captures/nearby-discoveries-'+screen.state+'.png';
      const png = decodePng(screen.pngBase64);
      await writeFile(new URL(capture,url),png);
      mapped.push({screen:'nearby-discoveries',state:screen.state,nodeId:tree.id,url:figmaUrl.href,width:390,height:844,
        capture,captureSha256:sha(png)});
    }
    if (mode === 'export') {
      const previous = JSON.parse(await readFile(new URL('nodes.json',url),'utf8'));
      const previousMap = JSON.parse(await readFile(new URL('node-map.json',url),'utf8'));
      const previousPrototype = JSON.parse(await readFile(new URL('prototype-readback.json',url),'utf8'));
      assert.deepEqual([all.tree,radius.tree],previous.nodes,'Fresh Figma node trees');
      assert.deepEqual(mapped,previousMap.nodes,'Fresh Figma capture hashes');
      assert.deepEqual(mappedImages,previousMap.images,'Fresh Figma image bindings');
      assert.deepEqual(actions,previousPrototype.actions,'Fresh Figma prototype reaction readback');
      const proof = {method:'Second native Figma read-only export after construction',
        checkedAt:new Date().toISOString(),sameTree:true,sameCaptures:true,sameImageBindings:true,sameActions:true,
        screens:mapped.map(({nodeId,state,captureSha256})=>({nodeId,state,captureSha256}))};
      await json('fresh-export-check.json',proof);
      console.log(JSON.stringify(proof,null,2));
      process.exitCode = 0;
    } else {
    const preservation = response.preservation ? verifyPreservation(response.preservation,all.tree.id) : null;
    const exportedAt = new Date().toISOString();
    await json('nodes.json',{version:1,fileKey:target.fileKey,remoteFileKey:response.fileKey,documentName:target.documentName,
      pageId:target.pageId,exportedAt,fonts:response.fonts,localVariables:response.variables,nodes:[all.tree,radius.tree]});
    await json('node-map.json',{nodes:mapped,images:mappedImages});
    await json('prototype-readback.json',{method:'Actual Figma desktop node.reactions read-back',runtimeGestureTested:false,
      fileKey:target.fileKey,pageId:target.pageId,entry:main,actions});
    if (preservation) await json('preservation.json',{...preservation,actualPluginFileKey:response.fileKey});
    console.log(JSON.stringify({exportedAt,mapped,images:mappedImages.length,actions:actions.length,preserved:!!preservation,fonts:response.fonts},null,2));
    }
  }
} finally {ws?.close();}
