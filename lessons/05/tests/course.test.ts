import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../src/core/session.ts";
import { goalsFor, finishStage, oneAnswerOnly } from "../src/content/course.ts";
import { readFileSync } from "node:fs";
test("a weak inspection cannot unlock next lesson", () => {
  const s=createSession(); s.models.green.steps=10; s.filtersSeen=["green"]; s.reviewedIds=["t001","t002","t003","t004"];
  s.inspections.push({stage:1,attribute:"green",box:0,eligible:12,correct:9,rows:[],modelStep:10});
  assert.equal(goalsFor(s,[]).at(-1)?.done,false);
  assert.throws(()=>finishStage(s,[]),/任务/); assert.equal(s.unlocked,1);
});
test("ten of twelve fresh correct predictions unlock lesson two", () => {
  const s=createSession(); s.models.green.steps=10; s.filtersSeen=["green"]; s.reviewedIds=["t001","t002","t003","t004"];
  s.inspections.push({stage:1,attribute:"green",box:0,eligible:12,correct:10,rows:[],modelStep:10});
  finishStage(s,[]); assert.equal(s.unlocked,2); assert.deepEqual(s.completed,[1]);
});
test("small contaminated test remainder cannot pass as a valid full check", () => {
  const s=createSession(); s.models.green.steps=10; s.filtersSeen=["green"]; s.reviewedIds=["t001","t002","t003","t004"];
  s.inspections.push({stage:1,attribute:"green",box:0,eligible:2,correct:2,rows:[],modelStep:10});
  assert.equal(goalsFor(s,[]).at(-1)?.done,false);
});
test("the wrong-label goal needs every planted error corrected, not just looked at", () => {
  const base={name:"",atlas:"a",cell:0,role:"train" as const,batch:4,flower:false,shape:.1,features:[.1,0,.4,.5,.2,.1] as [number,number,number,number,number,number],truth:{flower:false,green:false,quality:true}};
  const photos=Array.from({length:6},(_,i)=>({...base,id:`t10${i}`,submittedFlip:["quality" as const],submitted:{flower:false,green:false,quality:false}}));
  const s=createSession(); s.stage=4; s.active="flower";
  s.reviewedIds=photos.map(p=>p.id);
  assert.equal(goalsFor(s,[],photos)[0].done,false,"reviewing alone does not fix the training labels");
  for(const p of photos.slice(0,5))s.edits[p.id]={quality:true};
  assert.equal(goalsFor(s,[],photos)[0].done,false);
  s.edits[photos[5].id]={quality:true};
  assert.equal(goalsFor(s,[],photos)[0].done,true);
});
test("check boxes hold both answers, so a model that always says yes scores about half", () => {
  const photos=(JSON.parse(readFileSync(new URL("../public/assets/photos/catalog.json",import.meta.url),"utf8")) as {photos:{id:string;role:string;testStage?:number;testBox?:number;flower:boolean}[]}).photos;
  for(const stage of [1,2,3,4])for(const box of [0,1]){
    const inBox=photos.filter(p=>p.role==="test"&&p.testStage===stage&&p.testBox===box);
    assert.equal(inBox.length,12,`stage ${stage} box ${box}`);
    if(stage>=3)assert.equal(inBox.filter(p=>p.flower).length,6,`stage ${stage} box ${box} flowers`);
  }
  // The first-time practice opens the first three photos of stage one box A: a green leaf and two that are not green.
  assert.deepEqual(photos.filter(p=>p.role==="test"&&p.testStage===1&&p.testBox===0).slice(0,3).map(p=>p.id),["v1a01","v1a02","v1a03"]);
});
test("lessons two and four need three quarters of the check box, not just an opened box", () => {
  const s=createSession(); s.stage=2; s.unlocked=2; s.active="quality"; s.models.quality.steps=8; s.filtersSeen=["edges","exposure"]; s.note="清楚不等于拍得好";
  s.inspections.push({stage:2,attribute:"quality",box:0,eligible:12,correct:6,rows:[],modelStep:8});
  const half=goalsFor(s,[])[2]; assert.equal(half.done,false); assert.match(half.detail,/目标至少 9 张/);
  s.inspections.push({stage:2,attribute:"quality",box:0,eligible:12,correct:9,rows:[],modelStep:8});
  assert.equal(goalsFor(s,[])[2].done,true);
  const four=createSession(); four.stage=4; four.unlocked=4; four.active="flower";
  four.inspections.push({stage:4,attribute:"flower",box:0,eligible:12,correct:8,rows:[],modelStep:0});
  assert.equal(goalsFor(four,[]).at(-1)?.done,false);
  four.inspections.push({stage:4,attribute:"flower",box:0,eligible:12,correct:9,rows:[],modelStep:0});
  assert.equal(goalsFor(four,[]).at(-1)?.done,true);
});
test("teaching only one answer is detected from what was actually taught", () => {
  const s=createSession(), receipt=(id:number,quality:boolean)=>({id,photoId:"t001",photoName:"",rate:1.5,targets:{quality},updates:[],before:s.models,reviewed:false});
  assert.equal(oneAnswerOnly(s,"quality"),null);
  s.receipts.push(receipt(1,true),receipt(2,true),receipt(3,true));
  assert.deepEqual(oneAnswerOnly(s,"quality"),{count:3,answer:true});
  assert.equal(oneAnswerOnly(s,"green"),null,"another judgment was never taught");
  s.receipts.push(receipt(4,false));
  assert.equal(oneAnswerOnly(s,"quality"),null);
});
