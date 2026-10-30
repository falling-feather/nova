'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),config=require('../shared/linkage/chapters.json');
const roots=[config.hub.folder,...config.chapters.map(c=>c.folder),...(config.archives||[]).map(c=>c.folder)];
function child(command,args,cwd){const env={...process.env};for(const key of ['NOVA_CHAPTER_WORKSPACE','NOVA_VITE_MODULE','NOVA_PLAYWRIGHT_MODULE','NOVA_COURSE_LINKS','NOVA_CHAPTER10_MODEL','NOVA_CHAPTER12_ENGINE'])delete env[key];const result=spawnSync(command,args,{cwd,env,stdio:'inherit',windowsHide:true});if(result.error)throw result.error;if(result.status!==0)throw Error('命令失败：'+args.join(' '));}
function npmScript(relative,script){const cwd=path.resolve(root,relative);if(!cwd.startsWith(root+path.sep))throw Error('工程路径越界');if(process.platform==='win32')child('cmd.exe',['/d','/s','/c','npm run '+script],cwd);else child('npm',['run',script],cwd);}
function main(action,selector){
 if(action==='check'){require('./verify.cjs').verify(root);return;}
 if(action==='start'){require('./launch.cjs').launch({root}).catch(error=>{console.error(error.message);process.exitCode=1;});return;}
 const selected=selector?config.chapters.find(c=>String(c.n).padStart(2,'0')===selector||String(c.n)===selector):null;if(selector&&!selected)throw Error('课时编号应为01—13');
 if(action==='dev'&&selected){const pkg=require(path.join(root,selected.folder,'package.json'));npmScript(selected.folder,pkg.scripts.dev?'dev':'start');return;}
 if(action==='dev'){if(roots.some(folder=>!fs.existsSync(path.join(root,folder,folder===config.hub.folder?'NOVA.html':'dist/index.html'))))main('build');main('start');return;}
 if(action==='build'){npmScript(config.hub.folder,'build:platform');for(const folder of selected?[selected.folder]:roots.slice(1))npmScript(folder,'build');require('./verify.cjs').verify(root,{built:!selected});return;}
 if(action==='test'){for(const folder of [...(selected?[selected.folder]:roots),...(selected?[]:['shared/neural','shared/creator'])]){const pkg=require(path.join(root,folder,'package.json'));if(pkg.scripts?.test)npmScript(folder,'test');}return;}
 throw Error('使用 build、dev、test、check 或 start；可追加课时编号。');
}
module.exports={main};if(require.main===module)try{main(process.argv[2]||'check',process.argv[3]);}catch(error){console.error(error.message);process.exitCode=1;}

