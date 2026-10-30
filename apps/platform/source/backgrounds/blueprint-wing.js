import * as THREE from './vendor/three.module.js';
import { clamp, smooth } from './motion.js';

const CROP={x:1080,y:80,width:620,height:340};
const BOUNDARY=[[1092,223],[1110,208],[1153,212],[1265,151],[1340,134],[1460,110],[1672,92],[1672,353],[1583,364],[1450,362],[1350,376],[1220,385],[1162,363],[1138,305],[1101,268]];

/** Register the shoulder while keeping the source's cropped outer tips beyond the viewport. */
export function blueprintPoint(x,y) {return [1062+(x-1117)*1.11,264+(y-244)*1.11];}

/** Keep the actual blue marks and their antialiasing; remove the pale paper and mineral shading. */
export function blueInk(r,g,b) {
  const chroma=b-r;
  if(chroma<=6)return 0;
  const hue=smooth(clamp(((b-g)/chroma-.51)/.18));
  return Math.pow(clamp((chroma-6)/92),.8)*hue;
}

export function blueprintWeights(x) {
  const span=Math.max(0,Math.min(2,x<1212?(x-1117)/95:1+(x-1212)/65));
  const a=Math.min(1,Math.floor(span)),t=smooth(span-a);
  return {indices:[6+a,7+a,0,0],weights:[1-t,t,0,0]};
}

function separateInk(source) {
  const canvas=document.createElement('canvas');canvas.width=CROP.width;canvas.height=CROP.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.save();context.beginPath();BOUNDARY.forEach(([x,y],i)=>i?context.lineTo(x-CROP.x,y-CROP.y):context.moveTo(x-CROP.x,y-CROP.y));context.closePath();context.clip();
  context.drawImage(source,-CROP.x,-CROP.y);context.restore();
  const pixels=context.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;let inkPixels=0;
  for(let i=0;i<data.length;i+=4){
    const alpha=Math.round(data[i+3]*blueInk(data[i],data[i+1],data[i+2]));
    data[i]=36;data[i+1]=86;data[i+2]=181;data[i+3]=alpha;
    if(alpha>16)inkPixels++;
  }
  context.putImageData(pixels,0,0);return {canvas,inkPixels};
}

/** Same-pose line plate and continuous development, as used by plan4's flight introduction. */
export class BlueprintWing {
  constructor(source,skeleton) {
    const {canvas,inkPixels}=separateInk(source);this.inkPixels=inkPixels;
    this.texture=new THREE.CanvasTexture(canvas);this.texture.colorSpace=THREE.SRGBColorSpace;this.texture.anisotropy=8;
    const geometry=new THREE.PlaneGeometry(CROP.width,CROP.height,64,32),p=geometry.attributes.position,uv=geometry.attributes.uv;
    const indices=[],weights=[];let nearest=Infinity;this.probeIndex=0;
    for(let i=0;i<p.count;i++){
      const x=CROP.x+uv.getX(i)*CROP.width,y=CROP.y+(1-uv.getY(i))*CROP.height;
      const [px,py]=blueprintPoint(x,y);p.setXYZ(i,px-836,470.5-py,-75);
      const skin=blueprintWeights(x);indices.push(...skin.indices);weights.push(...skin.weights);
      const distance=(x-1630)**2+(y-155)**2;if(distance<nearest){nearest=distance;this.probeIndex=i;}
    }
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    this.develop={value:0};
    this.material=new THREE.MeshBasicMaterial({map:this.texture,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,toneMapped:false});
    this.material.onBeforeCompile=shader=>{
      shader.uniforms.uDevelop=this.develop;shader.uniforms.uStudyInk={value:new THREE.Color('#8d9caf')};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vBlueprintUV;');
      shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvBlueprintUV=uv;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vBlueprintUV; uniform float uDevelop; uniform vec3 uStudyInk;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float front=1.0-smoothstep(uDevelop*1.12-0.045,uDevelop*1.12+0.045,vBlueprintUV.x);
        diffuseColor.rgb=mix(uStudyInk,diffuseColor.rgb,front);
        diffuseColor.a*=mix(0.12,1.0,front);
      `);
    };
    this.material.customProgramCacheKey=()=> 'reference-blue-wing-development';
    this.mesh=new THREE.SkinnedMesh(geometry,this.material);this.mesh.bind(skeleton);this.mesh.frustumCulled=false;this.mesh.renderOrder=-20;
    this.probe=new THREE.Vector3();
  }
  update(pose) {this.develop.value=pose.outline;this.material.opacity=pose.bodyOpacity*.82;this.mesh.visible=pose.bodyOpacity>.001;}
  diagnostics() {
    this.mesh.getVertexPosition(this.probeIndex,this.probe);
    return {progress:this.develop.value,inkPixels:this.inkPixels,visible:this.mesh.visible,tip:[this.probe.x+836,470.5-this.probe.y]};
  }
  dispose() {this.texture.dispose();}
}
