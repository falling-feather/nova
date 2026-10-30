import test from 'node:test';
import assert from 'node:assert/strict';
import {investigateColor,investigationData} from '../../../lessons/10/src/color-investigation.ts';
import {probeStep} from '../../../lessons/11/src/step-probe.ts';
import {beginModel} from '../project.ts';

test('colour transfer experiment holds shapes and capture seeds fixed and reveals the shortcut',()=>{
  const result=investigateColor('color');
  assert.equal(result.train.total,18);
  assert.equal(result.same.total,12);assert.equal(result.swap.total,12);
  assert.ok(result.same.accuracy>result.swap.accuracy+.4,'the paired-colour lesson should reveal a measurable transfer failure');
  const shape=investigateColor('shape');
  assert.ok(shape.swap.correct>result.swap.correct,'shape features should offer a useful comparison in this controlled case');
  for(const a of result.project.assets.filter(a=>a.id.startsWith('same-'))){
    const b=result.project.assets.find(b=>b.id===a.id.replace('same-','swap-'))!;
    assert.equal(a.origin.kind,'synthetic');assert.equal(b.origin.kind,'synthetic');
    if(a.origin.kind==='synthetic'&&b.origin.kind==='synthetic'){
      assert.equal(a.origin.group.seed,b.origin.group.seed);assert.equal(a.origin.index,b.origin.index);
    }
  }
});
test('learning-rate probes start from the same weights and never train the student draft',()=>{
  const p=investigationData(),job=beginModel(p,{featureMode:'color-shape',hidden:[4],activation:'tanh',seed:7,learningRate:.08,batchSize:18});
  const original=JSON.stringify(job.model),row=job.train[0];
  const zero=probeStep(job.model,row,0),small=probeStep(job.model,row,.01),large=probeStep(job.model,row,1);
  assert.equal(zero.before.loss,zero.after.loss);
  assert.equal(small.before.loss,large.before.loss);
  assert.equal(JSON.stringify(job.model),original);
  assert.notEqual(small.after.loss,large.after.loss);
});
