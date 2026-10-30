import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
const action=(a,x='')=>page.locator(`[data-action="${a}"]${x}`).filter({visible:true}).first().click();
const ready=()=>page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:180000});
try{
 await page.goto('http://127.0.0.1:5369/?qa=1');await ready();
 await page.locator('.stations [data-view="memory"]').click();await action('desk-tab','[data-group="memory"][data-tab="notice"]');await action('copy','[data-id="show"]');
 await page.locator('.stations [data-view="archive"]').click();await action('desk-tab','[data-group="archive"][data-tab="page"]');await action('archive-ask');
 await page.waitForFunction(()=>!window.__conservatory.session.busy&&window.__conservatory.session.records.length===1,null,{timeout:90000});
 const overflow=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&!e.closest('[hidden]')&&!e.classList.contains('sr-only')&&(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)}).map(e=>({tag:e.tagName,class:String(e.className)})));
 assert.deepEqual(overflow,[]);assert.match(await page.locator('.window-reply small').innerText(),/便签1张/);
 await action('check');await action('show-input');assert.match(await page.locator('.dialog').innerText(),/实际便签/);
 await page.keyboard.press('Escape');
 await page.route('**/data/world.json',route=>route.abort());await page.reload();await page.waitForSelector('#error');
 assert.equal(await page.locator('#nova-course-return').count(),1);
 const visible=await page.locator('#nova-course-return').evaluate(e=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit)});assert.ok(visible);
 await writeFile('.work/space-qa/final-focus.json',JSON.stringify({passed:true,checks:['mixed-input-shows-notes-and-pages','document-run-single-screen','full-frozen-input','startup-error-return-visible'],realModelAnswers:1}));
 console.log(JSON.stringify({passed:true,checks:4,realModelAnswers:1}));
}finally{await browser.close()}