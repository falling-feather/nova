import test from "node:test";
import assert from "node:assert/strict";
import { evidenceSummary, experimentPairs } from "../src/content/evidence.ts";
import { freshState } from "../src/state.ts";
import type { Experiment } from "../src/core/experiment.ts";

const classes=[{key:"fish",zh:"鱼"},{key:"bird",zh:"鸟"}];
test("旧观察进入同一手册，不伪补A/B或个人解释",()=>{
  const state=freshState();state.evidence["19"]={mixed:true,pair:[0,1],observation:2};
  const lines=evidenceSummary(state,19,classes);
  assert.ok(lines.some(s=>s.includes("旧版观察：暂时认不出")));
  assert.ok(!lines.some(s=>s.includes("已提交完整记录")));
  assert.deepEqual(experimentPairs(state,19),[]);
});

test("同一证据提供实际A/B、模型、用时、预测和反例解释",()=>{
  const state=freshState();state.album=[23,101].map((seed,i)=>({id:String(i),recipe:{seed,steps:20,w:3,cls:0},created:1,step:18,generation:{model:"sand-v1",ms:1200,computedAt:1}}));
  const e:Experiment={id:"e",created:1,variable:"seed",fixed:state.album[0].recipe,confirmed:true,prediction:"也许不同",runs:["0","1"],a:"0",b:"1",observation:1,conclusion:"两张都看不清，不能判断哪张更合适。",submittedAt:2};
  state.evidence["18"]={experiments:[e]};
  const lines=evidenceSummary(state,18,classes).join("\n");
  for(const expected of ["随机种子","23-鱼-3-20","101-鱼-3-20","sand-v1","1.20 秒","也许不同","证据不足","不能判断"] )assert.ok(lines.includes(expected),expected);
  assert.equal(experimentPairs(state,18).length,1);
});
