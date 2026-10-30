import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultConfig,createRun,invokeManualTool,recordStatement,runToCompletion} from '../../../lessons/12/src/engine/index.ts';
import {feedbackEvidence} from '../../../lessons/12/src/feedback-evidence.ts';
import {createCreator,baseline} from '../project.ts';
import {capabilityFacts} from '../../../lessons/13/src/creator-capabilities.ts';

test('accepted blocked water and a statement cannot appear as executed or verified',()=>{
  const config=createDefaultConfig();config.faults.pumpBlocked=true;
  const run=createRun(config);recordStatement(run,'已经浇好水');
  assert.equal(feedbackEvidence(run).requested,false);
  invokeManualTool(run,{tool:'observe',requestId:'read-1'});
  invokeManualTool(run,{tool:'water',amount:20,requestId:'water-1'});
  const evidence=feedbackEvidence(run);
  assert.equal(evidence.requested,true);assert.equal(evidence.applied,false);assert.equal(evidence.verified,false);
  assert.equal(feedbackEvidence(runToCompletion(createDefaultConfig())).verified,true);
});

test('capability provenance follows a run snapshot even after current data or knowledge changes',()=>{
  const p=createCreator();const m=baseline(p,'color');
  const snapshot={graph:structuredClone(p.graph),modelId:m.id,knowledge:structuredClone(p.knowledge),workflow:null};
  const revision=m.dataset.revision;p.dataset.revision+=7;p.knowledge=[];
  const facts=capabilityFacts(p,snapshot);
  assert.match(facts.find(f=>f.kind==='model')!.detail,new RegExp('资料v'+revision));
  assert.equal(facts.find(f=>f.kind==='knowledge')!.value,`${snapshot.knowledge.length} 条编辑资料`);
  assert.notEqual(capabilityFacts(p,null).find(f=>f.kind==='knowledge')!.value,facts.find(f=>f.kind==='knowledge')!.value);
});
