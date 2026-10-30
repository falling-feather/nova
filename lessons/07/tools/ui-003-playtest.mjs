import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const url=process.env.WORKSHOP_URL||'http://127.0.0.1:5367/';
const out=new URL('../.work/ui-003/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],checks=[];
const viewports=[{width:1366,height:768},{width:1440,height:900}];
for(const viewport of viewports){
  const context=await browser.newContext({viewport,acceptDownloads:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const cmd=(name,value)=>page.locator(`[data-cmd="${name}"]${value===undefined?'':`[data-value="${value}"]`}`).filter({visible:true}).first();
  const click=async(name,value)=>{await cmd(name,value).click();if(await cmd('guide-start').isVisible())await cmd('guide-start').click();};
  const saved=async()=>{await page.waitForTimeout(250);return page.evaluate(()=>JSON.parse(localStorage.getItem('nova-type-house-v1')));};
  const fit=async(label)=>{await page.waitForTimeout(100);const failures=await page.evaluate(()=>{
    const elements=[...document.querySelectorAll('.atelier,.atelier-content,.activity-unit,#task-status,.dock,.sentence-ribbon,.inspector:not([hidden]) .sheet-page:not([hidden]),dialog[open] .sheet-page:not([hidden])')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]'));
    return elements.flatMap(e=>{const b=e.getBoundingClientRect();const bad=e.scrollHeight>e.clientHeight+3||b.left<0||b.top<0||b.right>innerWidth+2||b.bottom>innerHeight+2;return bad?[{element:e.className||e.id,box:[b.x,b.y,b.width,b.height],overflow:e.scrollHeight-e.clientHeight}]:[];});
  });assert.equal(failures.length,0,JSON.stringify({label,failures}));checks.push({viewport,label});};
  const turnTo=async(target,scope=page)=>{const locator=scope.locator(target).filter({visible:true});for(let i=0;i<20&&!await locator.isVisible();i++){const next=scope.locator('[data-sheet-move="1"]').filter({visible:true}).first();if(!await next.isEnabled())break;await next.click();}assert.equal(await locator.isVisible(),true,`Reachable ${target}`);return locator.first();};
  try{
    await page.goto(url);await page.locator('#app[data-ready="true"]').waitFor({timeout:120000});
    await click('explore','explore');await click('room','council');
    assert.deepEqual((await saved()).done,{},'moving through tools does not fabricate completion');
    await fit('context edit');
    await cmd('capture-context','a').click();
    await page.locator('[data-field="council-text"]').fill('小明吃了一个苹果。');await click('apply-context');await click('capture-context','b');await click('atelier-page','compare');
    await fit('actual A/B');
    const r=await saved();const a=r.notes.workbench.experiments['12'].a,b=r.notes.workbench.experiments['12'].b;
    assert.equal(a.tokens.join(''),'小明用苹果拍了一张照片。');assert.equal(b.tokens.join(''),'小明吃了一个苹果。');assert.equal(a.vector.some((v,i)=>Math.abs(v-b.vector[i])>1e-6),true);
    await page.screenshot({path:fileURLToPath(new URL(`playtest-ab-${viewport.width}.png`,out))});
    await click('answer','same');assert.equal((await saved()).done['12'],undefined,'wrong actual interpretation cannot complete');await click('answer','diff');
    await click('review');const modal=page.locator('dialog[open]');await(await turnTo('[data-cmd="review-choice"][data-value="0"]',modal)).click();await(await turnTo('[data-field="review-observation"]',modal)).fill('最大格差11.4810；同词在不同上下文形成了不同表示，连线不能单独证明完整原因。');await(await turnTo('[data-cmd="review-submit"]',modal)).click();
    await page.locator('dialog[open]').waitFor({state:'hidden'});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nova-type-house-v1')).done['12']===true);const signed=(await saved()).reviews.council.evidence;
    await click('atelier-page','tools');await fit('word tool');await page.locator('[data-field="context-token"]').fill('昨天');await click('insert-context');await fit('inserted context');
    assert.deepEqual((await saved()).reviews.council.evidence,signed,'signed result is frozen');
    await click('atelier-page','edit');await page.locator('[data-field="council-text"]').fill('苹果'+'小明吃了一个。'.repeat(5));await click('apply-context');
    await fit('long context tray');await page.waitForTimeout(700);
    const occluded=await page.evaluate(()=>{
      const obstacles=['#heading','.sentence-ribbon','#atelier','#manipulation-help','#dock','#task-status'].map(s=>document.querySelector(s)).filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect());
      return [...document.querySelectorAll('[data-hotspot][data-movable="true"]')].filter(e=>e.getClientRects().length).flatMap(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return obstacles.some(o=>x>o.left&&x<o.right&&y>o.top&&y<o.bottom)?[e.getAttribute('aria-label')]:[];});
    });assert.equal(occluded.length,0,JSON.stringify({label:'visible word controls are uncovered',occluded}));
    const completeTokens=(await saved()).notes.workbench.council['12'].tokens;
    await click('council-page','1');assert.deepEqual((await saved()).notes.workbench.council['12'].tokens,completeTokens);checks.push({viewport,label:'long tray keeps full input and uncovered controls'});
    await click('room','counting');await fit('independent ledger');assert.equal((await saved()).done['01'],undefined);
    await page.reload();await page.locator('#app[data-ready="true"]').waitFor({timeout:120000});assert.equal((await page.locator('#app').getAttribute('data-station')),'16');
    await click('route');await(await turnTo('[data-cmd="station"][data-value="25"]',page.locator('dialog[open]'))).click();if(await cmd('guide-start').isVisible())await cmd('guide-start').click();await fit('free editor');
    await(await turnTo('[data-field="draft-headline"]',page.locator('.proof-paper'))).fill('我编辑的校庆通讯');await(await turnTo('[data-field="draft-opening"]',page.locator('.proof-paper'))).fill('本周六，晨风中学举行了');
    await click('continue');await page.locator('#busy').waitFor({state:'hidden',timeout:120000});
    await(await turnTo('[data-field="draft-edited"]',page.locator('.proof-paper'))).fill('本周六，晨风中学举行第六十届校庆。合唱团在礼堂表演歌曲《晨风》。初二（三）班获得一等奖。');
    await click('inspect-proof');const inspector=page.locator('#inspector');for(const key of ['facts','readability','attribution'])await(await turnTo(`[data-cmd="proof"][data-value="${key}"]`,inspector)).click();await(await turnTo('[data-cmd="publish"]',inspector)).click();
    await click('review');await(await turnTo('[data-cmd="review-choice"][data-value="2"]',page.locator('dialog[open]'))).click();await(await turnTo('[data-field="review-observation"]',page.locator('dialog[open]'))).fill('我依据安排表改正地点和事实，并保留逐字AI署名。');await(await turnTo('[data-cmd="review-submit"]',page.locator('dialog[open]'))).click();
    assert.equal((await saved()).finale,true);await fit('signed special issue');
    const download=page.waitForEvent('download');await click('export-issue');await download;
    await page.reload();await page.locator('#app[data-ready="true"]').waitFor({timeout:120000});assert.equal((await saved()).finale,true,'an independently published issue restores without forged prerequisites');
    checks.push({viewport,label:'publication, export and reload passed'});
    const longCopy='学生亲手改写这一段通讯。'.repeat(32)+'𰻞😀';
    await(await turnTo('[data-field="draft-edited"]',page.locator('.proof-paper'))).fill(longCopy);
    assert.equal((await saved()).notes['25'].edited,longCopy,'a long paste preserves every character in the authoritative draft');
    assert.equal((await saved()).finale,false,'editing the signed copy revokes current publication');
    const editSheet=page.locator('.proof-paper .editor-sheet').filter({has:page.locator('[data-field="draft-edited"]')});
    while(await editSheet.locator('[data-edit-turn="-1"]').isEnabled())await editSheet.locator('[data-edit-turn="-1"]').click();
    await page.locator('.proof-paper [data-field="draft-edited"]:visible').fill('首段修订。');
    assert.equal((await saved()).notes['25'].edited,'首段修订。'+longCopy.slice(120),'editing the first sheet retains all later sheets');
    await fit('long draft editing');checks.push({viewport,label:'long paste, sliced edit and revocation passed'});
  }catch(error){await page.screenshot({path:fileURLToPath(new URL(`failure-${viewport.width}.png`,out))});throw error;}finally{await context.close();}
}
await browser.close();await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:checks.length,errors}));
