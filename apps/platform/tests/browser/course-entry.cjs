const {chromium}=require(process.env.NOVA_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.NOVA_TEST_HOME_URL||'http://127.0.0.1:5178/NOVA.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.NOVA?.getState().phase==='explore'&&!document.querySelector('#touch').disabled,{},{timeout:40000});
  await page.locator('#touch').click();await page.waitForFunction(()=>NOVA.getState().phase==='courses');
  const atlas=page.frameLocator('#course-frame');
  await atlas.locator('body[data-ready="true"][data-host-active="true"]').waitFor();
  assert.equal(await page.locator('#end-ui').count(),0,'the discarded interstitial is absent');
  assert.equal(await atlas.locator('#atlas-flock [data-bird]').count(),9);
  await atlas.locator('#next-view').click();await atlas.locator('body[data-view="1"]').waitFor();
  await atlas.getByRole('link',{name:'返回 NOVA 首页'}).click();
  await page.waitForFunction(()=>window.NOVA?.getState().phase==='explore'&&!document.querySelector('#touch').disabled);
  await page.evaluate(()=>{window.NOVA_CONFIG={onEnterCourse(detail){document.body.dataset.callbackSource=detail.source;}};});
  await page.evaluate(()=>NOVA.enterCourse());
  assert.match(page.url(),/NOVA.html$/);assert.equal(await page.locator('body').getAttribute('data-callback-source'),'nova-home');
  assert.deepEqual(errors,[]);console.log('PASS: home -> fracture -> embedded atlas -> home; explicit course callback retains priority; no page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
