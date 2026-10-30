import { clamp, smooth } from './motion.js';

export const BIRD_PLACEMENT=Object.freeze({x:260,y:-65,scale:.84,width:1671,height:941});
export const WING_ROOTS=[[0,-25],[120,18],[190,53],[260,90],[330,126],[400,161],[460,200],[510,238],[560,277],[610,315],[654,350],[698,386],[737,416],[770,445],[795,469],[816,488],[830,499],[840,510],[850,520]];
const edges=[[-20,20],[-35,90],[-35,155],[0,220],[40,280],[105,338],[170,384],[230,428],[300,470],[360,512],[425,549],[485,582],[545,612],[605,638],[665,660],[725,681],[789,692],[856,699],[915,665]];
const TAIL_ROOTS=[[915,665],[1050,530]];
export const CORE_OUTLINE=[[-40,-50],[1740,-50],TAIL_ROOTS[1],TAIL_ROOTS[0],...WING_ROOTS.toReversed()];

export function registeredParts() {
  const parts=[];
  for(let i=0;i<WING_ROOTS.length-1;i++)parts.push({kind:'wing',index:i,root:[WING_ROOTS[i],WING_ROOTS[i+1]],edge:[edges[i],edges[i+1]]});
  const root=t=>TAIL_ROOTS[0].map((v,i)=>v+(TAIL_ROOTS[1][i]-v)*t);
  const edge=t=>{const a=1.80-1.75*t;return [980+1250*Math.cos(a),620+1250*Math.sin(a)];};
  for(let i=0;i<12;i++)parts.push({kind:'tail',index:i,root:[root(i/12),root((i+1)/12)],edge:[edge(i/12),edge((i+1)/12)]});
  return parts;
}

/** Source-space anatomy, not left/right canvas halves. Head and breast stay on the torso. */
export function anatomicalWeights(x,y,kind) {
  if(kind==='tail'){
    const distance=(x-980)*.82+(y-620)*.57;
    const anchor=smooth(clamp((distance-40)/145)),tip=smooth(clamp((distance-120)/290));
    return {indices:[0,4,5,0],weights:[1-anchor,anchor*(1-tip),anchor*tip,0]};
  }
  const headDistance=Math.hypot((x-780)/100,(y-300)/120);
  const headWeight=smooth(clamp((headDistance-.7)/.5));
  const amount=headWeight*smooth(clamp((880-x)/180));
  const distance=Math.max(0,Math.min(2,(820-x)/270));
  const a=Math.min(1,Math.floor(distance)),blend=smooth(distance-a);
  return {indices:[0,1+a,2+a,0],weights:[1-amount,amount*(1-blend),amount*blend,0]};
}

export function sourcePoint(x,y) {
  return [BIRD_PLACEMENT.x+x*BIRD_PLACEMENT.scale-836,470.5-BIRD_PLACEMENT.y-y*BIRD_PLACEMENT.scale];
}
