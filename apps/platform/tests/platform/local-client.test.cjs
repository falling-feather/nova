const test=require('node:test'),assert=require('node:assert/strict');
const {createLocalClient}=require('../../../../shared/linkage/local-client.js');
const contract=require('../../../../shared/linkage/storage-contract.js');
function memory(){const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
function setup(){const scope={localStorage:memory(),sessionStorage:memory(),fetch(){throw Error('前端不应请求账号服务');}};return {scope,client:createLocalClient(scope,[{chapter:1,title:'第一章',keys:['chunting-save']}],contract)};}
test('frontend opens without requests or account actions and retains native chapter keys',async()=>{
 const {scope,client}=setup();await client.ready;assert.equal(client.login,undefined);assert.equal(client.register,undefined);
 const port=await client.openChapter({chapter:1,keys:['chunting-save']});port.setItem('chunting-save','{"done":1}');
 assert.equal(scope.localStorage.getItem('chunting-save'),'{"done":1}');assert.equal(port.getItem('chunting-save'),'{"done":1}');
 assert.throws(()=>port.setItem('other','x'));assert.equal((await port.flush()).storageError,'');
});
test('progress and exported artifacts remain visible in local discoveries',async()=>{
 const {client}=setup();const port=await client.openChapter({chapter:1,keys:['chunting-save']});
 client.progressStorage().setItem('nova-chapter-progress-v1:1','{"completed":2}');
 port.saveArtifact({id:'work-1',title:'我的作品',mimeType:'application/json',data:'{}'});
 const value=await client.snapshot(1);assert.equal(value.artifacts['work-1'].data,'{}');assert.equal((await client.listChapters())[0].artifacts[0].id,'work-1');
 assert.ok(!Number.isNaN(Date.parse(value.artifacts['work-1'].savedAt)));assert.equal((await client.listChapters())[0].artifacts[0].savedAt,value.artifacts['work-1'].savedAt);
 assert.throws(()=>port.saveArtifact({id:'__proto__',title:'x',mimeType:'application/json',data:'{}'}));
});
test('reset removes only project-owned data, and storage failures are not reported as success',async()=>{
 const {scope,client}=setup();scope.localStorage.setItem('nova-old','x');scope.localStorage.setItem('chunting-save','x');scope.localStorage.setItem('unrelated','keep');scope.sessionStorage.setItem('nova-personal-session','old');
 await client.resetLocalData();assert.equal(scope.localStorage.length,1);assert.equal(scope.localStorage.getItem('unrelated'),'keep');assert.equal(scope.sessionStorage.length,0);
 scope.localStorage.setItem=()=>{throw Error('quota');};const port=await client.openChapter({chapter:1,keys:['chunting-save']});assert.throws(()=>port.setItem('chunting-save','{}'),/quota/);assert.notEqual(client.status().storageError,'');
});

test('reset deletes the owned creator database alongside legacy personal data',async()=>{
 const {scope,client}=setup(),names=[];scope.indexedDB={deleteDatabase(name){names.push(name);const request={};queueMicrotask(()=>request.onsuccess());return request;}};
 await client.resetLocalData();assert.deepEqual(names,['nova-personal-v1',contract.creatorDatabase]);
});
