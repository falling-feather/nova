import type {ColorFinding} from "./color-investigation.ts";
import {
  activeAssets,
  assetImage,
  assetSignature,
  datasetIssues,
  referenceFor,
  splitAssets,
} from "../../../shared/creator/data.ts";
import {
  h,
  icon,
  drawImage,
  mountReturn,
} from "../../../shared/creator/dom.ts";
import type {
  CreatorProject,
  SampleAsset,
  Split,
} from "../../../shared/creator/types.ts";
import { featureCount } from "./model.ts";
import type { FeatureMode } from "./model.ts";
import type { Scene } from "./samples.ts";
import { bindPixelProbe } from "./pixel-probe.ts";
export interface DataView {
  workspace: "data"|"experiment";
  findings:ColorFinding[];
  selected: string;
  page: number;
  filter: "all" | Split;
  feature: FeatureMode;
  scene: Scene;
  challenge: boolean;
  notice: string;
  busy: boolean;
}
export const BAG_NAMES = {
  train: "训练资料",
  validation: "验证资料",
  test: "封存测试",
};
export const visibleAssets = (p: CreatorProject, v: DataView) =>
  activeAssets(p).filter(
    (a) =>
      (v.filter === "all"
        ? p.dataset.bags[a.group] !== "test"
        : p.dataset.bags[a.group] === v.filter) &&
      !(p.dataset.bags[a.group] === "test" && !p.seenGroups.includes(a.group)),
  );
const photo = (a: SampleAsset) =>
  `<canvas data-picture="${h(a.id)}" aria-label="样本图像"></canvas>`;
