import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreator,baseline} from '../project.ts';
import {startFlow,finishFlow} from '../flow.ts';
import {startingGraph} from '../../../lessons/13/src/studio-inquiry.ts';
import {designNextStep} from '../../../lessons/13/src/design-coach.ts';
import {capabilityFacts} from '../../../lessons/13/src/creator-capabilities.ts';
import {toolFeedback} from '../../../lessons/12/src/tool-feedback.ts';
import {createDefaultConfig,createRun,invokeManualTool} from '../../../lessons/12/src/engine/index.ts';
import {exportArtifact} from '../../../lessons/12/src/engine/artifact.ts';
import {recordStatement} from '../../../lessons/12/src/engine/runner.ts';

test('a blank creation gets capability guidance rather than a completion claim',()=>{
  const p=createCreator();p.evidence.briefConfirmed=1;p.graph=startingGraph('blank');
  assert.equal(designNextStep(p).kind,'choose');
  assert.equal(p.evidence.graphEdits,0);
});
test('a loose capability is not reported as part of the execution path',()=>{
  const p=createCreator();p.evidence.briefConfirmed=1;
  p.graph.nodes.push({id:'loose-tool',kind:'workflow',label:'尚未接入的工具',x:50,y:50});
  assert.equal(capabilityFacts(p,null).find(f=>f.kind==='workflow')!.used,false);
  assert.equal(designNextStep(p).kind,'connect');
});
test('the coach distinguishes missing model, untried design and a result needing reflection',()=>{
  const p=createCreator();p.evidence.briefConfirmed=1;
  assert.equal(designNextStep(p).kind,'train');
  baseline(p,'shape');assert.equal(designNextStep(p).kind,'trial');
  const r=finishFlow(p,startFlow(p,{sampleId:p.assets[0].id,question:''}));p.runs.push(r);
  assert.equal(designNextStep(p).kind,'review');
  p.graph.nodes[0].x+=200;
  assert.equal(designNextStep(p).kind,'review','moving a node does not invalidate a real trial');
  p.graph.nodes.find(n=>n.kind==='condition')!.threshold=1;
  assert.equal(designNextStep(p).kind,'trial','a changed decision needs a new trial');
});
test('a reported problem leads back to revision, without claiming that a human exit is a failure',()=>{
  const p=createCreator();p.evidence.briefConfirmed=1;baseline(p,'shape');
  p.graph.nodes.find(n=>n.kind==='condition')!.threshold=1;
  const r=finishFlow(p,startFlow(p,{sampleId:p.assets[0].id,question:''}));p.runs.push(r);
  assert.equal(r.status,'human');assert.equal(designNextStep(p).kind,'review');
  r.verdict='fail';r.reviewNote='这个清楚的样本也被转交人工，需要重新衡量阈值。';
  assert.equal(designNextStep(p).kind,'revise');
});
test('physical feedback reports actual effects and never invents flow for a blocked pipe',()=>{
  const config=createDefaultConfig();config.faults.pumpBlocked=true;
  const run=createRun(config);invokeManualTool(run,{tool:'water',amount:20,requestId:'blocked'});
  const blocked=toolFeedback(run)!;assert.equal(blocked.applied,false);assert.match(blocked.lines.join(' '),/0 mL/);
  const good=createRun(createDefaultConfig());invokeManualTool(good,{tool:'water',amount:20,requestId:'good'});
  assert.deepEqual(toolFeedback(good)!.lines,['湿度 25% → 35%','水箱 120 → 100 mL']);
  invokeManualTool(good,{tool:'observe',requestId:'observe'});
  assert.equal(toolFeedback(good)!.kind,'observation');
});

test('an action-only design offers its environment controls instead of an image challenge',()=>{
  const p=createCreator();p.evidence.briefConfirmed=1;p.graph=startingGraph('workflow');
  p.workflow=exportArtifact(createDefaultConfig(),[],{prediction:'',explanation:'',revision:''});
  const step=designNextStep(p);
  assert.equal(step.kind,'trial');
  assert.equal(step.actions.some(a=>a.value==='challenge-new'),false);
  assert.equal(step.actions.some(a=>a.value==='preview'),true);
});

test('a statement has visible feedback and never reuses an earlier watering effect',()=>{
  const run=createRun(createDefaultConfig());
  invokeManualTool(run,{tool:'water',amount:20,requestId:'before-statement'});
  const before=structuredClone(run.environment.world);
  recordStatement(run,'已经浇水完成');
  assert.deepEqual(run.environment.world,before);
  assert.equal(toolFeedback(run)!.kind,'statement');
  assert.equal(toolFeedback(run)!.applied,false);
  run.logs.at(-1)!.summary='判断湿度 → 是，沿预先连接的路径继续。';
  assert.equal(toolFeedback(run)!.kind,'action');
});
