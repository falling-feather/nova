export const BACKGROUNDS=Object.freeze(['original','sanctuary','resonance']);
export const INTERVAL=30;
export const DISSOLVE=2.4;
const smooth=p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p);};

export class BackgroundCycle {
  constructor(){this.generation=-1;this.reduced=false;this.reset(0);}
  reset(generation){this.generation=generation;this.index=0;this.previous=null;this.age=0;this.previousAge=0;this.elapsed=0;this.transitionAge=DISSOLVE;this.serial=0;}
  finishTransition(){this.previous=null;this.previousAge=0;this.transitionAge=DISSOLVE;}
  advance(dt,state){
    let changed=false;
    if(state.generation!==this.generation){this.reset(state.generation);changed=true;}
    if(!!state.reduced!==this.reduced){this.reduced=!!state.reduced;if(this.reduced)this.finishTransition();changed=true;}
    if(!state.ready||state.paused||!['explore','holding','contact'].includes(state.phase)||!Number.isFinite(dt)||dt<=0)return changed;
    const cycling=state.phase==='explore'&&(state.reduced||state.arrival>=1);
    if(!cycling){this.age+=dt;if(this.previous!==null)this.previousAge+=dt;return changed;}
    let remaining=dt;
    while(remaining>1e-9){
      const step=Math.min(remaining,INTERVAL-this.elapsed);remaining-=step;this.elapsed+=step;this.age+=step;
      if(this.previous!==null){
        this.previousAge+=step;this.transitionAge+=step;
        if(this.transitionAge>=DISSOLVE){this.finishTransition();changed=true;}
      }
      if(this.elapsed>=INTERVAL-1e-9){
        this.previous=this.index;this.previousAge=this.age;this.index=(this.index+1)%BACKGROUNDS.length;
        this.age=0;this.elapsed=0;this.transitionAge=0;this.serial++;changed=true;
        if(this.reduced)this.finishTransition();
      }
    }
    return changed;
  }
  sample(){return {current:BACKGROUNDS[this.index],previous:this.previous===null?null:BACKGROUNDS[this.previous],mix:this.previous===null?1:smooth(this.transitionAge/DISSOLVE),age:this.age,previousAge:this.previousAge,elapsed:this.elapsed,serial:this.serial,generation:this.generation,reduced:this.reduced};}
}
