const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../../courses/source/concepts.cjs');
const links=require('../../../../shared/linkage/course-links.js');
const config=require('../../../../shared/linkage/chapters.json');

test('four concept regions and the foundation keep every existing chapter reachable',()=>{
  assert.equal(C.concepts.length,4);
  assert.deepEqual([...new Set([...C.foundation,...C.concepts.flatMap(c=>c.chapters)])].sort((a,b)=>a-b),Array.from({length:13},(_,i)=>i+1));
  assert.equal(C.forChapter(7,'generation').id,'generation');
  assert.equal(C.forChapter(99,'learning'),null);
});
test('the last-to-first camera segment closes continuously and chooses the short direction',()=>{
  assert.deepEqual(C.cameraAt(0),C.cameraAt(4));
  assert.deepEqual(C.cameraAt(-1),C.cameraAt(3));
  assert.equal(C.nearestStop(3.8,0),4);
  assert.equal(C.nearestStop(.1,3),-1);
  const a=C.cameraAt(3.9999),b=C.cameraAt(4.0001);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.01);
  assert.equal(C.wrap(NaN),0);assert.equal(C.wrap(Infinity),0);
});
test('the original entry contract carries concept context safely through the chapter return link',()=>{
  const base=links.entry(config,8,2,'http://127.0.0.1:5566/courses/');
  const entry=C.entryWithContext(base,'generation',2.05),destination=new URL(entry.href);
  assert.equal(destination.pathname,'/chapters/08/');
  assert.equal(links.returnUrl(entry.href),entry.returnUrl);
  assert.deepEqual(C.restore(entry.returnUrl),{mode:'concepts',progress:2.05,concept:'generation'});
  assert.equal(C.entryWithContext(base,'unknown',1),base);
  assert.deepEqual(C.restore('http://localhost/courses/?mode=bad&concept=bad&cview=oops'),{mode:'stages',progress:0,concept:'learning'});
});
