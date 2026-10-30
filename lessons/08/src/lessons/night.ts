import type { App } from "../app.ts";
import {bytesToBase64, type Work} from "../state.ts";
import type { Generation } from "../model/client.ts";
import { encodeRecipe } from "../core/recipe.ts";
import { addTextChunks, readTextChunks } from "../core/png.ts";
import { renderSand } from "../render/sand.ts";
import { h } from "../ui/dom.ts";
import { button, choice, column, field, figures, note, picture, range, row, tag, text } from "../ui/components.ts";
import { downloadBlob } from "../ui/download.ts";
import { decodeImage, writing } from "./shared.ts";
import { onLeave } from "./index.ts";

const SOURCE="Google Quick, Draw! Dataset 的贡献者 · CC BY 4.0";
const workList=(a:App)=>a.state.program.map(id=>a.state.album.find(w=>w.id===id)).filter((w):w is Work=>!!w);
export function renderNight(a:App,id:number){if(id===21)curate(a);else if(id===22)limits(a);else if(id===23)labeling(a);else if(id===24)credits(a);else show(a);}
function programRequired(a:App){
  const works=workList(a);if(works.length===6)return works;
  a.mount(column(h("div.empty-object",{},"今晚的六个展位，等你来安排"),button("去策展台",()=>a.go(21),"primary")),column(h("h2",{},"先选好六幅不同作品"),text("从你的真实作品卡册中选图并编排，夜场会按每张配方重新计算。")));
  return null;
}
function curate(a:App){
  const e=a.ev(),d=a.memory("curate",()=>({selected:0})),works=workList(a);
  const slots=figures(Array.from({length:6},(_,i)=>{const w=works[i];return picture(w?decodeImage(w.preview):null,(i+1)+" · "+(w?encodeRecipe(w.recipe,a.meta.classes):"空展位"),{size:200,palette:"night",selected:i===d.selected,empty:"点作品卡册补选",action:()=>{d.selected=i;a.refresh();}});}),3);
  const unused=a.state.album.filter(w=>!a.state.program.includes(w.id));
  const reject=h("select",{"aria-label":"未采用作品"},h("option",{value:""},"选一张实际未采用图"),...unused.map(w=>h("option",{value:w.id},encodeRecipe(w.recipe,a.meta.classes))));
  reject.value=String(e.rejectedWork??"");reject.onchange=()=>{e.rejectedWork=reject.value;e.rejectionReason="";a.save();a.refresh();};
  const move=(delta:number)=>{const ids=[...a.state.program],from=d.selected,to=from+delta;if(to<0||to>=ids.length)return;[ids[from],ids[to]]=[ids[to],ids[from]];a.setProgram(ids);d.selected=to;a.refresh();};
  const selectedRejected=unused.find(w=>w.id===e.rejectedWork);
  a.mount(slots,column(h("h2",{},"你决定今晚展示什么"),field("我的夜场名称",a.state.programTitle??"海边的一天",v=>{a.state.programTitle=v;a.save();},{max:60}),row(button("补选作品",()=>a.album(w=>{if(a.state.program.includes(w.id))return;a.setProgram([...a.state.program,w.id]);a.refresh();}),"primary"),tag(works.length+" / 6 展位")),h("label.select-tool",{},h("span",{},"为用途作取舍"),reject),selectedRejected?picture(decodeImage(selectedRejected.preview),"没有采用的实际作品",{size:100,palette:"night"}):null,writing(a,"未采用的理由",String(e.rejectionReason??""),v=>{e.rejectionReason=v;a.save();})),[button("上移作品",()=>move(-1),"tool-button"),button("下移作品",()=>move(1),"tool-button"),button("移出节目",()=>{a.setProgram(a.state.program.filter((_,i)=>i!==d.selected));d.selected=Math.max(0,d.selected-1);a.refresh();},"tool-button"),button("回配方摊",()=>a.go(18),"tool-button")]);
}
function limits(a:App){
  const e=a.ev(),d=a.memory("limits",()=>({selected:0})),answered=(e.answered??={}) as Record<string,string>;
  const requests=["长颈鹿","我家的小狗"],keys=["giraffe","pet"];
  const ticket=column(h("div.request-ticket",{},h("p",{},"观众递来的点题卡"),h("h2",{},requests[d.selected]),text("先核对它能接收什么，再决定如何回应。")),h("h3",{},"这位师傅实际支持的条件签"),h("div.condition-grid",{},...a.meta.classes.map(c=>h("span.condition-sign",{},c.zh))));
  const correct=d.selected===0?0:1,options=["没有这个类别条件，不能把文字直接交给模型","即使有相近类别，也没有提供指定宠物身份的输入","所有生成模型都不能画任何新东西"];
  a.mount(ticket,column(h("h2",{},"题目签有明确的边界"),choice(options,answered[keys[d.selected]]?correct:undefined,i=>{if(i!==correct){a.toast("把判断限定在本章模型支持的输入范围内。");return;}answered[keys[d.selected]]="scope";a.save();a.done();a.refresh();}),note("这里检查的是本章12类条件、种子、力度与步数接口；不替所有生成模型下结论。")),[...requests.map((r,i)=>button(r,()=>{d.selected=i;a.refresh();},"tool-button "+(d.selected===i?"selected":""))),button("回去试条件",()=>a.go(16),"tool-button")]);
}
async function canvasBytes(canvas:HTMLCanvasElement){
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("图片编码未完成，请重试。")),"image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}
async function labelledExport(a:App,w:Work){
  const g=await a.generate(w.recipe,true),art=h("canvas",{width:512,height:512});renderSand(art,g.image,{palette:"night",mode:"glow"});
  const c=h("canvas",{width:660,height:740}),ctx=c.getContext("2d")!;
  ctx.fillStyle="#142c3e";ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(art,74,93);
  ctx.fillStyle="#f5e9c8";ctx.font="26px 'Microsoft YaHei'";ctx.fillText((a.state.programTitle??"我的潮汐夜场").slice(0,20),54,55);
  ctx.font="bold 25px 'Microsoft YaHei'";ctx.fillText("AI 生成",470,650);ctx.font="18px 'Microsoft YaHei'";ctx.fillText(encodeRecipe(w.recipe,a.meta.classes),54,650);
  ctx.font="16px 'Microsoft YaHei'";ctx.fillText("Google Quick, Draw! Dataset · CC BY 4.0",54,699);
  const info={Method:"AI 生成",Model:a.meta.version,Recipe:encodeRecipe(w.recipe,a.meta.classes),Source:SOURCE,CuratedTitle:a.state.programTitle??"我的潮汐夜场"};
  const png=addTextChunks(await canvasBytes(c),info),read=readTextChunks(png);
  if(Object.entries(info).some(([key,value])=>read[key]!==value))throw new Error("PNG说明没有正确写入，不能记为核对完成。");
  return {png,read};
}
function labeling(a:App){
  const works=programRequired(a);if(!works)return;const e=a.ev(),d=a.memory("labeling",()=>({index:0})),w=works[d.index],labels=(e.labeled as string[])??[];
  const object=picture(decodeImage(w.preview),encodeRecipe(w.recipe,a.meta.classes),{size:420,palette:"night",mode:"glow"});
  if(labels.includes(w.id))object.append(h("strong.ai-badge",{},"AI 生成"));
  const names:Record<string,string>={Method:"生成方式",Model:"本次模型",Recipe:"完整配方",Source:"实际数据来源",CuratedTitle:"展演名称"};
  const info=e.fileInfo as Record<string,string>|undefined;
  const panel=column(h("h2",{},"画面标识与文件说明都要查"),button("为六幅作品添加 AI 标识",()=>{e.labeled=works.map(w=>w.id);a.save();a.refresh();},"secondary"),button("导出并核对 PNG",async()=>{
    if(!((e.labeled as string[]??[]).includes(w.id))){a.toast("先添加画面上的标识。");return;}
    const result=await a.run("重算作品，写入并读回PNG说明……",()=>labelledExport(a,w));
    if(!result)return;e.fileInfo=result.read;e.checked=true;e.checkedWork=w.id;a.save();downloadBlob(new Blob([result.png as BlobPart],{type:"image/png"}),"沙画-"+encodeRecipe(w.recipe,a.meta.classes)+".png");
    try{a.repository.artifact({id:"sand-"+w.id,title:"沙画 "+encodeRecipe(w.recipe,a.meta.classes),mimeType:"image/png",data:"data:image/png;base64,"+bytesToBase64(result.png)});}catch{a.toast("图片已生成，作品暂未保存到本机；可保存本机文件。");}
    a.done();a.refresh();
  },"primary model-input"),...(info?Object.entries(info).filter(([k])=>k!=="CuratedTitle").map(([k,v])=>text((names[k]??k)+"："+v,"file-reading")):[note("这次文件说明尚未读回。")]),note("截图或转存可能丢失标识；分享前需要再次检查。"));
  a.mount(object,panel,works.map((x,i)=>button("第 "+(i+1)+" 幅",()=>{d.index=i;a.refresh();},"tool-button "+(i===d.index?"selected":""))));
}
function credits(a:App){
  const e=a.ev(),d=a.memory("credits",()=>({page:0}));
  const samples=Array.from({length:6},(_,i)=>{const cls=d.page*6+i;return picture(a.practice.byClass(cls)[3].image,a.meta.classes[cls].zh+" · 人的涂鸦",{size:160,mode:"pixels"});});
  const check=h("input",{type:"checkbox","aria-label":"我已核对实际数据来源"});check.checked=!!e.sourceReviewed;check.onchange=()=>{e.sourceReviewed=check.checked;a.save();};
  a.mount(figures(samples,3),column(h("h2",{},"每一笔，都有人贡献"),text("Google Quick, Draw! Dataset · CC BY 4.0"),tag("模型训练用 "+a.meta.training.images.toLocaleString()+" 幅涂鸦"),text("本页仅从1920幅教学抽样中展示实例，不是完整训练集。"),h("label.credit-source",{},check,h("span",{},"我已核对本章实际数据来源")),writing(a,"来源与贡献说明",a.state.creditText??"",v=>{a.state.creditText=v;a.save();},500),button("把说明加入节目单",()=>{if(!e.sourceReviewed||!a.state.creditText?.trim()){a.toast("核对来源，再留下你的实际贡献说明。");return;}e.credited=true;a.save();a.done();},"primary")),[],row(button(d.page?"看前六类":"看后六类",()=>{d.page=1-d.page;a.refresh();},"secondary"),text("教学抽样 · 第 "+(d.page+1)+" 页")));
}
interface ShowSession{index:number;frame:number;items:Generation[];ready:boolean;playing:boolean;viewed:Set<string>;timer:number;reflect:boolean;}
function show(a:App){
  const works=programRequired(a);if(!works)return;const ev=a.ev(25);
  if(!works.every(w=>((a.ev(23).labeled as string[])??[]).includes(w.id))||!a.ev(23).checked||!a.ev(24).credited){
    a.mount(column(h("div.empty-object",{},"开演前，交代作品与来源"),button("去检查标识",()=>a.go(23),"primary"),button("去说明来源",()=>a.go(24),"secondary")),column(h("h2",{},"你的作品，也带上生成标识"),text("为当前节目单添加可见标识、核对一次真实文件，并说明数据与人的贡献。")));return;
  }
  const signature=a.programSignature;
  if(ev.showProgram!==signature){Object.assign(ev,{showProgram:signature,viewed:[],watched:false,index:0,frame:0});a.save();}
  const d=a.memory<ShowSession>("show-"+signature,()=>({index:Math.min(5,Number(ev.index??0)),frame:Number(ev.frame??0),items:[],ready:false,playing:false,viewed:new Set((ev.viewed as string[])??[]),timer:0,reflect:false}));
  if(d.reflect){reflect(a,works,d);return;}
  const canvas=h("canvas.projection-canvas",{width:512,height:512,role:"img","aria-label":"实际作品的灯塔投影"});
  const object=h("div.projection-object",{},h("div.lighthouse-top",{"aria-hidden":"true"}),canvas,h("strong.ai-badge",{},"AI 生成"));
  const count=text("第 "+(d.index+1)+" / 6 幅","reading"),caption=text("选择的配方将实际重算，随后回放这些计算帧。");
  const persist=()=>{ev.index=d.index;ev.frame=d.frame;ev.viewed=[...d.viewed];if(works.every(w=>d.viewed.has(w.id))){ev.watched=true;ev.watchedProgram=signature;}a.save();};
  const paint=()=>{const g=d.items[d.index],frame=g?.frames[d.frame];const image=frame?.x??g?.image??decodeImage(works[d.index].preview);if(image)renderSand(canvas,image,{palette:"night",mode:"glow"});count.textContent="第 "+(d.index+1)+" / 6 幅"+(g?" · 回放 "+(d.frame+1)+" / "+g.frames.length+" 步":"");caption.textContent=encodeRecipe(works[d.index].recipe,a.meta.classes);for(const [i,b] of a.content.querySelectorAll(".tool-rack .tool-button").entries())b.classList.toggle("selected",i===d.index);};paint();
  const scrub=range("回看真实计算帧",d.frame,0,Math.max(1,(d.items[d.index]?.frames.length??20)-1),1,n=>{if(!d.ready)return;d.playing=false;clearTimeout(d.timer);d.frame=n;if(n===d.items[d.index].frames.length-1)d.viewed.add(works[d.index].id);persist();paint();},n=>"第 "+(n+1)+" 步");scrub.input.disabled=!d.ready;
  const tick=()=>{
    if(!d.playing||!d.ready)return;const g=d.items[d.index];
    if(d.frame<g.frames.length-1){d.frame++;paint();scrub.input.value=String(d.frame);scrub.out.textContent="第 "+(d.frame+1)+" 步";d.timer=window.setTimeout(tick,a.preferences.reducedMotion?160:95);return;}
    d.viewed.add(works[d.index].id);persist();
    if(d.index===5){d.playing=false;play.textContent="再次回放";a.toast("六幅都已显示，可以回看或说明你的贡献。");return;}
    d.index++;d.frame=0;paint();scrub.input.max=String(d.items[d.index].frames.length-1);d.timer=window.setTimeout(tick,450);
  };
  const play=button(d.ready?"回放真实过程":"重算六幅，再开演",async()=>{
    if(d.playing){d.playing=false;clearTimeout(d.timer);play.textContent="继续回放";return;}
    if(!d.ready){
      const result=await a.run("按节目顺序重新计算……",async()=>{const items:Generation[]=[];for(const [i,w] of works.entries())items.push(await a.generate(w.recipe,true,(f,j,n)=>{renderSand(canvas,f.x,{palette:"night",mode:"glow"});count.textContent="现场计算 · 作品 "+(i+1)+" / 6 · "+(j+1)+" / "+n+" 步";}));return items;});
      if(!result)return;d.items=result;d.ready=true;d.frame=0;scrub.input.disabled=false;scrub.input.max=String(d.items[d.index].frames.length-1);
    }
    if(d.index===5&&d.frame===d.items[5].frames.length-1){d.index=0;d.frame=0;}d.playing=true;play.textContent="暂停回放";tick();
  },"primary model-input");
  const move=(i:number)=>{d.playing=false;clearTimeout(d.timer);d.index=i;d.frame=0;persist();a.refresh();};
  a.mount(object,column(h("p.character",{},a.state.programTitle??"我的潮汐夜场"),h("h2",{},"让选择成为一场展演"),count,caption,play,button("说明三方贡献",()=>{if(!ev.watched||ev.watchedProgram!==signature){a.toast("可以回看尺到末帧查看每幅作品，或者播放完整节目。");return;}d.playing=false;clearTimeout(d.timer);d.reflect=true;a.refresh();},"secondary"),button("导出六幅海报",()=>a.run("按真实作品生成海报……",()=>poster(a)),"secondary model-input")),works.map((_w,i)=>button("第 "+(i+1)+" 幅",()=>move(i),"tool-button model-input "+(i===d.index?"selected":""))),scrub.el);
  onLeave(a,()=>{d.playing=false;clearTimeout(d.timer);persist();});
}
function reflect(a:App,works:Work[],d:ShowSession){
  const e=a.ev(25),selected=new Set((e.picks as string[])??[]);
  const roles=[["human","我：选择、修改、策展"],["model","模型：按规律计算"],["data","绘画者：贡献训练涂鸦"]];
  a.mount(figures(works.map(w=>picture(decodeImage(w.preview),encodeRecipe(w.recipe,a.meta.classes),{size:180,palette:"night",mode:"glow"})),3),column(h("h2",{},"这场夜场里，各自做了什么？"),...roles.map(([key,label])=>button((selected.has(key)?"✓ ":"")+label,()=>{selected.has(key)?selected.delete(key):selected.add(key);e.picks=[...selected];a.save();a.refresh();},"role-card "+(selected.has(key)?"selected":""))),writing(a,"联系我的作品说明",String(e.reason??""),v=>{e.reason=v;a.save();}),button("保存发现并导出手册",()=>{if(a.done(25))a.exportJournal();},"primary"),button("回到灯塔投影",()=>{d.reflect=false;a.refresh();},"secondary")));
}
async function poster(a:App){
  const works=workList(a);if(works.length!==6)throw new Error("先选六幅实际作品。");
  const c=h("canvas",{width:1200,height:990}),ctx=c.getContext("2d")!;ctx.fillStyle="#142c3e";ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#f4e6c2";ctx.font="bold 40px 'Microsoft YaHei'";ctx.fillText((a.state.programTitle??"我的潮汐夜场").slice(0,22),70,78);ctx.font="22px 'Microsoft YaHei'";ctx.fillText("潮汐沙画节 · 六幅 AI 生成作品 · 我的选择与编排",70,124);
  for(const [i,w] of works.entries()){
    const g=await a.generate(w.recipe,true),art=h("canvas",{width:290,height:290});renderSand(art,g.image,{palette:"night",mode:"glow"});
    const x=70+(i%3)*360,y=174+Math.floor(i/3)*360;ctx.drawImage(art,x,y);ctx.fillStyle="#fbf2d4";ctx.font="20px 'Microsoft YaHei'";ctx.fillText("AI 生成",x+185,y+277);ctx.font="18px 'Microsoft YaHei'";ctx.fillText(encodeRecipe(w.recipe,a.meta.classes),x,y+324);
  }
  ctx.font="18px 'Microsoft YaHei'";ctx.fillText("训练数据：Google Quick, Draw! Dataset · CC BY 4.0",70,946);
  const png=addTextChunks(await canvasBytes(c),{Method:"AI 生成",Model:a.meta.version,Source:SOURCE,Recipes:JSON.stringify(works.map(w=>w.recipe)),Description:a.state.creditText??SOURCE});
  downloadBlob(new Blob([png as BlobPart],{type:"image/png"}),"潮汐沙画节-我的夜场海报.png");
}


