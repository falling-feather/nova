import * as THREE from './vendor/three.module.js';

export function imageTexture(image) {
  const texture=new THREE.Texture(image);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.needsUpdate=true;
  return texture;
}

function atlasUV(geometry,column,row) {
  const uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+column)/2,(uv.getY(i)+1-row)/2);
  uv.needsUpdate=true;
  return geometry;
}
function birdMaterial(texture,tint=0xffffff) {
  return new THREE.MeshBasicMaterial({map:texture,color:tint,transparent:true,side:THREE.DoubleSide,depthWrite:false,alphaTest:.025,toneMapped:false});
}
function featherWing(texture,near) {
  const geometry=new THREE.PlaneGeometry(1.16,1.65,12,22);
  const pivot=near?{u:.70,v:.952}:{u:.335,v:.872};
  geometry.translate(-((pivot.u-.5)*1.16),(pivot.v-.5)*1.65,0);
  const ids=[],weights=[];
  for(let i=0;i<geometry.attributes.position.count;i++){
    const y=geometry.attributes.position.getY(i);
    const blend=THREE.MathUtils.smoothstep(y,.45,1.20);
    ids.push(0,1,0,0);weights.push(1-blend,blend,0,0);
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  atlasUV(geometry,near?1:0,near?0:1);
  const mesh=new THREE.SkinnedMesh(geometry,birdMaterial(texture,near?0xffffff:0xcad1db));
  mesh.position.set(-.03,-.025,near?.12:-.12);mesh.frustumCulled=false;
  const shoulder=new THREE.Bone(),wrist=new THREE.Bone();wrist.position.y=.6;
  shoulder.add(wrist);mesh.add(shoulder);mesh.bind(new THREE.Skeleton([shoulder,wrist]));
  return {mesh,shoulder,wrist};
}

/** The body is a photographic cutout; both wings have separate articulated depth. */
export class DoveRig {
  constructor(texture) {
    this.group=new THREE.Group();
    this.far=featherWing(texture,false);this.near=featherWing(texture,true);
    this.body=new THREE.Mesh(atlasUV(new THREE.PlaneGeometry(2,1.3),0,0),birdMaterial(texture,0xe3e7ee));
    this.body.position.z=.025;
    this.tail=new THREE.Mesh(atlasUV(new THREE.PlaneGeometry(.88,.55),1,1),birdMaterial(texture,0xe3e7ee));
    this.tail.position.set(.74,-.28,-.035);this.tail.rotation.z=-.12;
    this.group.add(this.far.mesh,this.tail,this.body,this.near.mesh);
    this.materials=[this.far.mesh.material,this.tail.material,this.body.material,this.near.mesh.material];
    this.far.mesh.renderOrder=1;this.tail.renderOrder=2;this.body.renderOrder=3;this.near.mesh.renderOrder=4;
  }
  update(pose,width,index) {
    const scale=width/1.55;
    this.group.position.set(pose.x-836,470.5-pose.y,20+index*2);
    this.group.scale.set(-scale,scale,scale);
    this.group.rotation.set(.04,Math.sin(index*1.3)*.3,pose.bank-.06);
    this.near.shoulder.rotation.x=Math.PI/2-pose.flap;
    this.far.shoulder.rotation.x=-Math.PI/2+pose.flap*.88;
    this.near.wrist.rotation.x=pose.wrist;
    this.far.wrist.rotation.x=-pose.wrist*.8;
    this.tail.rotation.z=-.12+pose.bank*.5;
    for(const material of this.materials)material.opacity=pose.opacity*(.8+index%3*.065);
    this.group.visible=pose.opacity>.001;
  }
}
