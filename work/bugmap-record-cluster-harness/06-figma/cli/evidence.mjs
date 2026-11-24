import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runtime = resolve(process.argv[2] ?? '/private/tmp/bugmap-cluster-cursor-runtime');
const raw = async file => JSON.parse(await readFile(resolve(runtime,file+'.json')));
const plan = JSON.parse(await readFile(new URL('plan.json',import.meta.url),'utf8'));
const path = name => new URL('../'+name,import.meta.url);
const write = (name,value) => writeFile(path(name),JSON.stringify(value,null,2)+'\n');
const hash = value => createHash('sha256').update(value).digest('hex');
const stableHash = value => hash(JSON.stringify(value));
const entries = node => [node,...(node.children??[]).flatMap(entries)];
const find = (tree,id) => entries(tree).find(node=>node.semanticId===id);
const build = await raw('build');
const baseline = await raw('baseline');
const fresh = await raw('export');
const preservationAfter = await raw('preservation').catch(error=>{ if (error.code==='ENOENT') return build.preservation.after; throw error; });
const {target,states,layout} = plan;
const captures = [];
const maps = [];
const images = [];
const svgAssets = [];
const actions = [];
const geometry = [];
function verifyClick(node,toNode) {
  assert.ok(node, 'Missing clickable Figma node');
  const actual = node.reactions ?? [];
  assert.ok(actual.some(r=>r.trigger?.type==='ON_CLICK' && (r.actions ?? [r.action]).some(a=>
    a?.type==='NODE' && a.destinationId===toNode.id && a.navigation==='NAVIGATE')),
  JSON.stringify({node:node.id,target:toNode.id,reactions:actual}));
  actions.push({from:node.id,to:toNode.id,reactions:actual});
}
function decodePng(base64) {
  const bytes = Buffer.from(base64,'base64');
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[390,844]);
  return bytes;
}
assert.deepEqual(fresh.screens,build.screens,'Separate raw Cursor export and PNGs');
assert.deepEqual(fresh.master,build.master);
assert.deepEqual(fresh.markers,build.markers);
assert.deepEqual(fresh.attributionReactions,build.attributionReactions);
assert.equal(fresh.master.type,'COMPONENT');
assert.equal(fresh.master.layoutMode,'HORIZONTAL');
assert.equal(fresh.authored.length,3);
assert.deepEqual(build.preservation.before,baseline);
assert.deepEqual(preservationAfter.roots,baseline.roots);
assert.deepEqual(preservationAfter.flowStartingPoints,baseline.flowStartingPoints);
const baselinePng = decodePng(baseline.mainPng);
const afterPng = decodePng(preservationAfter.mainPng);
assert.equal(hash(baselinePng),plan.mapBaselineSha);
assert.deepEqual(afterPng,baselinePng,'Original discovery map PNG unchanged');
const revisedOriginals = structuredClone(preservationAfter.trees);
const originalMarkerIds = baseline.markerReactions.map(node=>node.id);
for (const [index,node] of baseline.markerReactions.entries()) {
  const revised = revisedOriginals.flatMap(entries).find(item=>item.id===node.id);
  assert.ok(revised);
  assert.equal(revised.reactions.length,node.reactions.length+1);
  assert.deepEqual(revised.reactions.slice(0,-1),node.reactions);
  verifyClick(revised,fresh.screens[index].tree);
  revised.reactions = node.reactions;
}
assert.deepEqual(revisedOriginals,baseline.trees,'Existing native nodes preserved except the two authored marker taps');

