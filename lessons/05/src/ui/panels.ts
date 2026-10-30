import type { AnalyzedPhoto, Attribute, Model, Photo } from "../core/types.ts";
import {TEACHING,type TopicId} from "../content/teaching.ts";
import { ATTRIBUTE_NAMES, ATTRIBUTES, FEATURE_NAMES } from "../core/types.ts";
import type { Inspection, Receipt, Session } from "../core/session.ts";
import { contributions, predict } from "../core/model.ts";
import { GLOSSARY, LESSONS, oneAnswerOnly } from "../content/course.ts";
import { photoStyle } from "../render/photos.ts";
import { escape, percent, signed, button } from "./dom.ts";

const CLUES=[...FEATURE_NAMES,"默认倾向"];
export const ZONES:[Attribute|"reserve",string][]=[["flower","花朵专区"],["green","绿意专区"],["quality","精选佳作"],["reserve","留待讨论"]];
const zoneName=(a:Attribute|"reserve")=>ZONES.find(z=>z[0]===a)![1];
const head=(eyebrow:string,title:string,lead="")=>`<header class="sheet-head"><span class="eyebrow">${eyebrow}</span><h2>${title}</h2>${lead?`<p class="lead">${lead}</p>`:""}</header>`;

export function thumbnail(photo:Photo,attrs="",stamp="",chip="") {
  return `<button type="button" class="proof" data-photo-id="${photo.id}" ${attrs} aria-label="${escape(photo.name)}"><span class="proof-image" style='${photoStyle(photo)}'></span><span class="proof-caption">${escape(photo.name)}</span>${stamp?`<b class="proof-stamp">${stamp}</b>`:""}${chip?`<i class="proof-chip">${chip}</i>`:""}</button>`;
}

