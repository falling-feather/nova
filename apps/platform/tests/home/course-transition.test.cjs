const test=require('node:test'),assert=require('node:assert/strict');
const Core=require('../../source/js/core.js');
require('../../source/js/math.js');
const Choreography=require('../../source/js/choreography.js');
function advance(s,seconds){for(let i=0;i<seconds*100;i++)s.tick(.01);}
function ready(quiet=false){const s=new Core.Experience();s.reduced=quiet;s.resources(4,4);s.skip();advance(s,2.4);return s;}

for(const quiet of [false,true])test(`fracture directly reveals the course atlas, reduced=${quiet}`,()=>{
 const s=ready(quiet),visited=[];s.onchange=p=>visited.push(p);s.activate();advance(s,4);
 assert.deepEqual(visited,['contact','fracture','courses']);assert.equal(s.phase,'courses');
 s.reset();assert.equal(s.phase,'explore');assert.equal(s.generation,1);
});
test('the home renderer sleeps once the atlas owns the screen, but redraws after invalidation',()=>{
 const gate=new Choreography.RenderGate(),state={phase:'courses',reduced:false,generation:0,pose:1};
 assert.equal(gate.shouldDraw(state),true);assert.equal(gate.shouldDraw(state),false);
 gate.invalidate();assert.equal(gate.shouldDraw(state),true);
});
