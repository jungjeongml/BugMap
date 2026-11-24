import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const runtime=resolve(process.argv[2]??'/private/tmp/bugmap-nick-native');
const repo=resolve(process.argv[3]??'/Users/mac/Documents/BugMap');
const base=resolve(repo,'work/bugmap-nickname-harness');
const design='05-design-system/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFile(resolve(base,path));
const json=async path=>JSON.parse(await read(path));
const {check}=await import(pathToFileURL(resolve(repo,'tools/design-harness/harness.mjs')));
const result=check(base);
assert.ok(result.stages.slice(0,5).every(s=>s.status==='passed'));
const approval=result.stages[4].upstreamApprovals['design-system'];
assert.equal(approval,'7e46e4af-78bf-439d-acb6-9d1629fe5b72');
const target=await json('control/figma.json');
assert.deepEqual([target.fileKey,target.documentName,target.pageId,target.pageName,target.baselineLogin,target.successDestination],
  ['Dan8qlRM20XPkk7Mtd5riw','BugMapHarness','0:1','Page 1','19:2','41:81']);
const {colors,typography}=await json(design+'tokens.json');
const {strings}=await json(design+'copy.json');
const layout=await json(design+'layout.json');
assert.equal(layout.wireframeSha256,sha(await read('04-wireframes/wireframes.json')));
const report=await json(design+'render-report.json');
assert.equal(report.captures.length,6);
const sourceDigests={};
for(const [path,digest] of Object.entries(report.inputs)) {
  assert.equal(sha(await read(design+path)),digest,path);
  sourceDigests[design+path]=digest;
}
for(const capture of report.captures) {
  assert.equal(sha(await read(design+capture.output)),capture.sha256,capture.output);
  assert.deepEqual(capture.issues,[]);
  sourceDigests[design+capture.output]=capture.sha256;
}
for(const path of ['control/figma.json','04-wireframes/wireframes.json',design+'render-report.json'])
  sourceDigests[path]=sha(await read(path));
const html=(await read(design+'previews/nickname-setup--initial.html')).toString('utf8');
function pickSvg(className,width,height) {
  const re=new RegExp('<svg class="'+className+'"[\\s\\S]*?<\\/svg>');
  const source=html.match(re)?.[0];
  assert.ok(source, className);
  return source.replace(/^<svg /,'<svg width="'+width+'" height="'+height+'" ').replace(/ class="[^"]+"| aria-hidden="true"/g,'');
}
const logo=(await read(design+'assets/bugmap-logo-vector-lime.svg')).toString('utf8')
  .replace('width="1000" height="310"','width="103" height="31.93"');
const plan={target,approval,sourceDigests,colors,typography,strings,blocks:layout.viewports['390'].blocks,
  states:[['initial','첫 입력'],['ready','저장 가능'],['invalid','입력 오류']].map(([id,name])=>
  ({id,name:'10 · 닉네임 설정 / '+name,flow:'닉네임 설정 · '+name})),
  section:'10 · 닉네임 설정 / 공통 컴포넌트',
  svg:{status:pickSvg('status-icons',69,16),topography:pickSvg('topography',244,94),logo}};
plan.digest=sha(JSON.stringify(plan));
await writeFile(resolve(here,'plan.json'),JSON.stringify(plan,null,2)+'\n');

const original='/Users/mac/Documents/cursor-talk-to-figma-mcp/src/cursor_mcp_plugin';
const backups={}, prepared={}, hashes={};
const channel='c0762782';
for(const name of ['code.js','ui.html','manifest.json']) backups[name]=await readFile(resolve(original,name));
const manifest=JSON.parse(backups['manifest.json']);
assert.deepEqual([manifest.name,manifest.id,manifest.main,manifest.ui],['Cursor MCP Plugin','1485687494525374295','code.js','ui.html']);
const code=backups['code.js'].toString('utf8'),ui=backups['ui.html'].toString('utf8');
assert.ok(!code.includes('bugmap_nickname_'),'Existing nickname adapter detected');
const anchor='async function handleCommand(command, params) {\n  switch (command) {';
const uiAnchor='const channelName = generateChannelName();';
assert.equal(code.split(anchor).length,2);
assert.equal(ui.split(uiAnchor).length,2);
const routes=['status','baseline','build','export'].map(mode=>
  "    case 'bugmap_nickname_"+mode+"': return await bugMapNicknameCommand('"+mode+"',params);").join('\n');
const builder=await readFile(resolve(here,'plugin.js'),'utf8');
prepared['code.js']=code.replace(anchor,anchor+'\n'+routes)+'\nconst NICKNAME_PLAN = '+JSON.stringify(plan)+';\n'+builder;
// Open the designated socket UI only after the native Figma file/page/anchor guard.
const showUI = 'figma.showUI(__html__, { width: 350, height: 600 });';
const guardedUI = `const nicknameUiReady = Promise.resolve().then(async () => {
  try {
    const {target, digest} = NICKNAME_PLAN;
    await bugMapNicknameCommand("status", {fileKey: target.fileKey, digest});
    figma.showUI(__html__, {width: 350, height: 600});
    return true;
  } catch (error) {
    console.warn("Nickname setup target verification failed", error);
    figma.closePlugin("닉네임 설정 작업 채널은 확인된 BugMapHarness Page 1에서만 열립니다.");
    return false;
  }
});`;
const startAnalytics = '// Initialize anonymous analytics client_id (persisted via clientStorage)\n(async () => {';
const runListener = 'figma.on("run", ({ command }) => {\n  figma.ui.postMessage({ type: "auto-connect" });\n});';
for (const needle of [showUI, startAnalytics, runListener]) assert.equal(prepared['code.js'].split(needle).length, 2);
prepared['code.js']=prepared['code.js']
 .replace(showUI, guardedUI)
 .replace(startAnalytics, startAnalytics+'\n  if (!(await nicknameUiReady)) return;')
 .replace(runListener,`figma.on("run", async () => {
  if (await nicknameUiReady) figma.ui.postMessage({ type: "auto-connect" });
});`);
prepared['ui.html']=ui.replace(uiAnchor,'const channelName = "'+channel+'";');
for(const folder of ['original','prepared']) await mkdir(resolve(runtime,folder),{recursive:true});
for(const [name,bytes] of Object.entries(backups)) {
 await writeFile(resolve(runtime,'original',name),bytes,{flag:'wx'});
 hashes[name]={original:sha(bytes)};
}
for(const [name,bytes] of Object.entries(prepared)) {
 await writeFile(resolve(runtime,'prepared',name),bytes,{flag:'wx'});
 hashes[name].prepared=sha(bytes);
}
await writeFile(resolve(runtime,'patch.json'),JSON.stringify({original,channel,hashes,digest:plan.digest},null,2)+'\n');
console.log(JSON.stringify({runtime,approval,channel,digest:plan.digest,states:plan.states.length,inputs:Object.keys(sourceDigests).length}));
