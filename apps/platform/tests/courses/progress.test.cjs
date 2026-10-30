const test=require('node:test'),assert=require('node:assert/strict');
const links=require('../../../../shared/linkage/course-links.js');
const memory=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};

test('chapter summaries preserve independent chapter and canonical learning records',()=>{
 const store=memory();store.setItem('nova-type-house-v1','original-learning-record');
 assert.equal(links.recordProgress(store,{chapter:7,completed:2,total:6,pathLabel:'核心路线',artifactCount:1},123).ok,true);
 assert.equal(links.recordProgress(store,{chapter:8,completed:3,total:25,pathLabel:'五站旅程'},456).ok,true);
 assert.deepEqual(links.readProgress(store,7).value,{schema:'nova-chapter-progress',version:1,chapter:7,completed:2,total:6,pathLabel:'核心路线',artifactCount:1,updatedAt:123});
 assert.equal(links.readProgress(store,8).value.completed,3);
 assert.equal(store.getItem('nova-type-house-v1'),'original-learning-record');
});

test('invalid summaries never replace a valid continuation record',()=>{
 const store=memory();links.recordProgress(store,{chapter:6,completed:1,total:5},123);
 const before=store.getItem('nova-chapter-progress-v1:6');
 for(const detail of [{chapter:6,completed:6,total:5},{chapter:6,completed:'1',total:5},{chapter:0,completed:0,total:5},{chapter:14,completed:0,total:5},{chapter:6,completed:0,total:0},{chapter:6,completed:1,total:5,artifactCount:-1}])assert.equal(links.recordProgress(store,detail).ok,false);
 assert.equal(store.getItem('nova-chapter-progress-v1:6'),before);
});

test('missing, damaged and unavailable summaries remain distinguishable',()=>{
 const store=memory();assert.equal(links.readProgress(store,10).status,'missing');
 store.setItem('nova-chapter-progress-v1:10','broken');assert.equal(links.readProgress(store,10).status,'invalid');
 assert.equal(store.getItem('nova-chapter-progress-v1:10'),'broken');
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 assert.equal(links.readProgress(blocked,10).status,'unavailable');
 assert.equal(links.recordProgress(blocked,{chapter:10,completed:0,total:5}).ok,false);
});

test('resume summaries use their own schema and cannot impersonate another chapter',()=>{
 const store=memory();links.recordProgress(store,{chapter:12,completed:4,total:5,pathLabel:'独立调度'},900);
 const record=store.getItem('nova-chapter-progress-v1:12');store.setItem('nova-chapter-progress-v1:13',record);
 assert.equal(links.readProgress(store,13).status,'invalid');
 const changed=JSON.parse(record);changed.version=2;store.setItem('nova-chapter-progress-v1:12',JSON.stringify(changed));
 assert.equal(links.readProgress(store,12).status,'invalid');
});
