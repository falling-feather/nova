/* A single deterministic entrance clock: paper, opening field, image, route, then readable controls. */
(function(g){
 'use strict';
 const DURATION=3;
 // Keep the authored layer spacing; DURATION alone sets the playback length in seconds.
 const TIMELINE_UNITS=5.25;
 const smooth=v=>{const p=Math.max(0,Math.min(1,v));return p*p*(3-2*p);};
 function sample(time,reduced=false){
  const elapsed=reduced?DURATION:Math.max(0,Number.isFinite(time)?time:0);
  const t=elapsed/DURATION*TIMELINE_UNITS,r=(start,span)=>smooth((t-start)/span);
  const opening=r(.5,4.2);
  return {field:r(.55,3.6),art:r(1.65,2.8),lines:r(.7,2.5),route:r(2.45,1.6),
   chapters:[0,1,2].map(i=>r(2.95+i*.16,1.35)),caption:r(2.95,1.7),ui:r(3.45,1.65),
   opening,radiusX:38+132*opening,radiusY:1.6+148*Math.pow(opening,1.6),blur:3.2*(1-r(.9,3.6)),
   birdTime:Math.max(0,t-2.5),interactive:t>=4.75,complete:elapsed>=DURATION};
 }
 class View{
  constructor(doc,svg){
   this.body=doc.body;this.svg=svg;this.route=doc.getElementById('course-route');this.motion=doc.getElementById('motion-world');this.experiments=doc.getElementById('world-experiments');
   this.chapters=[...svg.querySelectorAll('.chapter')];this.complete=false;
  }
  render(time,reduced){
   const pose=sample(time,reduced);if(this.complete&&pose.complete)return pose;
   const s=this.body.style;
   for(const key of ['field','lines','caption','ui'])s.setProperty('--awake-'+key,pose[key].toFixed(4));
   s.setProperty('--awake-ui-y',(-6*(1-pose.ui)).toFixed(2)+'px');s.setProperty('--awake-caption-y',(8*(1-pose.caption)).toFixed(2)+'px');
   const mask=pose.complete?'none':`radial-gradient(ellipse ${pose.radiusX.toFixed(2)}% ${pose.radiusY.toFixed(2)}% at 50% 48%, #000 12%, #000 52%, #000b 66%, transparent 90%)`;
   this.svg.style.maskImage=mask;this.svg.style.webkitMaskImage=mask;
   this.svg.style.filter=pose.blur>.005?`blur(${pose.blur.toFixed(3)}px)`:'none';
   this.route.style.opacity=pose.route;this.motion.style.opacity=pose.lines;this.experiments.style.opacity=pose.ui;
   this.chapters.forEach((node,i)=>node.style.opacity=pose.chapters[i%3]);
   this.body.dataset.awakening=String(!pose.complete);this.complete=pose.complete;
   return pose;
  }
 }
 g.NovaAtlasAwakening={sample,DURATION,View};if(typeof module!=='undefined')module.exports=g.NovaAtlasAwakening;
})(globalThis);
