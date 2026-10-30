import type { SceneContext } from "./scene.ts";
import type { ViewState } from "./pages.ts";
import { screenNames } from "./pages.ts";
import { seaIds, seaNames } from "./data.ts";
import { parameterCount, evaluate } from "./network.ts";
import { escapeHtml as esc } from "./visuals.ts";
const compassProp = new URL("../art/compass.webp", import.meta.url).href;
const binocularsProp = new URL("../art/binoculars.webp", import.meta.url).href;
const cabinetProp = new URL("./atlas-art/model-cabinet.webp", import.meta.url).href;
const scrollProp = new URL("./atlas-art/route-scroll.webp", import.meta.url).href;
const gullProp = new URL("./atlas-art/gull-perched.webp", import.meta.url).href;
const magnifierProp = new URL("./atlas-art/brass-magnifier.webp", import.meta.url).href;
const dividerProp = new URL("./atlas-art/brass-dividers.webp", import.meta.url).href;
const ropeProp = new URL("./atlas-art/mooring-rope.webp", import.meta.url).href;

const symbols: Record<string, string> = {
  anchor:'<circle cx="24" cy="8" r="4"/><path d="M24 12v29M15 19h18M6 29v7q18 18 36 0v-7M6 29l-4 7m4-7 6 3m30-3 4 7m-4-7-6 3"/>',
  compass:
    '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="13"/><path d="m31 17-4 10-10 4 4-10Z"/><path d="M24 2v7m0 30v7M2 24h7m30 0h7"/>',
  learn:
    '<path d="M8 35 20 12l20 23H8Z"/><circle cx="20" cy="12" r="4"/><circle cx="8" cy="35" r="4"/><circle cx="40" cy="35" r="4"/><circle cx="25" cy="28" r="4"/><path d="m20 16 5 8m-13 9 9-4m8 0 7 4"/>',
  search:
    '<circle cx="20" cy="20" r="13"/><circle cx="20" cy="20" r="9"/><path d="m30 30 12 12M10 20h20m-10-10v20"/>',
  book: '<path d="M9 5h30v38H9zM15 5v38m6-27h12m-12 8h12m-12 8h8"/>',
  help: '<circle cx="24" cy="24" r="18"/><path d="M17 18a7 7 0 0 1 14 0c0 6-7 5-7 11m0 5v1"/>',
  sound: '<path d="M7 19h8l9-9v28l-9-9H7zM31 16q9 8 0 16m6-21q15 13 0 26"/>',
  undo: '<path d="M13 17h16a12 12 0 0 1 0 24H18M13 17l9-9m-9 9 9 9"/>',
  feather:
    '<path d="M9 40 33 11M15 30C4 17 20 3 40 7c-1 19-12 33-25 23Zm5-7 12 1m-6-8 1-9"/>',
};
export const seaIcon = (name: string) =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${symbols[name] ?? symbols.compass}</svg>`;
export const seaQuestions = [
  "给海鸟划出合适的保护区",
  "一条直线，能围住一片岛吗？",
  "两个鸟群，怎样一起照顾？",
  "记住旧调查，就足够了吗？",
  "有限的预算，怎样选模型？",
];
export const seaHints = [
  "先拖动两个圆柄，看看分界怎样改变。",
  "让模型学习，再与自己的分界对照。",
  "换一批新调查，看看规律能否迁移。",
];
const descriptions = [
  "一条分界线",
  "让分界弯起来",
  "从不同起点学习",
  "检查新调查",
  "结构与计算预算",
];

export function nauticalScene(c: SceneContext, focused=false): string {
  const result = evaluate(
    c.w.model,
    c.dataView === "validation" ? c.w.validation : c.w.train,
    c.w.mask,
  );
  return `<section class="nautical-chart" data-observation="${c.dataView}" aria-label="可操作的分层海图">
    <div class="chart-caption"><span aria-hidden="true">${seaIcon("anchor")}</span><strong>第 ${c.state.unit + 1} 站 · ${descriptions[c.state.unit]}</strong></div>
    <div class="nautical-surface"><div class="relief-layer" aria-hidden="true"></div><canvas id="map" width="1440" height="720" tabindex="0" aria-label="主岛海湾调查区；拖动位置柄移动分界，拖动方向柄旋转；方向键移动探针，按住Shift与方向键调整分界，Q或E转动方向"></canvas></div>
    <div class="atlas-view-controls" aria-label="海图视野">${focused?'<canvas class="atlas-minimap" width="360" height="180" role="img" aria-label="全景定位图，方框表示当前视野"></canvas>':''}<button data-action="atlas-focus" aria-pressed="${focused}">${seaIcon("search")}${focused?'回到群岛全景':'放大海湾 · 开始操作'}</button><small>${focused?'当前位置 · 所有调查点仍可操作':'保留全景，也能走近观察'}</small></div>
    <div class="chart-margin"><span class="scale-rule">−1 ├────┼────┤ +1<small>海湾归一化坐标 · 教学合成数据</small></span><div class="chart-key"><span><i class="nest-key"></i>有巢</span><span><i class="empty-key"></i>无巢</span><span><i class="boundary-key"></i>预测分界</span>${c.dataView !== "test" && c.w.snapshots.some((s) => s.name === "A") ? '<span><i class="previous-key"></i>记录 A</span>' : ""}</div><span class="probe-caption">当前位置 · 预测有巢 <b data-live="probability">—</b><small data-live="point"></small></span></div>
    ${c.dataView !== "train" ? `<aside class="survey-receipt"><span>${c.dataView === "test" ? "封存检验 · 冻结版本" : "第二次调查 · 未参与训练"}</span><b>${c.dataView === "test" ? Math.round(c.w.final!.metrics.accuracy * c.w.final!.metrics.count) : Math.round(result.accuracy * result.count)} / ${c.dataView === "test" ? c.w.final!.metrics.count : result.count} 点判断相符</b><small>橙：有巢 · 蓝：无巢 · 外圈：误判</small>${c.dataView === "validation" && result.accuracy < 0.7 ? `<em class="receipt-hint">相符不到七成：分界还没学好，回到训练调查再让模型学几轮。</em>` : ""}<button data-view="train">回到训练调查</button></aside>` : ""}
    ${c.point ? `<aside class="point-receipt"><span>调查点 ${esc(c.point.id.split("-").at(-1)!)}</span><b>${c.point.label ? "记录：有巢" : "记录：无巢"}</b><button data-action="audit-label">重新核对标签</button></aside>` : ""}
  </section>`;
}

type ShellContext = {
  scene: SceneContext;
  view: ViewState;
  content: string;
  muted: boolean;
  status: string;
  notice: string;
  rawBad: string;
  undo: boolean;
  focused?: boolean;
};
export function nauticalShell(o: ShellContext): string {
  const { scene: c, view: v } = o,
    open = v.screen !== "play",
    guide = v.guideStep;
  const completed = new Set(
    seaIds.flatMap((id) => c.state.workspaces[id].records.map((r) => r.unit)),
  );
  const snapshots = c.w.snapshots;
  return `<div class="neural-app nautical-app" data-guide="${guide ?? "free"}" data-atlas-view="${o.focused?'focus':'overview'}">
    <header class="nautical-header"><div class="nautical-brand"><span data-nova-return-host></span><span class="header-divider"></span><h1><small>06</small> 群岛海图</h1><span class="header-subtitle">THE ARCHIPELAGO ATLAS</span></div><nav aria-label="海图工具"><button data-action="report">${seaIcon("book")}航海日志</button><button data-action="manual">${seaIcon("help")}帮助</button><button data-action="mute" aria-label="${o.muted ? "开启声音" : "静音"}">${seaIcon("sound")}${o.muted ? "声音关" : "声音开"}</button></nav></header>
    <main class="chart-desk workspace" data-screen="play">
      <nav class="nautical-route" aria-label="五片海域"><img class="route-scroll" src="${scrollProp}" alt=""><svg class="route-cord" viewBox="0 0 40 700" preserveAspectRatio="none" aria-hidden="true"><path d="M20-10C2 130 30 240 10 370S28 580 16 720" fill="none" stroke="#493721" stroke-width="9"/><path d="M20-10C2 130 30 240 10 370S28 580 16 720" fill="none" stroke="#b7a476" stroke-width="6"/><path d="M20-10C2 130 30 240 10 370S28 580 16 720" fill="none" stroke="#f0ddb0" stroke-width="3" stroke-dasharray="3 3"/></svg><svg class="route-trail" viewBox="0 0 100 600" preserveAspectRatio="none" aria-hidden="true"><path d="M48 0C80 95 24 145 48 230S72 380 42 450 70 545 48 600" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="7 7"/></svg><span class="route-kicker">启明号航线</span>${seaIds.map((id, i) => `<button data-unit="${i}" title="${seaNames[id]} · ${descriptions[i]}" aria-current="${i === c.state.unit ? "step" : "false"}" ${c.busy ? "disabled" : ""}><span class="route-number">${completed.has(i) ? "✓" : i + 1}</span><span>${seaNames[id]}<small>${descriptions[i]}</small></span></button>`).join("")}<div class="route-engraving" aria-hidden="true">${seaIcon("compass")}</div><span class="route-foot">Small Islands<br>Big Questions</span></nav>
      <div class="chart-stage">${nauticalScene(c,o.focused)}
      <aside class="nautical-mission"><img class="gull-emblem" src="${gullProp}" alt=""><div><span>第 ${c.state.unit + 1} 站 · ${c.dataView === "test" ? "封存观察" : guide === null ? "自由探索" : `上手 ${guide + 1} / 3`}</span><h2>${seaQuestions[c.state.unit]}</h2><p class="${o.notice&&!o.rawBad?'mission-feedback':''}" ${o.notice&&!o.rawBad?'role="status"':''}>${o.notice&&!o.rawBad?esc(o.notice):c.dataView === "test" ? "这是一份冻结的检验结果。回到训练调查后，可继续调整自己的草稿。" : guide === null ? "换位置、改分界，留一份自己的发现。" : seaHints[guide]}</p><div>${guide === null ? '<button data-action="guide">再带我试一次</button>' : '<button data-action="guide-skip">跳过带练</button>'}<button data-action="manual">操作说明 ↗</button>${o.notice&&!o.rawBad?'<button data-action="dismiss">收起提示</button>':''}</div></div></aside></div>
      <aside class="instrument-spine"><button class="cabinet-button" data-action="blueprints" aria-label="打开模型图纸"><img src="${cabinetProp}" alt=""><span class="cabinet-plaque">模型里面</span><small class="cabinet-count">${c.w.model.hidden.reduce((a,b)=>a+b,0)} 个单元<br>${parameterCount(c.w.model)} 个参数</small><span class="cabinet-rose" aria-hidden="true">${seaIcon("compass")}</span></button><div class="cabinet-tools"><button data-action="controls">精确调整</button><button data-action="sample" ${c.busy ? "disabled" : ""}>补充调查</button></div><span class="active-unit-caption">L${c.selected[0]+1} · N${c.selected[1]+1}</span></aside>
      
    </main>
    <footer class="nautical-dock"><img class="desk-dividers" src="${dividerProp}" alt=""><img class="desk-rope" src="${ropeProp}" alt=""><div class="desk-notebook" aria-hidden="true"><span>留住今天<br>的发现</span></div><div class="field-kit"><button data-action="sea-manual" class="field-tool ${guide === 0 || (guide === null && c.dataView === "train" && !c.busy) ? "suggested" : ""}" ${c.busy ? "disabled" : ""}><img class="field-prop" src="${compassProp}" alt=""><span><b>手动调整</b><small>拖动圆柄，改变分界</small></span></button><button data-action="sea-train" class="field-tool ${guide === 1 || c.busy ? "suggested" : ""}" ${c.busy || c.dataView === "test" ? "disabled" : ""}><img class="field-prop binocular-prop" src="${binocularsProp}" alt=""><span><b>${c.busy ? "模型正在学习" : "让模型学"}</b><small>根据调查点学习 100 步</small></span></button><button data-action="sea-check" class="field-tool ${guide === 2 || c.dataView !== "train" ? "suggested" : ""}" ${c.busy ? "disabled" : ""}><img class="field-prop magnifier-prop" src="${magnifierProp}" alt=""><span><b>新点检验</b><small>用没见过的调查试一试</small></span></button></div><div class="log-strip"><span class="log-status" data-save-status>${esc(o.status)}</span><span class="training-counter">已学 <b data-live="steps">${c.w.model.steps}</b> 步</span><div><button data-action="capture-A" ${c.busy || c.dataView === "test" ? "disabled" : ""}>${snapshots.some((s) => s.name === "A") ? "更新 A" : "留一张 A"}</button><button data-action="capture-B" ${c.busy || c.dataView === "test" ? "disabled" : ""}>${snapshots.some((s) => s.name === "B") ? "更新 B" : "留一张 B"}</button><button data-action="compare">对照</button><button data-action="record-screen">${seaIcon("feather")}收录发现</button></div><button data-action="undo" ${!o.undo || c.busy ? "disabled" : ""}>${seaIcon("undo")}撤销</button></div></footer>
    ${open ? `<dialog class="chart-dialog" aria-label="${screenNames[v.screen]}"><header><span>启明号航海日志 / ${screenNames[v.screen]}</span><button data-action="play" aria-label="收起日志，回到海图">收起 ×</button></header><div class="paper-workspace" data-screen="${v.screen}">${o.content}</div><footer>${[["controls","controls","参数"],["blueprints","blueprints","图纸"],["compare","compare","实验对照"],["record-screen","record","收录发现"],["report","gallery","海图集"]].map(([action,screen,label])=>`<button data-action="${action}" ${v.screen===screen?'aria-current="page"':''}>${label}</button>`).join("")}<span></span><button data-action="seal">${c.w.final ? "查看封存" : "封存检验"}</button><button data-action="export">导出作品</button><button data-action="import">导入作品</button></footer></dialog>` : ""}
    ${o.notice && o.rawBad ? `<div class="notice" role="status"><span>${esc(o.notice)}</span>${o.rawBad ? '<button data-action="raw-export">导出原记录</button>' : ""}<button data-action="dismiss" aria-label="关闭提示">×</button></div>` : ""}<input id="import-file" type="file" accept=".json,application/json" hidden></div>`;
}
