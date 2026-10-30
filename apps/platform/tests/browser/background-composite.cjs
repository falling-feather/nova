const assert=require('node:assert/strict');
async function assertGroupCapture(page){
  const pixel=await page.evaluate(()=>{
    const image=(color)=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,1,1);return c;};
    const blue=image('#0000ff'),white=image('#ffffff'),ink=image('rgba(0,0,0,.5)'),out=image('rgba(0,0,0,0)');
    const controller=Object.create(NovaBackgrounds.Controller.prototype);controller.width=controller.height=1;
    controller.entries=new Map([['back',{surface:{paintTo:c=>c.drawImage(blue,0,0)}}],['front',{surface:{paintTo:c=>{c.drawImage(white,0,0);c.drawImage(ink,0,0);}}}]]);
    controller.draw=()=>[{name:'back',alpha:1},{name:'front',alpha:.5}];
    controller.paintTo(out.getContext('2d'),{},[0,0]);
    return [...out.getContext('2d').getImageData(0,0,1,1).data];
  });
  assert.ok(Math.abs(pixel[0]-64)<=1&&Math.abs(pixel[1]-64)<=1&&Math.abs(pixel[2]-191)<=1&&pixel[3]===255,`capture must apply opacity to the composed group: ${pixel}`);
}
module.exports={assertGroupCapture};
if(require.main===module){
 const {chromium}=require(process.env.NOVA_PLAYWRIGHT_MODULE||'playwright');
 (async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{const p=await b.newPage();await p.goto((process.env.NOVA_BASE_URL||'http://127.0.0.1:5178')+'/NOVA.html');await p.waitForFunction(()=>window.NovaBackgrounds?.Controller);await assertGroupCapture(p);console.log('Group capture matches browser compositing.');}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
}
