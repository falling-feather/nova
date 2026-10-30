import test from 'node:test';
import assert from 'node:assert/strict';

const api=await import('../../source/backgrounds/hero-bird-motion.js').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});
test('the hero has an independently timed tail rather than a second photographic wing',()=>{
  assert.equal(typeof api.sampleHeroBird,'function');
  const early=api.sampleHeroBird(1.8),late=api.sampleHeroBird(5);
  assert.ok(early.wingSpread>.2);
  assert.equal(early.tailSpread,0);
  assert.equal(late.wingSpread,1);
  assert.equal(late.tailSpread,1);
  assert.equal(late.outline,1);
});
test('the drawing follows the opening and reduced motion shows a complete still bird',()=>{
  assert.equal(typeof api.sampleHeroBird,'function');
  assert.deepEqual(api.sampleHeroBird(.2,true,1),api.sampleHeroBird(120,true,0));
  const quiet=api.sampleHeroBird(0,true);
  assert.equal(quiet.outline,1);assert.equal(quiet.tailSpread,1);assert.equal(quiet.bodyOpacity,1);
  for(const t of [.6,1.3,2,3,4,5,8]){
    const a=api.sampleHeroBird(t-1e-4),b=api.sampleHeroBird(t+1e-4);
    for(const key of Object.keys(a))assert.ok(Math.abs(a[key]-b[key])<.002,`${key} at ${t}`);
  }
});

