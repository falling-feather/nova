const {chromium}=require(process.env.NOVA_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=process.env.NOVA_TEST_OUTPUT;
const base=process.env.NOVA_TEST_BASE_URL||'http://127.0.0.1:5178';
const config=require('../../../../shared/linkage/chapters.json');
const requested=new Set((process.env.NOVA_LINKAGE_CHAPTERS||config.chapters.map(c=>c.n).join(',')).split(',').map(Number));
const titles={1:'春汀',2:'思想之庭',3:'森语奇旅',4:'行动工坊',5:'光影学徒',6:'群岛海图',7:'活字印书局',8:'潮汐沙画节',9:'四季问询亭',10:'校园共创研究所',11:'信号工房',12:'温室行动实验室',13:'奇点共创展'};
const cases=config.chapters.filter(c=>requested.has(c.n)).map(c=>[c.n,c.mount,titles[c.n]]);
assert.equal(cases.length,requested.size,'requested linkage chapters must have a supported browser flow');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 let page;
 try{
  page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});const errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text()+' ['+(message.location().url||'page')+']');});
  page.on('response',response=>{if(response.status()>=400)console.log(JSON.stringify({failedResource:response.url(),status:response.status()}));});
  await page.goto(base+'/NOVA.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.NOVA?.getState().phase==='explore'&&!document.querySelector('#touch').disabled,{},{timeout:45000});
  await page.locator('#touch').click();await page.waitForFunction(()=>NOVA.getState().phase==='courses');
  const embedded=page.frameLocator('#course-frame');await embedded.locator('body[data-interactive="true"]').waitFor();
  await embedded.locator('#catalog-open').click();
  await embedded.locator(`#catalog-list [data-open-chapter="${cases[0][0]}"]`).click();
  for(const [i,[n,mount,title]]of cases.entries()){
    let atlas=i===0?embedded:page;
    if(i!==0){await page.locator('#chapter-dialog [data-close]').click();await page.locator('#catalog-open').click();await page.locator(`#catalog-list [data-open-chapter="${n}"]`).click();}
    const oldName=await atlas.locator('#chapter-short').innerText();
    await Promise.all([page.waitForURL(url=>url.origin===new URL(base).origin&&url.pathname===mount,{timeout:30000}),atlas.locator('#chapter-enter').click()]);
    await page.waitForFunction(expected=>document.title.includes(expected),title,{timeout:30000});
    assert.match(await page.title(),new RegExp(title));
    assert.equal(new URL(page.url()).searchParams.get('novaChapter'),String(n));
    assert.equal(await page.locator('#course-frame').count(),0,'game is the top page, not inside the directory iframe');
    if(n===1)await page.locator('#enterTown').click({timeout:60000});
    if(n===2){await page.locator('#loading').waitFor({state:'hidden',timeout:90000});await page.getByRole('button',{name:'自由参观',exact:true}).click();}
    if(n===3)await page.locator('.start-button:not([disabled])').click({timeout:60000});
    if(n===4)await page.locator('.welcome-start').click({timeout:60000});
    if(n===5){await page.locator('#lightbox-canvas').waitFor({timeout:30000});await page.getByRole('button',{name:'稍后带练，先看任务',exact:true}).click();await page.getByRole('button',{name:'走到看片桌前',exact:true}).click();}
    if(n===9)await page.locator('body[data-ready="true"]').waitFor({timeout:90000});
    const back=page.getByRole('link',{name:'返回奇点课程目录'});
    console.log(JSON.stringify({checkingChapter:n,path:mount,title:await page.title(),returnLinkCount:await page.locator('#nova-course-return').count()}));
    await back.waitFor({state:'visible',timeout:60000});
    if(output){await page.waitForTimeout(400);await page.screenshot({path:path.join(output,`chapter-${n}.png`)});}
    await page.setViewportSize({width:1366,height:768});
    await back.waitFor({state:'visible',timeout:15000});
    if(output)await page.screenshot({path:path.join(output,`chapter-${n}-1366.png`)});
    await Promise.all([page.waitForURL(url=>url.origin===new URL(base).origin&&url.pathname==='/courses/',{timeout:60000}),back.click({timeout:60000})]);
    await page.locator('body[data-interactive="true"][data-settled="true"]').waitFor();await page.locator('#chapter-dialog[open]').waitFor();
    assert.equal(await page.locator('#chapter-number').innerText(),String(n).padStart(2,'0'));
    assert.equal(await page.locator('#chapter-short').innerText(),oldName,'return preserves original directory copy');
    assert.ok((await page.locator('body').getAttribute('data-visible')).split(',').map(Number).includes(n),'return view must contain the selected chapter, even when entry was clicked during a map transition');
    assert.equal(await page.locator('#intro-ui').count(),0,'return goes straight to the directory');
    results.push({chapter:n,origin:new URL(page.url()).origin,path:mount,originalDirectoryName:oldName,returned:true});
    await page.setViewportSize({width:1440,height:900});
  }
  if(output)await page.screenshot({path:path.join(output,'directory-entry.png')});
  const last=cases.at(-1)[0];
  if(last===13)assert.equal(await page.locator('#chapter-next').isEnabled(),false);
  else{await page.locator('#chapter-next').click();assert.equal(await page.locator('#chapter-number').innerText(),String(last+1).padStart(2,'0'));assert.equal(await page.locator('#chapter-enter').isVisible(),config.chapters.some(c=>c.n===last+1));}
  await page.keyboard.press('Escape');
  await page.locator('.view-stops [data-view="0"]').click();await page.locator('body[data-view="0"][data-settled="true"]').waitFor();
  if(requested.has(9)&&config.archives?.some(c=>c.n===9)){
    await page.locator('#catalog-open').click();await page.locator('#catalog-list [data-open-chapter="9"]').click();
    const summary=await page.locator('#chapter-progress-label').textContent();
    await Promise.all([page.waitForURL(url=>url.pathname==='/archive/chapters/09/'),page.locator('#chapter-archive').click()]);
    await page.waitForFunction(()=>document.body.dataset.model==='ready',null,{timeout:90000});
    assert.match(await page.title(),/四季问讯亭/);
    while(await page.locator('.intro:not([hidden]) [data-action="intro-next"]').count())await page.locator('[data-action="intro-next"]').click();
    await Promise.all([page.waitForURL(url=>url.pathname==='/courses/'),page.getByRole('link',{name:'返回奇点课程目录'}).click()]);
    await page.locator('#chapter-dialog[open]').waitFor();
    assert.equal(await page.locator('#chapter-number').innerText(),'09');
    assert.equal(await page.locator('#chapter-progress-label').textContent(),summary,'historical course cannot replace current course summary');
    results.push({chapter:9,path:'/archive/chapters/09/',historical:true,returned:true});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({flow:'home -> directory -> selected courses -> matching chapter; 1440 and 1366 desktop return; final chapter boundary',results,pageErrors:errors}));
 }catch(error){
  if(page)try{
    const state=await page.evaluate(()=>({url:location.href,title:document.title,ready:document.readyState,bodyData:{...document.body.dataset},returnLink:document.querySelector('#nova-course-return')?.getAttribute('href'),visibleText:document.body.innerText.slice(0,1100)}));
    console.error(JSON.stringify({failureState:state}));
    if(process.env.NOVA_FAILURE_OUTPUT)await page.screenshot({path:path.join(process.env.NOVA_FAILURE_OUTPUT,'linkage-failure.png')});
  }catch(captureError){console.error('Failure capture: '+captureError.message);}
  throw error;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
