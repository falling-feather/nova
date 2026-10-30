(function(){
  'use strict';
  const C=NovaAtlasConcepts;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
  const set=(node,key,value)=>node.setAttribute(key,String(value));
  const samplePath=(node,count)=>{const length=node.getTotalLength();return{length,points:Array.from({length:count+1},(_,i)=>node.getPointAtLength(length*i/count))};};
  const onPath=(points,t)=>{const n=points.length-1,pos=((t%1)+1)%1*n,i=Math.floor(pos),f=pos-i,a=points[i],b=points[Math.min(i+1,n)];return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};};

  class ConceptScene{
    constructor(svg){
      this.svg=svg;this.portals=[...svg.querySelectorAll('.concept-portal')];
      this.art=[...svg.querySelectorAll('[data-atlas-art]')];
      this.experiments=[...svg.querySelectorAll('.experiment-node')];
      this.drafts=[...svg.querySelectorAll('[data-atlas-region]')].map(group=>({group,index:Number(group.dataset.atlasRegion),amount:-1,paths:[...group.querySelectorAll('[data-atlas-draw]')].map(path=>{const length=path.getTotalLength();path.style.strokeDasharray=length;return{path,length};})}));
      this.bridges=[...svg.querySelectorAll('[data-atlas-bridge]')].map(group=>({group,index:Number(group.dataset.atlasBridge),amount:-1,paths:[...group.querySelectorAll('[data-atlas-draw]')].map(path=>{const length=path.getTotalLength();path.style.strokeDasharray=length;return{path,length};})}));
      const route=samplePath(svg.querySelector('#concept-locked-route'),720);this.route=route.points;this.routeLength=route.length;
      this.routeStops=C.concepts.map(c=>{let nearest=0,distance=Infinity;this.route.forEach((p,i)=>{const d=(p.x-c.x)**2+(p.y-c.y)**2;if(d<distance){distance=d;nearest=i;}});return nearest/720;});this.routeStops.push(1);
      this.routeLight=svg.querySelector('#concept-route-light');this.routeHead=svg.querySelector('#concept-route-head');
      this.birds=[...svg.querySelectorAll('[data-atlas-bird]')].map(node=>({node,wing:node.querySelector('.atlas-wing')}));
      this.lens=svg.querySelector('#atlas-observation-lens');this.lensOrbit=svg.querySelector('#atlas-observation-orbit');this.lensPosition={x:1060,y:525};
      this.gaze=[svg.querySelector('#atlas-gaze-upper'),svg.querySelector('#atlas-gaze-lower')];this.scan=svg.querySelector('#atlas-sampling-line');
      this.planes=[...svg.querySelectorAll('[data-observation-plane]')];this.learningPoints=[...svg.querySelectorAll('[data-learning-point]')];this.learningCurve=svg.querySelector('#atlas-learning-curve');
      this.threads=[...svg.querySelectorAll('[data-meaning-thread]')];this.words=[...svg.querySelectorAll('[data-meaning-word]')];this.contextOrbit=svg.querySelector('#atlas-context-orbit');
      this.inkDots=[...svg.querySelectorAll('[data-ink-dot]')];this.pencil=svg.querySelector('#atlas-pencil-trace');
      this.assembly=[...svg.querySelectorAll('[data-agency-plane]')];this.assemblySpread=0;this.compass=svg.querySelector('#atlas-check-compass');
      this.feedback=samplePath(svg.querySelector('#atlas-feedback-path'),180).points;this.feedbackDots=[...svg.querySelectorAll('[data-agency-pulse]')];
      this.surfaces=[...svg.querySelectorAll('[data-signal-surface]')];this.processPoints=[...svg.querySelectorAll('[data-process-point]')];this.returnFeather=svg.querySelector('#atlas-return-feather');
      this.mini=document.getElementById('concept-mini-window');this.overview=document.getElementById('concept-overview-window');
      this.connector=document.getElementById('concept-panel-connector');this.connectorPath=document.getElementById('concept-panel-link');this.connectorDot=document.getElementById('concept-panel-link-dot');
      this.pointer={x:0,y:0};this.panel=0;this.modeAge=10;this.hover=null;this.selected=null;this.lastBox='';this.box=C.cameraAt(0);this.frames=0;this.introComplete=false;
      this.bridge=document.getElementById('directory-transform');this.bridgePath=document.getElementById('directory-transform-path');this.bridgeAge=2;this.bridgeTo='concepts';
      const old=samplePath(document.getElementById('locked-route'),80);
      this.bridgeOld=old.points.map(p=>this.overallPoint(p,NOVA_ATLAS_DATA.world));this.bridgeNew=Array.from({length:81},(_,i)=>this.overallPoint(this.route[Math.round(i*9)],C.world));
      const host=document.getElementById('directory-transform-dots');host.replaceChildren();
      this.bridgeDots=NOVA_ATLAS_DATA.chapters.map(ch=>{const node=document.createElementNS('http://www.w3.org/2000/svg','circle');node.setAttribute('r','3.2');host.append(node);return{node,from:this.overallPoint(ch,NOVA_ATLAS_DATA.world),to:this.overallPoint(C.forChapter(ch.n),C.world)};});
    }
    overallPoint(point,world){const scale=Math.min(1000/world.width,566/world.height);return{x:(1000-world.width*scale)/2+point.x*scale,y:(566-world.height*scale)/2+point.y*scale};}
    enter(reduced){this.modeAge=reduced?10:0;}
    beginSwitch(to,reduced){this.bridgeTo=to;this.bridgeAge=reduced?2:0;document.body.dataset.modeChanging=String(!reduced);}
    renderBridge(dt,reduced){
      if(reduced||this.bridgeAge>=1.1){if(reduced)this.bridgeAge=2;this.bridge.style.opacity='0';document.body.dataset.modeChanging='false';return;}
      this.bridgeAge+=dt;const e=smooth(this.bridgeAge/.65),forward=this.bridgeTo==='concepts',from=forward?this.bridgeOld:this.bridgeNew,to=forward?this.bridgeNew:this.bridgeOld;
      set(this.bridgePath,'d',from.map((p,i)=>(i?'L':'M')+(p.x+(to[i].x-p.x)*e).toFixed(2)+' '+(p.y+(to[i].y-p.y)*e).toFixed(2)).join(' '));
      this.bridge.style.opacity=String(smooth(this.bridgeAge/.12)*(1-smooth((this.bridgeAge-.42)/.36)));
      this.bridgeDots.forEach(d=>{const a=forward?d.from:d.to,b=forward?d.to:d.from;set(d.node,'cx',a.x+(b.x-a.x)*e);set(d.node,'cy',a.y+(b.y-a.y)*e);});
    }
    render(progress,time,pointer,reduced,dt,appearance,panelOpen){
      this.frames++;this.modeAge=reduced?10:this.modeAge+dt;
      const follow=reduced?1:1-Math.exp(-dt*5),t=reduced?0:time,intro=appearance?.art??1;
      this.pointer.x+=(pointer.nx-this.pointer.x)*follow;this.pointer.y+=(pointer.ny-this.pointer.y)*follow;
      this.panel+=(Number(panelOpen)-this.panel)*(reduced?1:1-Math.exp(-dt*6.2));if(Math.abs(this.panel-Number(panelOpen))<.001)this.panel=Number(panelOpen);
      // Opening a concept pushes the camera in around its anchor instead of only sliding aside.
      const framed=C.cameraAt(progress,this.panel),focus=C.byId(this.selected)||C.concepts[C.index(progress)],zoom=1-.12*smooth(this.panel);
      const target={x:focus.x-(focus.x-framed.x)*zoom,y:focus.y-(focus.y-framed.y)*zoom,width:framed.width*zoom,height:framed.height*zoom},enter=reduced?1:smooth((this.modeAge-.2)/.9),broadWidth=C.world.height*C.viewport.width/C.viewport.height;
      const broad={x:(C.world.width-broadWidth)/2,y:0,width:broadWidth,height:C.world.height};
      const box=this.box={x:broad.x+(target.x-broad.x)*enter,y:target.y*enter,width:broad.width+(target.width-broad.width)*enter,height:broad.height+(target.height-broad.height)*enter};
      const view=`${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.width.toFixed(2)} ${box.height.toFixed(2)}`;
      if(view!==this.lastBox){set(this.svg,'viewBox',view);this.lastBox=view;for(const n of [this.mini,this.overview])for(const k of ['x','y','width','height'])set(n,k,box[k]);}
      if(!this.introComplete||!appearance.complete){
        const mask=appearance.complete?'none':`radial-gradient(ellipse ${appearance.radiusX}% ${appearance.radiusY}% at 50% 48%,#000 12%,#000 52%,#000b 66%,transparent 90%)`;
        this.svg.style.maskImage=mask;this.svg.style.webkitMaskImage=mask;this.svg.style.filter=appearance.blur>.005?`blur(${appearance.blur}px)`:'none';this.introComplete=appearance.complete;
      }
      const p=C.wrap(progress),active=C.index(progress),distance=i=>Math.min(Math.abs(p-i),4-Math.abs(p-i));
      this.art.forEach((node,i)=>{
        const d=Number(node.dataset.depth),arrival=smooth((1.35-distance(i))/1.05),x=reduced?0:this.pointer.x*d+Math.sin(t*.31+i)*d*.25,y=reduced?0:this.pointer.y*d*.6+Math.cos(t*.27+i)*d*.18+(1-arrival)*16;
        set(node,'transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`);node.style.opacity=String(intro*(.82+.18*arrival));
      });
      this.drafts.forEach(d=>{
        const amount=reduced?1:Math.min(intro,smooth((1.25-distance(d.index))/.9));d.group.style.opacity=String(.2+amount*.8);
        if(Math.abs(amount-d.amount)>.005||amount===1&&d.amount!==1){d.paths.forEach(({path,length})=>path.style.strokeDashoffset=(1-amount)*length);d.amount=amount;}
      });
      // A travel line leaves each concept as a short lead and is drawn into the next concept as the camera moves.
      this.bridges.forEach(b=>{
        const r=((p-b.index)%4+4)%4,amount=reduced?1:Math.min(intro,r<=1?.2+.8*smooth(r):r<3.3?1:.2*smooth((r-3.3)/.7));b.group.style.opacity=String(.35+.65*amount);
        if(Math.abs(amount-b.amount)>.004||amount===1&&b.amount!==1){b.paths.forEach(({path,length})=>path.style.strokeDashoffset=(1-amount)*length);b.amount=amount;}
      });
      this.portals.forEach((node,i)=>{
        const c=C.concepts[i],shown=c.x>box.x+20&&c.x<box.x+box.width-20&&c.y>box.y+15&&c.y<box.y+box.height-15;
        node.tabIndex=shown?0:-1;node.setAttribute('aria-hidden',String(!shown));node.classList.toggle('is-active',i===active);node.classList.toggle('is-selected',this.selected===c.id);
        node.setAttribute('aria-expanded',String(panelOpen&&this.selected===c.id));node.style.opacity=String(appearance?.caption??1);
        const heading=node.querySelector('.concept-heading');heading.style.opacity=String(this.selected===c.id?1-this.panel:1);heading.style.pointerEvents=this.selected===c.id&&this.panel>.5?'none':'auto';
      });
      this.experiments.forEach(node=>{const x=Number(node.dataset.atlasX),y=Number(node.dataset.atlasY),shown=x>=box.x&&x+100<=box.x+box.width&&y>=box.y+20&&y<=box.y+box.height-20;node.tabIndex=shown?0:-1;node.setAttribute('aria-hidden',String(!shown));node.style.opacity=String(appearance?.ui??1);});
      const worldPointer={x:box.x+(this.pointer.x+1)*box.width/2,y:box.y+(this.pointer.y+1)*box.height/2};
      if(distance(0)<1.15)this.observe(t,worldPointer,pointer.active,reduced,follow);
      if(distance(1)<1.15)this.relate(t,worldPointer,pointer.active,reduced);
      if(distance(2)<1.15)this.create(t,worldPointer,pointer.active,reduced);
      if(distance(3)<1.15)this.act(t,worldPointer,pointer.active,reduced,follow);
      if(distance(.5)<.9)this.surfaces.forEach((node,i)=>{const bend=reduced?0:this.pointer.y*16+Math.sin(t*.4+i*.13)*8;set(node,'d',`M-250 ${108+i*5}C-155 ${90+i*2} -116 ${-95+i*4+bend} 0 ${-20+i*5}S180 ${190-i*2-bend} 270 ${42+i*5}`);});
      this.processPoints.forEach((node,i)=>node.style.opacity=String(reduced?.4:.2+.65*Math.max(0,Math.sin(t*1.3-i*.9))));
      set(this.returnFeather,'transform',`translate(570 ${1350+(reduced?0:Math.sin(t*.45)*5)}) rotate(${-25+(reduced?0:this.pointer.x*2+Math.sin(t*.3))})`);
      const i=Math.floor(p),f=smooth(p-i),routeT=this.routeStops[i]+(this.routeStops[i+1]-this.routeStops[i])*f,head=onPath(this.route,routeT);
      set(this.routeHead,'cx',head.x);set(this.routeHead,'cy',head.y);this.routeLight.style.strokeDashoffset=String(-routeT*this.routeLength+75);
      this.fly(t,worldPointer,pointer.active,reduced,intro);
      if(panelOpen||this.panel>.01)this.drawConnector();else this.connector.style.opacity='0';
      return box;
    }
    observe(t,pointer,active,reduced,follow){
      const x=active&&!reduced?clamp(pointer.x,925,1240):1060+Math.sin(t*.4)*20,y=active&&!reduced?clamp(pointer.y,380,700):525+Math.cos(t*.5)*18;
      this.lensPosition.x+=(x-this.lensPosition.x)*follow;this.lensPosition.y+=(y-this.lensPosition.y)*follow;
      set(this.lens,'transform',`translate(${this.lensPosition.x.toFixed(2)} ${this.lensPosition.y.toFixed(2)})`);set(this.lensOrbit,'transform',`rotate(${t*6})`);
      this.gaze.forEach((node,i)=>set(node,'d',`M615 600L${this.lensPosition.x.toFixed(1)} ${(this.lensPosition.y+(i?35:-35)).toFixed(1)}`));
      set(this.scan,'transform',`translate(0 ${reduced?0:Math.sin(t*.8)*32})`);
      this.planes.forEach((n,i)=>set(n,'transform',`translate(${reduced?0:this.pointer.x*(i-1)*4} ${reduced?0:this.pointer.y*(i-1)*3})`));
      this.learningPoints.forEach((n,i)=>n.style.opacity=reduced?.35:.2+.35*(1+Math.sin(t*1.2-i*.5))/2);
      set(this.learningCurve,'d',`M-10 44C85 ${49+(reduced?0:this.pointer.y*14)} 132 ${-32+(reduced?0:Math.sin(t*.4)*12)} 270-8`);
    }
    relate(t,pointer,active,reduced){
      const chosen=active?clamp(Math.round((pointer.x-1770)/160),0,3):Math.floor(t*.5)%4;
      this.threads.forEach((node,i)=>{node.style.strokeOpacity=reduced?.35:i===chosen?.85:.17;node.style.strokeWidth=i===chosen?'1.5':'.7';});
      this.words.forEach((node,i)=>node.style.opacity=reduced||i===chosen?'1':'.45');
      set(this.contextOrbit,'transform',`translate(2590 378) rotate(${-t*4})`);
    }
    create(t,pointer,active,reduced){
      const gather=reduced?.9:clamp(.63+.2*Math.sin(t*.35)+(active?(pointer.x-2670)/1400:0),.25,1);
      this.inkDots.forEach((node,i)=>{const a=i*2.399963,r=Math.sqrt(i/96),x=Math.cos(a+t*.025)*r*205,y=Math.sin(a+t*.025)*r*145,side=i%2?1:-1,u=(i%48)/48,tx=side*(35+u*135),ty=-12-u*122+Math.sin(u*Math.PI)*20;set(node,'cx',x+(tx-x)*gather);set(node,'cy',y+(ty-y)*gather);node.style.opacity=String(reduced?.08:.06+(1-gather)*.26);});
      this.pencil.style.strokeDashoffset=String(-t*13);
    }
    act(t,pointer,active,reduced,follow){
      const near=active&&!reduced?1-smooth((Math.hypot(pointer.x-1610,pointer.y-2070)-70)/220):0;
      const target=reduced?0:near+.08+.08*Math.sin(t*.5);this.assemblySpread+=(target-this.assemblySpread)*follow;
      this.assembly.forEach((node,i)=>set(node,'transform',`translate(${(i-1.5)*12*this.assemblySpread} ${(i-1.5)*19*this.assemblySpread})`));
      this.feedbackDots.forEach((node,i)=>{const p=onPath(this.feedback,t*.1+i/3);set(node,'cx',p.x);set(node,'cy',p.y);node.style.opacity=reduced?'.3':'.65';});
      set(this.compass,'transform',`translate(1840 2200) rotate(${t*3})`);
    }
    fly(t,pointer,active,reduced,intro){
      this.birds.forEach(({node,wing},i)=>{
        const position=i/7+t*.007,base=onPath(this.route,position),ahead=onPath(this.route,position+.002),angle=Math.atan2(ahead.y-base.y,ahead.x-base.x)*180/Math.PI;
        const reach=active?1-smooth(Math.hypot(pointer.x-base.x,pointer.y-base.y)/260):0;
        const x=base.x+Math.sin(i*2.1)*65+(pointer.x-base.x)*reach*.12,y=base.y+Math.cos(i*1.8)*70+(pointer.y-base.y)*reach*.12;
        const flap=reduced?12:Math.sin(t*(4.2+i*.21)+i)*17;
        set(node,'transform',`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(1)}) scale(${.75+i%3*.13})`);
        set(wing,'d',`M-2 0Q-14 ${-flap} -28 ${-flap*.45}M2 0Q16 ${-flap*1.1} 30 ${-flap*.5}`);
        node.style.opacity=String(reduced?0:intro*.48);
      });
    }
    drawConnector(){
      const c=C.byId(this.selected);if(!c)return;
      const frame=this.svg.getBoundingClientRect(),panel=document.getElementById('concept-panel').getBoundingClientRect(),atlas=document.getElementById('atlas').getBoundingClientRect();
      const x=frame.left+(c.x-this.box.x)/this.box.width*frame.width,y=frame.top+(c.y-this.box.y)/this.box.height*frame.height-atlas.top,endX=panel.left+2,endY=panel.top+92-atlas.top,mid=(x+endX)/2;
      set(this.connector,'viewBox',`0 0 ${atlas.width} ${atlas.height}`);this.connector.style.opacity=String(this.panel*.5);
      set(this.connectorPath,'d',`M${x} ${y}C${mid} ${y} ${mid} ${endY} ${endX} ${endY}`);set(this.connectorDot,'cx',endX);set(this.connectorDot,'cy',endY);
    }
  }
  window.NovaConceptScene=ConceptScene;
})();
