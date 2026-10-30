import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../../lessons/06/package.json',import.meta.url)),{chromium}=require('playwright');
const output=fileURLToPath(new URL('../../第六章/tmp/',import.meta.url));
await fs.stat(new URL('../../../lessons/06/',import.meta.url));await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const context=await browser.newContext({acceptDownloads:true});
  await context.addInitScript(()=>{window.events=[];window.addEventListener('nova:progress',e=>window.events.push(e.detail));Storage.prototype.getItem=()=>{throw new DOMException('模拟课堂存储受限','SecurityError');};Storage.prototype.setItem=()=>{throw new DOMException('模拟课堂存储受限','SecurityError');};});
  const page=await context.newPage();await page.goto('http://127.0.0.1:5266/');await page.locator('#map').waitFor();
  assert.equal(await page.locator('[data-action=raw-export]').count(),0);
  await page.locator('[data-action=train]').click();assert.equal(await page.evaluate(()=>window.events.length),0);
  const downloading=page.waitForEvent('download');await page.locator('[data-action=export]').first().click();const d=await downloading,file=output+'storage-limited-export.json';await d.saveAs(file);
  const artifact=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(artifact.payload.session.workspaces.lighthouse.model.steps,100);await context.close();
  const normal=await browser.newContext({viewport:{width:1440,height:900}}),p=await normal.newPage();await p.goto('http://127.0.0.1:5271/');await p.locator('#map').waitFor();
  await p.screenshot({path:fileURLToPath(new URL('../../../tmp/screens/lessons-11/信号工房-1440.png',import.meta.url))});
  assert.ok((await p.locator('.network-svg').textContent()??'').includes('预测 σ(z)'));await normal.close();
  console.log(JSON.stringify({passed:4,summaryEventsWhenStorageBlocked:0,emptyRawExportButton:false,exportedRealTrainingSteps:100,outputNodeQuantity:'sigmoid(z)'}));
}finally{await browser.close();}
