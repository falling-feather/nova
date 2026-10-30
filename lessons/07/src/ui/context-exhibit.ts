import { APPLES, type Course } from "../course/course.ts";
import { compareCouncil, sameCouncilView } from "../course/experiments.ts";
import type { CouncilSnapshot } from "../course/records.ts";
import { button as b, escape as e, icon } from "./dom.ts";

export function contextDock(c: Course) {
  const baseline = c.councilExperiment.a;
  const compatible = baseline && sameCouncilView(baseline, c.councilSnapshot);
  return (
    b(icon("pen") + "改一句话", "open-context") +
    (compatible
      ? b(icon("eye") + "看看变化", "compare-context", "", true)
      : b(
          baseline ? "留住新原句" : "① 留住原句",
          "capture-context",
          "a",
          true,
        )) +
    (c.canUndoMove
      ? b("撤回", "undo-move")
      : b("换一组", "apple-pair", String(1 - c.applePair)))
  );
}

export function contextSurface(c: Course) {
  const window = c.councilWindow,
    alternatives = APPLES[c.applePair];
  const next =
    c.currentText === alternatives.fruit
      ? alternatives.phone
      : alternatives.fruit;
  const baseline = c.councilExperiment.a;
  const current = c.councilSnapshot;
  const stages =
    !baseline || !sameCouncilView(baseline, current)
      ? 0
      : compareCouncil({ a: baseline, b: current })
        ? 2
        : 1;
  const alternate =
    c.id === "12"
      ? `<div class="context-invitation"><span>换个线索试一试</span><button data-cmd="set-context" data-value="${e(next)}" data-context-sentence="${e(next)}" draggable="true">${e(next)}<i aria-hidden="true">↗</i></button><small>拖到桌面，也可以直接点这句话</small></div>`
      : "";
  const paging =
    window.pages > 1
      ? `<div class="context-paging"><span>第 ${window.page + 1} / ${window.pages} 盘 · 整句 ${window.total} 块</span>${b("←", "council-page", String(window.page - 1), false, window.page === 0 ? "disabled" : "")}${b("→", "council-page", String(window.page + 1), false, window.page === window.pages - 1 ? "disabled" : "")}</div>`
      : "";
  return `${alternate}${paging}${c.id === "12" ? `<div class="context-journey" aria-label="对照实验步骤">${["留住原句", "改一个线索", "看看变化"].map((text, i) => `<span class="${i === stages ? "current" : i < stages ? "past" : ""}"><i>${i < stages ? "✓" : i + 1}</i>${text}</span>`).join("<em>—</em>")}</div>` : ""}`;
}

function snapshotMarkup(
  snapshot: CouncilSnapshot,
  label: string,
  bound: number,
  baseline?: CouncilSnapshot,
) {
  const start = Math.max(
    0,
    Math.min(snapshot.query - 5, snapshot.tokens.length - 12),
  );
  const visible = snapshot.tokens.slice(start, start + 12);
  const tokens =
    (start ? '<span class="type-ellipsis">…</span>' : "") +
    visible
      .map(
        (word, j) =>
          `<span class="proof-type ${start + j === snapshot.query ? "query" : ""}" title="第${start + j + 1}个词元">${e(word)}</span>`,
      )
      .join("") +
    (start + 12 < snapshot.tokens.length
      ? '<span class="type-ellipsis">…</span>'
      : "");
  const cells = snapshot.vector
    .slice(0, 16)
    .map((value, i) => {
      const amount = Math.min(1, Math.abs(value) / bound),
        changed = baseline && Math.abs(value - baseline.vector[i]) > 0.01;
      const hue = value >= 0 ? 37 : 164,
        light = 88 - amount * 57;
      return `<i style="--cell:hsl(${hue} ${value >= 0 ? 42 : 28}% ${light.toFixed(1)}%)" class="${changed ? "changed" : ""}" title="第${i + 1}维：${value.toFixed(4)}${baseline ? `；原值 ${baseline.vector[i].toFixed(4)}` : ""}"></i>`;
    })
    .join("");
  return `<section class="comparison-side"><span class="comparison-label">${label}</span><p class="comparison-sentence" title="${e(snapshot.tokens.join(""))}">${e(snapshot.tokens.join(""))}</p><div class="proof-types" aria-label="${label}的词元">${tokens}</div>${snapshot.tokens.length > 12 ? `<small class="long-context-note">展示观察词附近 ${start + 1}—${start + visible.length} 位；完整输入见“查看这次计算”。</small>` : ""}<div class="representation-caption"><span>「${e(snapshot.tokens[snapshot.query])}」的数字表示</span><small>前16维 / 共${snapshot.vector.length}维</small></div><div class="representation-strip" aria-label="${label}数字表示的前16维">${cells}</div><div class="attention-reading"><span>本次最大注意力权重</span>${snapshot.attention
    .slice(0, 1)
    .map(
      (item) =>
        `<div><b>${e(item.word)}</b><i style="--weight:${item.weight * 100}%"></i><em>${(item.weight * 100).toFixed(1)}%</em></div>`,
    )
    .join("")}</div></section>`;
}

/** Both sides use one numerical colour scale; colour never substitutes for the actual values. */
export function contextComparison(c: Course) {
  const pair = c.councilComparison;
  if (!pair)
    return `<p>先留住原句，再改变上下文。比较时保留同一个观察词、同一层和同一个头。</p>${b("回到桌面继续试", "close-modal", "", true)}`;
  const bound = Math.max(
    1,
    ...pair.a.vector.map(Math.abs),
    ...pair.b.vector.map(Math.abs),
  );
  const delta =
    pair.delta !== 0 && pair.delta < 0.0001
      ? pair.delta.toExponential(2)
      : pair.delta.toFixed(4);
  const question =
    c.id === "12"
      ? `<div class="comparison-choice"><span>对照上面的色带和读数，你发现了什么？</span>${b("有变化", "comparison-answer", "diff", false, `aria-pressed="${c.councilExperiment.answer === "diff"}"`)}${b("没有变化", "comparison-answer", "same", false, `aria-pressed="${c.councilExperiment.answer === "same"}"`)}</div>`
      : '<div class="comparison-choice"><span>两份实际输入与读数已经保存。继续改动不会重写这两份留样。</span></div>';
  return `<div class="context-comparison"><p class="comparison-intro">这次只比较「${e(pair.a.tokens[pair.a.query])}」：同一个模型、同一层、同一个头。${b("查看这次计算 ↗", "comparison-detail")}</p><div class="comparison-spread">${snapshotMarkup(pair.a, "原句", bound)}${snapshotMarkup(pair.b, "改后", bound, pair.a)}</div><div class="comparison-conclusion"><div><span>数字表示的变化</span><strong>${c.councilExperiment.answer ? "已留下你的观察" : "同一个词 · 两份表示"}</strong><small>最大格差 ${delta} · 表示余弦 ${pair.similarity.toFixed(4)}</small></div>${question}</div><footer class="comparison-foot"><p>色带展示前16维：金色为正、青色为负，越深绝对值越大。格差与余弦使用完整表示。连线权重是一处计算，不能单独证明模型的完整理由。</p>${b("← 继续改句", "close-modal")}${c.ready && c.needsReview ? b("把发现装进手记", "review", "", true) : ""}</footer></div>`;
}
