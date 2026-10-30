import {capabilityFacts} from "./creator-capabilities.ts";
import { h, icon } from "../../../shared/creator/dom.ts";
import { splitAssets, activeAssets } from "../../../shared/creator/data.ts";
import { networkSVG, lossSVG } from "../../../shared/creator/network-view.ts";
import { numericRows } from "../../../shared/creator/data.ts";
import { NODE_LABELS, graphOutlets } from "../../../shared/creator/flow.ts";
import type {
  CreatorProject,
  FlowRun,
  ModelVersion,
  DenseModel,
  LossPoint,
  Dataset,
  PixelBuffer,
  FlowDefinition,
} from "../../../shared/creator/types.ts";
import { textPages } from "./reading.ts";

export interface CreatorUI {
  stage: number;
  panel: "preview" | "node" | "trace";
  selected: string;
  sampleId: string;
  uploaded: PixelBuffer | null;
  releaseId: string;
  run: FlowRun | null;
  tracePage: number;
  resultPage: number;
  runPage: number;
  dataPage: number;
  storyPage: number;
  busy: boolean;
  playing: boolean;
  revisionFrom: string;
  draft: DenseModel | null;
  draftDataset: Dataset | null;
  history: LossPoint[];
  trainingSaved: boolean;
  notice: string;
}
export function executionSnapshot(
  p: CreatorProject,
  s: Pick<CreatorUI, "run" | "releaseId">,
): FlowDefinition | null {
  return (
    s.run?.snapshot ?? p.releases.find((r) => r.id === s.releaseId) ?? null
  );
}
export const STAGES = ["定义问题", "数据", "训练", "编排", "测试", "展示"];
export const statusName = (run: FlowRun) =>
  ({
    running: "尚未结束",
    complete: "已输出",
    human: "请人核对",
    error: "执行停止",
  })[run.status];
export const verdictName = (run: FlowRun) =>
  run.verdict === "pass"
    ? "本人认可"
    : run.verdict === "fail"
      ? "需要改进"
      : "待验收";
