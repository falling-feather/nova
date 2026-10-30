const test=require('node:test'),assert=require('node:assert/strict');
let A;try{A=require('../../courses/source/awakening.js');}catch{}
test('fracture reveals a sparse field first, without already showing the course directory',()=>{
 assert.equal(typeof A?.sample,'function');
 const start=A.sample(0),early=A.sample(A.DURATION*.21),clear=A.sample(A.DURATION*.505);
 assert.equal(start.field,0);assert.equal(start.art,0);assert.equal(start.ui,0);
 assert.ok(early.field>0&&early.field<.15);assert.equal(early.art,0);
 assert.ok(clear.art>0&&clear.art<.4);assert.equal(clear.ui,0);assert.deepEqual(clear.chapters,[0,0,0]);assert.equal(clear.interactive,false);
});
test('focus, aperture and distinct content layers settle continuously into the unchanged full page',()=>{
 assert.equal(typeof A?.sample,'function');let previous=A.sample(0);
 for(let t=.025;t<=6;t+=.025){const p=A.sample(t);for(const key of ['field','art','lines','route','caption','ui','opening']){assert.ok(p[key]>=previous[key]-1e-10);assert.ok(p[key]>=0&&p[key]<=1);}assert.ok(p.blur<=previous.blur+1e-10);assert.ok(p.radiusX>0&&p.radiusY>0);previous=p;}
 const mid=A.sample(A.DURATION*2/3);assert.ok(mid.chapters[0]>mid.chapters[2]);
 const final=A.sample(A.DURATION);assert.equal(final.complete,true);assert.equal(final.interactive,true);assert.equal(final.blur,0);assert.equal(final.ui,1);assert.deepEqual(final.chapters,[1,1,1]);
});
test('the whole entrance finishes at three seconds, including controls and focus',()=>{
 assert.equal(A.sample(2.99).complete,false);
 const end=A.sample(3);assert.equal(end.complete,true);assert.equal(end.ui,1);assert.equal(end.blur,0);assert.equal(end.interactive,true);assert.deepEqual(end.chapters,[1,1,1]);
});
test('reduced motion skips the aperture and blurred focus, and replay starts closed again',()=>{
 assert.equal(typeof A?.sample,'function');
 assert.deepEqual(A.sample(0,true),A.sample(500,true));assert.equal(A.sample(0,true).complete,true);assert.equal(A.sample(0,true).blur,0);
 A.sample(80);assert.equal(A.sample(0).complete,false);assert.equal(A.sample(0).field,0);
});
