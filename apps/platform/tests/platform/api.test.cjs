const test = require('node:test'), assert = require('node:assert/strict');
const http = require('node:http'), { once } = require('node:events');
const { PlatformStore } = require('../../server/store.cjs');
const { createAPI } = require('../../server/api.cjs');
let store, server, base;
test.beforeEach(async () => {
  store = new PlatformStore(':memory:'); const api = createAPI(store);
  server = http.createServer(async (req, res) => { if (!await api(req, res)) { res.writeHead(404); res.end(); } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); base = 'http://127.0.0.1:' + server.address().port;
});
test.afterEach(async () => { server.close(); await once(server, 'close'); store.close(); });
async function request(url, { cookie, user, method = 'GET', body, origin = base, headers = {} } = {}) {
  const response = await fetch(base + url, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(user ? { 'X-Nova-User': user } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), 'X-Nova-Request':'1', Origin:origin, ...headers }, ...(body ? { body:JSON.stringify(body) } : {}) });
  return { status:response.status, cookie:response.headers.get('set-cookie'), body:await response.json() };
}
async function account(username) { const r = await request('/api/auth/register', { method:'POST', body:{ username, displayName:username, password:'test-safe-password' } }); assert.equal(r.status,200); return { cookie:r.cookie.split(';')[0], user:r.body.user.id, recoveryCode:r.body.recoveryCode }; }
const save = (raw, baseRevision = 0, operationId = 'api-operation-0001') => ({ baseRevision, operationId, payload:{ records:{original:raw}, summary:null, artifacts:{} } });
test('authentication uses HttpOnly cookies and rejects CSRF and unsigned writes', async () => {
  const registration = await request('/api/auth/register', { method:'POST', body:{username:'student_a', password:'test-safe-password'} });
  assert.match(registration.cookie,/HttpOnly/); assert.match(registration.cookie,/SameSite=Lax/);
  const cookie = registration.cookie.split(';')[0], user = registration.body.user.id;
  assert.equal((await request('/api/chapters/3')).status,401);
  assert.equal((await request('/api/chapters/3',{ method:'PUT',cookie,body:save('original') })).status,409);
  assert.equal((await request('/api/chapters/3',{ method:'PUT',cookie,user,origin:'https://other.example',body:save('original') })).status,403);
  assert.equal((await request('/api/chapters/3',{ method:'PUT',cookie,user,headers:{'X-Nova-Request':'0'},body:save('original') })).status,403);
  assert.equal((await request('/api/chapters/3',{ method:'PUT',cookie,user,body:save('original') })).status,200);
});
test('oversized and malformed auth requests return structured errors without creating accounts',async()=>{
  assert.equal((await request('/api/auth/register',{method:'POST',body:{username:'oversized',password:'test-safe-password',displayName:'x'.repeat(8192)}})).status,413);
  const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{'X-Nova-Request':'1',Origin:base,'Content-Type':'application/json'},body:'{bad-json'});
  assert.equal(response.status,400);assert.equal(store.db.prepare('SELECT count(*) AS n FROM users').get().n,0);
});
test('data is selected exclusively by the session and stale account pages cannot write', async () => {
  const a = await account('student_a'), b = await account('student_b');
  await request('/api/chapters/13',{...a,method:'PUT',body:save('a-v1')});
  assert.equal((await request('/api/chapters/13?userId='+a.user,b)).body.revision,0);
  assert.equal((await request('/api/chapters/13',{cookie:b.cookie,user:a.user,method:'PUT',body:save('stale-a')})).status,409);
  assert.equal((await request('/api/auth/logout',{cookie:b.cookie,user:a.user,method:'POST'})).status,409);
  assert.equal((await request('/api/auth/session',b)).body.user.id,b.user);
  assert.equal((await request('/api/chapters/13',a)).body.payload.records.original,'a-v1');
  await request('/api/auth/logout',{...a,method:'POST'});
  assert.equal((await request('/api/auth/session',a)).body.user,null);
  assert.equal((await request('/api/chapters/13',a)).status,401);
});
test('preview and main ports keep distinct session cookies in the same browser jar',async()=>{
  const a=await account('port_student');
  const secondStore=new PlatformStore(':memory:'),api=createAPI(secondStore);
  const second=http.createServer((req,res)=>api(req,res));second.listen(0,'127.0.0.1');await once(second,'listening');
  try{
    const secondBase='http://127.0.0.1:'+second.address().port;
    const response=await fetch(secondBase+'/api/auth/register',{method:'POST',headers:{'X-Nova-Request':'1',Origin:secondBase,'Content-Type':'application/json'},body:JSON.stringify({username:'port_student',password:'test-safe-password'})});
    const bCookie=response.headers.get('set-cookie').split(';')[0],b=await response.json();
    assert.notEqual(a.cookie.split('=')[0],bCookie.split('=')[0]);
    const jar=a.cookie+'; '+bCookie;
    assert.equal((await request('/api/auth/session',{cookie:jar})).body.user.id,a.user);
    const session=await fetch(secondBase+'/api/auth/session',{headers:{Cookie:jar}}).then(r=>r.json());assert.equal(session.user.id,b.user.id);
  }finally{second.close();await once(second,'close');secondStore.close();}
});
test('conflicts, history, summaries and exported artifacts retain their native content', async () => {
  const a = await account('student_a');
  const first = save('{"releases":["v1"],"runs":["failure"]}');
  first.payload.summary=JSON.stringify({schema:'nova-chapter-progress',version:1,chapter:13,completed:2,total:6,pathLabel:'信息助手项目',artifactCount:1,updatedAt:1});
  first.payload.artifacts.work={id:'work',title:'我的初版',mimeType:'application/json',data:'{"native":"v1"}'};
  assert.equal((await request('/api/chapters/13',{...a,method:'PUT',body:first})).status,200);
  const conflict=await request('/api/chapters/13',{...a,method:'PUT',body:save('offline-v2',0,'api-operation-0002')});
  assert.equal(conflict.status,409); assert.equal(conflict.body.conflict,true);
  assert.equal((await request('/api/chapters/13/conflicts',a)).body.entries[0].payload.records.original,'offline-v2');
  assert.equal((await request('/api/chapters/13',{...a,method:'PUT',body:save('v2',1,'api-operation-0003')})).status,200);
  const index=(await request('/api/chapters/13/history?limit=1',a)).body.entries;
  assert.equal(index.length,1);assert.equal(index[0].payload,undefined);
  const history=(await request('/api/chapters/13/history?revision=1',a)).body.entry;
  assert.equal(history.payload.artifacts.work.data,'{"native":"v1"}');
  assert.equal(history.payload.records.original,first.payload.records.original);
  const forged=save('other',2,'api-operation-0004');forged.payload.summary=JSON.stringify({...JSON.parse(first.payload.summary),chapter:12});
  assert.equal((await request('/api/chapters/13',{...a,method:'PUT',body:forged})).status,400);
});
