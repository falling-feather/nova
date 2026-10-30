import test from "node:test";
import assert from "node:assert/strict";
import { freshState, decodeState } from "../src/state.ts";
import { completedSteps, markComplete, stepIssues } from "../src/core/learning.ts";

test("自由探索可留下后段证据，旧连续完成字段保持原语义",()=>{
  const s=freshState();markComplete(s,11);
  assert.deepEqual(s.done,[]);assert.deepEqual(completedSteps(s),[11]);
  for(let i=1;i<=10;i++)markComplete(s,i);
  assert.deepEqual(s.done,Array.from({length:11},(_,i)=>i+1));
  assert.deepEqual(s.verified,[]);
  assert.equal(decodeState(JSON.stringify(s)).warning,undefined);
});

test("进入场景、翻页与点击次数不构成学习完成",()=>{
  const s=freshState();s.evidence["7"]={pages:[0,1,2]};s.evidence["8"]={i:5};
  assert.ok(stepIssues(s,7).length);assert.ok(stepIssues(s,8).length);
  s.evidence["8"]={i:1,explained:true};assert.deepEqual(stepIssues(s,8),[]);
});

test("对照需要真实同一起点结果，观察允许反例，不按解释字数判定",()=>{
  const s=freshState();s.evidence["14"]={timings:[{seed:23,steps:2,ms:123},{seed:23,steps:20,ms:250}],observation:2,reason:"更慢"};
  assert.deepEqual(stepIssues(s,14),[]);
  s.evidence["14"].timings=[{seed:23,steps:2,ms:123},{seed:24,steps:20,ms:250}];
  assert.ok(stepIssues(s,14).length);
});

test("已有完成不伪造新理解证据，新自由探索字段越界仍拒绝",()=>{
  const s=freshState();s.done=[1,2];
  const old=decodeState(JSON.stringify(s));assert.deepEqual(completedSteps(old.state),[1,2]);
  assert.equal(old.state.evidence["2"],undefined);
  for(const verified of [[2],[26],[3,3]])assert.ok(decodeState(JSON.stringify({...s,verified})).warning);
});
