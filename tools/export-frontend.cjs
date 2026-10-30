'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=path.resolve(__dirname,'..'),workspace=path.dirname(source),projectWorkspace=path.resolve(workspace,'..'),output=process.argv[2]?path.resolve(process.argv[2]):path.join(workspace,'整站-纯前端展示');
const [major,minor]=process.versions.node.split('.').map(Number);if(major<24||(major===24&&minor<20))throw Error('需要Node 24.20.0或更新版本');
const runtimeExe=process.env.NOVA_RUNTIME_NODE?path.resolve(process.env.NOVA_RUNTIME_NODE):process.execPath;if(!process.env.NOVA_RUNTIME_NODE&&process.platform!=='win32')throw Error('非Windows打包须用NOVA_RUNTIME_NODE指向Windows x64的node.exe');if(!fs.existsSync(runtimeExe))throw Error('找不到运行时：'+runtimeExe);
const runtimeVersion=(/node-(v\d+\.\d+\.\d+)-win-x64/.exec(runtimeExe)||[])[1]||process.version;
if(fs.existsSync(output))throw Error('输出目录已存在，请先核对现有交付，不自动覆盖。');
const outputParent=fs.realpathSync(path.dirname(output)),relativeParent=path.relative(fs.realpathSync(projectWorkspace),outputParent);
if(relativeParent==='..'||relativeParent.startsWith('..'+path.sep)||path.isAbsolute(relativeParent))throw Error('输出目录必须在当前总工作区内');
const copy=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true,filter:file=>!['.gitkeep','.DS_Store'].includes(path.basename(file))});};
const write=(relative,text)=>{const file=path.join(output,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text,'utf8');};
fs.mkdirSync(output);const site=path.join(output,'site');
require('./static-site.cjs').assembleSite(site);
const manifest=JSON.parse(fs.readFileSync(path.join(source,'shared/linkage/storage-manifest.json'),'utf8'));
for(const file of ['static-start.cjs','static-server.cjs'])copy(path.join(source,'tools',file),path.join(output,'tools',file));
copy(runtimeExe,path.join(output,'runtime/node.exe'));
const runtimeLicense=['LICENSE','LICENSE-Node.txt'].map(name=>path.join(path.dirname(runtimeExe),name)).find(file=>fs.existsSync(file));
if(!runtimeLicense)throw Error('Node运行时许可证缺失');
copy(runtimeLicense,path.join(output,'runtime/LICENSE-Node.txt'));
copy(path.join(source,'docs/licenses'),path.join(output,'licenses'));
for(const [from,name] of [['lessons/01/src/vendor/THREE-LICENSE.txt','THREE-town.txt'],['lessons/01/assets/pbr/sources.json','chapter01-material-sources.json'],['lessons/01/assets/models/asset-lock.json','chapter01-model-sources.json']])copy(path.join(source,from),path.join(output,'licenses',name));
for(const name of Object.keys(require('../package.json').dependencies)){const folder=path.join(source,'node_modules',name);for(const file of fs.readdirSync(folder).filter(file=>/^licen[sc]e(?:\.|$)/i.test(file)))copy(path.join(folder,file),path.join(output,'licenses',name.replaceAll('/','-')+'-'+file));}
write('点我一键启动.cmd','@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\n"%~dp0runtime\\node.exe" "%~dp0tools\\static-start.cjs" %*\r\nif errorlevel 1 pause\r\n');
write('release.json',JSON.stringify({name:'奇点纯前端提交版',createdAt:new Date().toISOString(),chapters:13,mode:'frontend-only',runtime:runtimeVersion,id:crypto.randomUUID()},null,2));
write('README.md',`# 奇点 · 纯前端提交版

完整十三课时的桌面展示包。无需登录，没有账号接口、数据库或云同步。学习计算、进度与作品均在浏览器内运行。

## 一键启动

1. 将压缩包**完整解压**到任意文件夹，不要在压缩软件内直接运行。
2. 双击 **点我一键启动.cmd**，等待浏览器自动打开。
3. 展示期间保留启动窗口；关闭窗口或按 Ctrl+C 停止静态文件服务。

随包附带 Windows x64 Node.js ${runtimeVersion} 与许可证，不需要安装 Node、npm 或依赖。请使用桌面 Edge / Chrome 并开启图形加速。本包面向桌面端；本次打包核验范围见“交付检查.json”，不把历史界面检查当成本次重跑。

启动器优先使用55887端口，被其他程序占用时自动选择空闲端口；重复双击会复用本文件夹的运行实例。窗口会显示实际网址。本机服务只传输静态网页文件，不提供账号、业务API或数据库。

## 内容与记录

从首页进入课程地图，即可选择十三课时。“我的发现”只查看当前浏览器的进度与留存作品。各章仍支持原有的导入、导出功能；重要作品请及时下载。

本包不含任何既有学习记录、账号、密码、Cookie或开发测试数据。使用后的学习记录留在浏览器中，不会写入压缩包；更换端口、浏览器或电脑会使用独立记录。在“我的发现 → 清除本机记录”可重新开始。清除前请先导出需要保留的作品。

文件夹结构：site/ 为可部署到静态网站根目录的完整网页，tools/ 为静态启动器，runtime/ 为随包运行时，licenses/ 为依赖和素材来源。不要双击HTML直接以file协议打开，三维模型、模块和计算工作线程需要HTTP加载。

## 十三课时

${manifest.map(item=>'- '+String(item.chapter).padStart(2,'0')+' '+item.title).join('\n')}

## 局域网或静态托管

关闭原启动窗口后，在本文件夹终端运行 runtime/node.exe tools/static-start.cjs --lan，再用本机局域网IP与窗口端口访问。另一台设备仍保存自己的浏览器记录。现场防火墙与不同电脑性能需要现场确认。

静态托管时，将 site/ 内的文件放在网站根目录，保留 courses/、chapters/、platform/、personal/ 层级，并正确提供 WASM、JavaScript、字体和视频类型。整个站点无需业务后端。
`);
let count=0,bytes=0;function walk(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())walk(file);else{count++;bytes+=fs.statSync(file).size;}}}walk(output);console.log(JSON.stringify({output,files:count,bytes}));
