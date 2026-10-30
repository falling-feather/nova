import test from "node:test";
import assert from "node:assert/strict";
import { freshState, decodeState, bytesToBase64 } from "../src/state.ts";
import type { Experiment } from "../src/core/experiment.ts";

test("旧版有效进度保留画、作品和顺序，不要求新增设置字段", () => {
  const state = freshState();
  state.current = 3; state.done = [1, 2];
  state.drawing = bytesToBase64(new Uint8Array(1024)); state.drawingFrom = "hand";
  state.album = [{ id: "a", recipe: { seed: 7, cls: 0, steps: 20, w: 3 }, step: 16, created: 10 }];
  state.program = ["a"];
  const result = decodeState(JSON.stringify(state));
  assert.equal(result.warning, undefined);
  assert.deepEqual(result.state.album, state.album);
  assert.equal(result.state.drawing, state.drawing);
  assert.deepEqual(result.state.done, [1, 2]);
});

test("损坏的存档保留原文，不能被自动保存的新记录覆盖", () => {
  const raw = '{"version":1,"done":[],"current":1,"album":null}';
  const result = decodeState(raw);
  assert.ok(result.warning);
  assert.equal(result.rejectedRaw, raw);
  assert.deepEqual(result.state, freshState());
});

test("拒绝越界进度、错误图片、无效配方和悬空节目项", () => {
  for (const change of [
    { current: 99 }, { done: [1, 26] }, { done: [1, 3] },
    { drawing: bytesToBase64(new Uint8Array(4)), drawingFrom: "hand" },
    { album: [{ id: "x", recipe: { seed: 7, cls: 99, steps: 20, w: 3 }, step: 16, created: 1 }] },
    { program: ["missing"] }, { evidence: { "2": [] } },
    { evidence: { "13": { seeds: "wrong" } } },
    { evidence: { "10": { scores: { light: null } } } },
    { evidence: { "23": { labeled: [99] } } },
  ]) {
    const raw = JSON.stringify({ ...freshState(), ...change });
    assert.equal(decodeState(raw).rejectedRaw, raw);
  }
});

test("空记录和完成全章的记录均可恢复", () => {
  assert.deepEqual(decodeState(null).state, freshState());
  const state = freshState(); state.done = Array.from({ length: 25 }, (_, i) => i + 1); state.current = 25;
  assert.equal(decodeState(JSON.stringify(state)).warning, undefined);
});

test("新版的预览、实测记录和展演断点可恢复", () => {
  const state=freshState(),preview=bytesToBase64(new Uint8Array(1024));
  state.album=[{id:"a",recipe:{seed:23,steps:20,w:3,cls:0},step:16,created:1,preview}];
  state.program=["a"];state.programTitle="海边的一天";state.creditText="感谢数据贡献者";
  state.evidence={"14":{timings:[{steps:20,ms:1234.5,seed:23}]},"20":{attempts:[{target:0,recipe:state.album[0].recipe,preview,same:true,similarity:100}]},"25":{index:0,frame:19,viewed:["a"],watched:false}};
  assert.deepEqual(decodeState(JSON.stringify(state)).state,state);
});

test("不让损坏的实验记录或播放断点进入交互页面",()=>{
  for(const evidence of [
    {"20":{attempts:"wrong"}}, {"20":{attempts:[{target:9,recipe:null}]}},
    {"14":{timings:[{steps:20,ms:-1,seed:23}]}}, {"14":{timings:{}}},
    {"25":{index:7}}, {"25":{frame:-1}}, {"25":{viewed:[1]}},
    {"23":{fileInfo:{Method:{}}}}, {"5":{manualImage:"broken"}},
    {"24":{sourceReviewed:"yes"}},
  ]){
    const raw=JSON.stringify({...freshState(),evidence});assert.equal(decodeState(raw).rejectedRaw,raw);
  }
});

test("实验卡与首次运算元数据可往返；旧完成记录不伪补理解证据",()=>{
  const state=freshState();state.done=Array.from({length:19},(_,i)=>i+1);state.current=19;
  state.evidence={"17":{swept:true},"19":{mixed:true,observation:2,pair:[0,1]}};
  const old=decodeState(JSON.stringify(state));assert.deepEqual(old.state,state);
  assert.equal(old.state.evidence["17"].experiments,undefined);
  state.album=[{id:"a",recipe:{seed:23,steps:20,w:3,cls:0},step:18,created:1,generation:{model:"v1",ms:100,computedAt:1}}];
  const e:Experiment={id:"e",created:1,variable:"seed",fixed:state.album[0].recipe,confirmed:true,prediction:"先预测",runs:["a"],a:"a",conclusion:"尚待生成另一幅"};
  state.evidence["18"]={experiments:[e]};
  assert.deepEqual(decodeState(JSON.stringify(state)).state,state);
  for(const invalid of [{...e,runs:["missing"]},{...e,a:"missing"},{...e,variable:"quality"},{...e,observation:9},{...e,fixed:{...e.fixed,steps:-1}},{...e,submittedAt:2}]){
    const raw=JSON.stringify({...state,evidence:{"18":{experiments:[invalid]}}});assert.equal(decodeState(raw).rejectedRaw,raw);
  }
});
