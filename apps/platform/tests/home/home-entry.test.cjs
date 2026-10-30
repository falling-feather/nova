const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../../source/js/math.js');
const Core=require('../../source/js/core.js'),Flight=require('../../source/js/flight.js');
let Motion;try{Motion=require('../../source/js/home-motion.js');}catch{}
const layers=JSON.parse(fs.readFileSync(path.join(__dirname,'../../source/assets-rebuilt/layers.json'),'utf8'));
function enterHome(quiet=false){const s=new Core.Experience();s.reduced=quiet;s.resources(4,4);s.skip();return s;}
function advance(s,t){for(let i=0;i<Math.ceil(t/.01);i++)s.tick(.01);}

test('home entry blocks contact until both hands have arrived',()=>{
 const s=enterHome();
 assert.equal(s.press(),false);assert.equal(s.activate(),false);
 assert.equal(s.arrival,0);
 advance(s,Core.HOME_ENTRY_SECONDS/2);assert.equal(s.press(),false);
 advance(s,Core.HOME_ENTRY_SECONDS);assert.equal(s.arrival,1);assert.equal(s.press(),true);
});

test('pausing freezes entry; cancelling a hold does not replay it; returning home does',()=>{
 const s=enterHome();advance(s,.35);const before=s.arrival;
 s.pause(true);advance(s,10);assert.equal(s.arrival,before);
 s.pause(false);advance(s,Core.HOME_ENTRY_SECONDS);s.press();s.release();
 assert.equal(s.arrival,1);assert.equal(s.press(),true);
 s.reset(false);assert.equal(s.arrival,0);assert.equal(s.press(),false);
});

test('reduced motion goes straight to settled hands and stays settled when motion resumes',()=>{
 const s=enterHome(true);assert.equal(s.arrival,1);assert.equal(s.canInteract(),true);
 s.reduced=false;assert.equal(s.arrival,1);assert.equal(s.press(),true);
});

for(const [w,h] of [[1672,941],[1366,768],[390,844]]){
 test(`both hands start fully outside the ${w}x${h} viewport and finish at the meeting anchors`,()=>{
  assert.equal(typeof Motion?.sample,'function');const layout=Motion.layout(w,h);
  for(const name of ['human','ai']){
   const layer=layers.find(l=>l.name===name),start=Motion.sample(layer,layout,0,0),end=Motion.sample(layer,layout,1,0);
   if(name==='human')assert.ok(start.bounds.right<0);else assert.ok(start.bounds.left>w);
   const expected=[layout.anchor.x+(layer.hand.restTip[0]-835)*layout.scale,layout.anchor.y+(layer.hand.restTip[1]-430)*layout.scale];
   end.tip.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-7));
   const [x0,y0,x1,y1]=layer.box;assert.ok(Math.abs(end.width/end.height-(x1-x0)/(y1-y0))<1e-10);
  }
  const human=Motion.sample(layers.find(l=>l.name==='human'),layout,1,1),ai=Motion.sample(layers.find(l=>l.name==='ai'),layout,1,1);
  human.tip.forEach((v,i)=>assert.ok(Math.abs(v-ai.tip[i])<1e-7));
 });
}

test('intro renders all its phases using only the small dove poses and linework',()=>{
 const previous=global.document,drawn=[];
 const context=new Proxy({drawImage(image){assert.ok(image,'every drawn image must exist');drawn.push(image.name);}},{get(o,k){return k in o?o[k]:()=>{};}});
 global.document={createElement(){return {width:0,height:0,getContext:()=>context};}};
 const images={};for(const name of ['flight-up','flight-glide','flight-down'])for(const suffix of ['','-line'])images[name+suffix]={name:name+suffix,width:512,height:512};
 try{
  const painter=new Flight.Painter(images);
  for(const quiet of [false,true])for(const time of [.3,1.2,3,6,8,9.4])assert.doesNotThrow(()=>painter.render(1366,768,time,quiet,1));
  assert.ok(drawn.length>0);assert.ok(drawn.every(name=>name.startsWith('flight-')));
 }finally{global.document=previous;}
});

test('the cropped wrist edge stays outside the visible frame after arrival and contact',()=>{
 const layer=layers.find(l=>l.name==='human');
 for(const [w,h] of [[1672,941],[1366,768],[2560,1080],[390,844]])for(const pose of [0,1]){
  const hand=Motion.sample(layer,Motion.layout(w,h),1,pose,[1,1]);
  const c=Math.cos(hand.angle),s=Math.sin(hand.angle);
  const a=[hand.x-hand.width/2*c+hand.height/2*s,hand.y-hand.width/2*s-hand.height/2*c];
  const b=[hand.x-hand.width/2*c-hand.height/2*s,hand.y-hand.width/2*s+hand.height/2*c];
  for(const y of [Math.max(0,a[1]),Math.min(h,b[1])]){
   const t=(y-a[1])/(b[1]-a[1]);
   if(t>=0&&t<=1)assert.ok(a[0]+(b[0]-a[0])*t<=0,'left crop boundary must not be visible');
  }
 }
});
