import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreator} from '../project.ts';
import {startFlow,finishFlow} from '../flow.ts';
import {startingGraph,compareTrials,revisionInput} from '../../../lessons/13/src/studio-inquiry.ts';
import {scenarioConfig,compareDecisions} from '../../../lessons/12/src/field-inquiry.ts';
import {createDefaultConfig,runToCompletion} from '../../../lessons/12/src/engine/index.ts';

test('blank creation has a real input and leaves the next capability to the student',()=>{
  const g=startingGraph('blank');
  assert.equal(g.nodes.length,1);
  assert.equal(g.nodes[0].kind,'input');
  assert.equal(g.nodes[0].next,undefined);
});
test('revision keeps the old input and reports actual changes, without rewriting the old run',()=>{
  const p=createCreator();
  const a=finishFlow(p,startFlow(p,{sampleId:p.assets[0].id,question:'我想知道它能否使用'}));
  const old=JSON.stringify(a);
  const input=revisionInput(a);
  p.graph.nodes.find(n=>n.kind==='condition')!.threshold=.95;
  const b=finishFlow(p,startFlow(p,input));
  const result=compareTrials(a,b);
  assert.equal(result.sameInput,true);
  assert.ok(result.changes.includes('判断阈值'));
  assert.equal(JSON.stringify(a),old);
  const other=finishFlow(p,startFlow(p,{sampleId:p.assets[1].id,question:''}));
  assert.equal(compareTrials(a,other).sameInput,false);
});
test('field scenarios preserve the student workflow and run both decisions from identical conditions',()=>{
  const base=createDefaultConfig(),old=JSON.stringify(base);
  const c=scenarioConfig(base,'heatwave');
  assert.equal(c.faults.weatherShift,true);
  assert.deepEqual(c.workflow,base.workflow);
  assert.equal(JSON.stringify(base),old);
  const a=runToCompletion({...structuredClone(c),mode:'workflow'});
  const b=runToCompletion({...structuredClone(c),mode:'planner'});
  assert.equal(compareDecisions(a,b).sameConditions,true);
  b.config.limits.maxWaterMl--;
  assert.equal(compareDecisions(a,b).sameConditions,false);
});
