import test from 'node:test';
import assert from 'node:assert/strict';
import {screenToUnit,quadMatrix,type Quad} from '../src/ui/plane-projection.ts';

test('perspective sand corners and interior points map to the actual image coordinates',()=>{
  const project=(u:number,v:number):[number,number]=>[(720*u+30*v+120)/(.08*u+.4*v+1),(15*u+560*v+80)/(.08*u+.4*v+1)];
  const quad:Quad=[project(0,0),project(1,0),project(1,1),project(0,1)];
  for(const [u,v]of [[0,0],[1,0],[1,1],[0,1],[.25,.7],[.8,.12]]){
    const result=screenToUnit(quad,project(u,v));assert.ok(result);
    assert.ok(Math.abs(result[0]-u)<1e-9&&Math.abs(result[1]-v)<1e-9);
  }
});
test('flat presentation is the same mapping and an edge-on surface is rejected',()=>{
  assert.deepEqual(screenToUnit([[10,20],[210,20],[210,120],[10,120]],[60,45]),[.25,.25]);
  assert.equal(screenToUnit([[0,0],[0,0],[0,0],[0,0]],[0,0]),null);
});

test('the CSS plane and its inverse select the same sand cell after a camera change',()=>{
  for(const q of [[[120,80],[740,90],[810,560],[80,550]],[[230,150],[650,155],[710,490],[190,480]]] as Quad[]){
    const css=quadMatrix(q,512,512);assert.ok(css);
    const m=css.slice(9,-1).split(',').map(Number);
    for(const [u,v]of [[7.5/32,21.5/32],[26.5/32,3.5/32]]){
      const x=u*512,y=v*512,w=m[3]*x+m[7]*y+m[15];
      const screen:[number,number]=[(m[0]*x+m[4]*y+m[12])/w,(m[1]*x+m[5]*y+m[13])/w];
      const back=screenToUnit(q,screen);assert.ok(back);
      assert.equal(Math.floor(back[0]*32),Math.floor(u*32));assert.equal(Math.floor(back[1]*32),Math.floor(v*32));
    }
  }
});
