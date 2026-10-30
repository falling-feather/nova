import {test} from "node:test";
import assert from "node:assert/strict";
import {createSession,teachPhoto} from "../src/core/session.ts";
import {restartExperiment,inspectionRequest,commitInspection,arrangeExhibition} from "../src/core/lifecycle.ts";
import type {AnalyzedPhoto} from "../src/core/types.ts";
const photo:AnalyzedPhoto={id:"v3a01",name:"绿叶",atlas:"a",cell:0,role:"test",batch:0,testStage:3,testBox:0,flower:false,shape:.1,submittedFlip:[],features:[1,0,0,.8,.1,.1],truth:{flower:false,green:true,quality:true},submitted:{flower:false,green:true,quality:true}};
test("a new experiment uses new models without erasing the previous contaminated record",()=>{
 const old=createSession();teachPhoto(old,photo,["green"]);const snapshot=structuredClone(old);
 const next=restartExperiment(old);
 assert.equal(next.experiment,old.experiment+1);assert.deepEqual(next.contaminatedIds,[]);assert.equal(next.models.green.steps,0);assert.deepEqual(old,snapshot);
});
test("a delayed inspection from another lesson cannot create a record",()=>{
 const s=createSession();s.stage=3;s.active="flower";const request=inspectionRequest(s,0);
 s.stage=2;s.active="quality";
 assert.equal(commitInspection(s,request,[photo]),null);assert.equal(s.inspections.length,0);
});
test("a delayed inspection cannot use a different model after learning or undo",()=>{
 const s=createSession();s.stage=3;s.active="flower";const request=inspectionRequest(s,0);
 teachPhoto(s,photo,["flower"]);
 assert.equal(commitInspection(s,request,[photo]),null);
});
test("a current inspection uses its captured attribute and rejects another box's data",()=>{
 const s=createSession();s.stage=3;s.active="flower";const request=inspectionRequest(s,0);
 const run=commitInspection(s,request,[photo]);assert.equal(run?.attribute,"flower");assert.equal(run?.stage,3);
 assert.throws(()=>commitInspection(s,request,[{...photo,testBox:1}]),/检验材料/);
});
test("resealing recalculates automatic decisions and preserves human choices",()=>{
 const s=createSession();s.stage=5;s.locked=true;s.models.flower.bias=-10;s.models.green.bias=10;s.models.quality.bias=-10;
 const a={...photo,id:"e001",role:"exhibit" as const},b={...photo,id:"e002",role:"exhibit" as const};
 arrangeExhibition(s,[a,b]);assert.equal(s.wall.e001.attribute,"green");
 s.wall.e002.by="student";s.models.green.bias=-10;s.models.quality.bias=10;
 arrangeExhibition(s,[a,b]);
 assert.equal(s.wall.e001.attribute,"quality");assert.equal(s.wall.e002.attribute,"green");assert.equal(s.wall.e002.by,"student");assert.ok(s.wall.e002.probability<.001);
});
test("resealing a now uncertain automatic photograph returns it for human review",()=>{
 const s=createSession();s.stage=5;s.locked=true;s.models.flower.bias=-10;s.models.green.bias=10;s.models.quality.bias=-10;
 const a={...photo,id:"e001",role:"exhibit" as const};
 arrangeExhibition(s,[a]);s.models.green.bias=0;
  assert.equal(arrangeExhibition(s,[a]).length,1);assert.equal(s.wall.e001,undefined);
});
test("exhibition zones apply an explicit priority instead of comparing unrelated attribute probabilities",()=>{
 const s=createSession();s.stage=5;s.locked=true;s.models.flower.bias=7;s.models.green.bias=10;s.models.quality.bias=12;
 arrangeExhibition(s,[{...photo,id:"e001",role:"exhibit"}]);
 assert.equal(s.wall.e001.attribute,"flower");
});
