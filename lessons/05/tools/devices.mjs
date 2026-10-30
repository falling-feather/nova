import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import {operate,dismissPracticeOffer,completePractice} from "./guidance-actions.mjs";
const browser=await chromium.launch({channel:"msedge",headless:true}),results=[],errors=[];
try{
 for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[320,740]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce",isMobile:width<500,hasTouch:width<500});page.setDefaultTimeout(10000);page.on("pageerror",e=>errors.push(e.message));
  await page.goto(process.env.LIGHT_TEST_URL||"http://127.0.0.1:5205/");await page.locator("#lightbox-canvas").waitFor();
  if(width===320)await completePractice(page);else await dismissPracticeOffer(page);
  await page.locator('dialog[data-kind="intro"]').waitFor();await page.locator(".sheet-close").click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`horizontal overflow at ${width}`);
  assert.ok(await page.locator(".stage").evaluate(el=>el.scrollWidth<=innerWidth+1),`hidden stage overflow at ${width}`);
  assert.ok(await page.locator(".experiment-core").evaluate(el=>el.scrollWidth<=el.clientWidth+1),`inner horizontal overflow at ${width}`);
  if(width>=900){
   const core=await page.locator('.experiment-core').evaluate(el=>({fits:el.scrollHeight<=el.clientHeight+1,widthFits:el.scrollWidth<=el.clientWidth+1}));
   assert.ok(core.fits&&core.widthFits,`core workspace overflows at ${width}x${height}`);
   for(const selector of ['.learn-plate','.test-box','.label-card','.balance']){
    const inside=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;});assert.ok(inside,`${selector} is outside the viewport`);
   }
  }
  for(const id of ['tasks','photos','parameters','knowledge','records']){
   await page.locator(`.dock-rail [data-dock="${id}"]`).click();assert.equal(await page.locator(`#dock-${id}`).isVisible(),true);
   await page.locator(`#dock-${id} [data-action="dock-close"]`).click();assert.equal(await page.locator(`#dock-${id}`).isVisible(),false);
  }
  const filter=page.locator('[data-filter="green"]');await operate(page,filter);await filter.focus();await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute("data-filter")),"green","keyboard position survives repaint");
  await operate(page,page.locator('[data-action="review"]'));await operate(page,page.locator('[data-action="teach"]'));await page.locator('body[data-busy="false"]').waitFor();
  await page.locator('[data-action="bill"]').first().click();await page.locator(".bill table").waitFor();await page.keyboard.press("Escape");
  await operate(page,page.locator('[data-action="open-test"]'));await page.locator(".matrix").waitFor();
  assert.equal(await page.locator(".matrix [data-photo-id]").count(),12);
  await page.locator(".sheet-close").click();
  await page.screenshot({path:`docs/实机图/设备-${width}.png`,fullPage:width<1000});
  results.push({width,height,noHorizontalOverflow:true,filterLabelsAndLearningClickable:true,keyboardFocusPreserved:true});await page.close();
 }
 assert.deepEqual(errors,[]);const summary={status:"passed",browser:"Windows Edge offscreen, viewport and touch emulation",results,errors,realPhoneTested:false};fs.writeFileSync("docs/设备验证.json",JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}finally{await browser.close();}
