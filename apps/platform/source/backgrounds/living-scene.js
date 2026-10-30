import * as THREE from './vendor/three.module.js';
import { DoveRig, imageTexture } from './rigs.js';
import { HeroBird } from './hero-bird.js';
import { crystalMeshData, sampleBirdFlight } from './spatial-motion.js';
import { clamp, progress, smooth } from './motion.js';

const W=1672,H=941;
const CORE_COLOR=new THREE.Color(0x91a0b6),CORE_LIGHT=new THREE.Color(0xf5f8fd);
const OBJECTS={
  resonance:[
    {x:1465,y:160,size:39,kind:'crystal',angles:[.12,.22,-.2]},
    {x:1597,y:255,size:49,kind:'crystal',angles:[.36,.74,.34]},
    {x:889,y:661,size:19,kind:'crystal',angles:[.2,.1,-.3]},
    {x:1277,y:789,size:15,kind:'crystal',angles:[.8,.6,.8]},
    {x:1047,y:605,size:17,kind:'rock',angles:[.4,.2,.6]},
    {x:734,y:717,size:15,kind:'rock',angles:[.1,.7,.2]}
  ],
  sanctuary:[
    {x:950,y:274,size:47,kind:'rock',angles:[.22,.35,-.12]},
    {x:868,y:646,size:45,kind:'rock',angles:[.35,.4,.28]},
    {x:1248,y:257,size:24,kind:'crystal',angles:[.35,.22,.7]},
    {x:1438,y:369,size:21,kind:'crystal',angles:[.17,.46,-.2]},
    {x:1078,y:736,size:17,kind:'crystal',angles:[.6,.3,.22]}
  ]
};

function reflectionRoom(renderer) {
  const room=new THREE.Scene();room.background=new THREE.Color('#e3e8ef');
  const panels=[
    {p:[-280,150,260],s:[130,570],color:'#ffffff',strength:2.7},
    {p:[270,170,120],s:[75,410],color:'#17222f',strength:1},
    {p:[20,310,-80],s:[630,140],color:'#ffffff',strength:3.0},
    {p:[260,-110,-220],s:[90,430],color:'#c7d7f6',strength:1.2},
    {p:[-160,-280,60],s:[410,120],color:'#8793a4',strength:.7}
  ];
  for(const panel of panels){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(...panel.s),new THREE.MeshBasicMaterial({color:new THREE.Color(panel.color).multiplyScalar(panel.strength),side:THREE.DoubleSide}));
    mesh.position.set(...panel.p);mesh.lookAt(0,0,0);room.add(mesh);
  }
  const generator=new THREE.PMREMGenerator(renderer);
  const target=generator.fromScene(room,.045,.1,1500);
  generator.dispose();room.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
  return target;
}

