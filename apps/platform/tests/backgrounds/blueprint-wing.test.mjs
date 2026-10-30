import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../../source/backgrounds/blueprint-wing.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});

test('blue-ink separation rejects white paper, neutral shading and warm material',()=>{
  assert.equal(typeof api.blueInk,'function');
  for(const rgb of [[255,255,255],[155,155,155],[222,213,195],[238,246,252]])assert.ok(api.blueInk(...rgb)<.015,`${rgb} is not a drawing stroke`);
});
test('the original cobalt stroke and its antialiased edge survive without becoming a solid feather fill',()=>{
  assert.equal(typeof api.blueInk,'function');
  const line=api.blueInk(36,86,181),edge=api.blueInk(239,244,255);
  assert.ok(line>.75);assert.ok(edge>.05&&edge<.4);assert.ok(line>edge);
});
test('registered blue-wing weights anchor the shoulder and articulate the outer wing',()=>{
  assert.equal(typeof api.blueprintWeights,'function');
  const root=api.blueprintWeights(1117),tip=api.blueprintWeights(1640);
  assert.deepEqual(root,{indices:[6,7,0,0],weights:[1,0,0,0]});
  assert.deepEqual(tip,{indices:[7,8,0,0],weights:[0,1,0,0]});
  for(let x=1080;x<=1700;x+=9.7){
    const p=api.blueprintWeights(x);assert.ok(p.weights.every(v=>v>=0&&v<=1));
    assert.ok(Math.abs(p.weights.reduce((a,b)=>a+b)-1)<1e-9);
  }
});
test('registering the shoulder keeps the reference image’s cropped tips beyond the frame edge',()=>{
  assert.equal(typeof api.blueprintPoint,'function');
  assert.deepEqual(api.blueprintPoint(1117,244),[1062,264]);
  assert.ok(api.blueprintPoint(1671,140)[0]>=1672,'a source-image cut must not float inside the composition');
});

