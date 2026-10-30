'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomBytes,createHash}=require('node:crypto');
const {auditLayout}=require('./layout-probe.cjs');
const root=path.resolve(__dirname,'../../../..'),out=path.resolve(process.env.NOVA_QA_OUTPUT||path.join(root,'tmp/qa-002/account-sand'));fs.mkdirSync(out,{recursive:true});
const runtime=path.join(out,'runtime');fs.mkdirSync(runtime,{recursive:true});process.env.TEMP=runtime;process.env.TMP=runtime;
const {chromium}=require(process.env.NOVA_PLAYWRIGHT_MODULE||'playwright');
const {base}=require('./environment.cjs');
const key='nova-tides-course-v1',report={task:'QA-002',mode:'actual-account-and-chapter-ui',checks:[],snapshots:[]};
const flush=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);
 const username='qa_sand_'+randomBytes(5).toString('hex'),password=randomBytes(16).toString('base64url');
 async function capture(state){const layout=await page.evaluate(auditLayout),screenshot=state+'-'+page.viewportSize().width+'.png';await page.screenshot({path:path.join(out,screenshot)});report.snapshots.push({state,screenshot,layout});flush();}
 async function remote(){return (await(await context.request.get(base+'/api/chapters/8')).json()).payload.records[key];}
 async function chapter(){await page.goto(base+'/chapters/08/?novaChapter=8&novaReturn='+encodeURIComponent(base+'/courses/?chapter=8&view=2'),{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'沙笔',exact:true}).waitFor({timeout:60000});}
 try{
  await page.goto(base+'/personal/');await page.locator('[data-mode="register"]').click();await page.locator('[name="username"]').fill(username);await page.locator('[name="displayName"]').fill('QA真实续学');await page.locator('[name="password"]').fill(password);await page.locator('#auth-form [type="submit"]').click();await page.locator('#finish-recovery').click();
  await chapter();await capture('welcome');
  const back=page.locator('#nova-course-return');assert.equal(await back.innerText(),'返回奇点');assert.equal((await page.evaluate(auditLayout)).returnLink.hitTest,true);
  await page.setViewportSize({width:1440,height:900});await capture('welcome');assert.equal((await page.evaluate(auditLayout)).returnLink.hitTest,true);
  await page.getByRole('button',{name:'跳过介绍，直接探索',exact:true}).click();
  const canvas=page.getByLabel('沙盘',{exact:true}),r=await canvas.boundingBox();await page.mouse.move(r.x+r.width*.3,r.y+r.height*.3);await page.mouse.down();await page.mouse.move(r.x+r.width*.7,r.y+r.height*.6,{steps:15});await page.mouse.up();await page.getByRole('button',{name:'保存原画',exact:true}).click();
  let saved;const start=Date.now();while(Date.now()-start<15000){const value=await remote();if(value&&JSON.parse(value).drawing){saved=JSON.parse(value);break;}await page.waitForTimeout(250);}assert.ok(saved?.drawing,'Real chapter UI must sync its own native drawing');
  const drawingHash=createHash('sha256').update(saved.drawing).digest('hex');report.checks.push({name:'real-ui-drawing-synced-to-account',pass:true,drawingHash,drawingFrom:saved.drawingFrom});await capture('saved-drawing');
  await back.click();await page.waitForURL(u=>u.pathname==='/courses/');await page.locator('#chapter-dialog[open]').waitFor();assert.equal(await page.locator('#chapter-number').innerText(),'08');
  await page.locator('#chapter-enter').click();await page.waitForURL(u=>u.pathname==='/chapters/08/');await page.getByRole('button',{name:'沙笔',exact:true}).waitFor({timeout:60000});await capture('continued-from-directory');
  assert.equal(createHash('sha256').update(JSON.parse(await remote()).drawing).digest('hex'),drawingHash);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null,'Account UI must not write over the guest original key');
  const second=await browser.newContext({viewport:{width:1366,height:768}});const p=await second.newPage();await p.goto(base+'/personal/');await p.locator('[name="username"]').fill(username);await p.locator('[name="password"]').fill(password);await p.locator('#auth-form [type="submit"]').click();await p.locator('#logout').waitFor({state:'visible'});
  await p.goto(base+'/chapters/08/?novaChapter=8&novaReturn='+encodeURIComponent(base+'/courses/?chapter=8&view=2'));await p.getByRole('button',{name:'沙笔',exact:true}).waitFor({timeout:60000});
  const restored=await(await second.request.get(base+'/api/chapters/8')).json();assert.equal(createHash('sha256').update(JSON.parse(restored.payload.records[key]).drawing).digest('hex'),drawingHash);
  report.checks.push({name:'directory-return-and-independent-browser-continue',pass:true,guestKeyUntouched:true});await second.close();report.verdict='pass';
 }catch(e){report.verdict='needs-review';report.error=e.message.split('\n').slice(0,5).join('\n');await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.log(JSON.stringify({error:report.error}));}
 finally{await context.close();await browser.close();flush();console.log(JSON.stringify({verdict:report.verdict,checks:report.checks}));}
})().catch(e=>{console.error(e.message);process.exitCode=1});
