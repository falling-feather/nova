import {mountColorInvestigation} from "./color-investigation.ts";
import "../../../shared/linkage/course-links.js";
import "../../../shared/creator/base.css";
import "./lab.css";
import "./investigation.css";
import {
  installTechExperience,
  pulseTransfer,
} from "../../../shared/creator/tech.ts";
import {
  CreatorStore,
  publishProgress,
  chapterURL,
} from "../../../shared/creator/store.ts";
import {
  activeAssets,
  assetImage,
  assetSignature,
  datasetIssues,
  moveGroup,
  referenceFor,
} from "../../../shared/creator/data.ts";
import {
  baseline,
  compareModels,
  encodeCreator,
  importLegacyData,
  createCreator,
  openTest,
} from "../../../shared/creator/project.ts";
import {
  h,
  modal,
  download,
  readImage,
  drawImage,
} from "../../../shared/creator/dom.ts";
import { showFeatureLens } from "./feature-lens.ts";
import { makeGroup, referenceLabel } from "./samples.ts";
import type { Scene } from "./samples.ts";
import type { FeatureMode } from "./model.ts";
import { importArtifact } from "./project.ts";
import type { SampleAsset, Split } from "../../../shared/creator/types.ts";
import { renderData, visibleAssets } from "./lab-view.ts";
import type { DataView } from "./lab-view.ts";
const root = document.querySelector<HTMLElement>("#app")!;
installTechExperience(root, 10);
root.innerHTML = '<div class="data-loading">正在打开本机数据检视台…</div>';
let store: CreatorStore;
const view: DataView = {
  workspace:"data",findings:[],
  selected: "",
  page: 0,
  filter: "all",
  feature: "color",
  scene: "studio",
  challenge: false,
  notice: "",
  busy: false,
};
const p = () => store.project,
  a = () => p().assets.find((a) => a.id === view.selected),
  chosen = () => p().models.find((m) => m.id === p().activeModelId),
  render = () => {renderData(root,p(),view);if(view.workspace==="experiment")mountColorInvestigation(root.querySelector(".color-study-mount")!, (mode,findings)=>{view.feature=mode;view.findings=findings;view.workspace="data";render();});};
