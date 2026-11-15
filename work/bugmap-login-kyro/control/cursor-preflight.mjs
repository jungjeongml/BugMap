import { Client } from '/Users/mac/Documents/cursor-talk-to-figma-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '/Users/mac/Documents/cursor-talk-to-figma-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {mkdir, writeFile} from 'node:fs/promises';
const dir='/Users/mac/Documents/BugMap/work/bugmap-login-kyro/control';
await mkdir(dir,{recursive:true});
const client=new Client({name:'bugmap-login-readonly',version:'1.0.0'});
const transport=new StdioClientTransport({command:'/Users/mac/.bun/bin/bun',args:['/Users/mac/Documents/cursor-talk-to-figma-mcp/dist/server.js'],stderr:'pipe'});
try {
await client.connect(transport);
const listed=await client.listTools();
await writeFile(dir+'/cursor-tools.json',JSON.stringify(listed,null,2));
const joined=await client.callTool({name:'join_channel',arguments:{channel:'b6q2ot0a'}},undefined, {timeout:15000});
if(joined.isError) throw Error(JSON.stringify(joined));
const doc=await client.callTool({name:'get_document_info',arguments:{}},undefined,{timeout:15000});
await writeFile(dir+'/cursor-document.json',JSON.stringify(doc,null,2));
const logo=await client.callTool({name:'get_node_info',arguments:{nodeId:'126:706'}});
await writeFile(dir+'/cursor-logo.json',JSON.stringify(logo,null,2));
const exported=await client.callTool({name:'export_node_as_image',arguments:{nodeId:'126:706',format:'PNG',scale:1}});
const img=exported.content?.find(c=>c.type==='image');
if(img) await writeFile(dir+'/logo.png',Buffer.from(img.data,'base64'));
console.log(JSON.stringify({logo,exportedPNG:Boolean(img)}));
} finally {await client.close();}
