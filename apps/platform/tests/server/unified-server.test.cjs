const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events');
const {createUnifiedServer}=require('../../tools/unified-server.cjs');
const tempParent=path.resolve(__dirname,'../../.work');
let fixture,server,port;
test.before(async()=>{
  fs.mkdirSync(tempParent,{recursive:true});
  fixture=fs.mkdtempSync(path.join(tempParent,'unified-server-test-'));
  const write=(name,body)=>{const file=path.join(fixture,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);};
  write('hub/index.html','<title>NOVA</title>');write('hub/NOVA.html','homepage');
  write('hub/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M12 52V12l40 40V12"/></svg>');
  write('hub/courses/index.html','<title>Course directory</title>');write('hub/source/private.txt','not a public artifact');
  const chapters=[1,2,3,4].map(n=>({n,folder:'chapter'+n,mount:'/chapters/0'+n+'/'}));
  for(const chapter of chapters){write(chapter.folder+'/dist/index.html','<title>chapter '+chapter.n+'</title><script src="./assets/app.js"></script>');write(chapter.folder+'/dist/assets/app.js','console.log("chapter '+chapter.n+'");');}
  write('chapter3/dist/assets/leaf.png',Buffer.from([137,80,78,71,13,10,26,10,20,30,40,50]));
  write('chapter3/dist/models/runtime.mjs','export const ready=true;');write('chapter3/dist/models/runtime.wasm',Buffer.from([0,97,115,109,1,0,0,0]));
  write('legacy3/dist/index.html','<title>historical chapter 3</title>');write('legacy3/dist/assets/app.js','legacy resource');
  server=createUnifiedServer({workspace:fixture,config:{hub:{folder:'hub'},chapters,archives:[{n:3,folder:'legacy3',mount:'/archive/chapters/03/'}]}});
  server.listen(0,'127.0.0.1');await once(server,'listening');port=server.address().port;
});
test.after(async()=>{
  if(server){server.close();await once(server,'close');}
  if(fixture){const target=path.resolve(fixture);assert.equal(path.dirname(target),tempParent);assert.ok(path.basename(target).startsWith('unified-server-test-'));fs.rmSync(target,{recursive:true});}
});
const request=(url,headers={},method='GET')=>new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port,path:url,headers,method},response=>{const chunks=[];response.on('data',c=>chunks.push(c));response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end();
});
test('the same listener serves the homepage, directory and four isolated chapter builds',async()=>{
  for(const [url,text]of [['/','NOVA'],['/courses/','Course directory'],...Array.from({length:4},(_,i)=>['/chapters/0'+(i+1)+'/','chapter '+(i+1)])]){
    const res=await request(url);assert.equal(res.status,200,url);assert.match(res.headers['content-type'],/text\/html/);assert.ok(res.body.toString().includes(text));
  }
  assert.equal((await request('/chapters/03/assets/app.js')).body.toString(),'console.log("chapter 3");');
});
test('chapter and directory redirects retain parameters and establish a relative-asset base',async()=>{
  const a=await request('/chapters/03?novaChapter=3');assert.equal(a.status,308);assert.equal(a.headers.location,'/chapters/03/?novaChapter=3');
  const b=await request('/courses?view=0&chapter=3');assert.equal(b.headers.location,'/courses/?view=0&chapter=3');
});

test('historical courses remain available on the same origin without replacing current builds',async()=>{
  const old=await request('/archive/chapters/03/');assert.equal(old.status,200);assert.match(old.body.toString(),/historical chapter 3/);
  assert.equal((await request('/archive/chapters/03/assets/app.js')).body.toString(),'legacy resource');
  assert.equal((await request('/chapters/03/assets/app.js')).body.toString(),'console.log("chapter 3");');
  const redirect=await request('/archive/chapters/03?novaChapter=3');assert.equal(redirect.status,308);assert.equal(redirect.headers.location,'/archive/chapters/03/?novaChapter=3');
  assert.equal((await request('/archive/chapters/04/')).status,404);
});

test('the browser default favicon request resolves to the shared SVG brand mark',async()=>{
  const alias=await request('/favicon.ico');assert.equal(alias.status,308);assert.equal(alias.headers.location,'/favicon.svg');
  const icon=await request(alias.headers.location);assert.equal(icon.status,200);assert.equal(icon.headers['content-type'],'image/svg+xml');assert.match(icon.body.toString(),/<svg/);
});
test('media byte ranges and HEAD responses work on mounted assets',async()=>{
  const res=await request('/chapters/03/assets/leaf.png',{Range:'bytes=0-7'});assert.equal(res.status,206);assert.equal(res.headers['content-range'],'bytes 0-7/12');assert.deepEqual([...res.body],[137,80,78,71,13,10,26,10]);
  assert.equal((await request('/chapters/03/assets/leaf.png',{Range:'bytes=99-100'})).status,416);
  const head=await request('/chapters/03/assets/leaf.png',{},'HEAD');assert.equal(head.status,200);assert.equal(head.headers['content-length'],'12');assert.equal(head.body.length,0);
});
test('in-browser model runtimes get module and WebAssembly content types despite nosniff',async()=>{
  const mjs=await request('/chapters/03/models/runtime.mjs');assert.equal(mjs.status,200);assert.match(mjs.headers['content-type'],/^text\/javascript/);assert.equal(mjs.headers['x-content-type-options'],'nosniff');
  const wasm=await request('/chapters/03/models/runtime.wasm');assert.equal(wasm.status,200);assert.equal(wasm.headers['content-type'],'application/wasm');assert.deepEqual([...wasm.body],[0,97,115,109,1,0,0,0]);
});
test('missing assets and unpublished chapters do not fall through to the main HTML',async()=>{
  assert.equal((await request('/chapters/03/assets/missing.png')).status,404);
  assert.equal((await request('/chapters/05/')).status,404);
  assert.equal((await request('/source/private.txt')).status,404);
});
test('encoded traversal, drive paths and unsupported methods cannot escape the mounted builds',async()=>{
  for(const url of ['/chapters/03/%2e%2e/%2e%2e/hub/source/private.txt','/chapters/03/%5c..%5csecret','/chapters/03/D:%5csecret'])assert.equal((await request(url)).status,403);
  assert.equal((await request('/chapters/03/%E0%A4%A')).status,400);
  assert.equal((await request('/chapters/03/',{},'POST')).status,405);
});
