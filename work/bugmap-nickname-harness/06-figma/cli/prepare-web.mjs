import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,copyFile,mkdir,cp,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const repo=resolve(process.argv[2]??'/Users/mac/Documents/BugMap');
const target=resolve(process.argv[3]??'/private/tmp/bugmap-nick-native/stage');
const project=resolve(repo,'work/bugmap-nickname-harness');
const source=resolve(project,'05-design-system');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const {inputs}=JSON.parse(await readFile(resolve(source,'render-report.json')));
const states=['initial','ready','invalid'];
const files=['nickname.css',...states.map(s=>'nickname-setup--'+s+'.html')];
await mkdir(resolve(target,'web/screens'),{recursive:true});
for(const file of files){
  const path='previews/'+file;
  assert.equal(sha(await readFile(resolve(source,path))),inputs[path],path);
  await copyFile(resolve(source,path),resolve(target,'web/screens',file));
}
for(const [path,digest] of Object.entries(inputs).filter(([name])=>name.startsWith('assets/')))
  assert.equal(sha(await readFile(resolve(source,path))),digest,path);
await cp(resolve(source,'assets'),resolve(target,'web/assets'),{recursive:true});
await writeFile(resolve(target,'web','README.md'),[
  '# 닉네임 화면 검증용 HTML',
  '',
  '승인된 05 디자인 시스템의 상태별 HTML·CSS·Pretendard·벡터 로고를 같은 바이트로 복사했다.',
  '390 × 844 및 360 × 800에서 보여주는 키보드와 입력값은 정적 시연이다.',
  '실제 제품에서 사용자 입력, 닉네임 저장, 오류에서 재시도는 운영체제 키보드와 앱 로직으로 조작한다.',
  '',
  ...states.map(s=>'- '+s+' · [HTML](screens/nickname-setup--'+s+'.html)'),
  '',
].join('\n'));
console.log(JSON.stringify({target,html:states.length,verified:['CSS','fonts','logo']}));
