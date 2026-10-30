import { el, button, select } from "./tool-dom.ts";
import type { TaskSession } from "./task-context.ts";
import { nameOf } from "./task-context.ts";
import { KNOWN_KINDS, KIND_NAMES } from "../media/types.ts";
import type { KnownKind } from "../media/types.ts";
import { createBiasedExamples } from "../media/specimens.ts";
import { fitExamples, predictImage } from "../media/classifier.ts";
import { addExample } from "../core/state.ts";
import { datasetKey } from "../core/dataset.ts";

export function learningTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "learning-station");
  const kind = ctx.activity.kind;
  const board = el("div", "learning-board");
  const book = el("div", "book-summary");
  const brain = el("div", "brain-summary");
  board.append(book, el("span", "learning-arrow", "重新学 →"), brain);
  const grid = el("div", "example-grid");
  const pagination = el("div", "example-pagination");
  const pageCount = el("span");
  const move = (delta: number) => {
    ctx.progress.exampleIndex = Math.max(0, Math.min(ctx.state.examples.length - 1, (ctx.progress.exampleIndex ?? 0) + delta));
    render(); ctx.changed();
  };
  const previous = button("← 上一张", "example-previous", () => move(-1), "button subtle");
  const next = button("下一张 →", "example-next", () => move(1), "button subtle");
  pagination.append(previous, pageCount, next);
  const actions = el("div", "tool-actions");
  if (kind === "repair" || kind === "bias")
    actions.append(
      button(
        "打开邮差送来的例子册",
        "open-packet",
        () => {
          const packet = createBiasedExamples();
          // The upright car is the one a typical photo leans on, so its wrong
          // label really changes the answer (measured, not forced).
          if (kind === "repair") packet[1].label = "block";
          ctx.comparisonModel = fitExamples(packet, 0);
          ctx.beforeModel = structuredClone(ctx.comparisonModel);
          ctx.progress.beforeVersion = 0;
          ctx.progress.exampleIndex = ctx.state.examples.length;
          for (const sample of packet)
            addExample(ctx.state, { ...sample, id: `${kind}-${sample.id}` });
          ctx.record("packet", kind);
          ctx.say(
            kind === "repair"
              ? "邮差的例子放进来了。其中有一张标签贴错了——把每张照片和它的名字对一对。"
              : "邮差的例子放进来了：小车全在蓝纸上，积木全在黄纸上。拍几张换了背景的补进去吧。",
          );
          render();
        },
        "button primary",
      ),
    );
  actions.append(
    button("保存例子册", "save-album", () => {
      if (
        ctx.state.examples.length < 4 ||
        new Set(ctx.state.examples.map((e) => e.label)).size < 2
      ) {
        ctx.say("例子册里至少要有两类东西、一共四个例子，才能保存。");
        return;
      }
      ctx.record("albumSave", ctx.state.examples.map((e) => e.id).join("|"));
      ctx.say(
        `例子册存好了，一共 ${ctx.state.examples.length} 个例子。小助手要等“重新学”以后才会用上它们。`,
      );
    }),
  );
  if (kind !== "album")
    actions.append(
      button(
        "让小助手重新学",
        "train",
        () => {
          if (ctx.train()) render();
        },
        "button primary",
      ),
      button("比一比学前学后", "compare-models", () => {
        if (!ctx.current) {
          ctx.say("先去观察台拍一张照片，用它来比一比。");
          return;
        }
        const before = ctx.beforeModel ?? ctx.state.models.at(-2) ?? ctx.model(),
          after = ctx.model();
        const a = predictImage(ctx.current.features, before),
          b = predictImage(ctx.current.features, after);
        ctx.record("compare", `${before.version}:${after.version}:${ctx.current.id}`);
        ctx.show({
          kind: "versions",
          before: a,
          after: b,
          beforeVersion: before.version,
          afterVersion: after.version,
          image: ctx.current.image,
        });
      }),
    );
  let renderedKey = "";
  function render() {
    const latest = ctx.state.models.at(-1);
    const stale = !latest || datasetKey(latest.examples) !== datasetKey(ctx.state.examples);
    const classes = new Set(ctx.state.examples.map((e) => e.label));
    book.replaceChildren(
      el("span", "summary-kicker", "例子册（草稿）"),
      el("strong", "", `${ctx.state.examples.length} 个例子`),
      el("span", "", `${classes.size} 类：${[...classes].map((k) => KIND_NAMES[k]).join("、") || "还没有"}`),
    );
    brain.replaceChildren(
      el("span", "summary-kicker", "小助手学会的"),
      el("strong", "", `第 ${latest?.version ?? 0} 版`),
      el(
        "span",
        stale ? "summary-warn" : "summary-ok",
        stale ? "例子册改过了，还没重新学" : "和例子册一致",
      ),
    );
    const index = Math.max(0, Math.min(ctx.state.examples.length - 1, ctx.progress.exampleIndex ?? 0));
    pageCount.textContent = ctx.state.examples.length ? `${index + 1} / ${ctx.state.examples.length}` : "还没有例子";
    previous.disabled = index === 0; next.disabled = index >= ctx.state.examples.length - 1;
    const key = `${index}:` + ctx.state.examples.map((e) => `${e.id}:${e.label}`).join("|");
    if (key === renderedKey) return;
    renderedKey = key;
    grid.replaceChildren();
    for (const sample of ctx.state.examples.slice(index, index + 1)) {
      const card = el("article", "example-card");
      const visitor = sample.id.startsWith("repair-") || sample.id.startsWith("bias-");
      card.classList.toggle("is-visitor", visitor);
      const img = el("img");
      img.src = sample.image;
      img.alt = "例子照片";
      const chooser = select(
        "标签",
        KNOWN_KINDS.map((k) => ({ value: k, label: KIND_NAMES[k] })),
        sample.label,
        (v) => {
          const prior = sample.label;
          sample.label = v as KnownKind;
          if (prior !== sample.label) {
            const reference = KNOWN_KINDS.find((k) =>
              sample.source.includes(`「${KIND_NAMES[k]}」`),
            );
            if (reference === sample.label) {
              ctx.record("exampleRelabel", sample.id);
              ctx.say(`改好了：这张其实是「${nameOf(sample.label)}」。别忘了让小助手重新学。`);
            } else ctx.say("标签改了。小助手学会的版本还没变，要重新学才算数。");
            ctx.changed();
          }
        },
      );
      chooser.classList.add("example-label");
      chooser.querySelector("select")!.dataset.exampleId = sample.id;
      const source = el("details", "example-source");
      source.append(el("summary", "", "查资料"), el("p", "", sample.source));
      card.append(img, el("span", "example-stamp", visitor ? "邮差寄来" : "我拍的"), chooser, source);
      grid.append(card);
    }
    if (!ctx.state.examples.length)
      grid.append(
        el("p", "empty-tool", "例子册还是空的。去观察台拍照、贴好标签，再点“放进例子册”。"),
      );
  }
  ctx.listeners.add(render);
  pane.append(board, actions, grid, pagination);
  render();
  return pane;
}

