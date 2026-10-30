'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.txt':'text/plain; charset=utf-8','.pdf':'application/pdf'};
function within(root,file){const relative=path.relative(root,file);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));}
function byteRange(header,size){
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);if(!match||(!match[1]&&!match[2])||!size)return null;
 let start,end;if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return null;start=Math.max(0,size-suffix);end=size-1;}
 else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;}
 return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<size&&end>=start?{start,end}:null;
}
function createStaticServer({root,instance}){
 root=fs.realpathSync(root);
 return http.createServer(async(req,res)=>{
  const fail=(status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:message);};
  if(!['GET','HEAD'].includes(req.method)){fail(405,'Only static GET and HEAD are supported.');return;}
  let url,pathname;try{url=new URL(req.url,'http://localhost');pathname=decodeURIComponent(url.pathname);}catch{fail(400,'Invalid path');return;}
  if(pathname==='/__nova_local_instance.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify({instance}));return;}
  if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(part=>part.startsWith('.'))){fail(403,'Forbidden path');return;}
  if(pathname==='/favicon.ico'){res.writeHead(302,{Location:'/favicon.svg'});res.end();return;}
  let file=path.resolve(root,'.'+pathname);if(!within(root,file)){fail(403,'Forbidden path');return;}
  try{
   file=await fs.promises.realpath(file);if(!within(root,file)){fail(403,'Forbidden path');return;}
   let stat=await fs.promises.stat(file);
   if(stat.isDirectory()){
    if(!pathname.endsWith('/')){res.writeHead(308,{Location:encodeURI(pathname+'/')+url.search});res.end();return;}
    file=await fs.promises.realpath(path.join(file,'index.html'));if(!within(root,file)){fail(403,'Forbidden path');return;}stat=await fs.promises.stat(file);
   }
   if(!stat.isFile()){fail(404,'Not found');return;}
   const range=req.headers.range?byteRange(req.headers.range,stat.size):undefined;
   if(range===null){res.setHeader('Content-Range','bytes */'+stat.size);fail(416,'Invalid byte range');return;}
   const headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':range?range.end-range.start+1:stat.size,'Cache-Control':'no-cache','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
   if(range)headers['Content-Range']=`bytes ${range.start}-${range.end}/${stat.size}`;
   res.writeHead(range?206:200,headers);if(req.method==='HEAD'){res.end();return;}
   const stream=fs.createReadStream(file,range);stream.on('error',error=>res.destroy(error));res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch(error){fail(['ENOENT','ENOTDIR'].includes(error.code)?404:500,'File unavailable');}
 });
}
module.exports={createStaticServer,byteRange,types};
