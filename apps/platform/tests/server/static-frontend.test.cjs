const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {once}=require('node:events');
const {createStaticServer}=require('../../../../tools/static-server.cjs');
test('frontend serves only files, supports ranges, and has no account API',async()=>{
 const root=path.resolve(__dirname,'../../../../tmp/static-server-test');fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'index.html'),'hello static');fs.writeFileSync(path.join(root,'model.wasm'),'0123456789');
 const server=createStaticServer({root,instance:'test'});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal(await (await fetch(base+'/')).text(),'hello static');assert.equal((await fetch(base+'/api/auth/session')).status,404);assert.equal((await fetch(base+'/api/auth/login',{method:'POST'})).status,405);
  const range=await fetch(base+'/model.wasm',{headers:{Range:'bytes=2-4'}});assert.equal(range.status,206);assert.equal(await range.text(),'234');assert.equal(range.headers.get('Content-Type'),'application/wasm');
  assert.equal((await fetch(base+'/%2e%2e%5cpackage.json')).status,403);assert.equal((await fetch(base+'/model.wasm',{headers:{Range:'bytes=30-'}})).status,416);
  assert.equal((await fetch(base+'/model.wasm',{method:'HEAD'})).headers.get('Content-Length'),'10');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.unlinkSync(path.join(root,'index.html'));fs.unlinkSync(path.join(root,'model.wasm'));fs.rmdirSync(root);}
});
