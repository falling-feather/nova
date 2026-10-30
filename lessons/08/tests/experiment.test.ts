import test from "node:test";
import assert from "node:assert/strict";
import { controlledPair, experimentIssues, type Experiment } from "../src/core/experiment.ts";
import type { Work } from "../src/state.ts";

const work = (id:string, seed:number, cls=0, w=3, steps=20):Work => ({ id, recipe:{seed,cls,w,steps}, step:18, created:1, preview:Buffer.alloc(1024).toString('base64'), generation:{model:"test-model",ms:120,computedAt:1} });
const card = ():Experiment => ({ id:"study", created:1, variable:"seed", fixed:{seed:23,cls:0,w:3,steps:20}, confirmed:true, prediction:"起点不同，轮廓也许不同。", runs:["a","b"], a:"a", b:"b", conclusion:"A与B的轮廓不同，但都不完全像题目。", observation:2 });

test("批量生成和旧观察不能单独完成实验，必须选择真实A/B并解释",()=>{
  const works=[work("a",23),work("b",101)],e=card();
  assert.deepEqual(experimentIssues(e,works),[]);
  assert.ok(experimentIssues({...e,a:undefined},works).length);
  assert.ok(experimentIssues({...e,conclusion:""},works).length);
  assert.ok(experimentIssues({...e,confirmed:false},works).length);
  assert.ok(experimentIssues({...e,observation:undefined},works).length);
  assert.ok(experimentIssues(e,[works[0],{...works[1],preview:undefined}]).length);
});

test("只允许已运行、不同变量值、固定条件相同的A/B",()=>{
  const e=card(),a=work("a",23),b=work("b",101);
  assert.equal(controlledPair(e,a,b),true);
  assert.equal(controlledPair(e,a,a),false);
  assert.equal(controlledPair(e,a,work("b",101,2)),false);
  assert.equal(controlledPair(e,a,work("b",101,0,3,10)),false);
  assert.ok(experimentIssues(e,[a,{...b,generation:undefined}]).length);
  assert.ok(experimentIssues({...e,runs:["a"]},[a,b]).length);
});

test("混合比例的两个端点按同一条件对处理，不能把换两种题目当混合实验",()=>{
  const e:Experiment={...card(),variable:"ratio",fixed:{seed:23,steps:20,w:3,cls:0,mix:{cls:1,ratio:.5}}};
  const a=work("a",23,0),b=work("b",23,1);
  assert.equal(controlledPair(e,a,b),true);
  assert.equal(controlledPair(e,a,work("b",23,2)),false);
  assert.equal(controlledPair(e,{...a,recipe:{...a.recipe,mix:{cls:1,ratio:.3}}},{...b,recipe:{...b.recipe,cls:0,mix:{cls:1,ratio:.7}}}),true);
});

test("力度为0仍可作为固定题目的无引导对照；实验允许无差异和反例",()=>{
  const e:Experiment={...card(),variable:"guidance",observation:1,conclusion:"这两幅结果变化不明显，暂时不能支持我的预测。"};
  assert.equal(controlledPair(e,work("a",23,0,0),work("b",23,0,7)),true);
  assert.equal(controlledPair(e,work("a",23,0,0),work("b",23,1,7)),false);
  assert.deepEqual(experimentIssues(e,[work("a",23,0,0),work("b",23,0,7)]),[]);
});

test("不同模型的生成不能作为同一次控制变量实验",()=>{
  const e=card(),a=work("a",23),b={...work("b",101),generation:{model:"other",ms:100,computedAt:1}};
  assert.equal(controlledPair(e,a,b),false);
});

test("实际A/B及观察完整时，简短解释不因字数被拒绝",()=>{
  const e={...card(),conclusion:"不符",observation:2};
  assert.deepEqual(experimentIssues(e,[work("a",23),work("b",101)]),[]);
});

test("自主研究题目或步数时仍只接受相应的单变量变化",()=>{
  const e=card(),a=work("a",23);
  assert.equal(controlledPair({...e,variable:"topic"},a,work("b",23,1)),true);
  assert.equal(controlledPair({...e,variable:"topic"},a,work("b",101,1)),false);
  assert.equal(controlledPair({...e,variable:"steps"},a,work("b",23,0,3,50)),true);
  assert.equal(controlledPair({...e,variable:"steps"},a,work("b",23,0,7,50)),false);
});

test("无类别的力度变化和零引导的混合变化不能冒充有效操纵",()=>{
  const e:Experiment={...card(),variable:"guidance",fixed:{seed:23,steps:20,w:0,cls:-1}};
  assert.equal(controlledPair(e,work("a",23,-1,0),work("b",23,-1,7)),false);
  const mixed:Experiment={...card(),variable:"ratio",fixed:{seed:23,steps:20,w:0,cls:0,mix:{cls:1,ratio:.5}}};
  assert.equal(controlledPair(mixed,work("a",23,0,0),work("b",23,1,0)),false);
});
