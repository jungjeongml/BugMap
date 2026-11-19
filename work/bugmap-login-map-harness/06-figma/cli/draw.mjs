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
    const result=await request('bugmap_login_build',{planDigest:prepared.digest,fileKey:target.fileKey},45000);
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
