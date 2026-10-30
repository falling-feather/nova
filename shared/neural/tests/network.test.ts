import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, forward, gradients, train, evaluate, parameterCount, cloneModel, singleBoundary, validateModel, estimateCost } from '../network.ts';
import { makeData } from '../data.ts';

test('same seed reproduces parameters; different layers consume earlier responses', () => {
  const a = createModel([2, 2], 'sigmoid', 7);
  assert.deepEqual(a, createModel([2, 2], 'sigmoid', 7));
  assert.equal(parameterCount(a), 15);
  const trace = forward(a, [0.3, -0.5]);
  const l = a.layers[1];
  const expected = l.bias[0] + trace.values[1].reduce((s, v, i) => s + v * l.weights[0][i], 0);
  assert.ok(Math.abs(trace.sums[1][0] - expected) < 1e-12);
});

test('backpropagation matches finite differences through two sigmoid layers', () => {
  const model = createModel([3, 2], 'sigmoid', 21);
  const data = makeData('lighthouse', 'train', 8);
  const grad = gradients(model, data);
  const eps = 1e-5;
  for (let k = 0; k < model.layers.length; k++) {
    for (let j = 0; j < model.layers[k].weights.length; j++) {
      for (let i = 0; i < model.layers[k].weights[j].length; i++) {
        const a = cloneModel(model), b = cloneModel(model);
        a.layers[k].weights[j][i] += eps; b.layers[k].weights[j][i] -= eps;
        const numerical = (evaluate(a, data).loss - evaluate(b, data).loss) / (2 * eps);
        assert.ok(Math.abs(numerical - grad.layers[k].weights[j][i]) < 1e-7);
      }
    }
  }
});
test('all selectable activations propagate real bias gradients through multiple layers',()=>{
  for(const activation of ['sigmoid','tanh','relu','linear'] as const){
    const model=createModel([3,2],activation,19),data=makeData('egret','train',7),g=gradients(model,data),eps=1e-5;
    for(let k=0;k<model.layers.length;k++)for(let j=0;j<model.layers[k].bias.length;j++){
      const a=cloneModel(model),b=cloneModel(model);a.layers[k].bias[j]+=eps;b.layers[k].bias[j]-=eps;
      const numerical=(evaluate(a,data).loss-evaluate(b,data).loss)/(2*eps);
      assert.ok(Math.abs(numerical-g.layers[k].bias[j])<1e-7,activation+' bias');
    }
  }
});
test('fixed noisy material can exhibit a train/validation gap without forcing classroom results',()=>{
  const data=makeData('fog','train',30),model=createModel([40],'sigmoid',7);
  train(model,data,2000);const training=evaluate(model,data),validation=evaluate(model,makeData('fog','validation',96));
  assert.ok(training.accuracy-validation.accuracy>.15);
  assert.ok(training.accuracy>.95);
});

test('real training reduces loss on a line; inference masks change output without parameter edits', () => {
  const model = createModel([3], 'sigmoid', 9);
  const data = makeData('lighthouse', 'train', 72);
  const before = evaluate(model, data).loss;
  train(model, data, 300);
  assert.ok(evaluate(model, data).loss < before / 3);
  assert.ok(evaluate(model, makeData('lighthouse', 'validation', 80)).accuracy > .85);
  const saved = cloneModel(model);
  assert.notEqual(forward(model, [.9, .2]).logit, forward(model, [.9, .2], {units:['0:0'], edges:[]}).logit);
  assert.deepEqual(model, saved);
});

test('linear hidden layers compose an affine function regardless of width/depth', () => {
  const model = createModel([8, 5, 3], 'linear', 15);
  const c = forward(model, [0, 0]).logit;
  const x = forward(model, [1, 0]).logit - c;
  const y = forward(model, [0, 1]).logit - c;
  assert.ok(Math.abs(forward(model, [.17, -.42]).logit - (c + .17 * x - .42 * y)) < 1e-10);
});

test('single sigmoid boundary handles shifted thresholds and degenerate parameters', () => {
  const m = createModel([1], 'sigmoid', 1);
  m.layers[0].weights[0] = [2, 1]; m.layers[0].bias[0] = .4;
  m.layers[1].weights[0][0] = 2; m.layers[1].bias[0] = -1;
  assert.deepEqual(singleBoundary(m), {kind:'line', x:2, y:1, bias:.4});
  m.layers[1].bias[0] = -.5;
  assert.ok(singleBoundary(m).kind === 'line');
  m.layers[1].bias[0] = -3;
  assert.equal(singleBoundary(m).kind, 'none');
  m.layers[1].weights[0][0] = 0;
  assert.equal(singleBoundary(m).kind, 'constant');
  m.layers[0].weights[0] = [0, 0];
  assert.equal(singleBoundary(m).kind, 'constant');
});

test('splits are disjoint and label noise affects training only; costs include samples', () => {
  const a = makeData('fog', 'train', 120), b = makeData('fog', 'validation', 120), c = makeData('fog', 'test', 120);
  assert.equal(new Set([...a, ...b, ...c].map(p => `${p.x},${p.y}`)).size, 360);
  assert.ok(a.some(p => p.label !== p.truth));
  assert.ok([...b, ...c].every(p => p.label === p.truth));
  const model = createModel([3], 'sigmoid', 1);
  assert.equal(estimateCost(model, 80, 20), 2 * estimateCost(model, 40, 20));
});

test('untrusted model imports reject nonfinite values, wrong dimensions, and excessive structures', () => {
  const model = createModel([3, 2], 'tanh', 1);
  assert.doesNotThrow(() => validateModel(model));
  const bad = cloneModel(model); bad.layers[0].weights[0][0] = Infinity;
  assert.throws(() => validateModel(bad), /参数/);
  const wrong = cloneModel(model); wrong.layers[1].weights[0].pop();
  assert.throws(() => validateModel(wrong), /维度/);
  assert.throws(() => createModel([9, 9, 9, 9], 'sigmoid', 1), /结构/);
});
test('large but finite Adam moments roundtrip independently of parameter magnitude limits',()=>{
  const model=createModel([3,3,3],'linear',7);
  model.layers.forEach(l=>{l.bias.fill(0);l.weights.forEach(w=>w.fill(20));});
  train(model,[{id:'finite-large-gradient',x:1,y:1,label:0,truth:0,split:'train'}],1);
  assert.ok(model.optimizer!.v.some(l=>l.weights.flat().some(v=>v>1e6)));
  assert.doesNotThrow(()=>validateModel(JSON.parse(JSON.stringify(model))));
});
