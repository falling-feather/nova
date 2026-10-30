import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newSession,seal,capture,validateSession} from '../session.ts';
import {train,evaluate,createModel} from '../network.ts';
const require=createRequire(new URL('../../../lessons/06/package.json',import.meta.url)),{chromium}=require('playwright');
const out=fileURLToPath(new URL('../../第六章/.work/qa/',import.meta.url));await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),cases=[];
try{
 for(const sealed of [true,false]){
  const s=newSession(6),w=s.workspaces.lighthouse;s.presentation={guideSeen:[0,1,2,3,4]};const a=capture(w,'A',0);train(w.model,w.train,500);
  if(sealed)seal(w);else w.records.push({id:'fixture',unit:0,title:'实际实验',prediction:'训练会改变分界',explanation:'保留真实前后',snapshots:[a,capture(w,'B',0)],createdAt:new Date().toISOString()});
  const frozen=evaluate(w.model,w.validation).accuracy;w.model=createModel([6],'sigmoid',7);w.model.layers.forEach(l=>{l.bias.fill(0);l.weights.forEach(r=>r.fill(0));});w.model.layers.at(-1).bias[0]=100;validateSession(s);
  const context=await browser.newContext({acceptDownloads:true});await context.addInitScript(s=>localStorage.setItem('nova-neural-ch6-v1',JSON.stringify(s)),s);const page=await context.newPage();await page.goto('http://127.0.0.1:5366/');
  await page.locator('[data-action=report]').click();assert.ok((await page.locator('#gallery-summary').innerText()).includes((frozen*100).toFixed(1)+'%'));
  const promise=page.waitForEvent('download');await page.locator('[data-action=report-html]').click();const download=await promise,file=out+'report-'+(sealed?'sealed':'record')+'.html';await download.saveAs(file);
  const html=await fs.readFile(file,'utf8');assert.ok(html.includes('模型 2 → 1 → 1'));assert.ok(html.includes('验证 '+(frozen*100).toFixed(1)+'%'));cases.push({sealed,frozen,passed:true});await context.close();
 }
 console.log(JSON.stringify({passed:true,cases}));
}finally{await browser.close();}