function weighing(model:Model,photo:AnalyzedPhoto) {
  const parts=[...contributions(model,photo.features),model.bias];
  return parts.map((v,i)=>({i,v})).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
}
function weightBars(model:Model,photo:AnalyzedPhoto) {
  const rows=weighing(model,photo),max=Math.max(1,...rows.map(r=>Math.abs(r.v)));
  return `<ol class="weight-bars">${rows.map(r=>`<li class="${r.v>=0?"yes":"no"}" data-clue="${r.i}"><span>${CLUES[r.i]}${r.i<6?` <small>${percent(photo.features[r.i])}</small>`:""}</span><i style="--w:${(Math.abs(r.v)/max*100).toFixed(1)}%"></i><b>${signed(r.v)}</b></li>`).join("")}</ol>`;
}
export function inspectionDetail(photo:AnalyzedPhoto|null,s:Session,run:Inspection) {
  if(!photo)return `<div class="detail-empty"><p>点一张照片，看看是哪几块砝码让学徒这样判断。</p></div>`;
  const model=s.models[run.attribute],p=predict(model,photo.features),said=p>=.5,actual=photo.truth[run.attribute],excluded=s.contaminatedIds.includes(photo.id);
  return `<div class="detail-photo" style='${photoStyle(photo)}'></div><h3>${escape(photo.name)}</h3>
<p class="detail-verdict ${said===actual?"right":"wrong"}">学徒说“${said?"是":"不是"}”（“是”的把握 ${percent(p)}）<br>答案是“${actual?"是":"不是"}”${excluded?" · 已被学过，不计分":""}</p>
<p class="detail-label">按分量从大到小：</p>${weightBars(model,photo)}
<div class="detail-actions">${button("放到灯箱上细看","inspect-photo",`data-photo-id="${photo.id}"`)}</div>`;
}
// A model that gives one answer to every photo still scores on the photos whose answer matches; say so before analysing errors.
function oneAnswerFinding(run:Inspection,s:Session) {
  const counted=run.rows.filter(r=>!r.excluded),same=counted.length>1&&counted.every(r=>r.predicted===counted[0].predicted),only=oneAnswerOnly(s,run.attribute),notes:string[]=[];
  if(same){const word=counted[0].predicted?"是":"不是";notes.push(`它对这一盒全说“${word}”，认对的 ${run.correct} 张只是碰巧答案是“${word}”。一盒里多半是“${word}”时，分数会很好看：准确率也会骗人。`);}
  if(only){const word=only.answer?"是":"不是";notes.push(`它学过的 ${only.count} 张，答案全是“${word}”。只教一种答案，它就只会说这一种：挑几张答案是“${only.answer?"不是":"是"}”的，和“${word}”交替着教。`);}
  else if(same)notes.push("把“是”和“不是”交替着教，再检验一次。");
  return notes.map(text=>`<p class="finding">${text}</p>`).join("");
}
function errorFinding(run:Inspection,s:Session,analyzed:Map<string,AnalyzedPhoto>,practice=false) {
  // The practice box holds three photos and its own prompt already asks this question.
  const oneAnswer=practice?"":oneAnswerFinding(run,s);if(oneAnswer)return oneAnswer;
  const wrong=run.rows.filter(r=>!r.excluded&&r.predicted!==r.actual);
  if(!wrong.length)return run.eligible?`<p class="finding good">这一盒全部认对。再开另一盒，看看是不是碰巧。</p>`:"";
  const count=new Map<number,number>();
  for(const r of wrong){const photo=analyzed.get(r.id);if(!photo)continue;
    const top=weighing(s.models[run.attribute],photo).find(w=>r.predicted?w.v>0:w.v<0);if(top)count.set(top.i,(count.get(top.i)??0)+1);}
  const best=[...count.entries()].sort((a,b)=>b[1]-a[1])[0];
  if(!best)return "";
  return `<p class="finding">这 ${wrong.length} 张错例中，有 ${best[1]} 张主要受“${CLUES[best[0]]}”这条线索影响。${best[0]===1&&run.attribute==="flower"?"学徒可能把“红”当成了花的证据。":"点开看看，它为什么这样判断。"}</p>`;
}
export function inspectionPanel(run:Inspection,photos:Photo[],s:Session,analyzed:Map<string,AnalyzedPhoto>,selected:string|null,practice=false) {
  const cells=[{p:true,a:true,name:"说“是”，对了",kind:"right"},{p:true,a:false,name:"说“是”，认错了",kind:"wrong"},{p:false,a:true,name:"说“不是”，漏掉了",kind:"wrong"},{p:false,a:false,name:"说“不是”，对了",kind:"right"}];
  const excluded=run.rows.filter(r=>r.excluded).length;
  const tray=(c:typeof cells[number])=>{const rows=run.rows.filter(r=>r.predicted===c.p&&r.actual===c.a);
    return `<section class="tray ${c.kind}"><h3>${c.name}<b>${rows.length}</b></h3><div class="tray-photos">${rows.map(r=>{const photo=photos.find(p=>p.id===r.id)!;
      return thumbnail(photo,`data-action="inspect-detail" aria-pressed="${selected===r.id}"`,r.excluded?"已学过":"",percent(r.probability));}).join("")||'<span class="tray-empty">没有照片</span>'}</div></section>`;};
  return `${head(practice?"检验盒 · 第 0 关 · 带练":`检验盒 · 第 ${run.stage} 关 · ${run.box?"B":"A"} 盒`,"在没见过的照片上，它认得对吗？")}
<div class="inspection">
<div class="score-card"><strong>${run.correct}<span>/ ${run.eligible}</span></strong><p>认对的张数</p><small>${ATTRIBUTE_NAMES[run.attribute]} · 学了 ${run.modelStep} 次之后</small>${errorFinding(run,s,analyzed,practice)}<p class="score-note">检验只判断，不学习。照片角上的数字是“是”的把握。</p></div>
<div class="matrix"><span class="axis-corner"></span><span class="axis axis-top">答案是“是”</span><span class="axis axis-top">答案是“不是”</span><span class="axis axis-side">学徒说是</span>${tray(cells[0])}${tray(cells[1])}<span class="axis axis-side">学徒说不是</span>${tray(cells[2])}${tray(cells[3])}</div>
<aside class="inspect-detail" aria-live="polite">${inspectionDetail(selected?analyzed.get(selected)??null:null,s,run)}</aside>
</div>
<footer class="sheet-actions"><span>${excluded?`${excluded} 张已经被学过，不计分`:"这一盒的照片，学徒一张都没学过"}</span>${button("换另一盒","next-test")}${button("回到看片桌","close-modal","class='primary'")}</footer>`;
}

export function billPanel(photo:AnalyzedPhoto,s:Session) {
  const model=s.models[s.active],parts=contributions(model,photo.features),score=parts.reduce((a,b)=>a+b,model.bias);
  return `${head("天平的小账单",`${escape(photo.name)} · ${ATTRIBUTE_NAMES[s.active]}`)}
<div class="bill"><table><thead><tr><th>线索</th><th>读数</th><th></th><th>信任</th><th></th><th>砝码</th></tr></thead><tbody>${parts.map((v,i)=>`<tr data-clue="${i}"><td>${FEATURE_NAMES[i]}${i===5?"<sup>标注</sup>":""}</td><td>${percent(photo.features[i])}</td><td>×</td><td>${signed(model.weights[i])}</td><td>=</td><td class="${v>=0?"yes":"no"}">${signed(v)}</td></tr>`).join("")}<tr data-clue="6"><td>默认倾向</td><td></td><td></td><td></td><td></td><td class="${model.bias>=0?"yes":"no"}">${signed(model.bias)}</td></tr></tbody></table>
<div class="bill-total"><span>全部加起来 <strong>${signed(score)}</strong></span><span>换算成“是”的把握 <strong>${percent(predict(model,photo.features))}</strong></span></div>
<p class="bill-note">总分是 0 时，把握正好 50%。总分越大越接近 100%，越小越接近 0%。</p></div>`;
}

