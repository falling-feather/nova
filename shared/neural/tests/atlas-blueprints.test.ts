import test from 'node:test';
import assert from 'node:assert/strict';
import {createModel} from '../network.ts';
import {blueprintDiagram,blueprintSheet} from '../atlas-sheets.ts';

test('large and multilayer blueprints show every actual hidden unit',()=>{
  assert.equal((blueprintDiagram([40]).match(/data-diagram-neuron/g)??[]).length,40);
  assert.equal((blueprintDiagram([6,6]).match(/data-diagram-neuron/g)??[]).length,12);
  assert.match(blueprintDiagram([6,6]),/第 2 层/);
});
test('previewing another structure preserves current parameters until the apply control is used',()=>{
  const model=createModel([3],'sigmoid',19);model.steps=100;
  const before=structuredClone(model),markup=blueprintSheet(model,[6,6],false);
  assert.deepEqual(model,before);
  assert.match(markup,/67/);
  assert.match(markup,/data-shape="6,6"/);
  assert.match(markup,/采用图纸，回海湾试验/);
  assert.match(blueprintSheet(model,[3],false),/正在使用这张图纸/);
});