export function evaluationTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "evaluation-station");
  const lock = el("p", "exam-lock");
  const actions = el("div", "tool-actions");
  actions.append(
    button("封存这一版", "freeze", () => {
      ctx.frozenModel = structuredClone(ctx.model());
      ctx.record("freeze", String(ctx.frozenModel.version));
      ctx.say(`第 ${ctx.frozenModel.version} 版封存好了。考试期间它不会再学新东西。`);
      paint();
    }),
    button("考一张老照片", "test-known", () => ctx.evaluate(false)),
    button("抽一张没见过的新照片", "test-heldout", () => ctx.evaluate(true), "button primary"),
  );
  const results = el("div", "exam-results");
  let count = -1;
  function paint() {
    lock.textContent = ctx.frozenModel
      ? `考试用的是封存好的第 ${ctx.frozenModel.version} 版`
      : `现在考的是第 ${ctx.model().version} 版（还没封存）`;
    lock.classList.toggle("is-locked", !!ctx.frozenModel);
    if (count === ctx.state.results.length) return;
    count = ctx.state.results.length;
    results.replaceChildren();
    const mine = ctx.state.results.filter((r) => r.activityId === ctx.activity.id).slice(-6).reverse();
    for (const record of mine) {
      const right = record.expected === record.predicted;
      const row = el("div", `exam-row ${right ? "is-right" : "is-wrong"}`);
      const img = el("img");
      img.src = record.image;
      img.alt = "考试照片";
      row.append(
        img,
        el("span", "exam-kind", record.heldout ? "新照片" : "老照片"),
        el("span", "exam-text", `答案 ${nameOf(record.expected)} · 小助手答 ${nameOf(record.predicted)}`),
        el("span", "exam-mark", right ? "✓" : "✗"),
      );
      results.append(row);
    }
    if (!mine.length) results.append(el("p", "empty-tool", "考过的题会排在这里，对的错的都留着。"));
  }
  pane.append(
    el("p", "station-lead", "新照片会先确认没在例子册里出现过；考过的照片也不会偷偷放进例子册。"),
    lock,
    actions,
    results,
  );
  ctx.listeners.add(paint);
  paint();
  return pane;
}
