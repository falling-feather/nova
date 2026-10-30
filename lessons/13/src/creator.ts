import {designNextStep,designCoachMarkup} from "./design-coach.ts";
import {startingGraph,revisionInput,connectedNodes,type StartingPoint} from "./studio-inquiry.ts";
import {CREATIVE_IDEAS,starterMarkup,revisionMarkup} from "./studio-view.ts";
import {STAGE_CONCEPTS,capabilityFacts} from "./creator-capabilities.ts";
import { StepPlayback } from "../../../shared/creator/playback.ts";
import "../../../shared/linkage/course-links.js";
import "../../../shared/creator/base.css";
import "./creator.css";
import "./studio.css";
import { installTechExperience } from "../../../shared/creator/tech.ts";
import {
  CreatorStore,
  publishProgress,
  chapterURL,
} from "../../../shared/creator/store.ts";
import { assetImage, splitAssets } from "../../../shared/creator/data.ts";
import {
  beginModel,
  keepModel,
  encodeCreator,
  publishRelease,
} from "../../../shared/creator/project.ts";
import { evaluateRows } from "../../../shared/creator/model.ts";
import {
  NODE_LABELS,
  graphOutlets,
  graphProblems,
  startFlow,
  advanceFlow,
  finishFlow,
} from "../../../shared/creator/flow.ts";
import {
  diagramMarkup,
  bindDiagram,
  newCanvasView,
} from "../../../shared/creator/canvas.ts";
import {
  h,
  icon,
  drawImage,
  readImage,
  modal,
  download,
  mountReturn,
} from "../../../shared/creator/dom.ts";
import { validateArtifact } from "../../12/src/engine/index.ts";
import { validateProject as validateOld, runAssistant } from "./core.ts";
import {
  STAGES,
  stageDone,
  preview,
  nodeInspector,
  tracePanel,
  tracePageCount,
  briefStage,
  dataStage,
  trainingStage,
  testsStage,
  exhibitStage,
  statusName,
  versionFacts,
  executionSnapshot,
} from "./creator-view.ts";
import type { CreatorUI } from "./creator-view.ts";
import type {
  DiagramNode,
  DiagramEdge,
} from "../../../shared/creator/canvas.ts";
import type {
  Graph,
  NodeKind,
  LossPoint,
  DenseModel,
  FlowRun,
} from "../../../shared/creator/types.ts";
import type { Project as OldProject } from "./types.ts";

const root = document.querySelector<HTMLElement>("#app")!;
installTechExperience(root, 13);
const ui: CreatorUI = {
  stage: 0,
  panel: "preview",
  selected: "model",
  sampleId: "",
  uploaded: null,
  releaseId: "",
  run: null,
  tracePage: 0,
  resultPage: 0,
  runPage: 0,
  dataPage: 0,
  storyPage: 0,
  busy: false,
  playing: false,
  revisionFrom: "",
  draft: null,
  draftDataset: null,
  history: [],
  trainingSaved: false,
  notice: "",
};
let store: CreatorStore,
  dispose = () => {},
  worker: Worker | null = null,
  moving = false,
  graphBeforeMove: Graph | null = null;
const view = newCanvasView(),
  undo: Graph[] = [];
