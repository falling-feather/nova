import type {Session} from './session.ts';
import {reportVersion} from './session.ts';
import {seaIds,seaNames,dataFingerprint} from './data.ts';
import {drawMap,escapeHtml as esc} from './visuals.ts';
import {parameterCount} from './network.ts';
import {shape,pct} from './scene.ts';
import {number,comparisonSummary} from './pages.ts';
export function reportHTML(state:Session):string {
  const report=seaIds.filter(id=>state.workspaces[id].records.length||state.workspaces[id].final).map(id=>{
    const current=state.workspaces[id],v=reportVersion(current)!,canvas=document.createElement('canvas');canvas.width=760;canvas.height=490;drawMap(canvas,v.model,id,v.data,v.mask);
    return `<section><h2>${seaNames[id]}</h2><img alt="${v.kind}实际计算海图" src="${canvas.toDataURL()}"><p>模型 ${shape(v.model.hidden)}；验证 ${pct(v.validationMetrics.accuracy)}（${v.validationMetrics.count}点）；${v.testMetrics?`封存检验 ${pct(v.testMetrics.accuracy)} / ${v.testMetrics.count}点`:'最终检验未打开'}；冻结时累计估计量 ${number(v.cost)}。</p><p>${v.kind} · ${v.createdAt} · 资料版本 ${dataFingerprint(v.train,v.validation)} · ${parameterCount(v.model)}参数 · ${v.model.steps}步。图、模型和成绩均取这一冻结版本。</p>${current.records.map(record=>`<article><h3>${esc(record.title)}（待评阅）</h3><p>预测：${esc(record.prediction)}</p><p>解释：${esc(record.explanation)}</p><p>${record.snapshots.map(s=>`${esc(s.name)}：${shape(s.model.hidden)} / ${s.model.steps}步 / 资料${dataFingerprint(s.data,s.validation)} / 训练 ${pct(s.metrics.accuracy)}（${s.metrics.count}点） / 验证 ${pct(s.validationMetrics.accuracy)}（${s.validationMetrics.count}点）`).join('<br>')}</p>${record.comparison?comparisonSummary(record.comparison):''}</article>`).join('')}</section>`;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><title>${esc(state.projectTitle)}</title><style>body{max-width:1000px;margin:40px auto;font:16px/1.7 system-ui;color:#24434b;background:#f7f3e8}section,article{border-top:1px solid #bfc9bf;margin-top:30px;padding-top:16px}img{max-width:100%}@media print{section{break-inside:avoid}}</style><h1>${esc(state.projectTitle)}</h1><p>奇点第${state.chapter}章 · 二维合成数据与真实MLP计算。理解待教师/同伴评阅。</p><p>计算量代理=参数×训练样本×步数，非实测能耗。JSON保留完整模型与资料，可复现。</p>${report||'<p>尚无收录记录。</p>'}</html>`;
}
