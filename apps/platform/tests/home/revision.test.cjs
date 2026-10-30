const test=require('node:test');const assert=require('node:assert/strict');
require('../../source/js/math.js');const Flight=require('../../source/js/flight.js');
test('intro exposure plate has distinct authored phases without relying on GPU frame rate',()=>{
 assert.equal(typeof Flight?.plan,'function');assert.equal(Flight.plan(2,false).blueprint,0);assert.equal(Flight.plan(7.5,false).blueprint,1);
 assert.equal(Flight.plan(3,true).motion,false);assert.equal(Flight.plan(3,true).count,1);
 assert.equal(Flight.plan(9.65,false).dissolve,1);
});
test('shadow uniforms select the correct program after texture rendering',()=>{
 require('../../source/js/gl.js');const calls=[];
 const fake={gl:{useProgram:p=>calls.push(['program',p]),uniform1f:(u,v)=>calls.push(['uniform',u,v])},program:'lit',u:{ShadowEnabled:'shadow'},shadowDraws:4};
 globalThis.NovaGL.Renderer.prototype.noShadow.call(fake);
 assert.deepEqual(calls[0],['program','lit']);assert.equal(fake.shadowDraws,0);
});
