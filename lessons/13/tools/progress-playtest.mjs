import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createProject} from '../src/seed.ts';
import {action,skipGuide,returnVisible} from './browser-helpers.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),output=path.join(root,'.work','progress-check');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const key='nova.capstone.project.v1',summaryKey='nova-chapter-progress-v1:13';
const prior={schema:'nova-chapter-progress',version:1,chapter:13,completed:4,total:6,pathLabel:'信息助手项目',artifactCount:1,updatedAt:123};
const errors=[],checks=[];const base=process.env.NOVA_CAPSTONE_URL??'http://127.0.0.1:5373/';
async function open({raw=null,readBlocked=false,writeBlocked=false,account=false,race=false,rejectInit=false}={}){
 const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,summaryKey,prior,raw,readBlocked,writeBlocked,account,race,rejectInit})=>{
  const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
  if(raw!==null)set.call(localStorage,key,raw);set.call(localStorage,summaryKey,JSON.stringify(prior));
  window.events=[];window.addEventListener('nova:progress',e=>window.events.push(e.detail));
  if(readBlocked)Storage.prototype.getItem=function(k){if(k===key)throw Error('读取受限');return get.call(this,k);};
  if(writeBlocked)Storage.prototype.setItem=function(k,v){if(k===key)throw Error('写入受限');return set.call(this,k,v);};
  if(account||race||rejectInit){let ready;let captured;window.mockOpened=false;window.mockReads=0;window.mockFailWrite=false;
   const port={getItem:k=>{window.mockReads++;return captured??null;},setItem:(k,v)=>{if(window.mockFailWrite)throw Error('本机事务写入失败');captured=v;},flush:()=>race?new Promise(resolve=>window.releaseFlush=()=>resolve({storageError:'',fenced:false})):Promise.resolve({storageError:'',fenced:false}),saveArtifact:()=>{}};
   window.accountSaved=()=>captured;window.releaseReady=()=>ready();
   const platform={ready:new Promise(resolve=>ready=resolve),openChapter:async options=>{if(rejectInit)throw Error('账号初始化异常');window.mockOpened=true;window.mockKeys=options.keys;return port;}};
   window.NovaPlatformReady=Promise.resolve(platform);if(!account)ready();
  }
 },{key,summaryKey,prior,raw,readBlocked,writeBlocked,account,race,rejectInit});
 await page.goto(base);return {context,page};
}
const events=page=>page.evaluate(()=>window.events.length);
const summary=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),summaryKey);
try{
 for(const [name,options] of [['空欢迎',{}],['旧默认包',{raw:JSON.stringify({schema:'nova-capstone-save',version:1,project:createProject()})}],['坏记录',{raw:'{不得覆盖'}],['读取失败',{readBlocked:true}]]){
  const{context,page}=await open(options);await page.locator('.topbar').waitFor();await skipGuide(page);assert.equal(await events(page),0,name);assert.deepEqual(await summary(page),prior,name);checks.push(name);await context.close();
 }
 {const{context,page}=await open();await skipGuide(page);await action(page,'toggle-latest');await page.waitForFunction(()=>window.events.length>0);assert.equal((await summary(page)).completed,0);checks.push('真实草稿0/6');await context.close();}
 {const{context,page}=await open({writeBlocked:true});await skipGuide(page);await action(page,'toggle-latest');assert.equal(await events(page),0);assert.deepEqual(await summary(page),prior);assert.match(await page.locator('#save-status').innerText(),/保存失败/);checks.push('写入失败保护原摘要');await context.close();}
 {const{context,page}=await open({account:true});await page.locator('#startup-message').waitFor();assert.equal(await page.evaluate(()=>window.mockReads),0);assert.equal(await page.evaluate(()=>window.mockOpened),false);await returnVisible(page,'登录等待');await page.evaluate(()=>window.releaseReady());await page.locator('.scene-layout').waitFor();await skipGuide(page);await action(page,'toggle-latest');await page.waitForFunction(()=>window.events.length>0);assert.deepEqual(await page.evaluate(()=>window.mockKeys),[key]);const raw=await page.evaluate(()=>window.accountSaved());assert.equal(JSON.parse(raw).project.draft.useLatest,true);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);checks.push('登录等待与唯一port');await context.close();}
 {const{context,page}=await open({race:true});await page.locator('.scene-layout').waitFor();await skipGuide(page);await action(page,'toggle-latest');await page.evaluate(()=>window.mockFailWrite=true);await action(page,'toggle-sources');await page.evaluate(()=>window.releaseFlush());assert.equal(await events(page),0);assert.match(await page.locator('#save-status').innerText(),/保存失败/);checks.push('晚到flush不发布失败内容');await context.close();}
 {const{context,page}=await open({rejectInit:true});await page.locator('#startup-message').filter({hasText:'账号初始化异常'}).waitFor();assert.equal(await page.evaluate(()=>window.mockReads),0);await returnVisible(page,'真实初始化失败');checks.push('账号异常不回读游客');await context.close();}
 assert.deepEqual(errors,[]);await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,actualPlatformListener:true},null,2),'utf8');process.stdout.write(JSON.stringify({checks,errors,actualPlatformListener:true}));
}finally{await browser.close();}
