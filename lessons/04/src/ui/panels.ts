import {
  ACTIVITIES,
  DETOUR_CARD_ID,
  getActivity,
  LABS,
  LESSONS,
  SPEAKERS,
} from "../content/lessons.ts";
import type { SpeakerId } from "../content/lessons.ts";
import {
  evaluateActivity,
  evaluateLab,
  routeContext,
} from "../core/course-state.ts";
import type { CompletionResult } from "../core/course-state.ts";
import { ITEM_NAMES, ITEM_UNITS, ITEM_WEIGHTS } from "../core/graphs.ts";
import { roadBetween } from "../core/planner.ts";
import { goalCheck } from "../core/simulation.ts";
import type { PanelTab } from "../core/app-types.ts";
import type { ActionCard, ItemId, Objective, Road } from "../core/types.ts";
import type {
  PanelCommand,
  PanelDispatch,
  PanelView,
} from "./panel-contracts.ts";
import { button, el, field, icon } from "./dom.ts";
import { itemIcon, personPortrait } from "../art/paper-people.ts";
import type { PersonId } from "../art/paper-people.ts";
import { SURFACES } from "../render/paper.ts";
import { screens, recordPages, activateScreen, type Screen } from "./pages.ts";

interface PanelContext {
  view: PanelView;
  dispatch: PanelDispatch;
  activityId: string;
  laboratory: boolean;
  project: boolean;
  editingDisabled: boolean;
}

interface RenderMemory {
  context: string;
  /** Whether the discovery card was already showing. */
  celebrating: boolean;
}
const renderMemory = new WeakMap<HTMLElement, RenderMemory>();
/** Which card's place/item picker is open, and whether “更多工具” is shown. */
const uiState = {
  picker: "",
  allTools: new Set<string>(),
  /** Cards being circled as one group to repeat: first and last card ids. */
  group: null as null | { start: string | null; end: string | null },
  selectedCard: undefined as string | undefined,
};

/** Index range of the circled group in the plan, if any. */
function groupRange(plan: ActionCard[]): [number, number] | null {
  const group = uiState.group;
  if (!group?.start) return null;
  const a = plan.findIndex((card) => card.id === group.start);
  const b = group.end ? plan.findIndex((card) => card.id === group.end) : a;
  if (a < 0 || b < 0) return null;
  return [Math.min(a, b), Math.max(a, b)];
}

const ACTIONS: readonly {
  type: ActionCard["type"];
  verb: string;
  label: string;
  icon: string;
}[] = [
  { type: "go", verb: "去", label: "去一个地方", icon: "map" },
  { type: "take", verb: "取", label: "取物品", icon: "book" },
  { type: "give", verb: "交给", label: "交给对方", icon: "truck" },
  { type: "confirm", verb: "确认", label: "确认收到", icon: "check" },
  { type: "check", verb: "核对", label: "先核对资料", icon: "help" },
  { type: "charge", verb: "补充", label: "补充能量", icon: "energy" },
];
const ITEMS: readonly ItemId[] = ["book", "guide", "prop"];
const CONDITION_OPTIONS: readonly [string, string][] = [
  ["arrive", "到达音乐教室"],
  ["give", "交到林老师手上"],
  ["confirm", "林老师说“收到了”"],
];
const PERSON_BY_NAME: Record<string, PersonId> = {
  林老师: "lin",
  小满: "xiaoman",
  小雨: "xiaoyu",
  阿乐: "ale",
  施工队: "crew",
};

function focused<T extends HTMLElement>(element: T, key: string): T {
  element.dataset.focus = key;
  return element;
}

function commandButton(
  context: PanelContext,
  label: string,
  action: string,
  command: PanelCommand | (() => PanelCommand),
  className = "button secondary",
  disabled = context.editingDisabled,
  iconName?: string,
): HTMLButtonElement {
  const control = focused(
    button(
      label,
      action,
      () =>
        context.dispatch(typeof command === "function" ? command() : command),
      className,
    ),
    action,
  );
  control.disabled = disabled;
  if (iconName) control.prepend(icon(iconName));
  return control;
}

function textControl(
  context: PanelContext,
  key: string,
  value: string,
  placeholder: string,
  command: (value: string) => PanelCommand,
  multiline = false,
): HTMLInputElement | HTMLTextAreaElement {
  const control = focused(
    multiline ? el("textarea", "input") : el("input", "input"),
    key,
  );
  control.value = value;
  control.placeholder = placeholder;
  control.maxLength = multiline ? 600 : 80;
  if (control instanceof HTMLTextAreaElement) control.rows = 3;
  control.disabled = context.editingDisabled;
  control.addEventListener("input", () => {
    const change = command(control.value);
    context.dispatch(
      change.type === "answer" ? { ...change, live: true } : change,
    );
  });
  control.addEventListener("change", () => context.dispatch({ type: "settle" }));
  return control;
}

/** A large on/off paper toggle; never a bare browser checkbox. */
function toggle(
  key: string,
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
  disabled = false,
  iconName = "check",
): HTMLButtonElement {
  const control = focused(
    el("button", `toggle-chip${checked ? " on" : ""}`),
    key,
  );
  control.type = "button";
  control.setAttribute("role", "switch");
  control.setAttribute("aria-checked", String(checked));
  control.disabled = disabled;
  const mark = el("span", "toggle-mark");
  mark.append(icon(checked ? iconName : "plus"));
  control.append(mark, el("span", "", label));
  control.addEventListener("click", () => onChange(!checked));
  return control;
}

/** − value + : big touch targets for small numbers. */
function stepper(
  key: string,
  label: string,
  value: number,
  min: number,
  max: number,
  unit: string,
  onChange: (value: number) => void,
  disabled = false,
): HTMLElement {
  const wrap = el("div", "stepper");
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", label);
  const less = focused(el("button", "stepper-button"), `${key}-less`);
  less.type = "button";
  less.append(icon("minus"));
  less.setAttribute("aria-label", `${label}减一`);
  less.disabled = disabled || value <= min;
  less.addEventListener("click", () => onChange(value - 1));
  const more = focused(el("button", "stepper-button"), `${key}-more`);
  more.type = "button";
  more.append(icon("plus"));
  more.setAttribute("aria-label", `${label}加一`);
  more.disabled = disabled || value >= max;
  more.addEventListener("click", () => onChange(value + 1));
  const output = el("output", "stepper-value", `${value}`);
  output.append(el("small", "", unit));
  wrap.append(less, output, more);
  return wrap;
}

function section(title: string, iconName?: string): HTMLElement {
  const element = el("section", "panel-section");
  const heading = el("h3", "section-heading", title);
  if (iconName) heading.prepend(icon(iconName));
  element.append(heading);
  return element;
}

function details(key: string, label: string, open = false): HTMLDetailsElement {
  const element = el("details", "panel-details");
  element.dataset.panelDetail = key;
  element.open = open;
  const summary = focused(el("summary", "", label), `detail-${key}`);
  element.append(summary);
  return element;
}

function img(src: string, className: string, alt = ""): HTMLImageElement {
  const image = el("img", className);
  // The panel re-renders while the robot moves; decoding in step with the
  // paint keeps cached portraits from blinking blank for a frame.
  image.decoding = "sync";
  image.src = src;
  image.alt = alt;
  return image;
}

function nodeName(context: PanelContext, id: string): string {
  const node = context.view.ws.problem.graph.nodes.find(
    (item) => item.id === id,
  );
  return node?.label && !["？", "?"].includes(node.label)
    ? node.label
    : "看不清名字的楼";
}

function roadName(context: PanelContext, road: Road): string {
  return `${nodeName(context, road.from)} — ${nodeName(context, road.to)}`;
}

function itemLabel(item: ItemId, amount?: number): string {
  return amount === undefined
    ? ITEM_NAMES[item]
    : `${amount} ${ITEM_UNITS[item]}${ITEM_NAMES[item]}`;
}

