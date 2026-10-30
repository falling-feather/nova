// One HTTP listener serves the homepage and all configured chapter builds.
const {createUnifiedServer}=require('./unified-server.cjs');
const config=require('../../../shared/linkage/chapters.json');
const path=require('node:path');
try{
  const port=Number(process.env.NOVA_PORT||config.hub.port),host=process.env.NOVA_HOST||'127.0.0.1';
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('NOVA_PORT必须是有效端口');
  const server=createUnifiedServer({chapterWorkspace:process.env.NOVA_CHAPTER_WORKSPACE||path.resolve(__dirname,'../../..'),dataFile:process.env.NOVA_DATA_DIR?path.resolve(process.env.NOVA_DATA_DIR,'records.sqlite'):undefined,secureCookie:process.env.NOVA_SECURE_COOKIE==='1'});
  server.once('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用，请先确认已有服务。`:error.message);server.close();process.exitCode=1;});
  server.listen(port,host,()=>{
    const base='http://'+(host==='0.0.0.0'?'127.0.0.1':host)+':'+port;
    console.log('奇点统一服务已启动（一个进程、一个端口）：'+base+'/');
    console.log('课程目录：'+base+'/courses/');
    console.log('个人发现与续学：'+base+'/personal/');
    if(host==='0.0.0.0')console.log('局域网已开放；其他电脑使用本机局域网IP和相同端口。');
    for(const chapter of config.chapters)console.log('第'+chapter.n+'章：'+base+chapter.mount);
    for(const chapter of config.archives||[])console.log('历史版本第'+chapter.n+'章：'+base+chapter.mount);
    console.log('Ctrl+C 停止总服务；子章独立调试命令仍在各自项目中。');
  });
  const stop=()=>{server.close(()=>process.exit(0));server.closeAllConnections();};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('SIGHUP',stop);
}catch(error){console.error(error.message);process.exitCode=1;}
