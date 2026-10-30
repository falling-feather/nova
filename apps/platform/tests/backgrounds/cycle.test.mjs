import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../../source/backgrounds/cycle.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const home={ready:true,paused:false,phase:'explore',arrival:1,generation:0,reduced:false};

test('loading and the first hand entrance do not consume the 30-second home interval',()=>{
  assert.equal(typeof api.BackgroundCycle,'function');const c=new api.BackgroundCycle();
  c.advance(100,{...home,phase:'intro'});c.advance(10,{...home,arrival:.5});
  assert.equal(c.sample().current,'original');assert.equal(c.sample().elapsed,0);
  c.advance(29.9,home);assert.equal(c.sample().current,'original');
  c.advance(.1,home);assert.equal(c.sample().current,'sanctuary');assert.equal(c.sample().previous,'original');
});
test('the three backgrounds cycle every 30 seconds and only overlap during a bounded dissolve',()=>{
  assert.equal(typeof api.BackgroundCycle,'function');const c=new api.BackgroundCycle();
  c.advance(31,home);let s=c.sample();assert.equal(s.current,'sanctuary');assert.ok(s.mix>0&&s.mix<1);
  c.advance(2,home);assert.equal(c.sample().previous,null);assert.equal(c.sample().mix,1);
  c.advance(27,home);assert.equal(c.sample().current,'resonance');
  c.advance(30,home);assert.equal(c.sample().current,'original');
});
test('menus, background tabs, holding and the later narrative cannot skip the current background',()=>{
  assert.equal(typeof api.BackgroundCycle,'function');const c=new api.BackgroundCycle();c.advance(29,home);
  for(const state of [{...home,paused:true},{...home,phase:'holding'},{...home,phase:'contact'},{...home,phase:'fracture'}])c.advance(50,state);
  assert.equal(c.sample().elapsed,29);assert.equal(c.sample().current,'original');
  c.advance(1,home);assert.equal(c.sample().current,'sanctuary');
});
test('replaying or returning home resets the carousel without inheriting an old blend',()=>{
  assert.equal(typeof api.BackgroundCycle,'function');const c=new api.BackgroundCycle();c.advance(61,home);
  c.advance(0,{...home,generation:1,phase:'intro'});
  assert.equal(c.sample().current,'original');assert.equal(c.sample().previous,null);assert.equal(c.sample().elapsed,0);
});
test('reduced motion completes the current dissolve and cannot resurrect the outgoing scene',()=>{
  assert.equal(typeof api.BackgroundCycle,'function');const c=new api.BackgroundCycle();c.advance(30.5,home);
  c.advance(0,{...home,reduced:true});assert.equal(c.sample().previous,null);assert.equal(c.sample().mix,1);
  c.advance(0,home);assert.equal(c.sample().previous,null);assert.equal(c.sample().current,'sanctuary');
  c.advance(29.5,{...home,reduced:true});assert.equal(c.sample().current,'resonance');assert.equal(c.sample().mix,1);
});
test('a long visible frame advances the clock deterministically without emitting a chain of visual switches',()=>{
  assert.equal(typeof api.BackgroundCycle,'function');const a=new api.BackgroundCycle(),b=new api.BackgroundCycle();
  a.advance(91,home);for(let i=0;i<91;i++)b.advance(1,home);
  assert.deepEqual(a.sample(),b.sample());
});