function mineralSurface(material,amount) {
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vMineral;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMineral = position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMineral;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float seam = abs(sin(dot(vMineral,vec3(5.1,9.7,3.2)) + sin(vMineral.z*12.0)*0.65 + sin(vMineral.y*16.0)*0.22));
      float vein = 1.0-smoothstep(0.013,0.075,seam);
      diffuseColor.rgb *= 1.0-vein*${amount.toFixed(2)};
    `);
  };
  material.customProgramCacheKey=()=>`mineral-${amount}`;
}

function rockGeometry(seed) {
  const geometry=new THREE.IcosahedronGeometry(1,3);
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    const n=.9+.13*Math.sin(x*5.4+y*7.7+z*9.1+seed)+.035*Math.sin(x*23+y*19+z*29+seed);
    position.setXYZ(i,x*n*1.52,y*n*.79,z*n*.73);
  }
  geometry.computeVertexNormals();return geometry;
}

export class LivingScene {
  constructor(name,images,invalidate=()=>{}) {
    this.name=name;this.available=false;this.lost=false;this.error=null;this.invalidate=invalidate;
    this.canvas=document.createElement('canvas');
    this.disposed=false;
    try { this.initialize(images); } catch(error) { this.fail(error,'initialize'); }
  }
  initialize(images) {
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true});
    this.renderer.setClearColor(0xffffff,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.05;
    this.scene=new THREE.Scene();
    this.camera=new THREE.OrthographicCamera(-W/2,W/2,H/2,-H/2,1,4000);
    this.camera.position.z=1700;
    this.environment=reflectionRoom(this.renderer);
    this.scene.environment=this.environment.texture;
    // The art participates in the physical transmission pass, while the main canvas owns its visible compositing.
    this.backdropTexture=imageTexture(images.base);
    const backdropMaterial=new THREE.MeshBasicMaterial({map:this.backdropTexture,colorWrite:false,depthWrite:false,toneMapped:false});
    const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(W,H),backdropMaterial);
    backdrop.position.z=-400;
    backdrop.onBeforeRender=renderer=>{backdropMaterial.colorWrite=renderer.getRenderTarget()!==null;};
    this.scene.add(backdrop);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x8c9cb4,2.05));
    const key=new THREE.DirectionalLight(0xfffbf5,3.1);key.position.set(-320,470,900);this.scene.add(key);
    const rim=new THREE.DirectionalLight(0xdae8ff,1.85);rim.position.set(540,-150,400);this.scene.add(rim);
    this.grain=imageTexture(images.grain);this.grain.colorSpace=THREE.NoColorSpace;
    this.grain.wrapS=this.grain.wrapT=THREE.RepeatWrapping;this.grain.repeat.set(8,11);
    this.mineralTexture=imageTexture(images.mineral);
    this.mineralTexture.wrapS=this.mineralTexture.wrapT=THREE.RepeatWrapping;
    this.mineralTexture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    this.shards=OBJECTS[this.name].map((definition,index)=>this.makeMineral(definition,index));
    if(this.name==='resonance'){this.heroBird=new HeroBird(images);this.heroBird.addTo(this.scene);}
    this.birdTexture=imageTexture(images.dove);
    this.birds=Array.from({length:this.name==='resonance'?7:3},()=>{
      const rig=new DoveRig(this.birdTexture);this.scene.add(rig.group);return rig;
    });
    this.available=true;
    this.onLost=event=>{if(this.disposed)return;event.preventDefault();this.lost=true;this.invalidate();};
    this.onRestore=()=>{
      if(this.disposed)return;
      try{
        const previous=this.environment;
        this.environment=reflectionRoom(this.renderer);
        this.scene.environment=this.environment.texture;
        previous.dispose();this.lost=false;this.invalidate();
      }catch(error){this.fail(error,'restore');}
    };
    this.canvas.addEventListener('webglcontextlost',this.onLost);
    this.canvas.addEventListener('webglcontextrestored',this.onRestore);
    this.resize(1);
    this.renderer.compile(this.scene,this.camera);
  }
  makeMineral(definition,index) {
    let geometry;
    if(definition.kind==='rock')geometry=rockGeometry(index+15);
    else {
      const data=crystalMeshData(31+index*13,index%2?7:6);
      const indexed=new THREE.BufferGeometry();indexed.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));indexed.setIndex(data.indices);
      geometry=indexed.toNonIndexed();geometry.computeVertexNormals();indexed.dispose();
    }
    const rock=definition.kind==='rock';
    const material=new THREE.MeshPhysicalMaterial({
      color:rock?0x9b9fa7:0xf0f5ff,map:rock?this.mineralTexture:null,roughness:rock?.44:.065,metalness:rock?.2:0,
      clearcoat:rock?.25:1,clearcoatRoughness:rock?.32:.055,
      envMapIntensity:rock?.7:1.4,transparent:true,opacity:rock?.98:1,
      transmission:rock?0:.88,thickness:rock?0:1.25,ior:1.47,
      flatShading:true,bumpMap:rock?this.mineralTexture:this.grain,bumpScale:rock?.035:.016
    });
    if(!rock)mineralSurface(material,.16);
    const group=new THREE.Group(),mesh=new THREE.Mesh(geometry,material);
    group.add(mesh);group.scale.setScalar(definition.size);this.scene.add(group);
    let coreMaterial;
    if(!rock){
      coreMaterial=new THREE.MeshStandardMaterial({color:0x91a0b6,roughness:.15,metalness:.88,envMapIntensity:1.15,flatShading:true,bumpMap:this.grain,bumpScale:.025});
      mineralSurface(coreMaterial,.26);
      const core=new THREE.Mesh(geometry,coreMaterial);
      core.scale.set(.62,.84,.58);core.rotation.set(.07,.23,.12);core.position.set(-.025,-.02,0);
      group.add(core);
    }
    const edgeMaterial=new THREE.LineBasicMaterial({color:0xc7d7ee,transparent:true,opacity:.22});
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,24),edgeMaterial);group.add(edges);
    edges.visible=!rock;
    return {...definition,group,mesh,material,coreMaterial,edges,edgeMaterial,index,baseOpacity:material.opacity,hover:0};
  }
  resize(scale,pixelLimit=1.5) {
    if(!this.available)return;
    // Keep the moving layer at its artwork's pixel density; DOM type and the fixed hands retain full device resolution.
    this.renderer.setPixelRatio(Math.min(pixelLimit,Math.max(1,scale)));
    this.renderer.setSize(W,H,false);
  }
  render(state,cursor=[835,430]) {
    if(!this.available||this.lost)return null;
    try { return this.draw(state,cursor); } catch(error) { this.fail(error,'render');return null; }
  }
  draw(state,cursor) {
    const t=state.reduced?0:state.time;
    const energy=state.pulse>=0?Math.sin(Math.min(1,state.pulse/3)*Math.PI):state.charge*.4;
    this.heroBird?.update(state.time,state.reduced);
    for(let i=0;i<this.birds.length;i++){
      const pose=sampleBirdFlight(state.time,i,state.reduced);
      if(this.name==='sanctuary'){pose.x+=125;pose.y-=25;}
      const width=[49,39,54,36,45,40,35][i];
      this.birds[i].update(pose,width,i);
    }
    for(const shard of this.shards){
      const i=shard.index,phase=i*2.399,quiet=state.reduced;
      const appear=quiet?1:smooth(progress(state.time,2.3+i*.17,2.6));
      const hover=quiet?0:clamp(1-Math.hypot(cursor[0]-shard.x,cursor[1]-shard.y)/(shard.size*2+55));
      shard.hover=hover;
      const dx=quiet?0:Math.sin(t*.23+phase)*7;
      const dy=quiet?0:Math.cos(t*.29+phase)*9+energy*Math.sin(phase+1)*7;
      shard.group.position.set(shard.x-836+dx,470.5-shard.y+dy,-20+i*6);
      shard.group.rotation.set(
        shard.angles[0]+(quiet?0:Math.sin(t*.18+phase)*.14+hover*.10),
        shard.angles[1]+(quiet?0:t*.055*(i%2?1:-1)),
        shard.angles[2]+(quiet?0:Math.sin(t*.16+phase)*.12+energy*.035)
      );
      shard.material.opacity=shard.baseOpacity*appear;
      if(shard.coreMaterial)shard.coreMaterial.color.lerpColors(CORE_COLOR,CORE_LIGHT,1-appear);
      shard.edgeMaterial.opacity=appear*(.17+hover*.22+energy*.07);
      shard.material.emissive.setRGB(.008*hover,.016*hover,.04*hover);
      shard.group.visible=appear>.001;
    }
    this.renderer.render(this.scene,this.camera);
    return this.canvas;
  }
  diagnostics() {
    return {
      active:this.available&&!this.lost,contextLost:this.lost,error:this.error,
      heroBird:this.heroBird?.diagnostics()||null,birds:this.birds?.length||0,minerals:this.shards?.length||0,
      environmentId:this.environment?.texture.uuid||null,
      drawCalls:this.renderer?.info?.render?.calls||0,triangles:this.renderer?.info?.render?.triangles||0
    };
  }
  fail(error,stage) {
    this.error=`${stage}: ${error.message||String(error)}`;
    this.available=false;this.lost=false;
    try { this.dispose(); } catch(cleanupError) { this.error+=`; cleanup: ${cleanupError.message}`; }
    console.warn(`NOVA dynamic layer disabled: ${this.error}`);
    this.invalidate();
  }
  dispose() {
    if(this.disposed)return;
    this.disposed=true;this.available=false;
    this.canvas?.removeEventListener?.('webglcontextlost',this.onLost);
    this.canvas?.removeEventListener?.('webglcontextrestored',this.onRestore);
    if(!this.renderer)return;
    const geometries=new Set(),materials=new Set();
    this.scene?.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);object.skeleton?.dispose();});
    for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
    this.heroBird?.dispose();this.birdTexture?.dispose();this.backdropTexture?.dispose();this.grain?.dispose();this.mineralTexture?.dispose();this.environment?.dispose();this.renderer.dispose();
  }
}
