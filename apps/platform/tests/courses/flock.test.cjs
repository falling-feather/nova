const test=require('node:test'),assert=require('node:assert/strict');
let F;try{F=require('../../courses/source/flock.js');}catch{}
const chapters=require('../../courses/source/reference/geometry.cjs').chapters;
test('course birds are a sparse, continuous reuse of the three registered flight poses',()=>{
 assert.equal(typeof F?.sample,'function');
 for(let t=0;t<12;t+=.031){const birds=F.sample(t,false,4,chapters);assert.ok(birds.length<=9);
  for(const b of birds){assert.ok([b.x,b.y,b.size,b.angle,b.opacity,...b.weights].every(Number.isFinite));assert.ok(b.size<=120);assert.ok(Math.abs(b.weights.reduce((a,v)=>a+v,0)-1)<1e-9);assert.ok(b.opacity>=0&&b.opacity<=.6);}
 }
 const a=F.sample(3,false,4,chapters),b=F.sample(3.0001,false,4,chapters);a.forEach((v,i)=>assert.ok(Math.hypot(v.x-b[i].x,v.y-b[i].y)<.01));
});
test('reduced motion freezes both the birds and their wing poses',()=>{
 assert.equal(typeof F?.sample,'function');assert.deepEqual(F.sample(0,true,0,chapters),F.sample(999,true,99,chapters));
});
test('bird opacity falls to zero around chapter numbers and labels',()=>{
 assert.equal(typeof F?.readability,'function');const c={x:475,y:760};
 assert.equal(F.readability(475,760,90,[c]),0);assert.equal(F.readability(475,798,90,[c]),0);
 assert.equal(F.readability(800,990,90,[c]),1);
});
