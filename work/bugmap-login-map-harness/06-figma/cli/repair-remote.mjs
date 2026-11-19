import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repo, channel, mode = 'status'] = process.argv.slice(2);
if (!repo || !/^[a-z\d]{8}$/i.test(channel ?? '') || !['status','draw'].includes(mode)) {
  throw new Error('Usage: draw.mjs BUGMAP_REPO FIGMA_CHANNEL [status|draw]');
}
const project=resolve(repo,'work/bugmap-login-map-harness');
const {check}=await import(pathToFileURL(resolve(repo,'tools/design-harness/harness.mjs')));
const {figmaTarget}=await import(pathToFileURL(resolve(repo,'tools/design-harness/figma.mjs')));
const target=figmaTarget(project);
const stage=check(project).stages.find(entry=>entry.stage==='design-system');
const prepared=JSON.parse(await readFile(new URL('plan.json',import.meta.url),'utf8'));
if(stage.status!=='passed'||prepared.approval!==stage.upstreamApprovals['design-system']||
   prepared.target.fileKey!==target.fileKey||prepared.target.pageId!==target.pageId) {
  throw new Error('Design-system approval and prepared CLI target must match.');
}

const ws=new WebSocket('ws://localhost:3055');
function receive(id,timeout){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error('No CLI response from Figma desktop channel '+channel));},timeout);
    function cleanup(){clearTimeout(timer);ws.removeEventListener('message',onMessage);}
    function onMessage(event){
      const envelope=JSON.parse(String(event.data));
      const message=envelope.message;
      if(message?.id!==id)return;
      cleanup();
      if(message.error)reject(new Error(message.error));
      else resolve(message.result);
    }
    ws.addEventListener('message',onMessage);
  });
}
async function request(command,params={},timeout=12000){
  const id=randomUUID();
  const response=receive(id,timeout);
  ws.send(JSON.stringify({id,channel,type:'message',message:{id,command,params}}));
  return response;
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const evidence=new URL('../',import.meta.url);
const save=(name,data)=>writeFile(new URL(name,evidence),JSON.stringify(data,null,2)+'\n');
try {
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Local TalkToFigma relay unavailable')),5000);
    ws.addEventListener('open',()=>{clearTimeout(timeout);resolve();},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('Local TalkToFigma relay unavailable'));},{once:true});
  });
  const id=randomUUID();
  const joined=receive(id,5000);
  ws.send(JSON.stringify({type:'join',id,channel}));
  await joined;
  const page=await request('get_document_info');
  if(page.currentPage?.id!==target.pageId||!page.children?.some(n=>n.id===target.existingTargetRoot.id&&n.name===target.existingTargetRoot.name)) {
    throw new Error('The channel does not match the approved target page and anchor.');
  }
  const info=await request('bugmap_login_status');
  if(!info.ok||info.planDigest!==prepared.digest||info.documentName!==target.documentName||info.pageId!==target.pageId||
    (info.fileKey!==null&&info.fileKey!==target.fileKey)) {
    throw new Error('The desktop builder or target identity does not match.');
  }
  if(mode==='status'){console.log(JSON.stringify(info,null,2));}
  else {
    const preserved=page.children.filter(n=>n.id!==info.existing);
    const baseline=await request('get_node_info',{nodeId:target.existingTargetRoot.id});
    if(info.existing!=='19:2')throw new Error('Expected only the newly created frame 19:2');
    const args={planDigest:prepared.digest,fileKey:target.fileKey};
    const observed=await request('bugmap_login_build',args,45000);
    const fixes=[['iOS · 통신 및 배터리',68,14],['BugMap-logo-vector',128,39.68],
      ['서울숲 관찰 일러스트',273,175],['카카오 공식 심볼과 문구',224*(48/46),48]];
    const list=node=>[node,...(node.children??[]).flatMap(list)];
    const shapes=list(observed.node);
    for(const [name,width,height] of fixes){
      const matches=shapes.filter(node=>node.name===name&&node.type==='FRAME');
      if(matches.length!==1)throw new Error('Missing or ambiguous SVG frame '+name);
      const n=matches[0];
      if(Math.abs(n.width-width)>0.02||Math.abs(n.height-height)>0.02){
        const fixed=await request('resize_node',{nodeId:n.id,width,height});
        if(Math.abs(fixed.width-width)>0.02||Math.abs(fixed.height-height)>0.02)throw new Error('Cannot set frame size '+name);
      }
    }
    const art=JSON.parse(await readFile(new URL('repair-original-artwork.json',import.meta.url),'utf8'));
    const native=await request('bugmap_login_build',args,45000);
    const current=new Map(list(native.node).map(shape=>[shape.id,shape]));
    for(const desired of art){
      const live=current.get(desired.id);
      if(!live||live.name!==desired.name||live.type!==desired.type)throw new Error('Unexpected vector artwork identity');
      if(desired.width>0&&desired.height>0&&
          (Math.abs(live.width-desired.width)>0.02||Math.abs(live.height-desired.height)>0.02)){
        await request('resize_node',{nodeId:desired.id,width:desired.width,height:desired.height});
      }
      if(Math.abs(live.x-desired.x)>0.02||Math.abs(live.y-desired.y)>0.02){
        await request('move_node',{nodeId:desired.id,x:desired.x,y:desired.y});
      }
    }
    const laidOut=await request('bugmap_login_build',args,45000);
    const seed=laidOut.node.children.find(n=>n.name==='iOS · 홈 인디케이터');
    const priorIntro=laidOut.node.children.find(n=>n.name==='intro / 소개');
    if(!priorIntro){
      const direct=laidOut.node.children;
      const title=direct.find(n=>n.type==='TEXT'&&n.name==='title');
      const accent=direct.find(n=>n.type==='TEXT'&&n.name==='titleAccent');
      const desc=direct.find(n=>n.type==='TEXT'&&n.name==='description');
      if(!seed||!title||!accent||!desc)throw new Error('Cannot identify approved intro layers');
      const created=[];
      let replaced=false;
      async function emptyFrame(name,x,y,w,h){
        const c=await request('clone_node',{nodeId:seed.id,x,y});
        created.push(c.id);
        const snapshot=await request('get_node_tree',{nodeId:c.id});
        if(snapshot.node.children?.length!==1||snapshot.node.id===seed.id)throw new Error('Unsafe intro seed');
        await request('delete_node',{nodeId:snapshot.node.children[0].id});
        await request('rename_node',{nodeId:c.id,name});
        await request('set_layout_mode',{nodeId:c.id,layoutMode:'NONE'});
        await request('resize_node',{nodeId:c.id,width:w,height:h});
        await request('move_node',{nodeId:c.id,x,y});
        return c.id;
      }
      async function layout(frame,spacing){
        await request('set_layout_mode',{nodeId:frame,layoutMode:'VERTICAL'});
        await request('set_layout_sizing',{nodeId:frame,layoutSizingHorizontal:'FIXED',layoutSizingVertical:'FIXED'});
        await request('set_padding',{nodeId:frame,paddingTop:0,paddingRight:0,paddingBottom:0,paddingLeft:0});
        await request('set_axis_align',{nodeId:frame,primaryAxisAlignItems:'MIN',counterAxisAlignItems:'CENTER'});
        await request('set_item_spacing',{nodeId:frame,itemSpacing:spacing});
      }
      try {
        const intro=await emptyFrame('intro / 소개',16,156,358,119);
        const headings=await emptyFrame('intro / 제목',16,156,358,85);
        await request('set_parent',{nodeId:headings,parentId:intro,x:0,y:0});
        for(const [origin,parentId,x,y] of [[title,headings,title.x-16,0],[accent,headings,accent.x-16,43],[desc,intro,desc.x-16,102]]){
          const clone=await request('clone_node',{nodeId:origin.id});
          created.push(clone.id);
          await request('set_parent',{nodeId:clone.id,parentId,x,y});
        }
        await layout(headings,1);
        await layout(intro,17);
        await request('move_node',{nodeId:intro,x:16,y:156});
        const layoutSnapshot=await request('get_node_tree',{nodeId:intro});
        if(layoutSnapshot.node.layoutMode!=='VERTICAL'||layoutSnapshot.node.children[0]?.layoutMode!=='VERTICAL') throw new Error('Intro auto-layout did not apply');
        const verify=await request('bugmap_login_build',args,45000);
        const box=verify.node.children.find(x=>x.id===intro);
        const head=box?.children?.[0];
        const checks=[[box,16,156],[head,0,0],[head?.children?.[0],title.x-16,0],[head?.children?.[1],accent.x-16,43],[box?.children?.[1],desc.x-16,102]];
        if(checks.some(([node,x,y])=>!node||Math.abs(node.x-x)>.25||Math.abs(node.y-y)>.25)) throw new Error('Intro layout moved approved text');
        await request('delete_multiple_nodes',{nodeIds:[title.id,accent.id,desc.id]});
        replaced=true;
      } catch(error) {
        if(!replaced)for(const id of [...created].reverse()){
          try{await request('delete_node',{nodeId:id});}catch{}
        }
        throw error;
      }
    }
    const result=await request('bugmap_login_build',args,45000);
    const final=new Map(list(result.node).map(shape=>[shape.id,shape]));
    for(const a of art){
      const f=final.get(a.id);
      if(['x','y','width','height'].some(k=>Math.abs(a[k]-f[k])>.15))throw new Error('SVG geometry not restored: '+a.id);
    }
    const after=await request('get_node_info',{nodeId:target.existingTargetRoot.id});
    const png=Buffer.from(result.pngBase64,'base64');
    const node=result.node;
    if(result.planDigest!==prepared.digest||result.documentName!==target.documentName||result.pageId!==target.pageId||
      (result.fileKey!==null&&result.fileKey!==target.fileKey)||
      result.roots.length!==preserved.length+1||!preserved.every(x=>result.roots.some(y=>JSON.stringify(x)===JSON.stringify(y)))||
      JSON.stringify(baseline)!==JSON.stringify(after)||!result.roots.some(x=>x.id===node.id)||
      node.width!==390||node.height!==844||png.readUInt32BE(16)!==390||png.readUInt32BE(20)!==844) {
      throw new Error('Figma evidence failed target, preservation or viewport checks.');
    }
    const link=new URL(target.fileUrl);
    link.searchParams.set('node-id',node.id.replace(':','-'));
    const capturedAt=new Date().toISOString();
    await mkdir(new URL('captures/',evidence),{recursive:true});
    await writeFile(new URL('captures/login-default.png',evidence),png);
    await save('nodes.json',{version:1,fileKey:target.fileKey,remoteFileKey:result.fileKey,documentName:result.documentName,
      pageId:result.pageId,exportedAt:capturedAt,nodes:[node]});
    await save('node-map.json',{nodes:[{screen:'login',state:'default',nodeId:node.id,url:link.href,
      width:node.width,height:node.height,capture:'captures/login-default.png'}],images:result.images});
    await save('remote-verification.json',{capturedAt,doc:info.documentName,fileKey:target.fileKey,
      remoteFileKey:result.fileKey,anchorId:target.existingTargetRoot.id,anchorUnchanged:true,before:page.children,after:result.roots,
      captureSha256:sha(png),planDigest:prepared.digest});
    console.log(JSON.stringify({frame:node.id,url:link.href,captureSha256:sha(png),anchorUnchanged:true}));
  }
} finally { ws.close(); }
