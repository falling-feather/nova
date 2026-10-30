import test from 'node:test';
import assert from 'node:assert/strict';
import {createModel, forward, cloneModel} from '../network.ts';
import {rotateSlope, placeSlope, setParameter, resizeLayer, changeDepth,pointToPixel,pixelToPoint,hitSlopeControl,slopeControls,nearestPoint} from '../interaction.ts';

test('rotating a slope edits the real input weights, preserves gain and resets Adam',()=>{
  const m=createModel([1],'sigmoid',7);m.layers[0].weights[0]=[3,4];
  m.optimizer={m:structuredClone(m.layers),v:structuredClone(m.layers),step:1};
  const before=forward(m,[.8,.1]).logit;
  rotateSlope(m,0,Math.PI/2);
  assert.ok(Math.abs(m.layers[0].weights[0][0])<1e-10);
  assert.ok(Math.abs(m.layers[0].weights[0][1]-5)<1e-10);
  assert.notEqual(forward(m,[.8,.1]).logit,before);
  assert.equal(m.optimizer,undefined);
});
test('placing a slope puts the actual hidden midpoint at the dragged coordinate',()=>{
  const m=createModel([3],'sigmoid',7);m.layers[0].weights[1]=[2,-3];
  placeSlope(m,1,[.4,-.2]);
  assert.ok(Math.abs(forward(m,[.4,-.2]).sums[0][1])<1e-12);
  assert.equal(forward(m,[.4,-.2]).values[1][1],.5);
});
test('invalid gestures and parameter edits fail before changing a model',()=>{
  const m=createModel([1],'sigmoid',7),before=cloneModel(m);
  assert.throws(()=>rotateSlope(m,0,NaN));
  assert.throws(()=>placeSlope(m,0,[2,0]));
  assert.throws(()=>setParameter(m,0,0,0,Infinity));
  assert.throws(()=>setParameter(m,4,0,0,1));
  assert.deepEqual(m,before);
});
test('component edits create supported dense networks without modifying the source',()=>{
  const m=createModel([3,2],'sigmoid',19),before=cloneModel(m);
  const wider=resizeLayer(m,11,0,1,19);
  assert.deepEqual(wider.hidden,[4,2]);assert.equal(wider.steps,0);
  assert.equal(wider.layers[1].weights[0].length,4);
  assert.deepEqual(changeDepth(m,11,3,19).hidden,[3,2,3]);
  assert.throws(()=>resizeLayer(createModel([8],'sigmoid',7),11,0,1,7));
  assert.throws(()=>resizeLayer(createModel([1],'sigmoid',7),11,0,-1,7));
  assert.deepEqual(m,before);
});
test('coordinate roundtrips and handle picking use visible pixels in wide or tall maps',()=>{
  const m=createModel([1],'sigmoid',7);m.layers[0].bias[0]=0;
  for(const frame of [{width:980,height:309},{width:572,height:1187}]){
    const p:[number,number]=[.4,-.3],q=pixelToPoint(frame,pointToPixel(frame,p));assert.ok(Math.abs(q[0]-p[0])<1e-10&&Math.abs(q[1]-p[1])<1e-10);
    const center=slopeControls(m,0,frame).position;
    assert.equal(hitSlopeControl(m,0,frame,[center[0],center[1]+17]),'place','top/bottom of the visible grip remain draggable');
  }
});
test('point picking chooses the nearest visible pin rather than the first data entry',()=>{
  const frame={width:980,height:309},points:[number,number][]=[[.01,0],[0,0]];
  const data=points.map(([x,y],i)=>({id:String(i),x,y,label:0 as const,truth:0 as const,split:'train' as const}));
  assert.equal(nearestPoint(data,frame,pointToPixel(frame,[0,0]))?.id,'1');
});
