const data=require('./geometry.json');
// Preserve the approved waypoint positions. The original explanatory sketch used
// a coarse curve that missed a few points; interpolate through the same points
// so large local views keep every chapter attached to the route.
function throughWaypoints(){
  const points=[{x:120,y:1020},...data.chapters,{x:1780,y:1365}];
  const f=n=>Number(n.toFixed(3));
  let d='M'+points[0].x+','+points[0].y;
  for(let i=0;i<points.length-1;i++){
    const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],e=points[Math.min(points.length-1,i+2)];
    d+=' C'+f(b.x+(c.x-a.x)/6)+','+f(b.y+(c.y-a.y)/6)+' '+f(c.x-(e.x-b.x)/6)+','+f(c.y-(e.y-b.y)/6)+' '+c.x+','+c.y;
  }
  return d;
}
function visibleChapters(view){return data.chapters.filter(c=>c.x>=view.left&&c.x<=view.left+view.width&&c.y>=view.top&&c.y<=view.top+view.height);}
function projectPoint(point,view){return {x:point.x-view.left,y:point.y-view.top};}
module.exports={...data,referenceRoute:data.route,route:throughWaypoints(),visibleChapters,projectPoint};

