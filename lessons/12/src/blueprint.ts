import {FIELD_SCENARIOS,scenarioConfig,type FieldScenario} from "./field-inquiry.ts";
import {fieldStage,fieldNotes,showDecisionComparison} from "./field-view.ts";
import {feedbackEvidence} from "./feedback-evidence.ts";
import "../../../shared/creator/base.css";
import "./blueprint.css";
import "./field.css";
import { installTechExperience } from "../../../shared/creator/tech.ts";
import { Workbench } from "./workbench.ts";
import type { SessionStore } from "./storage.ts";
import { makeDraft, decodeCanvas, firstWorkflow } from "./canvas-draft.ts";
import type { CanvasDraft } from "./canvas-draft.ts";
import { connectNodes, newNode, outlets } from "./board.ts";
import { validateConfig, TOOL_LABELS } from "./engine/index.ts";
import type { WorkflowNode, Run, WorldState } from "./engine/index.ts";
import {
  diagramMarkup,
  bindDiagram,
  newCanvasView,
} from "../../../shared/creator/canvas.ts";
import type {
  DiagramNode,
  DiagramEdge,
} from "../../../shared/creator/canvas.ts";
import {
  h,
  icon,
  modal,
  download,
  mountReturn,
} from "../../../shared/creator/dom.ts";
import { CreatorStore, chapterURL } from "../../../shared/creator/store.ts";
import { createCreator } from "../../../shared/creator/project.ts";
import { playReceipt } from "./audio.ts";
import { LOG_KIND_LABELS, showRunHistory } from "./history-dialog.ts";
import type { GreenhouseScene,SceneView } from "./greenhouse-scene.ts";

const unitBriefs = [
  {name:"声明与行动",concept:"工具调用",question:"说“已完成”，环境就变了吗？",instruction:"先比较文字声明与实际用水，再读取探针。"},
  {name:"搭建反馈流程",concept:"感知—行动—反馈",question:"为什么执行以后，还要重新观测？",instruction:"亲手调整节点和连线，让结果回到下一次判断。"},
  {name:"比较决策方式",concept:"工作流与规划",question:"固定顺序和目标规划，怎样做决定？",instruction:"固定同一初始环境，比较两种决策方式的实际行动。"},
  {name:"故障与边界",concept:"能力边界与人工接管",question:"工具失败时，系统应该怎么办？",instruction:"尝试管道堵塞、探针离线或预算不足，检查停止依据。"},
  {name:"面对新的一天",concept:"迁移与核验",question:"换一种环境，原方案还可靠吗？",instruction:"面对陌生状态，重新检验自己的方案。"},
];
function greenhouse(
  world: WorldState,
  run: Run | null,
  faults: { pumpBlocked: boolean; sensorOffline: boolean },
) {
  const water = Math.max(0, Math.min(135, (world.tankMl / 300) * 135)),
    wet = world.moisture,
    flowing =
      !!run?.lastReceipt?.applied && run.lastReceipt.input.tool === "water";
  return `<svg class="greenhouse-cutaway" role="group" viewBox="0 0 420 310" aria-label="执行现场：湿度${wet}%，温度${world.temperature}度，水箱${world.tankMl}毫升"><defs><linearGradient id="glass12" x2="1" y2="1"><stop stop-color="#c7e7ea" stop-opacity=".12"/><stop offset="1" stop-color="#365f76" stop-opacity=".1"/></linearGradient></defs><path d="M30 265 175 300 390 245 245 213Z" fill="#1b3e55" stroke="#688d9e"/><path d="M30 265V95l128-65 87 61v122l-70 87V145Z" fill="url(#glass12)" stroke="#7598a8"/><path d="m30 95 145 50 215-49-145-5-87-61 145 49 87 17v149l-215 55V145" fill="none" stroke="#95aeb8" stroke-width="2"/><path d="M65 108v166m38-153v163m37-151v161m78-159v154m50-166v154m51-166v153m47-163v151M30 182l145 45 215-49M87 65l144 54m-29-68 145 57" fill="none" stroke="#7295a4" stroke-opacity=".55"/>${world.vent ? '<path d="m175 77 57-15-4 39-53 15Z" fill="#74bed54d" stroke="#aed1d2"/>' : ""}${world.shade ? '<path d="m30 96 145 49 215-49-145-5-87-61Z" fill="#263b57bb" stroke="#8ba4af"/>' : ""}<path d="m75 230 112 33 84-25-111-29Z" fill="hsl(155 18% ${20 + wet * 0.22}%)" stroke="#82a293"/><path d="M75 230v18l112 34v-19m0 19 84-26v-18" fill="#39505c" stroke="#718b8f"/>${[
    0, 1, 2,
  ]
    .map((i) => {
      const x = 116 + i * 47,
        y = 225 + i * 8;
      return `<g stroke="#abc0a7" stroke-width="1.2"><path d="M${x} ${y}q-6-40 2-75" fill="none"/><path d="M${x} ${y - 18}q-34-7-27-28 27 0 28 19m0-14q30-25 36-6-9 20-36 21m-1-25q-19-13-9-30 18 2 12 24" fill="#63957a" fill-opacity=".7"/></g>`;
    })
    .join(
      "",
    )}<rect x="305" y="125" width="62" height="138" rx="5" fill="#142d47" stroke="#91b0be"/><rect x="310" y="${258 - water}" width="52" height="${water}" fill="#548ca7" opacity=".65"/><path d="M309 127h55m-7 25h8m-8 25h8m-8 25h8m-8 25h8m-8 25h8" stroke="#b1cad0"/><path d="M335 263v16h-90v-26h-53" fill="none" stroke="#7493a6" stroke-width="8"/><path d="M335 263v16h-90v-26h-53" fill="none" stroke="${faults.pumpBlocked ? "#d29168" : "#82d6e1"}" stroke-width="2" ${flowing ? 'stroke-dasharray="5 7" class="water-pulse"' : ""}/>${faults.pumpBlocked ? '<circle cx="273" cy="279" r="12" fill="#5a383b" stroke="#e39d72"/><path d="m267 273 12 12m-12 0 12-12" stroke="#f5c49c"/>' : ""}<path d="M204 237v-50" stroke="#d6ba85" stroke-width="3"/><g class="scene-tool" data-scene-tool="observe" role="button" tabindex="0" aria-label="点按探针，读取环境"><circle class="tool-hit" cx="204" cy="183" r="22" fill="transparent"/><circle cx="204" cy="183" r="13" fill="none" stroke="#7adddf" stroke-opacity=".4"/><circle cx="204" cy="183" r="7" fill="${faults.sensorOffline ? "#ed7861" : "#83e6eb"}"/><text x="227" y="182">读数</text></g><g class="scene-tool" data-scene-tool="water" role="button" tabindex="0" aria-label="点按供水阀，请求浇水20毫升"><circle class="tool-hit" cx="335" cy="240" r="22" fill="transparent"/><circle cx="335" cy="240" r="11" fill="#123d60" stroke="#81dfea"/><path d="M328 240h14m-7-7v14" stroke="#a5eff2"/><text x="359" y="243">供水</text></g><text x="305" y="114">${world.tankMl} mL</text><text x="39" y="288">模拟环境 · 非真实设备</text></svg>`;
}

