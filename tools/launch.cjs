'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),net=require('node:net'),{createHash}=require('node:crypto'),{spawn}=require('node:child_process');
const {once}=require('node:events');
function identity(root){return createHash('sha256').update(fs.readFileSync(path.join(root,'.submission-instance.json'),'utf8')+'\n'+fs.realpathSync(root)).digest('hex');}
function probe(host,port){return new Promise(resolve=>{const req=http.get({host,port,path:'/api/submission-instance',timeout:1500},res=>{let text='';res.on('data',chunk=>{text+=chunk;if(text.length>4096)req.destroy();});res.on('end',()=>{try{resolve({occupied:true,identity:JSON.parse(text).instance});}catch{resolve({occupied:true});}});});req.on('timeout',()=>{req.destroy();resolve({occupied:true});});req.on('error',error=>resolve({occupied:error.code!=='ECONNREFUSED'}));});}
function openBrowser(url){const command=process.platform==='win32'?'cmd.exe':process.platform==='darwin'?'open':'xdg-open';const args=process.platform==='win32'?['/d','/s','/c','start','',url]:[url];const child=spawn(command,args,{windowsHide:true,stdio:'ignore'});child.on('error',error=>console.error('请手动打开 '+url+'（浏览器未能启动：'+error.message+'）'));}
async function launch({root=path.resolve(__dirname,'..'),port,strictPort,host=process.env.NOVA_HOST||'127.0.0.1',browser=true,signals=true}={}){
 const [major,minor]=process.versions.node.split('.').map(Number);if(major<24||(major===24&&minor<20))throw Error('请安装Node 24.20.0或更新版本。');
 const explicit=strictPort??(port!==undefined||Boolean(process.env.NOVA_PORT));port=port??Number(process.env.NOVA_PORT||5178);
 root=fs.realpathSync(root);if(!Number.isInteger(port)||port<1||port>65535)throw Error('端口无效');if(!net.isIP(host)&&host!=='localhost')throw Error('监听地址应为IP或localhost');
 const probeHost=host==='0.0.0.0'?'127.0.0.1':host==='::'?'::1':host,instance=identity(root);
 const urlFor=p=>'http://'+(probeHost.includes(':')?'['+probeHost+']':probeHost)+':'+p+'/';
 const hintFile=path.join(root,'.data/instance-port.json');let hint;
 try{hint=JSON.parse(fs.readFileSync(hintFile,'utf8'));}catch{hint=null;}
 if(!explicit&&hint?.instance===instance&&Number.isInteger(hint.port)&&hint.port>0&&hint.port<=65535){const old=await probe(probeHost,hint.port);if(old.identity===instance){const url=urlFor(hint.port);if(browser)openBrowser(url);return {reused:true,url,instance};}if(!old.occupied)port=hint.port;}
 const existing=await probe(probeHost,port);
 if(existing.occupied){if(existing.identity===instance){const url=urlFor(port);if(browser)openBrowser(url);return {reused:true,url,instance};}if(explicit)throw Error('端口 '+port+' 已被其他服务占用，未停止该进程。请设置另一个NOVA_PORT。');port=0;}
 const config=require(path.join(root,'shared/linkage/chapters.json'));
 const {createUnifiedServer}=require(path.join(root,config.hub.folder,'tools/unified-server.cjs'));
 const server=createUnifiedServer({workspace:root,config,chapterWorkspace:root,dataFile:path.join(root,'.data/records.sqlite'),secureCookie:process.env.NOVA_SECURE_COOKIE==='1'});
 const original=server.listeners('request');server.removeAllListeners('request');
 server.on('request',(req,res)=>{if(req.method==='GET'&&req.url==='/api/submission-instance'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({instance}));return;}for(const handle of original)handle.call(server,req,res);});
 try{server.listen(port,host);await once(server,'listening');}catch(error){server.close();throw Error(error.code==='EADDRINUSE'?'端口刚被其他服务占用，未停止该进程。':error.message);}
 port=server.address().port;const url=urlFor(port);
 const checked=await probe(probeHost,port);if(checked.identity!==instance){server.close();throw Error('提交版服务身份校验未通过');}
 fs.mkdirSync(path.dirname(hintFile),{recursive:true});fs.writeFileSync(hintFile,JSON.stringify({instance,port}),'utf8');
 if(signals){const stop=()=>{server.close(()=>process.exit(0));server.closeAllConnections();};process.once('SIGINT',stop);process.once('SIGTERM',stop);}
 console.log('奇点提交版已就绪：'+url);if(browser)openBrowser(url);return {server,url,instance,reused:false};
}
module.exports={launch,identity,probe};if(require.main===module)launch({browser:!process.argv.includes('--no-browser'),host:process.argv.includes('--lan')?'0.0.0.0':undefined}).catch(error=>{console.error(error.message);process.exitCode=1;});
