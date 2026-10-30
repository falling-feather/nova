(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NovaAtlasNav=factory();})(typeof window!=='undefined'?window:globalThis,function(){
  const clampProgress=value=>Number.isFinite(value)?Math.max(0,Math.min(4,value)):0;
  function cameraAt(views,value){
    const p=clampProgress(value),i=Math.floor(p),a=views[i],b=views[Math.min(i+1,4)],t=p-i,e=t*t*(3-2*t);
    return {x:a.left+(b.left-a.left)*e,y:a.top+(b.top-a.top)*e,width:900,height:510};
  }
  const visibleChapters=(chapters,b)=>chapters.filter(c=>c.x>=b.x&&c.x<=b.x+b.width&&c.y>=b.y&&c.y<=b.y+b.height);
  function wheelProgress(p,delta,mode=0){return clampProgress(p+Math.max(-280,Math.min(280,delta*(mode===1?16:mode===2?700:1)))/1150);}
  function viewForChapter(geometry,n,p){
    const chapter=geometry.chapters.find(c=>c.n===n);if(!chapter)return null;
    const candidates=geometry.views.map((_,i)=>i).filter(i=>visibleChapters([chapter],cameraAt(geometry.views,i)).length);
    return candidates.sort((a,b)=>Math.abs(a-p)-Math.abs(b-p))[0]??null;
  }
  function parseSaved(raw,maxChapter=13){
    try{const value=JSON.parse(raw);return Array.isArray(value)?[...new Set(value.filter(n=>Number.isInteger(n)&&n>=1&&n<=maxChapter))]:[];}catch{return [];}
  }
  function restoreSaved(current,legacy){
    return current!==null?parseSaved(current):parseSaved(legacy,12).map(n=>n>=2?n+1:n);
  }
  return {clampProgress,cameraAt,visibleChapters,wheelProgress,viewForChapter,parseSaved,restoreSaved};
});
