import { BackgroundCycle } from './cycle.js';
import { ArtBackground } from './art-scene.js';
export { BackgroundCycle } from './cycle.js';

class OriginalBackground {
  constructor(root,images,staticOnly,invalidate){
    this.root=root;this.images=images;this.invalidate=invalidate;this.error=null;
    this.canvas=document.createElement('canvas');this.canvas.className='backdrop-raster';root.append(this.canvas);
    if(!staticOnly){
      try{this.renderer=new globalThis.NovaGL.Renderer(this.canvas);this.home=new globalThis.NovaHome.Home(this.renderer,images);}
      catch(error){this.makeStatic(error);}
    }else this.context=this.canvas.getContext('2d');
    this.onLost=e=>{e.preventDefault();this.makeStatic(new Error('Original background context lost'));this.invalidate();};
    this.canvas.addEventListener('webglcontextlost',this.onLost);
  }
  makeStatic(error){
    this.error=String(error?.message||error);console.warn('NOVA original background uses static rendering:',this.error);
    this.canvas.removeEventListener('webglcontextlost',this.onLost);
    if(this.renderer)this.renderer.dispose();
    else{const gl=this.canvas.getContext('webgl');if(gl&&!gl.isContextLost())gl.getExtension('WEBGL_lose_context')?.loseContext();}
    this.renderer=null;this.home=null;
    const next=document.createElement('canvas');next.className='backdrop-raster';this.canvas.replaceWith(next);this.canvas=next;this.context=next.getContext('2d');
    if(this.width)this.resize(this.width,this.height,this.dpr);
  }
  enter(){}
  resize(w,h,dpr){this.width=w;this.height=h;this.dpr=dpr;if(this.renderer){this.renderer.economy=dpr<1;this.renderer.resize(w,h,dpr);}else{this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}}
  render(state,age,pointer){
    if(this.renderer){
      try{this.home.draw(this.width,this.height,state.time,state.pose,pointer,state.reduced,state.arrival,'background');}
      catch(error){this.makeStatic(error);this.render(state,age,pointer);}
    }else{
      const c=this.context;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalAlpha=1;c.fillStyle='#fff';c.fillRect(0,0,this.width,this.height);
      globalThis.NovaFallback.paintHomeBackground(c,this.images,this.width,this.height);
    }
  }
  paintTo(context){context.drawImage(this.canvas,0,0,this.width,this.height);}
  diagnostics(){return {active:!!this.renderer,static:!this.renderer,error:this.error};}
  dispose(){this.canvas.removeEventListener('webglcontextlost',this.onLost);this.renderer?.dispose();}
}

function imagesFor(name,images){
  return {plate:images['bg-'+name+'-plate'],base:images['bg-'+name+'-base'],birdMaterial:images['bg-bird-material'],birdPatch:images['bg-diagram-clean'],grain:images['bg-grain'],dove:images['bg-dove-atlas'],mineral:images['bg-mineral-albedo']};
}

export class Controller {
  constructor(images,{staticOnly=false,cycle=null}={}){
    this.cycle=cycle||new BackgroundCycle();this.dirty=true;this.token=null;
    this.root=document.createElement('div');this.root.className='background-stage';this.root.setAttribute('aria-hidden','true');this.root.hidden=true;
    document.body.insertBefore(this.root,document.getElementById('world'));
    this.entries=new Map();
    for(const name of ['original','sanctuary','resonance']){
      const element=document.createElement('div');element.className='background-scene';element.dataset.background=name;element.hidden=true;this.root.append(element);
      const invalidate=()=>{this.dirty=true;};
      const surface=name==='original'?new OriginalBackground(element,images,staticOnly,invalidate):new ArtBackground(element,name,imagesFor(name,images),staticOnly,invalidate);
      this.entries.set(name,{element,surface});
    }
  }
  advance(dt,state){
    const changed=this.cycle.advance(dt,state),s=this.cycle.sample(),token=s.generation+':'+s.serial;
    if(token!==this.token){this.entries.get(s.current).surface.enter();this.token=token;this.dirty=true;}
    return changed||this.dirty;
  }
  resize(w,h,dpr){this.width=w;this.height=h;for(const {surface} of this.entries.values())surface.resize(w,h,dpr);this.dirty=true;}
  hide(){this.root.hidden=true;this.dirty=false;}
  draw(state,pointer){
    const s=this.cycle.sample();const active=s.previous?[{name:s.previous,age:s.previousAge,alpha:1},{name:s.current,age:s.age,alpha:s.mix}]:[{name:s.current,age:s.age,alpha:1}];
    for(const [name,{element}] of this.entries)element.hidden=!active.some(e=>e.name===name);
    active.forEach((entry,index)=>{
      const {element,surface}=this.entries.get(entry.name);element.style.zIndex=String(index);element.style.opacity=String(entry.alpha);surface.render(state,entry.age,pointer);
    });
    this.dirty=false;this.root.dataset.current=s.current;return active;
  }
  render(state,pointer,opacity=1){this.root.hidden=false;this.root.style.opacity=String(opacity);this.draw(state,pointer);}
  paintTo(context,state,pointer){
    const active=this.draw(state,pointer);
    const scratch=this.captureCanvas||(this.captureCanvas=document.createElement('canvas'));
    if(scratch.width!==context.canvas.width||scratch.height!==context.canvas.height){scratch.width=context.canvas.width;scratch.height=context.canvas.height;}
    const group=scratch.getContext('2d'),transform=context.getTransform();
    for(const entry of active){
      group.setTransform(1,0,0,1,0,0);group.clearRect(0,0,scratch.width,scratch.height);
      group.setTransform(transform);group.globalAlpha=1;
      this.entries.get(entry.name).surface.paintTo(group);
      // CSS opacity belongs to the entire scene, after its raster and WebGL layers are composed.
      context.save();context.globalAlpha=entry.alpha;context.drawImage(scratch,0,0,this.width,this.height);context.restore();
    }
  }
  diagnostics(){return {...this.cycle.sample(),surfaces:Object.fromEntries([...this.entries].map(([name,e])=>[name,e.surface.diagnostics()]))};}
  dispose(){for(const {surface} of this.entries.values())surface.dispose();this.root.remove();}
}
