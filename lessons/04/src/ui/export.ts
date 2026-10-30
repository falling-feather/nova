import { ACTIVITIES, LABS, getActivity } from "../content/lessons.ts";
import { evaluateActivity } from "../core/course-state.ts";
import { ITEM_NAMES, ITEM_UNITS } from "../core/graphs.ts";
import { goalCheck } from "../core/simulation.ts";
import type { Attempt, WorkshopState, Workspace } from "../core/app-types.ts";
import type { ActionCard, BoardGraph } from "../core/types.ts";

/** One action card in plain words, as the robot would read it. */
export function cardText(
  card: ActionCard,
  graph: BoardGraph,
  recipient: string,
): string {
  const place = (id?: string) =>
    graph.nodes.find((node) => node.id === id)?.label ?? "某个地方";
  const item = card.item ?? "book";
  switch (card.type) {
    case "go":
      return `去${place(card.target)}`;
    case "take":
      return `取 ${card.amount ?? 1} ${ITEM_UNITS[item]}${ITEM_NAMES[item]}`;
    case "give":
      return `交给${recipient} ${card.amount ?? 1} ${ITEM_UNITS[item]}`;
    case "confirm":
      return `请${recipient}确认收到`;
    case "check":
      return "先核对资料";
    default:
      return "补充能量";
  }
}

/** The path one real run took, as an SVG string. */
export function miniMapMarkup(attempt: Attempt): string {
  const graph = attempt.problem.graph;
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const parts: string[] = [
    '<rect x="30" y="20" width="1140" height="760" rx="28" fill="#eef2dc"/>',
  ];
  for (const road of graph.roads) {
    const a = nodes.get(road.from),
      b = nodes.get(road.to);
    if (!a || !b) continue;
    parts.push(
      `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${road.closed ? "#e7a28f" : "#d8d3bd"}" stroke-width="26" stroke-linecap="round"${road.closed ? ' stroke-dasharray="18 14"' : ""}/>`,
    );
  }
  const path = [attempt.problem.start];
  for (const frame of attempt.run.trace)
    if (frame.event === "move" && frame.node !== path.at(-1))
      path.push(frame.node);
  const points = path
    .map((id) => nodes.get(id))
    .filter(Boolean)
    .map((node) => `${node!.x},${node!.y}`)
    .join(" ");
  if (path.length > 1)
    parts.push(
      `<polyline points="${points}" fill="none" stroke="#168e98" stroke-width="42" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`,
    );
  for (const node of graph.nodes)
    parts.push(
      `<circle cx="${node.x}" cy="${node.y}" r="${node.kind === "junction" ? 12 : 20}" fill="#fffcf0" stroke="#b5c8b5" stroke-width="5"/>`,
    );
  const end = nodes.get(attempt.run.node);
  if (end)
    parts.push(
      `<circle cx="${end.x}" cy="${end.y}" r="40" fill="${goalCheck(attempt.problem, attempt.run).complete ? "#55b39b" : "#ee856c"}" stroke="#fffcf0" stroke-width="12"/>`,
    );
  // Place names last, with a paper-coloured halo, so the route never hides them.
  for (const node of graph.nodes)
    if (node.kind !== "junction")
      parts.push(
        `<text x="${node.x}" y="${node.y + 74}" font-size="36" text-anchor="middle" fill="#234c61" font-weight="bold" stroke="#fffcf0" stroke-width="10" paint-order="stroke">${escape(node.label)}</text>`,
      );
  return `<svg viewBox="30 20 1140 760" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="跑跑走过的路线">${parts.join("")}</svg>`;
}

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (char) =>
    char === "&"
      ? "&amp;"
      : char === "<"
        ? "&lt;"
        : char === ">"
          ? "&gt;"
          : char === '"'
            ? "&quot;"
            : "&#39;",
  );
}

function lastAttempt(ws: Workspace | undefined, tag?: "normal" | "changed") {
  return ws?.attempts
    .slice()
    .reverse()
    .find((attempt) => (tag ? attempt.tag === tag : true) && attempt.run.trace.length);
}

const RULES: [string, string, string][] = [
  ["11", "路障就是过不去", "封了的路，花再多能量也不能走。"],
  ["12", "看不清，先核对", "资料不确定的时候，先停下来查清楚。"],
  ["13", "按格数装车", "道具一件占两格，装不下就分几趟。"],
  ["14", "出发前算能量", "每段路的能量加起来，不能超过预算。"],
  ["15", "办不到就商量", "规则打架时，说清原因，找能做决定的人。"],
];

/**
 * A printable, self-contained page: the learner's plan, both tests, the rules
 * found along the way and the findings of each finished station.
 */