const probeCleanup = new WeakMap<HTMLElement, () => void>();
export function renderData(root: HTMLElement, p: CreatorProject, v: DataView) {
  probeCleanup.get(root)?.();
  probeCleanup.delete(root);
  const list = visibleAssets(p, v),
    pages = Math.max(1, Math.ceil(list.length / 12));
  v.page = Math.min(v.page, pages - 1);
  const selected = p.assets.find((a) => a.id === v.selected),
    model = p.models.find((m) => m.id === p.activeModelId),
    issues = datasetIssues(p);
  root.innerHTML = `<div class="data-app ${v.workspace==='experiment'?'in-color-study':''} ${v.findings.length?'has-study-finding':''}"><header class="course-header"><span data-nova-return-host></span><h1><span class="chapter-no">10</span>数据检视台</h1><span class="header-spacer"></span><span class="micro-label">DATA BEFORE MODEL</span><div class="header-tools">${v.workspace==='experiment'?'<button class="study-return" data-action="data-workbench">← 返回我的资料</button>':''}<button data-action="guide">${icon("help")}操作说明</button><button data-action="import">导入</button><button data-action="export">导出资料</button><button class="primary" data-action="handoff">交给第十一章 ${icon("play")}</button></div></header>
 <div class="data-intro"><div class="optical-title"><svg class="optical-mark" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="31" fill="none" stroke="currentColor" stroke-opacity=".25"/><g class="optical-orbit"><circle cx="36" cy="36" r="26" fill="none" stroke="currentColor" stroke-dasharray="2 5"/><path d="M36 5a31 31 0 0 1 31 31M36 67A31 31 0 0 1 5 36" fill="none" stroke="currentColor" stroke-width="2"/></g><path d="M0 36h12m48 0h12M36 0v12m0 48v12" stroke="currentColor"/><text x="36" y="37" text-anchor="middle">${featureCount(v.feature)}</text><text class="optical-unit" x="36" y="48" text-anchor="middle">所选维度</text></svg><span class="micro-label concept-label">核心概念 / 数据表示 · 标签 · 泛化</span><h2>它认的是物体，还是颜色？</h2><p class="concept-line">图像变成特征，标签给出学习目标；用新资料检查学到的规律。</p></div><nav aria-label="数据研究过程"><span>01 采样</span><i></i><span>02 核对</span><i></i><span>03 分组</span><i></i><span>04 检验</span></nav><button class="investigation-entry" data-action="color-investigation">颜色交换实验 ${icon("play")}</button><button class="concept-entry" data-action="feature-lens" ${!selected?"disabled":""}>拆开输入 · ${featureCount(v.feature)}维 ${"↗"}</button></div>${v.findings.length&&v.workspace==='data'?`<div class="data-study-bridge"><span>带着发现，研究自己的资料</span><p>示例换色图：${v.findings.map(f=>`${{color:'颜色',shape:'轮廓','color-shape':'合并'}[f.mode]} ${f.swapped}/${f.total}`).join(' → ')}。${model&&model.model.featureMode===v.feature&&model.dataset.revision===p.dataset.revision?'当前模型已采用这些线索；接着追查具体误判。':'下一步，用自己的资料训练，再看它是否也适用。'}</p><button data-action="${model&&model.model.featureMode===v.feature&&model.dataset.revision===p.dataset.revision?'report':'baseline'}">${model&&model.model.featureMode===v.feature&&model.dataset.revision===p.dataset.revision?'追查逐张结果':'在我的资料上训练'} ↗</button></div>`:''}
 <main class="data-workspace">${v.workspace==='experiment'?'<section class="color-study-mount"></section>':`<aside class="sample-tools"><span class="micro-label">01 / 样本来源</span><h3>准备一组材料</h3><label>采样条件<select id="sample-scene"><option value="studio" ${v.scene === "studio" ? "selected" : ""}>彩色展台</option><option value="mixed" ${v.scene === "mixed" ? "selected" : ""}>交换物体颜色</option><option value="dim" ${v.scene === "dim" ? "selected" : ""}>暖光木桌</option></select></label><label class="check-label"><input id="label-challenge" type="checkbox" ${v.challenge ? "checked" : ""}>加入一张错签练习</label><button data-action="sample">${icon("image")}生成教学样本</button><div class="tool-rule"></div><h3>自己的类别</h3><div class="category-list">${p.dataset.classes.map((c) => `<div><button data-category="${h(c.id)}" title="${h(c.name)}">${h(c.name)}</button><span>${activeAssets(p).filter((a) => p.dataset.labels[a.id] === c.id).length}</span></div>`).join("")}</div><button data-action="category">${icon("plus")}添加类别</button><button data-action="upload">${icon("export")}导入自己的图片</button><p class="technical-note">适合浅色背景中的单件物体。导入后缩成32×32像素；简单线索不能保证识别任意照片。</p><div class="source-stamp">LOCAL DATA<br><b>本机资料 · 自己判断</b></div></aside>
 <section class="light-table"><header><div class="data-filters">${(["all", "train", "validation", "test"] as const).map((id) => `<button data-filter="${id}" aria-pressed="${v.filter === id}">${id === "all" ? "展开的资料" : BAG_NAMES[id]}</button>`).join("")}</div><span>${list.length} 张可查看</span></header><div class="contact-sheet">${list
   .slice(v.page * 12, v.page * 12 + 12)
   .map(
     (a, i) =>
       `<button class="specimen ${a.id === v.selected ? "selected" : ""} ${p.dataset.reviewed.includes(a.id) ? "reviewed" : ""}" data-sample="${h(a.id)}" data-group="${h(a.group)}" draggable="true"><span class="specimen-id">${String(v.page * 12 + i + 1).padStart(2, "0")}<small>${BAG_NAMES[p.dataset.bags[a.group]]}</small></span><span class="photo-mat">${photo(a)}</span><span class="specimen-label"><span class="specimen-class" title="${h(p.dataset.classes.find((c) => c.id === p.dataset.labels[a.id])?.name)}">${h(p.dataset.classes.find((c) => c.id === p.dataset.labels[a.id])?.name)}</span><i>${p.dataset.reviewed.includes(a.id) ? "已核对" : "待核对"}</i></span></button>`,
   )
   .join(
     "",
   )}${!list.length ? '<div class="sealed-info">' + icon("data") + "<h3>测试资料保持封存</h3><p>先固定模型，再进行最终检验。已经看过的材料不能重新变成“未知”。</p></div>" : ""}</div><footer><span>同组连拍一起分配，避免训练与验证“撞图”。</span><div class="page-pager"><button data-action="prev" ${v.page === 0 ? "disabled" : ""}>←</button><span>${v.page + 1} / ${pages}</span><button data-action="next" ${v.page + 1 === pages ? "disabled" : ""}>→</button></div></footer></section>
 <aside class="sample-inspector"><span class="micro-label">02 / 检视与标注</span>${selected ? `<div class="inspector-photo"><div class="pixel-source">${photo(selected)}<i class="pixel-crosshair" aria-hidden="true"></i></div><div class="pixel-loupe"><canvas data-pixel-loupe></canvas><span>8 × 8</span></div><div class="pixel-reading"><span data-pixel-coordinate></span><span data-pixel-value></span></div></div><h3>当前样本 <span class="specimen-resolution">32 × 32</span></h3><dl><div><dt>来源</dt><dd>${h(selected.source)}</dd></div><div><dt>同组</dt><dd>${activeAssets(p).filter((a) => a.group === selected.group).length} 张</dd></div><div><dt>相同图样</dt><dd>${activeAssets(p).filter((a) => assetSignature(a) === assetSignature(selected)).length} 份</dd></div></dl><label>当前标签<select id="sample-label">${p.dataset.classes.map((c) => `<option value="${h(c.id)}" ${p.dataset.labels[selected.id] === c.id ? "selected" : ""}>${h(c.name)}</option>`).join("")}</select></label><button class="verify-action" data-action="review">${icon("check")}${referenceFor(selected) ? "核对教学参考标签" : "确认我的人工标注"}</button><button data-action="exclude">从本次资料排除</button><button class="feature-lens-trigger" data-action="feature-lens">${icon("search")}像素怎样变成特征？</button><p class="dataset-binding${model&&model.dataset.revision!==p.dataset.revision?" is-stale":""}">${model&&model.dataset.revision!==p.dataset.revision?"资料已修改。重新训练后，模型才会使用新标签与划分。":"标签告诉模型学什么；特征来自图像像素。旧模型保持原版本。"}</p>` : '<div class="empty-state">' + icon("search") + "<p>选中一张样本，检查标签与来源。</p></div>"}<div class="inspector-bottom"><strong>${p.dataset.reviewed.length} 张已核对</strong><button data-action="excluded">已排除 ${p.dataset.excluded.length} 张 ↗</button></div></aside>`}</main>
 <footer class="data-footer"><div class="data-trays">${(["train", "validation", "test"] as const).map((bag, i) => `<button class="data-bay" data-bag="${bag}"><span>${["TRAIN", "VALIDATE", "HOLD OUT"][i]}</span><strong>${BAG_NAMES[bag]} <b>${splitAssets(p, bag).length}</b></strong><small>${["只用这些样本学习参数", "用新样本比较方案", "固定模型后再打开"][i]}</small></button>`).join("")}</div><div class="baseline-tools"><label>下次训练的输入线索<select id="feature-mode"><option value="color" ${v.feature === "color" ? "selected" : ""}>颜色</option><option value="shape" ${v.feature === "shape" ? "selected" : ""}>轮廓与网格</option><option value="color-shape" ${v.feature === "color-shape" ? "selected" : ""}>颜色＋轮廓</option></select></label><button class="primary" data-action="baseline" ${v.busy ? "disabled" : ""}>${v.busy ? "实际计算中…" : "训练一个线性基线"}</button><button data-action="compare" ${p.models.length < 2 ? "disabled" : ""}>比较清洗前后</button></div><div class="baseline-receipt"><span>${model ? h(model.name) : "先留一份基线，再做改变"}</span><b>${model ? `${model.validation.correct} / ${model.validation.total}` : "—"}</b><small>${model ? "验证资料判断相符" : "成绩由实际计算产生"}</small>${model ? '<button data-action="report">查看误判与检验 ↗</button>' : ""}</div></footer><div class="data-footnote"><span>${issues.length ? `资料待完善：${h(issues[0])}` : "训练与验证的类别齐全，可交给下一阶段。"}</span><span>教学合成或用户导入 · 数据第 ${p.dataset.revision} 版</span></div>${v.notice ? `<div class="toast">${h(v.notice)}<button data-action="dismiss">×</button></div>` : ""}<input class="native-file" id="picture-files" type="file" accept="image/png,image/jpeg,image/webp" multiple><input class="native-file" id="project-file" type="file" accept=".json,application/json"></div>`;
  mountReturn(10);
  root.querySelectorAll<HTMLCanvasElement>("[data-picture]").forEach((c) => {
    const a = p.assets.find((a) => a.id === c.dataset.picture);
    if (a) drawImage(c, assetImage(a));
  });
  const probe = root.querySelector<HTMLElement>(".inspector-photo");
  if (probe && selected)
    probeCleanup.set(root, bindPixelProbe(probe, assetImage(selected)));
}
