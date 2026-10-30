import {operate} from "./guidance-actions.mjs";
import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createSession,teachPhoto} from "../src/core/session.ts";
import {arrangeExhibition,modelStamp} from "../src/core/lifecycle.ts";
import {TEACHING} from "../src/content/teaching.ts";
const base=process.env.LIGHT_TEST_URL||"http://127.0.0.1:5205/";
const catalog=JSON.parse(fs.readFileSync("public/assets/photos/catalog.json","utf8")).photos;
const analyzed=p=>({...p,features:[.8,0,0,.5,.1,.1],truth:{flower:false,green:true,quality:true},submitted:{flower:false,green:true,quality:true}});
const browser=await chromium.launch({channel:"msedge",headless:true}),results=[];
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem("nova-light-apprentice-v1")));
async function fixture(state,motion="reduce"){
 state.intros=[1,2,3,4,5];
 state.education.seen=[1,2,3,4,5].flatMap(stage=>Object.keys(TEACHING).map(topic=>stage+":"+topic));
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:motion});
 await context.addInitScript(state=>{localStorage.setItem("nova-light-apprentice-v1",JSON.stringify(state));localStorage.setItem("nova-light-apprentice-orientation-v1",JSON.stringify({schema:1,status:"skipped",step:0,practice:null}));},state);
 const page=await context.newPage();page.setDefaultTimeout(10000);await page.goto(base);await page.locator("#lightbox-canvas").waitFor();return {context,page};
}
try {
 const depleted=createSession();for(const box of ["a","b"])for(let i=1;i<=3;i++)teachPhoto(depleted,analyzed(catalog.find(p=>p.id===`v1${box}${String(i).padStart(2,"0")}`)),["green"]);
 let {context,page}=await fixture(depleted);
 await page.locator('[data-action="open-test"]').click();await page.locator(".matrix").waitFor();assert.equal((await read(page)).inspections.at(-1).eligible,9);
 await page.locator(".sheet-close").click();await operate(page,page.locator('[data-action="settings"]'));await page.locator('[data-action="new-experiment"]').click();await page.locator('[data-action="confirm-new-experiment"]').click();await page.locator("#lightbox-canvas").waitFor();
 const fresh=await read(page);assert.equal(fresh.experiment,2);assert.equal(fresh.models.green.steps,0);assert.equal(fresh.contaminatedIds.length,0);
 const archive=await page.evaluate(()=>JSON.parse(localStorage.getItem("nova-light-apprentice-previous-experiment")));assert.equal(archive.contaminatedIds.length,6);await context.close();results.push("depleted inspection -> archived previous experiment -> fresh model workbench");
 const third=createSession();third.stage=3;third.unlocked=3;third.active="flower";third.selectedId="t049";
 ({context,page}=await fixture(third));await page.route("**/atlas-08.png",async route=>{await new Promise(r=>setTimeout(r,1200));await route.continue();});
 const response=page.waitForResponse(r=>r.url().endsWith("atlas-08.png"));await page.locator('[data-action="open-test"]').click();await page.locator(".sheet-loading").waitFor();await page.locator(".sheet-close").click();await page.locator('[data-stage="2"]').click();await page.locator('body[data-stage="2"]').waitFor();await response;await page.waitForTimeout(800);
 assert.equal((await read(page)).stage,2);assert.equal((await read(page)).inspections.length,0);assert.equal(await page.locator("dialog[open]").count(),0);await context.close();results.push("cancelled delayed inspection cannot write another lesson or reopen dialog");
 const fifth=createSession();fifth.stage=5;fifth.unlocked=5;fifth.locked=true;fifth.mode="exhibit";fifth.selectedId="e001";fifth.models.flower.bias=-10;fifth.models.green.bias=10;fifth.models.quality.bias=-10;
 arrangeExhibition(fifth,catalog.filter(p=>p.role==="exhibit").map(analyzed));fifth.wall.e001.by="student";
 ({context,page}=await fixture(fifth));if(await page.locator("dialog[open]").count())await page.locator(".sheet-close").click();await page.locator('[data-stage="4"]').click();await page.locator('body[data-stage="4"]').waitFor();await operate(page,page.locator('.drawer-photos [data-photo-id="t008"]'));await page.waitForFunction(()=>JSON.parse(localStorage.getItem("nova-light-apprentice-v1")).selectedId==="t008");await page.locator('[data-action="review"]').click();await operate(page,page.locator('[data-rate="heavy"]'));await operate(page,page.locator('[data-action="teach"]'));await page.locator('body[data-busy="false"]').waitFor();await page.locator('[data-stage="5"]').click();await page.locator(".wall").waitFor();
 const resealed=await read(page);assert.equal(resealed.wallVersion,modelStamp(resealed.models));assert.equal(resealed.wall.e001.by,"student");assert.ok(!resealed.wall.e002||resealed.wall.e002.attribute!=="green");await context.close();results.push("resealed current model refreshes automatic placements and retains manual choices");
 ({context,page}=await fixture(createSession(),"no-preference"));await operate(page,page.locator('[data-action="teach"]'));await page.locator('[data-action="guess-skip"]').click();await page.waitForFunction(()=>document.querySelector(".balance")?.getAnimations({subtree:true}).length>0);await page.locator('body[data-busy="false"]').waitFor();assert.equal((await read(page)).models.green.steps,1);await context.close();results.push("ordinary motion uses live beam, pan and trust marker animations");
 const summary={status:"passed",setup:"isolated test-save fixtures for boundary cases; full student journey is separately checked through visible controls",results};
 fs.writeFileSync("docs/边界流程验证.json",JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}catch(error){console.error(error);process.exitCode=1;}
finally{await browser.close();}
