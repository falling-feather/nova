import {mountStepProbe,type probeStep} from "./step-probe.ts";
import {readSample,explainUpdate,type UpdateExplanation} from "./learning-evidence.ts";
import "../../../shared/linkage/course-links.js";
import "../../../shared/creator/base.css";
import "./lab.css";
import "./inquiry.css";
import { installTechExperience } from "../../../shared/creator/tech.ts";
import {
  CreatorStore,
  publishProgress,
  chapterURL,
} from "../../../shared/creator/store.ts";
import {
  assetImage,
  splitAssets,
  numericRows,
  datasetFingerprint,
  datasetIssues,
} from "../../../shared/creator/data.ts";
import {
  beginModel,
  keepModel,
  compareModels,
  encodeCreator,
  openTest,
} from "../../../shared/creator/project.ts";
import {
  forwardDense,
  denseGradients,
  applyGradient,
  evaluateRows,
} from "../../../shared/creator/model.ts";
import {
  networkSVG,
  lossSVG,
  featureName,
} from "../../../shared/creator/network-view.ts";
import {
  h,
  icon,
  drawImage,
  mountReturn,
  modal,
  download,
} from "../../../shared/creator/dom.ts";
import type {
  Dataset,
  DenseModel,
  Gradient,
  LossPoint,
  NumericRow,
} from "../../../shared/creator/types.ts";

const root = document.querySelector<HTMLElement>("#app")!;
installTechExperience(root, 11);
root.innerHTML = '<div class="network-loading">正在打开网络解剖台…</div>';
let store: CreatorStore,
  draft: DenseModel,
  dataset: Dataset,
  history: LossPoint[] = [],
  selected: [number, number] = [0, 0],
  sampleId = "",
  gradient: Gradient | null = null,
  phase = "forward",
  parameterPage = 0,
  busy = false,
  notice = "",
  savedSignature = "";
let worker: Worker | null = null;
let lastUpdate:UpdateExplanation|null=null;
let showWeights=false;
let probeOpen=false;
let probeReadback:{steps:number;sampleId:string;reading:ReturnType<typeof probeStep>}|null=null;
const p = () => store.project,
  signature = () => JSON.stringify([draft, datasetFingerprint(dataset)]);
// Version pickers name the structure and update count, so a comparison is readable before it runs.
const modelTag = (m: { name: string; model: { hidden: number[]; steps: number } }) =>
  `${m.name} · ${m.model.hidden.length ? `隐藏层 ${m.model.hidden.join("-")}` : "线性"} · ${m.model.steps}次`;
const rows = (split: "train" | "validation") =>
  numericRows(p(), draft, split, dataset);
const sample = () =>
  p().assets.find((a) => a.id === sampleId) ??
  splitAssets(p(), "train", dataset)[0];
