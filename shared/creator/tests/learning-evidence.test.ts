import test from 'node:test';
import assert from 'node:assert/strict';
import {createDense,denseGradients,applyGradient} from '../model.ts';
import {readSample,explainUpdate} from '../../../lessons/11/src/learning-evidence.ts';

test('one-step explanation reports the actual gradient, parameter change and two losses',()=>{
  const before=createDense(2,[{id:'a',name:'A'},{id:'b',name:'B'}],[2],'tanh',7,.05,1);
  const row={id:'sample-1',x:[.3,-.6],label:1},gradient=denseGradients(before,[row]),after=structuredClone(before);
  applyGradient(after,gradient);
  const evidence=explainUpdate(before,after,row,gradient,[0,0]);
  assert.equal(evidence.sampleId,row.id);
  assert.equal(evidence.beforeLoss,readSample(before,row).loss);
  assert.equal(evidence.afterLoss,readSample(after,row).loss);
  assert.equal(evidence.gradient,gradient.layers[0].bias[0]);
  assert.equal(evidence.afterBias,after.layers[0].bias[0]);
  assert.ok(Math.abs(evidence.afterBias-(evidence.beforeBias-before.learningRate*evidence.gradient))<1e-12);
  assert.equal(before.steps,0);
});
