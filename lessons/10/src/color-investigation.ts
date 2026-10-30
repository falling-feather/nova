import {createCreator,beginModel} from '../../../shared/creator/project.ts';
import {trainStep,evaluateRows} from '../../../shared/creator/model.ts';
import {assetImage,numericRows} from '../../../shared/creator/data.ts';
import {h,drawImage} from '../../../shared/creator/dom.ts';
import {makeGroup,referenceLabel,CLASS_SHORT} from './samples.ts';
import type {FeatureMode} from './model.ts';
import type {CreatorProject,Evaluation} from '../../../shared/creator/types.ts';

export function investigationData():CreatorProject{
  const p=createCreator();p.assets=[];p.dataset.labels={};p.dataset.bags={};p.dataset.reviewed=[];p.dataset.excluded=[];
  for(const [prefix,seeds,scene,split] of [
    ['learn',[41,53,67],'studio','train'],['same',[83,97],'studio','validation'],['swap',[83,97],'mixed','validation'],
  ] as const)for(const seed of seeds){
    const group=makeGroup(`${prefix}-${seed}`,seed,scene);p.dataset.bags[group.id]=split;
    for(let i=0;i<6;i++){const id=`${group.id}-${i}`;p.assets.push({id,group:group.id,source:'颜色交换控制实验',origin:{kind:'synthetic',group,index:i}});p.dataset.labels[id]=referenceLabel(i);}
  }
  p.seenGroups=Object.keys(p.dataset.bags);return p;
}
export function investigateColor(mode:FeatureMode){
  const p=investigationData(),job=beginModel(p,{featureMode:mode,hidden:[],activation:'linear',seed:7,learningRate:.08,batchSize:18});
  for(let i=0;i<200;i++)trainStep(job.model,job.train);
  const rows=numericRows(p,job.model,'validation',job.dataset);
  return {project:p,mode,train:evaluateRows(job.model,job.train),same:evaluateRows(job.model,rows.filter(r=>r.id.startsWith('same-'))),swap:evaluateRows(job.model,rows.filter(r=>r.id.startsWith('swap-')))};
}
const names={color:'只看颜色',shape:'只看轮廓','color-shape':'颜色＋轮廓'};
export interface ColorFinding {mode:FeatureMode;same:number;swapped:number;total:number;prediction:string;}
export function mountColorInvestigation(body:HTMLElement,use:(mode:FeatureMode,findings:ColorFinding[])=>void){
  const data=investigationData();let prediction='',busy=false,results:Array<ReturnType<typeof investigateColor>>=[];
  function card(e:Evaluation,label:string){return `<div class="investigation-score"><span>${label}</span><b>${e.correct}<small> / ${e.total}</small></b><i style="--score:${e.accuracy*100}%"></i></div>`;}
  function render(){
    const current=results.at(-1);
    body.innerHTML=`<section class="color-investigation"><header><span>CONTROLLED EXPERIMENT / 数据与泛化</span><h2>换了颜色，它还认得吗？</h2><p>训练集里，铅笔、水杯和书本各有固定颜色。验证图不参加训练；下方每对图片只交换物件颜色，形状与拍摄位置保持一致。</p></header><div class="color-experiment-body"><div class="color-pairs"><div class="pair-head"><span>原来的颜色</span><i>→</i><span>交换颜色后</span></div>${[0,2,4].map(i=>{const id=`83-${i}`,a=current?.same.rows.find(r=>r.id==='same-'+id),b=current?.swap.rows.find(r=>r.id==='swap-'+id);return `<article><div><canvas data-control-image="same-${id}"></canvas><small>${a?'模型：'+h(data.dataset.classes[a.predicted].name):CLASS_SHORT[referenceLabel(i)]}</small></div><i>↔</i><div><canvas data-control-image="swap-${id}"></canvas><small class="${b&&b.predicted!==b.label?'prediction-wrong':''}">${b?'模型：'+h(data.dataset.classes[b.predicted].name):'真实类别仍是'+CLASS_SHORT[referenceLabel(i)]}</small></div></article>`;}).join('')}</div><div class="investigation-console"><span class="micro-label">01 / 先留下你的预测</span><h3>只用颜色学习的模型，换色后会怎样？</h3><div class="color-predictions">${['仍然认得','容易认错','还不确定'].map(t=>`<button data-color-prediction="${t}" aria-pressed="${prediction===t}" ${results.length?'disabled':''}>${t}</button>`).join('')}</div>${current?`<div class="investigation-result"><span>02 / ${names[current.mode]} · 实际学习200次</span><div class="investigation-scores">${card(current.train,'训练资料')}${card(current.same,'新图 · 原配色')}${card(current.swap,'同批新图 · 换色')}</div><p>最初对颜色模型的预测：${prediction}。${current.swap.correct<current.same.correct?'颜色变了，判断也受影响。模型可能依赖了容易学到、却不稳定的颜色关联。':'这套表示在本次换色中保留了较多识别能力。仍需用更多新资料检查。'}</p></div><div class="investigation-retry"><span>03 / 只改变输入线索，其他条件保持一致</span><div>${(['color','shape','color-shape'] as const).map(mode=>`<button data-investigate="${mode}" ${busy?'disabled':''} aria-pressed="${current.mode===mode}">${names[mode]}</button>`).join('')}</div></div>${results.length>1?`<p class="investigation-comparison">换色图判断相符：${results.map(r=>`${names[r.mode]} ${r.swap.correct}/${r.swap.total}`).join(' → ')}。一次实验不代表所有图片。</p>`:''}`:`<div class="investigation-ready"><div class="scan-symbol" aria-hidden="true">6<span>维颜色线索</span></div><p>只用18张训练图学习参数，<br>再检验两套配对的新图。</p><button class="primary" data-investigate="color" ${!prediction||busy?'disabled':''}>${busy?'实际计算中…':'训练并揭晓结果'}</button></div>`}</div></div><footer><p>关键概念：训练中出现的关联，未必能推广到新情境。这里使用明确规则提取特征。</p>${current?`<button data-use-investigation class="primary">带着${names[current.mode]}，回到我的资料 ↗</button>`:''}</footer></section>`;
    body.querySelectorAll<HTMLCanvasElement>('[data-control-image]').forEach(c=>drawImage(c,assetImage(data.assets.find(a=>a.id===c.dataset.controlImage)!)));
  }
  body.addEventListener('click',e=>{
    const b=(e.target as Element).closest<HTMLButtonElement>('button');if(!b||b.disabled||busy)return;
    if(b.dataset.colorPrediction){prediction=b.dataset.colorPrediction;render();return;}
    if(b.hasAttribute('data-use-investigation')){use(results.at(-1)!.mode,results.map(r=>({mode:r.mode,same:r.same.correct,swapped:r.swap.correct,total:r.swap.total,prediction}))); return;}
    if(b.dataset.investigate){const mode=b.dataset.investigate as FeatureMode;busy=true;render();requestAnimationFrame(()=>setTimeout(()=>{if(!body.isConnected)return;try{results.push(investigateColor(mode));results=results.slice(-3);busy=false;render();}catch(error){busy=false;body.innerHTML=`<p role="alert">${h(error instanceof Error?error.message:String(error))}</p>`;}},0));}
  });render();
}
