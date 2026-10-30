(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NovaAtlasConcepts=factory();})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const world={width:3600,height:2550},viewport={width:1200,height:680};
  const foundation=[1,2];
  const concepts=[
    {id:'learning',title:'学习与泛化',english:'LEARNING & GENERALIZATION',short:'学习与泛化',number:'01',x:880,y:700,left:120,top:320,art:'atlas-observer.webp',illustration:{x:100,y:250,width:1260,height:840,depth:7},heading:{x:-290,y:205},accent:'#245ed7',primary:true,question:'学会了，还是只记住了？',statement:'从样本中学习规律，用没有见过的材料检验。',keywords:['数据与表示','模型与参数','泛化与评估'],chapters:[3,5,6,10,11],featured:6},
    {id:'context',title:'上下文与表示',english:'CONTEXT & REPRESENTATION',short:'上下文与表示',number:'02',x:2300,y:490,left:1630,top:130,art:'atlas-dialogue.webp',illustration:{x:1650,y:80,width:1300,height:867,depth:6},heading:{x:-480,y:-150},accent:'#3a4fb6',question:'换一种线索，理解会怎样变化？',statement:'观察词语如何表示为数字，以及上下文和资料如何参与计算。',keywords:['词元与向量','注意力','知识与检索'],chapters:[7,9],featured:7},
    {id:'generation',title:'条件与生成',english:'CONDITION & GENERATION',short:'条件与生成',number:'03',x:2820,y:1590,left:2230,top:1190,art:'atlas-imagination.webp',illustration:{x:2160,y:1120,width:1320,height:880,depth:8},heading:{x:-390,y:-335},accent:'#1c74c4',question:'从随机起点，怎样形成新内容？',statement:'改变条件，比较生成过程，保留可以复现的配方。',keywords:['随机起点','条件控制','生成与选择'],chapters:[7,8],featured:8},
    {id:'action',title:'工具与反馈',english:'TOOLS & FEEDBACK',short:'工具与反馈',number:'04',x:1220,y:2050,left:730,top:1690,art:'atlas-agency.webp',illustration:{x:560,y:1570,width:1330,height:887,depth:7},heading:{x:430,y:-285},accent:'#1f3f8c',question:'发出指令，就等于完成了吗？',statement:'围绕目标调用工具，再观察结果，决定继续、停止或求助。',keywords:['目标与规划','工具调用','核验与责任'],chapters:[4,12,13],featured:12},
  ];
  const route='M880 700 C1080 165 1770 125 2300 490 C2850 505 3230 1130 2820 1590 C2540 2100 1870 2400 1220 2050 C590 2220 255 1530 580 1000 C680 820 795 825 880 700 Z';
  const art=concepts.map((c,index)=>({id:c.id,file:c.art,index,opacity:1,...c.illustration}));
  const wrap=value=>Number.isFinite(value)?((value%4)+4)%4:0;
  // Camera handles are composed separately from the ink route to frame each artwork.
  const cameraHandles=[[[630,230],[1150,180]],[[2240,160],[2670,650]],[[1960,1660],[1250,1820]],[[20,1560],[-100,690]]];
  const panelShifts=[190,450,190,190];
  const index=value=>Math.round(wrap(value))%4;
  function nearestStop(current,stop){const s=((Math.round(stop)%4)+4)%4,base=Math.round((current-s)/4)*4+s;return base;}
  function cameraAt(value,panel=0){
    const p=wrap(value),i=Math.floor(p),t=p-i,e=t*t*(3-2*t),a=concepts[i],b=concepts[(i+1)%4];
    const [h1,h2]=cameraHandles[i],u=1-e;
    return {x:u*u*u*a.left+3*u*u*e*h1[0]+3*u*e*e*h2[0]+e*e*e*b.left+Math.max(0,Math.min(1,panel))*(panelShifts[i]+(panelShifts[(i+1)%4]-panelShifts[i])*e),y:u*u*u*a.top+3*u*u*e*h1[1]+3*u*e*e*h2[1]+e*e*e*b.top,...viewport};
  }
  function tangentAt(value){const a=cameraAt(value-.035),b=cameraAt(value+.035),x=b.x-a.x,y=b.y-a.y,length=Math.hypot(x,y)||1;return{x:x/length,y:y/length};}
  const byId=id=>concepts.find(c=>c.id===id)||null;
  function forChapter(chapter,preferred){const found=byId(preferred);if(found&&(found.chapters.includes(chapter)||foundation.includes(chapter)))return found;return concepts.find(c=>c.chapters.includes(chapter))||(foundation.includes(chapter)?concepts[0]:null);}
  function restore(url){const query=new URL(url).searchParams,mode=query.get('mode')==='concepts'?'concepts':'stages',c=byId(query.get('concept'));const raw=query.get('cview'),n=raw===null?NaN:Number(raw);return{mode,progress:Number.isFinite(n)?wrap(n):Math.max(0,concepts.indexOf(c)),concept:c?.id??concepts[index(Number.isFinite(n)?n:0)].id};}
  function entryWithContext(entry,concept,progress){
    if(!entry||!byId(concept))return entry;
    const back=new URL(entry.returnUrl);back.searchParams.set('mode','concepts');back.searchParams.set('concept',concept);back.searchParams.set('cview',String(Number(wrap(progress).toFixed(4))));
    const destination=new URL(entry.href);destination.searchParams.set('novaReturn',back.href);return{href:destination.href,returnUrl:back.href};
  }
  const takeaways=['训练材料上的表现，需要用未见样本再次检验。','补充线索可以改变当前输出，并不等于重新训练模型。','随机起点和条件会影响生成，采样步骤不等于训练次数。','工具回执与新的观测，是确认目标是否达成的依据。'];
  concepts.forEach((c,i)=>c.takeaway=takeaways[i]);
  return {world,viewport,concepts,foundation,route,art,wrap,index,nearestStop,cameraAt,tangentAt,byId,forChapter,restore,entryWithContext};
});
