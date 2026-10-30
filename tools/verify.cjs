'use strict';
const fs=require('node:fs'),path=require('node:path');
function verify(root,{built=false}={}){
 root=fs.realpathSync(root);const config=require(path.join(root,'shared/linkage/chapters.json')),roots=[config.hub.folder,...config.chapters.map(c=>c.folder),...(config.archives||[]).map(c=>c.folder)];
 if(config.chapters.length!==13||new Set(config.chapters.map(c=>c.n)).size!==13)throw Error('必须包含十三个独立正式课时');
 for(const relative of roots){const folder=path.resolve(root,relative);if(!folder.startsWith(root+path.sep)||fs.realpathSync(folder)!==folder)throw Error('项目路径不属于提交版');if(!fs.existsSync(path.join(folder,'package.json')))throw Error('缺少课时源码包：'+relative);const pkg=JSON.parse(fs.readFileSync(path.join(folder,'package.json')));if(pkg.dependencies||pkg.devDependencies)throw Error('子工程仍有重复依赖：'+relative);if(built&&!fs.existsSync(path.join(folder,relative===config.hub.folder?'NOVA.html':'dist/index.html')))throw Error('缺少实际构建：'+relative);}
 const modules=path.join(root,'node_modules');if(fs.existsSync(modules)&&fs.lstatSync(modules).isSymbolicLink())throw Error('根node_modules不能是junction或链接');
 console.log(JSON.stringify({sourceLayoutValid:true,chapters:13,shared:'single-source',built}));return true;
}
module.exports={verify};if(require.main===module)try{verify(path.resolve(__dirname,'..'),{built:process.argv.includes('--built')});}catch(error){console.error(error.message);process.exitCode=1;}
