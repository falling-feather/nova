import { chromium } from "playwright";
import assert from "node:assert/strict";
import {operate,completePractice} from "./guidance-actions.mjs";
const browser=await chromium.launch({channel:"msedge",headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:"reduce"});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(process.env.LIGHT_TEST_URL||"http://127.0.0.1:5205/");
 await page.locator("#lightbox-canvas").waitFor({timeout:30000});
 await completePractice(page);
 await page.locator('dialog[data-kind="intro"]').waitFor();await page.locator(".sheet-close").click();
 await operate(page,page.locator('[data-filter="green"]'));
 await operate(page,page.locator('[data-action="review"]'));
 await page.locator(".label-card .stamp").waitFor();
 await operate(page,page.locator('[data-action="teach"]'));
 await page.locator('[data-model-steps="1"]').waitFor();
 await page.locator('[data-action="undo"]').click();
 await page.locator('[data-model-steps="0"]').waitFor();
 await operate(page,page.locator('[data-action="open-test"]'));
 await page.locator(".matrix").waitFor();
 assert.equal(await page.locator(".matrix [data-photo-id]").count(),12);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({flow:"guided lesson zero -> preparation -> filter -> review -> learn -> undo -> inspection",errors}));
}finally{await browser.close();}
