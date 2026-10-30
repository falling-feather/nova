import {test} from "node:test";
import assert from "node:assert/strict";
import {createSession,teachPhoto} from "../src/core/session.ts";
import {decodeSession} from "../src/core/storage.ts";
import {topicForAction,needsPreparation,acknowledgePreparation,teachingEvidence} from "../src/content/teaching.ts";
import type {AnalyzedPhoto} from "../src/core/types.ts";
const photo:AnalyzedPhoto={id:"t001",name:"绿叶",atlas:"a",cell:0,role:"train",batch:1,flower:false,shape:.1,submittedFlip:[],features:[.8,0,0,.5,.1,.1],truth:{flower:false,green:true,quality:true},submitted:{flower:false,green:false,quality:true}};
test("lesson-specific teaching precedes an action and repeats stay optional",()=>{
 const s=createSession();const before=structuredClone(s.models);
 assert.equal(topicForAction("teach",undefined,s),"training");assert.equal(needsPreparation(s,"training"),true);
 acknowledgePreparation(s,"training");assert.equal(needsPreparation(s,"training"),false);assert.deepEqual(s.models,before);
 s.stage=2;assert.equal(needsPreparation(s,"training"),false);assert.equal(topicForAction("","edges",s),"quality");
 assert.equal(needsPreparation(s,"quality"),true);
 s.stage=3;assert.equal(needsPreparation(s,"training"),false);assert.equal(needsPreparation(s,"bias"),true);
});
test("post-learning explanation follows the label actually used, including a wrong one",()=>{
 const s=createSession(),r=teachPhoto(s,photo,["green"]);const explanation=teachingEvidence("training",s,photo,r);
 assert.ok(explanation.includes("“不是”"));assert.ok(explanation.includes("50%"));assert.ok(r.updates[0].afterProbability<.5);
 assert.ok(!explanation.includes("正确答案是"));
});
test("older students keep their lesson and parameters when teaching fields are added",()=>{
 const s=createSession();s.stage=2;s.unlocked=2;s.models.green.bias=1.25;
 delete (s as unknown as Record<string,unknown>).education;
 const loaded=decodeSession(JSON.stringify(s));assert.equal(loaded.warning,"");assert.equal(loaded.state.stage,2);assert.equal(loaded.state.models.green.bias,1.25);assert.deepEqual(loaded.state.education.seen,[]);
});
