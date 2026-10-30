import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasFrame, atlasSurface } from '../atlas-layout.ts';
import { pointToPixel, pixelToPoint, slopeControls, hitSlopeControl, nearestPoint, containsPoint } from '../interaction.ts';
import { createModel, cloneModel } from '../network.ts';

test('the atlas preserves geography proportions in wide and short desktop frames',()=>{
  for(const size of [{width:1340,height:660},{width:950,height:590},{width:760,height:400}]){
    const art=atlasFrame(size.width,size.height),frame=atlasSurface(size.width,size.height);
    assert.ok(Math.abs(art.width/art.height-2)<1e-12);
    assert.ok(art.left>=0&&art.top>=0&&art.left+art.width<=size.width+.001&&art.top+art.height<=size.height+.001);
    assert.ok(frame.plot.left>art.left+art.width*.5,'survey belongs to the right-hand bay');
    assert.ok(frame.plot.top>art.top+art.height*.4,'the northern ridge remains outside the survey');
  }
});
test('all four data corners, mouse picking and handles use the same bay projection',()=>{
  const model=createModel([1],'sigmoid',7),before=cloneModel(model);model.layers[0].bias[0]=0;
  for(const size of [[1340,660],[950,590],[760,400]]){
    const frame=atlasSurface(size[0],size[1]);
    for(const point of [[-1,-1],[-1,1],[1,-1],[1,1],[.37,-.28]] as [number,number][]){
      const pixel=pointToPixel(frame,point),roundtrip=pixelToPoint(frame,pixel);
      assert.ok(roundtrip.every((v,i)=>Math.abs(v-point[i])<1e-10));
      assert.ok(containsPoint(frame,pixel));
    }
    assert.equal(containsPoint(frame,[5,5]),false,'decorative sea is not an editable data location');
    const controls=slopeControls(model,0,frame);
    assert.ok(Math.hypot(controls.position[0]-controls.direction[0],controls.position[1]-controls.direction[1])>=54,'grips remain separate in short windows');
    assert.equal(hitSlopeControl(model,0,frame,controls.direction),'rotate');
    const data=[{id:'a',x:.1,y:.2,label:1 as const,truth:1 as const,split:'train' as const}];
    assert.equal(nearestPoint(data,frame,pointToPixel(frame,[.1,.2]))?.id,'a');
  }
  assert.deepEqual(model.layers[0].weights,before.layers[0].weights,'presentation does not modify model parameters');
});

test('focus enlarges the complete experiment and every transition frame still roundtrips',()=>{
  for(const [width,height]of [[1340,660],[950,590],[760,400]]){
    const overview=atlasSurface(width,height),focus=atlasSurface(width,height,1);
    assert.ok(focus.plot.width>overview.plot.width*1.5);
    assert.ok(focus.plot.left>=230&&focus.plot.top>=125);
    assert.ok(focus.plot.left+focus.plot.width<=width-40);
    assert.ok(focus.plot.top+focus.plot.height<=height-40);
    for(const t of [0,.15,.5,.85,1]){
      const frame=atlasSurface(width,height,t),point:[number,number]=[.3,-.6];
      const result=pixelToPoint(frame,pointToPixel(frame,point));
      assert.ok(result.every((v,i)=>Math.abs(v-point[i])<1e-9),'art and data must move together during focus');
    }
  }
});