export function stageDone(p: CreatorProject) {
  return [
    p.evidence.briefConfirmed > 0,
    p.evidence.labelChecks > 0,
    p.models.length > 0,
    p.evidence.graphEdits > 0,
    p.runs.some((r) => r.verdict === "pass" || r.verdict === "fail"),
    p.releases.length > 0,
  ];
}
export function modelOptions(p: CreatorProject, id = p.activeModelId) {
  return (
    '<option value="">尚未选择</option>' +
    p.models
      .map(
        (m) =>
          `<option value="${h(m.id)}" ${m.id === id ? "selected" : ""}>${h(m.name)} · ${m.model.steps}次更新</option>`,
      )
      .join("")
  );
}
export function preview(p: CreatorProject, s: CreatorUI) {
  const snapshot = executionSnapshot(p, s),
    model = p.models.find(
      (m) => m.id === (snapshot ? snapshot.modelId : p.activeModelId),
    ),
    items = [...splitAssets(p, "validation"), ...splitAssets(p, "train")],
    result = s.run;
  const graph = snapshot?.graph ?? p.graph,
    usesModel = graph.nodes.some((n) => n.kind === "model"),
    workflow = snapshot ? snapshot.workflow : p.workflow?.payload.config;
  const resultText =
    (result?.message ||
      (result?.status === "running"
        ? `${s.playing ? "已执行" : "已暂停在"}：${result.logs.at(-1)?.label ?? "接收输入"}。\n下一步：${graph.nodes.find((n) => n.id === result.cursor)?.label ?? "核验结果"}。`
        : "连好流程，观察作品怎样从输入走向结果。")) +
    (result?.context.source ? "\n依据：" + result.context.source : "");
  // display only: the stored workflow summary joins "…达成。" and "；实际调用"
  const resultPages = textPages(resultText.replaceAll("。；", "；"), 19, 3);
  s.resultPage = Math.min(s.resultPage, resultPages.length - 1);
  return `<div class="preview-heading"><h2>${s.stage === 5 ? "欢迎试用我的作品" : "给作品一次真实输入"}</h2></div><label class="creator-field">运行版本<select id="run-release"><option value="">当前草稿</option>${p.releases.map((r) => `<option value="${h(r.id)}" ${s.releaseId === r.id ? "selected" : ""}>冻结 v${r.number} · ${h(r.reason.slice(0, 24))}</option>`).join("")}</select></label>
 ${
   usesModel
     ? `<div class="preview-input"><canvas id="preview-image" aria-label="本次试用图像"></canvas><div><span class="micro-label">${s.uploaded ? "自选图片" : "课程图片"}</span><button data-action="upload-image">${icon("image")}换一张图片</button><small>图像只在本机处理<br>不上传到服务器</small></div></div>
 <label class="creator-field compact-field">已有样本<select id="preview-sample">${items.map((a, i) => `<option value="${h(a.id)}" ${a.id === s.sampleId ? "selected" : ""}>${i + 1} · ${h(p.dataset.classes.find((c) => c.id === p.dataset.labels[a.id])?.name)} · ${p.dataset.bags[a.group] === "train" ? "训练中见过" : "验证资料"}</option>`).join("")}</select></label>
 <div class="prediction-bars">${model ? model.model.classes.map((c, i) => `<div><span>${h(c.name)}</span><i><b style="width:${(result?.context.probabilities?.[i] ?? 0) * 100}%"></b></i><em>${result?.context.probabilities?.[i] !== undefined ? (result.context.probabilities[i] * 100).toFixed(1) + "%" : "—"}</em></div>`).join("") : "<p>还没有已保存模型。可在训练页先完成一次训练。</p>"}</div>
 <p class="micro-note">模型输出不等于正确率；教学图样不能代表真实照片。</p>`
     : `<div class="workflow-preview"><h3>运行这套行动方案</h3>${workflow ? `<div><span>初始湿度</span><b>${workflow.initial.moisture}%</b></div><div><span>初始温度</span><b>${workflow.initial.temperature}°C</b></div><div><span>调用预算</span><b>${workflow.limits.maxCalls} 次</b></div><div><span>用水预算</span><b>${workflow.limits.maxWaterMl} mL</b></div><p>目标：湿度 ${workflow.goal.moistureMin}—${workflow.goal.moistureMax}% ，温度 ${workflow.goal.temperatureMin}—${workflow.goal.temperatureMax}°C。只有实际读取和执行工具后，才会产生结果。</p>` : "<p>请先从第十二章接入可运行的行动方案。</p>"}<button data-action="to12">修改环境与行动方案 ↗</button></div>`
 }
 <div class="preview-result result-${result?.status ?? "waiting"}"><span>${result ? (result.status === "running" ? (s.playing ? "逐步执行中" : "已暂停") : statusName(result)) : "等待试用"}</span><p>${h(resultPages[s.resultPage])}</p>${resultPages.length > 1 ? `<div class="page-pager"><button data-action="result-prev" ${s.resultPage === 0 ? "disabled" : ""}>←</button><span>${s.resultPage + 1}/${resultPages.length}</span><button data-action="result-next" ${s.resultPage + 1 >= resultPages.length ? "disabled" : ""}>→</button></div>` : ""}</div>
 <div class="preview-controls"><button class="primary" data-action="run" ${s.busy ? "disabled" : ""}>${icon(s.playing ? "pause" : "play")}${s.playing ? "暂停运行" : result?.status === "running" ? "继续运行" : s.revisionFrom ? "用同一输入复试" : "完整试用"}</button><button data-action="step" ${s.busy ? "disabled" : ""}>单步调试</button></div>${result && result.status !== "running" ? `<div class="review-buttons"><button data-verdict="pass" ${result.verdict === "pass" ? 'aria-pressed="true"' : ""}>${icon("check")}认可结果</button><button data-verdict="fail" ${result.verdict === "fail" ? 'aria-pressed="true"' : ""}>报告问题</button></div><div class="revision-actions"><button data-revise-run="${h(result.id)}">${icon("undo")}修改后再试同一输入</button>${s.revisionFrom && s.revisionFrom!==result.id ? '<button data-action="revision-result">查看前后对照 ↗</button>' : ""}</div>` : ""}`;
}
export function nodeInspector(p: CreatorProject, s: CreatorUI) {
  const snapshot = executionSnapshot(p, s),
    graph = snapshot?.graph ?? p.graph,
    n = graph.nodes.find((n) => n.id === s.selected);
  if (!n) return '<div class="empty-state">点击节点标题，调整它的作用。</div>';
  if (snapshot) {
    const model = p.models.find((m) => m.id === snapshot.modelId);
    return `<span class="micro-label">${s.run ? "本次运行快照" : "冻结版本快照"} · 只读</span><h2>${h(n.label)}</h2><p>${h(NODE_LABELS[n.kind])}</p>${n.kind === "model" ? `<p>${h(model?.name ?? "尚未接入模型")}<br>${model ? `${model.model.steps}次真实更新 · 训练资料第${model.dataset.revision}版` : ""}</p>` : ""}${n.kind === "condition" ? `<div class="snapshot-parameter">阈值 <strong>${((n.threshold ?? 0.7) * 100).toFixed(0)}%</strong></div>` : ""}${n.kind === "knowledge" ? `<p>本快照保留 ${snapshot.knowledge.length} 条资料。实际命中条目与来源可在执行记录中查看。</p>` : ""}${n.kind === "workflow" ? `<p>${n.mode === "planner" ? "有界状态搜索" : "固定工作流"}${snapshot.workflow ? ` · ${snapshot.workflow.limits.maxCalls}次调用上限 / ${snapshot.workflow.limits.maxWaterMl}mL用水上限` : " · 尚未接入"}</p>` : ""}${n.template ? `<label class="creator-field">本版呈现模板<textarea readonly rows="3">${h(n.template)}</textarea></label>` : ""}<div class="inspector-connections">${graphOutlets(
      n,
    )
      .map(
        (key) =>
          `<div>${key === "next" ? "继续" : key === "yes" ? "是" : "否"} → ${h(graph.nodes.find((t) => t.id === n[key])?.label ?? "未连接")}</div>`,
      )
      .join(
        "",
      )}</div><p class="micro-note">画布呈现本次实际使用的参数和连线。修改创作方向时，切回当前草稿。</p><button data-action="edit-draft">切回草稿编辑</button>`;
  }
  return `<span class="micro-label">${h(NODE_LABELS[n.kind])}</span><h2>配置这一步</h2><label class="creator-field">显示名称<input id="node-label" maxlength="80" value="${h(n.label)}"></label>${n.kind === "model" ? `<label class="creator-field">真实模型版本<select id="active-model">${modelOptions(p)}</select></label><p class="micro-note">权重已冻结，修改资料不会悄悄改写这个模型。需要改变能力时，回到训练阶段。</p>` : ""}${n.kind === "condition" ? `<label class="creator-field">最低模型输出 <strong>${((n.threshold ?? 0.7) * 100).toFixed(0)}%</strong><input id="node-threshold" type="range" min="0" max="1" step=".05" value="${n.threshold ?? 0.7}"></label><p>低于阈值走“否”。提高阈值会更谨慎，也会增加人工核对。</p>` : ""}${n.kind === "knowledge" ? `<p>按模型给出的类别查找你写的资料；没有资料时，请人核对。</p><button data-action="knowledge">${icon("book")}编辑资料与来源</button>` : ""}${n.kind === "workflow" ? `<label class="creator-field">行动方式<select id="node-mode"><option value="workflow" ${n.mode !== "planner" ? "selected" : ""}>我的固定工作流</option><option value="planner" ${n.mode === "planner" ? "selected" : ""}>有界状态搜索规划器</option></select></label><p class="micro-note">${p.workflow ? "已接入第十二章的原生工具、许可和预算。" : "还没有行动方案，请在第十二章完成并交给创作台。"}</p><button data-action="to12">打开行动编排台 ↗</button><button data-action="import-workflow">导入行动作品包</button>` : ""}${n.kind === "output" || n.kind === "human" ? `<label class="creator-field">呈现内容<textarea id="node-template" maxlength="1000" rows="4">${h(n.template ?? "")}</textarea></label><p class="micro-note">{result} 代入真实资料或执行回执；{label} 代入模型给出的类别。</p>` : ""}${n.kind === "input" ? "<p>接收一张图片，或开始执行已配置的环境任务。输入本身不会产生判断。</p>" : ""}<div class="inspector-connections">${graphOutlets(
    n,
  )
    .map(
      (key) =>
        `<div><span>${key === "next" ? "继续" : key === "yes" ? "是" : "否"} → ${h(p.graph.nodes.find((t) => t.id === n[key])?.label ?? "未连接")}</span><button data-disconnect="${key}">断开</button></div>`,
    )
    .join(
      "",
    )}</div><div class="inline-actions">${n.kind === "input" ? '<button data-action="set-start">设为起点</button>' : ""}<button data-action="remove-node" ${p.graph.start === n.id ? "disabled" : ""}>移除节点</button></div><p class="micro-note">点输出圆点，再点目标输入圆点；流程不完整时会说明缺少哪一段。</p>`;
}
function traceChunks(s: CreatorUI) {
  return (s.run?.logs ?? []).flatMap((log, index) =>
    textPages(log.summary, 17, 4).map((summary, part) => ({
      ...log,
      summary,
      index,
      part,
    })),
  );
}
export const tracePageCount = (s: CreatorUI) =>
  Math.max(1, Math.ceil(traceChunks(s).length / 3));