const photoHashes = new Map(build.imported.map(photo=>[photo.id,photo]));
assert.equal(photoHashes.size,Object.keys(plan.assets).length);
for (const [index,{state,tree,pngBase64}] of fresh.screens.entries()) {
  const spec = states.find(x=>x.state===state);
  assert.equal(spec.frameName,tree.name);
  assert.deepEqual([tree.width,tree.height,tree.type,tree.layoutMode],[390,844,'FRAME','VERTICAL']);
  assert.ok(entries(tree).filter(node=>node.interactive).every(node=>node.width>=44 && node.height>=44));
  const panel = find(tree,'cluster-panel');
  const title = find(tree,'cluster-panel-title');
  const close = find(tree,'cluster-panel-close');
  const list = find(tree,'record-list');
  const logo = find(tree,'mapbox-logo');
  const attr = find(tree,'map-attribution');
  const mapMarkerId = 'map-'+spec.layout.selectedMarker;
  const selected = find(tree,mapMarkerId);
  assert.equal(selected.selected,'true');
  assert.deepEqual([panel.width,panel.height,panel.y,panel.topLeftRadius,panel.topRightRadius,panel.bottomLeftRadius,panel.bottomRightRadius],
    [390,spec.layout.panel.height,spec.layout.panel.y,32,32,0,0]);
  assert.equal(title.characters,spec.countTitle);
  assert.equal(title.fontSize,24);
  assert.ok(panel.children.includes(title) && panel.children.includes(close) && panel.children.includes(list));
  assert.ok(title.y+title.height<=list.y && close.y+close.height<=list.y);
  assert.deepEqual([list.layoutMode,list.width,list.height,list.clipsContent,list.itemSpacing,list.y+panel.y],
    ['VERTICAL',358,spec.layout.listViewport.height,true,layout.row.gap,spec.layout.listViewport.y]);
  if(spec.records.length===7) assert.match(list.overflowDirection,/^VERTICAL(_SCROLLING)?$/);
  assert.deepEqual([logo.x,logo.y,logo.width,logo.height],[spec.layout.logo.x,spec.layout.logo.y,88,23]);
  assert.deepEqual([attr.x,attr.y,attr.width,attr.height],[spec.layout.attribution.x,spec.layout.attribution.y,44,44]);
  assert.deepEqual(attr.reactions,build.attributionReactions);
  verifyClick(close,{id:target.prototypeSource.nodeId});
  const otherMarker = find(tree,'map-'+states[1-index].layout.selectedMarker);
  verifyClick(otherMarker,fresh.screens[1-index].tree);
  assert.equal(list.children.length,spec.records.length);
  const cards = [];
  for (const [cardIndex,card] of list.children.entries()) {
    const row = spec.records[cardIndex];
    assert.deepEqual([card.type,card.recordId,card.detailRecordId,card.x,card.y,card.width,card.height],
      ['INSTANCE',row.recordId,row.detailRecordId,0,row.rowBoundsAtStart.y-spec.layout.listViewport.y,358,104]);
    const published = photoHashes.get(row.photoId);
    const photo = entries(card).find(node=>node.fills.some(fill=>fill.type==='IMAGE'));
    assert.ok(photo);
    const fillIndex = photo.fills.findIndex(fill=>fill.type==='IMAGE');
    assert.equal(photo.fills[fillIndex].imageHash,published.hash);
    assert.match(published.hash,/^[a-f0-9]{40}$/);
    const source = plan.assets[row.photoId];
    assert.equal(published.path,source.path);
    assert.ok(Math.abs(photo.width/photo.height-source.dimensions.width/source.dimensions.height)<0.0001);
    assert.equal(photo.height,80);
    const labels = entries(card).filter(node=>node.type==='TEXT');
    assert.deepEqual(labels.map(n=>[n.characters,n.fontSize]),[[row.name,18],[row.discoveryDate,14]]);
    images.push({nodeId:photo.id,fillIndex,asset:published.path,imageHash:published.hash});
    cards.push({id:card.id,recordId:card.recordId,y:card.y,height:card.height,visibleAtStart:Math.max(0,Math.min(card.height,list.height-card.y)),
      photoId:photo.id,photoHeight:photo.height});
  }
  assert.deepEqual(cards.map(card=>card.visibleAtStart),spec.records.length===7?[104,104,104,26,0,0,0]:[104,104,104]);
  svgAssets.push({nodeId:logo.id,asset:'assets/mapbox-logo.svg'});
  const capture = 'captures/main-map--'+state+'.png';
  const url = new URL(target.fileUrl);
  url.searchParams.set('node-id',tree.id.replace(':','-'));
  const bytes = decodePng(pngBase64);
  captures.push({capture,bytes});
  maps.push({screen:'main-map',state,nodeId:tree.id,url:url.href,width:390,height:844,capture,captureSha256:hash(bytes),
    web:'web/main-map--'+state+'.html'});
  geometry.push({state,rootId:tree.id,panel:panel.id,header:{title:title.id,close:close.id},attribution:attr.id,selectedMarker:selected.id,
    scrollViewport:{id:list.id,layoutMode:list.layoutMode,height:list.height,clips:list.clipsContent,overflow:list.overflowDirection},
    rows:cards,maxScrollTop:Math.max(0,cards.at(-1).y+cards.at(-1).height-list.height)});
}
const fileIdentity={fileKey:target.fileKey,remoteFileKey:fresh.fileKey,documentName:fresh.documentName,pageId:fresh.pageId};
await mkdir(path('captures/'),{recursive:true});
for (const capture of captures) await writeFile(path(capture.capture),capture.bytes);
await write('nodes.json',{version:1,...fileIdentity,exportedAt:new Date().toISOString(),fonts:build.fonts,localVariables:build.bindings,
  nodes:fresh.screens.map(item=>item.tree)});
await write('node-map.json',{nodes:maps,images,svgAssets});
await write('record-row-component.json',fresh.master);
await write('prototype-readback.json',{...fileIdentity,method:'Native Cursor Figma API read-back',main:target.prototypeSource.nodeId,
  actions,geometry,scrollResetEvidence:'scroll-reset-verification.json',originalAttributionReactions:build.attributionReactions,liveGestureTestedInThisExport:false});
await write('preservation.json',{...fileIdentity,method:'Read-only original roots, full native trees and PNG before; exact comparison after excluding two appended click reactions',
  originalMarkers:originalMarkerIds,originalRootCount:baseline.roots.length,nativeMainPngBefore:hash(baselinePng),nativeMainPngAfter:hash(afterPng),
  priorFlowStartingPoints:baseline.flowStartingPoints,nativeFlowStartingPointsAfter:fresh.flowStartingPoints,
  existingRoots:baseline.roots.map((node,index)=>({id:node.id,name:node.name,treeBefore:stableHash(baseline.trees[index]),treeAfterExcludingTwoRoutes:stableHash(revisedOriginals[index])}))});
await write('fresh-export-check.json',{...fileIdentity,method:'Separate read-only Cursor export after creation. Native trees, PNG bytes, marker routes, and row master match the creation response.',
  planDigest:plan.digest,screenChecks:maps.map(({state,nodeId,captureSha256})=>({state,nodeId,captureSha256})),sameScreens:true,
  sameMaster:true,sameMarkerReactions:true,sameAttributionReactions:true});
console.log(JSON.stringify({screens:maps,images:images.length,actions:actions.length,nativeRows:geometry.map(x=>x.rows.length),
  scrollMax:geometry[1].maxScrollTop,originalRootCount:baseline.roots.length,fonts:build.fonts}));
