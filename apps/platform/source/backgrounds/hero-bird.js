import * as THREE from './vendor/three.module.js';
import { sampleHeroBird } from './hero-bird-motion.js';
import { BIRD_PLACEMENT, CORE_OUTLINE, registeredParts, anatomicalWeights, sourcePoint } from './bird-surface.js';
import { BlueprintWing, blueprintPoint } from './blueprint-wing.js';
import { imageTexture } from './rigs.js';

const Z=-75;
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);

function geometryFromSource(vertices,indices,kind,flex=[]) {
  const positions=[],uv=[],skinIndex=[],skinWeight=[];
  vertices.forEach(([x,y],i)=>{
    positions.push(...sourcePoint(x,y),Z);uv.push(x/BIRD_PLACEMENT.width,1-y/BIRD_PLACEMENT.height);
    const w=anatomicalWeights(x,y,kind);skinIndex.push(...w.indices);skinWeight.push(...w.weights);
    if(flex[i]===undefined)flex[i]=0;
  });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
  g.setAttribute('featherFlex',new THREE.Float32BufferAttribute(flex,1));
  if(indices)g.setIndex(indices);g.computeVertexNormals();return g;
}

function stripGeometry(part) {
  const vertices=[],indices=[],flex=[],rows=18,columns=5;
  for(let v=0;v<=rows;v++)for(let u=0;u<=columns;u++){
    const root=lerp(...part.root,u/columns),edge=lerp(...part.edge,u/columns);
    vertices.push(lerp(root,edge,v/rows));flex.push(Math.max(0,(v/rows-.25)/.75)**2);
  }
  for(let v=0;v<rows;v++)for(let u=0;u<columns;u++){
    const a=v*(columns+1)+u,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1);
  }
  return geometryFromSource(vertices,indices,part.kind,flex);
}

function coreGeometry() {
  const points=CORE_OUTLINE.map(p=>new THREE.Vector2(...p)),triangles=THREE.ShapeUtils.triangulateShape(points,[]),vertices=[];
  const split=(a,b,c,depth)=>{
    if(!depth){vertices.push(a,b,c);return;}
    const ab=lerp(a,b,.5),bc=lerp(b,c,.5),ca=lerp(c,a,.5);
    split(a,ab,ca,depth-1);split(ab,b,bc,depth-1);split(ca,bc,c,depth-1);split(ab,bc,ca,depth-1);
  };
  for(const [a,b,c] of triangles)split(CORE_OUTLINE[a],CORE_OUTLINE[b],CORE_OUTLINE[c],3);
  return geometryFromSource(vertices,null,'core');
}

function photoMaterial(texture,pivot=[0,0]) {
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,alphaTest:.012,side:THREE.DoubleSide,toneMapped:false});
  material.userData.fan={value:0};
  material.onBeforeCompile=shader=>{
    shader.uniforms.uFeatherFan=material.userData.fan;shader.uniforms.uFeatherPivot={value:new THREE.Vector2(...pivot)};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float featherFlex; uniform float uFeatherFan; uniform vec2 uFeatherPivot; varying vec2 vBirdNdc;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float angle=uFeatherFan*featherFlex; float co=cos(angle),si=sin(angle);
      vec2 delta=transformed.xy-uFeatherPivot;
      transformed.xy=vec2(delta.x*co-delta.y*si,delta.x*si+delta.y*co)+uFeatherPivot;
    `);
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvBirdNdc=gl_Position.xy/gl_Position.w;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vBirdNdc;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0),0.16);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
      vec2 aperture=(vBirdNdc-vec2(0.0,0.19))/vec2(0.26,0.31);
      diffuseColor.a*=1.0-0.92*exp(-dot(aperture,aperture)*1.65);
    `);
  };
  material.customProgramCacheKey=()=> 'registered-feather-surface';return material;
}

export function birdBackdrop(base,patch) {
  const canvas=document.createElement('canvas');canvas.width=1672;canvas.height=941;
  const ctx=canvas.getContext('2d');ctx.drawImage(base,0,0,1672,941);ctx.save();
  ctx.clip(new Path2D('M1078 214 Q1160 192 1245 143 L1320 124 L1460 105 L1672 91 L1672 371 L1480 382 L1360 387 L1190 389 L1124 364 L1100 284 Z'));
  ctx.drawImage(patch,0,0,1672,941);ctx.restore();return canvas;
}