export function tracePanel(s: CreatorUI) {
  const logs = traceChunks(s),
    pages = tracePageCount(s),
    page = Math.min(s.tracePage, pages - 1);
  return `<h2>这次实际发生了什么</h2>${
    logs.length
      ? `<div class="trace-steps">${logs
          .slice(page * 3, page * 3 + 3)
          .map(
            (log) =>
              `<article><span>${String(log.index + 1).padStart(2, "0")}</span><div><h3>${h(log.label)}${log.part ? " · 续" : ""}</h3><p>${h(log.summary)}</p></div></article>`,
          )
          .join(
            "",
          )}</div><div class="page-pager"><button data-action="trace-prev" ${page === 0 ? "disabled" : ""}>←</button><span>${page + 1} / ${pages}</span><button data-action="trace-next" ${page + 1 >= pages ? "disabled" : ""}>→</button></div>`
      : "<p>单步或完整试用后，这里显示真实模型计算、分支选择、资料来源和工具回执。</p>"
  }${s.run ? `<div class="trace-end"><b>${statusName(s.run)}</b><p>完整输出与人的判断保留在本次记录中。</p><button data-panel="preview">查看完整结果</button></div>` : ""}`;
}
export {briefStage} from "./studio-view.ts";
export function dataStage(p: CreatorProject, s: CreatorUI) {
  const items = activeAssets(p).filter(
      (a) => p.dataset.bags[a.group] !== "test",
    ),
    pages = Math.max(1, Math.ceil(items.length / 12));
  // The greenhouse route reads the environment and acts on it; image data stays available but is not its building block.
  const actionRoute = Boolean(p.workflow) && !p.graph.nodes.some((n) => n.kind === "model");
  return `<section class="data-page${actionRoute ? " is-optional" : ""}"><div class="editorial-title"><h2>作品的第一块积木，<br>是你整理过的资料。</h2><p>当前项目与第十章共用同一份数据，封存测试图片不会出现在这里。</p>${actionRoute ? '<p class="route-note">温室照护这条路线不需要图像资料：作品从环境读数出发，由行动方案去改变环境。下面的图片留给“校园借物助手”这类图像路线。</p>' : ""}</div><div class="data-contact-sheet">${items
    .slice(s.dataPage * 12, s.dataPage * 12 + 12)
    .map(
      (a) =>
        `<button class="contact-frame" data-use-sample="${h(a.id)}"><canvas data-sample="${h(a.id)}"></canvas><span>${h(p.dataset.classes.find((c) => c.id === p.dataset.labels[a.id])?.name)}</span><small>${p.dataset.bags[a.group] === "train" ? "训练" : "验证"} · ${p.dataset.reviewed.includes(a.id) ? "已核对" : "待核对"}</small></button>`,
    )
    .join(
      "",
    )}</div><div class="data-summary"><div class="page-pager"><button data-action="data-prev" ${s.dataPage === 0 ? "disabled" : ""}>←</button><span>${s.dataPage + 1} / ${pages}</span><button data-action="data-next" ${s.dataPage + 1 >= pages ? "disabled" : ""}>→</button></div><span>${splitAssets(p, "train").length} 训练 / ${splitAssets(p, "validation").length} 验证 / ${splitAssets(p, "test").length} 封存</span><button class="primary" data-action="to10">${icon("data")}回检视台采样、核对与分组</button></div></section>`;
}
export function trainingStage(p: CreatorProject, s: CreatorUI) {
  const saved = p.models.find((m) => m.id === p.activeModelId),
    model = s.draft ?? saved?.model,
    history = s.draft ? s.history : (saved?.history ?? []),
    dataset = s.draftDataset ?? saved?.dataset;
  let visual = "";
  if (model && dataset) {
    const row =
      numericRows(p, model, "validation", dataset)[0] ??
      numericRows(p, model, "train", dataset)[0];
    if (row) visual = networkSVG(model, row.x, [0, 0]);
  }
  return `<section class="creator-training"><div class="training-heading"><div class="editorial-title"><h2>让资料里的规律，成为可调用的能力。</h2></div><label class="creator-field">用于作品的已保存模型<select id="active-model" ${s.busy ? "disabled" : ""}>${modelOptions(p)}</select></label></div><div class="training-stage-body"><div class="training-network">${visual || `<div class="empty-state">${icon("model")}<h2>你的模型还没有开始学习</h2><p>读取当前训练集，建立 26 → 6 → 4 → 类别数的小型网络。可在第十一章进一步拆解每个计算。</p></div>`}</div><aside class="training-notes"><span class="micro-label">真实训练 / 本机完成</span><h3>${model ? `${model.hidden.join(" → ") || "线性"} → ${model.classes.length} 类` : "先建立随机起点"}</h3><p>标准化只取训练集。验证集用于检查，封存集留到模型冻结之后。</p><div class="training-stat"><b>${model?.steps ?? 0}</b><span>次实际参数更新</span></div><button data-action="new-training" ${s.busy ? "disabled" : ""}>重新建立小网络</button><button class="primary" data-action="train" ${!s.draft ? "disabled" : ""}>${icon(s.busy ? "pause" : "play")}${s.busy ? "暂停训练" : "训练 100 次"}</button><button data-action="keep-model" ${s.busy || !s.draft?.steps || s.trainingSaved ? "disabled" : ""}>${icon("model")}保存为可调用模型</button><button class="quiet" data-action="to11" ${s.busy ? "disabled" : ""}>去网络解剖台深入调整 ↗</button></aside></div><div class="creator-loss"><span>交叉熵损失<br><small>蓝：训练 · 金：验证</small></span>${lossSVG(history)}<p>${s.draft && !s.trainingSaved ? "训练草稿尚未保存到作品。" : saved ? `${h(saved.name)} · 验证命中 ${saved.validation.correct}/${saved.validation.total}。这只代表这批资料。` : "没有预填成绩。"}</p></div></section>`;
}
export function testsStage(p: CreatorProject, s: CreatorUI) {
  const runs = [...p.runs].reverse(),
    pages = Math.max(1, Math.ceil(runs.length / 3));
  return `<section class="tests-page"><div class="editorial-title"><h2>把“能运行”，变成“值得使用”。</h2><p>换输入、调边界、查看失败。记录自己的判断，也保留完整的运行依据。</p></div><div class="test-challenges"><button data-action="challenge-new"><span>01 / 换个输入</span><b>它见过这张图吗？</b><small>选一张未参与当前模型训练的图</small></button><button data-action="challenge-boundary"><span>02 / 改个决定</span><b>什么时候应该请人？</b><small>调整阈值，再用同一输入复试</small></button><button data-action="upload-image"><span>03 / 走出样例</span><b>试试你自己的图片</b><small>观察新输入，不预设它一定成功</small></button></div><div class="test-stats"><div><b>${p.runs.length}</b><span>真实试用</span></div><div><b>${p.runs.filter((r) => r.verdict === "pass").length}</b><span>本人认可</span></div><div><b>${p.runs.filter((r) => r.verdict === "fail").length}</b><span>需要改进</span></div><div><b>${p.runs.filter((r) => r.verdict === "unreviewed" || !r.verdict).length}</b><span>尚未验收</span></div></div><table class="run-table"><thead><tr><th>输入 / 版本</th><th>执行结果</th><th>人的判断</th><th></th></tr></thead><tbody>${
    runs
      .slice(s.runPage * 3, s.runPage * 3 + 3)
      .map(
        (r) =>
          `<tr><td>试用 ${p.runs.indexOf(r)+1} · ${r.context.input.image ? "自选图片" : r.context.input.sampleId ? "课程图片" : "环境任务"}<small>${r.releaseId ? `冻结 v${p.releases.find((v) => v.id === r.releaseId)?.number}` : "草稿快照"} · ${new Date(r.createdAt).toLocaleTimeString("zh-CN")}</small></td><td><span class="run-state state-${r.status}">${statusName(r)}</span></td><td>${verdictName(r)}${r.reviewNote?`<small class="review-excerpt" title="${h(r.reviewNote)}">${h(r.reviewNote)}</small>`:""}</td><td><button data-view-run="${h(r.id)}">回看</button><button data-revise-run="${h(r.id)}" ${r.status==="running"?"disabled":""}>修改并复试</button></td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="4">还没有试用记录。在右侧给作品一个输入。</td></tr>'
  }</tbody></table><div class="test-bottom"><div class="page-pager"><button data-action="runs-prev" ${s.runPage === 0 ? "disabled" : ""}>←</button><span>${s.runPage + 1} / ${pages}</span><button data-action="runs-next" ${s.runPage + 1 >= pages ? "disabled" : ""}>→</button></div><div class="inline-actions"><button data-action="compare-trials" ${p.runs.filter(r=>r.status!=="running").length<2?"disabled":""}>比较两次试用</button><button data-action="compare-releases" ${p.releases.length < 2 ? "disabled" : ""}>比较冻结版本</button></div></div><p class="micro-note">这些是本机开发与自评记录，不代表独立同伴人数或总体准确率。最多保存60次试用，达到容量后先导出或新建项目。</p></section>`;
}
export function exhibitStage(p: CreatorProject, s: CreatorUI) {
  const release =
      p.releases.find((r) => r.id === s.releaseId) ?? p.releases.at(-1),
    model = p.models.find((m) => m.id === (release ? release.modelId : p.activeModelId)),
    workflow = release ? release.workflow : p.workflow;
  const brief = release?.brief ?? p.brief,
    parts = {
      need: textPages(brief.need, 32, 3),
      audience: textPages(brief.audience, 17, 3),
      boundary: textPages(brief.boundary, 17, 4),
    },
    pages = Math.max(...Object.values(parts).map((p) => p.length));
  s.storyPage = Math.min(s.storyPage, pages - 1);
  const part = (key: keyof typeof parts) =>
    parts[key][Math.min(s.storyPage, parts[key].length - 1)];
  return `<section class="exhibit-page"><div class="exhibit-kicker"><span>奇点 / 我的毕业作品</span></div><div class="exhibit-hero"><span class="micro-label">${release ? `已冻结版本 ${release.number}` : "准备你的第一个版本"}</span><h2 title="${h(release?.title ?? p.title)}">${h(release?.title ?? p.title)}</h2><p>${h(part("need"))}</p><div class="system-passport"><span>作品护照</span><strong>${release?`V${String(release.number).padStart(2,"0")}`:"草稿"}</strong>${capabilityFacts(p,release??null).filter(f=>f.used).map(f=>`<div><span>${f.label}</span><b>${h(f.value)}</b></div>`).join("")}<small>${release?p.runs.filter(r=>r.releaseId===release.id).length:p.runs.length} 次${release?"本冻结版本的":"草稿"}实际试用</small></div></div><div class="exhibit-facts"><article><span>为谁而做</span><h3>${h(part("audience"))}</h3></article><article><span>能力来源</span><h3>${model ? h(model.name) : workflow ? "我的行动工作流" : "尚未接入能力"}</h3><p>${model ? `${model.training.total} 个训练样本 · ${model.model.steps} 次参数更新` : workflow ? "通过流程调用明确的工具，核验实际结果。" : "回到编排，接入一个模型或工具。"}</p></article><article><span>请人接手的边界</span><p>${h(part("boundary"))}</p></article></div>${pages > 1 ? `<div class="page-pager"><button data-action="story-prev" ${s.storyPage === 0 ? "disabled" : ""}>←</button><span>说明 ${s.storyPage + 1} / ${pages}</span><button data-action="story-next" ${s.storyPage + 1 >= pages ? "disabled" : ""}>→</button></div>` : ""}<div class="exhibit-actions"><button class="primary" data-action="publish">${icon("check")}冻结一个可复查版本</button><button data-stage="4">查看我的试用记录</button><button data-action="export">${icon("export")}导出完整作品包</button><button data-action="versions">版本与来源</button></div><p class="micro-note">完整包包含图像、模型权重、流程、资料、版本和实际记录；可在另一台电脑的本课程中导入并运行。全程本机，不需要账号。</p></section>`;
}
export function versionFacts(m: ModelVersion | undefined) {
  return m
    ? `${h(m.name)} · ${m.model.mean.length}维 → ${m.model.hidden.join(" → ") || "无隐藏层"} → ${m.model.classes.length}类；训练 ${m.training.correct}/${m.training.total}，验证 ${m.validation.correct}/${m.validation.total}`
    : "不调用分类模型";
}
