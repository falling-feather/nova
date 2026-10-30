(function(root){
  'use strict';
  const loopback=hostname=>hostname==='127.0.0.1'||hostname==='localhost';
  function siteRoot(pageUrl){
    const source=new URL(pageUrl);
    const page=/^(.*?\/)(?:(?:archive\/)?chapters\/\d{2}(?:\/|$)|(?:courses|personal)(?:\/|$))/.exec(source.pathname);
    return page?new URL(page[1],source):new URL('.',source);
  }
  function entry(config,n,view,pageUrl){
    if(!Number.isInteger(n))return null;
    const chapter=config.chapters.find(c=>c.n===n);if(!chapter)return null;
    const source=new URL(pageUrl),origin=['http:','https:'].includes(source.protocol)?source.origin:`http://127.0.0.1:${config.hub.port}`;
    const base=['http:','https:'].includes(source.protocol)?siteRoot(source.href):new URL('/',origin);
    const back=new URL('courses/',base);
    back.searchParams.set('view',String(Number.isFinite(view)?Math.max(0,Math.min(4,view)):0));
    back.searchParams.set('chapter',String(n));
    const destination=new URL(chapter.mount.replace(/^\//,''),base);
    destination.searchParams.set('novaChapter',String(n));destination.searchParams.set('novaReturn',back.href);
    return {href:destination.href,returnUrl:back.href};
  }
  function returnUrl(pageUrl){
    try{
      const source=new URL(pageUrl),chapter=source.searchParams.get('novaChapter'),raw=source.searchParams.get('novaReturn');
      if(!raw||!chapter||!/^\d+$/.test(chapter)||Number(chapter)<1)return null;
      const target=new URL(raw);
      const localDebug=source.protocol==='http:'&&target.protocol==='http:'&&loopback(source.hostname)&&loopback(target.hostname);
      const directory=new URL('courses/',siteRoot(localDebug?target.href:source.href)).pathname;
      if(!['http:','https:'].includes(target.protocol)||(target.origin!==source.origin&&!localDebug)||target.username||target.password||![directory,directory+'index.html'].includes(target.pathname)||target.searchParams.get('chapter')!==chapter)return null;
      target.searchParams.delete('embed');return target.href;
    }catch{return null;}
  }
  const progressPrefix='nova-chapter-progress-v1:';
  function validChapter(n){return Number.isInteger(n)&&n>=1&&n<=13;}
  function summaryFields(detail){
    if(!detail||!validChapter(detail.chapter)||!Number.isInteger(detail.total)||detail.total<1||detail.total>1000||!Number.isInteger(detail.completed)||detail.completed<0||detail.completed>detail.total)return null;
    const pathLabel=detail.pathLabel===undefined?'学习活动':detail.pathLabel,artifactCount=detail.artifactCount===undefined?0:detail.artifactCount;
    if(typeof pathLabel!=='string'||!pathLabel.trim()||pathLabel.length>48||!Number.isInteger(artifactCount)||artifactCount<0||artifactCount>10000)return null;
    return {chapter:detail.chapter,completed:detail.completed,total:detail.total,pathLabel:pathLabel.trim(),artifactCount};
  }
  // Continuation summaries never replace a chapter's authoritative learning data.
  function recordProgress(storage,detail,now=Date.now()){
    const fields=summaryFields(detail);
    if(!fields||!Number.isFinite(now)||now<0)return {ok:false,reason:'invalid'};
    const value={schema:'nova-chapter-progress',version:1,...fields,updatedAt:now};
    try{if(!storage||typeof storage.setItem!=='function')return {ok:false,reason:'unavailable'};storage.setItem(progressPrefix+fields.chapter,JSON.stringify(value));return {ok:true,value};}
    catch{return {ok:false,reason:'unavailable'};}
  }
  function readProgress(storage,chapter){
    if(!validChapter(chapter))return {status:'invalid'};
    let raw;
    try{if(!storage||typeof storage.getItem!=='function')return {status:'unavailable'};raw=storage.getItem(progressPrefix+chapter);}
    catch{return {status:'unavailable'};}
    if(raw===null)return {status:'missing'};
    try{
      const value=JSON.parse(raw),fields=summaryFields(value);
      if(!fields||value.schema!=='nova-chapter-progress'||value.version!==1||value.chapter!==chapter||!Number.isFinite(value.updatedAt)||value.updatedAt<0)return {status:'invalid'};
      return {status:'ok',value:{schema:value.schema,version:value.version,...fields,updatedAt:value.updatedAt}};
    }catch{return {status:'invalid'};}
  }
  function mountReturn(){
    const doc=root.document;if(!doc||doc.getElementById('nova-course-return'))return;
    let href=returnUrl(root.location.href);
    if(!href){const current=new URL(root.location.href),base=siteRoot(current.href),match=/^(?:archive\/)?chapters\/(\d{2})\//.exec(current.pathname.slice(base.pathname.length));if(match){const n=Number(match[1]);if(validChapter(n))href=new URL('courses/?chapter='+n,base).href;}}
    const host=doc.querySelector('[data-nova-return-host]');
    if(!href||!host)return;
    const style=doc.createElement('style');style.textContent='.nova-course-return{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;font:600 12px/1.3 system-ui,sans-serif;text-decoration:none;white-space:nowrap;touch-action:manipulation;pointer-events:auto}.nova-course-return:hover{filter:brightness(.85)}.nova-course-return:focus-visible{outline:2px solid currentColor;outline-offset:3px}.nova-course-return svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.5}@media(max-width:600px){.nova-course-return{width:36px;min-width:36px;height:36px;justify-content:center;flex-shrink:0;padding:9px}.nova-course-return span{display:none}}';doc.head.append(style);
    const link=doc.createElement('a');link.id='nova-course-return';link.className='nova-course-return';link.href=href;link.target='_top';link.setAttribute('aria-label','返回奇点课程目录');link.title='返回目录';
    link.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H4m5-5-5 5 5 5"/></svg><span>返回奇点</span>';
    link.addEventListener('pointerdown',e=>e.stopPropagation());link.addEventListener('click',e=>e.stopPropagation());link.addEventListener('keydown',e=>{if(e.key==='Enter')e.stopPropagation();});host.prepend(link);
  }
  const api={entry,returnUrl,siteRoot,mountReturn,recordProgress,readProgress,progressPrefix};
  const commonJS=typeof module==='object'&&module.exports;
  if(commonJS)module.exports=api;
  if(!commonJS||root.document)root.NovaCourseLinks=api;
  if(root.document&&typeof root.addEventListener==='function')root.addEventListener('nova:progress',event=>{
    let storage;try{storage=root.NovaPlatform?root.NovaPlatform.progressStorage():root.localStorage;}catch{storage=null;}
    const result=recordProgress(storage,event.detail);
    if(typeof root.CustomEvent==='function')root.dispatchEvent(new root.CustomEvent('nova:progress-result',{detail:result}));
    if(!result.ok&&root.console)root.console.warn('学习活动摘要未保存：'+result.reason);
  });
  if(root.document){mountReturn();if(root.document.readyState!=='complete')root.document.addEventListener('DOMContentLoaded',mountReturn,{once:true});}
  if(root.document&&!root.NovaPlatformReady){
    root.NovaPlatformReady=new Promise(resolve=>{
      if(root.NovaPlatform){resolve(root.NovaPlatform);return;}
      if(typeof root.document.createElement!=='function'||!root.document.head){resolve(null);return;}
      const loadClient=()=>{const client=docScript('platform-client.js');client.onload=()=>resolve(root.NovaPlatform||null);client.onerror=()=>resolve(null);root.document.head.append(client);};
      if(root.NovaStorageContract)loadClient();
      else{const contract=docScript('storage-contract.js');contract.onload=loadClient;contract.onerror=()=>resolve(null);root.document.head.append(contract);}
    });
  }
  function docScript(file){const script=root.document.createElement('script');script.src=new URL('platform/'+file,siteRoot(root.location.href)).href;return script;}
})(typeof window==='undefined'?globalThis:window);
