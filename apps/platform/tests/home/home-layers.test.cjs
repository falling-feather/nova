const test=require('node:test'),assert=require('node:assert/strict');
require('../../source/js/math.js');require('../../source/js/geometry.js');require('../../source/js/home-motion.js');require('../../source/js/choreography.js');require('../../source/js/home.js');
const layers=require('../../source/assets-rebuilt/layers.json');
function fixture(){
  const calls=[],home=Object.create(globalThis.NovaHome.Home.prototype);
  home.r={noShadow(){},clear(){},camera(){},draw(mesh,matrix,material){calls.push({texture:material.texture,matrix:Array.from(matrix)});}};
  home.quad={};home.layers=layers.filter(l=>l.kind==='hand').map(l=>({...l,texture:l.name}));home.letters=[];home.crystals=[];home.scatter=[];home.birds={draw(){}};home.feather={};
  return {home,calls};
}
test('background rendering excludes the two foreground hands',()=>{
  const {home,calls}=fixture();home.draw(1672,941,10,0,[0,0],false,1,'background');
  assert.equal(calls.filter(c=>['human','ai'].includes(c.texture)).length,0);
});
test('the hand-only pass has stable transforms independent of background time',()=>{
  const {home,calls}=fixture();assert.equal(typeof home.drawHands,'function');
  home.drawHands(1672,941,12,0,false,1);const initial=calls.splice(0);
  home.drawHands(1672,941,64,0,false,1);
  assert.equal(calls.length,2);assert.deepEqual(calls,initial);
});
