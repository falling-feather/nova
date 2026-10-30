import { clamp, progress } from './motion.js';
const ease=p=>{p=clamp(p);return p*p*p*(10+p*(-15+6*p));};
const open=(t,start,duration)=>ease(progress(t,start,duration));

/** A shared clock, but the rectrices never inherit a wing's stroke. */
export function sampleHeroBird(time,quiet=false) {
  if(quiet)return {time:5,bodyOpacity:1,wingSpread:1,tailSpread:1,shoulder:0,elbow:0,wrist:0,sweep:0,tailBend:0,glide:0,breathe:0,bones:1,shafts:1,outline:1,quiet:1};
  const wingSpread=open(time,.6,2.5),tailSpread=open(time,2,2.05);
  const idle=open(time,4.4,1.5),phase=(time-5)*Math.PI/6;
  const glide=Math.sin(phase)*.018*idle;
  return {
    time,bodyOpacity:open(time,.08,.8),wingSpread,tailSpread,
    shoulder:.40*(1-open(time,.6,2.05))+glide,
    elbow:.22*(1-open(time,.88,2.05))+glide*.75,
    wrist:.16*(1-open(time,1.12,2.0))+Math.sin(phase-.28)*.018*idle,
    sweep:-.24*(1-wingSpread),
    tailBend:.13*(1-open(time,2.05,2.25))+Math.sin(phase-.5)*.012*idle,
    glide,breathe:Math.sin(phase)*1.15*idle,
    bones:open(time,.18,1.25),shafts:open(time,.85,2.2),outline:open(time,1.2,2.3),quiet:0
  };
}

