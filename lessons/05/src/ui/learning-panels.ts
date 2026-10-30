import {button,escape,percent} from "./dom.ts";
import {TEACHING,type TopicId,teachingEvidence} from "../content/teaching.ts";
import {LESSONS,overallProgress,type Goal} from "../content/course.ts";
import type {Session,Receipt,Inspection} from "../core/session.ts";
import type {AnalyzedPhoto} from "../core/types.ts";
export function preparationPanel(topic:TopicId,actionName:string) {
 const t=TEACHING[topic];
 return `<article class="knowledge-lesson"><span class="eyebrow">动手之前 · 先知道为什么</span><h2>${t.title}</h2><div class="concept-name">${t.term}</div><p class="knowledge-meaning">${t.meaning}</p><section class="knowledge-observe"><h3>这一次请观察</h3><p>${t.observe}</p></section><p class="knowledge-question">${t.question}</p><footer class="sheet-actions">${button("稍后再做","close-modal")}${button(actionName,"knowledge-continue","class='primary'")}</footer></article>`;
}
export function teachingPanel(topic:TopicId,s:Session,photo:AnalyzedPhoto|null,receipt?:Receipt,inspection?:Inspection) {
 const t=TEACHING[topic];
 return `<div class="teaching-heading"><span class="eyebrow">实验中的小课堂</span>${button("展开讲解","open-lesson",`data-topic="${topic}" class="teaching-expand"`)}</div><h3>${t.term}</h3><p>${escape(teachingEvidence(topic,s,photo,receipt,inspection))}</p>`;
}
export function reviewTeachingPanel(topic:TopicId,s:Session,photo:AnalyzedPhoto|null,receipt?:Receipt,inspection?:Inspection) {
 const t=TEACHING[topic];
 return `<article class="knowledge-lesson"><span class="eyebrow">知识回顾 · 随时重看</span><h2>${t.title}</h2><div class="concept-name">${t.term}</div><p class="knowledge-meaning">${t.meaning}</p><section class="knowledge-observe"><h3>在你的实验里</h3><p>${escape(teachingEvidence(topic,s,photo,receipt,inspection))}</p></section><p class="knowledge-question">${t.question}</p><p class="knowledge-transfer">${t.transfer}</p><footer class="sheet-actions">${button("回到实验","close-modal","class='primary'")}</footer></article>`;
}
export function welcomePractice(s:Session,paused:boolean) {
 return `<article class="practice-welcome"><div class="welcome-art" aria-hidden="true"><svg class="welcome-frame" viewBox="0 0 200 200"><path d="M30 62V30h32M138 30h32v32M170 138v32h-32M62 170H30v-32" fill="none" stroke="#62744c" stroke-width="4" stroke-linecap="round"/><path d="M100 148C64 128 58 86 100 50c42 36 36 78 0 98Z" fill="#8fb07a"/><path d="M100 150V58M100 82l-16-10M100 100l-20-12M100 118l-18-10M100 90l16-11M100 108l19-12M100 126l15-9" fill="none" stroke="#f5efd9" stroke-width="3" stroke-linecap="round"/></svg><span class="welcome-chip step-1"><b>1</b>看照片里的线索</span><span class="welcome-chip step-2"><b>2</b>核对标签并训练</span><span class="welcome-chip step-3"><b>3</b>看看它是否学会</span><span class="welcome-caption">选片学徒，等你来教</span></div><div class="welcome-copy"><span class="eyebrow">第 0 关 · 摄影社的第一张委托</span><h2>先一起教会它<br>看一张照片。</h2><p>摄影展快开幕了。用一张绿叶照片，带“选片学徒”走完一次学习和检验。</p><footer class="sheet-actions">${button(paused?"继续上次带练":"开始第0关","practice-start","class='primary'")}${button("稍后带练，先看任务","practice-defer","class='welcome-later'")}</footer><p class="practice-preserve">${s.models.green.steps+s.models.quality.steps+s.models.flower.steps>0?`你在第${s.stage}关的模型和成果会保留，带练使用另一台练习学徒。`:"约3分钟，先学会操作，再开始五个正式任务。"}</p></div></article>`;
}
export type CoachStep={selector:string;avoid?:string;title:string;body:string;concept:string;instruction:string;action?:string;label?:string};
export function practiceStep(step:number,s:Session):CoachStep {
 const update=s.receipts.at(-1)?.updates[0];
 const steps:CoachStep[]=[
  {selector:'.drawer-photos [data-photo-id="t001"]',title:"取出第一张照片",body:"这张照片是一个训练样本。先把它放上灯箱，我们一起看看学徒能从里面读到什么。",concept:"样本：交给模型处理的一个例子",instruction:"点击高亮的“晨露绿叶”照片。"},
  {selector:'[data-filter="green"]',title:"看看机器眼里的绿色",body:"插上绿色滤片，只有被算作绿色的像素保留颜色。下方的绿色占比，就是模型的一条特征。",concept:"特征：从输入中得到的数值线索",instruction:"点击高亮的“绿色”滤片。"},
  {selector:'.label-card [data-action="review"]',title:"先核对，再把答案教给它",body:"投稿表不一定可靠。查证会显示照片是否符合本次影展的标准，此时还没有训练。",concept:"标签：希望模型学会的参考答案",instruction:"点击“查证标签”，读一读依据。"},
  {selector:'.label-choice [data-value="1"]',avoid:'.label-card',title:"亲手确认要教给它的标签",body:"这张照片的绿色占比达到35%的标准。请确认交给学徒的答案是“是”。确认标签只改记录，参数还没有改变。",concept:"监督学习：用带标签的样本来学习",instruction:"点击投稿表里高亮的“是”。"},
  {selector:'.learn-plate[data-action="teach"]',title:"现在，开始第一次训练",body:"学徒先预测、对照你给的标签，再调整参数，最后重新判断。调整时会自动展开右侧的七个信任刻度。",concept:"训练：依据样本与标签调整参数",instruction:"点击高亮的“让学徒学这一张”。"},
  {selector:'.trust-left',title:"这就是参数在学习",body:update?`“是”的把握从${percent(update.beforeProbability)}变成${percent(update.afterProbability)}。绿色线索的信任从${update.before.weights[0].toFixed(2)}变成${update.after.weights[0].toFixed(2)}。照片没有改变，模型里的数字变了。`:"查看学习小票与七个刻度：变化来自刚才真实执行的一次参数更新。",concept:"参数与预测：改了参数，判断也会改变",instruction:"当前这张更接近标签，还要检查别的照片。",action:"practice-reflect",label:"用新照片检查它"},
  {selector:'.test-box',title:"打开三张新照片",body:"检验时只使用学到的参数，先不让它继续学习。看看这台只学过一张绿叶的模型，会不会认错其他东西。",concept:"检验：用未参与训练的照片检查表现",instruction:"点击高亮的“打开检验”。"},
  {selector:'.test-box',title:"刚才的结果说明了什么？",body:"回想刚才的学习小票和检验结果：同一台学徒，面对训练照片和三张新照片时，表现有什么不同？",concept:"从学过，到能处理新情况",instruction:"请选一句符合这次实验的结论。"},
  {selector:'.learn-station',title:"你已完成第一轮学习",body:"你完成了选样本、看特征、核对标签、训练和检验。接下来，任务签会显示进度，“下一步”会带你找到相应物件。",concept:"训练会改参数，检验只读参数",instruction:"正式任务会保留你的每次选择与发现。",action:"practice-finish",label:"回到正式任务"}
 ];
 return steps[step];
}
export function practiceInspectionHeading(run:Inspection) {
 return `<section class="practice-check"><span class="eyebrow">第0关 · 试着使用刚学到的参数</span><h3>认对 ${run.correct} / ${run.eligible} 张，参数没有改变。</h3><p>学徒只学习过一张绿叶。看看另外的照片：它有没有把不绿的照片也认成绿色？这就是为什么需要检验。</p>${button("看过结果，回答一个问题","practice-inspection-done","class='primary'")}</section>`;
}
export function lessonSummaryPanel(s:Session,goals:Goal[]) {
 const l=LESSONS[s.stage-1],topics:TopicId[]=["training","quality","bias","label-noise","inference"],t=TEACHING[topics[s.stage-1]];
 return `<article class="knowledge-lesson"><span class="eyebrow">第${s.stage}关小结 · 完成${overallProgress(goals)}%</span><h2>${l.title}：你发现了什么？</h2><div class="concept-name">${t.term}</div><p class="knowledge-meaning">${l.discovery}</p><ul class="recap-facts">${goals.map(g=>`<li><span>${g.text}</span><b>${escape(g.detail)}</b></li>`).join("")}</ul><p class="knowledge-transfer">${t.transfer}</p><footer class="sheet-actions">${button("再看看这一关","close-modal")}${button(s.stage<5?"进入下一关 →":"看看策展成果","next-lesson","class='primary'")}</footer></article>`;
}
