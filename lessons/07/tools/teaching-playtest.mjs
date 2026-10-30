import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CORE_STATIONS, STATIONS } from "../src/content/lessons.ts";
import { newsClaims } from "../src/core/news.ts";
import {uiControls} from './ui-helpers.mjs';

const url = process.env.WORKSHOP_URL || "http://127.0.0.1:5267/";
const out = new URL("../.work/ui002/", import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [], checks = [], screens = [], failedResources=[];
page.setDefaultTimeout(20000);
page.on("pageerror", (error) => errors.push(error.message));
page.on("response",response=>{if(response.status()>=400)failedResources.push({path:new URL(response.url()).pathname,status:response.status()});});
await page.addInitScript(() => {
  window.__progressSummaries = [];
  window.addEventListener("nova:progress", (event) => window.__progressSummaries.push(event.detail));
});
const {cmd,click,field,reveal}=uiControls(page);
const close = async () => { if (await page.locator("#inspector").isVisible()) await click("close-inspector"); };
const stage = async (id) => { await page.locator(`#app[data-station="${id}"]`).waitFor(); };
const idle = () => page.locator("#busy").waitFor({ state: "hidden", timeout: 90000 });
const shot = async (name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: fileURLToPath(new URL(name + ".png", out)) });
  screens.push(name);
};
const next = async (id) => { await close(); await click("next"); await stage(id); };
const review = async (choice, observation) => {
  await close(); await click("review");
  assert.match(await page.locator("#modal").textContent(),/A · 实际记录/);
  assert.match(await page.locator("#modal").textContent(),/B · 实际记录/);
  await click("review-choice", String(choice));
  await field("review-observation",observation);
  await click("review-submit");
  if (await page.locator(".review-feedback").isVisible()) assert.equal(await page.locator(".review-feedback").textContent(), "");
};
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("nova-type-house-v1")));
const ready = () => page.locator('#app[data-ready="true"]').waitFor({ timeout: 90000 });
const fits = async (selector) => {
  const box = await page.locator(selector).boundingBox(), size = page.viewportSize();
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1, `${selector} stays inside the viewport`);
};
try {
  await page.goto(url); await ready();
  assert.equal((await page.evaluate(() => window.__progressSummaries)).length, 0, "blank welcome does not report completion");
  await click("resume"); await stage("01");
  await fits("#task-status");
  await shot("01-core-task-1440");
  const tile = page.locator('[data-hotspot="type0"]');
  const original = await page.locator('[data-field="sentence"]').inputValue();
  await tile.focus(); await page.keyboard.press("Space"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Escape");
  assert.equal(await page.locator('[data-field="sentence"]').inputValue(), original);
  await tile.focus(); await page.keyboard.press("Space"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  assert.notEqual(await page.locator('[data-field="sentence"]').inputValue(), original);
  await click("undo-move");
  assert.equal(await page.locator('[data-field="sentence"]').inputValue(), original);
  checks.push("keyboard move, Escape and undo");
  for (const text of ["鹦鹉学着大人说话。", "晨风中学的合唱团在礼堂表演了歌曲。"]) {
    await click("presets"); await click("use-sentence", text);
  }
  await click("inspect-compare"); await click("answer", "some");
  await review(1, "鹦鹉和校庆句的切分不同，字字的块取决于词表，并非所有块都等于完整词。");
  await next("06");
  for (const word of ["苹果", "手机"]) { await page.locator(`[data-hotspot="${word}"]`).click(); await close(); }
  await review(2, "苹果和手机的名牌长度一样，前四格数字不同；初始名牌仍不能确定这次苹果的意思。");
  await next("12");
  await click("context", "fruit"); await click("inspect-question");
  await fits("#inspector"); await shot("02-context-ab-1440");
  await click("answer", "diff");
  await review(0, "从拍照句换成吃苹果句，相同层的电子与水果参照读数改变；单条注意力不能证明完整原因。");
  checks.push("core contextual comparison freezes the actual A/B readings");
  await next("21");
  for (let i = 0; i < 3; i++) await click("best-token");
  await click("inspect-generation"); await click("answer", "recalculated");
  await next("22"); await click("best-token"); await click("inspect-causal"); await close();
  await click("inspect-question"); await click("answer", "no");
  await next("23");
  for (const which of ["low", "middle", "high"]) { await click("generate", which); await idle(); }
  await page.setViewportSize({ width: 1366, height: 768 });
  await shot("03-temperature-1366");
  await click("inspect-temperature"); await fits("#inspector");
  await click("temperature-choice", "middle");
  await field("temperature-reason", "我为校庆新闻选中温作起点；这三句实际输出仍须核对日期和地点，低温也不保证事实。");
  await close(); await next("24"); await idle();
  await click("inspect-source"); await close();
  const generated = await page.locator(".news-text .ai-writing").textContent();
  const claims = newsClaims(generated);
  assert.ok(claims.length >= 3, "the real model supplies at least three checkable claims");
  for (const claim of claims) {
    await click("inspect-fact", claim.key);
    await click("mark", `${claim.key}|${claim.correct ? "yes" : "no"}`);
    await close();
  }
  await next("25");
  await field("draft-headline", "从真实安排到一份特刊");
  await field("draft-opening", "本周六，晨风中学举行第六十届校庆，");
  await click("continue"); await idle();
  assert.ok((await page.locator('[data-field="draft-edited"]').inputValue()).length);
  await click("inspect-editor"); await fits("#inspector");
  await field("draft-edited", "合唱团在礼堂表演歌曲《晨风》。初二（三）班获得一等奖。", page.locator("#inspector"));
  assert.ok(Number.parseFloat(await page.locator('#inspector [data-field="draft-edited"]').evaluate((el) => getComputedStyle(el).fontSize)) >= 16);
  await shot("04a-flat-editor-1366"); await close();
  await shot("04-edited-paper-1366");
  await click("inspect-proof");
  for (const key of ["facts", "readability", "attribution"]) await click("proof", key);
  await click("publish");
  await review(2, "我依据校庆安排表，把AI续写改为合唱团在礼堂演出《晨风》，并保留AI文字署名。");
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot("05-published-1440");
  const downloadPromise = page.waitForEvent("download"); await click("export-issue");
  const download = await downloadPromise;
  const downloadPath = fileURLToPath(new URL("issue.html", out)); await download.saveAs(downloadPath);
  const html = await readFile(downloadPath, "utf8");
  assert.match(html, /合唱团在礼堂/); assert.match(html, /AI/);
  assert.match(html, /A · 实际记录/); assert.match(html, /本课核对来源/);
  await page.waitForTimeout(300);
  const progress = await saved();
  assert.equal(progress.finale, true);
  assert.deepEqual(Object.keys(progress.done).sort(), [...CORE_STATIONS]);
  assert.equal(progress.done["20"], undefined);
  assert.ok(progress.reviews.council.evidence.before.includes("小明用苹果"));
  assert.ok(progress.reviews.press.evidence.after.includes("歌曲《晨风》"));
  const summary = (await page.evaluate(() => window.__progressSummaries)).at(-1);
  assert.deepEqual(summary, { chapter: 7, completed: 8, total: 8, pathLabel: "核心路线", artifactCount: 1 });
  await page.reload(); await ready();
  assert.equal((await saved()).finale, true);
  checks.push("8 core activities reach a downloaded, attributed publication; save and summary survive reload");

  // A separate, synthetic legacy fixture; it never touches a personal learning store.
  await context.close();
  const legacyContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const legacy = { version: 1, view: "gallery", current: "09", done: Object.fromEntries(STATIONS.slice(0, 8).map((s) => [s.id, true])), notes: {}, introSeen: true, finale: false, settings: {}, reviews: {} };
  await legacyContext.addInitScript((value) => { if (!localStorage.getItem("nova-type-house-v1")) localStorage.setItem("nova-type-house-v1", JSON.stringify(value)); }, legacy);
  const old = await legacyContext.newPage();
  await old.goto(url); await old.locator('#app[data-ready="true"]').waitFor({ timeout: 90000 });
  assert.equal(await old.locator("#app").getAttribute("data-station"), "09");
  await old.locator('[data-cmd="fill"]').click();
  await old.waitForTimeout(300);
  const fill = await old.evaluate(() => JSON.parse(localStorage.getItem("nova-type-house-v1")).notes["09"].fill);
  assert.equal(fill.candidates[0].word, "小猫"); assert.ok(fill.candidates[0].probability > .99);
  assert.ok(fill.candidates.find((v) => v.word === "小狗").probability < .001);
  await old.screenshot({ path: fileURLToPath(new URL("06-fill-1366.png", out)) }); screens.push("06-fill-1366");
  const preserved = await old.evaluate(() => JSON.parse(localStorage.getItem("nova-type-house-v1")));
  for (const id of Object.keys(legacy.done)) assert.equal(preserved.done[id], true);
  assert.equal(preserved.route, "full");
  checks.push("legacy prefix remains complete; fill shows true winner plus unrenormalized comparisons and remainder");
  await legacyContext.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(failedResources.filter(r=>!(r.status===404&&['/platform/storage-contract.js','/platform/platform-client.js'].includes(r.path))),[]);
  await writeFile(new URL("result.json", out), JSON.stringify({ passed: true, checks, screens, errors,expectedGuestFallback:failedResources }, null, 2));
  console.log(JSON.stringify({ passed: true, checks: checks.length, screens: screens.length, errors }));
} catch (error) {
  if (!page.isClosed()) await shot("failure");
  await writeFile(new URL("result.json", out), JSON.stringify({ passed: false, checks, screens, errors, failure: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