const p = () => store.project;
const playback = new StepPlayback(
  async () => {
    const run = ui.run;
    if (!run) return false;
    advanceFlow(p(), run);
    ui.tracePage = tracePageCount(ui) - 1;
    await save();
    render();
    return run.status === "running";
  },
  (error) => {
    ui.playing = false;
    if (error)
      ui.notice = error instanceof Error ? error.message : String(error);
    render();
  },
  420,
);
function pausePlayback() {
  playback.pause();
  ui.playing = false;
}
function playFlow() {
  ui.notice="";
  if (ui.playing) {
    pausePlayback();
    void act(() => {
      ui.notice = "已暂停在当前步骤，继续或单步会沿同一份快照执行。";
    });
    return;
  }
  try {
    if (!ui.run || ui.run.status !== "running") addRun();
    ui.playing = ui.run!.status === "running";
    ui.panel = "preview";
    render();
    if (ui.playing) playback.start();
    else void act(() => {});
  } catch (error) {
    ui.notice = String(error);
    render();
  }
}
async function save() {
  await store.save();
  publishProgress(p(), 13);
}
async function act(fn: () => void | Promise<void>) {
  ui.notice="";
  try {
    await fn();
    await save();
  } catch (error) {
    ui.notice = error instanceof Error ? error.message : String(error);
  }
  render();
}
function resetView() {
  pausePlayback();
  ui.revisionFrom="";
  ui.run = null;
  ui.uploaded = null;
  ui.releaseId = "";
  ui.selected = p().graph.start;
  ui.sampleId =
    splitAssets(p(), "validation")[0]?.id ??
    splitAssets(p(), "train")[0]?.id ??
    "";
  ui.runPage = 0;
  ui.dataPage = 0;
  ui.draft = null;
  ui.draftDataset = null;
  ui.history = [];
  view.fit = true;
}
/** A project that arrives with an action plan but no image model starts from the action graph instead of the untouched image one. */
function preferActionStart(): boolean {
  const project = p();
  if (!project.workflow || project.models.length || JSON.stringify(project.graph) !== JSON.stringify(startingGraph("image"))) return false;
  undo.push(structuredClone(project.graph));
  if (undo.length > 30) undo.shift();
  Object.assign(project.graph, startingGraph("workflow"));
  ui.selected = project.graph.start; ui.panel = "node"; ui.releaseId = ""; ui.run = null; view.fit = true;
  void save().catch(() => undefined);
  return true;
}
function editGraph(update: (g: Graph) => void) {
  undo.push(structuredClone(p().graph));
  if (undo.length > 30) undo.shift();
  update(p().graph);
  if(graphProblems(p().graph).length===0)p().evidence.graphEdits++;
  ui.releaseId = "";
  ui.run = null;
}
function currentImage() {
  return (
    ui.uploaded ??
    (p().assets.find((a) => a.id === ui.sampleId)
      ? assetImage(p().assets.find((a) => a.id === ui.sampleId)!)
      : null)
  );
}
function addRun(): FlowRun {
  if (p().runs.length >= 60)
    throw Error(
      "已保留60次试用。请先导出完整作品，并在“项目与历史”中新建项目。",
    );
  const run = startFlow(
    p(),
    ui.revisionFrom ? revisionInput(p().runs.find(r=>r.id===ui.revisionFrom)!) : ui.uploaded
      ? { image: ui.uploaded, question: "" }
      : { sampleId: ui.sampleId, question: "" },
    p().releases.find((r) => r.id === ui.releaseId),
  );
  if (run.context.input.sampleId) run.expectedLabel = p().dataset.labels[run.context.input.sampleId];
  p().runs.push(run);
  ui.run = run;
  ui.tracePage = 0;
  ui.resultPage = 0;
  return run;
}
function diagram() {
  const snapshot = executionSnapshot(p(), ui),
    graph = snapshot?.graph ?? p().graph,
    model = p().models.find(
      (m) => m.id === (snapshot ? snapshot.modelId : p().activeModelId),
    ),
    workflow = snapshot ? snapshot.workflow : p().workflow?.payload.config;
  const connected=new Set(connectedNodes(graph).map(n=>n.id));
  const nodes: DiagramNode[] = graph.nodes.map((n) => ({
    ...n,
    detail:
      !connected.has(n.id) ? "尚未接入实际路径" : n.kind === "model"
        ? model
          ? `${model.name} · 已训练`
          : "等待接入真实模型"
        : n.kind === "condition"
          ? `输出 ≥ ${((n.threshold ?? 0.7) * 100).toFixed(0)}%`
          : n.kind === "knowledge"
            ? "按类别查找 · 保留来源"
            : n.kind === "workflow"
              ? workflow
                ? "已接入行动方案"
                : "尚未接入"
              : n.kind === "human"
                ? "信息不足时，保留人的决定"
                : n.kind === "output"
                  ? "呈现本次实际结果"
                  : "接收图片或环境任务",
    outlets: graphOutlets(n).map((key) => ({
      key,
      label: key === "next" ? "" : key === "yes" ? "是" : "否",
    })),
  }));
  const edges: DiagramEdge[] = graph.nodes.flatMap((n) =>
    graphOutlets(n)
      .filter((key) => n[key])
      .map((key) => ({ from: n.id, outlet: key, to: n[key]! })),
  );
  return { nodes, edges };
}
function graphStage() {
  const d = diagram(),
    snapshot = executionSnapshot(p(), ui);
  return `<section class="creator-canvas">${designCoachMarkup(p(),snapshot,ui.run,ui.revisionFrom)}${diagramMarkup(d.nodes, ui.selected, ui.run?.logs.at(-1)?.nodeId ?? ui.run?.cursor ?? null)}<div class="canvas-provenance" aria-label="这套流程中已接入的能力">${capabilityFacts(p(),snapshot).map(f=>`<button class="capability-source source-${f.kind}" data-capability="${f.kind}" ${!f.used?'disabled':''}><span>${icon(f.kind==='knowledge'?'book':f.kind==='workflow'?'tool':f.kind==='human'?'human':'model')}${f.label}</span><b>${h(f.value)}</b><small>${h(f.detail)}</small></button>`).join('')}</div></section>`;
}
function render() {
  dispose();
  const done = stageDone(p()),
    errors = graphProblems(executionSnapshot(p(), ui)?.graph ?? p().graph);
  ui.tracePage = Math.min(ui.tracePage, tracePageCount(ui) - 1);
  root.innerHTML = `<div class="creator-app" data-playing="${ui.playing}"><header class="course-header"><span data-nova-return-host></span><h1><span class="chapter-no">13</span>我的 AI 创作台</h1><span class="creator-project-name">${h(p().title)}</span><span class="header-spacer"></span><div class="header-tools"><button data-action="help">操作说明</button><button data-action="projects">项目与历史</button><button data-action="import">导入</button><button class="primary" data-action="export">${icon("export")}导出作品</button></div></header><nav class="creator-stages" aria-label="创作阶段">${STAGES.map((title, i) => `${i ? '<span class="stage-arrow">⟶</span>' : ""}<button data-stage="${i}" aria-current="${ui.stage === i ? "step" : "false"}"><i class="${done[i] ? "done" : ""}">${done[i] ? "✓" : ""}</i>${title}</button>`).join("")}</nav>
 <div class="creator-learning-strip"><span>核心概念 <b>${STAGE_CONCEPTS[ui.stage].name}</b></span><p>${STAGE_CONCEPTS[ui.stage].question}</p><button data-action="help">操作路线 ↗</button></div><main class="creator-workspace ${ui.stage === 0 ? "stage-brief" : ""}">${ui.stage === 3 ? `<nav class="node-palette" aria-label="添加节点">${(["input", "model", "knowledge", "workflow", "condition", "output", "human"] as NodeKind[]).map((kind) => `<button data-add="${kind}" title="添加${NODE_LABELS[kind]}">${icon(kind === "input" ? "image" : kind === "knowledge" ? "book" : kind === "condition" ? "condition" : kind === "workflow" ? "tool" : kind === "human" ? "human" : kind === "output" ? "play" : "model")}<span>${{ input: "输入", model: "模型", knowledge: "资料", workflow: "工具", condition: "判断", output: "输出", human: "人工" }[kind]}</span></button>`).join("")}<button data-action="templates">${icon("fit")}<span>${executionSnapshot(p(), ui)?"为草稿选起点":"起始方案"}</span></button></nav>` : ""}
 <div class="creator-main">${ui.stage === 0 ? briefStage(p()) : ui.stage === 1 ? dataStage(p(), ui) : ui.stage === 2 ? trainingStage(p(), ui) : ui.stage === 3 ? graphStage() : ui.stage === 4 ? testsStage(p(), ui) : exhibitStage(p(), ui)}</div>
 ${ui.stage !== 0 ? `<aside class="creator-inspector"><nav class="inspector-tabs"><button data-panel="preview" aria-pressed="${ui.panel === "preview"}">${icon("play")}试用</button><button data-panel="node" aria-pressed="${ui.panel === "node"}">节点</button><button data-panel="trace" aria-pressed="${ui.panel === "trace"}">执行记录</button></nav><div class="inspector-body">${ui.panel === "node" ? nodeInspector(p(), ui) : ui.panel === "trace" ? tracePanel(ui) : preview(p(), ui)}</div></aside>` : ""}</main>
 <footer class="creator-footer"><span class="footer-status">${ui.stage === 3 && errors.length ? `待接线：${h(errors[0])}` : ui.busy ? "正在本机计算真实梯度…" : `本机项目 · ${p().models.length} 个模型 · ${p().releases.length} 个冻结版本`}</span><div>${ui.stage === 3 && executionSnapshot(p(), ui) ? `<button class="draft-switch" data-action="edit-draft">编辑当前草稿</button>` : ""}${ui.stage === 3 ? `<button class="timeline-run" data-action="run" ${ui.busy ? "disabled" : ""}>${icon(ui.playing ? "pause" : "play")}${ui.playing ? "暂停运行" : "沿流程试运行"}</button>` : ""}<button data-action="undo" ${!undo.length ? "disabled" : ""}>${icon("undo")}撤回画布修改</button><button data-action="versions">版本与来源</button><button data-action="publish">${icon("check")}冻结版本</button></div></footer>${ui.notice ? `<div class="toast" role="status">${h(ui.notice)}<button data-action="dismiss" aria-label="关闭提示">×</button></div>` : ""}<input id="creator-file" type="file" class="native-file" accept=".json,application/json"><input id="image-file" type="file" class="native-file" accept="image/png,image/jpeg,image/webp"><input id="workflow-file" type="file" class="native-file" accept=".json,application/json"></div>`;
  mountReturn(13);
  if (executionSnapshot(p(), ui))
    root
      .querySelectorAll<HTMLButtonElement>(
        '.node-palette [data-add],[data-action="undo"]',
      )
      .forEach((control) => (control.disabled = true));
  if (ui.busy)
    root
      .querySelectorAll<
        | HTMLInputElement
        | HTMLButtonElement
        | HTMLSelectElement
        | HTMLTextAreaElement
      >("button,input,select,textarea")
      .forEach((control) => {
        if (!["train", "dismiss"].includes(control.dataset.action ?? ""))
          control.disabled = true;
      });
  if (ui.playing)
    root
      .querySelectorAll<
        | HTMLButtonElement
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
      >("button,input,select,textarea")
      .forEach((control) => {
        if (
          !["run", "dismiss"].includes(control.dataset.action ?? "") &&
          !control.dataset.canvas &&
          !["preview", "trace"].includes(control.dataset.panel ?? "") &&
          !control.hasAttribute("data-tech-motion")
        )
          control.disabled = true;
      });
  const img = currentImage(),
    canvas = root.querySelector<HTMLCanvasElement>("#preview-image");
  if (img && canvas) drawImage(canvas, img);
  root
    .querySelectorAll<HTMLCanvasElement>("[data-sample]")
    .forEach((c) =>
      drawImage(
        c,
        assetImage(p().assets.find((a) => a.id === c.dataset.sample)!),
      ),
    );
  if (ui.stage === 3) {
    const d = diagram();
    dispose = bindDiagram(
      root.querySelector(".creator-canvas")!,
      d.nodes,
      d.edges,
      view,
      {
        readonly: ui.playing || !!executionSnapshot(p(), ui),
        active: ui.run?.logs.at(-1)?.nodeId ?? ui.run?.cursor ?? null,
        flowing: ui.playing,
        select(id) {
          if (ui.playing) return;
          ui.selected = id;
          ui.panel = "node";
          render();
        },
        move(id, x, y) {
          if (!moving) {
            graphBeforeMove = structuredClone(p().graph);
            moving = true;
          }
          const n = p().graph.nodes.find((n) => n.id === id)!;
          n.x = x;
          n.y = y;
        },
        commit() {
          if (graphBeforeMove) {
            undo.push(graphBeforeMove);
            if (undo.length > 30) undo.shift();
          }
          moving = false;
          graphBeforeMove = null;
          void save().catch((error) => {
            ui.notice = String(error);
            render();
          });
        },
        connect(from, key, to) {
          void act(() => {
            if (from === to) throw Error("请连接两个不同节点。");
            editGraph((g) => {
              g.nodes.find((n) => n.id === from)![
                key as "next" | "yes" | "no"
              ] = to;
            });
            ui.notice = "连线已保存。试运行时会逐步执行这条路径。";
          });
        },
      },
    );
  }
  if(ui.stage===3&&!executionSnapshot(p(),ui)){const next=designNextStep(p()),focus=next.actions.find(a=>a.kind==='focus')?.value;root.querySelectorAll<HTMLElement>('[data-node-id]').forEach(n=>n.classList.toggle('needs-connection',n.dataset.nodeId===focus));}
}
function help() {
  modal(
    root,
    "从一个想法，到一件可以试用的作品",
    `<div class="guide-columns"><article><span>01—03</span><h3>准备真实能力</h3><p>定义一个具体问题。在第十章采样、核对、分组；在第十一章训练并保存模型。这些成果会沿着同一个项目带到这里。</p></article><article><span>04</span><h3>亲手连成流程</h3><p>从左侧添加节点。拖标题移动；点输出端口，再点输入端口完成接线。空白处拖动平移，滚轮缩放，总览找回全部节点。</p></article><article><span>05—06</span><h3>试用，再改进</h3><p>右侧换图片，沿真实节点逐步运行。可以暂停、继续或单步；刷新后也能从测试记录回看并继续。为结果写下判断，冻结一个可复查版本，再导出完整作品。</p></article></div><div class="guide-boundary"><h3>知道作品真的做了什么</h3><p>图像模型在本机训练；资料节点按类别查找你写的条目；行动节点调用第十二章的模拟工具。这里不会把规则流程包装成大语言模型。人工确认与失败同样会留下记录。</p></div>`,
  );
}
function knowledgeEditor() {
  let index = 0;
  const draft = structuredClone(p().knowledge);
  const d = modal(root, "给作品一份有来源的资料", "");
  const body = d.querySelector<HTMLElement>(".dialog-body")!;
  function draw() {
    const category = p().dataset.classes[index],
      entry = draft.find((k) => k.category === category.id) ?? {
        category: category.id,
        text: "",
        source: "",
      };
    body.innerHTML = `<label class="creator-field">对应类别<select id="knowledge-category">${p()
      .dataset.classes.map(
        (c, i) =>
          `<option value="${i}" ${i === index ? "selected" : ""}>${h(c.name)}</option>`,
      )
      .join(
        "",
      )}</select></label><label class="creator-field">对这一类给出什么建议？<textarea id="knowledge-text" rows="5" maxlength="1200">${h(entry.text)}</textarea></label><label class="creator-field">依据或资料来源<input id="knowledge-source" maxlength="300" value="${h(entry.source)}"></label><p>这是你编辑的明确条目，模型只负责判断类别。空条目会转交人工核对。</p><div class="dialog-actions"><button class="primary" id="save-knowledge">保存全部资料</button></div>`;
    body
      .querySelector("#knowledge-category")!
      .addEventListener("change", (e) => {
        capture();
        index = Number((e.target as HTMLSelectElement).value);
        draw();
      });
    body.querySelector("#save-knowledge")!.addEventListener("click", () => {
      capture();
      void act(() => {
        p().knowledge = draft;
        p().evidence.graphEdits++;
        ui.releaseId = "";
        ui.run = null;
        ui.notice = "资料与来源已保存；已冻结版本保留原条目。";
      });
    });
  }
  function capture() {
    const category = p().dataset.classes[index].id,
      entry = {
        category,
        text: body.querySelector<HTMLTextAreaElement>("#knowledge-text")!.value,
        source:
          body.querySelector<HTMLInputElement>("#knowledge-source")!.value,
      },
      old = draft.findIndex((k) => k.category === category);
    if (old < 0) draft.push(entry);
    else draft[old] = entry;
  }
  draw();
}
async function projects() {
  try {
    const all = await CreatorStore.list();
    let page = 0;
    const d = modal(root, "本机项目与原有成果", ""),
      body = d.querySelector<HTMLElement>(".dialog-body")!;
    function draw() {
      body.innerHTML = `<p>每个项目单独保留。导入会新建一份项目，不会覆盖原项目。</p><table class="compact-table"><thead><tr><th>项目</th><th>更新时间</th><th></th></tr></thead><tbody>${all
        .slice(page * 5, page * 5 + 5)
        .map(
          (item) =>
            `<tr><td>${h(item.title)}${item.id === p().id ? " · 当前" : ""}</td><td>${new Date(item.updatedAt).toLocaleString("zh-CN")}</td><td><button data-open-project="${h(item.id)}">打开</button></td></tr>`,
        )
        .join(
          "",
        )}</tbody></table><div class="page-pager"><button id="projects-prev" ${page === 0 ? "disabled" : ""}>←</button><span>${page + 1}/${Math.max(1, Math.ceil(all.length / 5))}</span><button id="projects-next" ${(page + 1) * 5 >= all.length ? "disabled" : ""}>→</button></div><div class="legacy-results"><h3>已保留的旧版成果</h3><div class="inline-actions">${
        p()
          .legacy.map(
            (entry, i) =>
              `<button data-legacy-download="${i}">原第${entry.chapter}章原始记录</button>${entry.chapter === 13 ? `<button data-legacy-preview="${i}">运行原信息助手</button>` : ""}`,
          )
          .join("") || "<span>没有需要迁移的旧记录。</span>"
      }</div></div><div class="dialog-actions"><button id="reload-current">重新载入当前项目</button><button id="new-project" class="primary">新建项目</button></div>`;
      body.querySelector("#projects-prev")!.addEventListener("click", () => {
        page--;
        draw();
      });
      body.querySelector("#projects-next")!.addEventListener("click", () => {
        page++;
        draw();
      });
      body.querySelector("#new-project")!.addEventListener("click", () => {
        if (ui.busy) {
          ui.notice = "先暂停训练。";
          return;
        }
        void act(async () => {
          await store.create();
          resetView();
          ui.stage = 0;
          ui.notice = "新项目已创建，原项目仍在项目列表中。";
        });
      });
      body
        .querySelector("#reload-current")!
        .addEventListener("click", () => location.reload());
      body.querySelectorAll<HTMLElement>("[data-open-project]").forEach((b) =>
        b.addEventListener("click", () => {
          if (!ui.busy) location.href = chapterURL(13, b.dataset.openProject);
        }),
      );
      body
        .querySelectorAll<HTMLElement>("[data-legacy-download]")
        .forEach((b) =>
          b.addEventListener("click", () => {
            const e = p().legacy[Number(b.dataset.legacyDownload)];
            download(e.raw, `原第${e.chapter}章成果.json`);
          }),
        );
      body
        .querySelectorAll<HTMLElement>("[data-legacy-preview]")
        .forEach((b) =>
          b.addEventListener("click", () =>
            legacyPreview(Number(b.dataset.legacyPreview)),
          ),
        );
    }
    draw();
  } catch (error) {
    ui.notice = String(error);
    render();
  }
}
function legacyPreview(index: number) {
  try {
    const value: unknown = JSON.parse(p().legacy[index].raw);
    validateOld(value);
    const old = value as OldProject;
    const d = modal(
      root,
      "原信息助手 · 保留的旧成果",
      `<p>${h(old.title)} · 使用原版规则／词片段检索引擎，保留原知识条目。</p><label class="creator-field">输入问题<input id="legacy-question" maxlength="500"></label><button id="ask-legacy" class="primary">运行原助手</button><p id="legacy-answer">等待输入。</p>`,
    );
    d.querySelector("#ask-legacy")!.addEventListener("click", () => {
      const result = runAssistant(
        old.releases.at(-1)?.prototype ?? old.draft,
        d.querySelector<HTMLInputElement>("#legacy-question")!.value,
      );
      d.querySelector("#legacy-answer")!.textContent = result.text;
    });
  } catch (error) {
    ui.notice = "旧原稿已保留，但无法用旧版校验器运行：" + String(error);
    render();
  }
}
function versions() {
  let index = p().releases.length - 1;
  const d = modal(root, "版本与来源", ""),
    body = d.querySelector<HTMLElement>(".dialog-body")!;
  function draw() {
    const v = p().releases[index],
      m = p().models.find((m) => m.id === v?.modelId);
    body.innerHTML = v
      ? `<span class="micro-label">冻结 v${v.number} / ${h(new Date(v.createdAt).toLocaleString("zh-CN", { hour12: false }))}</span><h2>${h(v.title)}</h2><p>${h(v.reason)}</p><div class="dialog-grid"><div><h3>模型与资料</h3><p>${versionFacts(m)}</p><p>${v.knowledge.length} 条编辑资料 · ${v.graph.nodes.length} 个节点</p></div><div><h3>运行边界</h3><p>${h(v.brief.boundary)}</p><p>${v.workflow ? `行动预算 ${v.workflow.limits.maxCalls} 次调用、${v.workflow.limits.maxWaterMl} mL 水` : "不调用行动模拟工具"}</p></div></div><p>本版保存模型引用、完整流程、资料与行动配置。继续编辑草稿不会改写它。</p><div class="dialog-actions"><button id="version-prev" ${index <= 0 ? "disabled" : ""}>← 前版</button><button id="version-next" ${index + 1 >= p().releases.length ? "disabled" : ""}>后版 →</button><button id="use-release" class="primary">试用这一版</button></div>`
      : '<div class="empty-state"><h2>尚未冻结版本</h2><p>先定义问题、接通流程并实际试用，再记录一个可复查的版本。</p></div>';
    body.querySelector("#version-prev")?.addEventListener("click", () => {
      index--;
      draw();
    });
    body.querySelector("#version-next")?.addEventListener("click", () => {
      index++;
      draw();
    });
    body.querySelector("#use-release")?.addEventListener("click", () => {
      ui.releaseId = v.id;
      ui.run = null;
      ui.stage = 5;
      ui.panel = "preview";
      render();
    });
  }
  draw();
}
function freeze() {
  const d = modal(
    root,
    "冻结一个可复查的版本",
    `<p>把此刻的模型、流程、资料和行动配置一起保存。之后的草稿修改不会影响本版。</p><label class="creator-field">这一版想解决什么？<textarea id="release-reason" rows="3" maxlength="500" placeholder="例如：加入低输出时的人工核对，避免贸然给出建议。"></textarea></label><div class="dialog-actions"><button id="save-release" class="primary">冻结并用于试用</button></div>`,
  );
  d.querySelector("#save-release")!.addEventListener(
    "click",
    () =>
      void act(() => {
        if (!p().evidence.briefConfirmed)
          throw Error("请先在“定义问题”中确认使用者、用途与边界。");
        const reason =
          d.querySelector<HTMLTextAreaElement>("#release-reason")!.value;
        if (!reason.trim()) throw Error("请写下这一版的改进目的。");
        const release = publishRelease(p(), reason);
        ui.releaseId = release.id;
        ui.run = null;
        ui.stage = 5;
        ui.panel = "preview";
        ui.notice = `版本 ${release.number} 已冻结，右侧现在运行这个版本。`;
      }),
  );
}
function exportPackage() {
  try {
    const raw = encodeCreator(p()),
      blob = new Blob([raw], { type: "application/json" }),
      url = URL.createObjectURL(blob),
      name = `${p().title.replace(/[<>:"/\\|?*]/g, "-")}-完整作品.json`;
    modal(
      root,
      "带走完整的创作项目",
      `<span class="micro-label">${h(p().title)}</span><h2>图片、能力、流程与证据，一起保存。</h2><div class="package-facts"><span><b>${p().assets.length}</b>张资料</span><span><b>${p().models.length}</b>个模型</span><span><b>${p().releases.length}</b>个版本</span><span><b>${p().runs.length}</b>次试用</span></div><p>完整包约 ${(blob.size / 1024).toFixed(1)} KB。在另一台电脑打开本课程，点击创作台“导入”，即可恢复并运行。导入会建立新项目，原项目继续保留。</p><p>已冻结版本与当前草稿都包含在包中；导入时直接恢复权重，不会重新训练模型。</p><div class="dialog-actions"><a class="creator-download-link" href="${h(url)}" download="${h(name)}">${icon("export")}保存完整作品包</a></div>`,
      () => URL.revokeObjectURL(url),
    );
    keepExport(raw);
  } catch (error) {
    ui.notice = String(error);
    render();
  }
}
/** The exported package is also kept as this chapter's artifact, so “我的发现” lists it with its time. */
function keepExport(raw: string) {
  const project = p(),
    name = (project.title || "未命名作品").slice(0, 100);
  void store
    .saveArtifact(13, `${name} · 完整作品包`, raw)
    .catch(() =>
      store.saveArtifact(
        13,
        `${name} · 作品包记录`,
        JSON.stringify({
          schema: "nova-creator-export-note",
          version: 1,
          title: project.title,
          assets: project.assets.length,
          models: project.models.length,
          releases: project.releases.length,
          runs: project.runs.length,
          note: "完整作品包超出本机留存空间，请保存导出的文件。",
        }),
      ),
    )
    .catch(() => undefined);
}
function templates() {
  const d=modal(root,"选择你的创作起点",starterMarkup());
  d.classList.add("studio-starter-dialog");
  d.querySelectorAll<HTMLElement>("[data-template]").forEach(b=>b.addEventListener("click",()=>void act(()=>{
    editGraph(g=>Object.assign(g,startingGraph(b.dataset.template as StartingPoint)));
    ui.stage=3;ui.selected=p().graph.start;ui.panel="node";ui.revisionFrom="";view.fit=true;
  })));
}
function reviseRun(id:string){
  const old=p().runs.find(r=>r.id===id);if(!old||old.status==="running")return;
  pausePlayback();ui.revisionFrom=id;ui.sampleId=old.context.input.sampleId??"";
  ui.uploaded=old.context.input.image?structuredClone(old.context.input.image):null;
  ui.releaseId="";ui.run=null;ui.stage=3;ui.panel="node";
  ui.selected=p().graph.nodes.find(n=>n.kind==="condition")?.id??p().graph.start;
  view.fit=true;ui.notice="";render();
}
function revisionResult(){
  const before=p().runs.find(r=>r.id===ui.revisionFrom),after=ui.run;
  if(!before||!after||before.id===after.id)return;
  const d=modal(root,"这次修改，产生了什么变化？",revisionMarkup(before,after));
  d.classList.add("revision-dialog");
}
function compareTrialHistory(){
  const records=p().runs.filter(r=>r.status!=="running");
  if(records.length<2)return;
  const options=records.map(r=>`<option value="${h(r.id)}">试用 ${p().runs.indexOf(r)+1} · ${statusName(r)} · ${new Date(r.createdAt).toLocaleTimeString('zh-CN')}</option>`).join('');
  const d=modal(root,"从历史记录复查一次改进",`<div class="trial-history-picks"><label class="creator-field">修改前<select id="trial-before">${options}</select></label><label class="creator-field">修改后<select id="trial-after">${options}</select></label><button class="primary" data-compare-trials>显示实际对照</button></div><div class="trial-history-result"></div>`);
  d.classList.add("revision-dialog");
  d.querySelector<HTMLSelectElement>('#trial-before')!.value=records.at(-2)!.id;
  d.querySelector<HTMLSelectElement>('#trial-after')!.value=records.at(-1)!.id;
  d.querySelector('[data-compare-trials]')!.addEventListener('click',()=>{
    const a=records.find(r=>r.id===d.querySelector<HTMLSelectElement>('#trial-before')!.value)!,b=records.find(r=>r.id===d.querySelector<HTMLSelectElement>('#trial-after')!.value)!;
    d.querySelector('.trial-history-result')!.innerHTML=a.id===b.id?'<p role="alert">请选择两条不同的试用记录。</p>':revisionMarkup(a,b);
  });
}
function compareReleases() {
  const options = p()
    .releases.map(
      (v) =>
        `<option value="${h(v.id)}">v${v.number} · ${h(v.reason.slice(0, 30))}</option>`,
    )
    .join("");
  const d = modal(
    root,
    "同一输入，两个冻结版本",
    `<p>使用右侧当前的同一张图片或同一环境任务。两条真实记录都会保存，不用动画代替执行。</p><div class="dialog-grid"><label class="creator-field">版本 A<select id="release-a">${options}</select></label><label class="creator-field">版本 B<select id="release-b">${options}</select></label></div><div id="release-comparison"></div><div class="dialog-actions"><button id="compare-now" class="primary">实际比较</button></div>`,
  );
  d.querySelector<HTMLSelectElement>("#release-b")!.value =
    p().releases.at(-1)!.id;
  d.querySelector("#compare-now")!.addEventListener(
    "click",
    () =>
      void (async () => {
        try {
          const a = d.querySelector<HTMLSelectElement>("#release-a")!.value,
            b = d.querySelector<HTMLSelectElement>("#release-b")!.value;
          if (a === b) throw Error("请选择两个不同的冻结版本。");
          if (p().runs.length > 58)
            throw Error("试用记录容量不足，请先导出后新建项目。");
          const input = ui.uploaded
            ? { image: ui.uploaded, question: "" }
            : { sampleId: ui.sampleId, question: "" };
          const runs = [a, b].map((id) =>
            finishFlow(
              p(),
              startFlow(
                p(),
                input,
                p().releases.find((r) => r.id === id),
              ),
            ),
          );
          p().runs.push(...runs);
          ui.run = runs[1];
          await save();
          d.querySelector("#release-comparison")!.innerHTML =
            `<div class="dialog-grid">${runs.map((r, i) => `<article><h3>${i ? "B" : "A"} · ${statusName(r)}</h3><p>${h(r.message)}</p><small>${r.logs.length} 个实际执行节点</small></article>`).join("")}</div>`;
        } catch (error) {
          d.querySelector("#release-comparison")!.textContent = String(error);
        }
      })(),
  );
}
function startTraining() {
  if (ui.busy) {
    worker?.postMessage({ kind: "stop" });
    return;
  }
  if (!ui.draft || !ui.draftDataset) return;
  const job = beginModel(p(), {
    featureMode: ui.draft.featureMode,
    hidden: ui.draft.hidden,
    activation: ui.draft.activation,
    seed: ui.draft.seed,
    learningRate: ui.draft.learningRate,
    batchSize: ui.draft.batchSize,
  });
  if (JSON.stringify(job.dataset) !== JSON.stringify(ui.draftDataset))
    throw Error("资料已经改变，请重新建立小网络。");
  const original = ui.history.filter((x) => x.step < ui.draft!.steps);
  ui.busy = true;
  ui.trainingSaved = false;
  worker = new Worker(
    new URL("../../../shared/creator/train-worker.ts", import.meta.url),
    { type: "module" },
  );
  worker.onmessage = (event) => {
    const msg = event.data as {
      kind: string;
      model: DenseModel;
      history: LossPoint[];
      message?: string;
    };
    if (msg.kind === "error") {
      ui.notice = msg.message ?? "训练停止";
      ui.busy = false;
      worker?.terminate();
      worker = null;
      render();
      return;
    }
    ui.draft = msg.model;
    ui.history = [...original, ...msg.history];
    if (msg.kind === "done") {
      ui.busy = false;
      worker?.terminate();
      worker = null;
      ui.notice = "真实更新已结束；保存后，这个模型才能被节点调用。";
    }
    render();
  };
  worker.onerror = (event) => {
    ui.busy = false;
    ui.notice = event.message;
    worker?.terminate();
    worker = null;
    render();
  };
  worker.postMessage({
    kind: "train",
    model: ui.draft,
    train: job.train,
    validation: job.validation,
    steps: 100,
  });
  render();
}
root.addEventListener("click", (event) => {
  const b = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!b || b.disabled) return;
  if(b.dataset.coachFocus){ui.selected=b.dataset.coachFocus;ui.panel="node";view.fit=true;render();return;}
  if(b.dataset.coachReview){const run=p().runs.find(r=>r.id===b.dataset.coachReview);if(run){ui.run=run;ui.releaseId=run.releaseId??"";ui.sampleId=run.context.input.sampleId??"";ui.uploaded=run.context.input.image??null;ui.panel="preview";render();}return;}
  if(b.dataset.idea){const idea=CREATIVE_IDEAS.find(i=>i.id===b.dataset.idea);if(idea)void act(()=>{p().title=idea.title;p().brief={audience:idea.audience,need:idea.need,boundary:idea.boundary};});return;}
  if(b.dataset.reviseRun){reviseRun(b.dataset.reviseRun);return;}
  if(b.dataset.capability){const definition=executionSnapshot(p(),ui),graph=definition?.graph??p().graph,node=graph.nodes.find(n=>n.kind===b.dataset.capability);if(node){ui.selected=node.id;ui.panel="node";render();}return;}
  if (b.dataset.stage !== undefined) {
    ui.notice="";
    ui.stage = Number(b.dataset.stage);
    ui.panel = "preview";
    if (ui.stage === 3) view.fit = true;
    if (ui.stage === 3 && preferActionStart()) ui.notice = "作品带着行动方案、还没有模型，已改从“让工具改变环境”起步；可撤回画布修改。";
    if (ui.stage === 5){ui.run=null;ui.releaseId=p().releases.at(-1)?.id??"";}
    render();
    return;
  }
  if (b.dataset.panel) {
    ui.panel = b.dataset.panel as CreatorUI["panel"];
    render();
    return;
  }
  if (b.dataset.add) {
    void act(() => {
      editGraph((g) => {
        if (g.nodes.length >= 32) throw Error("一个流程最多32个节点。");
        const kind = b.dataset.add as NodeKind,
          id = crypto.randomUUID();
        g.nodes.push({
          id,
          kind,
          label: NODE_LABELS[kind],
          x: 160 + (g.nodes.length % 4) * 250,
          y: 180 + Math.floor(g.nodes.length / 4) * 160,
          ...(kind === "condition" ? { threshold: 0.7 } : {}),
          ...(kind === "output" ? { template: "{result}" } : {}),
          ...(kind === "human"
            ? { template: "信息不足，请交给同学核对。" }
            : {}),
          ...(kind === "workflow" ? { mode: "workflow" as const } : {}),
        });
        ui.selected = id;
      });
      ui.panel = "node";
      view.fit = true;
      ui.releaseId = "";
    });
    return;
  }
  if (b.dataset.disconnect) {
    void act(() =>
      editGraph((g) => {
        delete g.nodes.find((n) => n.id === ui.selected)![
          b.dataset.disconnect as "next" | "yes" | "no"
        ];
      }),
    );
    return;
  }
  if (b.dataset.useSample) {
    ui.revisionFrom="";
    ui.sampleId = b.dataset.useSample;
    ui.uploaded = null;
    ui.run = null;
    ui.panel = "preview";
    render();
    return;
  }
  if (b.dataset.viewRun) {
    ui.revisionFrom="";
    ui.run = p().runs.find((r) => r.id === b.dataset.viewRun)!;
    ui.releaseId = ui.run.releaseId ?? "";
    ui.sampleId = ui.run.context.input.sampleId ?? ui.sampleId;
    ui.uploaded = ui.run.context.input.image ?? null;
    ui.panel = "trace";
    ui.tracePage = 0;
    render();
    return;
  }
  if (b.dataset.verdict && ui.run) {
    const run = ui.run,
      verdict = b.dataset.verdict as "pass" | "fail";
    const d = modal(
      root,
      verdict === "pass" ? "记录认可的依据" : "记录需要改进的问题",
      `<p>本次结果：${statusName(run)}。原始输入、完整输出和执行依据均保留在本次记录中。</p><label class="creator-field">你的观察<textarea id="review-note" rows="4" maxlength="1000" placeholder="哪个输入得到了什么结果？下一版要保留或改进什么？">${h(run.reviewNote ?? "")}</textarea></label><div class="dialog-actions"><button class="primary" id="save-verdict">保存判断</button></div>`,
    );
    d.querySelector("#save-verdict")!.addEventListener(
      "click",
      () =>
        void act(() => {
          const note =
            d.querySelector<HTMLTextAreaElement>("#review-note")!.value;
          if (!note.trim()) throw Error("请留下具体观察，便于下一版改进。");
          run.verdict = verdict;
          run.reviewNote = note;
          ui.notice = "";
        }),
    );
    return;
  }
  const action = b.dataset.action;
  if (!action) return;
  if (action === "dismiss") {
    ui.notice = "";
    render();
    return;
  }
  if (action === "edit-draft") {
    pausePlayback();
    ui.run = null;
    ui.releaseId = "";
    ui.panel = "node";
    ui.selected = p().graph.start;
    view.fit = true;
    render();
    return;
  }
  if (action === "help") {
    help();
    return;
  }
  if (action === "knowledge") {
    knowledgeEditor();
    return;
  }
  if (action === "projects") {
    void projects();
    return;
  }
  if (action === "versions") {
    versions();
    return;
  }
  if (action === "publish") {
    freeze();
    return;
  }
  if (action === "export") {
    exportPackage();
    return;
  }
  if(action==="revision-result"){revisionResult();return;}
  if(action==="challenge-boundary"){const last=ui.run??p().runs.filter(r=>r.status!=="running").at(-1);if(last)reviseRun(last.id);else{ui.stage=3;ui.selected=p().graph.nodes.find(n=>n.kind==="condition")?.id??p().graph.start;ui.panel="node";render();}return;}
  if(action==="challenge-new"){const model=p().models.find(m=>m.id===p().activeModelId),item=p().assets.find(a=>p().dataset.bags[a.group]!=="test"&&!p().dataset.excluded.includes(a.id)&&(!model||model.dataset.bags[a.group]!=="train"));if(item){ui.sampleId=item.id;ui.uploaded=null;ui.run=null;ui.releaseId="";ui.revisionFrom="";ui.panel="preview";ui.notice="已选未参与当前模型训练的图片。先预测，再点击试用。";}else ui.notice="当前没有可用的新图片。请回第十章补充验证资料，或导入自选图片。";render();return;}
  if (action === "templates") {
    templates();
    return;
  }
  if(action === "compare-trials"){compareTrialHistory();return;}
  if (action === "compare-releases") {
    compareReleases();
    return;
  }
  if (
    action === "import" ||
    action === "upload-image" ||
    action === "import-workflow"
  ) {
    root
      .querySelector<HTMLInputElement>(
        action === "import"
          ? "#creator-file"
          : action === "upload-image"
            ? "#image-file"
            : "#workflow-file",
      )!
      .click();
    return;
  }
  if (action === "train") {
    try {
      startTraining();
    } catch (error) {
      ui.notice = String(error);
      render();
    }
    return;
  }
  if (action === "run") {
    playFlow();
    return;
  }
  void act(async () => {
    if (action === "confirm-brief") {
      if (!p().title.trim() || Object.values(p().brief).some((v) => !v.trim()))
        throw Error("请把名称、使用者、需求和边界写完整。");
      p().evidence.briefConfirmed++;
      ui.stage = p().models.length||p().workflow ? 3 : 1;
      ui.notice = p().models.length||p().workflow ? "方向已确认。选择起始方案，或从空白搭建。" : "方向已确认。先检查资料，再训练属于自己的模型。";
      if (ui.stage === 3 && preferActionStart())
        ui.notice = "方向已确认。作品带着行动方案、还没有模型，已改从“让工具改变环境”起步。";
    }
    if (action === "new-training") {
      const job = beginModel(p(), {
        featureMode: "color-shape",
        hidden: [6, 4],
        activation: "tanh",
        seed: 7,
        learningRate: 0.05,
        batchSize: 16,
      });
      ui.draft = job.model;
      ui.draftDataset = job.dataset;
      ui.history = [
        {
          step: 0,
          train: evaluateRows(job.model, job.train).loss,
          validation: evaluateRows(job.model, job.validation).loss,
        },
      ];
      ui.trainingSaved = false;
    }
    if (action === "keep-model") {
      if (!ui.draft || !ui.draftDataset) throw Error("请先训练。");
      const version = keepModel(
        p(),
        ui.draft,
        ui.draftDataset,
        ui.history,
        13,
        `创作台模型 ${p().models.length + 1}`,
      );
      ui.trainingSaved = true;
      ui.run = null;
      ui.releaseId = "";
      ui.notice = `${version.name} 已保存，现在可由模型节点实际调用。`;
    }
    if (action === "step") {
      pausePlayback();
      if (!ui.run || ui.run.status !== "running") addRun();
      advanceFlow(p(), ui.run!);
      ui.tracePage = tracePageCount(ui) - 1;
      ui.panel = "trace";
    }
    if (action === "undo") {
      const old = undo.pop();
      if (old) {
        p().graph = old;
        view.fit = true;
        ui.selected = old.start;
      }
    }
    if (action === "remove-node") {
      editGraph((g) => {
        if (g.start === ui.selected)
          throw Error("先为流程指定另一个输入起点。");
        g.nodes = g.nodes.filter((n) => n.id !== ui.selected);
        for (const n of g.nodes)
          for (const outlet of graphOutlets(n))
            if (n[outlet] === ui.selected) delete n[outlet];
      });
      ui.selected = p().graph.start;
    }
    if (action === "set-start")
      editGraph((g) => {
        g.start = ui.selected;
      });
    if (["to10", "to11", "to12"].includes(action)) {
      if (ui.busy || (ui.draft?.steps && !ui.trainingSaved))
        throw Error("请先暂停并保存当前训练草稿，再进入其他章节。");
      await save();
      location.href = chapterURL(Number(action.slice(2)), p().id);
    }
    if (action === "result-prev") ui.resultPage--;
    if (action === "result-next") ui.resultPage++;
    if (action === "story-prev") ui.storyPage--;
    if (action === "story-next") ui.storyPage++;
    if (action === "trace-prev") ui.tracePage--;
    if (action === "trace-next") ui.tracePage++;
    if (action === "runs-prev") ui.runPage--;
    if (action === "runs-next") ui.runPage++;
    if (action === "data-prev") ui.dataPage--;
    if (action === "data-next") ui.dataPage++;
  });
});
root.addEventListener("change", (event) => {
  const input = event.target as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement;
  if (input.id === "image-file") {
    const file = (input as HTMLInputElement).files?.[0];
    if (file)
      void readImage(file)
        .then((image) => {
          ui.revisionFrom="";
          ui.uploaded = image;
          ui.run = null;
          ui.panel = "preview";
          render();
        })
        .catch((error) => {
          ui.notice = String(error);
          render();
        });
    return;
  }
  if (input.id === "creator-file" || input.id === "workflow-file") {
    const file = (input as HTMLInputElement).files?.[0];
    if (file)
      void act(async () => {
        if (ui.busy) throw Error("先暂停训练。");
        if (file.size > 16_000_000) throw Error("文件超过16MB。");
        const raw = await file.text();
        if (input.id === "creator-file") {
          await store.import(raw);
          resetView();
          ui.stage = 3;
          ui.notice = "作品已作为新项目导入，原项目保留在项目列表。";
        } else {
          const value: unknown = JSON.parse(raw),
            checked = validateArtifact(value);
          if (!checked.ok) throw Error(checked.errors[0]);
          p().workflow = checked.artifact;
          ui.run = null;
          ui.releaseId = "";
          p().evidence.workflowShared++;
          ui.notice = "已接入原生行动方案；添加行动节点即可实际调用。";
        }
      });
    return;
  }
  if (input.id === "preview-sample") {
    ui.revisionFrom="";
    ui.sampleId = input.value;
    ui.uploaded = null;
    ui.run = null;
    render();
    return;
  }
  if (input.id === "run-release") {
    ui.revisionFrom="";
    ui.releaseId = input.value;
    ui.run = null;
    view.fit = true;
    render();
    return;
  }
  if (
    input.dataset.brief ||
    [
      "project-title",
      "active-model",
      "node-label",
      "node-threshold",
      "node-template",
      "node-mode",
    ].includes(input.id)
  )
    void act(() => {
      if (input.dataset.brief)
        p().brief[input.dataset.brief as "audience" | "need" | "boundary"] =
          input.value;
      if (input.id === "project-title") p().title = input.value;
      if (input.id === "active-model") {
        p().activeModelId = input.value || null;
        ui.run = null;
        ui.releaseId = "";
        p().evidence.graphEdits++;
      }
      if (input.id.startsWith("node-"))
        editGraph((g) => {
          const n = g.nodes.find((n) => n.id === ui.selected)!;
          if (input.id === "node-label") n.label = input.value;
          if (input.id === "node-threshold") n.threshold = Number(input.value);
          if (input.id === "node-template") n.template = input.value;
          if (input.id === "node-mode")
            n.mode = input.value as "workflow" | "planner";
        });
    });
});
root.innerHTML = '<div class="creator-loading">正在打开你的 AI 创作台…</div>';
CreatorStore.open()
  .then((value) => {
    store = value;
    resetView();
    ui.stage = p().evidence.briefConfirmed > 0 ? 3 : 0;
    if (ui.stage === 3 && preferActionStart()) ui.notice = "作品带着行动方案、还没有模型，已改从“让工具改变环境”起步；可撤回画布修改。";
    render();
    publishProgress(p(), 13);
  })
  .catch((error) => {
    root.innerHTML = `<div class="creator-loading"><h1>创作记录未能打开</h1><p>${h(error instanceof Error ? error.message : error)}</p><a href="../../courses/?chapter=13">返回奇点</a><button onclick="location.reload()">重新载入</button></div>`;
  });
window.addEventListener("pagehide", () => {
  pausePlayback();
  worker?.terminate();
  dispose();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && ui.playing) {
    pausePlayback();
    render();
  }
});