/** Calibrated UV surfaces preserve the approved silhouette and each feather's actual length. */
export class HeroBird {
  constructor(images) {
    this.group=new THREE.Group();this.group.position.z=Z;this.texture=imageTexture(images.birdMaterial);this.texture.anisotropy=8;
    this.bones=[];this.named={};
    const add=(name,parent,position)=>{
      const b=new THREE.Bone();b.name=name;b.position.set(...position,0);parent.add(b);this.named[name]=b;this.bones.push(b);return b;
    };
    const root=add('body',this.group,[0,0]);
    const left=add('leftShoulder',root,sourcePoint(820,385));
    const elbow=add('leftElbow',left,[-260*.84,150*.84]);
    add('leftWrist',elbow,[-280*.84,140*.84]);
    const tail=add('tail',root,sourcePoint(980,620));add('tailTip',tail,[200*.84,-130*.84]);
    const shoulderPoint=blueprintPoint(1117,244),elbowPoint=blueprintPoint(1212,243),wristPoint=blueprintPoint(1277,162);
    const right=add('rightShoulder',root,[shoulderPoint[0]-836,470.5-shoulderPoint[1]]);
    const rightElbow=add('rightElbow',right,[elbowPoint[0]-shoulderPoint[0],shoulderPoint[1]-elbowPoint[1]]);
    add('rightWrist',rightElbow,[wristPoint[0]-elbowPoint[0],elbowPoint[1]-wristPoint[1]]);
    this.group.updateMatrixWorld(true);this.skeleton=new THREE.Skeleton(this.bones);
    this.parts=registeredParts().map(part=>{
      const pivot=sourcePoint(...lerp(...part.root,.5)),material=photoMaterial(this.texture,pivot);
      const mesh=new THREE.SkinnedMesh(stripGeometry(part),material);mesh.bind(this.skeleton);mesh.frustumCulled=false;
      mesh.renderOrder=part.kind==='tail'?10+6-Math.abs(part.index-5.5):30+part.index;
      return {...part,mesh,material};
    });
    this.coreMaterial=photoMaterial(this.texture);
    this.core=new THREE.SkinnedMesh(coreGeometry(),this.coreMaterial);this.core.bind(this.skeleton);this.core.frustumCulled=false;this.core.renderOrder=80;
    this.blueprint=new BlueprintWing(images.blueprintSource,this.skeleton);this.pose=null;
  }
  addTo(scene) {scene.add(this.group,this.core,this.blueprint.mesh);for(const part of this.parts)scene.add(part.mesh);}
  update(time,quiet) {
    const p=sampleHeroBird(time,quiet);this.pose=p;this.group.position.y=p.breathe;
    for(const side of ['left','right']){
      const sign=side==='left'?1:-1;
      this.named[`${side}Shoulder`].rotation.set(0,sign*p.shoulder,sign*p.sweep);
      this.named[`${side}Elbow`].rotation.set(0,sign*p.elbow,-sign*p.sweep*.28);
      this.named[`${side}Wrist`].rotation.set(0,sign*p.wrist,0);
    }
    this.named.tail.rotation.set(p.tailBend,0,-p.tailBend*.12);this.named.tailTip.rotation.x=-p.tailBend*.4;
    this.group.updateMatrixWorld(true);this.skeleton.update();
    for(const part of this.parts){
      part.material.opacity=p.bodyOpacity;
      part.material.userData.fan.value=part.kind==='tail'?(part.index-5.5)*.009*(1-p.tailSpread):(part.index-8.5)*.0018*(1-p.wingSpread);
    }
    this.coreMaterial.opacity=p.bodyOpacity;
    this.blueprint.update(p);
  }
  diagnostics() {
    return {components:this.parts.length+2,solidFeathers:this.parts.filter(p=>p.kind==='wing').length,tailFeathers:12,blueprint:this.blueprint.diagnostics(),bones:this.bones.length,pose:this.pose?{...this.pose}:null};
  }
  dispose() {this.blueprint.dispose();this.texture.dispose();}
}
