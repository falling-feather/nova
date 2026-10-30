import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { WorldState, ToolReceipt, Faults } from './engine/types.ts';

type Point = [number, number, number];
type SceneTool = 'observe' | 'water' | 'ventilate' | 'shade';
type DisplayState={water:number;vent:number;shade:number;moisture:number;wheel:number};
export type SceneView='overview'|'probe'|'water'|'climate';

/** A physical view of the simulator. It cannot alter state except through the existing tool executor. */
export class GreenhouseScene {
  private renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'low-power'});
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
  private controls: OrbitControls;
  private host?:HTMLElement;
  private frame=0;
  private observer:ResizeObserver;
  private raycaster=new THREE.Raycaster();
  private targets:THREE.Object3D[]=[];
  private markers:Array<{button:HTMLButtonElement;point:THREE.Vector3}>=[];
  private markerLines=document.createElementNS("http://www.w3.org/2000/svg","svg");
  private leaves:THREE.Mesh[]=[];
  private water:THREE.Mesh;
  private soil:THREE.Mesh;
  private probe:THREE.Mesh;
  private valve:THREE.Mesh;
  private shade:THREE.Mesh;
  private vent:THREE.Group;
  private flow:THREE.Points;
  private flowUntil=0;
  private sun:THREE.DirectionalLight;
  private shown?:DisplayState;
  private transition:{from:DisplayState;to:DisplayState;start:number}|null=null;
  private cameraMove:{from:THREE.Vector3;to:THREE.Vector3;fromTarget:THREE.Vector3;toTarget:THREE.Vector3;start:number}|null=null;
  private wheel=0;
  private hoverTool:SceneTool|null=null;
  private halo=new THREE.Mesh(new THREE.TorusGeometry(.19,.009,6,32),new THREE.MeshBasicMaterial({color:0xbce9d4,transparent:true,opacity:.85,depthTest:false}));
  private lastReceipt='';
  private disabled=false;
  private viewChanged=()=>this.invalidate();
  constructor(private onTool:(tool:SceneTool)=>void) {
    const r=this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio,1.5));
    r.outputColorSpace=THREE.SRGBColorSpace;
    r.toneMapping=THREE.ACESFilmicToneMapping;
    r.toneMappingExposure=1.1;
    r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate=false;
    r.domElement.className='greenhouse-canvas';
    r.domElement.setAttribute('aria-label','三维模拟温室；拖动旋转，滚轮缩放。探针与阀门也可使用下方按钮操作。');
    r.domElement.setAttribute('role','img');
    this.camera.position.set(5.8,4.1,6.8);
    this.controls=new OrbitControls(this.camera,r.domElement);
    this.controls.target.set(0,1.25,0);
    this.controls.minDistance=3;this.controls.maxDistance=12;
    this.controls.minPolarAngle=.25;this.controls.maxPolarAngle=Math.PI*.46;
    this.controls.enablePan=false;this.controls.enableDamping=false;
    this.controls.update();this.controls.addEventListener('change',this.viewChanged);
    this.scene.add(new THREE.HemisphereLight(0xd7f5ff,0x18374b,2.4));
    const sun=this.sun=new THREE.DirectionalLight(0xffe7bb,3.8);sun.position.set(-3,6,4);
    sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.018;
    Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:14});
    this.scene.add(sun);
    const rim=new THREE.DirectionalLight(0x56c8e8,2);rim.position.set(3,2,-4);this.scene.add(rim);
    const metal=this.material('#4a7187',.35,.65),edge=this.material('#a7c3ca',.35,.45);
    const dark=this.material('#183b51',.65,.25),brass=this.material('#b6a479',.4,.5);
    const soilMat=this.material('#4d4034',1,0);
    const glass=new THREE.MeshPhysicalMaterial({color:'#94d4de',transparent:true,opacity:.105,roughness:.12,metalness:.1,side:THREE.DoubleSide,depthWrite:false});
    this.box([4.9,.16,3.7],[0,0,0],dark);
    this.box([4.8,.035,3.6],[0,.095,0],this.material('#3d5b65',.85,.1));
    const grid=new THREE.GridHelper(4.6,23,0x60939e,0x466b77);grid.position.y=.12;this.scene.add(grid);
    for(let x=-2.2;x<=2.21;x+=.44) this.box([.015,.009,3.45],[x,.12,0],metal);
    // Open front and roof ribs keep the plants and machinery visible.
    for(const z of [-1.55,0,1.55]) {
      this.pipe([[-2.05,.15,z],[-2.05,2.25,z],[0,3.35,z],[2.05,2.25,z],[2.05,.15,z]],.035,edge);
      this.pipe([[-2.05,1.25,z],[2.05,1.25,z]],.018,metal);
    }
    for(const x of [-2.05,2.05]) for(const y of [.18,1.25,2.25]) this.pipe([[x,y,-1.55],[x,y,1.55]],.028,edge);
    this.pipe([[0,3.35,-1.55],[0,3.35,1.55]],.03,edge);
    for(const x of [-1.35,-.68,.68,1.35]) this.pipe([[x,3.35-Math.abs(x)*.536,-1.55],[x,3.35-Math.abs(x)*.536,1.55]],.015,metal);
    for(const z of [-1.55,.01,1.55]) for(const x of [-2.05,2.05]) this.box([.13,.08,.13],[x,.16,z],brass);
    this.box([.015,2.08,3.05],[-2.05,1.2,0],glass);
    this.box([4.05,2.08,.015],[0,1.2,-1.55],glass);
    // A bed built from frame, soil, aggregate, root stems and individual leaf surfaces.
    this.box([2.7,.48,1.65],[-.5,.37,.02],this.material('#6d807c',.8,.05));
    this.soil=this.box([2.51,.1,1.47],[-.5,.64,.02],soilMat);
    for(const x of [-1.86,.86])this.box([.1,.14,1.8],[x,.65,.02],edge);
    for(const z of [-.85,.89])this.box([2.81,.14,.1],[-.5,.65,z],edge);
    const pebbleG=new THREE.IcosahedronGeometry(.025,0),pebbles=new THREE.InstancedMesh(pebbleG,this.material('#7e7154',1,0),240),d=new THREE.Object3D();
    for(let i=0;i<240;i++){const q=this.noise(i+17),t=this.noise(i+751);d.position.set(-1.72+q*2.43,.7,-.64+t*1.3);d.scale.setScalar(.5+this.noise(i+310));d.rotation.set(q*5,t*4,q*8);d.updateMatrix();pebbles.setMatrixAt(i,d.matrix);}pebbles.castShadow=true;this.scene.add(pebbles);
    for(let row=0;row<2;row++)for(let i=0;i<4;i++)this.plant(-1.5+i*.64,-.43+row*.86,.7,i+row*4);
    // Water tank, visible liquid, straps, level marks and delivery pipe.
    const tankGlass=new THREE.MeshPhysicalMaterial({color:'#a0d2da',metalness:.1,roughness:.18,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false});
    this.cylinder(.49,.49,1.75,[1.45,1.05,-.56],tankGlass);
    this.water=this.cylinder(.445,.445,1.53,[1.45,1.02,-.56],new THREE.MeshStandardMaterial({color:'#299cbe',roughness:.24,metalness:.2,transparent:true,opacity:.72}));
    for(const y of [.22,.39,1.64,1.93])this.cylinder(.51,.51,.065,[1.45,y,-.56],metal);
    this.cylinder(.47,.51,.12,[1.45,2.0,-.56],dark);
    this.box([.08,.07,.30],[1.45,2.1,-.56],edge);
    for(let i=0;i<7;i++)this.box([i%2===0?.2:.12,.018,.025],[1.54,.4+i*.21,-.08],edge);
    this.pipe([[1.45,.25,-.1],[1.45,.25,1.17],[-.35,.25,1.17],[-.35,.91,1.17],[-.35,.91,.35]],.062,metal);
    for(const z of [-.05,.4,.8,1.17])this.cylinder(.082,.082,.055,[1.45,.25,z],brass,Math.PI/2);
    this.box([.43,.36,.4],[.9,.32,1.17],dark);this.cylinder(.16,.16,.45,[.9,.33,1.17],metal,Math.PI/2);
    this.valve=new THREE.Mesh(new THREE.TorusGeometry(.17,.024,8,24),this.material('#65cbd9',.3,.5));
    this.valve.position.set(1.46,.48,.55);this.valve.rotation.x=Math.PI/2;this.valve.userData.tool='water';this.scene.add(this.valve);this.targets.push(this.valve);
    this.pipe([[1.46,.30,.55],[1.46,.49,.55]],.025,brass);
    for(const a of [0,Math.PI/2]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.31,.025,.015),edge);bar.rotation.z=a;bar.userData.tool='water';this.valve.add(bar);this.targets.push(bar);}
    this.pipe([[-.25,.8,.6],[-.25,1.38,.6]],.018,brass);
    this.box([.23,.31,.12],[-.25,1.42,.6],dark);
    this.probe=this.box([.17,.17,.013],[-.25,1.46,.668],new THREE.MeshStandardMaterial({color:'#61e5db',emissive:'#30b9c2',emissiveIntensity:.7,roughness:.35}));
    this.probe.userData.tool='observe';this.targets.push(this.probe);
    this.vent=new THREE.Group();this.vent.position.set(0,2.18,-1.55);this.scene.add(this.vent);
    const ventPanel=new THREE.Mesh(new THREE.PlaneGeometry(.85,.62),glass);ventPanel.position.y=.31;this.vent.add(ventPanel);ventPanel.userData.tool='ventilate';this.targets.push(ventPanel);
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(ventPanel.geometry),new THREE.LineBasicMaterial({color:'#a9cfd4'}));outline.position.copy(ventPanel.position);this.vent.add(outline);
    this.shade=this.box([3.35,.015,2.7],[0,2.37,0],new THREE.MeshStandardMaterial({color:'#213e4c',roughness:1,transparent:true,opacity:.82,side:THREE.DoubleSide}));
    const shadeRoll=this.cylinder(.065,.065,3.48,[0,2.38,-1.35],metal);shadeRoll.rotation.z=Math.PI/2;
    const shadeControl=this.box([.17,.2,.08],[1.89,2.20,1.60],brass);shadeControl.userData.tool='shade';this.targets.push(shadeControl);
    for(const [tool,label,point] of [
      ['observe','读取探针',[-.25,1.65,.67]],['water','供水阀门',[1.5,.70,.75]],
      ['ventilate','通风窗',[0,2.7,-1.55]],['shade','遮阳控制',[1.89,2.42,1.6]],
    ] as Array<[SceneTool,string,Point]>){const button=document.createElement('button');button.className='field-hotspot';button.dataset.tool=tool;button.innerHTML='<i>'+String(this.markers.length+1).padStart(2,'0')+'</i>'+label;button.addEventListener('mouseenter',()=>this.setHover(tool));button.addEventListener('mouseleave',()=>this.setHover(null));button.addEventListener('focus',()=>this.setHover(tool));button.addEventListener('blur',()=>this.setHover(null));this.markers.push({button,point:new THREE.Vector3(...point)});}
    const drops=new Float32Array(30*3);for(let i=0;i<30;i++)drops.set([-.35+Math.sin(i)*.075,.75+(i%10)*.016,.35+Math.cos(i)*.075],i*3);
    const dropGeometry=new THREE.BufferGeometry();dropGeometry.setAttribute('position',new THREE.BufferAttribute(drops,3));
    this.flow=new THREE.Points(dropGeometry,new THREE.PointsMaterial({color:'#a1f3ff',size:.035,transparent:true,opacity:.9}));this.flow.visible=false;this.scene.add(this.flow);
    this.halo.visible=false;this.halo.renderOrder=4;this.scene.add(this.halo);
    let down:Point|null=null;
    r.domElement.addEventListener('pointerdown',e=>{this.cameraMove=null;down=[e.clientX,e.clientY,e.button];});
    r.domElement.addEventListener('pointerup',e=>{if(!down||down[2]!==0||this.disabled||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=r.domElement.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),this.camera);const hit=this.raycaster.intersectObjects(this.targets,false)[0];if(hit)this.onTool(hit.object.userData.tool as SceneTool);down=null;});
    r.domElement.addEventListener('pointermove',e=>{if(e.buttons)return;const rect=r.domElement.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),this.camera);const hit=this.raycaster.intersectObjects(this.targets,false)[0];this.setHover(hit?hit.object.userData.tool as SceneTool:null);});
    r.domElement.addEventListener('pointerleave',()=>this.setHover(null));
    this.markerLines.classList.add('field-marker-links');this.markerLines.setAttribute('aria-hidden','true');
    this.markers.forEach(()=>this.markerLines.append(document.createElementNS('http://www.w3.org/2000/svg','path')));
    this.observer=new ResizeObserver(()=>this.resize());
    document.addEventListener('visibilitychange',this.viewChanged);
  }
  private noise(n:number){const x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x);}
  private material(color:string,roughness=.75,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
  private box(size:Point,pos:Point,material:THREE.Material){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
  private cylinder(top:number,bottom:number,height:number,pos:Point,material:THREE.Material,rotation=0){const m=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,32),material);m.position.set(...pos);m.rotation.x=rotation;m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
  private pipe(points:Point[],radius:number,material:THREE.Material){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'catmullrom',0);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,points.length*12,radius,8,false),material);mesh.castShadow=true;this.scene.add(mesh);return mesh;}
  private plant(x:number,z:number,y:number,index:number){
    const height=.55+this.noise(index+10)*.3;
    this.pipe([[x,y,z],[x+.03,y+height*.5,z],[x-.02,y+height,z+.02]],.012,this.material('#477547',.8));
    const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.22,.07,-.17,.30,0,.43);shape.bezierCurveTo(.17,.30,.22,.07,0,0);
    const leafGeometry=new THREE.ShapeGeometry(shape,10);
    const leafVertices=leafGeometry.attributes.position;for(let j=0;j<leafVertices.count;j++)leafVertices.setZ(j,Math.sin(leafVertices.getY(j)/.43*Math.PI)*.04-Math.abs(leafVertices.getX(j))*.08);leafGeometry.computeVertexNormals();
    for(let i=0;i<6;i++){
      const leaf=new THREE.Mesh(leafGeometry,this.material(i%2?'#518f62':'#83aa62',.78));(leaf.material as THREE.MeshStandardMaterial).side=THREE.DoubleSide;
      leaf.position.set(x,y+.13+i*height*.13,z);leaf.rotation.set(.4+(i%2)*.3,index+i*2.4,(i%2?1:-1)*.45);leaf.scale.setScalar(.55+this.noise(index*7+i)*.6);leaf.castShadow=true;leaf.receiveShadow=true;
      leaf.userData.baseRotation=leaf.rotation.x;this.leaves.push(leaf);this.scene.add(leaf);
      const vein=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,.003),new THREE.Vector3(0,.1,.03),new THREE.Vector3(0,.21,.043),new THREE.Vector3(0,.3,.035),new THREE.Vector3(0,.37,.02)]),new THREE.LineBasicMaterial({color:'#b1c889',transparent:true,opacity:.6}));leaf.add(vein);
    }
  }
  mount(host:HTMLElement,world:WorldState,receipt:ToolReceipt|undefined,faults:Faults,disabled:boolean){
    if(host!==this.host){this.observer.disconnect();this.host=host;host.prepend(this.renderer.domElement);host.append(this.markerLines);this.markers.forEach(m=>host.append(m.button));host.classList.add('rendered');this.observer.observe(host);}
    this.disabled=disabled;if(disabled)this.setHover(null);this.markers.forEach(m=>m.button.disabled=disabled);
    (this.probe.material as THREE.MeshStandardMaterial).color.set(faults.sensorOffline?'#ed785c':'#61e5db');
    (this.probe.material as THREE.MeshStandardMaterial).emissive.set(faults.sensorOffline?'#9c321d':'#30b9c2');
    (this.valve.material as THREE.MeshStandardMaterial).color.set(faults.pumpBlocked?'#e8a66c':'#65cbd9');
    if(receipt&&receipt.input.requestId!==this.lastReceipt){this.lastReceipt=receipt.input.requestId;this.flowUntil=receipt.applied&&receipt.deliveredMl>0?performance.now()+950:0;if(receipt.applied&&receipt.input.tool==='water')this.wheel+=Math.PI/2;}
    const target:DisplayState={water:Math.max(0,Math.min(1,world.tankMl/300)),moisture:world.moisture,vent:world.vent?-.7:0,shade:world.shade?1:0,wheel:this.wheel};
    const previous=this.transition?.to??this.shown;
    if(!this.shown||!this.motionEnabled()){this.transition=null;this.shown=target;this.applyDisplay(target);}
    else if(JSON.stringify(previous)!==JSON.stringify(target))this.transition={from:{...this.shown},to:target,start:performance.now()};
    this.sun.color.lerpColors(new THREE.Color('#e3f1ef'),new THREE.Color('#ffd39b'),THREE.MathUtils.clamp((world.temperature-20)/20,0,1));
    this.renderer.shadowMap.needsUpdate=true;this.resize();
  }
  reset(){this.focus('overview');}
  focus(view:SceneView){
    const poses:Record<SceneView,{eye:Point;target:Point}>={overview:{eye:[5.8,4.1,6.8],target:[0,1.25,0]},probe:{eye:[1.8,2.4,4.1],target:[-.25,1.1,.35]},water:{eye:[4.8,2.7,3.8],target:[1.2,.9,.2]},climate:{eye:[4.0,4.0,4.5],target:[.2,2.2,-.4]}};
    const pose=poses[view];
    this.cameraMove={from:this.camera.position.clone(),to:new THREE.Vector3(...pose.eye),fromTarget:this.controls.target.clone(),toTarget:new THREE.Vector3(...pose.target),start:performance.now()};this.invalidate();
  }
  private motionEnabled(){return document.documentElement.dataset.techMotion==='on';}
  private setHover(tool:SceneTool|null){
    if(this.disabled)tool=null;if(this.hoverTool===tool)return;this.hoverTool=tool;this.halo.visible=!!tool;
    if(tool){const points:Record<SceneTool,Point>={observe:[-.25,1.46,.67],water:[1.46,.48,.55],ventilate:[0,2.5,-1.55],shade:[1.89,2.2,1.6]};this.halo.position.set(...points[tool]);}
    this.renderer.domElement.style.cursor=tool?'pointer':'grab';this.invalidate();
  }
  private applyDisplay(value:DisplayState){
    this.water.scale.y=Math.max(.001,value.water);this.water.position.y=.25+.765*value.water;
    this.vent.rotation.x=value.vent;this.shade.visible=value.shade>.001;this.shade.scale.z=Math.max(.001,value.shade);this.shade.position.z=-1.35+1.35*value.shade;this.valve.rotation.z=value.wheel;
    (this.soil.material as THREE.MeshStandardMaterial).color.setHSL(.09,.22,.45-value.moisture*.002);
    this.leaves.forEach(leaf=>leaf.rotation.x=leaf.userData.baseRotation+Math.max(0,40-value.moisture)*.009);
  }
  private resize(){if(!this.host?.isConnected)return;const {width,height}=this.host.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.invalidate();}
  private invalidate(){if(!this.frame)this.frame=requestAnimationFrame(t=>this.draw(t));}
  private draw(time:number){
    this.frame=0;if(!this.host?.isConnected||document.hidden)return;
    const moving=this.motionEnabled();
    if(this.transition){const change=this.transition,t=moving?Math.min(1,(time-change.start)/700):1,ease=t*t*(3-2*t);const current={...change.to};for(const k of Object.keys(current) as Array<keyof DisplayState>)current[k]=THREE.MathUtils.lerp(change.from[k],change.to[k],ease);this.shown=current;this.applyDisplay(current);this.renderer.shadowMap.needsUpdate=true;if(t<1)this.invalidate();else this.transition=null;}
    if(this.cameraMove){const change=this.cameraMove,t=moving?Math.min(1,(time-change.start)/650):1,ease=t*t*(3-2*t);this.camera.position.lerpVectors(change.from,change.to,ease);this.controls.target.lerpVectors(change.fromTarget,change.toTarget,ease);this.controls.update();if(t<1)this.invalidate();else this.cameraMove=null;}
    this.flow.visible=time<this.flowUntil&&moving;if(this.flow.visible){this.flow.position.y=-((time%250)/250)*.16;this.invalidate();}
    if(this.halo.visible)this.halo.lookAt(this.camera.position);
    this.renderer.render(this.scene,this.camera);this.placeMarkers();
  }
  private placeMarkers(){
    if(!this.host)return;
    const width=this.host.clientWidth,height=this.host.clientHeight;
    this.markerLines.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const points=this.markers.map((m,index)=>{const p=m.point.clone().project(this.camera);return {m,index,x:(p.x+1)*.5*width,anchorY:(1-p.y)*.5*height,y:(1-p.y)*.5*height-14,visible:p.z<=1&&Math.abs(p.x)<1&&Math.abs(p.y)<1};}).sort((a,b)=>b.y-a.y);
    const placed:Array<{x:number;y:number}>=[];
    for(const item of points){
      for(const other of placed)if(Math.abs(item.x-other.x)<110&&Math.abs(item.y-other.y)<38)item.y=other.y-38;
      item.y=Math.max(30,item.y);placed.push(item);
      item.m.button.style.left=item.x+'px';item.m.button.style.top=item.y+'px';item.m.button.style.visibility=item.visible?'visible':'hidden';
      const line=this.markerLines.children[item.index];line.setAttribute('d',item.visible?`M${item.x},${item.y} L${item.x},${item.anchorY}`:'');
    }
  }

  dispose(){cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls.dispose();document.removeEventListener('visibilitychange',this.viewChanged);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line||o instanceof THREE.Points){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.renderer.dispose();}
}
