import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../../source/backgrounds/spatial-motion.js';
const run=test;
run('reduced motion freezes the flock independently of time', () => {
  for(let i=0;i<7;i++)assert.deepEqual(api.sampleBirdFlight(2,i,true),api.sampleBirdFlight(120,i,true));
});
run('flock wing strokes change continuously, and route wrapping is invisible', () => {
  const a=api.sampleBirdFlight(9,2),b=api.sampleBirdFlight(9.001,2);
  assert.ok(Math.abs(a.flap-b.flap)<.02);
  assert.ok(Math.abs(a.x-b.x)<.1);
  assert.notEqual(api.sampleBirdFlight(9,0).flap,api.sampleBirdFlight(9,1).flap);
  const wrap=4.5+.9/.026;
  assert.ok(api.sampleBirdFlight(wrap-.001,0).opacity<.001);
  assert.ok(api.sampleBirdFlight(wrap+.001,0).opacity<.001);
});
run('crystal facets form a closed, consistently oriented solid', () => {
  for(const seed of [1,7,91]){
    const {positions,indices}=api.crystalMeshData(seed,7);
    const edges=new Map();let volume=0;
    for(let i=0;i<indices.length;i+=3){
      const [a,b,c]=indices.slice(i,i+3);
      for(const [u,v] of [[a,b],[b,c],[c,a]]){const key=[u,v].sort((x,y)=>x-y).join(':');edges.set(key,(edges.get(key)||0)+1);}
      const A=positions.slice(a*3,a*3+3),B=positions.slice(b*3,b*3+3),C=positions.slice(c*3,c*3+3);
      volume+=(A[0]*(B[1]*C[2]-B[2]*C[1])+A[1]*(B[2]*C[0]-B[0]*C[2])+A[2]*(B[0]*C[1]-B[1]*C[0]))/6;
    }
    assert.ok([...edges.values()].every(count=>count===2));
    assert.ok(volume>.1,'outward winding and nonzero enclosed volume');
    assert.ok(positions.every(Number.isFinite));
  }
});
run('replays reuse deterministic crystal shapes',()=>{
  assert.deepEqual(api.crystalMeshData(18,6),api.crystalMeshData(18,6));
  assert.notDeepEqual(api.crystalMeshData(18,6),api.crystalMeshData(19,6));
});