export function startBlueprint(store: SessionStore) {
  const root = document.getElementById("app")!,
    w = new Workbench(store);
  installTechExperience(root, 12);
  let draft: CanvasDraft,
    canvasError = "",
    selected = "sense",
    notice = "",
    panel: "world" | "node" | "trace" = "world",
    tracePage = 0,
    playing = false,
    timer: ReturnType<typeof setInterval> | undefined,
    day = 0,
    space: "field"|"flow" = "field",
    dispose = () => {},
    moveStarted = false;
  const view = newCanvasView(),
    undo: CanvasDraft[] = [];
  let scenePreview: GreenhouseScene | undefined;
  let scenePromise: Promise<GreenhouseScene> | undefined;
  let sceneTicket = 0;
  addEventListener("pagehide", () => scenePreview?.dispose(), {once: true});
  if (!w.saved && !w.bootError) {
    w.config.initial.temperature = 24;
    w.config.workflow = firstWorkflow();
    w.scenarioName = "干燥的种植床";
  }
  try {
    draft = store.loadCanvas() ?? makeDraft(w.config.workflow);
  } catch (error) {
    canvasError = String(error);
    draft = makeDraft(w.config.workflow);
  }
  if (
    !store.readCanvasRaw() &&
    draft.workflow.nodes.length === 7 &&
    draft.workflow.nodes.some((n) => n.id === "read-final")
  )
    draft.positions = {
      sense: { x: 70, y: 140 },
      soil: { x: 340, y: 140 },
      water: { x: 610, y: 140 },
      "read-final": { x: 340, y: 360 },
      verify: { x: 610, y: 360 },
      done: { x: 880, y: 285 },
      human: { x: 880, y: 475 },
    };
  const problems = () =>
    validateConfig({ ...w.config, workflow: draft.workflow });
  function persistCanvas() {
    if (canvasError) throw Error("原画布记录需要处理，请先导出原稿。");
    store.saveCanvas(draft);
  }
  function edit(update: (d: CanvasDraft) => void) {
    const next = structuredClone(draft);
    update(next);
    decodeCanvas(JSON.stringify(next));
    undo.push(structuredClone(draft));
    if (undo.length > 30) undo.shift();
    draft = next;
    persistCanvas();
  }
  function applyDraft() {
    const errors = problems();
    if (errors.length) throw Error(errors[0]);
    if (JSON.stringify(w.config.workflow) !== JSON.stringify(draft.workflow))
      w.change((c) => {
        c.workflow = structuredClone(draft.workflow);
      });
  }
  function publish() {
    window.dispatchEvent(
      new CustomEvent("nova:progress", {
        detail: {
          chapter: 12,
          completed: w.completed.filter(Boolean).length,
          total: 5,
          pathLabel: "行动编排 · 真实执行",
          artifactCount: w.runs.length,
        },
      }),
    );
  }
  function action(fn: () => void) {
    try {
      fn();
      publish();
      notice = w.active?.logs.length ? "" : w.message;
      playReceipt(w.ui.muted, true);
    } catch (error) {
      notice = error instanceof Error ? error.message : String(error);
      playReceipt(w.ui.muted, false);
    }
    render();
  }
  function stopPlaying() {
    playing = false;
    if (timer) clearInterval(timer);
    timer = undefined;
  }
  function manualTool(tool: "observe" | "water" | "ventilate" | "shade") {
    if (playing || (w.active && w.active.status !== "running")) return;
    action(() => {
      w.manual({
        tool,
        requestId: crypto.randomUUID(),
        ...(tool === "water" || tool === "ventilate" ? { amount: 20 } : tool === "shade" ? {deployed:!(w.active?.environment.world??w.config.initial).shade} : {}),
      });
      panel = "world";
    });
  }
  function diagrams(): {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    active: string | null;
  } {
    if (w.config.mode === "planner") {
      const last = w.active?.logs.at(-1),
        plan = w.active?.logs.filter((l) => l.plan).at(-1)?.plan,
        labels = plan?.actions.map((a) => TOOL_LABELS[a.tool]).join(" → ");
      return {
        nodes: [
          {
            id: "observe",
            kind: "observe",
            label: "观察当前环境",
            x: 100,
            y: 140,
            detail: "只使用可靠的最新观测",
            outlets: [{ key: "next", label: "观测" }],
          },
          {
            id: "plan",
            kind: "model",
            label: "搜索可行计划",
            x: 410,
            y: 140,
            detail: plan
              ? `实际搜索 ${plan.explored} 个状态`
              : "有界状态搜索，不冒充大语言模型",
            outlets: [{ key: "next", label: "计划" }],
          },
          {
            id: "act",
            kind: "action",
            label: "调用真实模拟工具",
            x: 410,
            y: 370,
            detail: labels ?? "计划生成后显示实际动作",
            outlets: [{ key: "next", label: "回执" }],
          },
          {
            id: "verify",
            kind: "verify",
            label: "再次观察与核验",
            x: 100,
            y: 370,
            detail: "不达标则调整或停止",
            outlets: [{ key: "next", label: "反馈" }],
          },
        ],
        edges: [
          { from: "observe", outlet: "next", to: "plan" },
          { from: "plan", outlet: "next", to: "act" },
          { from: "act", outlet: "next", to: "verify" },
          { from: "verify", outlet: "next", to: "observe" },
        ],
        active:
          last?.kind === "action"
            ? "act"
            : last?.kind === "plan"
              ? "plan"
              : last?.kind === "observe"
                ? "observe"
                : last
                  ? "verify"
                  : null,
      };
    }
    return {
      nodes: draft.workflow.nodes.map((n) => ({
        id: n.id,
        ...(draft.positions[n.id] ?? { x: 80, y: 80 }),
        kind: n.kind === "stop" && n.end === "complete" ? "output" : n.kind,
        label: n.label,
        detail:
          n.kind === "observe"
            ? "读取 → 新的观测数据"
            : n.kind === "action"
              ? `${TOOL_LABELS[n.tool!]} ${n.tool === "shade" ? (n.deployed ? "展开" : "收起") : `${n.amount}${n.tool === "water" ? " mL" : " 秒"}`}`
              : n.kind === "branch"
                ? n.predicate === "moisture-low"
                  ? "比较土壤湿度下限"
                  : n.predicate === "temperature-high"
                    ? "比较温度上限"
                    : "比较全部目标"
                : n.kind === "verify"
                  ? "可靠观测 + 所有目标"
                  : "明确结束状态",
        outlets: outlets(n).map((key) => ({
          key,
          label: key === "next" ? "继续" : key === "yes" ? "是" : "否",
        })),
      })),
      edges: draft.workflow.nodes.flatMap((n) =>
        outlets(n)
          .filter((outlet) => n[outlet])
          .map((outlet) => ({ from: n.id, outlet, to: n[outlet]! })),
      ),
      active: w.active?.logs.at(-1)?.nodeId ?? null,
    };
  }
  function nodePanel() {
    const n = draft.workflow.nodes.find((n) => n.id === selected);
    if (!n) return "<p>点选一个节点，查看它的输入、参数与出口。</p>";
    return `<span class="micro-label">节点 ${h(n.id)}</span><h2>配置这一小步</h2><label>节点名称<input data-node-field="label" value="${h(n.label)}" maxlength="80"></label><p class="node-explanation">${n.kind === "observe" ? "读取环境，产出观测数据。" : n.kind === "branch" ? "使用前一步观测，选择是或否的控制路径。" : n.kind === "verify" ? "核验可靠观测是否满足全部目标，不能用文字声明替代。" : n.kind === "stop" ? "结束本次执行。完成与请求人工接管分别记录。" : "向工具发请求，再根据回执和重新观测判断是否执行。"}</p>${
      n.kind === "branch"
        ? `<label>判断条件<select data-node-field="predicate">${[
            ["moisture-low", "湿度低于目标"],
            ["temperature-high", "温度高于目标"],
            ["target", "全部目标已达到"],
          ]
            .map(
              ([id, label]) =>
                `<option value="${id}" ${n.predicate === id ? "selected" : ""}>${label}</option>`,
            )
            .join("")}</select></label>`
        : ""
    }${n.kind === "action" ? `<label>工具<select data-node-field="tool">${(["water", "ventilate", "shade"] as const).map((id) => `<option value="${id}" ${n.tool === id ? "selected" : ""}>${TOOL_LABELS[id]}</option>`).join("")}</select></label>${n.tool === "shade" ? `<label>遮阴板<select data-node-field="deployed"><option value="true" ${n.deployed ? "selected" : ""}>展开</option><option value="false" ${!n.deployed ? "selected" : ""}>收起</option></select></label>` : `<label>请求量（10的倍数）<input data-node-field="amount" type="number" min="10" max="100" step="10" value="${n.amount}"></label>`}` : ""}${n.kind === "stop" ? `<label>结束方式<select data-node-field="end"><option value="complete" ${n.end === "complete" ? "selected" : ""}>核验后完成</option><option value="human" ${n.end === "human" ? "selected" : ""}>请求人工</option></select></label>` : ""}<div class="node-outlets">${outlets(
      n,
    )
      .map(
        (key) =>
          `<div><span>${key === "next" ? "继续" : key === "yes" ? "是" : "否"}</span><b>${h(draft.workflow.nodes.find((t) => t.id === n[key])?.label ?? "尚未连接")}</b><button data-disconnect="${key}">断开</button></div>`,
      )
      .join(
        "",
      )}</div><div class="inline-actions">${n.kind === "observe" ? '<button data-action="start-node">设为起点</button>' : ""}<button data-action="remove-node" ${n.id === draft.workflow.start ? "disabled" : ""}>移除节点</button></div>`;
  }
  function render() {
    dispose();
    const ticket = ++sceneTicket;
    const world = w.active?.environment.world ?? w.config.initial,
      run = w.active,
      logs = run?.logs ?? [],
      errors = problems(),
      model = diagrams(),
      last = logs.at(-1),
      observation = run?.observation;
    tracePage = Math.min(
      tracePage,
      Math.max(0, Math.ceil(logs.length / 4) - 1),
    );
    const feedback=feedbackEvidence(run);
    root.innerHTML = `<div class="blueprint-app" data-playing="${playing}"><header class="course-header"><span data-nova-return-host></span><h1><span class="chapter-no">12</span>行动编排台</h1><nav class="mode-tabs"><button data-mode="workflow" aria-pressed="${w.config.mode === "workflow"}">固定工作流</button><button data-mode="planner" aria-pressed="${w.config.mode === "planner"}">目标驱动</button></nav><nav class="space-tabs" aria-label="工作区视图"><button data-space="field" aria-pressed="${space==='field'}">现场值守</button><button data-space="flow" aria-pressed="${space==='flow'}">流程编排</button></nav><span class="header-spacer"></span><div class="header-tools"><button data-action="guide">${icon("help")}帮助</button><button data-action="save">保存草稿</button><button data-action="handoff">交给创作台 ${icon("play")}</button></div></header><div class="blueprint-question"><div><span class="micro-label">核心概念 / ${unitBriefs[w.unit].concept}</span><h2>${unitBriefs[w.unit].question}</h2><p class="unit-instruction">${unitBriefs[w.unit].instruction}</p></div><div class="unit-tabs">${unitBriefs.map(({name}, i) => `<button data-unit="${i}" aria-pressed="${w.unit === i}"><b>${w.completed[i] ? "✓" : i + 1}</b><span>${name}</span></button>`).join("")}</div></div>
 <main class="blueprint-workspace ${space==='field'?'field-mode':''}">${space==='field'?fieldStage(w,greenhouse(world,run,w.config.faults)):`<aside class="node-palette"><span>添加节点</span>${(["observe", "branch", "action", "verify", "stop"] as const).map((kind, i) => `<button data-add="${kind}" ${w.config.mode === "planner" || playing ? "disabled" : ""}>${icon((["search", "condition", "tool", "check", "stop"] as const)[i])}<b>${["观测", "判断", "工具", "核验", "停止"][i]}</b></button>`).join("")}<button class="palette-undo" data-action="undo" ${!undo.length || playing ? "disabled" : ""}>${icon("undo")}撤销</button></aside><section class="blueprint-canvas">${diagramMarkup(model.nodes, selected, model.active)}${errors.length && w.config.mode === "workflow" ? `<div class="diagram-warning">连线待完成：${h(errors[0])}</div>` : ""}</section>`}
 <aside class="execution-panel"><nav class="panel-tabs">${(["world", "node", "trace"] as const).map((id, i) => `<button data-panel="${id}" aria-pressed="${panel === id}">${["执行现场", "节点设置", "运行轨迹"][i]}</button>`).join("")}</nav><div class="execution-status ${run?.status === "succeeded" ? "success" : run?.status === "needs-human" || run?.status === "stopped" ? "stopped" : ""}"><i></i><strong>${run ? (run.status === "running" ? (playing ? "正在运行" : "已暂停 · 尚未完成") : run.status === "succeeded" ? "已核验 · 任务完成" : "已停止 · 需要检查") : "准备试验"}</strong><small>${run ? `${run.config.mode === "planner" ? "目标规划" : "工作流"} · ${run.calls} 次调用 · ${run.waterUsedMl} mL实际用水` : h(w.scenarioName)}</small></div>
 ${
   panel === "world"
     ? space === "field" ? fieldNotes(w) : `<div class="world-pane"><div class="greenhouse-viewport">${greenhouse(world, run, w.config.faults)}<span class="scene-scale">SIMULATION / 模拟现场</span><button class="scene-reset" data-action="scene-overview" aria-label="温室视角复位">${icon("fit")}</button><span class="scene-render-status">拖动旋转 · 滚轮缩放 · 点按探针或阀门</span></div><div class="world-readouts"><div><span>现场湿度</span><b>${world.moisture}%</b></div><div><span>现场温度</span><b>${world.temperature}°C</b></div><div><span>水箱</span><b>${world.tankMl} mL</b></div></div><p class="observation-strip">最近可靠观测：${observation?.reliable ? `${observation.moisture}% / ${observation.temperature}°C` : "尚无可靠读数"}<br><span>规划器使用观测；上方现场数值供你核对。</span></p><div class="manual-tools"><button data-action="statement">发出声明</button><button data-tool="observe">读探针</button><button data-tool="water">请求浇水20mL</button></div></div>`
     : panel === "node"
       ? `<div class="node-settings">${nodePanel()}</div>`
       : `<div class="trace-pane"><h3>每一步都留下回执</h3>${
           logs
             .slice(tracePage * 4, tracePage * 4 + 4)
             .map(
               (l) =>
                 `<article><span>${String(l.index + 1).padStart(2, "0")} · ${LOG_KIND_LABELS[l.kind] ?? h(l.kind)}</span><p>${h(l.summary)}</p><small>${l.world.moisture}% / ${l.world.temperature}°C · ${l.waterUsedMl} mL</small></article>`,
             )
             .join("") || "<p>点击单步，从一次真实观测开始。</p>"
         }<div class="page-pager"><button data-action="trace-prev" ${tracePage === 0 ? "disabled" : ""}>←</button><span>${tracePage + 1} / ${Math.max(1, Math.ceil(logs.length / 4))}</span><button data-action="trace-next" ${(tracePage + 1) * 4 >= logs.length ? "disabled" : ""}>→</button></div></div>`
 }
 <div class="feedback-evidence" aria-label="请求、执行与核验的区别"><div class="${feedback.requested?"observed":""}"><i>01</i><span>请求<small>${feedback.request}</small></span></div><b>→</b><div class="${feedback.applied?"observed":""}"><i>02</i><span>执行<small>${feedback.execution}</small></span></div><b>→</b><div class="${feedback.verified?"verified":""}"><i>03</i><span>核验<small>${feedback.verification}</small></span></div></div><div class="runtime-controls"><button data-action="step" ${playing || errors.length ? "disabled" : ""}>${icon("play")}单步</button><button class="primary" data-action="run" ${errors.length ? "disabled" : ""}>${icon(playing ? "pause" : "play")}${playing ? "暂停" : "运行"}</button><button data-action="reset">${icon("undo")}新试验</button></div><p class="last-receipt">${h(last?.summary ?? "先读环境，再调用工具；最后重新观测。")}</p></aside></main>
 <footer class="blueprint-footer"><div class="environment-controls"><button data-action="environment">${icon("tool")}目标与预算</button><label><input data-fault="pumpBlocked" type="checkbox" ${w.config.faults.pumpBlocked ? "checked" : ""}>管道堵塞</label><label><input data-fault="sensorOffline" type="checkbox" ${w.config.faults.sensorOffline ? "checked" : ""}>探针离线</label><label><input data-fault="weatherShift" type="checkbox" ${w.config.faults.weatherShift ? "checked" : ""}>天气突变</label></div><div>${space === "field" ? "" : '<button data-action="compare">同条件比较两种方式</button>'}<button data-action="new-day">陌生的一天</button><button data-action="history">运行记录 ${w.runs.length}</button><button data-action="export">导出方案</button><button data-action="import">导入</button><button data-action="mute">声音${w.ui.muted ? "关" : "开"}</button></div></footer>${notice || w.bootError || canvasError ? `<div class="toast">${h(canvasError || w.bootError || notice)}${canvasError ? '<button data-action="raw-canvas">下载原画布</button><button data-action="recover-canvas">采用已保存流程</button>' : ""}<button data-action="dismiss">×</button></div>` : ""}<input class="native-file" id="workflow-file" type="file" accept=".json,application/json"></div>`;
    mountReturn(12);
    const sceneHost = root.querySelector<HTMLElement>(".greenhouse-viewport");
    if (sceneHost) {
      scenePromise ??= import("./greenhouse-scene.ts").then(({GreenhouseScene}) => {
        scenePreview = new GreenhouseScene(manualTool);
        return scenePreview;
      });
      void scenePromise.then(scene => {
        if(ticket === sceneTicket && sceneHost.isConnected)
          scene.mount(sceneHost, world, run?.lastReceipt, run?.config.faults ?? w.config.faults, playing || (!!run && run.status !== "running"));
      }).catch(error => {
        if(ticket !== sceneTicket || !sceneHost.isConnected) return;
        sceneHost.querySelector(".scene-render-status")!.textContent = "三维预览不可用，保留可操作示意图。";
        sceneHost.setAttribute("title", String(error));
        console.error("温室三维预览：", error);
      });
    }
    root
      .querySelectorAll<SVGElement>("[data-scene-tool]")
      .forEach((control) =>
        control.setAttribute("aria-disabled", String(playing)),
      );
    if(run && run.status !== "running")root.querySelectorAll<HTMLButtonElement>('[data-tool],[data-action="statement"]').forEach(b=>b.disabled=true);
    if (playing)
      root
        .querySelectorAll<
          HTMLInputElement | HTMLSelectElement | HTMLButtonElement
        >(".manual-tools button,.field-tools button,.field-hotspot,.field-scenarios button,.field-prediction button,.node-settings input,.node-settings select,.node-settings button,.node-palette button")
        .forEach((control) => (control.disabled = true));
    dispose = space === "flow" ? bindDiagram(root, model.nodes, model.edges, view, {
      readonly: w.config.mode === "planner" || playing,
      routing: "orthogonal",
      active: model.active,
      flowing: playing,
      select: (id) => {
        selected = id;
        if (w.config.mode === "workflow") panel = "node";
        render();
      },
      move: (id, x, y) => {
        if (!moveStarted) {
          undo.push(structuredClone(draft));
          moveStarted = true;
        }
        draft.positions[id] = { x, y };
      },
      commit: () => {
        moveStarted = false;
        try {
          persistCanvas();
        } catch (error) {
          notice = String(error);
        }
        render();
      },
      connect: (from, outlet, to) =>
        action(() => {
          const result = connectNodes(
            draft.workflow,
            from,
            outlet as "next" | "yes" | "no",
            to,
          );
          if (!result.ok) throw Error(result.error);
          edit((d) => {
            d.workflow = result.workflow;
          });
          w.message = "已连上真实执行端口。";
        }),
    }) : () => {};
  }
  root.addEventListener("click", (event) => {
    const sceneTool = (event.target as Element).closest<SVGElement>(
      "[data-scene-tool]",
    );
    if (sceneTool) {
      manualTool(sceneTool.dataset.sceneTool as "observe" | "water" | "ventilate" | "shade");
      return;
    }
    const b = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button",
    );
    if (!b || b.disabled) return;
    if(b.dataset.sceneView){scenePreview?.focus(b.dataset.sceneView as SceneView);return;}
    if(b.dataset.space){space=b.dataset.space as typeof space;view.fit=true;render();return;}
    if(b.dataset.scenario){stopPlaying();action(()=>{const id=b.dataset.scenario as FieldScenario;w.change(c=>Object.assign(c,scenarioConfig(c,id)));w.scenarioName=FIELD_SCENARIOS.find(s=>s.id===id)!.title;w.unit=id==="heatwave"?2:id==="blocked"?3:0;w.reflection={prediction:"",explanation:"",revision:""};w.message="";w.persist();panel="world";});return;}
    if(b.dataset.prediction){w.reflection.prediction=b.dataset.prediction;notice="";w.persist();render();return;}
    if (b.dataset.mode) {
      stopPlaying();
      action(() => {
        w.change((c) => {
          c.mode = b.dataset.mode as "workflow" | "planner";
        });
        view.fit = true;
        panel = "world";
      });
      return;
    }
    if (b.dataset.panel) {
      panel = b.dataset.panel as typeof panel;
      render();
      return;
    }
    if (b.dataset.unit) {
      w.unit = Number(b.dataset.unit);
      // Lesson 2 builds the feedback workflow, which lives on the flow canvas.
      if (w.unit === 1 && space !== "flow") { space = "flow"; view.fit = true; }
      w.persist();
      notice = "";
      render();
      return;
    }
    if (b.dataset.add) {
      action(() => {
        edit((d) => {
          if (d.workflow.nodes.length >= 24) throw Error("最多24个节点。");
          const n = newNode(d.workflow, b.dataset.add as WorkflowNode["kind"]);
          d.workflow.nodes.push(n);
          d.positions[n.id] = {
            x: 140 + (d.workflow.nodes.length % 4) * 250,
            y: 220 + Math.floor(d.workflow.nodes.length / 4) * 150,
          };
          selected = n.id;
        });
        panel = "node";
        view.fit = true;
        w.message = "新节点已放上画布；连接完整后才能运行。";
      });
      return;
    }
    if (b.dataset.disconnect) {
      action(() =>
        edit((d) => {
          delete d.workflow.nodes.find((n) => n.id === selected)![
            b.dataset.disconnect as "next" | "yes" | "no"
          ];
        }),
      );
      return;
    }
    if (b.dataset.tool) {
      manualTool(b.dataset.tool as "observe" | "water");
      return;
    }
    const type = b.dataset.action;
    if (!type) return;
    if (type === "scene-overview") {
      scenePreview?.reset();
      return;
    }
    if (type === "dismiss") {
      notice = "";
      w.message = "";
      render();
      return;
    }
    if (
      ["guide", "environment", "history", "import", "handoff"].includes(type) &&
      playing
    ) {
      stopPlaying();
      render();
    }
    if (type === "run") {
      if (playing) {
        stopPlaying();
        render();
        return;
      }
      try {
        applyDraft();
        playing = true;
        timer = setInterval(() => {
          w.step();
          publish();
          if (w.active?.status !== "running") stopPlaying();
          tracePage = Math.max(
            0,
            Math.ceil((w.active?.logs.length ?? 0) / 4) - 1,
          );
          render();
        }, 580);
        render();
      } catch (error) {
        notice = String(error);
        render();
      }
      return;
    }
    if (type === "guide") {
      modal(
        root,
        "看见每条指令的真实后果",
        '<div class="dialog-grid"><div><h3>先试一次真实行动</h3><p>发出“已经浇水”的声明，水量不会改变。读探针、请求浇水、再次读取，观察实际回执。也可直接点现场的探针与供水阀，或聚焦后按回车。</p><h3>接线</h3><p>点一个节点的输出端，再点另一个节点的输入端。观测数据只能进入判断或核验；控制路径进入读取、工具或停止。</p></div><div><h3>调试</h3><p>单步执行，或运行后暂停。打开管道堵塞与探针离线，核对停止原因。</p><h3>目标驱动</h3><p>使用明确标注的有界状态搜索规划器，根据可靠观测规划动作；它不是大语言模型。</p></div></div>',
      );
      return;
    }
    if (type === "environment") {
      const c = w.config,
        d = modal(
          root,
          "目标、许可与预算",
          `<div class="dialog-grid"><div class="dialog-field"><h3>目标区间</h3>${[
            ["moistureMin", "最低湿度"],
            ["moistureMax", "最高湿度"],
            ["temperatureMin", "最低温度"],
            ["temperatureMax", "最高温度"],
          ]
            .map(
              ([key, label]) =>
                `<label>${label}<input data-goal="${key}" type="number" value="${c.goal[key as keyof typeof c.goal]}"></label>`,
            )
            .join(
              "",
            )}</div><div class="dialog-field"><h3>运行边界</h3><label>最多工具调用<input id="max-calls" type="number" min="1" max="80" value="${c.limits.maxCalls}"></label><label>最多用水 mL<input id="max-water" type="number" min="0" max="300" value="${c.limits.maxWaterMl}"></label>${(["observe", "water", "ventilate", "shade"] as const).map((tool) => `<label><input type="checkbox" data-permission="${tool}" ${c.permissions[tool] ? "checked" : ""}>允许${TOOL_LABELS[tool]}</label>`).join("")}</div></div><div class="dialog-actions"><button class="primary" data-save-environment>应用到新试验</button></div>`,
        );
      d.querySelector("[data-save-environment]")!.addEventListener(
        "click",
        () =>
          action(() => {
            const next = structuredClone(c);
            d.querySelectorAll<HTMLInputElement>("[data-goal]").forEach(
              (input) =>
                (next.goal[input.dataset.goal as keyof typeof c.goal] = Number(
                  input.value,
                )),
            );
            next.limits.maxCalls = Number(
              d.querySelector<HTMLInputElement>("#max-calls")!.value,
            );
            next.limits.maxWaterMl = Number(
              d.querySelector<HTMLInputElement>("#max-water")!.value,
            );
            d.querySelectorAll<HTMLInputElement>("[data-permission]").forEach(
              (input) =>
                (next.permissions[
                  input.dataset.permission as keyof typeof c.permissions
                ] = input.checked),
            );
            const errors = validateConfig(next);
            if (errors.length) throw Error(errors[0]);
            stopPlaying();
            w.change((config) => Object.assign(config, next));
            d.remove();
          }),
      );
      return;
    }
    if(type === "compare"){stopPlaying();let compared=false;action(()=>{applyDraft();w.compare();panel="world";compared=true;});if(compared)showDecisionComparison(root,w);return;}
    if (type === "history") {
      showRunHistory(root, w.runs);
      return;
    }
    if (type === "handoff") {
      void (async () => {
        try {
          applyDraft();
          const project = await CreatorStore.open();
          project.project.workflow = w.artifact();
          project.project.evidence.workflowShared++;
          // A greenhouse flow landing on the untouched image-project brief reads as the wrong project; use the 13 greenhouse idea instead.
          const fresh = createCreator(), pr = project.project;
          if (!pr.models.length && pr.title === fresh.title && JSON.stringify(pr.brief) === JSON.stringify(fresh.brief)) {
            pr.title = "温室照护助手";
            pr.brief = { audience: "负责校园种植角的同学", need: "根据湿度和温度执行照护方案，再次观测，确认环境达到目标。", boundary: "探针离线、工具无效或资源不足时，停止并通知同学。" };
          }
          await project.save();
          location.href = chapterURL(13, project.project.id);
        } catch (error) {
          notice = String(error);
          render();
        }
      })();
      return;
    }
    if (type === "import") {
      root.querySelector<HTMLInputElement>("#workflow-file")!.click();
      return;
    }
    action(() => {
      if (type === "step") {
        applyDraft();
        w.step();
        tracePage = Math.max(
          0,
          Math.ceil((w.active?.logs.length ?? 0) / 4) - 1,
        );
      }
      if (type === "reset") {
        stopPlaying();
        w.reset();
        panel = "world";
      }
      if (type === "statement") {
        applyDraft();
        w.statement();
        panel = "world";
      }
      if (type === "save") {
        persistCanvas();
        w.message = "画布草稿已保存；未接完的线路不会冒充可执行方案。";
      }
      if (type === "undo") {
        const prior = undo.pop();
        if (prior) {
          draft = prior;
          persistCanvas();
          view.fit = true;
        }
      }
      if (type === "remove-node")
        edit((d) => {
          if (selected === d.workflow.start)
            throw Error("请先把另一个读取节点设为起点。");
          d.workflow.nodes = d.workflow.nodes.filter((n) => n.id !== selected);
          for (const n of d.workflow.nodes)
            for (const key of outlets(n))
              if (n[key] === selected) delete n[key];
          delete d.positions[selected];
          selected = d.workflow.start;
        });
      if (type === "start-node")
        edit((d) => {
          d.workflow.start = selected;
        });
      if (type === "new-day") {
        stopPlaying();
        w.newDay(day++);
        panel = "world";
      }
      if (type === "export") {
        applyDraft();
        download(JSON.stringify(w.artifact(), null, 2), "我的行动方案.json");
        w.message = "原生工作流、真实记录和边界已导出。";
      }
      if (type === "mute") {
        w.ui.muted = !w.ui.muted;
        store.saveMuted(w.ui.muted);
      }
      if (type === "trace-prev") tracePage--;
      if (type === "trace-next") tracePage++;
      if (type === "raw-canvas")
        download(store.readCanvasRaw() ?? "", "原画布记录.json");
      if (type === "recover-canvas") {
        canvasError = "";
        draft = makeDraft(w.config.workflow);
        persistCanvas();
        view.fit = true;
      }
    });
  });
  root.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    if (input.dataset.fault) {
      stopPlaying();
      action(() =>
        w.change((c) => {
          c.faults[input.dataset.fault as keyof typeof c.faults] = (
            input as HTMLInputElement
          ).checked;
        }),
      );
      return;
    }
    if (input.dataset.nodeField) {
      action(() =>
        edit((d) => {
          const node = d.workflow.nodes.find((n) => n.id === selected)!,
            field = input.dataset.nodeField!;
          if (field === "label") node.label = input.value;
          if (field === "predicate")
            node.predicate = input.value as NonNullable<
              WorkflowNode["predicate"]
            >;
          if (field === "tool") {
            node.tool = input.value as NonNullable<WorkflowNode["tool"]>;
            if (node.tool === "shade") node.deployed = true;
            else node.amount = 20;
          }
          if (field === "amount") node.amount = Number(input.value);
          if (field === "deployed") node.deployed = input.value === "true";
          if (field === "end") node.end = input.value as "complete" | "human";
        }),
      );
      return;
    }
    if (input.id === "workflow-file") {
      const file = (input as HTMLInputElement).files?.[0];
      if (file)
        void file
          .text()
          .then((raw) => {
            if (raw.length > 12_000_000) throw Error("文件超过12MB。");
            action(() => {
              stopPlaying();
              if (!w.importArtifact(JSON.parse(raw))) throw Error(w.message);
              draft = makeDraft(w.config.workflow);
              canvasError = "";
              persistCanvas();
              view.fit = true;
            });
          })
          .catch((error) => {
            notice = String(error);
            render();
          });
    }
  });
  render();
  window.addEventListener("pagehide", () => {
    stopPlaying();
    dispose();
  });
  root.addEventListener("keydown", (event) => {
    const scene = (event.target as Element).closest<SVGElement>(
      "[data-scene-tool]",
    );
    if (scene && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      manualTool(scene.dataset.sceneTool as "observe" | "water");
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) {
      stopPlaying();
      render();
    }
  });
}
