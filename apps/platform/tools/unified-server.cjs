const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const configDefault=require('../../../shared/linkage/chapters.json');
const {PlatformStore}=require('../server/store.cjs');
const {createAPI}=require('../server/api.cjs');
const {types,byteRange}=require('../../../tools/static-server.cjs');
const {within}=require('./workspace-paths.cjs');
function createMounts(workspace,config,chapterWorkspace){
  const project=folder=>{const value=path.resolve(workspace,folder);if(!within(workspace,value))throw new Error('项目目录越出工作区：'+folder);return value;};
  const hub=project(config.hub.folder);
  const entries=[...config.chapters.map(c=>({...c,archive:false})),...(config.archives||[]).map(c=>({...c,archive:true}))];
  const mounts=entries.map(c=>{
    const pattern=c.archive?/^\/archive\/chapters\/\d{2}\/$/:/^\/chapters\/\d{2}\/$/;
    if(!pattern.test(c.mount))throw new Error('无效章节路径：'+c.mount);
    const chapterRoot=path.resolve(chapterWorkspace,c.folder);
    if(!within(chapterWorkspace,chapterRoot))throw new Error('章节目录越出工作区');
    return {prefix:c.mount,root:path.join(chapterRoot,'dist'),boundary:chapterWorkspace};
  });
  mounts.push({prefix:'/courses/',root:path.join(hub,'courses')},{prefix:'/',root:hub,homepage:true});
  if(fs.existsSync(path.join(hub,'personal','index.html')))mounts.unshift({prefix:'/personal/',root:path.join(hub,'personal')});
  if(fs.existsSync(path.join(workspace,'shared/linkage/platform-client.js')))mounts.unshift({prefix:'/platform/',root:path.join(workspace,'shared/linkage'),noIndex:true});
  return mounts.map(m=>{
    if(!m.noIndex&&!fs.existsSync(path.join(m.root,'index.html')))throw new Error('缺少构建入口，请先运行 npm run build：'+m.root);
    const root=fs.realpathSync(m.root);if(!within(m.boundary||workspace,root))throw new Error('构建目录越出工作区');return {...m,root};
  });
}
function createUnifiedServer({workspace=path.resolve(__dirname,'../../..'),config=configDefault,chapterWorkspace=workspace,dataFile,secureCookie=false}={}){
  workspace=fs.realpathSync(workspace);chapterWorkspace=fs.realpathSync(chapterWorkspace);
  const mounts=createMounts(workspace,config,chapterWorkspace);
  const store=new PlatformStore(dataFile||path.join(workspace,config.hub.folder,'.data','records.sqlite'));
  const handleAPI=createAPI(store,{secureCookie});
  const server=http.createServer(async(request,response)=>{
    if(await handleAPI(request,response))return;
    const fail=(status,text)=>{response.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'});response.end(text);};
    if(!['GET','HEAD'].includes(request.method)){response.setHeader('Allow','GET, HEAD');fail(405,'Method not allowed');return;}
    const raw=request.url.split('?')[0],query=request.url.slice(raw.length);let pathname;
    try{pathname=decodeURIComponent(raw);}catch{fail(400,'Invalid URL');return;}
    if(pathname.includes('\\')||pathname.includes('\0')||pathname.includes(':')||pathname.split('/').includes('..')){fail(403,'Forbidden path');return;}
    if(pathname==='/favicon.ico'){response.writeHead(308,{Location:'/favicon.svg'});response.end();return;}
    const redirect=mounts.find(m=>m.prefix!=='/'&&pathname===m.prefix.slice(0,-1));
    if(redirect){response.writeHead(308,{Location:redirect.prefix+query});response.end();return;}
    const mount=mounts.find(m=>pathname.startsWith(m.prefix));
    if(!mount){fail(404,'Not found');return;}
    const relative=pathname.slice(mount.prefix.length)||'index.html';
    if(mount.homepage&&!['index.html','NOVA.html','favicon.svg'].includes(relative)){fail(404,'Not found');return;}
    let file=path.resolve(mount.root,relative.endsWith('/')?relative+'index.html':relative);
    if(!within(mount.root,file)){fail(403,'Forbidden path');return;}
    try{
      file=await fs.promises.realpath(file);
      if(!within(mount.root,file)){fail(403,'Forbidden path');return;}
      const stat=await fs.promises.stat(file);if(!stat.isFile()){fail(404,'Not found');return;}
      const range=request.method==='GET'&&request.headers.range?byteRange(request.headers.range,stat.size):undefined;
      if(range===null){response.setHeader('Content-Range','bytes */'+stat.size);fail(416,'Range not satisfiable');return;}
      const headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':range?range.end-range.start+1:stat.size,'Accept-Ranges':'bytes','Last-Modified':stat.mtime.toUTCString(),'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
      if(range)headers['Content-Range']=`bytes ${range.start}-${range.end}/${stat.size}`;
      response.writeHead(range?206:200,headers);
      if(request.method==='HEAD'){response.end();return;}
      const stream=fs.createReadStream(file,range);stream.on('error',error=>response.destroy(error));response.on('close',()=>stream.destroy());stream.pipe(response);
    }catch(error){if(['ENOENT','ENOTDIR'].includes(error.code))fail(404,'Not found');else{console.error('Static file error:',error.message);fail(500,'File unavailable');}}
  });
  server.once('close',()=>store.close());
  return server;
}
module.exports={createUnifiedServer};
