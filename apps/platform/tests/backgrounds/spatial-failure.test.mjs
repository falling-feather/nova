import test from 'node:test';
import assert from 'node:assert/strict';
import { LivingScene } from '../../source/backgrounds/living-scene.js';

test('a GPU render error disables only the dynamic layer and releases its resources',()=>{
  let disposed=0,invalidated=0;
  const field=Object.create(LivingScene.prototype);
  Object.assign(field,{available:true,lost:false,error:null,name:'sanctuary',birds:[],shards:[],scene:{traverse(){}},camera:{},
    invalidate:()=>invalidated++,renderer:{render(){throw new Error('injected GPU failure');},dispose(){disposed++;},info:{render:{calls:0,triangles:0}}}});
  const state={time:9,reduced:false,pulse:-1,charge:0};
  assert.doesNotThrow(()=>field.render(state));
  assert.equal(field.available,false);
  assert.match(field.error,/injected GPU failure/);
  assert.equal(disposed,1);
  assert.equal(invalidated,1);
  assert.equal(field.render(state),null);
});

test('a partially initialized graphics layer also releases resources and records the cause',()=>{
  const previousDocument=globalThis.document,previousInitialize=LivingScene.prototype.initialize;
  let disposed=0;
  globalThis.document={createElement:()=>({})};
  LivingScene.prototype.initialize=function(){this.renderer={dispose(){disposed++;}};throw new Error('injected PMREM failure');};
  try{
    const field=new LivingScene('resonance',{});
    assert.equal(field.available,false);
    assert.match(field.error,/injected PMREM failure/);
    assert.equal(disposed,1);
  }finally{
    globalThis.document=previousDocument;
    if(previousInitialize)LivingScene.prototype.initialize=previousInitialize;else delete LivingScene.prototype.initialize;
  }
});

