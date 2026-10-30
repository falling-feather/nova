import { clamp, progress, smooth } from './motion.js';
const TAU=Math.PI*2;
const smoother=p=>{p=clamp(p);return p*p*p*(p*(p*6-15)+10);};

/** Fade at the path's ends makes the periodic route wrap invisible. */
export function sampleBirdFlight(time,index,quiet=false) {
  const t=quiet?0:time,travel=quiet?0:Math.max(0,time-4.5);
  const u=(.1+index*.128+travel*.026)%1;
  const phase=index*1.713;
  return {
    x:956+u*550,
    y:224-Math.sin(u*Math.PI*.88)*100+(quiet?0:Math.sin(t*.49+phase)*3),
    flap:quiet?.32:Math.sin(t*TAU*(.78+(index%3)*.065)+phase)*.88+.12,
    wrist:quiet?.06:Math.sin(t*TAU*(.78+(index%3)*.065)+phase-.4)*.25,
    bank:quiet?0:Math.sin(t*.31+phase)*.055,
    opacity:quiet?1:smooth(u/.075)*(1-smooth((u-.91)/.09))*smoother(progress(time,4.1+index*.12,1.4))
  };
}

/** Indexed, watertight mineral volume with pointed ends and irregular prism faces. */
export function crystalMeshData(seed,facets=6) {
  let state=seed>>>0;
  const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const positions=[],indices=[],radii=Array.from({length:facets},()=>.47+rand()*.23);
  for(let ring=0;ring<2;ring++)for(let i=0;i<facets;i++){
    const angle=i/facets*TAU+.22,r=radii[i]*(ring?.79:1);
    positions.push(Math.cos(angle)*r+(ring?-.05:.04),ring?-.47:.47,Math.sin(angle)*r*.79);
  }
  const top=positions.length/3;positions.push(.12,1.25+rand()*.18,-.08);
  const bottom=positions.length/3;positions.push(-.17,-1.02-rand()*.18,.1);
  for(let i=0;i<facets;i++){
    const next=(i+1)%facets;
    indices.push(top,next,i,i,next,facets+i,next,facets+next,facets+i,bottom,facets+i,facets+next);
  }
  return {positions,indices};
}
