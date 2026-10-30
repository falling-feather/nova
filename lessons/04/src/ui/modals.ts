import {
  ACTIVITIES,
  getActivity,
  LABS,
  LESSONS,
  SPEAKERS,
} from "../content/lessons.ts";
import type { WorkshopController } from "../core/controller.ts";
import {
  evaluateActivity,
  finishedResult,
} from "../core/course-state.ts";
import { ITEM_NAMES, ITEM_UNITS } from "../core/graphs.ts";
import { goalCheck } from "../core/simulation.ts";
import type { Attempt, WorkshopState, Workspace } from "../core/app-types.ts";
import type { ActionCard, BoardGraph } from "../core/types.ts";
import { button, el, icon } from "./dom.ts";
import { itemIcon, personPortrait } from "../art/paper-people.ts";
import type { PersonId } from "../art/paper-people.ts";
import type { WorkshopShell } from "./shell.ts";
import { cardText, exportPlanPage } from "./export.ts";
import { screens, recordPages } from "./pages.ts";

export interface ModalHost {
  show(title: string, symbol: string, className?: string): HTMLElement;
  close(): void;
  open(): boolean;
  readonly controller: WorkshopController;
  begin(): void;
  changed(): void;
  notice(): string | null;
}

export function createModalHost(options: {
  shell: WorkshopShell;
  app: HTMLElement;
  controller: WorkshopController;
  begin(): void;
  changed(): void;
  notice(): string | null;
}): ModalHost {
  let modal: HTMLElement | null = null;
  let lastFocus: HTMLElement | null = null;
  const { shell, app } = options;
  const host: ModalHost = {
    controller: options.controller,
    begin: options.begin,
    changed: options.changed,
    notice: options.notice,
    open: () => modal !== null,
    close() {
      modal = null;
      shell.modalHost.replaceChildren();
      shell.panelHost.closest("main")?.removeAttribute("inert");
      app.querySelector("header")?.removeAttribute("inert");
      lastFocus?.focus({ preventScroll: true });
      lastFocus = null;
    },
    show(title, symbol, className = "") {
      options.controller.pause();
      lastFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      shell.panelHost.closest("main")?.setAttribute("inert", "");
      app.querySelector("header")?.setAttribute("inert", "");
      const dialog = el("section", `modal ${className}`.trim());
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "dialog-title");
      const heading = el("div", "modal-header"),
        titleNode = el("h2", "", title);
      titleNode.id = "dialog-title";
      heading.append(icon(symbol), titleNode);
      const close = button("", "close-modal", () => host.close(), "modal-close");
      close.append(icon("close"));
      close.setAttribute("aria-label", "关闭");
      heading.append(close);
      const body = el("div", "modal-body");
      dialog.append(heading, body);
      shell.modalHost.replaceChildren(dialog);
      modal = dialog;
      requestAnimationFrame(() => close.focus());
      return body;
    },
  };
  document.addEventListener("keydown", (event) => {
    if (!modal || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Escape") {
      event.preventDefault();
      host.close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [
      ...modal.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
      ),
      ...app.querySelectorAll<HTMLElement>('.nova-return-host a[href]'),
    ].filter((e) => e.getClientRects().length > 0);
    const first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  return host;
}

/* ------------------------------------------------------------------ */
/* The course map: one road through five lessons                       */
/* ------------------------------------------------------------------ */

export function openCatalogue(host: ModalHost, kind: "course" | "lab") {
  const state = host.controller.state;
  const body = host.show(
    kind === "course" ? "开放日行程：五课，一条路" : "路线实验室",
    kind === "course" ? "book" : "road",
    "journey-modal",
  );
  const journey = el("div", "journey");
  const go = (action: () => void) => {
    host.close();
    host.begin();
    action();
  };
  if (kind === "course") {
    body.append(
      el(
        "p",
        "side-copy",
        "按顺序走，每一站都接着你上一站的结果。走过的站可以随时回去看看。",
      ),
    );
    LESSONS.forEach((lesson, legIndex) => {
      const list = ACTIVITIES.filter((a) => a.lesson === lesson.id);
      const done = list.filter((a) => state.completed.includes(a.id)).length;
      const leg = el(
        "section",
        `journey-leg${legIndex % 2 ? " reverse" : ""}${done === 5 ? " complete" : ""}`,
      );
      const head = el("header", "leg-head");
      const copy = el("div", "leg-copy");
      copy.append(el("h3", "", lesson.title), el("p", "", lesson.mission));
      head.append(
        el("span", "leg-number", String(lesson.id)),
        copy,
        el("span", "leg-count", `${done} / 5`),
      );
      const stops = el("ol", "journey-stops");
      for (const activity of list) {
        const finished = state.completed.includes(activity.id);
        const current =
          state.mode !== "lab" && state.activityId === activity.id;
        const stop = button(
          "",
          `activity-${activity.id}`,
          () => go(() => host.controller.selectActivity(activity.id)),
          `journey-stop${finished ? " done" : ""}${current ? " current" : ""}`,
        );
        const dot = el("span", "stop-dot");
        if (finished) dot.append(icon("check"));
        else dot.textContent = activity.id;
        stop.append(dot, el("strong", "", activity.title), el("span", "", activity.question));
        const li = el("li");
        li.append(stop);
        stops.append(li);
      }
      leg.append(head, stops);
      journey.append(leg);
    });
  } else {
    body.append(
      el(
        "p",
        "side-copy",
        "这里是缩小的校园沙盘，随时可以来玩，不影响课程进度。路面越难走，花的能量越多。",
      ),
    );
    const leg = el("section", "journey-leg lab-leg");
    const stops = el("ol", "journey-stops");
    for (const lab of LABS) {
      const finished = state.labCompleted.includes(lab.id);
      const current = state.mode === "lab" && state.labId === lab.id;
      const stop = button(
        "",
        `lab-${lab.id}`,
        () => go(() => host.controller.selectLab(lab.id)),
        `journey-stop${finished ? " done" : ""}${current ? " current" : ""}`,
      );
      const dot = el("span", "stop-dot");
      if (finished) dot.append(icon("check"));
      else dot.textContent = lab.id;
      stop.append(dot, el("strong", "", lab.title), el("span", "", lab.question));
      const li = el("li");
      li.append(stop);
      stops.append(li);
    }
    leg.append(stops);
    journey.append(leg);
  }
  body.append(journey);
  if (kind === 'course') {
    const pages = [...journey.children].map((leg, index) => ({ id: String(index), label: `第 ${index + 1} 课`, nodes: [leg as HTMLElement] }));
    screens(journey, 'course-map', pages, String(getActivity(state.activityId).lesson - 1));
  } else journey.querySelectorAll<HTMLElement>('.journey-stops').forEach(list => recordPages(list, 4, 'lab-map'));
}

/* ------------------------------------------------------------------ */
/* The notebook: what the learner made, page by page                   */
/* ------------------------------------------------------------------ */

const PERSON_BY_NAME: Record<string, PersonId> = {
  林老师: "lin",
  小满: "xiaoman",
  小雨: "xiaoyu",
  阿乐: "ale",
};

const RULES: [string, string, string][] = [
  ["11", "路障就是过不去", "封了的路，花再多能量也不能走。"],
  ["12", "看不清，先核对", "资料不确定的时候，先停下来查清楚。"],
  ["13", "按格数装车", "道具一件占两格，装不下就分几趟。"],
  ["14", "出发前算能量", "每段路的能量加起来，不能超过预算。"],
  ["15", "办不到就商量", "规则打架时，说清原因，找能做决定的人。"],
];

const CARD_ICON: Record<ActionCard["type"], string> = {
  go: "map",
  take: "book",
  give: "truck",
  confirm: "check",
  check: "help",
  charge: "energy",
};

function planTiles(plan: ActionCard[], graph: BoardGraph, recipient: string) {
  const list = el("ol", "plan-tiles");
  plan.forEach((card, index) => {
    const tile = el("li", `plan-tile type-${card.type}`);
    tile.append(
      el("span", "tile-number", String(index + 1)),
      icon(CARD_ICON[card.type]),
      el("span", "", cardText(card, graph, recipient)),
    );
    list.append(tile);
  });
  return list;
}

/** A small map of one real run: the roads, and the path the robot took. */
export function miniMap(attempt: Attempt): SVGSVGElement {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "30 20 1140 760");
  svg.setAttribute("class", "mini-map");
  svg.setAttribute("aria-hidden", "true");
  const graph = attempt.problem.graph;
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const add = (tag: string, attrs: Record<string, string>) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.append(node);
    return node;
  };
  add("rect", { x: "30", y: "20", width: "1140", height: "760", rx: "28", fill: "#eef2dc" });
  for (const road of graph.roads) {
    const a = nodes.get(road.from),
      b = nodes.get(road.to);
    if (!a || !b) continue;
    add("line", {
      x1: String(a.x),
      y1: String(a.y),
      x2: String(b.x),
      y2: String(b.y),
      stroke: road.closed ? "#e7a28f" : "#d8d3bd",
      "stroke-width": "26",
      "stroke-linecap": "round",
      ...(road.closed ? { "stroke-dasharray": "18 14" } : {}),
    });
  }
  const path = [attempt.problem.start];
  for (const frame of attempt.run.trace)
    if (frame.event === "move" && frame.node !== path.at(-1)) path.push(frame.node);
  const points = path
    .map((id) => nodes.get(id))
    .filter(Boolean)
    .map((node) => `${node!.x},${node!.y}`)
    .join(" ");
  if (path.length > 1)
    add("polyline", {
      points,
      fill: "none",
      stroke: "#168e98",
      "stroke-width": "16",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
  for (const node of graph.nodes)
    add("circle", {
      cx: String(node.x),
      cy: String(node.y),
      r: node.kind === "junction" ? "12" : "20",
      fill: "#fffcf0",
      stroke: "#b5c8b5",
      "stroke-width": "5",
    });
  const end = nodes.get(attempt.run.node);
  if (end)
    add("circle", {
      cx: String(end.x),
      cy: String(end.y),
      r: "24",
      fill: goalCheck(attempt.problem, attempt.run).complete ? "#55b39b" : "#ee856c",
    });
  return svg;
}

function attemptTitle(ws: Workspace): string {
  return ws.id === "project"
    ? "我的校园小方案"
    : ws.id.startsWith("lab:")
      ? `沙盘 · ${LABS.find((l) => l.id === ws.id.slice(4))!.title}`
      : `${ws.id.slice(7)} · ${getActivity(ws.id.slice(7)).title}`;
}

function taskPage(state: WorkshopState): HTMLElement {
  const page = el("div", "notebook-page");
  const ws = state.workspaces["course:01"];
  page.append(el("h3", "page-title", "任务卡"));
  if (!ws || !state.completed.includes("01")) {
    page.append(el("p", "empty-state", "第一课第一站完成后，你填好的任务卡会贴在这里。"));
    return page;
  }
  const card = el("div", "keepsake task-keepsake");
  card.append(
    Object.assign(el("img", "keepsake-face"), {
      src: personPortrait("lin", "happy", 64),
      alt: "",
    }),
  );
  const facts = el("dl", "keepsake-facts");
  for (const [label, key] of [
    ["送什么", "item"],
    ["送到哪", "destination"],
    ["交给谁", "recipient"],
    ["怎样算送完", "completion"],
  ])
    facts.append(el("dt", "", label), el("dd", "", ws.answers[key] ?? "—"));
  card.append(facts);
  page.append(card);
  const choices = state.workspaces["course:05"];
  if (choices && state.completed.includes("05")) {
    const names: Record<string, string> = {
      manual: "自己顺手做",
      fixed: "按固定步骤做",
      planner: "让规划工具比较路线",
    };
    const list = el("ul", "keepsake-list");
    for (const [key, person, text] of [
      ["tool-near", "小雨", "递一支笔"],
      ["tool-fixed", "阿乐", "每天按顺序摆手册"],
      ["tool-changing", "小满", "封路时送道具"],
    ])
      list.append(el("li", "", `${person}：${text} → ${names[choices.answers[key]] ?? "—"}`));
    page.append(el("h4", "page-subtitle", "三张便签，交给谁帮"), list);
    if (choices.note.trim()) page.append(el("blockquote", "keepsake-quote", choices.note));
  }
  return page;
}

function planPage(state: WorkshopState): HTMLElement {
  const page = el("div", "notebook-page");
  page.append(el("h3", "page-title", "我的步骤单"));
  const result =
    finishedResult(state, "10") ??
    finishedResult(state, "09") ??
    finishedResult(state, "08") ??
    finishedResult(state, "07") ??
    finishedResult(state, "06");
  if (!result) {
    page.append(el("p", "empty-state", "第二课里排好的送书步骤，会一张张贴在这里。"));
    return page;
  }
  const goal = result.problem.goal;
  const recipient = goal.type === "delivery" ? goal.recipient : "对方";
  page.append(
    el(
      "p",
      "page-lead",
      `给${recipient}送乐谱书。这是你排好、并让跑跑真正跑通的一份步骤：`,
    ),
    planTiles(result.plan, result.problem.graph, recipient),
  );
  return page;
}

function rulesPage(state: WorkshopState): HTMLElement {
  const page = el("div", "notebook-page");
  page.append(el("h3", "page-title", "规则册"));
  const list = el("div", "rule-book");
  for (const [id, title, text] of RULES) {
    const unlocked = state.completed.includes(id);
    const card = el("div", `rule-card${unlocked ? " unlocked" : ""}`);
    card.append(
      el("span", "rule-stamp", unlocked ? "已发现" : `第 ${id} 站`),
      el("strong", "", unlocked ? title : "？？？"),
      el("p", "", unlocked ? text : "走到这一站，就能发现这条规则。"),
    );
    list.append(card);
  }
  page.append(list);
  return page;
}

function routesPage(state: WorkshopState): HTMLElement {
  const page = el("div", "notebook-page");
  page.append(el("h3", "page-title", "路线笔记"));
  const rows: string[] = [];
  for (const id of ["16", "17", "18", "19", "20"]) {
    const ws = state.workspaces[`course:${id}`];
    if (!ws) continue;
    const trips = ws.attempts.filter((attempt) => attempt.run.trace.length).length;
    rows.push(`${id} ${getActivity(id).title}：跑了 ${trips} 次${state.completed.includes(id) ? "，完成 ✓" : ""}`);
  }
  const labs = state.labCompleted.length;
  if (!rows.length && !labs) {
    page.append(el("p", "empty-state", "第四课和路线实验室里的发现，会记在这里。"));
    return page;
  }
  const list = el("ul", "keepsake-list");
  rows.forEach((row) => list.append(el("li", "", row)));
  if (labs) list.append(el("li", "", `路线实验室：完成了 ${labs} / 8 项实验`));
  page.append(list);
  const note = state.workspaces["course:20"]?.note.trim();
  if (note) page.append(el("h4", "page-subtitle", "我选的路，和我的理由"), el("blockquote", "keepsake-quote", note));
  return page;
}

function projectPage(state: WorkshopState): HTMLElement {
  const page = el("div", "notebook-page");
  const ws = state.workspaces.project;
  page.append(el("h3", "page-title", state.projectTitle || "我的校园小方案"));
  if (!ws) {
    page.append(el("p", "empty-state", "第五课里，你会自己选一个人来帮。方案会放在这里。"));
    return page;
  }
  const goal = ws.problem.goal;
  if (goal.type === "delivery" && ws.answers.person) {
    const person = PERSON_BY_NAME[goal.recipient];
    const head = el("div", "keepsake project-keepsake");
    if (person)
      head.append(
        Object.assign(el("img", "keepsake-face"), {
          src: personPortrait(person, "happy", 64),
          alt: "",
        }),
      );
    head.append(
      el(
        "p",
        "",
        `帮${goal.recipient}把 ${goal.quantity} ${ITEM_UNITS[goal.item]}${ITEM_NAMES[goal.item]}送到${ws.problem.graph.nodes.find((n) => n.id === goal.destination)?.label ?? ""}。`,
      ),
    );
    head.append(
      Object.assign(el("img", "keepsake-item"), { src: itemIcon(goal.item, 44), alt: "" }),
    );
    page.append(head);
  }
  if (state.projectExplanation.trim())
    page.append(el("blockquote", "keepsake-quote", state.projectExplanation));
  if (ws.plan.length && goal.type === "delivery")
    page.append(planTiles(ws.plan, ws.problem.graph, goal.recipient));
  const checked = evaluateActivity(state, ws, "24").complete;
  page.append(
    el(
      "p",
      checked ? "stamp-line ok" : "stamp-line",
      checked ? "平常路况和路况变化，两次检验都做过了。" : "两次检验还没做完。",
    ),
  );
  return page;
}

function logPage(state: WorkshopState): HTMLElement {
  const page = el("div", "notebook-page");
  page.append(el("h3", "page-title", "行车日志"));
  const attempts = Object.values(state.workspaces)
    .flatMap((ws) => ws.attempts.map((attempt) => ({ ws, attempt })))
    .sort((a, b) => b.attempt.at - a.attempt.at)
    .slice(0, 12);
  if (!attempts.length) {
    page.append(el("p", "empty-state", "跑跑每跑一趟，走过的路和遇到的事都会记在这里。"));
    return page;
  }
  const list = el("div", "log-cards");
  for (const { ws, attempt } of attempts) {
    const result = goalCheck(attempt.problem, attempt.run);
    const card = el("details", `log-card${result.complete ? " ok" : ""}`);
    const summary = el("summary");
    summary.append(
      miniMap(attempt),
      el("strong", "", attemptTitle(ws)),
      el(
        "span",
        "",
        `${result.complete ? "完成" : "停下"} · 用了 ${attempt.run.spent} 点能量`,
      ),
    );
    card.append(summary);
    const ol = el("ol", "trace-list");
    for (const frame of attempt.run.trace) ol.append(el("li", "", frame.message));
    card.append(ol);
    list.append(card);
  }
  page.append(list);
  return page;
}

export function openNotebook(host: ModalHost) {
  const state = host.controller.state;
  const body = host.show("作品册", "notebook", "notebook-modal");
  const book = el("div", "notebook");
  const tabs = el("nav", "notebook-tabs");
  tabs.setAttribute("role", "tablist");
  const pages: [string, () => HTMLElement][] = [
    ["任务卡", () => taskPage(state)],
    ["步骤单", () => planPage(state)],
    ["规则册", () => rulesPage(state)],
    ["路线笔记", () => routesPage(state)],
    ["我的方案", () => projectPage(state)],
    ["行车日志", () => logPage(state)],
  ];
  const holder = el("div", "notebook-holder");
  const show = (index: number) => {
    holder.replaceChildren(pages[index][1]());
    holder.querySelectorAll<HTMLElement>('.plan-tiles, .rule-book, .log-cards, .trace-list')
      .forEach(list => recordPages(list, 3, `notebook:${index}:${list.className}`));
    tabs.querySelectorAll("button").forEach((tab, i) => {
      tab.classList.toggle("active", i === index);
      tab.setAttribute("aria-selected", String(i === index));
    });
  };
  pages.forEach(([label], index) => {
    const tab = button(label, `notebook-${index}`, () => show(index), "notebook-tab");
    tab.setAttribute("role", "tab");
    tabs.append(tab);
  });
  book.append(tabs, holder);
  body.append(book);
  const saved = Boolean(
    state.workspaces.project &&
      state.projectSavedKey === state.workspaces.project.baseKey &&
      state.workspaces.project.baseKey,
  );
  const actions = el("div", "notebook-actions");
  actions.append(
    button(
      "导出《我的行动方案》",
      "export-page",
      () => exportPlanPage(state),
      `button ${saved ? "primary" : "secondary"}`,
    ),
    button("导出原始记录", "export-work", () => {
      const data = JSON.stringify(
        {
          title: state.projectTitle,
          explanation: state.projectExplanation,
          completed: state.completed,
          project: state.workspaces.project ?? null,
          experiments: Object.fromEntries(
            Object.entries(state.workspaces).filter(([key]) =>
              key.startsWith("lab:"),
            ),
          ),
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      );
      download("行动工坊-原始记录.json", data, "application/json;charset=utf-8");
    }, "button ghost"),
    button(
      state.workspaces.project ? "继续做我的方案" : "开始我的方案",
      "edit-project",
      () => {
        host.close();
        host.begin();
        host.controller.selectActivity(state.workspaces.project ? "25" : "21");
      },
      "button ghost",
    ),
  );
  body.append(
    actions,
    el(
      "p",
      "small-note",
      "学习记录保存在这台浏览器，可导出带走。作品使用虚构校园资料，不需要填写真实姓名或住址。",
    ),
  );
  show(state.completed.includes("25") ? 4 : 0);
}

export function download(name: string, data: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function openSettings(host: ModalHost) {
  const body = host.show("设置", "settings", "settings-modal");
  const settings = host.controller.state.settings;
  const rows: [keyof typeof settings, string, string][] = [
    ["sound", "操作提示音", "跑跑走路、交东西时有轻轻的提示音。"],
    ["reducedMotion", "减少动画", "跑跑直接出现在路口，棋盘上的小动画都停下。"],
  ];
  for (const [key, label, hint] of rows) {
    const row = el("div", "setting-row");
    const control = el("button", `toggle-chip${settings[key] ? " on" : ""}`);
    control.type = "button";
    control.setAttribute("role", "switch");
    control.setAttribute("aria-checked", String(settings[key]));
    const mark = el("span", "toggle-mark");
    mark.append(icon(settings[key] ? "check" : "plus"));
    control.append(mark, el("span", "", label));
    control.addEventListener("click", () => {
      settings[key] = !settings[key];
      control.classList.toggle("on", settings[key]);
      control.setAttribute("aria-checked", String(settings[key]));
      mark.replaceChildren(icon(settings[key] ? "check" : "plus"));
      host.changed();
    });
    row.append(control, el("p", "small-note", hint));
    body.append(row);
  }
  body.append(
    el(
      "p",
      "side-copy",
      "棋盘：点路口画路线，点一段路改路况。键盘：先点一下棋盘，用方向键选路口，回车确定。步骤卡可以按住左边的点点拖动，也可以用上下箭头挪。",
    ),
    el(
      "p",
      "small-note",
      `能量点是课上用的代价，不是真的电量。跑跑的动作和规划助手找路，都是这台电脑上的规则在计算。人物都是虚构的。${SPEAKERS.paopao.name}只照卡片做事，好主意要靠你。`,
    ),
  );
  const notice = host.notice();
  if (notice) body.append(el("p", "feedback warning", notice));
}
