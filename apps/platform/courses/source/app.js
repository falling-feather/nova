(function(){
  'use strict';
  const $=id=>document.getElementById(id),D=NOVA_ATLAS_DATA,N=NovaAtlasNav,C=NovaAtlasConcepts;
  const viewFrame=$('world-frame'),svg=$('world-svg'),scene=new NovaAtlasScene(svg),media=matchMedia('(prefers-reduced-motion: reduce)');
  const conceptScene=new NovaConceptScene($('concept-world')),initialConcept=C.restore(location.href);
  const chapterInner=$('chapter-dialog').querySelector('.chapter-inner');
  let mode=initialConcept.mode,cp=initialConcept.progress,conceptTarget=cp,conceptActive=-1,panelOpen=false,selectedConcept=C.byId(initialConcept.concept),conceptDetail=false;
  const chapters=[...svg.querySelectorAll('.chapter')],dialogs=[...document.querySelectorAll('dialog')];
  const ranges=D.views.map(v=>v.range.replace('–',' — '));
  const captions=['从身边的智能，走向它的来路。','拆开现象，理解学习如何发生。','让信息相连，让想象逐渐显影。','从一个问题，开始亲手构造。','把学会的可能，变成自己的作品。'];
  const safeRead=key=>{try{return localStorage.getItem(key);}catch{return null;}};
  let storageAvailable=true;
  const safeWrite=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch{storageAvailable=false;return false;}};
  const initial=Number(new URLSearchParams(location.search).get('view')||0);
  let returnChapter=Number(new URLSearchParams(location.search).get('chapter')||0);
  const embedded=parent!==window&&new URLSearchParams(location.search).get('embed')==='1',hostOrigin=location.protocol==='file:'?'*':location.origin;
  let hostVisible=!embedded,hostActive=!embedded,hostGeneration=null;
  let assetsReady=false,interactionReady=null,focusOnAwake=false;
  const entranceRegions=[document.querySelector('.masthead'),$('atlas'),document.querySelector('.journey-bar')];
  document.body.dataset.embedded=String(embedded);
  const notifyHost=message=>{if(embedded)parent.postMessage(message,hostOrigin);};
  let p=N.clampProgress(initial),target=p,time=0,entrance=0,raf=0,last=0,active=-1,currentChapter=1,toastTimer=0;
  const savedKey='nova-atlas-saved-history-v2',currentSaved=safeRead(savedKey);
  const saved=new Set(N.restoreSaved(currentSaved,safeRead('nova-atlas-saved')));
  if(currentSaved===null)safeWrite(savedKey,JSON.stringify([...saved]));
  const motionChoice=safeRead('nova-atlas-reduced');let reduced=motionChoice===null?media.matches:motionChoice==='true';
  let pointer={active:false,nx:0,ny:0,x:620,y:635},drag=null,suppressClickUntil=0,frameRect=viewFrame.getBoundingClientRect();
  const isModal=()=>dialogs.some(d=>d.open);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function schedule(){if(!raf&&!document.hidden&&hostVisible&&assetsReady)raf=requestAnimationFrame(tick);}
  function syncEntrance(){
    const enabled=assetsReady&&hostActive&&!!scene.appearance?.interactive;
    if(enabled!==interactionReady){interactionReady=enabled;entranceRegions.forEach(node=>node.inert=!enabled);document.body.dataset.interactive=String(enabled);$('atlas').setAttribute('aria-busy',String(!enabled));}
    if(enabled&&focusOnAwake){focusOnAwake=false;$('region-title').tabIndex=-1;$('region-title').focus({preventScroll:true});}
    if(enabled&&returnChapter){const chapter=returnChapter;returnChapter=0;showChapter(chapter,false);}
  }
  function tick(now){
    raf=0;const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
    const paused=isModal();if(!paused&&!reduced){time+=dt;entrance+=dt;}else if(reduced)entrance=10;
    p=reduced?target:p+(target-p)*(1-Math.exp(-dt*6.8));if(Math.abs(p-target)<.00005)p=target;
    cp=reduced?conceptTarget:cp+(conceptTarget-cp)*(1-Math.exp(-dt*6.5));if(Math.abs(cp-conceptTarget)<.00005)cp=conceptTarget;
    if(mode==='stages')scene.render(p,time,pointer,reduced,dt,entrance);
    else{scene.appearance=scene.awakening.render(entrance,reduced);conceptScene.render(cp,time,pointer,reduced,dt,scene.appearance,panelOpen);}
    conceptScene.renderBridge(dt,reduced);
    syncEntrance();
    const progress=mode==='concepts'?C.wrap(cp):p;
    const rangeProgress=document.activeElement===$('journey')?(mode==='concepts'?C.wrap(conceptTarget):target):progress;
    $('journey').value=Math.round(rangeProgress*1000);$('journey').style.setProperty('--progress',progress/4*100+'%');
    if(mode==='concepts'){const index=C.index(cp);if(index!==conceptActive)updateConceptView(index);}else{const index=Math.round(p);if(index!==active)updateView(index);updateFocusable();}
    document.body.dataset.progress=progress.toFixed(4);document.body.dataset.settled=String(mode==='concepts'?cp===conceptTarget:p===target);
    if(!document.hidden&&hostVisible&&((!reduced&&!paused)||p!==target||cp!==conceptTarget||conceptScene.bridgeAge<1.1||(mode==='concepts'&&(conceptScene.panel!==Number(panelOpen)||conceptScene.modeAge<1.2))))schedule();
  }
  function updateFocusable(){
    const b=N.cameraAt(D.views,p);
    chapters.forEach(node=>{const c=D.chapters[Number(node.dataset.chapter)-1],shown=c.x>=b.x&&c.x<=b.x+900&&c.y>=b.y&&c.y<=b.y+510;node.tabIndex=shown?0:-1;node.setAttribute('aria-hidden',String(!shown));});
    svg.querySelectorAll('.experiment-node').forEach(n=>{const tr=n.transform.baseVal.consolidate().matrix,shown=tr.e>=b.x&&tr.e<=b.x+900&&tr.f>=b.y&&tr.f<=b.y+510;n.tabIndex=shown?0:-1;n.setAttribute('aria-hidden',String(!shown));});
  }
  function updateView(index){
    active=index;const v=D.views[index],stage=index===0?0:index<3?1:2;
    document.body.dataset.view=index;document.body.dataset.stage=stage+1;
    $('region-roman').textContent=['I','II','III'][stage];$('region-range').textContent=ranges[index];
    $('region-title').textContent=v.title;$('region-description').textContent=captions[index];
    $('view-count').innerHTML=String(index+1).padStart(2,'0')+' <i>/ 05</i>';
    $('journey').setAttribute('aria-valuetext',`${v.title}，第 ${v.range} 章`);
    $('previous-view').disabled=index===0;$('next-view').disabled=index===4;
    document.querySelectorAll('.view-stops [data-view]').forEach(b=>Number(b.dataset.view)===index?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current'));
    document.querySelectorAll('.stage-nav button').forEach((b,i)=>i===stage?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current'));
    const visible=N.visibleChapters(D.chapters,N.cameraAt(D.views,index));
    $('mobile-chapters').replaceChildren(...visible.map(c=>{const b=document.createElement('button');b.dataset.openChapter=c.n;b.innerHTML=`<span>${String(c.n).padStart(2,'0')}</span>${c.name}<em aria-hidden="true">↗</em>`;return b;}));
    $('announcer').textContent=`${v.title}，当前视野包含第 ${v.range} 章。`;
    document.body.dataset.visible=visible.map(c=>c.n).join(',');
  }
  function go(value){if(!interactionReady)return;target=N.clampProgress(value);hideTooltip();schedule();}
  function goConcept(value){if(!interactionReady)return;conceptTarget=Number.isFinite(value)?value:0;hideTooltip();if(panelOpen&&C.concepts[C.index(value)].id!==selectedConcept.id){openConcept(C.concepts[C.index(value)].id,false);}schedule();}
  function updateConceptView(index){
    conceptActive=index;const c=C.concepts[index];document.body.dataset.view=index;document.body.dataset.concept=c.id;
    $('region-roman').textContent=c.number;$('region-range').textContent='核心概念 / '+c.english;
    $('region-title').textContent=c.question;$('region-description').textContent=c.statement;
    $('view-count').innerHTML=c.number+' <i>/ 04</i>';$('journey').setAttribute('aria-valuetext',c.title+'，四个概念分区中的第'+(index+1)+'区');
    $('previous-view').disabled=false;$('next-view').disabled=false;
    document.querySelectorAll('[data-concept-stop]').forEach(b=>Number(b.dataset.conceptStop)===index?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current'));
    $('announcer').textContent=c.title+'。点击概念图形，展开'+c.chapters.length+'门关联课程。';
  }
  function setNavigation(next,initial=false){
    if(!initial&&(!interactionReady||next===mode))return;
    closeDialogs();closeConceptPanel(false);mode=next==='concepts'?'concepts':'stages';document.body.dataset.navigation=mode;
    $('world-svg').inert=mode!=='stages';$('world-svg').setAttribute('aria-hidden',String(mode!=='stages'));
    $('concept-world').inert=mode!=='concepts';$('concept-world').setAttribute('aria-hidden',String(mode!=='concepts'));
    if(mode==='concepts'){chapters.forEach(node=>node.tabIndex=-1);document.querySelectorAll('#world-svg .experiment-node').forEach(node=>node.tabIndex=-1);}else document.querySelectorAll('#concept-world .concept-portal,#concept-world .experiment-node').forEach(node=>node.tabIndex=-1);
    document.querySelectorAll('.directory-mode [data-navigation]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.navigation===mode)));
    document.querySelector('.view-stops').setAttribute('aria-label',mode==='concepts'?'四个概念分区':'五个固定视野');
    document.querySelector('.explore-cue>span:last-child').innerHTML=mode==='concepts'?'循环拖动或滚动<small>点击概念图形，展开课程</small>':'拖动或滚动探索<small>点击章节，展开好奇</small>';
    $('atlas').setAttribute('aria-label',mode==='concepts'?'沿闭环探索四个人工智能概念':'沿路径探索13个课程章节');
    $('overview-title').textContent=mode==='concepts'?'人工智能概念全图':'好奇的路径';
    $('overview-dialog').querySelector('.dialog-top>span').textContent=mode==='concepts'?'四个概念分区 / 一条闭合路径':'三片区域 / 一条连续路径';
    $('overview-description').textContent=mode==='concepts'?'选择一个概念图形，走近它并展开关联课程。':'选择一个章节，回到它所在的视野。';
    if(mode==='concepts'){conceptScene.enter(reduced||initial);conceptActive=-1;updateConceptView(C.index(cp));}else{active=-1;updateView(Math.round(p));}
    if(!initial)conceptScene.beginSwitch(mode,reduced);
    if(!initial){const url=new URL(location.href);url.searchParams.set('mode',mode);if(mode==='concepts'){url.searchParams.set('concept',C.concepts[C.index(conceptTarget)].id);url.searchParams.set('cview',String(C.wrap(conceptTarget)));}else{url.searchParams.delete('concept');url.searchParams.delete('cview');}history.replaceState(null,'',url);}
    last=0;schedule();
  }
  function conceptCourseList(){
    const c=selectedConcept,host=$('concept-course-list'),focus=document.activeElement?.id;host.replaceChildren();
    c.chapters.forEach((n,i)=>{
      const chapter=D.chapters.find(item=>item.n===n),button=document.createElement('button');button.id='concept-course-'+n;button.className='concept-course'+(n===c.featured?' is-featured':'');button.dataset.openChapter=String(n);button.title=chapter.question;button.style.setProperty('--course-order',i);
      const number=document.createElement('span');number.className='concept-course-number';number.textContent=String(n).padStart(2,'0');
      const copy=document.createElement('span'),title=document.createElement('b'),question=document.createElement('small');copy.className='concept-course-copy';title.textContent=chapter.name;if(n===c.featured){const tag=document.createElement('span');tag.className='concept-featured-tag';tag.textContent='代表实验';title.append(tag);}question.textContent=chapter.question;copy.append(title,question);
      const state=chapterProgress(n);let stateLabel=null;if(state.status==='ok'){stateLabel=document.createElement('em');stateLabel.className='concept-course-status';stateLabel.textContent=state.value.completed+'/'+state.value.total;stateLabel.title=progressText(state.value);}
      const arrow=document.createElement('span');arrow.className='concept-course-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');button.append(number,copy);if(stateLabel)button.append(stateLabel);button.append(arrow);host.append(button);
    });
    if(focus&&focus.startsWith('concept-course-'))$(focus)?.focus({preventScroll:true});
  }
  function openConcept(id,move=true){
    const c=C.byId(id);if(!c)return;
    selectedConcept=c;conceptScene.selected=id;conceptDetail=false;panelOpen=true;
    document.body.dataset.conceptPanel='true';$('concept-panel').inert=false;$('concept-panel').setAttribute('aria-hidden','false');$('concept-panel').dataset.view='list';$('concept-panel').dataset.courseCount=String(c.chapters.length);
    if(chapterInner.parentElement!==$('chapter-dialog'))$('chapter-dialog').append(chapterInner);
    $('concept-panel-eyebrow').textContent=c.number+' / '+(c.primary?'主核心概念':'概念拓展');$('concept-panel-title').textContent=c.title;
    $('concept-panel-question').textContent=c.question;$('concept-course-count').textContent=c.chapters.length+' 门课程';$('concept-panel-takeaway').textContent=c.takeaway;
    conceptCourseList();
    if(move)conceptTarget=C.nearestStop(cp,C.concepts.indexOf(c));
    schedule();
  }
  function closeConceptPanel(focus=true){
    panelOpen=false;conceptDetail=false;conceptScene.selected=null;document.body.dataset.conceptPanel='false';$('concept-panel').inert=true;$('concept-panel').setAttribute('aria-hidden','true');
    if(chapterInner.parentElement!==$('chapter-dialog'))$('chapter-dialog').append(chapterInner);
    if(focus&&mode==='concepts')$('concept-'+selectedConcept.id)?.focus({preventScroll:true});schedule();
  }
  function openDialog(id){hideTooltip();const dialog=$(id);if(!dialog.open)dialog.showModal();pointer.active=false;document.body.dataset.modal='true';schedule();}
  function closeDialogs(){dialogs.forEach(d=>{if(d.open)d.close();});}
  dialogs.forEach(d=>{
    d.addEventListener('close',()=>{document.body.dataset.modal=String(isModal());last=0;schedule();});
    d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
    d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());
  });
  function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2400);}
  function paintSaved(){
    chapters.forEach(n=>n.classList.toggle('is-saved',saved.has(Number(n.dataset.chapter))));
    $('saved-count').textContent=saved.size;
    const has=saved.has(currentChapter);$('save-chapter').setAttribute('aria-pressed',String(has));$('save-chapter').innerHTML=has?'<span aria-hidden="true">✓</span> 已加入想学':'<span aria-hidden="true">＋</span> 加入想学';
  }
  function showChapter(n,move=true){
    const c=D.chapters.find(c=>c.n===n);if(!c)return;
    const chapterInView=N.visibleChapters(D.chapters,N.cameraAt(D.views,target)).some(item=>item.n===n);
    if(mode==='concepts'){const group=C.forChapter(n,selectedConcept.id);if(group)openConcept(group.id,move||group.id!==selectedConcept.id);}
    else if(move||!chapterInView){const index=N.viewForChapter(D,n,target);if(index!==null)go(index);}
    currentChapter=n;closeDialogs();
    $('chapter-stage').textContent=`${['I','II','III'][c.stage-1]} / ${D.regions[c.stage-1].name}`;
    $('chapter-number').textContent=String(n).padStart(2,'0');$('chapter-short').textContent=c.name;
    $('chapter-thumb').style.backgroundImage=`url(assets/chapters/c${String(n).padStart(2,'0')}.jpg)`;$('chapter-thumb-number').textContent=String(n).padStart(2,'0');$('chapter-thumb-name').textContent=c.name;
    $('chapter-title').textContent=c.question;$('chapter-summary').textContent=c.summary;$('chapter-task').textContent=c.task;
    $('chapter-ideas').replaceChildren(...c.ideas.map(word=>{const n=document.createElement('span');n.textContent=word;return n;}));
    const related=selectedConcept.chapters,relatedIndex=related.indexOf(n),last=mode==='concepts'?relatedIndex===related.length-1:n===D.chapters.at(-1).n;
    $('chapter-next').disabled=last;$('chapter-next').textContent=mode==='concepts'?(last?'已到本组最后一课':'下一关联课 →'):(last?'探索至此，创作开始':'下一章 →');
    $('chapter-experiment').hidden=!c.experiment;
    updateCourseEntry();
    chapters.forEach(node=>node.classList.toggle('is-current',Number(node.dataset.chapter)===n));
    paintSaved();
    if(mode==='concepts'){conceptDetail=true;$('concept-panel').dataset.view='detail';$('concept-panel').dataset.courseTab='intro';$('concept-chapter-host').append(chapterInner);document.querySelectorAll('[data-course-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.courseTab==='intro')));$('chapter-title').tabIndex=-1;$('chapter-title').focus({preventScroll:true});schedule();}
    else openDialog('chapter-dialog');
  }
  function catalog(){
    const host=$('catalog-list'),only=$('saved-filter').checked;host.replaceChildren();
    const recent=[];
    D.regions.forEach((r,i)=>{
      const group=D.chapters.filter(c=>c.stage===i+1&&(!only||saved.has(c.n)));if(!group.length)return;
      const section=document.createElement('section');section.className='catalog-section';
      const h=document.createElement('h3');h.textContent=`${r.roman} ${r.name} / ${r.range}`;section.append(h);
      group.forEach(c=>{const b=document.createElement('button');b.className='catalog-chapter';b.dataset.openChapter=c.n;
        const number=document.createElement('span');number.textContent=String(c.n).padStart(2,'0');
        const title=document.createElement('b');title.textContent=c.name;const detail=document.createElement('small');detail.textContent=c.ideas.slice(0,2).join(' · ');title.append(detail);b.append(number,title);
        const record=chapterProgress(c.n),available=NOVA_LINKED_COURSES.chapters.some(item=>item.n===c.n);
        const state=document.createElement('small');state.className='catalog-learning-state';
        if(record.status==='ok'){state.textContent=progressText(record.value);if(available)recent.push({chapter:c,value:record.value});}
        else state.textContent=available?'课程已开放':'课程导览 · 尚未开放';
        title.append(state);
        if(saved.has(c.n)){const mark=document.createElement('span');mark.className='saved-mark';mark.textContent='✓';b.append(mark);}section.append(b);
      });host.append(section);
    });$('catalog-empty').hidden=!(only&&saved.size===0);paintSaved();
    const recentHost=$('recent-learning-list');recentHost.replaceChildren();
    $('recent-learning').hidden=only||recent.length===0;
    recent.sort((a,b)=>b.value.updatedAt-a.value.updatedAt).slice(0,3).forEach(({chapter,value})=>{
      const button=document.createElement('button');button.dataset.openChapter=chapter.n;
      const title=document.createElement('b');title.textContent=String(chapter.n).padStart(2,'0')+' · '+chapter.name;
      const detail=document.createElement('small');detail.textContent=progressText(value);button.append(title,detail);recentHost.append(button);
    });
  }
  function chapterProgress(n){let storage;try{storage=window.NovaPlatform?window.NovaPlatform.progressStorage():localStorage;}catch{storage=null;}return NovaCourseLinks.readProgress(storage,n);}
  function progressText(value){return `${value.pathLabel} · ${value.completed}/${value.total}项活动`+(value.artifactCount?` · ${value.artifactCount}份成果`:'');}
  function showExperiment(kind){closeDialogs();NovaAtlasExperiments.open(kind);openDialog('experiment-dialog');}
  function updateCourseEntry(){
    const link=$('chapter-enter'),base=NovaCourseLinks.entry(NOVA_LINKED_COURSES,currentChapter,target,location.href),destination=mode==='concepts'?C.entryWithContext(base,selectedConcept.id,conceptTarget):base;
    link.hidden=!destination;
    if(destination)link.href=destination.href;else link.removeAttribute('href');
    const record=chapterProgress(currentChapter),panel=$('chapter-progress'),bar=$('chapter-progress-bar');
    panel.hidden=record.status==='missing';bar.hidden=record.status!=='ok';
    let label='进入课程';
    if(record.status==='ok'){
      $('chapter-progress-label').textContent=progressText(record.value);bar.max=record.value.total;bar.value=record.value.completed;
      label=record.value.completed===record.value.total?'继续探索':'继续课程';
    }else if(record.status==='invalid')$('chapter-progress-label').textContent='本机足迹摘要暂不可读，请进入课程查看原学习记录。';
    else if(record.status==='unavailable')$('chapter-progress-label').textContent='浏览器暂未允许读取本机学习足迹。';
    $('chapter-enter-label').textContent=label;link.setAttribute('aria-label',label);
    $('chapter-availability').textContent=destination?'课程已开放 · 作品与详细记录可在课程内回看。':'本章当前提供课程导览，正式课程尚未开放。';
    const archives=NOVA_LINKED_COURSES.archives||[],archive=archives.find(c=>c.n===currentChapter),archiveLink=$('chapter-archive');
    const oldEntry=NovaCourseLinks.entry({hub:NOVA_LINKED_COURSES.hub,chapters:archives},currentChapter,target,location.href);
    archiveLink.hidden=!oldEntry;
    if(oldEntry){archiveLink.href=oldEntry.href;archiveLink.textContent='回看'+archive.label+' ↗';archiveLink.title='旧版学习记录独立保留，不会替代当前课程进度。';}else archiveLink.removeAttribute('href');
  }
  function refreshProgress(){
    if($('chapter-dialog').open)updateCourseEntry();
    if(panelOpen){if(conceptDetail)updateCourseEntry();else conceptCourseList();}
    if($('catalog-dialog').open){const focused=document.activeElement?.closest('[data-open-chapter]')?.dataset.openChapter;catalog();if(focused)$('catalog-dialog').querySelector(`[data-open-chapter="${focused}"]`)?.focus();}
  }
  window.addEventListener('storage',event=>{if(event.key===null||event.key.startsWith(NovaCourseLinks.progressPrefix))refreshProgress();});
  window.addEventListener('pageshow',refreshProgress);
  window.addEventListener('nova:platform-ready',refreshProgress);
  window.addEventListener('nova:platform-status',refreshProgress);
  function applyMotion(){document.body.dataset.reduced=String(reduced);$('motion-toggle').setAttribute('aria-pressed',String(reduced));$('motion-toggle').setAttribute('aria-label',reduced?'恢复动态':'减少动态');$('motion-toggle').innerHTML=reduced?'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 8 6-8 6Z"/></svg>':'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10"/></svg>';last=0;schedule();}
  $('motion-toggle').onclick=()=>{reduced=!reduced;safeWrite('nova-atlas-reduced',String(reduced));applyMotion();notifyHost({type:'nova:atlas-motion',reduced});toast(reduced?'已减少动态，仍可自由探索':'动态已恢复');};
  media.addEventListener('change',e=>{if(!embedded&&safeRead('nova-atlas-reduced')===null){reduced=e.matches;applyMotion();}});
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(Number(b.dataset.go)));
  document.querySelectorAll('.directory-mode [data-navigation]').forEach(b=>b.onclick=()=>setNavigation(b.dataset.navigation));
  document.querySelectorAll('[data-concept-stop]').forEach(b=>b.onclick=()=>goConcept(C.nearestStop(cp,Number(b.dataset.conceptStop))));
  $('concept-panel-close').onclick=()=>closeConceptPanel();
  $('concept-detail-back').onclick=()=>{openConcept(selectedConcept.id,false);$('concept-panel-title').focus({preventScroll:true});};
  $('concept-panel-all').onclick=()=>{closeConceptPanel(false);openDialog('overview-dialog');};
  document.querySelectorAll('[data-course-tab]').forEach(b=>b.onclick=()=>{$('concept-panel').dataset.courseTab=b.dataset.courseTab;document.querySelectorAll('[data-course-tab]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));});
  document.querySelectorAll('.view-stops [data-view]').forEach(b=>b.onclick=()=>go(Number(b.dataset.view)));
  $('previous-view').onclick=()=>mode==='concepts'?goConcept(Math.round(conceptTarget)-1):go(Math.max(0,Math.round(target)-1));$('next-view').onclick=()=>mode==='concepts'?goConcept(Math.round(conceptTarget)+1):go(Math.min(4,Math.round(target)+1));
  $('journey').addEventListener('input',e=>{const value=Number(e.target.value)/1000;if(mode==='concepts')goConcept(Math.round((cp-value)/4)*4+value);else go(value);});
  $('catalog-open').onclick=()=>{catalog();openDialog('catalog-dialog');};$('saved-filter').onchange=catalog;
  $('minimap-open').onclick=()=>openDialog('overview-dialog');
  $('save-chapter').onclick=()=>{saved.has(currentChapter)?saved.delete(currentChapter):saved.add(currentChapter);safeWrite(savedKey,JSON.stringify([...saved]));paintSaved();toast(saved.has(currentChapter)?storageAvailable?'已加入想学，保存在这台设备':'已加入本次想学；浏览器未允许保存':'已移出想学');};
  $('chapter-next').onclick=()=>{if(mode==='concepts'){const list=selectedConcept.chapters,i=list.indexOf(currentChapter);if(i<list.length-1)showChapter(list[i+1],false);}else showChapter(currentChapter+1);};
  $('chapter-experiment').onclick=()=>{const kind=D.chapters.find(c=>c.n===currentChapter)?.experiment;if(kind)showExperiment(kind);};
  $('chapter-enter').addEventListener('click',updateCourseEntry);
  document.addEventListener('click',e=>{
    const concept=e.target.closest('.concept-portal[data-concept],.concept-portal[data-overview-concept]');if(concept&&performance.now()>suppressClickUntil){closeDialogs();openConcept(concept.dataset.concept||concept.dataset.overviewConcept);$('concept-panel-title').focus({preventScroll:true});return;}
    const item=e.target.closest('[data-open-chapter]');if(item)showChapter(Number(item.dataset.openChapter));
    const node=e.target.closest('.chapter');if(node&&performance.now()>suppressClickUntil)showChapter(Number(node.dataset.chapter),false);
    const experiment=e.target.closest('.experiment-node');if(experiment&&performance.now()>suppressClickUntil)showExperiment(experiment.dataset.experiment);
  });
  document.addEventListener('keydown',e=>{
    if(!interactionReady)return;
    const targetEl=e.target;
    if(e.key==='Escape'&&panelOpen&&!isModal()){e.preventDefault();closeConceptPanel();return;}
    if((e.key==='Enter'||e.key===' ')&&targetEl.matches('[role=button]')){e.preventDefault();targetEl.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
    if(isModal()||targetEl.matches('input,textarea,select')||targetEl.closest('#concept-panel')||e.altKey||e.metaKey||e.ctrlKey)return;
    if(mode==='concepts'){
      if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();goConcept(Math.floor(conceptTarget+.01)+1);}
      if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();goConcept(Math.ceil(conceptTarget-.01)-1);}
      if(e.key==='Home'){e.preventDefault();goConcept(C.nearestStop(cp,0));}if(e.key==='End'){e.preventDefault();goConcept(C.nearestStop(cp,3));}return;
    }
    if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();go(Math.min(4,Math.floor(target+.01)+1));}
    if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(Math.max(0,Math.ceil(target-.01)-1));}
    if(e.key==='Home'){e.preventDefault();go(0);}if(e.key==='End'){e.preventDefault();go(4);}
  });
  $('atlas').addEventListener('wheel',e=>{if(isModal()||e.ctrlKey)return;e.preventDefault();const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(mode==='concepts')goConcept(conceptTarget+Math.max(-280,Math.min(280,delta*(e.deltaMode===1?16:e.deltaMode===2?700:1)))/1150);else go(N.wheelProgress(target,delta,e.deltaMode));},{passive:false});
  function measure(){frameRect=viewFrame.getBoundingClientRect();hideTooltip();schedule();}
  new ResizeObserver(measure).observe(viewFrame);
  viewFrame.addEventListener('pointerdown',e=>{if(isModal()||e.button!==0)return;drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,moved:false};hideTooltip();});
  viewFrame.addEventListener('pointermove',e=>{
    const box=mode==='concepts'?conceptScene.box:N.cameraAt(D.views,p),nx=(e.clientX-frameRect.left)/frameRect.width,ny=(e.clientY-frameRect.top)/frameRect.height;
    pointer={active:true,nx:(nx-.5)*2,ny:(ny-.5)*2,x:box.x+nx*box.width,y:box.y+ny*box.height};
    conceptScene.hover=e.target.closest('.concept-portal[data-concept]')?.dataset.concept||null;
    scene.assemblyHover=mode==='stages'&&(Boolean(e.target.closest('[data-experiment=assemble]'))||Math.hypot(pointer.x-2284,pointer.y-938)<135);
    if(drag&&e.pointerId===drag.id){
      if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7){drag.moved=true;viewFrame.setPointerCapture(e.pointerId);viewFrame.classList.add('is-dragging');}
      if(drag.moved){
        const i=clamp(Math.floor(target===4?3:target),0,3),a=D.views[i],b=D.views[i+1],vx=b.left-a.left,vy=b.top-a.top,len=Math.hypot(vx,vy);
        const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(mode==='concepts'){const tangent=C.tangentAt(conceptTarget);goConcept(conceptTarget-(dx*tangent.x+dy*tangent.y)/frameRect.width*1.7);}else go(target-(dx*vx+dy*vy)/len/frameRect.width*1.5);
      }
      drag.x=e.clientX;drag.y=e.clientY;
    }else if(e.pointerType==='mouse'){
      const node=e.target.closest('.chapter');if(node)showTooltip(Number(node.dataset.chapter),e.clientX,e.clientY);else hideTooltip();
    }
    schedule();
  });
  function endDrag(e){if(!drag||drag.id!==e.pointerId)return;if(drag.moved)suppressClickUntil=performance.now()+400;drag=null;viewFrame.classList.remove('is-dragging');if(viewFrame.hasPointerCapture(e.pointerId))viewFrame.releasePointerCapture(e.pointerId);}
  window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);viewFrame.addEventListener('lostpointercapture',()=>{drag=null;viewFrame.classList.remove('is-dragging');});
  viewFrame.addEventListener('pointerleave',()=>{pointer.active=false;pointer.nx=pointer.ny=0;scene.assemblyHover=false;conceptScene.hover=null;hideTooltip();});
  window.addEventListener('blur',()=>{drag=null;viewFrame.classList.remove('is-dragging');pointer.active=false;hideTooltip();});
  function showTooltip(n,x,y){if(drag||isModal())return;const c=D.chapters[n-1],tip=$('chapter-tooltip');tip.querySelector('span').textContent=`${String(n).padStart(2,'0')} / ${D.regions[c.stage-1].name}`;tip.querySelector('b').textContent=c.question;tip.hidden=false;tip.style.left=clamp(x+20,12,innerWidth-280)+'px';tip.style.top=clamp(y+20,12,innerHeight-200)+'px';}
  function hideTooltip(){$('chapter-tooltip').hidden=true;}
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
  document.addEventListener('focusin',e=>{if(e.target.closest('.chapter'))hideTooltip();});
  if(embedded){
    document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();notifyHost({type:'nova:atlas-home'});});
    window.addEventListener('message',e=>{
      if(e.source!==parent||(hostOrigin!=='*'&&e.origin!==hostOrigin)||e.data?.type!=='nova:atlas-state')return;
      const message=e.data;if(typeof message.visible!=='boolean'||typeof message.active!=='boolean'||typeof message.reduced!=='boolean'||!Number.isInteger(message.generation))return;
      const activate=message.active&&!hostActive;
      const reset=message.generation!==hostGeneration;
      if(reset){hostGeneration=message.generation;closeDialogs();closeConceptPanel(false);p=target=0;cp=conceptTarget=0;time=entrance=0;active=conceptActive=-1;focusOnAwake=false;}
      hostVisible=message.visible;hostActive=message.active;reduced=message.reduced;
      document.body.dataset.hostActive=String(hostActive);last=0;
      if(!hostVisible){cancelAnimationFrame(raf);raf=0;closeDialogs();}
      // Paint the closed entrance while hidden, so re-entry cannot expose the preceding full diagram.
      if(reset||!hostVisible){scene.render(p,time,pointer,reduced,0,entrance);conceptScene.render(cp,time,pointer,reduced,0,scene.appearance,false);}
      if(activate)focusOnAwake=true;
      applyMotion();
      syncEntrance();
    });
  }
  window.NOVA_ATLAS=Object.freeze({getDiagnostics:()=>({ready:assetsReady,embedded,hostVisible,hostActive,interactive:interactionReady,awakening:scene.appearance,mode,progress:mode==='concepts'?cp:p,target:mode==='concepts'?conceptTarget:target,concept:selectedConcept.id,panelOpen,time,entrance,reduced,visibleBirds:mode==='stages'?(scene.flock.visible||0):0})});
  applyMotion();paintSaved();setNavigation(mode,true);scene.render(p,0,pointer,reduced,1,0);syncEntrance();schedule();
  const imagePaths=[...new Set([...document.querySelectorAll('#world-svg image,#concept-world image')].map(n=>n.getAttribute('href')))];
  Promise.all(imagePaths.map(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.decode().then(resolve,reject);image.onerror=()=>reject(new Error(src));image.src=src;}))).then(()=>{assetsReady=true;entrance=0;last=0;scene.render(p,time,pointer,reduced,0,entrance);syncEntrance();document.body.dataset.ready='true';schedule();notifyHost({type:'nova:atlas-ready'});}).catch(()=>{
    notifyHost({type:'nova:atlas-error'});
    const loading=$('loading');loading.querySelector('p').textContent='部分画面未能加载，请重新尝试。';const retry=document.createElement('button');retry.textContent='重新加载';retry.className='plain-button';retry.onclick=()=>location.reload();loading.append(retry);
  });
})();
