const {chromium}=require(process.env.NOVA_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=process.env.NOVA_TEST_OUTPUT||path.resolve(__dirname,'../../../tmp/course-atlas-qa'),url=process.env.NOVA_TEST_BASE_URL||'http://127.0.0.1:5178/courses/index.html';
(async()=>{
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const page=await browser.newPage({viewport:{width:1800,height:1020},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('body[data-ready="true"]');
await page.waitForTimeout(1500);
const views=[];
for(let i=0;i<5;i++){
  await page.locator(`.view-stops [data-view="${i}"]`).click();
  await page.waitForFunction(i=>document.body.dataset.view===String(i)&&document.body.dataset.settled==='true',i);
  await page.screenshot({path:path.join(dir,`desktop-${i+1}.png`)});
  views.push(await page.evaluate(()=>({view:document.body.dataset.view,visible:document.body.dataset.visible,box:document.querySelector('#world-svg').getAttribute('viewBox')})));
}
await page.locator('[data-chapter="13"]').click();await page.waitForSelector('#chapter-dialog[open]');
assert.match(await page.locator('#chapter-title').innerText(),/真实问题/);
await page.waitForFunction(()=>getComputedStyle(document.querySelector('#chapter-dialog')).opacity==='1');
await page.screenshot({path:path.join(dir,'chapter-panel.png')});
await page.locator('#save-chapter').click();assert.equal(await page.locator('#save-chapter').getAttribute('aria-pressed'),'true');
await page.locator('#chapter-experiment').click();await page.waitForSelector('#experiment-dialog[open]');
assert.match(await page.locator('#network-output').innerText(),/24 个连接权重/);
await page.locator('#network-layers').fill('4');await page.locator('#network-width').fill('6');
assert.match(await page.locator('#network-output').innerText(),/138 个连接权重/);
await page.waitForFunction(()=>getComputedStyle(document.querySelector('#experiment-dialog')).opacity==='1');
await page.screenshot({path:path.join(dir,'network-experiment.png')});
await page.keyboard.press('Escape');
await page.locator('#motion-toggle').click();assert.equal(await page.locator('body').getAttribute('data-reduced'),'true');
await page.locator('#catalog-open').click();await page.locator('#saved-filter').check();assert.equal(await page.locator('.catalog-chapter').count(),1);
await page.keyboard.press('Escape');await page.reload({waitUntil:'networkidle'});await page.waitForSelector('body[data-ready="true"]');
assert.equal(await page.locator('[data-chapter="13"]').getAttribute('class'),'chapter is-saved');
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
await page.screenshot({path:path.join(dir,'mobile-first.png')});
await page.locator('#next-view').click();await page.waitForFunction(()=>document.body.dataset.view==='1'&&document.body.dataset.settled==='true');
await page.screenshot({path:path.join(dir,'mobile-second.png')});
await page.locator('#mobile-chapters [data-open-chapter="5"]').click();await page.waitForSelector('#chapter-dialog[open]');
await page.screenshot({path:path.join(dir,'mobile-detail.png')});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
const report={url,title:await page.title(),views,errors,checks:['five camera stops','chapter 13 opens','saved persists reload','saved filter','network demo counts 24 and 138','reduced mode','mobile chapter selection','no horizontal page overflow']};
fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
assert.deepEqual(errors,[]);
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
