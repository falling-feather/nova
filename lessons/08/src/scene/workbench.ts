import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { quadMatrix,type Quad,type PlanePoint } from '../ui/plane-projection.ts';
import { craftedMaterial,grainTexture,rulerTexture,waveTexture,eyeTexture,contactTexture } from './materials.ts';
import { SIZE } from '../core/diffusion.ts';

type Bindings={object:HTMLElement;inspector:HTMLElement;tools:HTMLElement;task:HTMLElement;timeline?:HTMLElement;companion:HTMLElement};
// 木柄沿尺身的行程（ruler 局部坐标）：tide=0 在 KNOB_FROM，tide=1 在 KNOB_FROM+KNOB_SPAN
const KNOB_FROM=-2.18,KNOB_SPAN=5.24;
type Projected={el:HTMLElement;prefix:string;width:number;height:number};

/** The authored GLB owns the physical positions. DOM controls project onto its anchors. */
export class CoastalWorkbench {
  readonly el=document.createElement('div');
  private renderer:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(28,1,.1,120);
  private model!:THREE.Group;
  private width=1;private height=1;private frame=0;private lastTime=0;
  private focused=true;private view=18;private targetView=18;
  private target=new THREE.Vector3(0,.4,.2);
  private pointer=new THREE.Vector2();
  private projected:Projected[]=[];
  private binding?:Bindings;
  private texture?:THREE.CanvasTexture;
  private sand:THREE.Mesh;
  private sandWidth=1;private sandDepth=1;private sandOrigin=new THREE.Vector3();
  private selection:THREE.LineLoop;
  private brushCursor:THREE.LineLoop;
  private detachCanvas?:()=>void;
  private tools=new Map<string,{root:THREE.Object3D;button?:HTMLElement;rest:number;hover:number}>();
  private contacts=new Map<string,THREE.Mesh>();
  private sun=new THREE.DirectionalLight('#fff0ce',2.7);
  private sky=new THREE.HemisphereLight('#b9e7f6','#b99562',1.1);
  private tide=0;private knob?:THREE.Object3D;
  private rulerHalo?:THREE.Group;
  private eyes?:THREE.Mesh;
  private rulerMarks?:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  private rulerLabel='潮水尺';
  private reduced=false;private needLayout=true;
  private host:HTMLElement;