export function receiptPanel(receipts:Receipt[]) {
  return `${head("学习记录","每一次学习，信任都改了多少")}
<div class="receipt-list">${[...receipts].reverse().map(r=>`<article class="ticket"><header><strong>#${String(r.id).padStart(3,"0")} ${escape(r.photoName)}</strong><span>分量 ${r.rate} · ${r.reviewed?"查证过":"没查证"}</span></header>${r.updates.map(u=>`<p>${ATTRIBUTE_NAMES[u.attribute]} · 答案“${r.targets[u.attribute]?"是":"不是"}” · 把握 <b>${percent(u.beforeProbability)} → ${percent(u.afterProbability)}</b></p><div class="ticket-deltas">${u.delta.map((v,i)=>Math.abs(v)>=.005?`<span>${FEATURE_NAMES[i]} ${signed(v)}</span>`:"").join("")}<span>默认倾向 ${signed(u.biasDelta)}</span></div>`).join("")}</article>`).join("")||'<p class="empty">让学徒学一张照片，第一张小票就会从打印机里出来。</p>'}</div>
<footer class="sheet-actions"><span>保留最近 80 次</span>${button("撤销上一次学习","undo",receipts.length?"":"disabled")}${button("保存实验记录","download-record")}</footer>`;
}

export function galleryPanel(photos:AnalyzedPhoto[],s:Session,pending:AnalyzedPhoto[],editing:string|null) {
  const auto=Object.values(s.wall).filter(e=>e.by==="model").length,manual=Object.values(s.wall).filter(e=>e.by==="student").length;
  const chooser=(p:AnalyzedPhoto)=>`<div class="chooser">${ATTRIBUTES.map(a=>`<span class="chance">${ATTRIBUTE_NAMES[a]} <b>${percent(predict(s.models[a],p.features))}</b></span>`).join("")}<div class="chooser-buttons">${ZONES.map(([a,name])=>button(name,"place",`data-photo-id="${p.id}" data-attribute="${a}" ${s.wall[p.id]?.attribute===a?"aria-pressed='true'":""}`)).join("")}</div></div>`;
  const edit=editing&&!pending.some(p=>p.id===editing)?photos.find(p=>p.id===editing):null;
  return `${head("春季自然摄影展","我们的展墙",`学徒自动分好 <b>${auto}</b> 张 · 你决定了 <b>${manual}</b> 张 · 还有 <b>${pending.length}</b> 张等你决定`)}
${pending.length?`<section class="raised-hands"><h3>学徒举手：这几张它拿不准</h3><div class="hand-list">${pending.map(p=>`<article class="hand">${thumbnail(p,"tabindex='-1'")}${chooser(p)}</article>`).join("")}</div></section>`:""}
${edit?`<section class="raised-hands editing"><h3>改放这张照片</h3><div class="hand-list"><article class="hand">${thumbnail(edit,"tabindex='-1'")}${chooser(edit)}</article></div></section>`:""}
<div class="wall">${ZONES.map(([a,name])=>`<section class="wall-zone" data-zone="${a}"><h3>${name}</h3><div class="wall-photos">${photos.filter(p=>s.wall[p.id]?.attribute===a).map(p=>thumbnail(p,`data-action="edit-placement" aria-pressed="${editing===p.id}"`,s.wall[p.id].by==="student"?"你定的":"学徒")).join("")||'<span class="tray-empty">还没有照片</span>'}</div></section>`).join("")}</div>
<p class="wall-note">学徒按“花朵 → 绿意 → 佳作”的顺序分区；点任意一张照片可以改放。</p>
<footer class="sheet-actions">${button("保存展墙图片","download-wall")}${button("保存实验记录","download-record")}${button("回到看片桌","close-modal","class='primary'")}</footer>`;
}

export function notePanel(s:Session) {
  const lesson=LESSONS[s.stage-1];
  return `${head(`实验笔记 · 第 ${s.stage} 关`,lesson.notePrompt)}<label class="note-field"><span class="sr-only">我的观察</span><textarea id="observation-note" maxlength="1000" placeholder="写一两句就好">${escape(s.note)}</textarea></label><p class="lead">笔记会和这一关的记录一起保存。</p><footer class="sheet-actions">${button("写好了","close-modal","class='primary'")}</footer>`;
}

export function introPanel(stage:number) {
  const l=LESSONS[stage-1],topic=(["training","quality","bias","label-noise","inference"] as TopicId[])[stage-1],lesson=TEACHING[topic];
  return `<div class="intro"><span class="eyebrow">影展任务 ${String(stage).padStart(2,"0")} / 05</span><h2>${l.title}</h2>${l.intro.map(t=>`<p>${t}</p>`).join("")}<div class="intro-teaching"><span>本关认识</span><h3>${lesson.term}</h3><p>${lesson.meaning}</p></div><p class="intro-question">${l.question}</p><p class="intro-guidance">按任务签的数量与进度完成实验；点任一目标或下方“带我找到这里”，就会高亮对应工具。</p><footer class="sheet-actions">${button(stage===1?"走到看片桌前":"开始","close-modal","class='primary'")}</footer></div>`;
}

export function glossaryPanel(unlocked:string[],focus?:string) {
  return `${head("AI 小词典","刚才你体验到的，都有名字")}<dl class="glossary">${GLOSSARY.map(t=>unlocked.includes(t.id)?`<div class="term${t.id===focus?" focus":""}"><dt>${t.term}</dt><dd>${t.text}</dd></div>`:`<div class="term locked"><dt>？？？</dt><dd>继续实验，会解锁这个词。</dd></div>`).join("")}</dl>`;
}

export function settingsPanel(s:Session,reduced:boolean,sound:boolean) {
  return `${head(`工作台设置 · 第 ${s.experiment} 张工作台`,"操作与设置")}
<div class="settings"><label class="setting"><input type="checkbox" id="reduced-motion" ${reduced?"checked":""}>减少动画，直接显示计算结果</label><label class="setting"><input type="checkbox" id="sound-setting" ${sound?"checked":""}>打开器具的声音</label><label class="setting"><input type="checkbox" id="guess-setting" ${s.alwaysGuess?"checked":""}>每次学习前都先猜一猜</label></div>
<section class="about"><h3>关于这台学徒</h3><p>照片是为课程制作的教学图片。学徒只读六条线索：五条从像素里实时算出，“花形轮廓”由人标注。“拍得好”用的是本次影展定下的清晰与曝光标准，不代表所有摄影的好坏。</p></section>
<footer class="sheet-actions">${button("清空这项判断的记忆","reset-model")}${button("换一张新工作台","new-experiment")}${button("保存实验记录","download-record")}${button("导出上一张工作台","download-previous")}</footer>`;
}

export function confirmPanel(title:string,text:string,action:string,label:string) {
  return `${head("请确认",title)}<p class="lead">${text}</p><footer class="sheet-actions">${button("先不要","close-modal")}${button(label,action,"class='primary'")}</footer>`;
}

export function completePanel(s:Session) {
  const best=(a:Attribute)=>Math.max(0,...s.inspections.filter(r=>r.attribute===a&&r.eligible>0).map(r=>r.correct/r.eligible));
  const steps=ATTRIBUTES.map(a=>`<li><b>${ATTRIBUTE_NAMES[a]}</b><span>学了 ${s.models[a].steps} 次 · 检验最好 ${percent(best(a))}</span></li>`).join("");
  return `<div class="intro complete"><span class="eyebrow">摄影展开幕了</span><h2>学徒学会了什么？</h2><p>你让照片变成线索，让线索改变数字，再用没见过的照片检查这些数字。</p><ul class="summary">${steps}</ul>
<div class="reveal"><span class="eyebrow">揭晓</span><p>学徒的算法叫<b>逻辑回归</b>：读数乘以信任，加上默认倾向，再经过S形换算得到把握。某些简单神经元也会进行加权求和，但真实神经网络还会组合更多层与计算。</p></div>
<p>新的委托来了：挑出有蝴蝶停在上面的花。现有六条线索没有可靠描述蝴蝶的信息，仅靠调整这些参数，不能保证完成这个新任务。</p><p class="intro-question">线索不够用时，模型需要怎样的结构？下一章见。</p>
<footer class="sheet-actions">${button("AI 小词典","glossary")}${button("保存实验记录","download-record")}${button("看看展墙","open-test","class='primary'")}</footer></div>`;
}
export { zoneName };
