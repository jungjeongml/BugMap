import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const plan = JSON.parse(readFileSync(new URL('plan.json',import.meta.url)));
const builder = 'const RECORD_ENTRY_PLAN='+JSON.stringify(plan)+';const RECORD_ENTRY_ASSET_BYTES={};'
  +readFileSync(new URL('plugin.js',import.meta.url),'utf8')+'\nthis.command=bugMapRecordEntryCommand;';
const good = {fileKey:plan.target.fileKey,planDigest:plan.digest};
function fake({wrongPage=false,existingClick=false,brokenFont=false,failAfterWrite=false}={}) {
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
    resizeWithoutConstraints(width,height) { this.resize(width,height); }
    findOne(g) { for(const child of this.children) { if(g(child)) return child; const node=child.findOne(g); if(node) return node; } }
    async loadAsync() {}
    async setReactionsAsync(rows) {this.reactions=structuredClone(rows);if(this.id==='41:443'&&rows.some(r=>r.trigger.type==='ON_CLICK'))baselineAfter=true;}
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
  for(const [id,name,x] of [['7:2','02 · 메인 / 발견 지도',0],['19:2','05 · 첫 로그인 / 지도 배경',486],['41:81',plan.target.prototypeSource.name,972],['50:1081','Nearby A',1440],['50:1190','Nearby B',1930]]) {
    const node=new Node('FRAME',id,name); node.resize(390,844);node.x=x;page.appendChild(node);
  }
  const handle=new Node('FRAME','41:443','발견/채집 기록하기');handle.resize(184,48);
  handle.reactions=[{trigger:{type:existingClick?'ON_CLICK':'ON_DRAG'},actions:[{type:'BACK'}]}];
  nodes.get('41:81').appendChild(handle);
  const create = type => {const node=new Node(type);page.appendChild(node);return node;};
  const variables = [];
  const cache = {
    figma:{root,currentPage:page,fileKey:plan.target.fileKey,
      getNodeByIdAsync:async id=>nodes.get(id),
      listAvailableFontsAsync:async()=>['Medium','Bold'].map(style=>({fontName:{family:'Noto Sans KR',style}})),
      loadFontAsync:async()=>{if(brokenFont)throw new Error('broken');},
      createImage:bytes=>({hash:createHash('sha1').update(bytes).digest('hex')}),
      base64Encode:b=>Buffer.from(b).toString('base64'),base64Decode:s=>Buffer.from(s??'','base64'),
      createFrame:()=>create('FRAME'),createSection:()=>create('SECTION'),createEllipse:()=>create('ELLIPSE'),createRectangle:()=>create('RECTANGLE'),createComponent:()=>create('COMPONENT'),
      createText:()=>create('TEXT'),
      createNodeFromSvg:()=>{const node=create('FRAME');const vector=new Node('VECTOR');
        vector.vectorPaths=[{windingRule:'NONE',data:'M0,0'}]; vector.fills=[{type:'SOLID',color:{r:0,g:0,b:0}}];
        node.appendChild(vector);return node;},
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
const ok=fake();
const initial=normalize(await ok.cmd('status',good));
assert.equal(initial.roots.length,5);
assert.equal(initial.cta.reactions[0].trigger.type,'ON_DRAG');
const before=normalize(await ok.cmd('baseline',good));
const built=normalize(await ok.cmd('build',good));
assert.equal(built.screens.length,2);
assert.deepEqual(built.preservation.before,before);
assert.deepEqual(built.preservation.before.roots,built.preservation.after.roots);
assert.equal(built.cta.reactions[1].actions[0].destinationId,built.screens[0].tree.id);
const gather=node=>[node,...(node.children??[]).flatMap(gather)];
for (const [index,screen] of built.screens.entries()) {
  const nodes=gather(screen.tree);
  assert.equal(nodes.filter(node=>node.assetPath).length,index?3:0);
  assert.equal(screen.back.reactions[0].actions[0].destinationId,'41:81');
  assert.equal(nodes.find(n=>n.semanticId==='body-content').height,index?794:696);
  assert.equal(nodes.find(n=>n.semanticId==='memo-input').accessibility.multiline,true);
}
assert.deepEqual(normalize((await ok.cmd('export',good)).screens),built.screens);
assert.ok(built.screens.flatMap(screen=>gather(screen.tree)).every(n=>n.type!=='VECTOR'||n.fills.length===0));
await assert.rejects(ok.cmd('repair',good),/conditions did not match/);
await assert.rejects(ok.cmd('build',good),/already exists/);
await assert.rejects(fake({wrongPage:true}).cmd('build',good),/mismatch/);
await assert.rejects(fake().cmd('build',{...good,planDigest:'wrong'}),/mismatch/);
const preexisting=fake({existingClick:true});
await assert.rejects(preexisting.cmd('build',good),/already has an ON_CLICK/);
assert.equal(preexisting.page.children.length,5);
const failed=fake({failAfterWrite:true});
await assert.rejects(failed.cmd('build',good),/mock transport failure/);
assert.equal(failed.page.children.length,5);
assert.equal(failed.variables.length,0);
assert.equal(failed.handle.reactions.length,1);
assert.equal(failed.handle.reactions[0].trigger.type,'ON_DRAG');
console.log('Mock native build passed target guards, scoped routes, preservation, export, duplicate prevention, and rollback.');
