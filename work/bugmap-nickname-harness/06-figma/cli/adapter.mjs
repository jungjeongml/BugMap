import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const mode=process.argv[2];
assert.ok(mode==='install'||mode==='restore');
const runtime=resolve(process.argv[3]??'/private/tmp/bugmap-nick-native');
const patch=JSON.parse(await readFile(resolve(runtime,'patch.json')));
const install=mode==='install',src=install?'prepared':'original',dest=install?'original':'prepared';
assert.equal(patch.original,'/Users/mac/Documents/cursor-talk-to-figma-mcp/src/cursor_mcp_plugin');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(await readFile(resolve(patch.original,'manifest.json'))),patch.hashes['manifest.json'].original);
const replacements=[];
for(const name of ['code.js','ui.html']) {
 const path=resolve(patch.original,name), before=await readFile(path), after=await readFile(resolve(runtime,src,name));
 assert.equal(sha(after),patch.hashes[name][src],name);
 const unchanged=sha(before)===sha(after);
 if(!unchanged) assert.ok([patch.hashes[name][dest],...(install&&patch.hashes[name].diagnosticPrevious?[patch.hashes[name].diagnosticPrevious]:[])].includes(sha(before)),name);
 replacements.push({name,path,before,after,unchanged});
}
const written=[];
try{
 for(const row of replacements.filter(row=>!row.unchanged)) {
  written.push(row);
  await writeFile(row.path,row.after);
 }
 for(const row of replacements)assert.equal(sha(await readFile(row.path)),patch.hashes[row.name][src],row.name);
}catch(error){
 for(const row of written.reverse())await writeFile(row.path,row.before);
 throw error;
}
const checks=await Promise.all(replacements.map(async row=>({file:row.name,sha256:sha(await readFile(row.path))})));
await writeFile(resolve(runtime,mode+'.json'),JSON.stringify({mode,checks,manifestSha256:patch.hashes['manifest.json'].original},null,2)+'\n');
console.log(JSON.stringify({mode,channel:patch.channel,checks}));
