const test=require('node:test'),assert=require('node:assert/strict');
const {desktopFailures}=require('../acceptance/verdict.cjs');
const clean=()=>({pending:[],errors:[],results:[{chapter:2,returned:true,buildMode:'static-production',errors:[],failedResources:[],failedRequests:[],snapshots:['entry','workspace'].flatMap(state=>[1366,1440].map(width=>({state,layout:{viewport:{width},pageOverflow:{x:0,y:0},counts:{nestedScrolls:0,clipped:1},returnLink:{found:true,hitTest:true,inViewport:true}}})))}]});
test('a complete delivered desktop route may pass despite a hidden-text clipping clue',()=>assert.deepEqual(desktopFailures(clean(),[2]),[]));
test('missing chapters, pending deliveries, and caught flow errors cannot pass the command',()=>{
 const report=clean();assert.ok(desktopFailures(report,[2,3]).length);report.pending.push({chapter:3,reason:'HTTP 404'});assert.ok(desktopFailures(report,[2]).length);report.pending=[];report.results[0].error='click was blocked';assert.ok(desktopFailures(report,[2]).length);
});
test('runtime errors, unavailable resources and unclickable return controls fail acceptance',()=>{
 for(const field of ['errors','failedResources','failedRequests']){const r=clean();r.results[0][field].push('failed');assert.ok(desktopFailures(r,[2]).length);}
 const r=clean();r.results[0].snapshots[0].layout.returnLink.hitTest=false;assert.ok(desktopFailures(r,[2]).length);
});
test('all requested desktop states must be measured without page or nested scroll',()=>{
 const r=clean();r.results[0].snapshots.pop();assert.ok(desktopFailures(r,[2]).length);
 const overflow=clean();overflow.results[0].snapshots[0].layout.pageOverflow.y=12;assert.ok(desktopFailures(overflow,[2]).length);
 const nested=clean();nested.results[0].snapshots[0].layout.counts.nestedScrolls=1;assert.ok(desktopFailures(nested,[2]).length);
});
test('an entry modal may suspend its background return control until the workspace opens',()=>{
 const r=clean();
 for(const s of r.results[0].snapshots.filter(s=>s.state==='entry'))Object.assign(s.layout.returnLink,{hitTest:false,suspendedByModal:true});
 assert.deepEqual(desktopFailures(r,[2]),[]);
});
test('modal suspension never excuses a blocked workspace exit or a missing entry exit',()=>{
 const r=clean();Object.assign(r.results[0].snapshots.find(s=>s.state==='workspace').layout.returnLink,{hitTest:false,suspendedByModal:true});
 assert.ok(desktopFailures(r,[2]).length);
 const missing=clean();Object.assign(missing.results[0].snapshots[0].layout.returnLink,{found:false,hitTest:false,suspendedByModal:true});
 assert.ok(desktopFailures(missing,[2]).length);
});