  constructor(host:HTMLElement,reduced:boolean){
    this.host=host;this.reduced=reduced;this.el.className='workbench-scene';this.el.setAttribute('aria-hidden','true');
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.9;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.VSMShadowMap;
    this.el.append(this.renderer.domElement);
    this.camera.position.set(0,8.8,17);this.camera.lookAt(this.target);
    this.sun.position.set(8,14,-7);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);
    Object.assign(this.sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.5,far:45});
    this.sun.shadow.normalBias=.025;this.sun.shadow.bias=-.00007;this.sun.shadow.radius=4;this.sun.shadow.blurSamples=6;
    this.scene.add(this.sun,this.sky);
    const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();
    this.scene.environment=pmrem.fromScene(room,.04).texture;this.scene.environmentIntensity=.25;room.dispose();pmrem.dispose();
    const fill=new THREE.DirectionalLight('#fff1d7',.5);fill.position.set(-9,7,10);this.scene.add(fill);
    this.sand=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({color:'#e5c594',roughness:.94,polygonOffset:true,polygonOffsetFactor:-1}));
    this.sand.rotation.x=-Math.PI/2;this.sand.receiveShadow=true;
    const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,0,-.5),new THREE.Vector3(.5,0,.5),new THREE.Vector3(-.5,0,.5)]);
    this.selection=new THREE.LineLoop(geo,new THREE.LineBasicMaterial({color:'#42b4a5',transparent:true,opacity:.9}));
    this.selection.visible=false;this.scene.add(this.selection);
    this.brushCursor=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:64},(_,i)=>new THREE.Vector3(Math.cos(i/64*Math.PI*2),0,Math.sin(i/64*Math.PI*2)))),new THREE.LineBasicMaterial({color:'#368e91',transparent:true,opacity:.9}));
    this.brushCursor.visible=false;
    new ResizeObserver(()=>this.resize()).observe(host);
    host.addEventListener('pointermove',e=>{this.pointer.set(e.clientX/this.width*2-1,e.clientY/this.height*2-1);});
    host.addEventListener('pointerleave',()=>this.pointer.set(0,0));
  }

  async load(){
    const gltf=await new GLTFLoader().loadAsync(new URL('./assets/coastal-workbench.glb',import.meta.url).href);
    this.model=gltf.scene;
    const [wood,paper]=await Promise.all([new THREE.TextureLoader().loadAsync(new URL('../../../../shared/art/wood.webp',import.meta.url).href),new THREE.TextureLoader().loadAsync(new URL('../../../../shared/art/paper.webp',import.meta.url).href)]),sandGrain=grainTexture();
    wood.colorSpace=THREE.SRGBColorSpace;wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.anisotropy=8;
    paper.colorSpace=THREE.SRGBColorSpace;paper.anisotropy=8;
    const materials=new Map<string,THREE.Material>();
    this.model.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;
      o.castShadow=true;o.receiveShadow=true;
      const old=o.material as THREE.MeshStandardMaterial,name=old.name;
      if(!materials.has(name)){
        if(name.startsWith('oak'))materials.set(name,craftedMaterial(name,wood));
        else if(name==='sand_grain')materials.set(name,new THREE.MeshStandardMaterial({color:'#dfbe8e',roughness:.98,map:sandGrain,bumpMap:sandGrain,bumpScale:.018}));
        else if(name==='paper')materials.set(name,new THREE.MeshStandardMaterial({color:'#fff4dd',map:paper,roughness:.95,emissive:'#e9dbb7',emissiveIntensity:.2}));
        else if(name==='teal_enamel')materials.set(name,new THREE.MeshPhysicalMaterial({color:old.color,metalness:.25,roughness:.28,clearcoat:.8,clearcoatRoughness:.2,envMapIntensity:1.4}));
        else if(name==='ivory_ceramic')materials.set(name,new THREE.MeshPhysicalMaterial({color:old.color,roughness:.26,clearcoat:.3,clearcoatRoughness:.2,envMapIntensity:1.1}));
        else {const m=old.clone();m.envMapIntensity=.5;if(name==='eye_glow'){m.emissive.set('#65efff');m.emissiveIntensity=2.5;}materials.set(name,m);}
      }
      o.material=name==='oak_table'?craftedMaterial(name,wood,Number(o.name.match(/\d+/)?.[0]??0)):materials.get(name)!;
      if(o.name.startsWith('eye_smile'))o.visible=false;
    });
    this.scene.add(this.model);
    const tl=this.node('anchor_sand_tl').position,tr=this.node('anchor_sand_tr').position,br=this.node('anchor_sand_br').position;
    this.sandWidth=tr.x-tl.x;this.sandDepth=br.z-tr.z;this.sandOrigin.copy(tl).add(br).multiplyScalar(.5);this.sandOrigin.y+=.002;
    this.sand.geometry.dispose();this.sand.geometry=new THREE.PlaneGeometry(this.sandWidth,this.sandDepth);this.sand.position.copy(this.sandOrigin);
    this.selection.scale.set(this.sandWidth/SIZE,1,this.sandDepth/SIZE);
    this.node('tray').add(this.sand,this.selection,this.brushCursor);
    this.eyes=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.56),new THREE.MeshBasicMaterial({map:eyeTexture(),transparent:true,depthWrite:false,toneMapped:false}));
    this.eyes.position.set(0,0,.577);this.node('robot_head').add(this.eyes);
    const contact=contactTexture();
    for(const [name,w,d]of [['tool_groove',1.7,1.3],['tool_smooth',1.8,1.5],['tool_flatten',1.8,1.1],['companion',1.7,1.3],['observation_board',3.6,1.4],['ruler',8,1.5]] as const){
      const p=this.node(name).getWorldPosition(new THREE.Vector3()),shadow=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:contact,transparent:true,depthWrite:false,opacity:.52}));shadow.rotation.x=-Math.PI/2;shadow.position.set(p.x,.007,p.z);this.scene.add(shadow);this.contacts.set(name,shadow);
    }
    const edgeSand=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.021,0),new THREE.MeshStandardMaterial({color:'#e6c99a',roughness:.9}),1800);
    let seed=808;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;},dummy=new THREE.Object3D();
    for(let i=0;i<1800;i++){const side=i%4,r=rand(),inset=rand()*.16;dummy.position.set(side<2?(side===0?-3.86:3.86)+(side===0?inset:-inset):(r-.5)*7.7,.32+rand()*.025,side<2?(r-.5)*7.4:(side===2?-3.72:3.72)+(side===2?inset:-inset));dummy.scale.setScalar(.5+rand());dummy.rotation.set(rand()*3,rand()*3,rand()*3);dummy.updateMatrix();edgeSand.setMatrixAt(i,dummy.matrix);}
    edgeSand.receiveShadow=true;this.node('tray').add(edgeSand);
    const bucketGrains=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.011,0),new THREE.MeshStandardMaterial({color:'#d2ad75',roughness:1}),2100);
    for(let i=0;i<2100;i++){const r=Math.sqrt(rand())*.625,t=rand()*Math.PI*2;dummy.position.set(Math.cos(t)*r,1.28+.055*(1-r*r/.39)+rand()*.018,Math.sin(t)*r);dummy.scale.setScalar(.65+rand());dummy.rotation.set(rand()*3,rand()*3,rand()*3);dummy.updateMatrix();bucketGrains.setMatrixAt(i,dummy.matrix);bucketGrains.setColorAt(i,new THREE.Color().setHSL(.1+rand()*.025,.34+rand()*.15,.59+rand()*.21));}
    bucketGrains.receiveShadow=true;this.node('tool_smooth').add(bucketGrains);
    for(const key of ['groove','smooth','flatten']){const root=this.node('tool_'+key);this.tools.set(key,{root,rest:root.position.y,hover:0});}
    this.knob=this.node('ruler_knob');
    const ring:THREE.Vector3[]=[];for(const side of [-1,1])for(let i=0;i<=32;i++){const t=(side===1?-Math.PI/2:Math.PI/2)+Math.PI*i/32;ring.push(new THREE.Vector3(side*3.195+.455*Math.cos(t),.16,.455*Math.sin(t)));}
    const curve=new THREE.CatmullRomCurve3(ring,true);this.rulerHalo=new THREE.Group();
    for(const [radius,opacity]of [[.014,1],[.055,.15]])this.rulerHalo.add(new THREE.Mesh(new THREE.TubeGeometry(curve,144,radius,6,true),new THREE.MeshBasicMaterial({color:'#69fff1',transparent:true,opacity,depthWrite:false,toneMapped:false})));
    this.rulerHalo.visible=false;this.node('ruler').add(this.rulerHalo);
    const cap=new THREE.Mesh(new THREE.PlaneGeometry(.42,.42),new THREE.MeshBasicMaterial({map:waveTexture(),transparent:true,depthWrite:false}));
    cap.rotation.x=-Math.PI/2;cap.position.y=.512;this.knob.add(cap);
    const marks=this.rulerMarks=new THREE.Mesh(new THREE.PlaneGeometry(6.6,.54),new THREE.MeshBasicMaterial({map:rulerTexture(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
    marks.rotation.x=-Math.PI/2;marks.position.set(0,.185,0);this.node('ruler').add(marks);
    this.host.classList.add('scene-ready');this.resize();this.render(0);
  }

  private node(name:string){const n=this.model.getObjectByName(name);if(!n)throw new Error('工作台缺少模型部件：'+name);return n;}
  private resize(){
    this.width=this.host.clientWidth;this.height=this.host.clientHeight;
    this.renderer.setSize(this.width,this.height,false);this.needLayout=true;
  }
  setReducedMotion(value:boolean){this.reduced=value;}
  toggleFocus(){this.focused=!this.focused;this.targetView=this.focused?18:21;this.needLayout=true;return this.focused;}
  get isFocused(){return this.focused;}
  highlightRuler(on:boolean){if(this.rulerHalo)this.rulerHalo.visible=on;}
  setTask(el:HTMLElement){const p=this.projected.find(p=>p.prefix==='task');if(p)p.el=el;if(this.binding)this.binding.task=el;this.needLayout=true;}
  setLocation(night:boolean){this.sun.intensity=night?.4:2.7;this.sky.intensity=night?.35:1.1;this.needLayout=true;}

  bind(b:Bindings){
    this.detachCanvas?.();this.binding=b;this.projected=[];
    const canvas=b.object.querySelector<HTMLCanvasElement>('.tray-canvas'),frame=b.object.querySelector<HTMLElement>('.tray-frame');
    const isSand=!!canvas&&!!frame;this.host.classList.toggle('is-sand-scene',isSand);
    this.node('tray').visible=isSand;this.node('observation_board').visible=isSand;this.node('task_sign').visible=isSand;this.sand.visible=isSand;this.selection.visible=false;this.brushCursor.visible=false;
    this.node('companion').visible=isSand;b.companion.hidden=!isSand;
    if(isSand){
      this.texture?.dispose();this.texture=new THREE.CanvasTexture(canvas);this.texture.colorSpace=THREE.SRGBColorSpace;this.texture.anisotropy=8;
      const mat=this.sand.material as THREE.MeshStandardMaterial;mat.map=this.texture;mat.color.set('#ffffff');mat.needsUpdate=true;
      const changed=()=>{this.texture!.needsUpdate=true;};
      const inspect=(e:Event)=>{const cell=(e as CustomEvent<number>).detail;this.selection.position.copy(this.sandOrigin).add(new THREE.Vector3(((cell%SIZE+.5)/SIZE-.5)*this.sandWidth,.01,((Math.floor(cell/SIZE)+.5)/SIZE-.5)*this.sandDepth));this.selection.visible=true;};
      const cursor=(e:Event)=>{const data=(e as CustomEvent<{point:[number,number];radius:number;brush:string}|null>).detail;this.brushCursor.visible=!!data;if(data){this.brushCursor.position.copy(this.sandOrigin).add(new THREE.Vector3((data.point[0]-.5)*this.sandWidth,.012,(data.point[1]-.5)*this.sandDepth));this.brushCursor.scale.set(data.radius/SIZE*this.sandWidth,1,data.radius/SIZE*this.sandDepth);(this.brushCursor.material as THREE.LineBasicMaterial).color.set(data.brush==='flatten'?'#fff5d8':'#368e91');}};
      canvas.addEventListener('sand:render',changed);canvas.addEventListener('sand:inspect',inspect);
      canvas.addEventListener('sand:cursor',cursor);
      this.detachCanvas=()=>{canvas.removeEventListener('sand:render',changed);canvas.removeEventListener('sand:inspect',inspect);canvas.removeEventListener('sand:cursor',cursor);};
      this.projected.push({el:frame,prefix:'sand',width:512,height:512},{el:b.inspector,prefix:'paper',width:320,height:366},{el:b.task,prefix:'task',width:230,height:250});
    }
    const input=b.timeline?.querySelector<HTMLInputElement>('input[type="range"]');
    const isRuler=!!input||!!b.timeline?.querySelector('.ruler-next');
    b.timeline?.classList.toggle('is-controls',!isRuler);
    this.node('ruler').visible=isRuler&&isSand;
    for(const [key,t]of this.tools){
      t.button=b.tools.querySelector<HTMLElement>(`[data-brush="${key}"]`)??undefined;
      t.root.visible=!!t.button;
      if(t.button){t.button.addEventListener('pointerenter',()=>{t.hover=1;});t.button.addEventListener('pointerleave',()=>{t.hover=0;});t.button.addEventListener('focus',()=>{t.hover=1;});t.button.addEventListener('blur',()=>{t.hover=0;});}
    }
    for(const [name,shadow]of this.contacts)shadow.visible=this.node(name).visible;
    const inputLabel=input?.getAttribute('aria-label')??'潮水尺';
    const label=({'回看真实步骤':'采样回放','两支签的混合比例':'混合比例'} as Record<string,string>)[inputLabel]??inputLabel;
    if(this.rulerMarks&&label!==this.rulerLabel){this.rulerMarks.material.map?.dispose();this.rulerMarks.material.map=rulerTexture(label);this.rulerMarks.material.needsUpdate=true;this.rulerLabel=label;}
    if(input){const update=()=>{const min=Number(input.min),span=Number(input.max)-min;this.tide=span>0?THREE.MathUtils.clamp((Number(input.value)-min)/span,0,1):0;};input.addEventListener('input',update);update();}else this.tide=0;
    this.needLayout=true;
  }

  private screen(p:THREE.Vector3):PlanePoint{const v=p.clone().project(this.camera);return [(v.x+1)*this.width/2,(1-v.y)*this.height/2];}
  private quad(prefix:string):Quad{return ['tl','tr','br','bl'].map(s=>this.screen(this.node('anchor_'+prefix+'_'+s).getWorldPosition(new THREE.Vector3()))) as unknown as Quad;}
  private box(root:THREE.Object3D){
    const box=new THREE.Box3().setFromObject(root),points:PlanePoint[]=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(this.screen(new THREE.Vector3(x,y,z)));
    return {left:Math.min(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),right:Math.max(...points.map(p=>p[0])),bottom:Math.max(...points.map(p=>p[1]))};
  }
  // 木柄（3D 旋钮）就是滑条的拇指：按木柄在 0 与满格两端的投影摆放透明 range，
  // 让拇指与木柄重合（按住木柄拖不会跳值），尺身其余部分点按仍可直接定位。
  private placeRulerInput(left:number,top:number){
    const tl=this.binding?.timeline,k=this.knob,vars=['--knob-left','--knob-track','--knob-size','--knob-top'];if(!tl)return;
    if(!k||!this.host.classList.contains('is-sand-scene')||tl.classList.contains('is-controls')||!tl.querySelector('input[type="range"]')){for(const v of vars)tl.style.removeProperty(v);return;}
    const x=k.position.x,at=(t:number)=>{k.position.x=KNOB_FROM+t*KNOB_SPAN;k.updateMatrixWorld(true);return this.box(k);};
    const a=at(0),b=at(1);k.position.x=x;k.updateMatrixWorld(true);
    const size=Math.max(34,(a.right-a.left+b.right-b.left)/2),from=(a.left+a.right)/2,to=(b.left+b.right)/2;
    tl.style.setProperty('--knob-left',from-size/2-left+'px');
    tl.style.setProperty('--knob-track',to-from+size+'px');
    tl.style.setProperty('--knob-size',size+'px');
    tl.style.setProperty('--knob-top',Math.min(0,Math.min(a.top,b.top)-top)+'px');
  }
  private placeBox(el:HTMLElement,root:THREE.Object3D,pad=0){const r=this.box(root);Object.assign(el.style,{left:r.left-pad+'px',top:r.top-pad+'px',width:r.right-r.left+pad*2+'px',height:r.bottom-r.top+pad*2+'px'});}
  private layout(){
    if(!this.binding)return;
    for(const {el,prefix,width,height}of this.projected){const transform=quadMatrix(this.quad(prefix),width,height);if(transform)Object.assign(el.style,{width:width+'px',height:height+'px',transform});}
    for(const t of this.tools.values())if(t.button)this.placeBox(t.button,t.root,5);
    this.placeBox(this.binding.companion,this.node('companion'),4);
    if(this.binding.timeline){
      const q=this.quad('ruler'),minX=Math.min(...q.map(p=>p[0])),maxX=Math.max(...q.map(p=>p[0])),y=Math.max(...q.map(p=>p[1]));
      const top=this.binding.timeline.classList.contains('is-controls')?Math.min(...q.map(p=>p[1])):y-30;
      Object.assign(this.binding.timeline.style,{left:minX+'px',top:top+'px',width:maxX-minX+'px'});
      this.host.style.setProperty('--ruler-y',Math.min(...q.map(p=>p[1]))+'px');
      this.placeRulerInput(minX,top);
    }
    const contextual=this.binding.tools.classList.contains('context-tools');
    const shelf=this.binding.tools.querySelector<HTMLElement>('.seed-board');
    if(shelf&&this.host.classList.contains('is-sand-scene')){
      const tray=this.box(this.node('tray')),sign=this.box(this.node('task_sign'));
      const width=Math.min(246,Math.max(160,tray.left-56));this.binding.tools.style.setProperty('--utility-width',width+'px');
      const dock=this.host.querySelector<HTMLElement>('.activity-dock'),bottom=dock?.offsetTop??this.height-130;
      this.binding.tools.style.setProperty('--utility-x',Math.max(24,(tray.left-width)/2)+width/2+'px');
      this.binding.tools.style.setProperty('--utility-y',Math.max(150,Math.min(sign.bottom+16,bottom-shelf.offsetHeight-20))+'px');
    }else{
      const corner=this.screen(contextual?new THREE.Vector3(-5.9,1.5,.3):new THREE.Vector3(-5.65,.2,4.22));this.binding.tools.style.setProperty('--utility-x',corner[0]+'px');this.binding.tools.style.setProperty('--utility-y',corner[1]+'px');
    }
    const trayLabel=this.binding.object.querySelector<HTMLElement>('.tray-label');if(trayLabel){const p=this.screen(new THREE.Vector3(0,.42,3.94));Object.assign(trayLabel.style,{left:p[0]+'px',top:p[1]-14+'px'});}
  }
  private render=(time:number)=>{
    this.frame=requestAnimationFrame(this.render);
    if(time-this.lastTime<1000/30&&time!==0)return;this.lastTime=time;
    const changed=Math.abs(this.targetView-this.view)>.002;
    if(changed){this.view=this.reduced?this.targetView:THREE.MathUtils.lerp(this.view,this.targetView,.16);this.needLayout=true;}
    if(this.needLayout){
      this.camera.aspect=this.width/this.height;const distance=this.camera.position.distanceTo(this.target);
      this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(this.view/(2*distance*this.camera.aspect)));
      this.camera.updateProjectionMatrix();this.scene.updateMatrixWorld(true);this.layout();this.needLayout=false;
    }
    for(const t of this.tools.values()){t.root.position.y=THREE.MathUtils.lerp(t.root.position.y,t.rest+(this.reduced?0:t.hover*.06),.18);}
    if(this.knob)this.knob.position.x=KNOB_FROM+this.tide*KNOB_SPAN;
    const head=this.model?.getObjectByName('robot_head');
    if(head&&!this.reduced){head.rotation.y=THREE.MathUtils.lerp(head.rotation.y,this.pointer.x*.12,.05);head.rotation.x=THREE.MathUtils.lerp(head.rotation.x,this.pointer.y*.05,.05);}
    if(this.eyes&&!this.reduced){const blink=time%5600;this.eyes.scale.y=blink>5250?Math.max(.13,Math.abs(blink-5425)/175):1;}
    this.renderer.render(this.scene,this.camera);
  };
}
