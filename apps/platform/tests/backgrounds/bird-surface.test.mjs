import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../../source/backgrounds/bird-surface.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('the head is fixed to the body while the wing and tail have separate anatomical weights',()=>{
  assert.equal(typeof api.anatomicalWeights,'function');
  assert.deepEqual(api.anatomicalWeights(770,290,'core').weights,[1,0,0,0]);
  const wing=api.anatomicalWeights(200,100,'wing'),tail=api.anatomicalWeights(1400,800,'tail');
  assert.ok(wing.indices.filter((_,i)=>wing.weights[i]>0).every(i=>i>=1&&i<=3));
  assert.ok(tail.indices.filter((_,i)=>tail.weights[i]>0).every(i=>i>=4&&i<=5));
  assert.deepEqual(api.anatomicalWeights(980,620,'tail').weights,[1,0,0,0],'tail root remains welded to the torso');
  assert.equal(api.anatomicalWeights(980,620,'tail').indices[0],0);
});
test('registered feather strips share exact root boundaries with the covering surface',()=>{
  assert.equal(typeof api.registeredParts,'function');
  const parts=api.registeredParts(),wing=parts.filter(p=>p.kind==='wing'),tail=parts.filter(p=>p.kind==='tail');
  assert.ok(wing.length>=12&&tail.length===12);
  for(let i=1;i<wing.length;i++){
    assert.deepEqual(wing[i-1].root[1],wing[i].root[0]);
    assert.deepEqual(wing[i-1].edge[1],wing[i].edge[0]);
  }
  assert.ok(parts.every(p=>p.root.flat().every(Number.isFinite)&&p.edge.flat().every(Number.isFinite)));
});
test('all skin weights are finite and normalized across wing, torso and tail',()=>{
  assert.equal(typeof api.anatomicalWeights,'function');
  for(const kind of ['core','wing','tail'])for(let x=0;x<1672;x+=31)for(let y=0;y<941;y+=37){
    const {indices,weights}=api.anatomicalWeights(x,y,kind);
    assert.equal(indices.length,4);assert.equal(weights.length,4);
    assert.ok(weights.every(w=>Number.isFinite(w)&&w>=0&&w<=1));
    assert.ok(Math.abs(weights.reduce((a,b)=>a+b)-1)<1e-8);
  }
});
test('the source pixels at the rump junction are covered, without the previous triangular hole',()=>{
  const polygons=[api.CORE_OUTLINE,...api.registeredParts().map(p=>[p.root[0],p.root[1],p.edge[1],p.edge[0]])];
  const inside=([x,y],polygon)=>{
    let hit=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const [ax,ay]=polygon[i],[bx,by]=polygon[j];
      if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)hit=!hit;
    }
    return hit;
  };
  // Opaque pixels observed in the approved material, previously missing from every surface.
  for(const point of [[1069,554],[1081,567]])assert.ok(polygons.some(p=>inside(point,p)),`${point} must remain covered`);
});

