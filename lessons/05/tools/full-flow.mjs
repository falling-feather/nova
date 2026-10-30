import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import {operate,completePractice} from "./guidance-actions.mjs";
const browser=await chromium.launch({channel:"msedge",headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"reduce"});
page.setDefaultTimeout(15000);
const errors=[],failures=[],results=[];
page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("nova-light-apprentice-v1")));
const close=async()=>{if(await page.locator("dialog[open]").count())await page.locator(".sheet-close").click();};
const act=action=>operate(page,page.locator(`[data-action="${action}"]`).first());
const output=process.env.LIGHT_TEST_OUTPUT || "docs/实机图";fs.mkdirSync(output,{recursive:true});
const shot=name=>page.screenshot({path:`${output}/${name}.png`});
const idle=()=>page.locator('body[data-busy="false"]').waitFor();
async function photo(id,batch){
 await close();
 if(batch&&await page.locator(`[data-action="batch-tab"][data-batch="${batch}"]`).count())await operate(page,page.locator(`[data-action="batch-tab"][data-batch="${batch}"]`));
 await operate(page,page.locator(`.drawer-photos [data-photo-id="${id}"]`));
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem("nova-light-apprentice-v1")).selectedId===id,id);
 await page.locator(".label-card header").waitFor();
}
async function review(){if(!await page.locator(".label-card .stamp").count())await act("review");await page.locator(".label-card .stamp").waitFor();}
async function batch(){await close();await act("multi");await act("pick-new");await act("teach-batch");await idle();}
async function inspect(next=false){if(!next)await close();await act(next?"next-test":"open-test");await page.locator(".matrix").waitFor();return (await read()).inspections.at(-1);}
async function note(text){await close();await act("note");await page.locator("#observation-note").fill(text);await close();}
async function finish(){
 const next=Math.min(5,(await read()).stage+1);await close();
 await operate(page,page.locator('.task-card [data-action="finish"]'));
 await page.locator('dialog[open][data-kind="lesson-review"]').waitFor();
 await page.locator('[data-action="next-lesson"]').click();
 await page.waitForFunction(expected=>JSON.parse(localStorage.getItem("nova-light-apprentice-v1")).stage===expected,next);
 await idle();await page.locator('dialog[data-kind="intro"]').waitFor({timeout:8000});await close();
}
try {
 await page.goto(process.env.LIGHT_TEST_URL||"http://127.0.0.1:5205/");await page.locator("#lightbox-canvas").waitFor();
 await completePractice(page);
 await page.locator('dialog[data-kind="intro"]').waitFor();await close();
 assert.equal((await page.evaluate(async()=>await(await fetch("./assets/photos/catalog.json")).json())).photoCount,270);
 await shot("01-绿色看片桌");
 const initial=(await read()).models;
 await operate(page,page.locator('[data-filter="green"]'));await act("review");
 assert.deepEqual((await read()).models,initial,"checking a label never trains");
 await act("teach");await idle();assert.equal((await read()).models.green.steps,1);
 await act("undo");assert.deepEqual((await read()).models,initial);
 for(const id of ["t001","t002","t003","t004"]){await photo(id,1);await review();}
 await operate(page,page.locator('[data-rate="light"]'));
 let green;
 for(let trial=0;trial<3;trial++){await batch();green=await inspect();if(green.correct>=10)break;}
 assert.ok(green.correct>=10);results.push({stage:1,correct:green.correct,eligible:green.eligible});
 await shot("02-绿色检验盒");await finish();assert.equal((await read()).stage,2);
 await operate(page,page.locator('[data-filter="edges"]'));await operate(page,page.locator('[data-filter="exposure"]'));await batch();const quality=await inspect();
 results.push({stage:2,correct:quality.correct,eligible:quality.eligible});
 await note("清晰度把天平压向“是”，可照片太暗时，明暗失衡会压向“不是”。");await finish();assert.equal((await read()).stage,3);
 await batch();const biased=await inspect();assert.equal((await read()).flowerDelivery,true);await shot("03-花朵第一批的盲区");
 await close();await operate(page,page.locator('[data-action="batch-tab"][data-batch="3"]'));await batch();await inspect();const revised=await inspect(true);
 results.push({stage:3,before:biased.correct,beforeTotal:biased.eligible,after:revised.correct,afterTotal:revised.eligible});await finish();assert.equal((await read()).stage,4);
 const wrong=["t105","t106","t107","t108","t109","t110"];
 for(const id of wrong){await photo(id,4);await review();
   for(const fix of await page.locator('.label-row.mismatch [data-action="set-label"][aria-pressed="false"]').all())await fix.click();
   assert.equal(await page.locator(".label-row.mismatch").count(),0,`${id} corrected`);}
 await operate(page,page.locator('[data-rate="heavy"]'));await act("teach");await idle();const heavy=(await read()).receipts.at(-1);assert.equal(heavy.updates.length,3);
 await act("undo");assert.ok((await read()).ratesTried.includes("heavy"));
 await operate(page,page.locator('[data-rate="light"]'));await act("teach");await idle();
 await operate(page,page.locator('[data-action="batch-tab"][data-batch="1"]'));await batch();const corrected=await inspect();results.push({stage:4,correct:corrected.correct,eligible:corrected.eligible,wrongLabelsCorrected:6});
 await finish();assert.equal((await read()).stage,5);const sealed=(await read()).models;
 await act("open-test");await page.locator(".wall").waitFor();
 await shot("04-封存后的展墙");
 let pending=0;
 while(await page.locator('.raised-hands:not(.editing) [data-action="place"][data-attribute="reserve"]').count()){
   await page.locator('.raised-hands:not(.editing) [data-action="place"][data-attribute="reserve"]').first().click();pending++;
   await page.waitForTimeout(150);await page.locator(".wall").waitFor();
 }
 assert.equal(Object.keys((await read()).wall).length,30);assert.deepEqual((await read()).models,sealed,"placing photos never trains");
 const downloadPromise=page.waitForEvent("download");await act("download-record");const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith(".json"));
 const imagePromise=page.waitForEvent("download");await act("download-wall");const image=await imagePromise;assert.ok(image.suggestedFilename().endsWith(".png"));
 await shot("05-完成分工的展墙");
 await note("学徒先分有把握的照片，拿不准的交给我复核；高把握的我也会抽查。");
 await operate(page,page.locator('.task-card [data-action="finish"]'));await page.locator('[data-action="next-lesson"]').click();await page.locator('dialog[data-kind="complete"]').waitFor();
 await shot("06-学徒学会了什么");
 assert.deepEqual((await read()).completed,[1,2,3,4,5]);
 results.push({stage:5,wall:30,manualReviews:pending,parametersFrozen:true});
 await close();const finished=await read();assert.ok(finished.observations["2"].includes("明暗失衡"));
 await page.reload();await page.locator("#lightbox-canvas").waitFor();assert.deepEqual((await read()).models,finished.models);assert.equal(Object.keys((await read()).wall).length,30);
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const summary={status:"passed",flow:"guided lesson zero and all five lessons by visible controls; no injected progress",results,glossary:finished.glossary.length,pageErrors:errors,resourceFailures:failures,saveRestored:true};
 fs.writeFileSync(`${output}/complete-save.json`,JSON.stringify(finished));
 fs.writeFileSync(`${output}/完整流程验证.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}catch(e){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:`${output}/full-flow-failure.png`});console.error(e);process.exitCode=1;}
finally {await browser.close();}
