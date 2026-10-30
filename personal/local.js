(async function(){
  'use strict';
  const client=await window.NovaPlatformReady;await client.ready;
  const manifest=window.NovaStorageManifest,$=id=>document.getElementById(id);
  let selected=Number(new URL(location.href).searchParams.get('chapter'))||1,page=0,records=new Map(),current;
  if(!manifest.some(item=>item.chapter===selected))selected=1;
  const summary=raw=>{try{const value=JSON.parse(raw);return value&&Number.isInteger(value.completed)&&Number.isInteger(value.total)?value:null;}catch{return null;}};
  const say=text=>{$('status').textContent=text;};
  function download(data,mimeType,name){
    const url=mimeType==='image/png'?data:URL.createObjectURL(new Blob([data],{type:mimeType}));
    const a=document.createElement('a');a.href=url;a.download=name;a.click();if(!url.startsWith('data:'))setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function render(){
    try{
      records=new Map((await client.listChapters()).map(row=>[row.chapter,row]));
      const summaries=[...records.values()].map(row=>summary(row.summary)).filter(Boolean),finished=summaries.filter(s=>s.completed===s.total).length;
      const discoveries=summaries.reduce((sum,s)=>sum+Math.max(0,Math.min(s.completed,s.total)),0),started=summaries.filter(s=>s.completed>0&&s.completed<s.total).length;
      $('overall').textContent=finished+' / '+manifest.length;
      $('overall-detail').textContent=discoveries?(started?started+' 章进行中 · ':'')+'已有 '+discoveries+' 项学习发现':'还没有学习发现';$('chapters').replaceChildren();
      for(const item of manifest){const s=summary(records.get(item.chapter)?.summary),button=document.createElement('button');button.className='chapter';button.setAttribute('aria-current',String(item.chapter===selected));
        const number=document.createElement('b');number.textContent=String(item.chapter).padStart(2,'0');const title=document.createElement('strong');title.textContent=item.title;const kept=records.get(item.chapter)?.artifacts?.length||0,progress=document.createElement('span');progress.textContent=(s?s.completed+' / '+s.total+' 项发现':kept?'':'还没有学习记录')+(kept?(s?' · ':'')+kept+' 件作品':'');button.append(number,title,progress);button.onclick=()=>{selected=item.chapter;page=0;void render();};$('chapters').append(button);}
      const item=manifest.find(item=>item.chapter===selected);current=await client.snapshot(selected);const s=summary(current.summary);
      $('chapter-number').textContent='CHAPTER '+String(selected).padStart(2,'0');$('chapter-title').textContent=item.title;
      $('chapter-progress').textContent=s?'已留下 '+s.completed+' / '+s.total+' 项学习发现。':'从一次探索开始，留下自己的发现。';
      const returnTo=new URL('../courses/?chapter='+selected,location.href),destination=new URL('../chapters/'+String(selected).padStart(2,'0')+'/',location.href);destination.searchParams.set('novaChapter',selected);destination.searchParams.set('novaReturn',returnTo.href);$('continue').href=destination.href;
      const artifacts=Object.values(current.artifacts).sort((a,b)=>String(b.savedAt||'').localeCompare(String(a.savedAt||''))),pages=Math.max(1,Math.ceil(artifacts.length/4));page=Math.min(page,pages-1);$('artifacts').replaceChildren();$('artifact-count').textContent=artifacts.length?artifacts.length+' 件':'';
      if(!artifacts.length){const p=document.createElement('p');p.className='empty';p.textContent='还没有留存作品。各章导出的作品会在这里出现。';$('artifacts').append(p);}
      for(const artifact of artifacts.slice(page*4,page*4+4)){const button=document.createElement('button');button.className='artifact';const text=document.createElement('span'),title=document.createElement('span'),time=document.createElement('time');title.textContent=artifact.title;title.title=artifact.title;text.append(title);const savedAt=Date.parse(artifact.savedAt);if(!Number.isNaN(savedAt)){time.dateTime=new Date(savedAt).toISOString();const at=new Date(savedAt),two=n=>String(n).padStart(2,'0');time.textContent='留存于 '+(at.getMonth()+1)+'月'+at.getDate()+'日 '+two(at.getHours())+':'+two(at.getMinutes());text.append(time);}const mark=document.createElement('b');mark.textContent='↓';button.setAttribute('aria-label','下载 '+artifact.title);button.append(text,mark);button.onclick=()=>download(artifact.data,artifact.mimeType,artifact.title.replace(/[<>:"/\\|?*]/g,'_')+({ 'application/json':'.json','text/html':'.html','text/plain':'.txt','image/png':'.png'}[artifact.mimeType]));$('artifacts').append(button);}
      $('page-number').textContent=(page+1)+' / '+pages;$('previous').disabled=page===0;$('next').disabled=page===pages-1;
    }catch(error){say(error.message);}
  }
  $('refresh').onclick=()=>void render();$('previous').onclick=()=>{page--;void render();};$('next').onclick=()=>{page++;void render();};
  $('reset').onclick=()=>$('reset-dialog').showModal();$('cancel-reset').onclick=()=>$('reset-dialog').close();
  $('confirm-reset').onclick=async()=>{try{await client.resetLocalData();$('reset-dialog').close();page=0;await render();say('本机奇点记录已清除，可以重新开始。');}catch(error){$('reset-dialog').close();say(error.message);}};
  window.addEventListener('storage',()=>void render());await render();
})();