const currentRow = (): NumericRow => {
  const all = [...rows("train"), ...rows("validation")];
  return all.find((r) => r.id === sampleId) ?? all[0];
};
const save = async () => {
  await store.save();
  publishProgress(p(), 11);
};
function initialize() {
  probeReadback=null;
  lastUpdate=null;
  const existing = p().models.find((m) => m.id === p().activeModelId);
  if (existing) {
    draft = structuredClone(existing.model);
    dataset = structuredClone(existing.dataset);
    history = structuredClone(existing.history);
    savedSignature = signature();
  } else {
    const job = beginModel(p(), {
      featureMode: "color-shape",
      hidden: [6, 4],
      activation: "tanh",
      seed: 7,
      learningRate: 0.05,
      batchSize: 16,
    });
    draft = job.model;
    dataset = job.dataset;
    history = [];
    savedSignature = "";
  }
  sampleId = splitAssets(p(), "train", dataset)[0]?.id ?? "";
  gradient = null;
  selected = [0, 0];
  parameterPage = 0;
}
function rebuild(update: (options: Parameters<typeof beginModel>[1]) => void) {
  probeReadback=null;
  const options = {
    featureMode: draft.featureMode,
    hidden: [...draft.hidden],
    activation: draft.activation,
    seed: draft.seed,
    learningRate: draft.learningRate,
    batchSize: draft.batchSize,
  };
  update(options);
  const job = beginModel(p(), options);
  draft = job.model;
  dataset = job.dataset;
  history = [];
  gradient = null;
  phase = "forward";
  sampleId = splitAssets(p(), "train", dataset)[0]?.id ?? "";
  selected = [0, 0];
  parameterPage = 0;
  lastUpdate=null;
  savedSignature = "";
  notice = "已用当前资料重建一个随机起点；之前保存的模型保持原样。";
}
function addPoint() {
  const point = {
    step: draft.steps,
    train: evaluateRows(draft, rows("train")).loss,
    validation: evaluateRows(draft, rows("validation")).loss,
  };
  history = history.filter((v) => v.step !== point.step);
  history.push(point);
}
async function act(operation: () => void | Promise<void>) {
  try {
    await operation();
    await save();
  } catch (error) {
    notice = error instanceof Error ? error.message : String(error);
  }
  render();
}
function inspector() {
  const row = currentRow(),
    trace = forwardDense(draft, row.x);
  selected[0] = Math.min(selected[0], draft.layers.length - 1);
  selected[1] = Math.min(
    selected[1],
    draft.layers[selected[0]].bias.length - 1,
  );
  const [k, j] = selected,
    weights = draft.layers[k].weights[j],
    inputs = trace.values[k],
    sum = trace.sums[k][j],
    value = trace.values[k + 1][j],
    last = k === draft.layers.length - 1;
  parameterPage = Math.min(parameterPage, Math.floor((weights.length - 1) / 5));
  return `<aside class="neuron-inspector"><span class="micro-label">${last ? "输出层" : "隐藏层 " + (k + 1)} / 单元 ${j + 1}</span><h2>把一个计算拆开</h2><nav class="neuron-reading-tabs"><button data-action="inspector-summary" aria-pressed="${!showWeights}">响应与更新</button><button data-action="inspector-weights" aria-pressed="${showWeights}">逐项权重</button></nav><div class="formula">z = Σ wᵢxᵢ + b</div><div class="math-result"><span>加权和 z</span><b>${sum.toFixed(4)}</b></div><div class="formula small-formula">${last ? "a = Softmax(z)" : draft.activation === "tanh" ? "a = tanh(z)" : draft.activation === "relu" ? "a = max(0, z)" : "a = z"}</div><div class="math-result"><span>${last ? "模型输出" : "激活后的响应"}</span><b>${value.toFixed(4)}</b></div>${showWeights?`<table class="weight-table"><thead><tr><th>来自</th><th>输入</th><th>权重</th><th>贡献</th></tr></thead><tbody>${weights
    .slice(parameterPage * 5, parameterPage * 5 + 5)
    .map((w, n) => {
      const i = parameterPage * 5 + n;
      return `<tr><td>${h(k === 0 ? featureName(draft.featureMode, i) : `N${i + 1}`)}</td><td>${inputs[i].toFixed(2)}</td><td>${w.toFixed(2)}</td><td>${(w * inputs[i]).toFixed(2)}</td></tr>`;
    })
    .join(
      "",
    )}</tbody></table><div class="page-pager"><button data-action="weights-prev" ${parameterPage === 0 ? "disabled" : ""}>←</button><span>${parameterPage + 1} / ${Math.ceil(weights.length / 5)}</span><button data-action="weights-next" ${(parameterPage + 1) * 5 >= weights.length ? "disabled" : ""}>→</button></div><div class="gradient-receipt"><span>${gradient ? "这个样本的偏置梯度" : "偏置 b"}</span><strong>${(gradient ? gradient.layers[k].bias[j] : draft.layers[k].bias[j]).toFixed(5)}</strong><p>${gradient ? "梯度说明参数怎样影响损失；更新时减去学习率乘梯度。" : "点击网络中的任意单元，逐项核对真实输入、权重与贡献。"}</p></div>`:lastUpdate?`<section class="update-trace"><span>这一次真实更新</span><div><b>${lastUpdate.beforeLoss.toFixed(4)}</b><i>→</i><b>${lastUpdate.afterLoss.toFixed(4)}</b></div><small>本样本损失${lastUpdate.afterLoss<lastUpdate.beforeLoss?"下降":lastUpdate.afterLoss>lastUpdate.beforeLoss?"上升":"持平"}</small><p>第${lastUpdate.layer}层第${lastUpdate.unit}单元的偏置示例</p><code>${lastUpdate.beforeBias.toFixed(4)} − ${lastUpdate.rate} × (${lastUpdate.gradient.toFixed(4)})<br>= ${lastUpdate.afterBias.toFixed(4)}</code>${probeReadback&&probeReadback.sampleId===row.id&&probeReadback.steps+1===draft.steps?`<p class="probe-match">${Math.abs(lastUpdate.afterLoss-probeReadback.reading.after.loss)<1e-8?'本样本损失与刚才的同起点试算一致。':'本次结果与试算不同，请检查步长或输入是否改变。'}</p>`:''}<p>所有参数按同一次梯度更新；还需用验证资料检查泛化。</p></section>`:
probeReadback&&probeReadback.steps===draft.steps&&probeReadback.sampleId===row.id?`<section class="probe-bridge"><span>把试算带回真实训练</span><h3>现在，亲手验证这个步长。</h3><div><small>学习率</small><b>${probeReadback.reading.rate.toFixed(3)}</b></div><p>刚才试算的本样本损失：<br><b>${probeReadback.reading.before.loss.toFixed(4)} → ${probeReadback.reading.after.loss.toFixed(4)}</b></p><p>试算未改变权重。先反向求导，再更新一次；核对真实结果是否一致。</p><button data-action="${gradient?'update':'backward'}">${gradient?'执行这一次参数更新':'计算这次真实梯度'} →</button></section>`:`<div class="learning-explanation"><b>${gradient?"有了梯度，还没有更新参数":"从误差中学习"}</b><p>${gradient?"梯度描述损失怎样随参数变化。点击“更新参数”，再比较这个样本前后的真实损失。":"先比较预测与标签，再计算梯度。模型通过反复调整参数，改变下一次预测。"}</p><span>输入 → 预测 → 损失 → 更新</span></div>`}</aside>`;
}
function render() {
  if (!draft) {
    root.innerHTML = `<div class="network-loading"><h1>先准备可训练的资料</h1><p>${h(notice || datasetIssues(p())[0] || "请在第十章准备数据。")}</p><a href="${chapterURL(10, p().id)}">返回数据检视台</a></div>`;
    return;
  }
  const item = sample(),
    row = currentRow(),
    isTraining = dataset.bags[item.group] === "train",
    dirty = signature() !== savedSignature,
    latest = history.at(-1),
    sourceChanged =
      datasetFingerprint(dataset) !== datasetFingerprint(p().dataset);
  const reading=readSample(draft,row);
  root.innerHTML = `<div class="network-app ${probeOpen?'in-step-study':''}" data-phase="${phase}" data-computing="${busy}"><header class="course-header"><span data-nova-return-host></span><h1><span class="chapter-no">11</span>网络解剖台</h1><span class="project-origin">${icon("data")} <span class="origin-title" title="${h(p().title)}">${h(p().title)} · 数据 ${dataset.revision}</span></span><span class="header-spacer"></span><div class="header-tools">${probeOpen?'<button class="study-return" data-action="network-workbench">← 返回我的网络</button>':''}<button data-action="help">操作说明</button><button data-action="versions">模型版本</button><button data-action="export">导出</button><button class="primary" data-action="handoff" ${dirty || !p().activeModelId ? `disabled title="${dirty ? "先保存这个模型，再交给创作台" : "先训练并保存一个模型"}"` : ""}>交给创作台 ${icon("play")}</button></div></header>
 <div class="network-config"><label>输入线索<select id="feature" ${busy ? "disabled" : ""}>${[
   ["color", "颜色 · 6维"],
   ["shape", "轮廓 · 20维"],
   ["color-shape", "颜色与轮廓 · 26维"],
 ]
   .map(
     ([id, title]) =>
       `<option value="${id}" ${draft.featureMode === id ? "selected" : ""}>${title}</option>`,
   )
   .join(
     "",
   )}</select></label><span class="config-divider"></span><span>隐藏层</span><div class="layer-builders">${draft.hidden.map((n, k) => `<div><small>L${k + 1}</small><button data-width="${k}" data-delta="-1" ${busy || n <= 1 ? "disabled" : ""}>−</button><b>${n}</b><button data-width="${k}" data-delta="1" ${busy || n >= 12 ? "disabled" : ""}>＋</button></div>`).join("") || '<span class="linear-model">线性基线 · 没有隐藏层</span>'}</div><button data-action="add-layer" ${busy || draft.hidden.length >= 3 ? "disabled" : ""}>＋ 层</button><button data-action="remove-layer" ${busy || !draft.hidden.length ? "disabled" : ""}>− 层</button><label>激活<select id="activation" ${busy ? "disabled" : ""}>${[
   ["tanh", "tanh"],
   ["relu", "ReLU"],
   ["linear", "恒等 / 无弯折"],
 ]
   .map(
     ([id, label]) =>
       `<option value="${id}" ${draft.activation === id ? "selected" : ""}>${label}</option>`,
   )
   .join(
     "",
   )}</select></label><button data-action="rebuild" ${busy ? "disabled" : ""}>重新起点</button></div>
 <main class="network-workspace"><aside class="input-probe"><span class="micro-label">当前观察样本</span><div class="input-frame"><canvas id="input-image" aria-label="当前模型输入图像"></canvas><i></i></div><select id="sample-choice">${[...splitAssets(p(), "train", dataset), ...splitAssets(p(), "validation", dataset)].map((a, i) => `<option value="${h(a.id)}" ${a.id === item.id ? "selected" : ""}>${i + 1} · ${h(dataset.classes.find((c) => c.id === dataset.labels[a.id])?.name)} · ${dataset.bags[a.group] === "train" ? "训练" : "验证"}</option>`).join("")}</select><span class="sample-split ${isTraining ? "" : "validation"}">${isTraining ? "训练样本，可用于更新" : "验证样本，只观察，不更新"}</span><p>像素 → 提取线索 → 使用训练集的均值与标准差 → 输入网络。</p><div class="feature-bars">${row.x
   .slice(0, 8)
   .map(
     (x, i) =>
       `<div><span>${h(featureName(draft.featureMode, i))}</span><i style="--value:${Math.min(1, Math.abs(x) / 3)};--sign:${x >= 0 ? "var(--positive)" : "var(--negative)"}"></i><b>${x.toFixed(1)}</b></div>`,
   )
   .join(
     "",
   )}</div><button class="step-probe-entry" data-action="step-probe" ${!isTraining||busy?"disabled":""}>${icon("search")}同起点 · 步长实验</button><button data-action="normalization">查看标准化依据 ↗</button><button data-action="current-data">载入当前第十章资料</button></aside>
 <section class="network-stage"><div class="network-stage-caption"><div><span class="micro-label">${gradient ? "核心概念 / 梯度与反向传播" : "核心概念 / 监督学习 · 损失与参数更新"}</span><h2>${gradient ? "沿反方向，算出每个参数的影响。" : "模型如何从误差中学习？"}</h2></div><span class="model-status">${draft.steps ? `已更新 ${draft.steps} 次` : "随机起点 · 尚未训练"}${dirty ? " · 未保存草稿" : ""}</span></div><div class="sample-verdict"><div><span>真实标签</span><b>${h(reading.expected)}</b></div><i>→</i><div><span>当前预测</span><b>${h(reading.predicted)} <small>${(reading.confidence*100).toFixed(1)}%</small></b></div><div class="sample-loss"><span>本样本损失</span><b>${reading.loss.toFixed(4)}</b></div><em class="${reading.correct?"consistent":"different"}">${reading.correct?"本次判断一致":"与标签不同"}</em></div><div class="network-svg-host">${networkSVG(draft, row.x, selected, gradient)}</div><div class="network-legend"><span><i></i>正${gradient ? "梯度" : "权重"}</span><span><i></i>负${gradient ? "梯度" : "权重"}</span><span>线宽对应绝对值 · 点击单元查看内部</span></div><div class="learning-phases"><button data-action="forward" class="${phase === "forward" ? "active" : ""}" ${busy ? "disabled" : ""}><b>1</b><span>前向计算<small>输入样本，得到预测</small></span></button><button data-action="backward" class="${phase === "gradient" ? "active" : ""}" ${busy || !isTraining ? "disabled" : ""}><b>2</b><span>反向求导<small>计算损失对参数的梯度</small></span></button><button data-action="update" class="${phase === "update" ? "active" : ""}" ${busy || !gradient || !isTraining ? "disabled" : ""}><b>3</b><span>更新参数<small>w ← w − η × 梯度</small></span></button></div></section>${inspector()}</main>
 <footer class="training-console"><section class="loss-section"><div><strong>交叉熵损失</strong><span><i></i>训练 <i></i>验证</span><small>${latest ? `${latest.train.toFixed(3)} / ${latest.validation?.toFixed(3) ?? "无历史数据"}` : "等待真实计算"}</small></div>${lossSVG(history)}</section><section class="training-parameters"><label>学习率<input id="rate" type="number" min=".0001" max="1" step=".01" value="${draft.learningRate}" ${busy ? "disabled" : ""}></label><label>批量<select id="batch" ${busy ? "disabled" : ""}>${[1, 8, 16, 32, 600].map((n) => `<option value="${n}" ${draft.batchSize === n ? "selected" : ""}>${n === 600 ? "全部训练样本" : n}</option>`).join("")}</select></label><button class="train-button" data-action="train">${icon(busy ? "pause" : "play")}${busy ? "暂停训练" : "连续更新 100 次"}</button></section><section class="checkpoint-tools"><button class="primary" data-action="keep" ${busy || draft.steps === 0 || !dirty ? "disabled" : ""}>${icon("model")}保存这个模型</button><button data-action="compare" ${busy || p().models.length < 2 ? "disabled" : ""}>比较两个版本</button><span>${sourceChanged ? "当前资料已经改变，旧模型仍绑定原资料。" : "只改变一个条件，再做可解释的对照。"}</span></section></footer>${notice ? `<div class="toast">${h(notice)}<button data-action="dismiss">×</button></div>` : ""}</div>`;
  mountReturn(11);
  if(probeOpen){const host=root.querySelector<HTMLElement>(".network-workspace")!;host.innerHTML='<section class="step-study-mount"></section>';mountStepProbe(host.querySelector(".step-study-mount")!,draft,currentRow(),rows("validation"),(rate,reading)=>{probeReadback={steps:draft.steps,sampleId:currentRow().id,reading};draft.learningRate=rate;gradient=null;lastUpdate=null;showWeights=false;probeOpen=false;notice="";render();});return;}
  drawImage(
    root.querySelector<HTMLCanvasElement>("#input-image")!,
    assetImage(item),
  );
}
function train() {
  if (busy) {
    worker?.postMessage({ kind: "stop" });
    notice = "正在结束当前小批量，保留已经完成的更新。";
    render();
    return;
  }
  busy = true;
  probeReadback=null;
  lastUpdate=null;
  gradient = null;
  const before = [...history];
  worker?.terminate();
  worker = new Worker(
    new URL("../../../shared/creator/train-worker.ts", import.meta.url),
    { type: "module" },
  );
  worker.onmessage = (e) => {
    const result = e.data;
    if (result.kind === "error") {
      busy = false;
      notice = result.message;
      render();
      return;
    }
    if (result.model) draft = result.model;
    history = [
      ...before.filter((p) => p.step < (result.history[0]?.step ?? Infinity)),
      ...result.history,
    ];
    phase = "update";
    if (result.kind === "done") {
      busy = false;
      notice = result.cancelled
        ? "已暂停，当前参数可以保存。"
        : "真实训练完成。先检查验证结果，再保存模型版本。";
      worker?.terminate();
      worker = null;
    }
    render();
  };
  worker.onerror = () => {
    busy = false;
    notice = "训练线程未能完成，之前保存的模型不变。";
    render();
  };
  worker.postMessage({
    kind: "train",
    model: draft,
    train: rows("train"),
    validation: rows("validation"),
    steps: 100,
  });
  render();
}
root.addEventListener("click", (e) => {
  const neuron = (e.target as Element).closest("[data-neuron]");
  if (neuron) {
    selected = neuron.getAttribute("data-neuron")!.split(":").map(Number) as [
      number,
      number,
    ];
    parameterPage = 0;
    render();
    return;
  }
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!b || b.disabled) return;
  if (b.dataset.width !== undefined) {
    void act(() =>
      rebuild((o) => {
        o.hidden[Number(b.dataset.width)] += Number(b.dataset.delta);
      }),
    );
    return;
  }
  const action = b.dataset.action;
  if (!action) return;
  if(action==="inspector-summary"||action==="inspector-weights"){showWeights=action==="inspector-weights";render();return;}
  if (action === "dismiss") {
    notice = "";
    render();
    return;
  }
  if (action === "weights-prev" || action === "weights-next") {
    parameterPage += action === "weights-prev" ? -1 : 1;
    render();
    return;
  }
  if (action === "train") {
    train();
    return;
  }
  if (busy) return;
  if (action === "help") {
    modal(
      root,
      "从一条预测走进网络内部",
      '<div class="dialog-grid"><div><h3>先跟着一个样本走</h3><p>选择训练样本，依次点击前向计算、反向求导、更新参数。点网络单元，可以逐项核对加权和与激活。</p></div><div><h3>再比较整个模型</h3><p>连续训练、保存版本。只改变结构、激活或学习率中的一项，再训练并用同一批验证资料比较。</p></div></div><p>验证样本可以观察输出，但不能在这里用于更新。光流方向跟随前向计算或反向求导，输出圆环表示实际分类比例。所有曲线和响应来自真实计算，更多隐藏层不保证更好的结果。</p>',
    );
    return;
  }
  if(action === "hard-sample"){const hardest=rows("train").reduce<NumericRow|null>((best,row)=>!best||readSample(draft,row).loss>readSample(draft,best).loss?row:best,null);if(hardest){sampleId=hardest.id;gradient=null;lastUpdate=null;probeReadback=null;phase="forward";notice="";render();}return;}
  if(action === "step-probe"){if(dataset.bags[sample().group]!=="train")return;probeOpen=true;notice="";render();return;}
  if(action === "network-workbench"){probeOpen=false;render();return;}
  if (action === "normalization") {
    modal(
      root,
      "均值和标准差来自哪里？",
      `<p>这套变换只拟合模型所绑定的训练资料。验证、测试和之后试用的图片使用同一组数值。</p><table class="compact-table"><thead><tr><th>特征</th><th>训练均值</th><th>训练标准差</th></tr></thead><tbody>${draft.mean
        .slice(0, 6)
        .map(
          (m, i) =>
            `<tr><td>${h(featureName(draft.featureMode, i))}</td><td>${m.toFixed(4)}</td><td>${draft.std[i].toFixed(4)}</td></tr>`,
        )
        .join(
          "",
        )}</tbody></table><p>标准化后的值 =（原值 − 训练均值）÷ 训练标准差。此处先展示前六维。</p>`,
    );
    return;
  }
  if (action === "versions") {
    const version = p().models.find((m) => m.id === p().activeModelId),
      d = modal(
        root,
        "保存过的模型",
        `<label class="dialog-field">模型版本<select id="version-pick">${p()
          .models.map(
            (m) =>
              `<option value="${m.id}" ${m.id === version?.id ? "selected" : ""}>${h(modelTag(m))} · 验证 ${m.validation.correct}/${m.validation.total}</option>`,
          )
          .join(
            "",
          )}</select></label><p>载入只建立一个可继续研究的草稿。“保存模型版本”会把所选模型定下来，之后调整草稿不会改写它。</p><div class="dialog-actions"><button data-load-model ${p().models.length ? "" : "disabled"}>载入草稿</button><button data-freeze-model ${version ? "" : "disabled"}>保存模型版本</button><button data-model-test ${version ? "" : "disabled"}>封存检验</button></div>`,
      );
    d.querySelector("[data-load-model]")!.addEventListener(
      "click",
      () =>
        void act(() => {
          p().activeModelId =
            d.querySelector<HTMLSelectElement>("#version-pick")!.value;
          initialize();
          d.remove();
        }),
    );
    d.querySelector("[data-freeze-model]")!.addEventListener(
      "click",
      () =>
        void act(() => {
          const v = p().models.find(
            (m) =>
              m.id ===
              d.querySelector<HTMLSelectElement>("#version-pick")!.value,
          )!;
          v.sealed = true;
          notice = "模型版本已保存，之后调整草稿不会改写它。";
          d.remove();
        }),
    );
    d.querySelector("[data-model-test]")!.addEventListener(
      "click",
      () =>
        void act(() => {
          const v = p().models.find(
            (m) =>
              m.id ===
              d.querySelector<HTMLSelectElement>("#version-pick")!.value,
          )!;
          if (!v.sealed) throw Error("先点“保存模型版本”，再打开封存资料。");
          const result = openTest(p(), v);
          notice = `${result.independent ? "首次独立测试" : "已见资料复测"}：${result.correct}/${result.total}。`;
          d.remove();
        }),
    );
    return;
  }
  if (action === "compare") {
    const models = p().models,
      d = modal(
        root,
        "比较两个实际模型",
        `<div class="dialog-grid"><label class="dialog-field">模型 A<select id="compare-a">${models.map((m, i) => `<option value="${m.id}" ${i === models.length - 2 ? "selected" : ""}>${h(modelTag(m))}</option>`).join("")}</select></label><label class="dialog-field">模型 B<select id="compare-b">${models.map((m, i) => `<option value="${m.id}" ${i === models.length - 1 ? "selected" : ""}>${h(modelTag(m))}</option>`).join("")}</select></label></div><div id="comparison-results"><p>将两个模型放到当前同一批验证资料上。不同类别的模型不能直接比较。</p></div><div class="dialog-actions"><button class="primary" data-compare-models>运行同题对照</button></div>`,
      );
    d.querySelector("[data-compare-models]")!.addEventListener(
      "click",
      async () => {
        try {
          const a = models.find(
              (m) =>
                m.id ===
                d.querySelector<HTMLSelectElement>("#compare-a")!.value,
            )!,
            b = models.find(
              (m) =>
                m.id ===
                d.querySelector<HTMLSelectElement>("#compare-b")!.value,
            )!,
            r = compareModels(p(), a, b);
          await save();
          d.querySelector("#comparison-results")!.innerHTML =
            `<div class="compare-values"><b>A ${r.aCorrect}/${r.total}</b><b>B ${r.bCorrect}/${r.total}</b></div><p>不同条件：${h(r.variables.join("、") || "配置相同")}。${r.variables.length === 1 ? "这是一次单变量对照。" : "多个条件不同，归因时需要谨慎。"}</p>`;
        } catch (error) {
          d.querySelector("#comparison-results")!.textContent = String(error);
        }
      },
    );
    return;
  }
  void act(async () => {
    if (action === "forward") {
      lastUpdate=null;
      gradient = null;
      phase = "forward";
      p().evidence.forwardRuns++;
      notice = "";
    }
    if (action === "backward") {
      lastUpdate=null;
      if (dataset.bags[sample().group] !== "train")
        throw Error("验证资料不能参与参数更新。");
      gradient = denseGradients(draft, [currentRow()]);
      phase = "gradient";
      p().evidence.gradientRuns++;
      notice = "";
    }
    if (action === "update") {
      if (!gradient || dataset.bags[sample().group] !== "train")
        throw Error("先对训练样本求导。");
      const before=structuredClone(draft),input=currentRow();
      applyGradient(draft, gradient);
      lastUpdate=explainUpdate(before,draft,input,gradient,selected);
      gradient = null;
      phase = "update";
      addPoint();
      notice = "";
    }
    if (action === "add-layer") rebuild((o) => o.hidden.push(4));
    if (action === "remove-layer") rebuild((o) => o.hidden.pop());
    if (action === "rebuild" || action === "current-data")
      rebuild((o) => {
        if (action === "rebuild") o.seed = (o.seed + 12) % 999999;
      });
    if (action === "keep") {
      keepModel(p(), draft, dataset, history, 11);
      savedSignature = signature();
      notice = "模型、标准化参数、训练资料与验证结果已作为新版本保存。";
    }
    if (action === "handoff") {
      await save();
      location.href = chapterURL(13, p().id);
    }
    if (action === "export") {
      download(encodeCreator(p()), `${p().title}-训练作品.json`);
      notice = "可运行模型与来源资料已导出。";
    }
  });
});
root.addEventListener("change", (e) => {
  const input = e.target as HTMLSelectElement | HTMLInputElement;
  if (input.id === "sample-choice") {
    sampleId = input.value;
    probeReadback=null;
    lastUpdate=null;
    gradient = null;
    phase = "forward";
    render();
    return;
  }
  if (busy || !["feature", "activation", "rate", "batch"].includes(input.id))
    return;
  if(input.id === "rate" || input.id === "batch"){void act(()=>{probeReadback=null;const value=Number(input.value);if(input.id==="rate"){if(!Number.isFinite(value)||value<.0001||value>1)throw Error("学习率应在0.0001至1之间。");draft.learningRate=value;}else{if(!Number.isInteger(value)||value<1||value>600)throw Error("批量应为1至600之间的整数。");draft.batchSize=value;}gradient=null;lastUpdate=null;notice="只改变训练步长或批量，当前权重与已有历史保留。";});return;}
  void act(() =>
    rebuild((o) => {
      if (input.id === "feature")
        o.featureMode = input.value as DenseModel["featureMode"];
      if (input.id === "activation")
        o.activation = input.value as DenseModel["activation"];
    }),
  );
});
root.addEventListener("keydown", (e) => {
  if (["Enter", " "].includes(e.key)) {
    const n = (e.target as Element).closest("[data-neuron]");
    if (n) {
      e.preventDefault();
      selected = n.getAttribute("data-neuron")!.split(":").map(Number) as [
        number,
        number,
      ];
      render();
    }
  }
});
CreatorStore.open()
  .then((s) => {
    store = s;
    try {
      initialize();
    } catch (error) {
      notice = String(error);
    }
    render();
  })
  .catch((error) => {
    root.innerHTML = `<div class="network-loading"><h1>本机项目未能打开</h1><p>${h(error)}</p><a href="../../courses/">返回奇点</a></div>`;
  });
window.addEventListener("pagehide", () => worker?.terminate());
