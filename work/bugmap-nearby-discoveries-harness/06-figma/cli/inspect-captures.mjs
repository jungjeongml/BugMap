import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const repo=resolve(process.argv[2]??'/Users/mac/Documents/BugMap');
const {PNG}=createRequire(resolve(repo,'package.json'))('pngjs');
const source=resolve(repo,'work/bugmap-nearby-discoveries-harness/05-design-system');
const out=new URL('../',import.meta.url);
const map=JSON.parse(await readFile(new URL('node-map.json',out),'utf8'));
const encoded=path=>readFile(path).then(PNG.sync.read);
const regions={top:[0,0,390,155],distance:[0,155,390,51],title:[0,206,390,48],records:[0,254,390,436],footer:[0,690,390,154]};
function compare(a,b,[left,top,width,height]) {
  let count=0;
  let mean=0;
  for(let y=top;y<top+height;y++)for(let x=left;x<left+width;x++) {
    const i=(y*390+x)*4;
    const delta=Math.max(...[0,1,2].map(channel=>Math.abs(a.data[i+channel]-b.data[i+channel])));
    if(delta>18) count++;
    mean+=delta;
  }
  return {threshold:18,changedPixels:count,pixelCount:width*height,changedFraction:count/(width*height),meanMaxDelta:mean/(width*height)};
}
const results=[];
for(const entry of map.nodes) {
  const [approved,remote]=await Promise.all([encoded(resolve(source,'captures/390x844-'+entry.state+'.png')),encoded(new URL(entry.capture,out))]);
  assert.deepEqual([approved.width,approved.height,remote.width,remote.height],[390,844,390,844]);
  results.push({state:entry.state,nodeId:entry.nodeId,capture:entry.capture,
    regions:Object.fromEntries(Object.entries(regions).map(([name,region])=>[name,compare(approved,remote,region)]))});
}
await writeFile(new URL('capture-crosscheck.json',out),JSON.stringify({method:'PNG comparison between approved Chromium capture and actual Figma native PNG; independent type rendering can differ',results},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
