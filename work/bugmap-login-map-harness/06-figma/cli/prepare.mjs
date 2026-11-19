import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repo, plugin, output] = process.argv.slice(2);
if (!output) throw new Error('Usage: prepare.mjs BUGMAP_REPO ORIGINAL_PLUGIN_CODE OUTPUT_CODE');
const { check } = await import(pathToFileURL(resolve(repo,'tools/design-harness/harness.mjs')));
const project=resolve(repo,'work/bugmap-login-map-harness');
const approval=check(project).stages.find(stage=>stage.stage==='design-system');
if(approval.status!=='passed') throw new Error('Design-system approval is missing or stale');
const read=(path)=>readFileSync(resolve(project,path));
const json=(path)=>JSON.parse(read(path));
const sys='05-design-system/';
const { colors,layout,typography }=json(sys+'tokens.json');
const labels=json(sys+'copy.json').strings;
const config=json('control/figma.json');
const preview=read(sys+'preview.svg').toString();
const report=json(sys+'render-report.json');
const content=(id)=> {
  const start=preview.indexOf('<g id="'+id+'"');
  const end=preview.indexOf('</g>',start);
  if (start<0||end<0) throw new Error('Missing preview group '+id);
  return preview.slice(preview.indexOf('>',start)+1,end);
};
function art(name,x,y,w,h,body,rootAttrs=''){
  return {name,x,y,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="'+x+' '+y+' '+w+' '+h+'" '+rootAttrs+'>'+body+'</svg>'};
}
const observations=content('observations').replace(/<text[^>]*>[^<]*<\/text>/gu,'')
 .replace(/<svg x="167" y="382" width="24" height="24" viewBox="0 0 24 24"/u,'<g transform="translate(167 382)"')
 .replace('</svg>','</g>');
const specs=[
  art('iOS · 통신 및 배터리',298,20,68,14,content('system-connection'),'fill="'+colors.text+'"'),
  {name:'BugMap-logo-vector',x:layout.logo.x,y:layout.logo.y,
    svg:read(sys+'assets/bugmap-logo-vector-lime.svg').toString()
      .replace('width="1000" height="310"','width="'+layout.logo.width+'" height="'+layout.logo.height+'"')},
  art('서울숲 관찰 일러스트',70,302,273,175,observations),
  art('iOS · 홈 인디케이터',128,827,134,4,
    '<rect x="128" y="827" width="134" height="4" rx="2" fill="'+colors.text+'" opacity=".84"/>'),
];
const text = report.geometry.texts.map(label=>({
  id:label.id,characters:label.value,fontSize:label.size,weight:label.weight,
  color:'#'+label.fill.match(/\d+/g).map(n=>Number(n).toString(16).padStart(2,'0')).join('').toUpperCase(),
  x: ['title','titleAccent','description','policy'].includes(label.id)?195:label.x,
  y:label.y-1,center:['title','titleAccent','description','policy'].includes(label.id),
  lineHeight: Object.values(typography).find(token=>token.fontSize===label.size)?.lineHeight??label.height
}));
const image=(name,asset,x,y,width,height)=>({name,asset,x,y,width,height,bytes:read(sys+asset).toString('base64')});
const kakao=read(sys+'assets/kakao-login.svg').toString().match(/<path\b[^>]*\/>/gu);
if(kakao?.length!==2)throw new Error('Unexpected Kakao asset');
const kakaoScale=48/46;
const kakaoSvg={name:'카카오 공식 심볼과 문구',x:(358-224*kakaoScale)/2,y:0,
 svg:'<svg xmlns="http://www.w3.org/2000/svg" width="'+224*kakaoScale+'" height="48" viewBox="0 0 224 46">'+kakao.join('')+'</svg>'};
const inputs={
 target:{fileKey:config.fileKey,documentName:config.documentName,pageId:config.pageId,anchorId:config.existingTargetRoot.id,anchorName:config.existingTargetRoot.name},
 name:'05 · 첫 로그인 / 지도 배경',colors,layout,svgSpecs:specs,text,kakaoSvg,
 providerLabels:{kakao:labels.kakao,naver:labels.naver,apple:labels.apple},
 imageSpecs:{
   map:image('지도 배경 / 지도와 상하 페이드','assets/map-background.png',0,0,390,844),
   naver:image('네이버 공식 심볼과 문구','assets/naver-content.png',109,10,140,28),
   apple:image('Apple 공식 심볼과 문구','assets/apple-login.png',0,0,358,48)
 }
};
const digest=createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
const addon=readFileSync(new URL('desktop-command.js',import.meta.url),'utf8');
const original=readFileSync(plugin,'utf8');
const marker='// BugMap login 05 CLI extension';
if(original.includes(marker))throw new Error('An extension is already installed');
const dispatch='async function handleCommand(command, params) {\n  switch (command) {';
if(original.split(dispatch).length!==2)throw new Error('Unsupported plugin source');
const version=original.replace(dispatch,dispatch+"\n    case 'bugmap_login_status': return await bugMapLoginStatus();\n    case 'bugmap_login_build': return await bugMapLoginBuild(params);\n");
writeFileSync(output,version+'\n'+marker+'\nconst BUGMAP_LOGIN_PLAN = '+JSON.stringify({...inputs,digest})+';\n'+addon,'utf8');
console.log(JSON.stringify({digest,approval:approval.upstreamApprovals['design-system'],target:inputs.target}));
