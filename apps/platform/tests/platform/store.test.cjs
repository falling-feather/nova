const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PlatformStore, validatePayload } = require('../../server/store.cjs');
const tempRoot = path.resolve(__dirname, '../../.work');
let folder, file, store;
test.beforeEach(() => {
  fs.mkdirSync(tempRoot, { recursive: true });
  folder = fs.mkdtempSync(path.join(tempRoot, 'store-test-'));
  file = path.join(folder, 'records.sqlite');
  store = new PlatformStore(file);
});
test.afterEach(() => {
  store.close();
  assert.equal(path.dirname(folder), tempRoot);
  fs.rmSync(folder, { recursive: true });
});
const payload = value => ({ records: { 'original-save': value }, summary: null, artifacts: {} });
test('prototype keys cannot become artifact IDs or mutate the client artifact container', () => {
  for (const id of ['__proto__','constructor','prototype']) {
    const value=JSON.parse(JSON.stringify(payload('v1')));
    Object.defineProperty(value.artifacts,id,{value:{id,title:'作品',mimeType:'application/json',data:'{}'},enumerable:true});
    assert.throws(()=>validatePayload(value,13),/作品/);
  }
});
test('frequent autosaves keep bounded recovery points without touching native versions', async () => {
  let time=1000000;store.close();store=new PlatformStore(file,{now:()=>time});
  const {user}=await store.register({username:'checkpoint_a',displayName:'恢复点',password:'a-safe-password'});
  for(let i=0;i<12;i++){store.save(user.id,13,i,'checkpoint-operation-'+String(i).padStart(3,'0'),payload(JSON.stringify({releases:['v1','v2'],runs:['failure'],draft:i})));time+=1000;}
  assert.equal(store.history(user.id,13).length,1,'ordinary autosaves do not duplicate every payload');
  for(let i=12;i<18;i++){time+=300001;store.save(user.id,13,i,'checkpoint-operation-'+String(i).padStart(3,'0'),payload(JSON.stringify({releases:['v1','v2'],runs:['failure'],draft:i})));}
  assert.equal(store.history(user.id,13).length,3);
  assert.deepEqual(JSON.parse(store.load(user.id,13).payload.records['original-save']).releases,['v1','v2']);
  assert.equal(store.history(user.id,13,{limit:1}).length,1);
});
test('passwords are salted hashes, sessions survive restart and logout invalidates them', async () => {
  const a = await store.register({ username: 'learner_a', displayName: '小树', password: 'a-safe-password' });
  const b = await store.register({ username: 'learner_b', displayName: '小溪', password: 'a-safe-password' });
  const rows = store.db.prepare('SELECT password_hash FROM users').all();
  assert.notEqual(rows[0].password_hash, rows[1].password_hash);
  assert.ok(!rows[0].password_hash.includes('a-safe-password'));
  assert.equal((await store.login('learner_a', 'wrong-password')), null);
  assert.equal((await store.login('learner_a', 'a-safe-password')).id, a.user.id);
  const token = store.createSession(a.user.id);
  store.close(); store = new PlatformStore(file);
  assert.equal(store.session(token).id, a.user.id);
  store.logout(token); assert.equal(store.session(token), null);
  assert.notEqual(a.user.id, b.user.id);
});
test('revision checks preserve conflict data and operation replay is idempotent', async () => {
  const { user } = await store.register({ username: 'learner_a', password: 'a-safe-password', displayName: '小树' });
  const first = store.save(user.id, 13, 0, 'operation-one-001', payload('v1'));
  assert.equal(first.revision, 1);
  assert.equal(store.save(user.id, 13, 0, 'operation-one-001', payload('v1')).revision, 1);
  assert.throws(() => store.save(user.id, 13, 0, 'operation-one-001', payload('changed')), /操作ID/);
  const conflict = store.save(user.id, 13, 0, 'operation-two-002', payload('offline-v2'));
  assert.equal(conflict.conflict, true);
  assert.equal(store.load(user.id, 13).payload.records['original-save'], 'v1');
  assert.equal(store.conflicts(user.id, 13)[0].payload.records['original-save'], 'offline-v2');
  assert.equal(store.save(user.id, 13, 1, 'operation-three-003', payload('v2')).revision, 2);
  assert.equal(store.history(user.id, 13)[0].payload.records['original-save'], 'v1');
});
test('two users have isolated progress and recovery rotates credentials and sessions', async () => {
  const a = await store.register({ username: 'learner_a', password: 'a-safe-password', displayName: '甲' });
  const b = await store.register({ username: 'learner_b', password: 'b-safe-password', displayName: '乙' });
  store.save(a.user.id, 3, 0, 'operation-save-003', payload('photos-and-versions'));
  assert.equal(store.load(b.user.id, 3).revision, 0);
  const session = store.createSession(a.user.id);
  assert.equal(await store.recover('learner_a', 'wrong-code', 'new-safe-password'), null);
  const recovered = await store.recover('learner_a', a.recoveryCode, 'new-safe-password');
  assert.equal(recovered.user.id, a.user.id);
  assert.equal(store.session(session), null);
  assert.equal(await store.login('learner_a', 'a-safe-password'), null);
  assert.equal((await store.login('learner_a', 'new-safe-password')).id, a.user.id);
  assert.equal(await store.recover('learner_a', a.recoveryCode, 'third-safe-password'), null);
  assert.equal(store.load(a.user.id, 3).payload.records['original-save'], 'photos-and-versions');
});
