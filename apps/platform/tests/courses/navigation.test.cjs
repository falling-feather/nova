const test=require('node:test');
const assert=require('node:assert/strict');
const geometry=require('../../courses/source/reference/geometry.cjs');
const nav=require('../../courses/source/navigation.cjs');

test('five stops show only the agreed chapters, without reflow or rotation',()=>{
  const expected=[[1,2,3,4],[5,6,7],[7,8,9],[10,11],[11,12,13]];
  expected.forEach((want,i)=>{
    const box=nav.cameraAt(geometry.views,i);
    assert.deepEqual(nav.visibleChapters(geometry.chapters,box).map(c=>c.n),want);
    assert.equal(box.width,900); assert.equal(box.height,510);
  });
});
test('scroll overshoot and invalid input stay in the map bounds',()=>{
  assert.deepEqual(nav.cameraAt(geometry.views,-100),{x:0,y:545,width:900,height:510});
  assert.deepEqual(nav.cameraAt(geometry.views,100),{x:1640,y:960,width:900,height:510});
  assert.equal(nav.clampProgress(NaN),0);
  assert.equal(nav.wheelProgress(3.99,900,0),4);
  assert.equal(nav.wheelProgress(.01,-900,0),0);
  assert.ok(nav.wheelProgress(0,3,1)>.01,'line scroll units must be normalized');
});
test('last segment travels left and down and is continuous at the shared stop',()=>{
  const before=nav.cameraAt(geometry.views,3),mid=nav.cameraAt(geometry.views,3.5),after=nav.cameraAt(geometry.views,4);
  assert.equal(mid.x,1740); assert.equal(mid.y,770);
  assert.ok(before.x>mid.x&&mid.x>after.x);
  assert.ok(before.y<mid.y&&mid.y<after.y);
  const a=nav.cameraAt(geometry.views,2.99999),b=nav.cameraAt(geometry.views,3.00001);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001);
});
test('shared chapter opens the nearer valid viewport; invalid chapter does not navigate',()=>{
  assert.equal(nav.viewForChapter(geometry,7,1.8),2);
  assert.equal(nav.viewForChapter(geometry,7,.8),1);
  assert.equal(nav.viewForChapter(geometry,11,3.9),4);
  assert.equal(nav.viewForChapter(geometry,13,0),4);
  assert.equal(nav.viewForChapter(geometry,99,0),null);
});
test('corrupt or outdated local collections cannot inject invalid chapter identifiers',()=>{
  assert.deepEqual(nav.parseSaved('{bad'),[]);
  assert.deepEqual(nav.parseSaved('{"n":4}'),[]);
  assert.deepEqual(nav.parseSaved('[1,2,2,13,99,-1,"3",null]'),[1,2,13]);
});

test('inserting history preserves the subject of each existing saved chapter',()=>{
  assert.deepEqual(nav.restoreSaved(null,'[1,2,3,7,12,99]'),[1,3,4,8,13]);
  assert.deepEqual(nav.restoreSaved('[1,3,4,8,13]','[1,2,3,7,12]'),[1,3,4,8,13]);
  assert.deepEqual(nav.restoreSaved('[]','[2,3]'),[],'a cleared new list must not resurrect old bookmarks');
  assert.deepEqual(nav.restoreSaved(null,'{bad'),[]);
});

