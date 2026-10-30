import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'.work','cross-check');await mkdir(output,{recursive:true});
const classifierPath=process.env.NOVA_CHAPTER10_MODEL??path.resolve(root,'../10/src/model.ts');
const workflowPath=process.env.NOVA_CHAPTER12_ENGINE??path.resolve(root,'../12/src/engine/index.ts');
const [data,model,engine,samples]=await Promise.all([import(pathToFileURL(path.join(path.dirname(classifierPath),'project.ts')).href),import(pathToFileURL(classifierPath).href),import(pathToFileURL(workflowPath).href),import(pathToFileURL(path.join(path.dirname(classifierPath),'samples.ts')).href)]);
const p=data.createProject();p.mission.confirmed=true;data.confirmSplit(p);data.trainVersion(p);const classifierArtifact=data.exportArtifact(p);
const config=engine.createDefaultConfig();const workflowArtifact=engine.exportArtifact(config,[],{prediction:'按原环境复验',explanation:'',revision:''});
const original=engine.runToCompletion(config),blocked=engine.runToCompletion({...config,faults:{...config.faults,pumpBlocked:true}});
const browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});const page=await context.newPage(),errors=[],predictions=[];page.on('pageerror',error=>errors.push(error.message));
const action=async name=>page.locator(`[data-action="${name}"]`).first().click();
const upload=async(name,value)=>page.locator('#import-file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
async function bounded(label){const over=await page.evaluate(()=>({body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],viewport:[innerWidth,innerHeight],panels:Array.from(document.querySelectorAll('.panel,.scene-layout,textarea')).filter(e=>e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2).map(e=>e.className)}));assert.deepEqual(over.body,over.viewport,label);assert.deepEqual(over.panels,[],label);}
try{
 await page.goto(process.env.NOVA_CAPSTONE_URL??'http://127.0.0.1:5373/');await action('skip-guide');
 await upload('温室成果.json',workflowArtifact);await action('run-foreign');assert.match(await page.locator('.result-panel .pill').innerText(),/环境达标/);await bounded('原温室');
 await page.locator('#foreign-pump').check();await action('run-foreign');assert.match(await page.locator('.result-panel .pill').innerText(),/停止求助/);
 for(let i=1;i<blocked.logs.length;i++)await action('log-next');
 await bounded('水泵故障');await page.screenshot({path:path.join(output,'workflow-1366.png')});
 let download=page.waitForEvent('download');await action('export-foreign');const receipt=await download;const receiptPath=path.join(output,'workflow.json');await receipt.saveAs(receiptPath);const verification=JSON.parse(await readFile(receiptPath,'utf8')).verification;
 assert.equal(verification.status,blocked.status);assert.equal(verification.calls,blocked.calls);assert.equal(verification.waterUsedMl,blocked.waterUsedMl);assert.deepEqual(verification.logs.map(l=>l.world),blocked.logs.map(l=>l.world));
 await upload('分类成果.json',classifierArtifact);
 for(const sample of classifierArtifact.payload.demoSamples){await page.locator('#classifier-sample').selectOption(sample.id);await action('run-classifier');const expected=model.predict(classifierArtifact.payload.model,sample.image);assert.equal(await page.locator('.result-panel .pill').innerText(),samples.CLASS_NAMES[expected.label]??expected.label);predictions.push({sample:sample.id,reference:sample.label,prediction:expected.label,confidence:expected.confidence});}
 const png=await page.locator('#classifier-preview').evaluate(canvas=>canvas.toDataURL('image/png').split(',')[1]);await page.locator('#classifier-image').setInputFiles({name:'新输入.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.locator('#classifier-expected').selectOption('outside');await action('run-classifier');assert.match(await page.locator('.result-panel').innerText(),/范围外/);await bounded('分类器范围外');await page.screenshot({path:path.join(output,'classifier-1366.png')});
 download=page.waitForEvent('download');await action('export-classifier');const resultFile=await download;const resultPath=path.join(output,'classifier.json');await resultFile.saveAs(resultPath);const classified=JSON.parse(await readFile(resultPath,'utf8'));const actual=model.predict(classifierArtifact.payload.model,classified.verification.image);assert.equal(classified.verification.label,actual.label);assert.equal(classified.verification.confidence,actual.confidence);
 await page.setViewportSize({width:1440,height:900});await bounded('1440分类器');await upload('温室成果.json',workflowArtifact);await action('run-foreign');await bounded('1440温室');
 const bad=structuredClone(classifierArtifact);bad.payload.model.weights[0][0]=null;await upload('坏模型.json',bad);assert.match(await page.locator('#message').innerText(),/无效|错误|有效|权重|模型|数值/);
 let qaArtifactAccepted=false;if(process.env.NOVA_QA_CLASSIFIER){const qa=JSON.parse(await readFile(process.env.NOVA_QA_CLASSIFIER,'utf8'));data.importArtifact(JSON.stringify(qa));await upload('QA真实v2.json',qa);await page.locator('#classifier-preview').waitFor();await action('run-classifier');const sample=qa.payload.demoSamples[0],expected=model.predict(qa.payload.model,sample.image);assert.equal(await page.locator('.result-panel .pill').innerText(),samples.CLASS_NAMES[expected.label]??expected.label);qaArtifactAccepted=true;}assert.deepEqual(errors,[]);const summary={workflow:{original:{status:original.status,calls:original.calls},blocked:{status:blocked.status,calls:blocked.calls,water:blocked.waterUsedMl}},predictions,newImage:true,badRejected:true,qaArtifactAccepted,errors};await writeFile(path.join(output,'summary.json'),JSON.stringify(summary,null,2),'utf8');process.stdout.write(JSON.stringify(summary));
}finally{await browser.close();}