function appendNote(
  context: PanelContext,
  parent: HTMLElement,
  label = "我的想法",
  placeholder = "我这样安排，是因为……",
): void {
  parent.append(
    field(
      label,
      textControl(
        context,
        "reflection",
        context.view.ws.note,
        placeholder,
        (value) => ({ type: "note", value }),
        true,
      ),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Top of the panel: who is speaking, and what to do next              */
/* ------------------------------------------------------------------ */

function currentSpeech(context: PanelContext): { who: SpeakerId; text: string } {
  const feedback = context.view.feedback;
  if (feedback) {
    const match = /^(林老师|小满|小雨|阿乐|施工队)：(.*)$/s.exec(feedback.text);
    if (match)
      return {
        who: PERSON_BY_NAME[match[1]] as SpeakerId,
        text: match[2],
      };
    return { who: "paopao", text: feedback.text };
  }
  if (context.laboratory) {
    const lab = LABS.find((item) => item.id === context.view.state.labId)!;
    return { who: "paopao", text: lab.line };
  }
  const activity = getActivity(context.activityId);
  return { who: activity.speaker, text: activity.line };
}

function portrait(who: SpeakerId): HTMLElement {
  const frame = el("span", `speaker-portrait speaker-${who}`);
  if (who === "paopao")
    frame.append(
      img(`${import.meta.env.BASE_URL}assets/paper-campus/robot-face.png`, "robot-face"),
    );
  else frame.append(img(personPortrait(who as PersonId, "idle", 52), ""));
  return frame;
}

function renderSpeech(context: PanelContext): HTMLElement {
  const { who, text } = currentSpeech(context);
  const box = el(
    "div",
    `speech${context.view.feedback && !context.view.feedback.good ? " concern" : ""}`,
  );
  box.setAttribute("aria-live", "polite");
  const bubble = el("div", "speech-bubble");
  bubble.append(el("strong", "speech-name", SPEAKERS[who].name), el("p", "", text));
  box.append(portrait(who), bubble);
  return box;
}

function renderIntro(context: PanelContext): HTMLElement {
  const { state, ws } = context.view;
  const intro = el("header", "panel-intro");
  const top = el("div", "panel-eyebrow-row");
  if (context.laboratory) {
    const index = LABS.findIndex((item) => item.id === state.labId) + 1;
    top.append(el("span", "panel-eyebrow", `路线实验室 · 第 ${index} 项`));
    intro.append(top, el("h2", "panel-title", LABS[index - 1].title));
    return intro;
  }
  const activity = getActivity(context.activityId);
  top.append(
    el(
      "span",
      "panel-eyebrow",
      `第 ${activity.lesson} 课 · ${activity.id} / 25`,
    ),
  );
  if (activity.carryFrom && !context.project) {
    const carried = ws.origin === "carried";
    const badge = el(
      "span",
      `origin-badge${carried ? " carried" : ""}`,
      carried ? "接着你上一环节的结果" : "用的是参考步骤",
    );
    badge.title = carried
      ? `从第 ${activity.carryFrom} 环节你自己完成的安排接着来`
      : `第 ${activity.carryFrom} 环节完成后，这里会接上你自己的安排`;
    top.append(badge);
  }
  intro.append(top, el("h2", "panel-title", activity.title));
  return intro;
}

function evaluate(context: PanelContext): CompletionResult {
  const { state, ws } = context.view;
  return context.laboratory
    ? evaluateLab(state, ws, state.labId)
    : evaluateActivity(state, ws, context.activityId);
}

function renderSteps(context: PanelContext, result: CompletionResult): HTMLElement {
  const list = el("ol", "step-track");
  list.setAttribute("aria-label", "这一环节的步骤");
  const current = result.steps.findIndex((step) => !step.done);
  result.steps.forEach((step, index) => {
    const state = step.done ? "done" : index === current ? "current" : "later";
    const item = el("li", `step-item ${state}`);
    const mark = el("span", "step-mark");
    if (step.done) mark.append(icon("check"));
    else mark.textContent = String(index + 1);
    const copy = el("div", "step-copy");
    copy.append(el("strong", "", step.label));
    if (state === "current") copy.append(el("span", "step-hint", step.hint));
    item.append(mark, copy);
    list.append(item);
  });
  return list;
}

function nextActivity(context: PanelContext): { id: string; title: string } | null {
  if (context.laboratory) {
    const index = LABS.findIndex((lab) => lab.id === context.view.state.labId);
    const next = LABS[index + 1];
    return next ? { id: next.id, title: next.title } : null;
  }
  const index = ACTIVITIES.findIndex((a) => a.id === context.activityId);
  const next = ACTIVITIES[index + 1];
  return next ? { id: next.id, title: next.title } : null;
}

function renderCelebration(context: PanelContext): HTMLElement {
  const lab = context.laboratory;
  const activity = lab ? null : getActivity(context.activityId);
  const card = el("section", "discovery-card");
  card.setAttribute("role", "status");
  const head = el("div", "discovery-head");
  head.append(icon("star"), el("span", "", lab ? "实验完成" : "新发现"));
  card.append(head);
  card.append(
    el(
      "p",
      "discovery-text",
      lab ? "这项实验的检验记录已经留在作品册里。" : activity!.discovery,
    ),
  );
  if (activity?.world) card.append(el("p", "discovery-world", activity.world));
  const next = nextActivity(context);
  const row = el("div", "discovery-actions");
  if (next)
    row.append(
      commandButton(
        context,
        `下一站：${next.title}`,
        "next-activity",
        { type: "next" },
        "button primary",
        false,
        "next",
      ),
    );
  row.append(
    commandButton(
      context,
      "再玩一会儿",
      "stay-here",
      { type: "dismissCelebration" },
      "button ghost",
      false,
    ),
  );
  card.append(row);
  return card;
}

function renderTabs(context: PanelContext): HTMLElement | null {
  const { ws } = context.view;
  const all: [PanelTab, string, string][] = [
    ["task", "任务", "target"],
    ["steps", "步骤", "notebook"],
    ["rules", "规则", "rule"],
    ["routes", "路线", "road"],
  ];
  if (context.project) all.push(["project", "作品", "book"]);
  const primary: PanelTab[] = context.laboratory
    ? ["routes", "rules"]
    : getActivity(context.activityId).tools;
  const memory = context.laboratory
    ? `lab:${context.view.state.labId}`
    : context.activityId;
  const showAll = uiState.allTools.has(memory);
  const visible = all.filter(([tab]) => showAll || primary.includes(tab) || ws.tab === tab);
  if (visible.length <= 1 && !all.some(([tab]) => !primary.includes(tab)))
    return null;
  const tabs = el("div", `tool-tabs${showAll ? ' is-expanded' : ''}`);
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "工具");
  for (const [tab, label, glyph] of visible) {
    const selected = ws.tab === tab;
    const control = commandButton(
      context,
      label,
      `tab-${tab}`,
      () => { uiState.allTools.delete(memory); return { type: "tab", tab }; },
      `tool-tab${selected ? " active" : ""}${primary.includes(tab) ? "" : " extra"}`,
      false,
      glyph,
    );
    control.setAttribute("role", "tab");
    control.setAttribute("aria-selected", String(selected));
    tabs.append(control);
  }
  if (all.length > visible.length) {
    const more = button("更多工具", "more-tools", () => {
      uiState.allTools.add(memory);
      context.dispatch({ type: "tab", tab: ws.tab });
    }, "tool-more");
    tabs.append(more);
  }
  return tabs;
}

/* ------------------------------------------------------------------ */
/* Task tab                                                            */
/* ------------------------------------------------------------------ */

function taskBrief(context: PanelContext): HTMLElement {
  const { problem } = context.view.ws;
  const card = el("div", "task-brief");
  if (problem.goal.type === "delivery") {
    const goal = problem.goal;
    const person = PERSON_BY_NAME[goal.recipient];
    if (person) card.append(img(personPortrait(person, "idle", 40), "brief-face"));
    const copy = el("div", "brief-copy");
    copy.append(
      el(
        "strong",
        "",
        `${goal.recipient}要 ${itemLabel(goal.item, goal.quantity)}`,
      ),
      el(
        "span",
        "",
        nodeName(context, goal.destination) === "看不清名字的楼"
          ? `${nodeName(context, goal.source)} → 音乐教室（地图上看不清）`
          : `${nodeName(context, goal.source)} → ${nodeName(context, goal.destination)}`,
      ),
    );
    card.append(copy, img(itemIcon(goal.item, 36), "brief-item"));
  } else {
    const route = routeContext(context.view.ws);
    const copy = el("div", "brief-copy");
    copy.append(
      el(
        "strong",
        "",
        `${nodeName(context, route.start)} → ${nodeName(context, route.goal)}`,
      ),
      el(
        "span",
        "",
        `能量预算 ${route.budget} 点 · ${problem.objective === "fewestSteps" ? "少走几段" : "少花能量"}${problem.requireRamp ? " · 必须走坡道" : ""}`,
      ),
    );
    card.append(copy);
  }
  return card;
}

function renderQuestions(context: PanelContext, parent: HTMLElement): void {
  const { ws } = context.view;
  const note = el("div", "paper-note");
  note.append(el("span", "note-pin"), el("p", "", "帮我送一下。"), el("span", "note-sign", "—— 林"));
  parent.append(note);
  // Before the lesson starts the four fields are locked; say where they come from.
  if (!context.view.started) parent.append(el("p", "ask-locked-hint", "先去看看便签，委托会出现在这里"));
  const prompts: [string, string][] = [
    ["item", "要送什么？"],
    ["destination", "送到哪里？"],
    ["recipient", "交给谁？"],
    ["completion", "怎样才算送完？"],
  ];
  const list = el("div", "ask-list");
  for (const [key, text] of prompts) {
    const asked = ws.asked.includes(key);
    const card = commandButton(
      context,
      "",
      `ask-${key}`,
      { type: "ask", field: key },
      `ask-card${asked ? " answered" : ""}`,
      context.editingDisabled,
    );
    card.append(el("strong", "ask-question", text));
    if (asked) {
      const answer = el("span", "ask-answer");
      answer.append(
        img(personPortrait("lin", "idle", 26), "ask-face"),
        el("span", "", ws.answers[key] ?? ""),
      );
      card.append(answer);
    } else card.append(el("span", "ask-hint", "点一下，问问林老师"));
    list.append(card);
  }
  parent.append(
    list,
    commandButton(
      context,
      ws.problem.factsKnown ? "任务卡填好了" : "填好任务卡",
      "verify-task",
      { type: "verify" },
      "button secondary wide",
      context.editingDisabled ||
        prompts.some(([key]) => !ws.asked.includes(key)) ||
        ws.problem.factsKnown,
      "check",
    ),
  );
}

function renderMaterials(context: PanelContext, parent: HTMLElement): void {
  const { ws } = context.view;
  const goal = ws.problem.goal;
  parent.append(el("p", "lead", "图书角的架子上放着这三样。任务卡上写的是哪一样？"));
  const descriptions: Record<ItemId, string> = {
    book: "蓝封面，上面有音符",
    guide: "介绍开放日活动的小册子",
    prop: "演出用的道具箱，有轮子",
  };
  const choices = el("div", "item-choices");
  for (const item of ITEMS) {
    const selected = ws.answers.material === item;
    const card = commandButton(
      context,
      "",
      `material-${item}`,
      { type: "answer", key: "material", value: item },
      `item-choice${selected ? " selected" : ""}`,
      context.editingDisabled,
    );
    card.setAttribute("aria-pressed", String(selected));
    card.append(
      img(itemIcon(item, 56), "item-art"),
      el("strong", "", ITEM_NAMES[item]),
      el("span", "", descriptions[item]),
    );
    choices.append(card);
  }
  parent.append(choices);
  if (
    goal.type === "delivery" &&
    ws.answers.material &&
    ws.answers.material !== goal.item
  )
    parent.append(
      el("p", "gentle-warning", `再看看任务卡：林老师要的是${ITEM_NAMES[goal.item]}。`),
    );
  parent.append(
    commandButton(
      context,
      ws.answers.materialVerified === "yes" ? "已经确认" : "对照任务卡，就是它",
      "confirm-material",
      { type: "answer", key: "materialVerified", value: "yes" },
      "button secondary wide",
      context.editingDisabled ||
        !ws.answers.material ||
        ws.answers.materialVerified === "yes",
      "check",
    ),
  );
}

function renderMapLabel(context: PanelContext, parent: HTMLElement): void {
  const { ws } = context.view;
  const selected = ws.problem.graph.nodes.find(
    (node) => node.id === ws.selectedNode,
  );
  const legend = el("div", "legend-card");
  legend.append(
    img(`${import.meta.env.BASE_URL}assets/paper-campus/music.png`, "legend-art"),
    el("p", "", "图例：红屋顶，屋顶上有个音符。"),
  );
  parent.append(legend);
  parent.append(
    el(
      "div",
      selected ? "found-chip" : "found-chip empty",
      selected
        ? `你点的是：${nodeName(context, selected.id)}`
        : "找到那栋楼，点它门口的圆点",
    ),
  );
  const name = textControl(
    context,
    "map-label",
    ws.answers.mapLabelDraft ?? "",
    "写下这栋楼的名字",
    (value) => ({ type: "answer", key: "mapLabelDraft", value }),
  );
  name.disabled = context.editingDisabled || !selected;
  // The name is already on the learner's task card; copying it is the link.
  const fromCard = el("div", "choice-row");
  fromCard.append(
    el("span", "choice-label", "任务卡上写着："),
    commandButton(
      context,
      "音乐教室",
      "map-label-from-card",
      { type: "answer", key: "mapLabelDraft", value: "音乐教室" },
      "choice-chip small",
      context.editingDisabled || !selected,
    ),
  );
  parent.append(
    field("它叫什么名字？", name),
    fromCard,
    commandButton(
      context,
      "贴上去",
      "apply-map-label",
      () => ({ type: "mapLabel", value: name.value.trim() }),
      "button secondary wide",
      context.editingDisabled || !selected,
      "map",
    ),
  );
}

/** The three conditions Lin gave in 01, lit by what the last run achieved. */
function renderAgreedConditions(
  context: PanelContext,
  parent: HTMLElement,
): void {
  const { ws } = context.view;
  const ran = ws.run.trace.length > 0;
  const check = goalCheck(ws.problem, ws.run);
  const met: Record<string, boolean> = {
    arrive: ran && check.arrived,
    give: ran && check.delivered,
    confirm: ran && check.complete,
  };
  const block = el("div", "stamp-row");
  block.append(el("p", "lead", "林老师说过，这三件事都做到，才算送完："));
  for (const [key, label] of CONDITION_OPTIONS) {
    const line = el("div", `toggle-chip${met[key] ? " on" : ""}`);
    const mark = el("span", "toggle-mark");
    mark.append(icon(met[key] ? "check" : "minus"));
    line.append(mark, el("span", "", label));
    block.append(line);
  }
  parent.append(block);
}

function renderToolChoices(context: PanelContext, parent: HTMLElement): void {
  const notes: [string, PersonId, string][] = [
    ["tool-near", "xiaoyu", "我就在你旁边，帮我递一下那支笔。"],
    ["tool-fixed", "ale", "每天放学，把活动手册按同样的顺序摆回架子上。"],
    ["tool-changing", "xiaoman", "开放日要送演出道具，可那天有的路会临时封。"],
  ];
  const helpers: [string, string][] = [
    ["manual", "自己顺手做"],
    ["fixed", "按固定步骤做"],
    ["planner", "让规划工具比较路线"],
  ];
  for (const [key, person, text] of notes) {
    const note = el("div", "request-note");
    const head = el("div", "request-head");
    head.append(
      img(personPortrait(person, "idle", 34), "request-face"),
      el("p", "", text),
    );
    note.append(head);
    const row = el("div", "choice-row");
    row.setAttribute("role", "radiogroup");
    row.setAttribute("aria-label", `${SPEAKERS[person as SpeakerId].name}的事，交给谁帮`);
    for (const [value, label] of helpers) {
      const selected = context.view.ws.answers[key] === value;
      const choice = commandButton(
        context,
        label,
        `${key}-${value}`,
        { type: "answer", key, value },
        `choice-chip${selected ? " selected" : ""}`,
        context.editingDisabled,
      );
      choice.setAttribute("role", "radio");
      choice.setAttribute("aria-checked", String(selected));
      row.append(choice);
    }
    note.append(row);
    parent.append(note);
  }
  appendNote(context, parent, "为什么这样分？", "这件事适合……，因为……");
}

/** 12: the robot has already stopped at the wet label once. Checking only
 * makes sense after that, or the learner never sees why it matters. */
function sawRainStop(context: PanelContext): boolean {
  return context.view.ws.attempts.some(
    (attempt) => attempt.run.reason === "needs_information",
  );
}

function renderVerification(context: PanelContext, parent: HTMLElement): void {
  const known = context.view.ws.problem.factsKnown;
  if (!known && !sawRainStop(context)) {
    parent.append(
      el("p", "small-note", "先让跑跑试一次，看看它在哪儿停下。"),
    );
    return;
  }
  const card = el("div", `info-card${known ? " clear" : " smudged"}`);
  card.append(
    el("strong", "", known ? "书架标签：看清楚了" : "书架标签：被雨淋湿，字糊了"),
    el("p", "", known ? "确认过了，这一格放的是乐谱书。" : "标签上的字看不清，不能确定这一格是不是乐谱书。"),
  );
  parent.append(
    card,
    commandButton(
      context,
      known ? "已经核对过了" : "核对资料",
      "verify-information",
      { type: "verify" },
      "button secondary wide",
      context.editingDisabled || known,
      "check",
    ),
  );
}

function renderTask(context: PanelContext): HTMLElement {
  const content = section("这次的委托", "target");
  if (context.laboratory) {
    content.append(taskBrief(context));
    return content;
  }
  switch (context.activityId) {
    case "01":
      renderQuestions(context, content);
      break;
    case "02":
      content.append(taskBrief(context));
      renderMaterials(context, content);
      break;
    case "03":
      renderMapLabel(context, content);
      break;
    case "04":
      content.append(taskBrief(context));
      renderAgreedConditions(context, content);
      break;
    case "05":
      renderToolChoices(context, content);
      break;
    case "12":
      content.append(taskBrief(context));
      renderVerification(context, content);
      break;
    default:
      content.append(taskBrief(context));
  }
  return content;
}

/* ------------------------------------------------------------------ */
/* Steps tab: graphical action cards                                   */
/* ------------------------------------------------------------------ */

function newAction(
  context: PanelContext,
  type: ActionCard["type"],
  id: string = crypto.randomUUID(),
): ActionCard {
  uiState.selectedCard = id;
  activateScreen(`tools:${context.activityId}`, 'edit');
  const { goal } = context.view.ws.problem;
  if (type === "go")
    return {
      id,
      type,
      target:
        context.view.ws.selectedNode ??
        (goal.type === "delivery" ? goal.source : goal.destination),
    };
  if (type === "take" || type === "give")
    return {
      id,
      type,
      item: goal.type === "delivery" ? goal.item : "book",
      amount: 1,
    };
  return { id, type };
}

function replaceCard(
  context: PanelContext,
  index: number,
  card: ActionCard,
): void {
  context.dispatch({
    type: "plan",
    cards: context.view.ws.plan.map((current, currentIndex) =>
      currentIndex === index ? card : current,
    ),
  });
}

/** Where a card came from, shown only at the station where that matters. */
function cardTag(context: PanelContext, card: ActionCard): string | null {
  if (context.laboratory) return null;
  if (card.id === DETOUR_CARD_ID && context.activityId === "08") return "阿乐加的";
  if (card.id.startsWith("card-") && context.activityId === "06")
    return "来自任务卡";
  return null;
}

function placePicker(
  context: PanelContext,
  card: ActionCard,
  index: number,
): HTMLElement {
  const picker = el("div", "chip-picker");
  picker.setAttribute("role", "listbox");
  picker.setAttribute("aria-label", "选一个地方");
  const nodes = context.view.ws.problem.graph.nodes;
  const named = nodes.filter((node) => node.kind !== "junction");
  const junctions = nodes.filter((node) => node.kind === "junction");
  for (const group of [named, junctions]) {
    if (!group.length) continue;
    const row = el("div", "chip-picker-row");
    for (const node of group) {
      const chosen = card.target === node.id;
      const chip = commandButton(
        context,
        nodeName(context, node.id),
        `pick-place-${card.id}-${node.id}`,
        () => {
          uiState.picker = "";
          const { route: _route, ...rest } = card;
          return {
            type: "plan",
            cards: context.view.ws.plan.map((value, i) =>
              i === index ? { ...rest, target: node.id } : value,
            ),
          };
        },
        `picker-chip${node.kind === "junction" ? " junction" : ""}${chosen ? " chosen" : ""}`,
        context.editingDisabled,
      );
      chip.setAttribute("role", "option");
      chip.setAttribute("aria-selected", String(chosen));
      row.append(chip);
    }
    picker.append(row);
  }
  return picker;
}

function itemPicker(
  context: PanelContext,
  card: ActionCard,
  index: number,
): HTMLElement {
  const picker = el("div", "chip-picker");
  picker.setAttribute("role", "listbox");
  picker.setAttribute("aria-label", "选一样物品");
  const row = el("div", "chip-picker-row");
  for (const item of ITEMS) {
    const chosen = card.item === item;
    const chip = commandButton(
      context,
      ITEM_NAMES[item],
      `pick-item-${card.id}-${item}`,
      () => {
        uiState.picker = "";
        return {
          type: "plan",
          cards: context.view.ws.plan.map((value, i) =>
            i === index ? { ...card, item } : value,
          ),
        };
      },
      `picker-chip item${chosen ? " chosen" : ""}`,
      context.editingDisabled,
    );
    chip.prepend(img(itemIcon(item, 22), "chip-item"));
    chip.setAttribute("role", "option");
    chip.setAttribute("aria-selected", String(chosen));
    row.append(chip);
  }
  picker.append(row);
  return picker;
}

function actionCard(
  context: PanelContext,
  card: ActionCard,
  index: number,
): HTMLElement {
  const { ws } = context.view;
  const current =
    ws.run.trace.length > 0 &&
    ws.run.stepIndex === index &&
    !["idle", "finished"].includes(ws.run.status);
  const stopped = current && ws.run.status === "paused";
  const range = groupRange(ws.plan);
  const inGroup = range !== null && index >= range[0] && index <= range[1];
  const row = el(
    "li",
    `action-card type-${card.type}${current ? " active" : ""}${stopped ? " stopped" : ""}${inGroup ? " in-group" : ""}`,
  );
  row.dataset.cardId = card.id;
  const grip = el("span", "action-grip");
  grip.append(icon("grip"));
  grip.title = "按住拖动，换位置";
  const group = uiState.group;
  const number = group
    ? commandButton(
        context,
        String(index + 1),
        `group-pick-${card.id}`,
        () => {
          if (!group.start || group.end) {
            group.start = card.id;
            group.end = null;
          } else group.end = card.id;
          return { type: "tab", tab: ws.tab };
        },
        "action-number group-pick",
        context.editingDisabled,
      )
    : el("span", "action-number", String(index + 1));
  if (group) number.setAttribute("aria-label", `圈进第 ${index + 1} 张卡`);
  row.append(grip, number);
  const kind = ACTIONS.find((action) => action.type === card.type)!;
  const content = el("div", "action-content");
  const line = el("div", "action-line");
  const badge = el("span", "action-icon");
  badge.append(icon(kind.icon));
  line.append(badge, el("span", "action-verb", kind.verb));
  if (card.type === "go") {
    const key = `place:${card.id}`;
    const chip = commandButton(
      context,
      card.target ? nodeName(context, card.target) : "选地方",
      `card-${card.id}-target`,
      () => {
        uiState.picker = uiState.picker === key ? "" : key;
        return { type: "tab", tab: ws.tab };
      },
      `value-chip${card.target ? "" : " empty"}`,
      context.editingDisabled,
    );
    chip.setAttribute("aria-expanded", String(uiState.picker === key));
    chip.setAttribute("aria-label", `第 ${index + 1} 步去哪里：${chip.textContent}`);
    line.append(chip);
    content.append(line);
    if (uiState.picker === key) content.append(placePicker(context, card, index));
  } else if (card.type === "take" || card.type === "give") {
    const key = `item:${card.id}`;
    const item = card.item ?? "book";
    if (card.type === "give") {
      const goal = ws.problem.goal;
      if (goal.type === "delivery")
        line.append(el("span", "action-to", goal.recipient));
    }
    const chip = commandButton(
      context,
      ITEM_NAMES[item],
      `card-${card.id}-item`,
      () => {
        uiState.picker = uiState.picker === key ? "" : key;
        return { type: "tab", tab: ws.tab };
      },
      "value-chip item",
      context.editingDisabled,
    );
    chip.prepend(img(itemIcon(item, 22), "chip-item"));
    chip.setAttribute("aria-expanded", String(uiState.picker === key));
    chip.setAttribute("aria-label", `第 ${index + 1} 步的物品：${ITEM_NAMES[item]}`);
    line.append(chip);
    line.append(
      stepper(
        `card-${card.id}-amount`,
        `第 ${index + 1} 步的数量`,
        card.amount ?? 1,
        1,
        9,
        ITEM_UNITS[item],
        (amount) => replaceCard(context, index, { ...card, amount }),
        context.editingDisabled,
      ),
    );
    content.append(line);
    if (uiState.picker === key) content.append(itemPicker(context, card, index));
  } else {
    line.append(
      el(
        "span",
        "action-note",
        card.type === "confirm"
          ? "请对方说一声“收到了”"
          : card.type === "check"
            ? "看清资料再往下做"
            : "只能在补给站做",
      ),
    );
    content.append(line);
  }
  const tag = cardTag(context, card);
  if (tag) content.append(el("span", "action-tag", tag));
  const tools = el("div", "action-tools");
  const move = (delta: number): PanelCommand => {
    const cards = [...ws.plan];
    [cards[index], cards[index + delta]] = [cards[index + delta], cards[index]];
    // keep the moved card on screen so it can be moved again
    uiState.selectedCard = card.id;
    return { type: "plan", cards };
  };
  const entries: [string, string, string, () => PanelCommand, boolean][] = [
    ["up", "往前挪", "move-up", () => move(-1), index === 0],
    ["down", "往后挪", "move-down", () => move(1), index === ws.plan.length - 1],
    [
      "copy",
      "复制这一步",
      "copy-step",
      () => {
        const cards = [...ws.plan];
        cards.splice(index + 1, 0, {
          ...structuredClone(card),
          id: crypto.randomUUID(),
        });
        return { type: "plan", cards };
      },
      false,
    ],
    [
      "trash",
      "删掉这一步",
      "delete-step",
      () => ({
        type: "plan",
        cards: ws.plan.filter((_, currentIndex) => index !== currentIndex),
      }),
      false,
    ],
  ];
  for (const [glyph, label, action, command, disabled] of entries) {
    const control = commandButton(
      context,
      "",
      `${action}-${card.id}`,
      command,
      "icon-button",
      context.editingDisabled || disabled,
      glyph,
    );
    control.title = label;
    control.setAttribute("aria-label", `${label}，第 ${index + 1} 步`);
    tools.append(control);
  }
  row.append(content, tools);
  return row;
}

/** Pointer drag to reorder; the up/down buttons remain for keyboards. */
function enableDrag(list: HTMLElement, context: PanelContext): void {
  if (context.editingDisabled) return;
  let dragging: HTMLElement | null = null;
  let from = -1;
  list.addEventListener("pointerdown", (event) => {
    const grip = (event.target as HTMLElement).closest(".action-grip");
    if (!grip) return;
    dragging = grip.closest("li");
    if (!dragging) return;
    from = Array.from(list.children).indexOf(dragging);
    dragging.classList.add("dragging");
    list.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  list.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const items = Array.from(list.children).filter(
      (child) => child !== dragging && !(child as HTMLElement).hidden,
    ) as HTMLElement[];
    const after = items.find((item) => {
      const box = item.getBoundingClientRect();
      return event.clientY < box.top + box.height / 2;
    });
    if (after) list.insertBefore(dragging, after);
    else if (items.length) items.at(-1)!.after(dragging);
  });
  const finish = () => {
    if (!dragging) return;
    const to = Array.from(list.children).indexOf(dragging);
    dragging.classList.remove("dragging");
    dragging = null;
    if (to === from || from < 0) return;
    const cards = [...context.view.ws.plan];
    const [card] = cards.splice(from, 1);
    cards.splice(to, 0, card);
    context.dispatch({ type: "plan", cards });
  };
  list.addEventListener("pointerup", finish);
  list.addEventListener("pointercancel", finish);
}

function stepHelpers(context: PanelContext, parent: HTMLElement): void {
  const { ws } = context.view;
  const id = context.activityId;
  if (context.laboratory) return;
  if (id === "12" && sawRainStop(context)) {
    const box = el("div", "experiment-box warm");
    renderVerification(context, box);
    parent.append(box);
  }
  if (id === "04") {
    // The robot calls its run “done”; the learner holds it to the task card.
    const claimed = ws.attempts.some((attempt) => {
      const check = goalCheck(attempt.problem, attempt.run);
      return attempt.run.trace.length > 0 && check.arrived && !check.delivered;
    });
    const box = el("div", `experiment-box${claimed ? " warm" : ""}`);
    box.append(
      el(
        "strong",
        "",
        claimed
          ? "跑跑说：“我的卡片全做完了，送完啦！”你觉得呢？"
          : "先点“试一试”，看跑跑照这三张卡跑一趟。",
      ),
    );
    if (claimed) {
      box.append(el("p", "", "看看页面顶上的任务卡：三个章，亮了几个？"));
      const row = el("div", "choice-row");
      for (const [value, label] of [
        ["done", "对，送完了"],
        ["notyet", "还没有，书还在车上"],
      ]) {
        const selected = ws.answers.judge04 === value;
        row.append(
          commandButton(
            context,
            label,
            `judge04-${value}`,
            { type: "answer", key: "judge04", value },
            `choice-chip${selected ? " selected" : ""}`,
            context.editingDisabled,
          ),
        );
      }
      box.append(row);
    }
    parent.append(box);
  }
  if (id === "07") {
    const box = el("div", "experiment-box");
    box.append(el("strong", "", "先猜：把“取书”卡挪到最前面，跑跑会怎样？"));
    const row = el("div", "choice-row");
    for (const [value, label] of [
      ["stop", "会在半路停下"],
      ["ok", "照样能送到"],
    ]) {
      const selected = ws.answers.predict07 === value;
      const chip = commandButton(
        context,
        label,
        `predict07-${value}`,
        { type: "answer", key: "predict07", value },
        `choice-chip${selected ? " selected" : ""}`,
        context.editingDisabled,
      );
      chip.setAttribute("aria-pressed", String(selected));
      row.append(chip);
    }
    box.append(row);
    const actions = el("div", "mini-actions");
    actions.append(
      commandButton(
        context,
        "试试换顺序",
        "try-order",
        { type: "tryOrder" },
        "button secondary",
        context.editingDisabled || !ws.answers.predict07,
        "swap",
      ),
    );
    if (ws.answers.backup07)
      actions.append(
        commandButton(
          context,
          "换回原来的顺序",
          "restore-order",
          { type: "restoreOrder" },
          "button ghost",
          context.editingDisabled,
          "reset",
        ),
      );
    box.append(actions);
    parent.append(box);
  }
  if (id === "08" || id === "10") {
    const runs = ws.attempts
      .filter((attempt) => attempt.goal.complete)
      .slice(-3);
    if (runs.length) {
      const box = el("div", "energy-log");
      box.append(el("strong", "", "成功送到的记录"));
      const list = el("ul", "");
      runs.forEach((attempt) =>
        list.append(
          el(
            "li",
            "",
            `第 ${ws.attempts.indexOf(attempt) + 1} 次：${attempt.plan.length} 张卡，用了 ${attempt.run.spent} 点能量`,
          ),
        ),
      );
      box.append(list);
      parent.append(box);
    }
  }
  if (["09", "13"].includes(id)) {
    const goal = ws.problem.goal;
    if (goal.type === "delivery") {
      const note = el("div", "capacity-note");
      note.append(
        el(
          "p",
          "",
          `每${ITEM_UNITS[goal.item]}${ITEM_NAMES[goal.item]}占 ${ITEM_WEIGHTS[goal.item]} 格，车厢一共 ${ws.problem.capacity} 格（固定）。要送 ${goal.quantity} ${ITEM_UNITS[goal.item]}。`,
        ),
      );
      if (!uiState.group && ws.plan.length >= 2)
        note.append(
          groupStarter(context, "圈出一趟，再做一遍", "button secondary small"),
        );
      parent.append(note);
    }
  }
  if (id === "10") {
    const quick = ["两本都能送到", "会在半路停下", "车厢会装不下"];
    const area = textControl(
      context,
      "prediction",
      ws.answers.prediction ?? "",
      "我猜跑跑会……",
      (value) => ({ type: "answer", key: "prediction", value }),
      true,
    );
    const block = field("出发前，先猜一猜", area);
    const chips = el("div", "choice-row");
    for (const text of quick)
      chips.append(
        commandButton(
          context,
          text,
          `predict-${text}`,
          { type: "answer", key: "prediction", value: text },
          "choice-chip small",
          context.editingDisabled,
        ),
      );
    block.append(chips);
    parent.append(block);
  }
  if (id === "15") {
    const box = el("div", "experiment-box warm");
    box.append(
      el("strong", "", "坡道在维修，台阶又推不上去"),
      el(
        "p",
        "",
        "先试一试，看看跑跑卡在哪。修路和台阶都是现场的固定情况，删不掉；能改的，是在哪里交接。",
      ),
      commandButton(
        context,
        "找小满商量",
        "request-authority",
        { type: "authority" },
        "button secondary",
        context.editingDisabled ||
          // Only once the robot has really got stuck: that is what to report.
          !ws.attempts.some((attempt) =>
            ["no_path", "inaccessible", "energy"].includes(attempt.run.reason),
          ) ||
          (ws.problem.goal.type === "delivery" &&
            ws.problem.goal.destination === "plaza"),
        "help",
      ),
    );
    parent.append(box);
  }
}

/** Circling a run of cards and repeating it: the first taste of a loop. */
function groupBar(context: PanelContext): HTMLElement {
  const { ws } = context.view;
  const group = uiState.group!;
  const range = groupRange(ws.plan);
  const box = el("div", "group-bar");
  box.append(
    el(
      "strong",
      "",
      !group.start
        ? "先点这一组的第一张卡（点卡片上的数字）"
        : !group.end
          ? "再点这一组的最后一张卡"
          : `圈好了：第 ${range![0] + 1}–${range![1] + 1} 张，一共 ${range![1] - range![0] + 1} 张`,
    ),
  );
  const actions = el("div", "mini-actions");
  actions.append(
    commandButton(
      context,
      "把这一组再做一遍",
      "group-copy",
      () => {
        const [a, b] = range!;
        const copies = ws.plan
          .slice(a, b + 1)
          .map((card) => ({ ...structuredClone(card), id: crypto.randomUUID() }));
        const cards = [...ws.plan];
        cards.splice(b + 1, 0, ...copies);
        uiState.group = null;
        return { type: "plan", cards };
      },
      "button primary small",
      context.editingDisabled || !group.end || !range,
      "copy",
    ),
    commandButton(
      context,
      "取消",
      "group-cancel",
      () => {
        uiState.group = null;
        return { type: "tab", tab: ws.tab };
      },
      "button ghost small",
      false,
    ),
  );
  box.append(actions);
  return box;
}

function renderStepCards(context: PanelContext): HTMLElement {
  const { ws } = context.view;
  const content = section("我的步骤", "notebook");
  content.firstElementChild!.append(el("span", "pill", `${ws.plan.length} 张卡`));
  if (ws.problem.goal.type === "reach") {
    content.append(
      el("p", "lead", "这次在沙盘上走路线：你画出的路，就是跑跑要走的步骤。"),
      commandButton(
        context,
        "去画路线",
        "steps-to-routes",
        { type: "tab", tab: "routes" },
        "button secondary",
        false,
        "road",
      ),
    );
    return content;
  }
  stepHelpers(context, content);
  if (planShown(context))
    content.append(
      el("p", "route-legend", "棋盘上的蓝色虚线，是跑跑照这些卡打算走的路。"),
    );
  if (uiState.group) content.append(groupBar(context));
  const list = el("ol", "action-list");
  ws.plan.forEach((card, index) =>
    list.append(actionCard(context, card, index)),
  );
  if (!ws.plan.length) {
    const empty = el("div", "empty-state");
    empty.append(
      icon("notebook"),
      el("strong", "", "还没有步骤卡"),
      el("span", "", "去哪儿、拿什么、交给谁——从下面挑卡片放进来。"),
    );
    content.append(empty);
  } else {
    enableDrag(list, context);
    content.append(list);
  }
  const palette = el("div", "action-palette");
  palette.setAttribute("aria-label", "放一张新卡");
  for (const action of ACTIONS) {
    const tile = commandButton(
      context,
      action.label,
      `add-${action.type}`,
      () => ({
        type: "plan",
        cards: [...ws.plan, newAction(context, action.type)],
      }),
      `palette-tile type-${action.type}`,
      context.editingDisabled,
      action.icon,
    );
    palette.append(tile);
  }
  content.append(el("span", "palette-label", "放一张卡"), palette);
  const extras = el("div", "mini-actions");
  if (ws.plan.length >= 2 && !uiState.group)
    extras.append(groupStarter(context, "圈一组再做一遍", "button ghost small"));
  extras.append(
    commandButton(
      context,
      "放一份参考步骤",
      "suggest-plan",
      { type: "suggestPlan" },
      "button ghost small",
      context.editingDisabled,
      "help",
    ),
  );
  content.append(extras);
  return content;
}

function groupStarter(
  context: PanelContext,
  label: string,
  className: string,
): HTMLButtonElement {
  return commandButton(
    context,
    label,
    "group-start",
    () => {
      uiState.group = { start: null, end: null };
      activateScreen(`tools:${context.activityId}`, 'edit');
      return { type: "tab", tab: context.view.ws.tab };
    },
    className,
    context.editingDisabled,
    "copy",
  );
}

/* ------------------------------------------------------------------ */
/* Rules tab                                                           */
/* ------------------------------------------------------------------ */

function renderRuleControls(context: PanelContext): HTMLElement {
  const { problem } = context.view.ws;
  const controls = el("div", "rule-controls");
  const resources = el("div", "rule-resources");
  const energy = el("div", "rule-resource");
  energy.append(
    el("span", "field-label", "出发时的能量"),
    stepper(
      "rule-energy",
      "出发能量",
      problem.energy,
      2,
      16,
      "点",
      (value) => context.dispatch({ type: "rule", key: "energy", value }),
      context.editingDisabled,
    ),
  );
  resources.append(energy);
  if (problem.goal.type === "delivery") {
    const fixedCapacity =
      !context.laboratory && ["09", "13"].includes(context.activityId);
    const capacity = el("div", "rule-resource");
    capacity.append(
      el("span", "field-label", fixedCapacity ? "车厢（固定）" : "车厢"),
      stepper(
        "rule-capacity",
        "车厢大小",
        problem.capacity,
        1,
        4,
        "格",
        (value) => context.dispatch({ type: "rule", key: "capacity", value }),
        context.editingDisabled || fixedCapacity,
      ),
    );
    resources.append(capacity);
  }
  controls.append(resources);
  const goals: [Objective, string, string][] = [
    ["fewestSteps", "少走几段", "能量够用就行，段数越少越好"],
    ["leastCost", "少花能量", "能量花得越少越好"],
  ];
  const segment = el("div", "segmented");
  segment.setAttribute("role", "radiogroup");
  segment.setAttribute("aria-label", "这次比较什么");
  for (const [value, label, hint] of goals) {
    const selected = problem.objective === value;
    const option = commandButton(
      context,
      label,
      `objective-${value}`,
      { type: "rule", key: "objective", value },
      `segment${selected ? " selected" : ""}`,
      context.editingDisabled,
    );
    option.title = hint;
    option.setAttribute("role", "radio");
    option.setAttribute("aria-checked", String(selected));
    segment.append(option);
  }
  controls.append(el("span", "field-label", "这次想要什么样的路？"), segment);
  const fixedRamp =
    !context.laboratory && ["15", "17"].includes(context.activityId);
  controls.append(
    toggle(
      "rule-ramp",
      fixedRamp ? "必须走坡道（这次的要求）" : "必须走坡道",
      problem.requireRamp,
      (value) => context.dispatch({ type: "rule", key: "requireRamp", value }),
      context.editingDisabled || fixedRamp,
      "lock",
    ),
  );
  return controls;
}

/** Whether the board is showing the robot's planned route (see main.ts). */
function planShown(context: PanelContext): boolean {
  const { ws } = context.view;
  return (
    ws.problem.goal.type === "delivery" &&
    ws.plan.length > 0 &&
    ws.run.trace.length === 0
  );
}

function renderRoadEditor(context: PanelContext): HTMLElement {
  const { ws } = context.view;
  const editor = el("div", "road-editor");
  const selected = ws.problem.graph.roads.find(
    (road) => road.id === ws.selectedRoad,
  );
  if (!selected) {
    const hint = el("div", "road-hint");
    hint.append(
      icon("road"),
      el(
        "span",
        "",
        planShown(context)
          ? "点棋盘上的一段路，就能改它的路况。蓝色虚线是跑跑现在打算走的路。"
          : "点棋盘上的一段路，就能改它的路况。",
      ),
    );
    editor.append(hint);
    return editor;
  }
  const head = el("div", "road-head");
  head.append(el("strong", "", roadName(context, selected)));
  const state = el(
    "span",
    `road-state${selected.closed ? " blocked" : !selected.known ? " unknown" : ""}`,
    selected.closed
      ? selected.locked
        ? "维修中 · 过不去"
        : "有路障 · 过不去"
      : !selected.known
        ? "情况没核对"
        : "可以走",
  );
  head.append(state);
  editor.append(head);
  if (selected.kind !== "path")
    editor.append(
      el(
        "p",
        "small-note",
        selected.kind === "stairs"
          ? "这一段是台阶：人能走，有轮子的箱子推不上去。"
          : "这一段是坡道：有轮子的箱子也能推过去。",
      ),
    );
  // Only the road properties this station is about: costs from 14 on (lesson
  // 3 is about barriers alone), and checking a road only when it is unchecked.
  const station = Number(context.activityId);
  const showCost =
    context.laboratory || context.project || (station >= 14 && station !== 15);
  const showKnown = context.laboratory || context.project || !selected.known;
  if (showCost) {
    editor.append(
      el("span", "field-label", "这段路好不好走？（走一次花几点能量）"),
    );
    const palette = el("div", "surface-palette");
    palette.setAttribute("aria-label", "路况与能量");
    for (let cost = 1; cost <= 5; cost++) {
      const control = commandButton(
        context,
        "",
        `road-cost-${cost}`,
        { type: "road", id: selected.id, patch: { cost } },
        `surface-tile surface-${cost}${cost === selected.cost ? " selected" : ""}`,
        context.editingDisabled || selected.locked || selected.kind !== "path",
      );
      control.append(
        el("span", "surface-swatch"),
        el("strong", "", String(cost)),
        el("span", "", SURFACES[cost].name),
      );
      control.setAttribute("aria-label", `${SURFACES[cost].name}，${cost} 点能量`);
      control.setAttribute("aria-pressed", String(cost === selected.cost));
      palette.append(control);
    }
    editor.append(palette);
  }
  editor.append(
    toggle(
      "road-closed",
      selected.closed ? "撤掉路障" : "放上路障",
      selected.closed,
      (closed) =>
        context.dispatch({ type: "road", id: selected.id, patch: { closed } }),
      context.editingDisabled || selected.locked,
      "lock",
    ),
  );
  if (showKnown)
    editor.append(
      toggle(
        "road-known",
        "这段路的情况核对过了",
        selected.known,
        (known) =>
          context.dispatch({ type: "road", id: selected.id, patch: { known } }),
        context.editingDisabled,
      ),
    );
  if (selected.locked)
    editor.append(
      el("p", "small-note", "这是现场的固定情况，这里改不了。"),
    );
  return editor;
}

function renderInFlight(context: PanelContext): HTMLElement | null {
  if (
    !(context.laboratory
      ? context.view.state.labId === "R7"
      : context.activityId === "18")
  )
    return null;
  const { ws } = context.view;
  const happened = ws.events.some(
    (event) => event.kind === "inFlightChange" && event.runId === ws.runId,
  );
  const note = el("div", `radio-card${happened ? " received" : ""}`);
  note.append(
    el("strong", "", happened ? "封路消息收到了" : "对讲机"),
    el(
      "p",
      "",
      happened
        ? `跑跑已经用了 ${ws.run.spent} 点能量。从它现在的位置，用剩下的能量重新安排。`
        : "跑跑出发以后，可能会收到封路消息。先走一段，再点下面的按钮。",
    ),
    commandButton(
      context,
      happened ? "已经收到" : "收下封路消息",
      "in-flight-change",
      { type: "inFlight" },
      "button secondary",
      !context.view.ready ||
        !context.view.started ||
        happened ||
        (!context.view.playing && ws.run.spent <= 0),
      "rule",
    ),
  );
  return note;
}

function renderRules(context: PanelContext): HTMLElement {
  const content = section("规则与路况", "rule");
  if (context.activityId === "12" && !context.laboratory)
    renderVerification(context, content);
  content.append(renderRoadEditor(context));
  // 11 and 12 are about one road; the other rules wait behind a fold.
  if (!context.laboratory && ["11", "12"].includes(context.activityId)) {
    const more = details("more-rules", "其他规则：出发能量、车厢、路线偏好", false);
    more.append(renderRuleControls(context));
    content.append(more);
  } else content.append(renderRuleControls(context));
  const change = renderInFlight(context);
  if (change) content.append(change);
  return content;
}

/* ------------------------------------------------------------------ */
/* Routes tab                                                          */
/* ------------------------------------------------------------------ */

function renderGridControls(context: PanelContext): HTMLElement {
  const { problem } = context.view.ws;
  const block = details("sandbox", "我的沙盘：大小和起点终点", true);
  const sizes = el("div", "segmented");
  for (const size of [3, 4, 5]) {
    const selected = Math.sqrt(problem.graph.nodes.length) === size;
    sizes.append(
      commandButton(
        context,
        `${size} × ${size}`,
        `grid-${size}`,
        { type: "grid", size },
        `segment${selected ? " selected" : ""}`,
        context.editingDisabled,
      ),
    );
  }
  block.append(el("span", "field-label", "沙盘大小"), sizes);
  block.append(
    el(
      "p",
      "small-note",
      "要换起点或终点：先在棋盘上点一个路口，再点下面的按钮。",
    ),
  );
  const selected = context.view.ws.selectedNode;
  const row = el("div", "mini-actions");
  row.append(
    commandButton(
      context,
      "设为起点",
      "endpoint-start",
      () => ({ type: "endpoint", key: "start", id: selected ?? problem.start }),
      "button ghost small",
      context.editingDisabled || !selected,
      "flag",
    ),
    commandButton(
      context,
      "设为终点",
      "endpoint-goal",
      () => ({
        type: "endpoint",
        key: "destination",
        id: selected ?? problem.goal.destination,
      }),
      "button ghost small",
      context.editingDisabled || !selected,
      "target",
    ),
  );
  block.append(row);
  return block;
}

function renderRouteDraft(context: PanelContext): HTMLElement {
  const { ws } = context.view;
  const route = routeContext(ws);
  const draft = el("div", "route-draft");
  const path =
    ws.problem.goal.type === "delivery" && ws.manualRoute[0] !== route.start
      ? [route.start]
      : ws.manualRoute.length
        ? ws.manualRoute
        : [route.start];
  const strip = el("ol", "route-strip");
  strip.setAttribute("aria-label", "我画的路线");
  path.forEach((id, index) =>
    strip.append(
      el(
        "li",
        index === path.length - 1 ? "current" : "",
        nodeName(context, id),
      ),
    ),
  );
  draft.append(strip);
  const edges = path
    .slice(1)
    .map((id, index) => roadBetween(ws.problem.graph, path[index], id));
  const cost = edges.every(Boolean)
    ? edges.reduce((sum, road) => sum + road!.cost, 0)
    : null;
  const meter = el("div", "budget-meter");
  const budget = Math.max(1, route.budget);
  const fill = el("span", `budget-fill${cost !== null && cost > route.budget ? " over" : ""}`);
  fill.style.width = `${Math.min(100, ((cost ?? 0) / budget) * 100)}%`;
  meter.append(fill);
  const stats = el("div", "route-stats");
  stats.append(
    el("span", "", `${Math.max(0, path.length - 1)} 段路`),
    el(
      "span",
      cost !== null && cost > route.budget ? "over" : "",
      cost === null ? "有一段连不上" : `${cost} / ${route.budget} 点能量`,
    ),
  );
  draft.append(stats, meter);
  const tail = path.at(-1)!;
  const arrived = path.length > 1 && tail === route.goal;
  const neighbors = el("div", "route-neighbors");
  neighbors.append(
    el(
      "span",
      "field-label",
      arrived
        ? "已经画到终点了。可以试走；想换路，就退一段。"
        : "下一段走到哪儿？（也可以直接点棋盘）",
    ),
  );
  const choices = el("div", "neighbor-chips");
  const adjacent = ws.problem.graph.roads.filter(
    (road) => road.from === tail || road.to === tail,
  );
  for (const road of adjacent) {
    const id = road.from === tail ? road.to : road.from;
    const reason = road.closed
      ? "封了"
      : !road.known
        ? "没核对"
        : ws.problem.requireRamp && road.kind === "stairs"
          ? "台阶"
          : "";
    const control = commandButton(
      context,
      `${nodeName(context, id)}`,
      `draw-node-${id}`,
      { type: "drawNode", id },
      "neighbor-chip",
      context.editingDisabled || Boolean(reason),
    );
    control.append(el("small", "", reason || `${road.cost} 点`));
    control.setAttribute(
      "aria-label",
      `走到${nodeName(context, id)}，${reason || `花 ${road.cost} 点能量`}`,
    );
    choices.append(control);
  }
  if (!adjacent.length)
    choices.append(el("span", "small-note", "这里没有连着的路。"));
  if (!arrived) neighbors.append(choices);
  draft.append(neighbors);
  const actions = el("div", "mini-actions");
  actions.append(
    commandButton(
      context,
      "退一段",
      "undo-route",
      { type: "undoRoute" },
      "button ghost small",
      context.editingDisabled || path.length < 2,
      "reset",
    ),
    commandButton(
      context,
      "重新画",
      "clear-route",
      { type: "clearRoute" },
      "button ghost small",
      context.editingDisabled || path.length < 2,
      "trash",
    ),
    commandButton(
      context,
      "检查这条路",
      "check-route",
      { type: "routeCheck" },
      "button secondary small",
      context.editingDisabled || ws.manualRoute.length < 2,
      "check",
    ),
  );
  draft.append(actions);
  return draft;
}

const CANDIDATE_CSS = ["#369cd3", "#d89a44", "#a887bd"];

function renderCandidates(context: PanelContext): HTMLElement {
  const element = el("div", "route-suggestions");
  const head = el("div", "assistant-head");
  head.append(
    el("strong", "", "规划助手"),
    el("span", "", "会按现在的地图、路况和预算找路"),
  );
  element.append(
    head,
    commandButton(
      context,
      "问问规划助手",
      "search-route",
      { type: "searchRoute" },
      "button secondary",
      context.editingDisabled,
      "help",
    ),
  );
  const result = context.view.search;
  if (!result) return element;
  if (!result.routes.length) {
    element.append(el("div", "assistant-answer none", result.message));
    return element;
  }
  element.append(el("p", "assistant-answer", `${result.message}点一条建议，它就会画到棋盘上，再由你决定要不要走。`));
  for (const [index, candidate] of result.routes.entries()) {
    const selected =
      candidate.nodes.length === context.view.ws.manualRoute.length &&
      candidate.nodes.every(
        (node, i) => node === context.view.ws.manualRoute[i],
      );
    const card = commandButton(
      context,
      "",
      `adopt-route-${index}`,
      { type: "adopt", path: [...candidate.nodes] },
      `candidate-card${selected ? " selected" : ""}`,
      context.editingDisabled,
    );
    card.style.setProperty("--candidate", CANDIDATE_CSS[index] ?? "#369cd3");
    card.setAttribute("aria-pressed", String(selected));
    card.append(
      el(
        "strong",
        "",
        `${selected ? "已采用 · " : ""}建议 ${index + 1}：${candidate.steps} 段路，${candidate.cost} 点能量`,
      ),
      el(
        "span",
        "candidate-path",
        candidate.nodes.map((node) => nodeName(context, node)).join(" → "),
      ),
    );
    element.append(card);
  }
  return element;
}

function renderRoutes(context: PanelContext): HTMLElement {
  const content = section("我的路线", "road");
  if (context.laboratory && context.view.state.labId === "R8")
    content.append(renderGridControls(context));
  content.append(taskBrief(context));
  if (context.view.ws.needsReplan)
    content.append(
      el(
        "div",
        "gentle-warning",
        "原来的路走不通了。从跑跑现在的位置，用剩下的能量重新画一条。",
      ),
    );
  const change = renderInFlight(context);
  if (change) content.append(change);
  content.append(renderRouteDraft(context), renderCandidates(context));
  const conditions = details(
    "route-conditions",
    "预算、目标和路况",
    (!context.laboratory && ["14", "19"].includes(context.activityId)) ||
      (context.laboratory &&
        ["R2", "R3", "R4", "R5", "R8"].includes(context.view.state.labId)),
  );
  conditions.append(renderRuleControls(context), renderRoadEditor(context));
  content.append(conditions);
  if (
    (!context.laboratory && context.activityId === "20") ||
    (context.laboratory &&
      ["R3", "R7", "R8"].includes(context.view.state.labId))
  )
    appendNote(
      context,
      content,
      context.laboratory && context.view.state.labId === "R8"
        ? "介绍我的道路题"
        : "我的发现",
      "我改了……，结果……，因为……",
    );
  return content;
}

/* ------------------------------------------------------------------ */
/* Project tab                                                         */
/* ------------------------------------------------------------------ */

function renderProjectPeople(context: PanelContext, parent: HTMLElement): void {
  const { ws } = context.view;
  const options: ["music" | "guide" | "stage", PersonId, string, ItemId][] = [
    ["music", "lin", "下午还要排练，再送 1 本乐谱书到音乐教室。", "book"],
    ["guide", "xiaoyu", "我刚转来，想要一本活动手册，送到活动广场给我。", "guide"],
    ["stage", "xiaoman", "下午的演出要用两件道具，送到广场的舞台上。", "prop"],
  ];
  const list = el("div", "people-choices");
  for (const [id, person, copy, item] of options) {
    const selected =
      Boolean(ws.answers.person) &&
      ws.problem.goal.type === "delivery" &&
      ws.problem.goal.item === item;
    const card = commandButton(
      context,
      "",
      `profile-${id}`,
      { type: "profile", id },
      `person-card${selected ? " selected" : ""}`,
      context.editingDisabled,
    );
    card.setAttribute("aria-pressed", String(selected));
    card.append(
      img(personPortrait(person, selected ? "happy" : "idle", 64), "person-face"),
      el("strong", "", SPEAKERS[person as SpeakerId].name),
      el("span", "", copy),
    );
    list.append(card);
  }
  parent.append(list);
  if (ws.answers.person) parent.append(taskBrief(context));
}

function renderProjectInformation(
  context: PanelContext,
  parent: HTMLElement,
): void {
  const { ws } = context.view;
  parent.append(el("p", "lead", "跑跑需要知道哪些资料？只勾用得上的。"));
  const choices: [string, string, boolean][] = [
    ["destination", "从哪儿取、送到哪儿", false],
    ["item", "送的是什么", false],
    ["quantity", "要送几件", false],
    ["access", "路况和通行要求", false],
    ["address", "同学的家庭住址", true],
    ["password", "同学的账号密码", true],
  ];
  const grid = el("div", "info-choices");
  for (const [key, label, personal] of choices)
    grid.append(
      toggle(
        `information-${key}`,
        label,
        ws.information.includes(key),
        (checked) => {
          const values = checked
            ? [...new Set([...ws.information, key])]
            : ws.information.filter((value) => value !== key);
          context.dispatch({ type: "information", values });
        },
        context.editingDisabled,
        personal ? "lock" : "check",
      ),
    );
  parent.append(
    grid,
    el("p", "small-note", "这里只是判断要不要，不用填真的住址或密码。"),
    commandButton(
      context,
      ws.problem.factsKnown ? "资料核对过了" : "核对资料",
      "verify-project-information",
      { type: "verify" },
      "button secondary wide",
      context.editingDisabled,
      "check",
    ),
  );
}

function renderProjectTests(context: PanelContext, parent: HTMLElement): void {
  const { ws } = context.view;
  const normal = ws.attempts
    .slice()
    .reverse()
    .find(
      (attempt) =>
        attempt.tag === "normal" &&
        attempt.baseKey === ws.baseKey &&
        attempt.key === ws.baseKey &&
        attempt.goal.complete,
    );
  const changed = ws.attempts
    .slice()
    .reverse()
    .find(
      (attempt) => attempt.tag === "changed" && attempt.baseKey === ws.baseKey,
    );
  const tests = el("div", "test-stamps");
  const normalCard = el("div", `test-card${normal ? " passed" : ""}`);
  normalCard.append(
    el("span", "test-stamp", normal ? "送到了" : "待检验"),
    el("strong", "", "① 平常的路况"),
    el("span", "small-note", normal ? `用了 ${normal.run.spent} 点能量` : "先看看现在的方案能不能送到"),
    commandButton(
      context,
      normal ? "再试一次" : "平常路况试一试",
      "project-baseline",
      { type: "baseline" },
      "button secondary small",
      context.editingDisabled || !ws.plan.length,
      "play",
    ),
  );
  const changedOk = changed?.goal.complete;
  const changedCard = el(
    "div",
    `test-card${changed ? (changedOk ? " passed" : " stopped") : ""}`,
  );
  changedCard.append(
    el(
      "span",
      "test-stamp",
      changed ? (changedOk ? "也送到了" : "停下了") : "待检验",
    ),
    el("strong", "", "② 路况变了"),
    el(
      "span",
      "small-note",
      changed
        ? changedOk
          ? "封了一段路，方案照样完成"
          : "封了一段路，跑跑停下了——说说原因"
        : "平常路况成功后，封一段路再试",
    ),
    commandButton(
      context,
      changed ? "再试一次" : "路况变了再试",
      "project-variation",
      { type: "variation" },
      "button secondary small",
      context.editingDisabled || !ws.baseline || !normal,
      "rule",
    ),
  );
  tests.append(normalCard, changedCard);
  parent.append(tests);
  if (!ws.plan.length)
    parent.append(
      commandButton(
        context,
        "先去排步骤",
        "project-to-steps",
        { type: "tab", tab: "steps" },
        "button ghost",
        false,
        "notebook",
      ),
    );
  appendNote(
    context,
    parent,
    "路况变了以后发生了什么？",
    "这次……，原因是……。接下来我会……",
  );
}

function renderProject(context: PanelContext): HTMLElement {
  const content = section("我的校园小方案", "notebook");
  const id = context.activityId;
  if (id === "21") renderProjectPeople(context, content);
  else if (id === "22") renderProjectInformation(context, content);
  else if (id === "24") renderProjectTests(context, content);
  else if (id === "25") {
    content.append(
      field(
        "给方案起个名字",
        textControl(
          context,
          "project-title",
          context.view.state.projectTitle,
          "比如：开放日送书小队",
          (value) => ({ type: "projectText", key: "title", value }),
        ),
      ),
    );
    content.append(
      field(
        "介绍我的方案",
        textControl(
          context,
          "project-explanation",
          context.view.state.projectExplanation,
          "我帮了谁？用了哪些资料？哪一步是助手帮的？我检查了什么？",
          (value) => ({ type: "projectText", key: "explanation", value }),
          true,
        ),
      ),
    );
    const tests = details("project-evidence", "看看两次检验");
    renderProjectTests(context, tests);
    content.append(tests);
  } else {
    content.append(
      taskBrief(context),
      commandButton(
        context,
        "去排步骤",
        "project-edit-steps",
        { type: "tab", tab: "steps" },
        "button secondary",
        false,
        "notebook",
      ),
    );
  }
  return content;
}

/* ------------------------------------------------------------------ */
/* Footer: run controls                                                */
/* ------------------------------------------------------------------ */

function renderRunLog(context: PanelContext): HTMLElement | null {
  const { ws } = context.view;
  if (!ws.run.trace.length) return null;
  const frames = ws.run.trace.slice(-3);
  const log = el("ol", "run-log");
  log.setAttribute("aria-label", "跑跑刚才做了什么");
  frames.forEach((frame, index) => {
    const latest = index === frames.length - 1;
    const item = el(
      "li",
      `${latest ? "latest" : ""}${frame.event === "stop" ? " stop" : ""}${frame.event === "finish" ? " finish" : ""}`,
    );
    item.append(el("span", "", frame.message));
    log.append(item);
  });
  return log;
}

function renderFooter(context: PanelContext, result: CompletionResult): HTMLElement {
  const { view } = context;
  const { ws, state } = view;
  const footer = el("footer", "panel-footer");
  const passive =
    !context.laboratory &&
    ["01", "02", "03", "05", "21", "22", "25"].includes(context.activityId) &&
    !["steps", "routes", "rules"].includes(ws.tab);
  if (!passive) {
    const row = el("div", "run-actions");
    const primary = view.playing
      ? commandButton(
          context,
          "暂停",
          "pause-panel",
          { type: "pause" },
          "button primary run",
          !view.ready,
          "pause",
        )
      : commandButton(
          context,
          ws.problem.goal.type === "reach" ? "试走这条路" : "试一试",
          "run-plan",
          { type: "trial", mode: "auto" },
          "button primary run",
          context.editingDisabled,
          "play",
        );
    const single = commandButton(
      context,
      "下一步",
      "single-step",
      { type: "trial", mode: "single" },
      "button secondary",
      context.editingDisabled,
      "step",
    );
    single.title = "让跑跑只做一步";
    const reset = commandButton(
      context,
      "",
      "reset-plan",
      { type: "reset" },
      "icon-button",
      context.editingDisabled,
      "reset",
    );
    reset.title = "回到起点，重新开始";
    reset.setAttribute("aria-label", "回到起点，重新开始");
    row.append(primary, single, reset);
    footer.append(row);
  }
  const completed = context.laboratory
    ? state.labCompleted.includes(state.labId)
    : state.completed.includes(context.activityId);
  const progress = el("div", "completion-actions");
  if (!context.laboratory && context.activityId === "25") {
    progress.append(
      commandButton(
        context,
        completed ? "作品已保存 · 再保存一次" : "保存作品",
        "finish-activity",
        { type: "finish" },
        `button ${result.complete ? "primary" : "secondary"} wide`,
        context.editingDisabled || !result.complete,
        "check",
      ),
    );
  } else if (completed && !view.celebration) {
    const next = nextActivity(context);
    progress.append(el("span", "done-chip", "这一环节完成了"));
    if (next)
      progress.append(
        commandButton(
          context,
          `下一站：${next.title}`,
          "next-activity",
          { type: "next" },
          "button ghost small",
          context.editingDisabled,
          "next",
        ),
      );
  }
  if (progress.childElementCount) footer.append(progress);
  return footer;
}

function renderTeacher(context: PanelContext): HTMLElement | null {
  if (context.laboratory) return null;
  const activity = getActivity(context.activityId);
  const box = details("teacher", "给老师和家长");
  box.classList.add("teacher-note");
  box.append(
    el("p", "", activity.teacher),
    el(
      "p",
      "small-note",
      `第 ${activity.lesson} 课“${LESSONS[activity.lesson - 1].title}”建议 ${LESSONS[activity.lesson - 1].minutes} 分钟。能量点是教学用的代价，不是真实电量；路线由本机规则计算，没有接入大模型。`,
    ),
  );
  return box;
}

/** Render current controls only. All persistent and simulation changes go through dispatch. */
export function renderPanel(
  host: HTMLElement,
  view: PanelView,
  dispatch: PanelDispatch,
): void {
  const key = `${view.ws.id}:${view.state.mode}:${view.state.activityId}:${view.state.labId}:${view.ws.tab}`;
  const sameContext = renderMemory.get(host)?.context === key;
  if (!sameContext) {
    uiState.picker = "";
    uiState.group = null;
  }
  const active = host.contains(document.activeElement)
    ? (document.activeElement as HTMLElement)
    : null;
  const focusKey = sameContext ? active?.dataset.focus : undefined;
  const editable =
    (active instanceof HTMLInputElement &&
      ["text", "search", "email", "url", "tel", "password"].includes(
        active.type,
      )) ||
    active instanceof HTMLTextAreaElement;
  const selection = editable
    ? {
        value: active.value,
        start: active.selectionStart,
        end: active.selectionEnd,
      }
    : null;
  const openDetails = new Set(
    sameContext
      ? Array.from(
          host.querySelectorAll<HTMLDetailsElement>(
            "details[open][data-panel-detail]",
          ),
        ).map((item) => item.dataset.panelDetail)
      : [],
  );
  const existingDetails = new Set(
    sameContext
      ? Array.from(
          host.querySelectorAll<HTMLDetailsElement>(
            "details[data-panel-detail]",
          ),
        ).map((item) => item.dataset.panelDetail)
      : [],
  );
  const context: PanelContext = {
    view,
    dispatch,
    activityId: view.state.activityId,
    laboratory: view.state.mode === "lab",
    project:
      view.state.mode !== "lab" &&
      (view.state.mode === "project" || Number(view.state.activityId) >= 21),
    editingDisabled: view.busy || view.playing || !view.ready || !view.started,
  };
  const result = evaluate(context);
  const body = el("div", "panel-body");
  const guidance = [renderIntro(context), renderSpeech(context), renderSteps(context, result)];
  if (
    !context.laboratory &&
    getActivity(context.activityId).carryFrom &&
    !context.project &&
    view.ws.origin === "reference" &&
    view.state.completed.includes(getActivity(context.activityId).carryFrom!)
  ) {
    const offer = el("div", "carry-offer");
    offer.append(
      el("span", "", "上一环节你已经完成了，可以接着你自己的结果来。"),
      commandButton(
        context,
        "接着我的结果",
        "recarry",
        { type: "recarry" },
        "button ghost small",
        context.editingDisabled,
        "next",
      ),
    );
    body.append(offer);
  }
  const tabs = renderTabs(context);
  const renderers: Record<PanelTab, (context: PanelContext) => HTMLElement> = {
    task: renderTask,
    steps: renderStepCards,
    rules: renderRules,
    routes: renderRoutes,
    project: renderProject,
  };
  const action = renderers[view.ws.tab](context);
  const radio = action.querySelector<HTMLElement>('.radio-card');
  const radioControl = radio?.querySelector<HTMLButtonElement>('button');
  if (radioControl) {
    radioControl.title = radio!.querySelector('p')!.textContent!;
    radioControl.remove();
  }
  const actionNodes = [action];
  const pages: Screen[] = [{ id: 'action', label: '动手操作', nodes: actionNodes }, { id: 'guidance', label: '任务提示', nodes: guidance }];
  if (radio) pages.push({ id: 'radio', label: '对讲机说明', nodes: [radio] });
  if (view.celebration) pages.push({ id: 'discovery', label: '本次发现', nodes: [renderCelebration(context)] });
  const log = renderRunLog(context);
  if (log) pages.push({ id: 'log', label: '行车日志', nodes: [log] });
  const teacher = renderTeacher(context);
  if (teacher) pages.push({ id: 'notes', label: '实现与边界', nodes: [teacher] });
  if (body.children.length) guidance.push(...[...body.children] as HTMLElement[]);
  const pageKey = `${key}:${Boolean(view.celebration)}`;
  screens(body, pageKey, pages, view.celebration ? 'discovery' : 'action', true);
  if (tabs) {
    body.querySelector(':scope > .panel-pages')!.prepend(tabs);
    tabs.addEventListener('click', event => {
      if ((event.target as Element).closest('[data-action^="tab-"]')) activateScreen(pageKey, 'action');
    });
  }
  // several cards fit on one page; the order overview still shows five at a time
  action.querySelectorAll<HTMLElement>('.action-list').forEach(list => recordPages(list, 4, `${key}:cards`, uiState.selectedCard));
  uiState.selectedCard = undefined;
  if (view.ws.tab === 'steps' && action.querySelector('.action-list')) {
    const nodes = [...action.children] as HTMLElement[];
    const tools = nodes.filter(node => node.matches('.palette-label, .action-palette, .mini-actions, .route-legend'));
    const edit = nodes.filter(node => !tools.includes(node));
    screens(action, `tools:${context.activityId}`, [
      { id: 'edit', label: '步骤卡', nodes: edit },
      { id: 'add', label: '加卡与组合', nodes: tools },
    ], 'edit');
  }
  if (context.activityId === '05' && view.ws.tab === 'task') {
    const notes = [...action.querySelectorAll<HTMLElement>('.request-note')];
    const list = el('div', 'request-pages');
    list.dataset.pageUnit = '个场景';
    notes[0]?.before(list); list.append(...notes);
    recordPages(list, 1, `${key}:requests`);
  }
  if (view.ws.tab === 'routes') {
    const nodes = [...action.children] as HTMLElement[];
    const conditions = nodes.filter(node => node.matches('details'));
    conditions.forEach(node => { (node as HTMLDetailsElement).open = true; });
    const compare = nodes.filter(node => node.matches('.route-suggestions'));
    const notes = nodes.filter(node => node.matches('.field, .note-editor'));
    const description = nodes.filter(node => node.matches('.task-brief'));
    const edit = nodes.filter(node => ![...conditions, ...compare, ...notes, ...description].includes(node));
    const routePages: Screen[] = [
      { id: 'edit', label: '画路线', nodes: edit },
      { id: 'compare', label: '比较候选', nodes: compare },
      { id: 'conditions', label: '路况与预算', nodes: conditions },
    ];
    if (notes.length) routePages.push({ id: 'notes', label: '整理发现', nodes: notes });
    screens(action, `route-tools:${context.activityId}`, routePages, 'edit');
    const guidancePane = body.querySelector<HTMLElement>('[data-page="guidance"]')!;
    guidancePane.append(...description);
  }
  action.querySelectorAll<HTMLElement>('.run-log, .route-candidates').forEach(list => recordPages(list, 3, `${key}:${list.className}`));
  const footer = renderFooter(context, result);
  if (radioControl) (footer.querySelector('.run-actions') || footer).append(radioControl);
  host.replaceChildren(body, footer);
  if (view.feedback) {
    // a successful run that still leaves this station open says what is left, instead of only "任务完成"
    const text = view.feedback.text;
    const pending = view.feedback.good && !result.complete && result.missing.length && view.ws.run.status === 'finished' ? result.missing[0] : '';
    const feedback = el('div', `current-feedback${view.feedback.good ? ' good' : ''}`, pending ? `${text}这一站还想请你多看一步：${pending}` : text);
    feedback.setAttribute('role', 'status');
    host.append(feedback);
  }
  for (const detail of host.querySelectorAll<HTMLDetailsElement>(
    "details[data-panel-detail]",
  )) {
    if (existingDetails.has(detail.dataset.panelDetail))
      detail.open = openDetails.has(detail.dataset.panelDetail);
  }
  if (focusKey) {
    const replacement = Array.from(
      host.querySelectorAll<HTMLElement>("[data-focus]"),
    ).find((element) => element.dataset.focus === focusKey);
    if (replacement && !replacement.hasAttribute("disabled")) {
      if (
        selection &&
        (replacement instanceof HTMLInputElement ||
          replacement instanceof HTMLTextAreaElement)
      ) {
        replacement.value = selection.value;
        if (selection.start !== null && selection.end !== null)
          replacement.setSelectionRange(selection.start, selection.end);
      }
      replacement.focus({ preventScroll: true });
    }
  }
  renderMemory.set(host, {
    context: key,
    celebrating: Boolean(view.celebration),
  });
}
