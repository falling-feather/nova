'use strict';
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
function inventory(root){const result=[];function walk(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())walk(file);else if(entry.name!=='.runtime.json')result.push({file,relative:path.relative(root,file).split(path.sep).join('/'),bytes:fs.statSync(file).size});}}walk(root);return result;}
async function verify(root,reference,base){
 root=fs.realpathSync(root);reference=fs.realpathSync(reference);
 const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));if(release.mode!=='frontend-only'||release.chapters!==13)throw Error('不是完整纯前端包');
 const files=inventory(root),original=inventory(reference),expected=new Map(original.map(item=>[item.relative,item]));
 const forbidden=files.filter(item=>/(?:\.sqlite(?:-|$)|\.db$|\.log$|(?:^|\/)node_modules\/|(?:^|\/)server\/|(?:^|\/)\.data\/)/i.test(item.relative)).map(item=>item.relative);
 const mismatches=[];
 for(const item of files){const other=expected.get(item.relative);if(!other||item.bytes!==other.bytes||createHash('sha256').update(fs.readFileSync(item.file)).digest('hex')!==createHash('sha256').update(fs.readFileSync(other.file)).digest('hex'))mismatches.push(item.relative);expected.delete(item.relative);}
 mismatches.push(...expected.keys());
 const client=fs.readFileSync(path.join(root,'site/platform/platform-client.js'),'utf8');
 const accountCode=/\/api\/auth|function changeIdentity|register:|login:/.test(client);
 const failures=[];const siteFiles=files.filter(item=>item.relative.startsWith('site/'));
 for(let i=0;i<siteFiles.length;i+=10)await Promise.all(siteFiles.slice(i,i+10).map(async item=>{
  const url=base+'/'+item.relative.slice(5).split('/').map(encodeURIComponent).join('/');
  const response=await fetch(url,{method:'HEAD'});
  if(response.status!==200||Number(response.headers.get('content-length'))!==item.bytes)failures.push({file:item.relative,status:response.status});
  if(item.relative.endsWith('.wasm')&&!response.headers.get('content-type')?.includes('application/wasm'))failures.push({file:item.relative,reason:'WASM MIME'});
 }));
 const accountEndpointStatus=(await fetch(base+'/api/auth/session')).status;
 const result={releaseId:release.id,files:files.length,siteFiles:siteFiles.length,chapters:13,forbidden,byteMismatches:mismatches,accountCode,accountEndpointStatus,resourceFailures:failures};
 if(forbidden.length||mismatches.length||accountCode||accountEndpointStatus!==404||failures.length)throw Error(JSON.stringify(result));
 return result;
}
module.exports={verify};
if(require.main===module)verify(path.resolve(process.argv[2]),path.resolve(process.argv[3]),process.argv[4]).then(result=>{if(process.argv[5])fs.writeFileSync(path.resolve(process.argv[5]),JSON.stringify(result,null,2));console.log(JSON.stringify(result));}).catch(error=>{console.error(error.message);process.exitCode=1;});
