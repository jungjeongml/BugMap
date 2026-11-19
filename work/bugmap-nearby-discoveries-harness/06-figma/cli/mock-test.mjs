import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const plan = JSON.parse(readFileSync(new URL('plan.json',import.meta.url)));
const builder = readFileSync(new URL('embedded-builder.js',import.meta.url),'utf8')+'\nthis.command = bugMapNearbyCommand;';
const good = {fileKey:plan.target.fileKey,planDigest:plan.digest};
function fake({wrongPage=false,existingDrag=false,brokenFont=false,failAfterWrite=false}={}) {
  const nodes = new Map();
  let next=900;
  let baselineAfter = false;
  class Node {
    constructor(type,id='44:'+(next++),name=type) {
      Object.assign(this,{type,id,name,x:0,y:0,width:100,height:100,opacity:1,rotation:0,visible:true,
        fills:[],strokes:[],effects:[],reactions:[],children:[],layoutMode:'NONE',data:{}});
      nodes.set(id,this);
    }
    getPluginData(key) {return this.data[key]??'';}
    setPluginData(key,value) {this.data[key]=value;}
    resize(width,height) {Object.assign(this,{width,height});}
    appendChild(node) {node.parent?.detach(node);this.children.push(node);node.parent=this;}
    detach(node) {this.children.filter(()=>true);this.children=this.children.filter(n=>n!==node);delete node.parent;}
    remove() {this.parent?.detach(this);this.removed=true;for(const node of [...this.children])node.remove();}
    async loadAsync() {}
    async setReactionsAsync(rows) {this.reactions=structuredClone(rows);if(this.id==='41:451'&&rows.some(r=>r.trigger.type==='ON_DRAG'))baselineAfter=true;}
    async exportAsync() {
      if(failAfterWrite&&baselineAfter&&this.id==='41:81') throw new Error('mock transport failure after write');
      return Buffer.from('mock view '+this.id);
    }
    clone(instancePrefix) {
      const newId=instancePrefix ? instancePrefix+';'+this.id : '44:'+(next++);
      const clone=new Node(instancePrefix?this.type:'INSTANCE',newId,this.name);
      for(const [key,value] of Object.entries(this)) if(!['id','type','parent','children','data'].includes(key)) clone[key]=structuredClone(value);
      for(const node of this.children) clone.appendChild(node.clone(instancePrefix??'I'+newId));
      return clone;
    }
    createInstance() {return this.clone();}
  }
  const root=new Node('DOCUMENT','0:0','BugMapHarness');
  const page=new Node('PAGE',wrongPage?'1:7':'0:1','Page 1');
  page.flowStartingPoints=[{nodeId:'41:81',name:'Existing'}];
  root.appendChild(page);
  for(const [id,name,x] of [['7:2','02 · 메인 / 발견 지도',0],['19:2','05 · 첫 로그인 / 지도 배경',486],['41:81',plan.target.prototypeSource.name,972]]) {
    const node=new Node('FRAME',id,name); node.resize(390,844);node.x=x;page.appendChild(node);
  }
  const handle=new Node('FRAME','41:451','내 주변 발견 펼치기');handle.resize(390,44);
  handle.reactions=[{trigger:{type:existingDrag?'ON_DRAG':'ON_CLICK'},actions:[{type:'BACK'}]}];
  nodes.get('41:81').appendChild(handle);
  const create = type => {const node=new Node(type);page.appendChild(node);return node;};
  const variables = [];
  const cache = {
    figma:{root,currentPage:page,fileKey:plan.target.fileKey,
      getNodeByIdAsync:async id=>nodes.get(id),
      listAvailableFontsAsync:async()=>['Medium','Bold'].map(style=>({fontName:{family:'Noto Sans KR',style}})),
      loadFontAsync:async()=>{if(brokenFont)throw new Error('broken');},
      createImage:bytes=>({hash:createHash('sha1').update(bytes).digest('hex')}),
      base64Encode:b=>Buffer.from(b).toString('base64'),base64Decode:s=>Buffer.from(s,'base64'),
      createFrame:()=>create('FRAME'),createRectangle:()=>create('RECTANGLE'),createComponent:()=>create('COMPONENT'),
      createText:()=>create('TEXT'),
      createNodeFromSvg:()=>{const node=create('FRAME');node.appendChild(new Node('VECTOR'));return node;},
      group:(nodes,parent)=>{const group=new Node('GROUP');parent.appendChild(group);for(const node of nodes)group.appendChild(node);return group;},
      variables:{
        getLocalVariablesAsync:async()=>variables,
        getLocalVariableCollectionsAsync:async()=>[],
        createVariableCollection:()=>({id:'collection',defaultModeId:'default', remove(){variables.length=0;}}),
        createVariable:(name,collection)=>{const v={name,variableCollectionId:collection.id,id:name,valuesByMode:{},setValueForMode(mode,value){this.valuesByMode[mode]=value;}}; variables.push(v);return v;},
        setBoundVariableForPaint:(paint,property,variable)=>({...paint,boundVariables:{[property]:{id:variable.id}}}),
      },
    },console,
  };
  vm.createContext(cache);vm.runInContext(builder,cache);
  return {cmd:cache.command,page,handle,variables};
}
const normalize = x=>JSON.parse(JSON.stringify(x));
const happy=fake();
const initial=normalize(await happy.cmd('status',good));
assert.equal(initial.roots.length,3);
assert.equal(initial.handle.reactions[0].trigger.type,'ON_CLICK');
const result=normalize(await happy.cmd('build',good));
assert.equal(result.screens.length,2);
assert.equal(result.imported.length,3);
assert.equal(result.preservation.before.anchors.length,3);
assert.deepEqual(result.preservation.before.roots,result.preservation.after.roots);
assert.deepEqual(result.preservation.before.startPoints,result.preservation.after.startPoints);
assert.deepEqual(result.preservation.before.handleReactions,result.preservation.after.handleReactions.slice(0,-1));
assert.equal(result.handle.reactions.at(-1).trigger.type,'ON_DRAG');
assert.equal(result.handle.reactions.at(-1).actions[0].destinationId,result.screens[0].tree.id);
const gather = node=>[node,...node.children?.flatMap(gather)??[]];
for (const [i,screen] of result.screens.entries()) {
  const sequence=gather(screen.tree);
  assert.equal(sequence.filter(node=>node.assetPath).length,i?2:3);
  assert.equal(sequence.find(n=>n.semanticId==='map-return').reactions[0].actions[0].destinationId,'41:81');
  const filter=sequence.find(n=>n.semanticId=== (i?'radius-all':'radius-3km'));
  assert.equal(filter.reactions[0].actions[0].destinationId,result.screens[1-i].tree.id);
}
await assert.rejects(happy.cmd('build',good),/collision/);
await assert.rejects(fake({wrongPage:true}).cmd('build',good),/mismatch/);
await assert.rejects(fake().cmd('build',{...good,planDigest:'wrong'}),/mismatch/);
const preexisting=fake({existingDrag:true});
await assert.rejects(preexisting.cmd('build',good),/already has a drag route/);
assert.equal(preexisting.page.children.length,3);
const failed=fake({failAfterWrite:true});
await assert.rejects(failed.cmd('build',good),/mock transport failure/);
assert.equal(failed.page.children.length,3);
assert.equal(failed.variables.length,0);
assert.equal(failed.handle.reactions.length,1);
assert.equal(failed.handle.reactions[0].trigger.type,'ON_CLICK');
console.log('Scoped plugin mock passed: target and digest rejection, all five routes, captures/asset count, preexisting drag preservation, duplicate protection, failure rollback.');
