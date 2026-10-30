import {chromium} from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
import {newModel,learn,predict} from "../src/core/model.ts";
const browser=await chromium.launch({channel:"msedge",headless:true});
try{
 const page=await browser.newPage();await page.goto("http://127.0.0.1:5205/");await page.locator("#lightbox-canvas").waitFor();
 const photos=await page.evaluate(async()=>{const {PhotoLibrary}=await import("/src/render/photos.ts");const {loadCatalog}=await import("/src/content/catalog.ts");const lib=new PhotoLibrary(await loadCatalog());return Promise.all(lib.catalog.map(p=>lib.analyze(p)));});
 const roles=Object.fromEntries(["train","test","exhibit"].map(role=>[role,photos.filter(p=>p.role===role).length]));
 assert.deepEqual(roles,{train:120,test:120,exhibit:30});assert.equal(new Set(photos.map(p=>p.id)).size,270);
 assert.ok(photos.every(p=>p.features.every(v=>Number.isFinite(v)&&v>=0&&v<=1)));
 assert.equal(photos.filter(p=>p.submittedFlip.length).length,6);
 let model=newModel();for(const photo of photos.filter(p=>p.role==="train"&&p.batch===2))model=learn(model,photo.features,photo.submitted.flower,.5).after;
 const traps=["v3a02","v3a03","v3a12"].map(id=>{const p=photos.find(p=>p.id===id);return {id,name:p.name,referenceFlower:p.truth.flower,probabilityFlower:predict(model,p.features)};});
 assert.ok(traps[1].probabilityFlower>=.5,"red apple is a real learned shortcut on this sample route");
 const clouds=photos.filter(p=>p.name.includes("白云")).map(p=>({id:p.id,clarity:p.features[3],exposure:p.features[4],quality:p.truth.quality}));
 assert.ok(clouds.every(p=>p.clarity>=.22));
 const summary={status:"passed",source:"actual shared photo rectangles, live pixel extraction; model uses submitted labels",photos:270,roles,featureRanges:Array.from({length:6},(_,i)=>[Math.min(...photos.map(p=>p.features[i])),Math.max(...photos.map(p=>p.features[i]))]),trainingBatchCounts:[1,2,3,4].map(batch=>({batch,photos:photos.filter(p=>p.role==="train"&&p.batch===batch).length})),wrongSubmittedLabels:6,sharpWhiteClouds:clouds,flowerFirstPacketExample:{learningRate:.5,steps:model.steps,weights:model.weights,bias:model.bias,traps},doesNotClaimUniversalOutcome:true};
 fs.writeFileSync("docs/图库校验.json",JSON.stringify(summary,null,2));console.log(JSON.stringify({status:summary.status,roles,trapCheck:traps.map(p=>({id:p.id,p:+p.probabilityFlower.toFixed(3)}))}));
}finally{await browser.close();}
