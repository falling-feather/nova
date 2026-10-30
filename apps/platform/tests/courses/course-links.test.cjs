const test=require('node:test'),assert=require('node:assert/strict');
const config=require('../../../../shared/linkage/chapters.json');
const links=require('../../../../shared/linkage/course-links.js');
const fs=require('node:fs'),vm=require('node:vm');

test('a bundled browser module exposes the return API after asynchronous course startup',()=>{
  const sandbox={URL,module:{exports:{}},document:{getElementById:()=>null,querySelector:()=>null,readyState:'complete'},location:{href:'http://127.0.0.1:5178/chapters/05/'}};
  sandbox.window=sandbox;
  vm.runInNewContext(fs.readFileSync(require.resolve('../../../../shared/linkage/course-links.js'),'utf8'),sandbox);
  assert.ok(sandbox.NovaCourseLinks,'the workbench mounts after the document ready event');
  assert.equal(sandbox.NovaCourseLinks.entry(config,5,0,'http://127.0.0.1:5178/courses/').href.startsWith('http://127.0.0.1:5178/chapters/05/'),true);
});

test('connected directory chapters open their matching course',()=>{
  for(const {n}of config.chapters){
    const mount='/chapters/'+String(n).padStart(2,'0')+'/';
    const result=links.entry(config,n,.25,'http://127.0.0.1:5178/courses/index.html?embed=1');
    assert.ok(result,'connected chapter must have an entry');
    const destination=new URL(result.href);
    assert.equal(destination.port,'5178');assert.equal(destination.pathname,mount);
    assert.equal(destination.searchParams.get('novaChapter'),String(n));
    const back=new URL(destination.searchParams.get('novaReturn'));
    assert.equal(back.origin,'http://127.0.0.1:5178');assert.equal(back.pathname,'/courses/');
    assert.equal(back.searchParams.get('view'),'0.25');assert.equal(back.searchParams.get('chapter'),String(n));
    assert.equal(back.searchParams.has('embed'),false,'return must open an active standalone atlas');
  }
});
test('a hosted hub keeps chapters and the return link on the current origin',()=>{
  const result=links.entry(config,3,0,'https://classroom.example/courses/?embed=1');
  assert.equal(new URL(result.href).origin,'https://classroom.example');assert.equal(new URL(result.href).pathname,'/chapters/03/');
  const back='https://classroom.example/courses/?view=0&chapter=3';
  assert.equal(links.returnUrl('https://classroom.example/chapters/03/?novaChapter=3&novaReturn='+encodeURIComponent(back)),back);
});

test('the historical chapter entry shares the origin and returns to its current chapter detail',()=>{
  const archiveConfig={hub:config.hub,chapters:[{n:9,mount:'/archive/chapters/09/'}]};
  const result=links.entry(archiveConfig,9,2,'http://localhost:5178/courses/');
  assert.ok(result);assert.equal(new URL(result.href).pathname,'/archive/chapters/09/');
  assert.equal(links.returnUrl(result.href),'http://localhost:5178/courses/?view=2&chapter=9');
  assert.notEqual(new URL(links.entry(config,9,2,'http://localhost:5178/courses/').href).pathname,new URL(result.href).pathname);
  assert.equal(links.entry({...archiveConfig,chapters:[]},9,2,'http://localhost:5178/courses/'),null,'a package without archives must not advertise an unavailable entry');
});
test('unconnected or invalid chapters do not produce a misleading course entry',()=>{
  for(const n of [0,14,99,'1',NaN])assert.equal(links.entry(config,n,0,'http://127.0.0.1:5178/courses/'),null);
  assert.equal(links.entry({...config,chapters:config.chapters.filter(c=>c.n!==2)},2,0,'http://127.0.0.1:5178/courses/'),null);
});

test('all thirteen active chapters have one current course entry',()=>{
  assert.deepEqual(config.chapters.map(c=>c.n),Array.from({length:13},(_,i)=>i+1));
  for(let n=1;n<=13;n++)assert.ok(links.entry(config,n,3,'http://127.0.0.1:5178/courses/'),'chapter '+n+' must be available');
});
test('localhost and an offline homepage lead back to the linked local atlas',()=>{
  assert.equal(new URL(links.entry(config,2,0,'http://localhost:5178/courses/').href).hostname,'localhost');
  assert.equal(new URL(links.entry(config,1,Infinity,'file:///D:/workspace/奇点/courses/index.html').returnUrl).href,'http://127.0.0.1:5178/courses/?view=0&chapter=1');
});
test('the return link accepts only the local directory and its matching chapter',()=>{
  const good='http://127.0.0.1:5193/?novaChapter=3&novaReturn='+encodeURIComponent('http://127.0.0.1:5178/courses/?view=0&chapter=3');
  assert.equal(links.returnUrl(good),'http://127.0.0.1:5178/courses/?view=0&chapter=3');
  for(const target of ['javascript:alert(1)','https://other.example/courses/?chapter=3','http://127.0.0.1:5178/private/','http://127.0.0.1:5178/courses/?chapter=2']){
    assert.equal(links.returnUrl('http://127.0.0.1:5193/?novaChapter=3&novaReturn='+encodeURIComponent(target)),null);
  }
  assert.equal(links.returnUrl('http://127.0.0.1:5193/'),null);
});

test('project Pages preserves the deployment prefix for every chapter and return',()=>{
  for(const {n} of config.chapters){
    const result=links.entry(config,n,2,'https://falling-feather.github.io/nova/courses/index.html?embed=1');
    assert.equal(new URL(result.href).pathname,'/nova/chapters/'+String(n).padStart(2,'0')+'/');
    assert.equal(new URL(result.returnUrl).pathname,'/nova/courses/');
    assert.equal(links.returnUrl(result.href),result.returnUrl);
  }
});

test('site roots resolve home, directory, personal and chapter pages consistently',()=>{
  for(const page of ['NOVA.html','index.html','courses/','personal/','chapters/08/','archive/chapters/09/']){
    assert.equal(links.siteRoot('https://example.org/nova/'+page).href,'https://example.org/nova/');
  }
  assert.equal(links.siteRoot('http://localhost:5368/').href,'http://localhost:5368/');
});

test('a project chapter rejects a different project directory on the same host',()=>{
  for(const target of ['https://example.org/courses/?chapter=8','https://example.org/other/courses/?chapter=8']){
    assert.equal(links.returnUrl('https://example.org/nova/chapters/08/?novaChapter=8&novaReturn='+encodeURIComponent(target)),null);
  }
});

test('static directory navigation stays inside a project deployment',()=>{
  const html=fs.readFileSync(require('node:path').resolve(__dirname,'../../courses/source/index.html'),'utf8');
  for(const [,href] of html.matchAll(/href="([^"]+)"/g)){
    if(/^(?:data:|https?:|#)/.test(href))continue;
    assert.ok(new URL(href,'https://example.org/nova/courses/').pathname.startsWith('/nova/'),href);
  }
});
