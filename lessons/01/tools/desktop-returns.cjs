const { chromium }=require('playwright');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const rows=[],errors=[];
 try{
  for(const [width,height] of [[1366,768],[1440,900]]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   for(let n=1;n<=5;n++){
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:5311/chapters/${String(n).padStart(2,'0')}/`);
    if(n===1){await page.waitForFunction(()=>window.__town?.ready,null,{timeout:60000});await page.locator('#enterTown').click();await page.locator('#mapBtn').click();}
    if(n===2){if(await page.locator('#loading').isVisible())await page.locator('#loading-study').click();else{if(await page.locator('#welcome-dialog').isVisible())await page.locator('#skip-welcome').click();await page.locator('#open-study').click();}}
    if(n===3){await page.locator('.start-button:not([disabled])').click();await page.getByRole('button',{name:'线索册',exact:true}).click();}
    if(n===4){await page.locator('[data-action="start"]:not([disabled])').click();await page.getByRole('button',{name:'作品册',exact:true}).click();}
    if(n===5)await page.locator('dialog[open]').waitFor({timeout:20000});
    await page.waitForTimeout(500);
    const overflow=await page.evaluate(()=>[...document.querySelectorAll('#workbench:not([hidden]) #benchBody,dialog[open],.journal-panel,.modal-body')].filter(e=>e.getClientRects().length&&e.scrollHeight>e.clientHeight+2).map(e=>({id:e.id,class:e.className,height:e.clientHeight,content:e.scrollHeight})));
    assert.deepEqual(overflow,[],`opened panel ${n} ${width}`);
    const returnLink=page.locator('#nova-course-return');
    const visible=await returnLink.evaluate(e=>{const r=e.getBoundingClientRect();return !e.closest('[inert]')&&r.width>0&&r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#nova-course-return')===e;});
    assert.equal(await returnLink.innerText(),'返回奇点');assert.ok(visible,`chapter ${n} ${width}`);
    await page.screenshot({path:`tmp/single-screen/chapter-${n}-${width}.png`});
    await returnLink.click();await page.waitForURL('**/courses/?chapter='+n);rows.push({chapter:n,width,height,visible:true,returned:true});await page.close();
   }
   await context.close();
  }
  assert.deepEqual(errors,[]);await fs.writeFile('tmp/single-screen/desktop-returns.json',JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({checks:rows.length,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
