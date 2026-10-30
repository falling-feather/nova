(function(){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
  const el=id=>document.getElementById(id);
  const set=(node,name,value)=>node.setAttribute(name,value);
  class AtlasScene{
    constructor(svg){
      this.svg=svg;this.layers=[...svg.querySelectorAll('.art-layer')];
      this.reveals=[...svg.querySelectorAll('.draft-reveal')].map(group=>{
        const paths=[...group.querySelectorAll('path:not([stroke-dasharray])')].map(path=>{const length=path.getTotalLength();path.style.strokeDasharray=length;return {path,length};});
        return {group,paths,start:Number(group.dataset.reveal)};
      });
      const route=el('locked-route'),length=route.getTotalLength();
      this.routePoints=Array.from({length:501},(_,i)=>route.getPointAtLength(length*i/500));
      this.dots=[...svg.querySelectorAll('.diffusion-dot')];this.flow=[...svg.querySelectorAll('[data-flow]')];
      this.parts=[...svg.querySelectorAll('.assembly-part')];this.neurons=[...svg.querySelectorAll('.neuron')];
      this.edges=[...svg.querySelectorAll('.neural-edge')];this.attention=[...svg.querySelectorAll('.attention-thread')];
      this.lens={x:620,y:635};this.pointer={x:0,y:0};this.assemblyHover=false;this.assembly=0;this.lastViewBox='';
      this.mini=el('mini-window');this.overview=el('overview-window');
      this.flock=new NovaAtlasFlock.Flock(el('atlas-flock'),NOVA_ATLAS_DATA.chapters);
      this.awakening=new NovaAtlasAwakening.View(document,svg);
    }
    routePoint(f){const i=clamp(f)*500,a=Math.floor(i),b=Math.min(500,a+1),t=i-a;return{x:this.routePoints[a].x+(this.routePoints[b].x-this.routePoints[a].x)*t,y:this.routePoints[a].y+(this.routePoints[b].y-this.routePoints[a].y)*t};}
    render(p,time,pointer,reduced,dt,entrance){
      const box=NovaAtlasNav.cameraAt(NOVA_ATLAS_DATA.views,p);
      const value=`${box.x.toFixed(3)} ${box.y.toFixed(3)} 900 510`;
      if(value!==this.lastViewBox){set(this.svg,'viewBox',value);this.lastViewBox=value;set(this.mini,'x',box.x);set(this.mini,'y',box.y);set(this.overview,'x',box.x);set(this.overview,'y',box.y);}
      const awake=this.appearance=this.awakening.render(entrance,reduced);
      const t=reduced?0:time,follow=reduced?1:1-Math.exp(-dt*5),intro=awake.art;
      this.flock.render(t,reduced,awake.birdTime,box);
      this.pointer.x+=(pointer.nx-this.pointer.x)*follow;this.pointer.y+=(pointer.ny-this.pointer.y)*follow;
      this.layers.forEach((layer,i)=>{
        const d=Number(layer.dataset.depth),start=layer.id==='thinker-art'?.55:layer.id==='maker-art'?2.5:0;
        const arrive=(start?smooth((p-start)/.55):1)*intro;
        const x=reduced?0:this.pointer.x*d+Math.sin(t*.32+i)*Math.abs(d)*.32;
        const y=reduced?0:this.pointer.y*d*.6+Math.cos(t*.27+i)*Math.abs(d)*.2+(1-arrive)*15;
        set(layer,'transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        layer.style.opacity=arrive*Number(layer.getAttribute('opacity')||1);
      });
      this.reveals.forEach(({group,paths,start})=>{
        const amount=reduced?1:start===0?intro:smooth((p-start)/.65);
        group.style.opacity=.15+amount*.85;
        paths.forEach(({path,length})=>path.style.strokeDashoffset=(1-amount)*length);
      });
      if(p<1){
        const lx=pointer.active?clamp(pointer.x,400,790):620+Math.sin(t*.5)*25;
        const ly=pointer.active?clamp(pointer.y,600,990):635+Math.cos(t*.4)*15;
        this.lens.x+=(lx-this.lens.x)*follow;this.lens.y+=(ly-this.lens.y)*follow;
        set(el('observer-lens'),'transform',`translate(${this.lens.x.toFixed(2)} ${this.lens.y.toFixed(2)})`);
        set(el('observer-orbit'),'transform',`rotate(${(t*7)%360} 350 729)`);
        set(el('observer-scan'),'transform',`translate(0 ${reduced?28:(Math.sin(t*.8)+1)*27})`);
      }
      if(p>.45&&p<2.9){
        set(el('thought-orbit'),'transform',`rotate(${(-t*5)%360} 1355 360)`);
        this.neurons.forEach((n,i)=>{const phase=reduced?.4:(Math.sin(t*1.9-Math.floor(i/4)*1.2)+1)/2;n.style.fill=phase>.72?'#245ed7':'#f8f9f7';set(n,'r',2+phase*1.3);});
        this.edges.forEach((n,i)=>n.style.strokeOpacity=reduced?.18:.08+.3*Math.max(0,Math.sin(t*1.9-Math.floor(i/16)*1.2)));
        const selected=clamp(Math.floor((pointer.x-1410)/61),0,3);
        this.attention.forEach((n,i)=>{n.style.strokeOpacity=pointer.active?(i===selected?.95:.16):.15+.45*(Math.sin(t*1.1-i)+1)/2;n.style.strokeWidth=i===selected?1.5:.7;});
        const reveal=reduced?1:clamp(smooth((p-1.6)/.55)+Math.sin(t*.32)*.025);
        set(el('plant-clip-rect'),'height',500*reveal);
        set(el('diffusion-scanner'),'transform',`translate(0 ${300*reveal})`);
        el('diffusion-scanner').style.opacity=reduced?0:.5;
        this.dots.forEach((n,i)=>{
          const a=i*2.399963,r=Math.sqrt(i/155),swirl=t*.045;
          const nx=2018+Math.cos(a+swirl)*r*208,ny=426+Math.sin(a+swirl)*r*168;
          const tx=2012+Math.sin(a)*100*Math.sin((i/155)*Math.PI),ty=303+(i/155)*230;
          set(n,'cx',nx+(tx-nx)*reveal);set(n,'cy',ny+(ty-ny)*reveal);n.style.opacity=(1-reveal)*.52;
        });
      }
      if(p>2.2){
        const target=reduced?0:this.assemblyHover?1:.12+.12*Math.sin(t*.6),f=reduced?1:1-Math.exp(-dt*4);
        this.assembly+=(target-this.assembly)*f;
        const arrival=reduced?0:(1-smooth((p-2.6)/.5))*1.5;
        this.parts.forEach((n,i)=>{const spread=this.assembly+arrival;set(n,'transform',`translate(${(i-2)*16*spread} ${(i-2)*17*spread})`);});
        set(el('maker-compass'),'transform',`rotate(${(t*3)%360} 2250 1137)`);
      }
      const portion=.065+clamp(p/4)*.935;
      el('route-progress').style.strokeDashoffset=1-portion;
      const head=this.routePoint(portion);
      for(const id of ['route-comet','route-comet-ring']){set(el(id),'cx',head.x);set(el(id),'cy',head.y);}
      set(el('route-comet-ring'),'r',reduced?8:7+Math.sin(t*2)*2);
      this.flow.forEach((n,i)=>{const loc=this.routePoint((i/9+t*.017)%1);set(n,'cx',loc.x);set(n,'cy',loc.y);n.style.opacity=reduced?0:.35;});
      return box;
    }
  }
  window.NovaAtlasScene=AtlasScene;
})();
