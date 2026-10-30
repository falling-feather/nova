import {createModel,parameterCount} from './network.ts';
import type {Model} from './network.ts';

export const atlasBlueprints = [[1],[3],[6],[12],[24],[40],[6,6]] as const;
const blueprintNames = ['一条分界的起点','少量单元的组合','更灵活的分界','增加模型容量','观察过度拟合','容量与计算预算','让响应经过两层'];
const blueprintPurposes = [
  '先观察一条分界如何随参数移动，理解训练究竟改变了什么。',
  '组合少量单元的响应，尝试一条直线难以围住的区域。',
  '比较1个与6个单元。分界是否更合适，要用新调查检验。',
  '增加容量，观察训练调查与新调查的表现是否同步改善。',
  '尝试较高容量，检查模型是否只更擅长记住旧调查。',
  '固定比较条件，衡量新增参数是否带来了值得的改善。',
  '第二层接收第一层响应。和单层6个单元比较，观察层数的作用。',
];
const same=(a:readonly number[],b:readonly number[])=>a.join(',')===b.join(',');
const label=(hidden:readonly number[])=>hidden.length===1?`${hidden[0]} 个单元`:`${hidden.length} 层 · ${hidden.join(' / ')} 个单元`;

/** Structural drawing only. Every hidden-unit mark is present; no invented prediction is displayed. */
export function blueprintDiagram(hidden:readonly number[]):string {
  const sizes=[2,...hidden,1],points=sizes.map((count,layer)=>{
    const columns=count>12?4:count>8?2:1,rows=Math.ceil(count/columns),step=Math.min(38,210/Math.max(1,rows-1));
    return Array.from({length:count},(_,i)=>[70+layer*(620/(sizes.length-1))+(i%columns-(columns-1)/2)*21,148+(Math.floor(i/columns)-(rows-1)/2)*step]);
  });
  let lines='',nodes='';
  for(let layer=1;layer<points.length;layer++)for(const [x,y]of points[layer])for(const [px,py]of points[layer-1])lines+=`<path d="M${px} ${py}C${(x+px)/2} ${py} ${(x+px)/2} ${y} ${x} ${y}"/>`;
  points.forEach((layer,k)=>{
    const x=70+k*(620/(sizes.length-1));
    nodes+=`<text class="blueprint-layer-label" x="${x}" y="20" text-anchor="middle">${k===0?'坐标输入':k===sizes.length-1?'预测输出':`第 ${k} 层`}</text>`;
    for(const [px,py]of layer)nodes+=`<g ${k>0&&k<sizes.length-1?'data-diagram-neuron="true"':''}><circle cx="${px}" cy="${py}" r="${sizes[k]>12?6:k===0?11:13}"/><circle class="blueprint-node-core" cx="${px}" cy="${py}" r="${sizes[k]>12?2.4:5}"/></g>`;
    nodes+=`<text class="blueprint-layer-count" x="${x}" y="286" text-anchor="middle">${k===0?'东西 x · 南北 y':k===sizes.length-1?'有巢概率':`${sizes[k]} 个单元`}</text>`;
  });
  return `<svg class="blueprint-structure" viewBox="0 0 760 304" role="img" aria-label="结构：2个输入，${hidden.map(n=>n+'个单元').join('、')}，1个概率输出"><g class="blueprint-wires">${lines}</g><g class="blueprint-nodes">${nodes}</g></svg>`;
}

export function blueprintSheet(current:Model,choice:number[]|undefined,busy:boolean):string {
  const selected=choice??current.hidden,index=atlasBlueprints.findIndex(shape=>same(shape,selected)),using=same(selected,current.hidden),count=parameterCount(createModel(selected,current.activation,current.seed));
  return `<section class="paper-page atlas-blueprint-page"><div class="page-heading compact-heading"><div><span class="eyebrow">模型木盒 / 图纸选型</span><h2>先展开图纸，再决定怎样搭。</h2></div><span class="blueprint-current">现用：${label(current.hidden)} · 已学 ${current.steps} 步</span></div><div class="atlas-blueprint-layout"><nav class="blueprint-shelf" aria-label="预览模型图纸">${atlasBlueprints.map((hidden,i)=>`<button id="blueprint-choice-${hidden.join('-')}" data-blueprint-preview="${hidden.join(',')}" aria-pressed="${same(hidden,selected)}" ${busy?'disabled':''}><span class="blueprint-sheet-number">0${i+1}</span><span><b>${label(hidden)}</b><small>${blueprintNames[i]}</small></span>${same(current.hidden,hidden)?'<i>现用</i>':''}</button>`).join('')}</nav><article class="blueprint-preview"><header><div><span>结构示意 · 每个圆点对应一个单元</span><h3>${label(selected)}</h3></div><div class="parameter-seal"><strong>${count}</strong><span>个可学习参数</span></div></header><div class="blueprint-drafting-paper">${blueprintDiagram(selected)}</div><p class="blueprint-purpose">${index<0?'这是当前模型的实际层数与单元数。':blueprintPurposes[index]}</p><div class="blueprint-apply"><p>预览不改变模型。采用新图纸会初始化参数；首次更换前自动留A，已有A/B保留。</p><button class="primary" data-shape="${selected.join(',')}" ${busy||using?'disabled':''}>${using?'正在使用这张图纸':'采用图纸，回海湾试验'}</button></div></article></div><p class="blueprint-footnote">更多单元并不保证新调查更准。固定资料与比较条件，再用实际证据判断。</p></section>`;
}