export function planPageMarkup(state: WorkshopState, now = new Date()): string {
  const ws = state.workspaces.project;
  const goal = ws?.problem.goal;
  const title = state.projectTitle.trim() || "我的行动方案";
  const date = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
  const sections: string[] = [];
  if (ws && goal?.type === "delivery") {
    const to = ws.problem.graph.nodes.find((n) => n.id === goal.destination)?.label ?? "";
    const from = ws.problem.graph.nodes.find((n) => n.id === goal.source)?.label ?? "";
    sections.push(
      `<section><h2>我帮谁</h2><p class="lead">帮<b>${escape(goal.recipient)}</b>把 ${goal.quantity} ${ITEM_UNITS[goal.item]}${ITEM_NAMES[goal.item]}从${escape(from)}送到${escape(to)}。</p>${state.projectExplanation.trim() ? `<blockquote>${escape(state.projectExplanation)}</blockquote>` : ""}</section>`,
    );
    if (ws.plan.length)
      sections.push(
        `<section><h2>我的步骤</h2><ol class="tiles">${ws.plan.map((card) => `<li>${escape(cardText(card, ws.problem.graph, goal.recipient))}</li>`).join("")}</ol></section>`,
      );
    const normal = lastAttempt(ws, "normal");
    const changed = lastAttempt(ws, "changed");
    const verdict = (attempt?: Attempt) =>
      !attempt
        ? "还没检验"
        : goalCheck(attempt.problem, attempt.run).complete
          ? `送到了，用了 ${attempt.run.spent} 点能量`
          : `停下了：${escape(attempt.run.message)}`;
    sections.push(
      `<section><h2>两次检验</h2><div class="tests"><div><h3>① 平常的路况</h3><p>${verdict(normal)}</p>${normal ? miniMapMarkup(normal) : ""}</div><div><h3>② 路况变了</h3><p>${verdict(changed)}</p>${changed ? miniMapMarkup(changed) : ""}</div></div>${ws.note.trim() ? `<p class="note">我的说明：${escape(ws.note)}</p>` : ""}<p class="small">${evaluateActivity(state, ws, "24").complete ? "两次检验都做过了。" : "检验还没全部做完。"}</p></section>`,
    );
  } else {
    sections.push(
      `<section><h2>我帮谁</h2><p class="lead">第五课还没开始。先走完前面的课，再回来做自己的方案。</p></section>`,
    );
  }
  const rules = RULES.filter(([id]) => state.completed.includes(id));
  if (rules.length)
    sections.push(
      `<section><h2>我发现的规则</h2><ul class="rules">${rules.map(([, name, text]) => `<li><b>${name}</b>${text}</li>`).join("")}</ul></section>`,
    );
  const found = ACTIVITIES.filter((activity) =>
    state.completed.includes(activity.id),
  );
  if (found.length)
    sections.push(
      `<section><h2>一路上的发现</h2><ol class="finds">${found.map((activity) => `<li><span>${activity.id} ${escape(getActivity(activity.id).title)}</span>${escape(activity.discovery)}</li>`).join("")}</ol></section>`,
    );
  if (state.labCompleted.length)
    sections.push(
      `<section><h2>路线实验室</h2><p>完成了 ${state.labCompleted.length} / ${LABS.length} 项：${LABS.filter((lab) => state.labCompleted.includes(lab.id)).map((lab) => escape(lab.title)).join("、")}。</p></section>`,
    );
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)} · 行动工坊</title>
<style>
:root{--ink:#163e56;--soft:#58717a;--paper:#fffcf3;--line:#e5dcc8;--teal:#168e98;--coral:#dc6248}
*{box-sizing:border-box}body{margin:0;background:#e9c99a;font-family:"Microsoft YaHei","PingFang SC",system-ui,sans-serif;color:var(--ink)}
main{max-width:860px;margin:32px auto;padding:40px 48px;background:var(--paper);border-radius:20px;box-shadow:0 4px 0 #b88b5a55,0 16px 40px #6b45201f}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px dashed var(--line);padding-bottom:16px;margin-bottom:8px}
h1{margin:0;font-size:34px}header p{margin:0;color:var(--soft)}
h2{font-size:20px;margin:28px 0 10px;padding-left:12px;border-left:6px solid var(--teal)}
h3{font-size:16px;margin:0 0 6px}.lead{font-size:18px}
blockquote{margin:12px 0;padding:12px 16px;background:#fff6dc;border-radius:12px;font-size:16px;line-height:1.7}
.tiles{display:flex;flex-wrap:wrap;gap:10px;padding:0;list-style:none;counter-reset:t}
.tiles li{counter-increment:t;background:#fff;border:2px solid var(--line);border-radius:12px;padding:8px 12px 8px 8px;font-weight:600}
.tiles li::before{content:counter(t);display:inline-grid;place-items:center;width:24px;height:24px;margin-right:8px;border-radius:50%;background:var(--teal);color:#fff;font-size:13px}
.tests{display:grid;grid-template-columns:1fr 1fr;gap:16px}.tests>div{background:#fff;border:2px solid var(--line);border-radius:14px;padding:12px}
.tests svg{width:100%;height:auto;border-radius:10px;margin-top:6px}
.rules,.finds{padding-left:20px;line-height:1.8}.rules b{margin-right:8px;color:var(--coral)}
.finds li span{display:block;font-size:13px;color:var(--soft)}
.note{background:#eef6f1;border-radius:10px;padding:10px 14px}.small{color:var(--soft);font-size:13px}
footer{margin-top:28px;color:var(--soft);font-size:13px;border-top:2px dashed var(--line);padding-top:12px}
@media print{body{background:#fff}main{box-shadow:none;margin:0}}
@media (max-width:640px){main{padding:24px 18px;margin:0;border-radius:0}.tests{grid-template-columns:1fr}}
</style></head><body><main>
<header><div><p>NOVA 奇点 · 第四章 行动工坊</p><h1>${escape(title)}</h1></div><p>${date}</p></header>
${sections.join("\n")}
<footer>这份方案在“行动工坊”里做成：跑跑照着步骤卡执行，规划助手按地图和路况找路，判断和检查由我来做。人物与校园都是虚构的。</footer>
</main></body></html>`;
}

export function exportPlanPage(state: WorkshopState) {
  const html = planPageMarkup(state);
  const url = URL.createObjectURL(
    new Blob([html], { type: "text/html;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `行动工坊-${state.projectTitle.trim() || "我的行动方案"}.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
