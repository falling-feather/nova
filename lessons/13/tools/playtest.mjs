import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateArtifact } from '../src/core.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'.work','scene-playtest');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});
const page=await context.newPage();const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.progressEvents=[];window.addEventListener('nova:progress',e=>window.progressEvents.push(e.detail));});
const base=process.env.NOVA_CAPSTONE_URL??'http://127.0.0.1:5373/';
const nav=async view=>page.locator(`[data-action="nav"][data-view="${view}"]`).click();
const action=async name=>page.locator(`[data-action="${name}"]`).first().click();
const edit=async(actionName,text)=>{await action(actionName);await page.locator('#editor-value').fill(text);await action('editor-save');};
const publish=async text=>{await action('publish');await edit('edit-purpose',text);await page.locator('#publish-form button:not([type="button"])').click();};
async function bounded(label){
 const result=await page.evaluate(()=>({document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],viewport:[innerWidth,innerHeight],overflows:Array.from(document.querySelectorAll('.panel,.stage-center,.scene-layout,.notice-card,.paged-copy,textarea,dialog[open]')).filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2);}).map(el=>el.className||el.id||el.tagName)}));
 checks.push({label,...result});assert.deepEqual(result.document,result.viewport,label+'页面溢出');assert.deepEqual(result.overflows,[],label+'内部内容溢出');
}
try{
 await page.goto(base);await action('skip-guide');assert.match(await page.locator('.activity-status').innerText(),/0\/6/);
 await page.locator('#draft-form button').click();assert.match(await page.locator('.result-panel .page-text').innerText(),/操场/);await bounded('初始问询台');
 await page.locator('[data-drag-doc]').dragTo(page.locator('[data-drop-archive]'));
 await page.locator('#draft-form button').click();assert.match(await page.locator('.result-panel .page-text').innerText(),/体育馆/);
 await action('archive-doc');await nav('brief');await action('confirm-brief');
 await page.locator('#compare-form button').click();await edit('edit-decision','用规则处理固定通知；资料不足或冲突时交给服务台。');
 await nav('studio');await publish('保留未核对日期和未展示来源的初版，交给同伴检验。');
 await nav('testing');await action('peer-mode');
 await page.locator('[name="operator"]').fill('同伴甲');await page.locator('[name="question"]').fill('开幕式在哪里？');await page.locator('[name="unseen"]').check();
 await page.locator('#test-question-form button:not([type="button"])').click();await page.locator('[name="terms"]').fill('体育馆，14:00');
 await page.locator('#test-expectation-form button:not([type="button"])').click();assert.match(await page.locator('.result-panel .page-text').innerText(),/操场/);
 await bounded('v1真实同伴结果');await edit('edit-note','收到旧通知，地点还是操场，而且没有来源可核对。');await action('verdict-failure');
 await action('exit-peer');await nav('studio');await action('toggle-latest');await action('toggle-sources');
 await page.locator('#draft-form button').click();assert.match(await page.locator('.result-panel .page-text').innerText(),/体育馆/);
 await bounded('工具改变实际回答');await page.screenshot({path:path.join(output,'core-1366.png')});
 await publish('依据同伴失败，核对同一事项最新日期并显示来源。');await nav('revision');
 await action('retest');assert.match(await page.locator('.result-panel .page-text').innerText(),/体育馆/);
 await action('peer-retest');await page.locator('#peer-retest-form [name="operator"]').fill('同伴甲');await page.locator('#peer-retest-form button').click();
 await edit('edit-note','同一问题现在返回体育馆，来源标签可以核对新通知。');await action('verdict-success');
 await page.reload();assert.equal(await page.locator('[data-action="nav"]').count(),1,'同伴刷新不能露出编辑区');
 await action('exit-peer');await nav('exhibit');await edit('edit-reflection','我依据旧通知造成的失败改了日期与来源；尚不能查询实时数据，需要人维护资料。');
 await page.locator('#exhibit-form button').click();assert.match(await page.locator('.result-panel .page-text').innerText(),/体育馆/);
 assert.match(await page.locator('.activity-status').innerText(),/6\/6/);
 await bounded('1366展览');await page.screenshot({path:path.join(output,'exhibit-1366.png')});
 for(const [width,height] of [[1366,768],[1440,900]]){
  await page.setViewportSize({width,height});
  for(const view of ['brief','method','studio','testing','revision','exhibit']){await nav(view);await bounded(`${width} ${view}有真实作品`);}
 }
 let download=page.waitForEvent('download');await action('export-project');const json=await download;const jsonPath=path.join(output,'project.json');await json.saveAs(jsonPath);
 const artifact=JSON.parse(await readFile(jsonPath,'utf8'));assert.equal(validateArtifact(artifact).ok,true);assert.equal(artifact.payload.releases.length,2);assert.equal(artifact.payload.runs.length,3);assert.equal(artifact.payload.runs[0].automaticPass,false);assert.equal(artifact.payload.runs[2].automaticPass,true);assert.equal(artifact.payload.runs[1].independence,'author');
 download=page.waitForEvent('download');await action('export-html');const html=await download;const htmlPath=path.join(output,'exhibit.html');await html.saveAs(htmlPath);
 await page.goto(pathToFileURL(htmlPath).href);await page.locator('#question').fill('开幕式在哪里？');await page.locator('#ask button').click();assert.match(await page.locator('#reply').innerText(),/体育馆/);
 await page.locator('#version').selectOption(artifact.payload.releases[0].id);await page.locator('#ask button').click();assert.match(await page.locator('#reply').innerText(),/操场/);
 assert.deepEqual(errors,[]);await writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors,versions:2,runs:3,offline:true},null,2),'utf8');process.stdout.write(JSON.stringify({checks:checks.length,errors,versions:2,runs:3,offline:true}));
}finally{await browser.close();}