async function save() {
  await store.save();
  publishProgress(p(), 10);
}
async function act(operation: () => void | Promise<void>) {
  try {
    await operation();
    await save();
  } catch (error) {
    view.notice = error instanceof Error ? error.message : String(error);
  }
  render();
}
function category(id?: string) {
  const current = p().dataset.classes.find((c) => c.id === id),
    dialog = modal(
      root,
      current ? "修改类别" : "添加类别",
      `<p>最多五类，每类都需要独立的训练和验证资料。</p><label class="dialog-field">类别名称<input id="class-name" value="${h(current?.name ?? "")}" maxlength="30"></label><div class="dialog-actions">${current ? "<button data-remove-category>从当前资料移除这一类</button>" : ""}<button class="primary" data-save-category>保存类别</button></div>`,
    );
  dialog.querySelector("[data-save-category]")!.addEventListener(
    "click",
    () =>
      void act(() => {
        const name = dialog
          .querySelector<HTMLInputElement>("#class-name")!
          .value.trim();
        if (!name) throw Error("请填写类别名称。");
        if (current) current.name = name;
        else {
          if (p().dataset.classes.length >= 5) throw Error("最多五个类别。");
          p().dataset.classes.push({ id: crypto.randomUUID(), name });
        }
        p().dataset.revision++;
        dialog.remove();
      }),
  );
  dialog.querySelector("[data-remove-category]")?.addEventListener(
    "click",
    () =>
      void act(() => {
        if (p().dataset.classes.length <= 2) throw Error("至少保留两类。");
        p().dataset.classes = p().dataset.classes.filter((c) => c.id !== id);
        for (const [key, value] of Object.entries(p().dataset.labels))
          if (value === id) delete p().dataset.labels[key];
        p().dataset.revision++;
        view.selected = "";
        dialog.remove();
      }),
  );
}
function report() {
  const version = chosen();
  if (!version) return;
  const r = version.validation,
    wrong = r.rows.filter((row) => row.label !== row.predicted);
  let page = 0;
  const dialog = modal(root, "当前模型的实际表现", ""),
    body = dialog.querySelector<HTMLElement>(".dialog-body")!;
  function show() {
    body.innerHTML = `<div class="report-summary"><strong>${r.correct} / ${r.total}</strong><span>验证样本判断相符，模型输出概率不等于正确率。</span></div><div class="failure-report"><div><table class="compact-table"><thead><tr><th>真实／预测</th>${version!.model.classes.map((c) => `<th>${h(c.name)}</th>`).join("")}</tr></thead><tbody>${r.confusion.map((row, i) => `<tr><th>${h(version!.model.classes[i].name)}</th>${row.map((n) => `<td>${n}</td>`).join("")}</tr>`).join("")}</tbody></table><p>模型绑定第 ${version!.dataset.revision} 版资料，后续修改标签不会改写这里的结果。</p><p>先找一组相似的错误：它们是否共享颜色、背景或拍摄条件？回到检视台改变一个条件，再比较。</p></div><section><h3>${wrong.length} 张实际误判</h3><div class="failure-grid">${
      wrong
        .slice(page * 6, page * 6 + 6)
        .map(
          (row) =>
            `<button data-failure="${h(row.id)}"><canvas data-failure-image="${h(row.id)}"></canvas><span>${h(version!.model.classes[row.label].name)} → ${h(version!.model.classes[row.predicted].name)}</span><small>模型输出 ${(row.probability * 100).toFixed(1)}%</small></button>`,
        )
        .join("") || "<p>这批资料没有误判。尝试新的采样条件，检查能力边界。</p>"
    }</div><div class="page-pager"><button data-failure-page="-1" ${page === 0 ? "disabled" : ""}>←</button><span>${page + 1} / ${Math.max(1, Math.ceil(wrong.length / 6))}</span><button data-failure-page="1" ${(page + 1) * 6 >= wrong.length ? "disabled" : ""}>→</button></div></section></div><div class="dialog-actions"><button data-seal ${version!.sealed ? "disabled" : ""}>${version!.sealed ? "已冻结模型" : "冻结这个模型"}</button><button data-test ${!version!.sealed ? "disabled" : ""}>${version!.test ? "查看封存检验" : "打开封存检验"}</button></div>`;
    body
      .querySelectorAll<HTMLCanvasElement>("[data-failure-image]")
      .forEach((canvas) =>
        drawImage(
          canvas,
          assetImage(
            p().assets.find((a) => a.id === canvas.dataset.failureImage)!,
          ),
        ),
      );
    body
      .querySelectorAll<HTMLButtonElement>("[data-failure-page]")
      .forEach((button) =>
        button.addEventListener("click", () => {
          page += Number(button.dataset.failurePage);
          show();
        }),
      );
    body
      .querySelectorAll<HTMLButtonElement>("[data-failure]")
      .forEach((button) =>
        button.addEventListener("click", () => {
          const id = button.dataset.failure!,
            asset = p().assets.find((a) => a.id === id)!;
          if (!p().dataset.labels[id] || p().dataset.excluded.includes(id)) {
            view.notice =
              "这张图片已从当前资料排除，旧版报告与原图仍在这里保留。";
            return;
          }
          view.selected = id;
          view.filter = p().dataset.bags[asset.group];
          view.page = Math.max(
            0,
            Math.floor(
              visibleAssets(p(), view).findIndex((a) => a.id === id) / 12,
            ),
          );
          view.notice =
            "已定位这张误判图；核对标签、背景与采集组，再设计一次对照。";
          render();
        }),
      );
    body.querySelector("[data-seal]")!.addEventListener("click", async () => {
      try {
        version!.sealed = true;
        await save();
        show();
      } catch (error) {
        view.notice = String(error);
        render();
      }
    });
    body.querySelector("[data-test]")!.addEventListener(
      "click",
      () =>
        void act(() => {
          const test = openTest(p(), version!);
          view.notice = `${test.independent ? "首次独立检验" : "已见资料复测"}：${test.correct}/${test.total}。`;
        }),
    );
  }
  show();
}
root.addEventListener("click", (event) => {
  const b = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!b || b.disabled || view.busy) return;
  if (b.dataset.sample) {
    view.selected = b.dataset.sample;
    render();
    return;
  }
  if (b.dataset.filter) {
    view.filter = b.dataset.filter as DataView["filter"];
    view.page = 0;
    render();
    return;
  }
  if (b.dataset.category) {
    category(b.dataset.category);
    return;
  }
  if (b.dataset.bag) {
    void act(() => {
      const selected = a();
      if (!selected) throw Error("先选样本，或拖到资料区。");
      if (!moveGroup(p(), selected.group, b.dataset.bag as Split)) {
        view.notice = "这组资料已经在此区域，不需要重复移动。";
        return;
      }
      const source =
        root.querySelector<HTMLElement>(".specimen.selected") ??
        root.querySelector<HTMLElement>(".inspector-photo");
      if (source)
        pulseTransfer(
          source.getBoundingClientRect(),
          b.getBoundingClientRect(),
        );
      p().evidence.splitChecks++;
      view.notice = "同组材料一起移动，已有模型保持原样。";
    });
    return;
  }
  const action = b.dataset.action;
  if (!action) return;
  if (action === "dismiss") {
    view.notice = "";
    render();
    return;
  }
  if (action === "prev" || action === "next") {
    view.page += action === "prev" ? -1 : 1;
    render();
    return;
  }
  if (action === "category") {
    category();
    return;
  }
  if (action === "upload" || action === "import") {
    root
      .querySelector<HTMLInputElement>(
        action === "upload" ? "#picture-files" : "#project-file",
      )!
      .click();
    return;
  }
  if (action === "report") {
    report();
    return;
  }
  if(action === "color-investigation"){view.workspace="experiment";view.notice="";render();return;}
  if(action === "data-workbench"){view.workspace="data";render();return;}
  if (action === "feature-lens") {
    const selected=a();if(!selected)return;
    showFeatureLens(root,assetImage(selected),p().dataset.classes.find(c=>c.id===p().dataset.labels[selected.id])?.name??"未标注",view.feature,mode=>{view.feature=mode;render();});
    return;
  }
  if (action === "guide") {
    modal(
      root,
      "一张图怎样成为可靠资料？",
      '<div class="data-guide"><article><b>01</b><h3>选图，核对标签</h3><p>点选图样，在右侧移动指针或用方向键检视真实像素，再核对标签。</p></article><article><b>02</b><h3>同组放在一起</h3><p>拖向底部资料托盘，或选中后点击托盘。同组连拍会一起移动。</p></article><article><b>03</b><h3>用新资料验证</h3><p>先训练基线，改变一个条件，再比较同一批验证资料。</p></article></div>',
    );
    return;
  }
  if (action === "algorithm") {
    modal(
      root,
      "从数据到基线分类器",
      '<div class="algorithm-chain"><span>原始像素</span><b>→</b><span>颜色／轮廓</span><b>→</b><span>标准化</span><b>→</b><span>线性分类＋Softmax</span></div><p>只用训练集拟合均值和标准差；验证、测试使用同一套变换。交叉熵衡量预测与标签的差异，梯度决定怎样调整权重。</p><p>本章先用没有隐藏层的分类器建立基线。第十一章再拆开隐藏层、激活与反向传播。</p>',
    );
    return;
  }
  if (action === "excluded") {
    const d = modal(
      root,
      "暂时排除的资料",
      `<p>${p().dataset.excluded.length} 张图片暂不参与本次研究；原图和旧模型仍保留。</p><div class="dialog-actions"><button data-restore-excluded>恢复全部排除项</button></div>`,
    );
    d.querySelector("[data-restore-excluded]")!.addEventListener(
      "click",
      () =>
        void act(() => {
          p().dataset.excluded = [];
          p().dataset.revision++;
          d.remove();
        }),
    );
    return;
  }
  if (action === "compare") {
    const left = p().models.at(-2)!,
      right = p().models.at(-1)!;
    void (async () => {
      try {
        const r = compareModels(p(), left, right);
        await save();
        modal(
          root,
          "同一批验证资料上的对照",
          `<div class="comparison-numbers"><article><span>${h(left.name)}</span><strong>${r.aCorrect} / ${r.total}</strong></article><article><span>${h(right.name)}</span><strong>${r.bCorrect} / ${r.total}</strong></article></div><p>改变的条件：${h(r.variables.join("、") || "配置相同")}。${r.variables.length === 1 ? "围绕这个改变解释结果。" : "多个条件不同，不能把结果全归因于其中一个。"}</p>`,
        );
      } catch (error) {
        view.notice = String(error);
        render();
      }
    })();
    return;
  }
  if (action === "baseline") {
    view.busy = true;
    render();
    requestAnimationFrame(() =>
      setTimeout(
        () =>
          void act(() => {
            try {
              const version = baseline(p(), view.feature);
              view.notice = `${version.name}完成：验证 ${version.validation.correct}/${version.validation.total}。`;
            } finally {
              view.busy = false;
            }
          }),
        0,
      ),
    );
    return;
  }
  void act(async () => {
    if (action === "sample") {
      if (
        !["pencil", "cup", "book"].every((id) =>
          p().dataset.classes.some((c) => c.id === id),
        )
      )
        throw Error("自定义类别请导入自己的图片。");
      if (activeAssets(p()).length >= 240) throw Error("当前资料已达240张。");
      const id = `sample-${crypto.randomUUID().slice(0, 8)}`,
        group = makeGroup(id, Math.floor(Date.now() % 1000000), view.scene);
      for (let i = 0; i < 6; i++) {
        const key = `${id}-${i}`;
        p().assets.push({
          id: key,
          group: id,
          source: "新采样 · 教学合成图样",
          origin: { kind: "synthetic", group, index: i },
        });
        p().dataset.labels[key] =
          view.challenge && i === 0 ? "cup" : referenceLabel(i);
      }
      p().dataset.bags[id] = "train";
      p().seenGroups.push(id);
      p().dataset.revision++;
      p().evidence.sampling++;
      view.selected = `${id}-0`;
      view.filter = "train";
      view.page = Math.max(
        0,
        Math.ceil(visibleAssets(p(), view).length / 12) - 1,
      );
      view.notice = view.challenge
        ? "新场次加入了一张错签练习，请检查标签。"
        : "新场次已加入训练资料。";
    }
    if (action === "review") {
      const selected = a();
      if (!selected) throw Error("先选一张图片。");
      const ref = referenceFor(selected);
      if (ref && p().dataset.classes.some((c) => c.id === ref))
        p().dataset.labels[selected.id] = ref;
      if (!p().dataset.reviewed.includes(selected.id))
        p().dataset.reviewed.push(selected.id);
      p().dataset.revision++;
      p().evidence.labelChecks++;
      view.notice = "标注已核对；已有模型权重没有改变。";
    }
    if (action === "exclude") {
      const selected = a();
      if (!selected) throw Error("先选一张图片。");
      if (!p().dataset.excluded.includes(selected.id))
        p().dataset.excluded.push(selected.id);
      p().dataset.revision++;
      view.selected = "";
    }
    if (action === "handoff") {
      const problems = datasetIssues(p());
      if (problems.length) throw Error(problems[0]);
      p().evidence.splitChecks++;
      p().evidence.datasetShared++;
      await save();
      location.href = chapterURL(11, p().id);
    }
    if (action === "export") {
      download(encodeCreator(p()), `${p().title}-数据与模型.json`);
      view.notice = "资料包已导出，可在后续章节重新导入。";
    }
  });
});
root.addEventListener("change", (event) => {
  const f = event.target as HTMLInputElement | HTMLSelectElement;
  if (f.id === "sample-scene") {
    view.scene = f.value as Scene;
    return;
  }
  if (f.id === "label-challenge") {
    view.challenge = (f as HTMLInputElement).checked;
    return;
  }
  if (f.id === "feature-mode") {
    view.feature = f.value as FeatureMode;
    return;
  }
  if (f.id === "sample-label")
    void act(() => {
      p().dataset.labels[view.selected] = f.value;
      p().dataset.revision++;
      p().evidence.labelChecks++;
    });
  if (f.id === "picture-files") {
    const files = Array.from((f as HTMLInputElement).files ?? []).slice(0, 20);
    if (!files.length) return;
    const d = modal(
      root,
      "选择导入图片的类别",
      `<p>图片只保存在本机。每张8MB以内，最多导入20张。</p><select id="upload-class">${p()
        .dataset.classes.map(
          (c) => `<option value="${h(c.id)}">${h(c.name)}</option>`,
        )
        .join(
          "",
        )}</select><div class="dialog-actions"><button class="primary" data-import-pictures>导入 ${files.length} 张</button></div>`,
    );
    d.querySelector("[data-import-pictures]")!.addEventListener(
      "click",
      () =>
        void act(async () => {
          const label =
            d.querySelector<HTMLSelectElement>("#upload-class")!.value;
          for (const file of files) {
            if (activeAssets(p()).length >= 240)
              throw Error("当前资料已达240张。");
            const id = crypto.randomUUID(),
              asset: SampleAsset = {
                id,
                group: id,
                source: file.name.slice(0, 100),
                origin: { kind: "pixels", image: await readImage(file) },
              };
            const duplicate = p().assets.find(
              (a) => assetSignature(a) === assetSignature(asset),
            );
            if (duplicate) asset.group = duplicate.group;
            p().assets.push(asset);
            p().dataset.labels[id] = label;
            p().dataset.bags[asset.group] ??= "train";
            if (!p().seenGroups.includes(asset.group))
              p().seenGroups.push(asset.group);
            view.selected = id;
          }
          p().dataset.revision++;
          p().evidence.sampling++;
          d.remove();
          view.notice = "图片已导入，请为每类另留独立验证资料。";
        }),
    );
  }
  if (f.id === "project-file") {
    const file = (f as HTMLInputElement).files?.[0];
    if (file)
      void act(async () => {
        if (file.size > 16_000_000) throw Error("文件超过16MB。");
        const raw = await file.text(),
          value = JSON.parse(raw);
        if (value.schema === "nova-learning-artifact" && value.chapter === 10) {
          const old = importArtifact(raw),
            next = createCreator();
          next.legacy.push({ chapter: 10, raw });
          importLegacyData(next, old);
          await store.import(encodeCreator(next));
        } else await store.import(raw);
        view.selected = "";
        view.page = 0;
        view.notice = "已作为新项目导入，原来的项目保留。";
      });
  }
});
root.addEventListener("dragstart", (e) => {
  const item = (e.target as HTMLElement).closest<HTMLElement>("[data-group]");
  if (item && e.dataTransfer)
    e.dataTransfer.setData("text/plain", item.dataset.group!);
});
root.addEventListener("dragover", (e) => {
  if ((e.target as HTMLElement).closest("[data-bag]")) e.preventDefault();
});
root.addEventListener("drop", (e) => {
  const tray = (e.target as HTMLElement).closest<HTMLElement>("[data-bag]");
  if (tray && e.dataTransfer) {
    e.preventDefault();
    void act(() => {
      const moved = moveGroup(
        p(),
        e.dataTransfer!.getData("text/plain"),
        tray.dataset.bag as Split,
      );
      if (!moved) {
        view.notice = "这组资料已经在此区域，不需要重复移动。";
        return;
      }
      p().evidence.splitChecks++;
      view.notice = "同组资料已整体移动。";
      const source = root.querySelector<HTMLElement>(
        `[data-group="${CSS.escape(e.dataTransfer!.getData("text/plain"))}"]`,
      );
      if (source)
        pulseTransfer(
          source.getBoundingClientRect(),
          tray.getBoundingClientRect(),
        );
    });
  }
});
CreatorStore.open()
  .then((s) => {
    store = s;
    view.feature=chosen()?.model.featureMode??view.feature;
    view.selected = visibleAssets(p(), view)[0]?.id ?? "";
    render();
  })
  .catch((error) => {
    root.innerHTML = `<div class="data-loading"><h1>本机创作库暂时未能打开</h1><p>${h(error instanceof Error ? error.message : String(error))}</p><a href="../../courses/">返回奇点</a></div>`;
  });
