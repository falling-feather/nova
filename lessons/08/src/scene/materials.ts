import * as THREE from 'three';

/** Fine physical sand grain; independent of the lesson image and its values. */
export function grainTexture(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const c=canvas.getContext('2d')!,im=c.createImageData(canvas.width,canvas.height);
  let seed=808;const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const p=(y*canvas.width+x)*4,n=noise();
    const v=.82+n*.18;
    im.data[p]=im.data[p+1]=im.data[p+2]=Math.round(v*255);im.data[p+3]=255;
  }
  c.putImageData(im,0,0);
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;
  return t;
}

export function craftedMaterial(name:string,grain:THREE.Texture,plank=0):THREE.MeshPhysicalMaterial{
  const tint=name==='oak_light'?2.3:name==='oak_end'?1.1:1.7;
  const m=new THREE.MeshPhysicalMaterial({color:name==='oak_inlay'?'#e7c28b':'#fff3df',roughness:.46,metalness:0,clearcoat:.15,clearcoatRoughness:.42,bumpMap:grain,bumpScale:name==='oak_inlay'?.004:.012});
  m.name=name;
  m.onBeforeCompile=s=>{
    s.uniforms.craftedGrain={value:grain};
    s.uniforms.craftOffset={value:new THREE.Vector2((Math.sin(plank*13.7)*.5+.5)*.7,(Math.sin(plank*8.2)*.5+.5)*.5)};
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCraftPosition;varying vec3 vCraftNormal;');
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCraftPosition=(modelMatrix*vec4(position,1.)).xyz;vCraftNormal=normalize(mat3(modelMatrix)*normal);');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D craftedGrain;uniform vec2 craftOffset;varying vec3 vCraftPosition;varying vec3 vCraftNormal;');
    const tone=name==='oak_inlay'?'mix(vec3(1.),texture2D(craftedGrain,craftUV).rgb*3.0,.12)':`texture2D(craftedGrain,craftUV).rgb*${tint.toFixed(1)}`;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nvec3 cn=abs(normalize(vCraftNormal));vec2 craftUV=(cn.y>.55?vCraftPosition.xz*vec2(.10,.12):(cn.x>.55?vCraftPosition.zy*vec2(.10,.20):vCraftPosition.xy*vec2(.10,.20)))+craftOffset;diffuseColor.rgb*=${tone};`);
  };
  m.customProgramCacheKey=()=>`crafted-${name}`;
  return m;
}

export function rulerTexture(label='潮水尺'){
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=160;
  const c=canvas.getContext('2d')!;c.clearRect(0,0,1536,160);c.fillStyle='#246d8b';c.strokeStyle='#3183a1';
  c.lineWidth=3;c.beginPath();c.moveTo(260,128);c.lineTo(1480,128);c.stroke();
  for(let i=0;i<=100;i++){
    const x=260+i*12.2;c.lineWidth=i%10===0?3:1.6;c.beginPath();c.moveTo(x,i%10===0?55:i%5===0?75:91);c.lineTo(x,128);c.stroke();
  }
  c.font='bold '+(label.length>3?36:49)+'px "Microsoft YaHei UI",sans-serif';c.fillText(label,35,105);
  c.lineWidth=6;c.beginPath();c.moveTo(183,105);c.bezierCurveTo(220,100,205,68,229,68);c.bezierCurveTo(251,68,229,106,246,106);c.stroke();
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function waveTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d')!;c.strokeStyle='#ffedc9';c.lineWidth=8;c.lineCap='round';
  c.beginPath();c.arc(128,128,107,0,Math.PI*2);c.stroke();c.lineWidth=11;
  c.beginPath();c.moveTo(58,153);c.bezierCurveTo(126,161,99,82,145,86);c.bezierCurveTo(195,89,126,166,194,146);c.stroke();
  c.lineWidth=6;c.beginPath();c.moveTo(58,176);c.bezierCurveTo(104,190,149,158,197,170);c.stroke();
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function eyeTexture(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d')!;c.strokeStyle='#76f6ff';c.lineWidth=12;c.lineCap='round';c.shadowColor='#35d5ff';c.shadowBlur=20;
  for(const x of [140,372]){c.beginPath();c.arc(x,147,49,Math.PI,Math.PI*2);c.stroke();}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function contactTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d')!,g=c.createRadialGradient(64,64,8,64,64,62);
  g.addColorStop(0,'rgba(45,29,12,.6)');g.addColorStop(.5,'rgba(45,29,12,.3)');g.addColorStop(1,'rgba(45,29,12,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(canvas);
}
