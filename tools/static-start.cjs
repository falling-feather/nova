'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{createHash}=require('node:crypto'),{spawn}=require('node:child_process'),{once}=require('node:events');
const {createStaticServer}=require('./static-server.cjs');
function probe(port){return new Promise(resolve=>{const req=http.get({host:'127.0.0.1',port,path:'/__nova_local_instance.json',timeout:1200},res=>{let raw='';res.on('data',chunk=>{raw+=chunk;if(raw.length>2048)req.destroy();});res.on('end',()=>{try{resolve({occupied:true,instance:JSON.parse(raw).instance});}catch{resolve({occupied:true});}});});req.on('timeout',()=>{req.destroy();resolve({occupied:true});});req.on('error',error=>resolve({occupied:error.code!=='ECONNREFUSED'}));});}
function openBrowser(url){const child=spawn('cmd.exe',['/d','/s','/c','start','',url],{windowsHide:true,stdio:'ignore'});child.on('error',()=>console.log('请手动打开：'+url));}
async function launch({root=path.resolve(__dirname,'..'),port,host='127.0.0.1',browser=true}={}){
 root=fs.realpathSync(root);const metadata=fs.readFileSync(path.join(root,'release.json'),'utf8');
 const instance=createHash('sha256').update(metadata+'\n'+root+'\n'+host).digest('hex'),hintFile=path.join(root,'.runtime.json');
 const explicit=port!==undefined||Boolean(process.env.NOVA_PORT);port=port??Number(process.env.NOVA_PORT||55887);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('端口无效');
 let hint;try{hint=JSON.parse(fs.readFileSync(hintFile,'utf8'));}catch{hint=null;}
 if(!explicit&&hint?.instance===instance&&Number.isInteger(hint.port)&&hint.port>0&&hint.port<=65535)port=hint.port;
 const existing=await probe(port);if(existing.instance===instance){const url=`http://127.0.0.1:${port}/`;console.log('奇点已在运行：'+url);if(browser)openBrowser(url);return {reused:true,url};}
 if(existing.occupied){if(explicit)throw Error('端口 '+port+' 已被其他服务占用，请更换 NOVA_PORT。');port=0;}
 const site=path.join(root,'site');for(let n=1;n<=13;n++)if(!fs.existsSync(path.join(site,'chapters',String(n).padStart(2,'0'),'index.html')))throw Error('课时文件不完整，请重新完整解压。');
 const server=createStaticServer({root:site,instance});server.listen(port,host);await once(server,'listening');port=server.address().port;
 fs.writeFileSync(hintFile,JSON.stringify({instance,port}),'utf8');const url=`http://127.0.0.1:${port}/`;
 console.log('奇点纯前端版已就绪：'+url+'\n本窗口仅提供静态网页文件。关闭窗口即可停止。');if(browser)openBrowser(url);
 const stop=()=>{server.close(()=>process.exit(0));server.closeAllConnections();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 return {server,url,reused:false};
}
module.exports={launch,probe};if(require.main===module)launch({browser:!process.argv.includes('--no-browser'),host:process.argv.includes('--lan')?'0.0.0.0':'127.0.0.1'}).catch(error=>{console.error(error.message);process.exitCode=1;});
