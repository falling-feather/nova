const path=require('node:path'),fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const config=require('../../../shared/linkage/chapters.json');
const hub=path.resolve(__dirname,'..'),workspace=path.resolve(hub,'../..');
const run=(command,args,cwd)=>{
  const result=spawnSync(command,args,{cwd,stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;if(result.status!==0)throw new Error('构建失败：'+cwd+' ('+result.status+')');
};
try{
  run(process.execPath,['tools/bundle-backgrounds.cjs'],hub);
  run(process.execPath,['courses/source/build.cjs'],hub);
  run(process.execPath,['tools/build-home.cjs'],hub);
  const builds=[...config.chapters.map(c=>({...c,archive:false})),...(config.archives||[]).map(c=>({...c,archive:true}))];
  for(const chapter of process.argv.includes('--platform-only')?[]:builds){
    const folder=path.resolve(workspace,chapter.folder),relative=path.relative(workspace,folder);
    if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||!fs.existsSync(path.join(folder,'package.json')))throw new Error('无效课程项目：'+chapter.folder);
    console.log('\n构建'+(chapter.archive?'历史版本第':'第')+chapter.n+'章：'+chapter.folder);
    if(process.platform==='win32')run('cmd.exe',['/d','/s','/c','npm run build'],folder);else run('npm',['run','build'],folder);
  }
  console.log(process.argv.includes('--platform-only')?'\n首页与目录构建完成（章节未重建）。':'\n首页、目录和'+config.chapters.length+'章统一构建完成，另保留'+(config.archives||[]).length+'个历史版本入口。');
}catch(error){console.error(error.message);process.exitCode=1;}
