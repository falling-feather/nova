import {test} from "node:test";
import assert from "node:assert/strict";
import {createSession,teachPhoto,undoLearning,runInspection} from "../src/core/session.ts";
import type {AnalyzedPhoto} from "../src/core/types.ts";
import {goalsFor,overallProgress} from "../src/content/course.ts";
import {newOrientation,startPractice,advancePractice,decodeOrientation} from "../src/core/orientation.ts";
test("task quantities expose partial progress without claiming completion",()=>{
 const s=createSession();s.stage=2;s.active="quality";s.filtersSeen=["edges"];s.models.quality.steps=3;
 const goals=goalsFor(s,[]);
 assert.equal(goals[0].current,1);assert.equal(goals[0].total,2);
 assert.equal(goals[1].current,3);assert.equal(goals[1].total,8);assert.equal(goals[1].done,false);
 assert.equal(overallProgress(goals),22);
});
test("quality learning counts stay tied to the course even when viewing the green model",()=>{
 const s=createSession();s.stage=2;s.active="green";s.models.green.steps=20;s.models.quality.steps=2;
 s.inspections=[{stage:2,attribute:"green",box:0,correct:12,eligible:12,rows:[],modelStep:20}];
 const goals=goalsFor(s,[]);assert.equal(goals[1].current,2);assert.equal(goals[2].done,false);
});
test("practice starts from an independent model and never overwrites an existing main lesson",()=>{
 const main=createSession();main.stage=2;main.models.quality.steps=6;main.models.quality.bias=2;
 const snapshot=structuredClone(main),o=startPractice(newOrientation());
 o.practice!.models.green.bias=5;assert.deepEqual(main,snapshot);assert.equal(o.practice!.stage,1);
 assert.equal(o.step,0);assert.equal(o.status,"active");
});
test("focused practice advances only when its intended operation actually happened",()=>{
 const o=startPractice(newOrientation());
 assert.equal(advancePractice(o,{kind:"filter",value:"green"}),false);
 assert.equal(advancePractice(o,{kind:"photo",value:"t003"}),false);
 assert.equal(advancePractice(o,{kind:"photo",value:"t001"}),true);
 assert.equal(advancePractice(o,{kind:"filter",value:"red"}),false);
 assert.equal(advancePractice(o,{kind:"filter",value:"green"}),true);
 assert.equal(advancePractice(o,{kind:"review"}),true);
 assert.equal(advancePractice(o,{kind:"label",value:"0"}),false);
 assert.equal(advancePractice(o,{kind:"label",value:"1"}),true);
 assert.equal(advancePractice(o,{kind:"learned"}),true);
 assert.equal(o.step,5);
});
test("practice reload restores its own model and validates the saved step",()=>{
 const o=startPractice(newOrientation());o.step=5;o.practice!.models.green.bias=.75;
 const loaded=decodeOrientation(JSON.stringify(o));assert.equal(loaded.step,5);assert.equal(loaded.practice!.models.green.bias,.75);
 const invalid=decodeOrientation(JSON.stringify({...o,step:100}));assert.equal(invalid.status,"new");
});
test("a paused practice cannot advance due to ordinary main-course interactions",()=>{
 const o=startPractice(newOrientation());o.status="paused";
 assert.equal(advancePractice(o,{kind:"photo",value:"t001"}),false);assert.equal(o.step,0);
});
test("a previous inspection is historical after another update, even when undo and retraining reuse its step count",()=>{
 const s=createSession();s.stage=2;s.active="quality";
 const p:AnalyzedPhoto={id:"t001",name:"测试照片",atlas:"a",cell:0,role:"train",batch:1,flower:false,shape:.1,submittedFlip:[],features:[.2,.1,0,.8,.1,.1],truth:{flower:false,green:false,quality:true},submitted:{flower:false,green:false,quality:true}};
 teachPhoto(s,p,["quality"]);const photos=Array.from({length:12},(_,i)=>({...p,id:"v2a"+String(i+1).padStart(2,"0"),role:"test" as const,testStage:2,testBox:0}));
 runInspection(s,photos,"quality");assert.equal(goalsFor(s,[])[2].done,true);
 undoLearning(s);s.rate="heavy";teachPhoto(s,p,["quality"]);
 assert.equal(s.models.quality.steps,1);assert.equal(goalsFor(s,[])[2].done,false);
 assert.match(goalsFor(s,[])[2].detail,/重新检验/);
 runInspection(s,photos,"quality");assert.equal(goalsFor(s,[])[2].done,true);
});
