import type {} from "../../../shared/linkage/platform-client.d.ts";
import { LABS, LESSONS, getActivity } from "./content/lessons.ts";
import "../../../shared/linkage/course-links.js";
import { WorkshopController } from "./core/controller.ts";
import { cargoLoad, dryRoute, goalCheck } from "./core/simulation.ts";
import { getWorkspace, worldState } from "./core/course-state.ts";
import { ITEM_NAMES, ITEM_UNITS, createCampus } from "./core/graphs.ts";
import { readSave, writeSave, SAVE_KEY, type StorageLike } from "./core/storage.ts";
import { createBoardGame } from "./render/BoardScene.ts";
import { WorkshopShell } from "./ui/shell.ts";
import { renderPanel } from "./ui/panels.ts";
import { button, el } from "./ui/dom.ts";
import {
  createModalHost,
  openCatalogue,
  openNotebook,
  openSettings,
} from "./ui/modals.ts";
import type { BoardBubble, BoardView, Speaker } from "./render/contracts.ts";
import type { TaskCardView } from "./ui/contracts.ts";
import type { Mood, PersonId } from "./art/paper-people.ts";

async function startChapter() {
const platform = await window.NovaPlatformReady;
if (platform) await platform.ready;
const localPort: StorageLike = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};
const storage = platform
  ? await platform.openChapter({ chapter: 4, keys: [SAVE_KEY],
      validate: (_key, raw) => readSave({ ...localPort, getItem: () => raw }).writable })
  : localPort;
const loaded = readSave(storage);
let ready = false;
let started = false;
let notice = loaded.warning;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let paintQueued = false;
let audioContext: AudioContext | null = null;
let lastSoundFrame = "";
const app = document.querySelector<HTMLElement>("#app")!;
const controller = new WorkshopController(loaded.state, changed, () => {
  /* Feedback is spoken in the panel and on the board, not as a toast. */
});

const PERSON_BY_NAME: Record<string, PersonId> = {
  林老师: "lin",
  小满: "xiaoman",
  小雨: "xiaoyu",
  阿乐: "ale",
};

const shell = new WorkshopShell(app, {
  start: () => {
    started = true;
    activateAudio();
    render();
  },
  openLessons: () => openCatalogue(modals, "course"),
  openNotebook: () => openNotebook(modals),
  openLab: () => openCatalogue(modals, "lab"),
  openCourse: () => {
    modals.close();
    started = true;
    controller.selectActivity(controller.state.activityId);
  },
  openSettings: () => openSettings(modals),
  pause: () => controller.pause(),
});

const modals = createModalHost({
  shell,
  app,
  controller,
  begin: () => {
    started = true;
    activateAudio();
  },
  changed: () => changed(true),
  notice: () => notice,
});

function activateAudio() {
  if (!controller.state.settings.sound) return;
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume().catch(() => {});
  } catch {
    /* Sound is optional; the visible result is authoritative. */
  }
}
/** Small paper-like clicks: a note per event, a soft chord when a task is done. */
function playCue() {
  const ws = controller.ws,
    frame = ws.run.trace.at(-1);
  const frameKey = `${ws.id}/${ws.runId}/${frame?.sequence}`;
  if (!frame || lastSoundFrame === frameKey) return;
  lastSoundFrame = frameKey;
  if (
    !controller.state.settings.sound ||
    !audioContext ||
    audioContext.state !== "running"
  )
    return;
  const done =
    frame.event === "finish" && goalCheck(ws.problem, ws.run).complete;
  const notes =
    frame.event === "stop"
      ? [220, 196]
      : done || frame.event === "confirm"
        ? [523, 659, 784]
        : frame.event === "move"
          ? [440]
          : [587];
  const context = audioContext;
  const now = context.currentTime;
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator(),
      gain = context.createGain(),
      start = now + index * 0.07;
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.04, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.2);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  });
}
function save() {
  if (!loaded.writable) return;
  const result = writeSave(storage, controller.state);
  if (result.ok) window.dispatchEvent(new CustomEvent("nova:progress", { detail: {
    chapter: 4, completed: controller.state.completed.length, total: 25, pathLabel: "校园行动与方案",
    artifactCount: Number(Boolean(controller.state.projectSavedKey)),
  }}));
  if (!result.ok && notice !== result.error) {
    notice = result.error;
    shell.toast(notice!);
  }
}
function changed(shouldRender: boolean) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 250);
  if (shouldRender && !paintQueued) {
    paintQueued = true;
    requestAnimationFrame(() => {
      paintQueued = false;
      render();
    });
  }
}

/* ---------------- speech on the board ---------------- */

let bubbles: BoardBubble[] = [];
let bubbleSeq = 0;
let lastFrameKey = "";
let lastFeedback = "";
function say(speaker: Speaker, text: string) {
  bubbles = [...bubbles.slice(-5), { id: `b${++bubbleSeq}`, speaker, text }];
}
function recipient(): PersonId | null {
  const goal = controller.ws.problem.goal;
  return goal.type === "delivery"
    ? (PERSON_BY_NAME[goal.recipient] ?? null)
    : null;
}
function collectBubbles() {
  const ws = controller.ws;
  const frame = ws.run.trace.at(-1);
  const key = frame ? `${ws.id}/${ws.runId}/${frame.sequence}` : "";
  if (frame && key !== lastFrameKey) {
    lastFrameKey = key;
    const who = recipient();
    const goal = ws.problem.goal;
    const campus = ws.problem.graph.id === "campus";
    if (frame.event === "take" || frame.event === "stop")
      say("paopao", frame.message);
    if (frame.event === "give")
      say(
        campus && who ? who : "paopao",
        campus && who ? "收到啦！" : frame.message,
      );
    if (frame.event === "confirm" && who && campus)
      say(who, "确认收到，谢谢跑跑！");
    if (frame.event === "charge") say("paopao", "能量补满啦！");
    if (frame.event === "finish") {
      const check = goalCheck(ws.problem, ws.run);
      const judging =
        controller.state.mode === "course" &&
        controller.state.activityId === "04" &&
        ws.answers.judge04 !== "notyet";
      if (judging && check.arrived && !check.delivered)
        // In 04 the robot claims success first; the learner does the judging.
        say("paopao", "到啦！卡片全做完了，送完啦！");
      else if (
        goal.type === "delivery" &&
        who &&
        campus &&
        check.arrived &&
        !check.delivered
      )
        say(who, `${ITEM_NAMES[goal.item]}呢？我还没拿到呀。`);
      else if (!check.complete || goal.type === "reach")
        say("paopao", check.message);
    }
  }
  const feedback = controller.feedback?.text ?? "";
  if (feedback !== lastFeedback) {
    lastFeedback = feedback;
    const match = /^(林老师|小满|小雨|阿乐)：(.*)$/s.exec(feedback);
    if (match && PERSON_BY_NAME[match[1]])
      say(PERSON_BY_NAME[match[1]], match[2]);
  }
}

/** Where a returning learner left off, for the welcome note. */
function resumePoint(): { title: string; detail: string } | null {
  const state = controller.state;
  const fresh =
    state.mode === "course" &&
    state.activityId === "01" &&
    !state.completed.length &&
    !state.labCompleted.length;
  if (fresh) return null;
  const activity = getActivity(state.activityId);
  const title =
    state.mode === "lab"
      ? `路线实验室 · ${LABS.find((lab) => lab.id === state.labId)!.title}`
      : state.mode === "project"
        ? "我的校园小方案"
        : activity.title;
  const done = state.completed.length;
  const where =
    state.mode === "course"
      ? `第 ${activity.lesson} 课第 ${Number(activity.id)} 站。`
      : "";
  return {
    title,
    detail: `${where}${done ? `已经走完 ${done} / 25 站，` : ""}上次的步骤和记录都还在。`,
  };
}

/* ---------------- header: the task card ---------------- */

/** Real place names. The task card keeps what the learner was told, even
 * while the robot's map still shows a smudged label. */
const CAMPUS_NAMES = new Map(
  createCampus().nodes.map((node) => [node.id, node.label]),
);

function taskCard(): TaskCardView {
  const state = controller.state,
    ws = controller.ws,
    goal = ws.problem.goal;
  const label = (id: string) => {
    const name = ws.problem.graph.nodes.find((node) => node.id === id)?.label;
    return name && !["？", "?"].includes(name) ? name : "？";
  };
  const check = goalCheck(ws.problem, ws.run);
  const ran = ws.run.trace.length > 0;
  if (goal.type === "reach") {
    const lab = state.mode === "lab";
    return {
      kind: "reach",
      person: null,
      personName: "",
      title: lab
        ? `路线实验室 · ${LABS.find((item) => item.id === state.labId)!.title}`
        : getActivity(state.activityId).title,
      item: null,
      itemText: `能量预算 ${ws.problem.energy} 点`,
      route: `${label(ws.problem.start)} → ${label(goal.destination)}`,
      stamps: [
        {
          label:
            ws.problem.objective === "fewestSteps" ? "少走几段" : "少花能量",
          set: true,
          met: false,
          // a preference guides the route choice; it is not something a run passes or fails
          preference: ran && check.arrived,
        },
        ...(ws.problem.requireRamp
          ? // the run cannot arrive without a ramp when this is on, so arriving meets it
            [{ label: "必须走坡道", set: true, met: ran && check.arrived }]
          : []),
        { label: "到达终点", set: true, met: ran && check.arrived },
      ],
    };
  }
  if (state.mode === "course" && state.activityId === "05") {
    // 05 is about choosing helpers, so the card holds the three new notes.
    const chosen = (key: string) => Boolean(ws.answers[key]);
    return {
      kind: "delivery",
      person: null,
      personName: "",
      title: "委托板上又来了三张便签",
      item: null,
      itemText: "递笔 · 摆手册 · 送道具",
      route: "给每张便签选个帮法",
      stamps: [
        { label: "小雨", set: true, met: chosen("tool-near") },
        { label: "阿乐", set: true, met: chosen("tool-fixed") },
        { label: "小满", set: true, met: chosen("tool-changing") },
      ],
    };
  }
  const first = state.mode !== "lab" && state.activityId === "01";
  const asked = (field: string) => !first || ws.asked.includes(field);
  const conditions = asked("completion") ? ["arrive", "give", "confirm"] : [];
  return {
    kind: "delivery",
    person: asked("recipient")
      ? (PERSON_BY_NAME[goal.recipient] ?? null)
      : null,
    personName: goal.recipient,
    title: asked("recipient")
      ? `${goal.recipient}的委托`
      : "一张没写完的便签",
    item: asked("item") ? goal.item : null,
    itemText: asked("item")
      ? `${goal.quantity} ${ITEM_UNITS[goal.item]}${ITEM_NAMES[goal.item]}`
      : "送什么？",
    route: asked("destination")
      ? `${label(goal.source)} → ${label(goal.destination) === "？" ? (CAMPUS_NAMES.get(goal.destination) ?? "？") : label(goal.destination)}`
      : "送到哪？",
    stamps: [
      {
        label: "到达",
        set: conditions.includes("arrive"),
        met: ran && check.arrived,
      },
      {
        label: "交到手上",
        set: conditions.includes("give"),
        met: ran && check.delivered,
      },
      {
        label: "确认收到",
        set: conditions.includes("confirm"),
        met: ran && check.confirmed && check.delivered,
      },
    ],
  };
}

function mission(): string {
  const state = controller.state;
  if (state.mode === "lab")
    return "路线实验室：在校园沙盘上试路线，想回校园随时都可以";
  const lesson = LESSONS[getActivity(state.activityId).lesson - 1];
  return `第 ${lesson.id} 课 · ${lesson.title}　|　${lesson.mission}`;
}

function render() {
  const state = controller.state,
    ws = controller.ws;
  const activity = getActivity(state.activityId);
  collectBubbles();
  shell.update({
    ready,
    started,
    mode: state.mode,
    task: taskCard(),
    mission: mission(),
    resume: resumePoint(),
    lesson: activity.lesson,
    completed: state.completed.length,
    energy: ws.run.energy,
    energyMax: ws.problem.energy,
    load: cargoLoad(ws.run.cargo),
    capacity: ws.problem.capacity,
    playing: controller.playing,
    moving: controller.moving,
    notice,
  });
  renderPanel(
    shell.panelHost,
    {
      state,
      ws,
      busy: controller.busy,
      playing: controller.playing,
      ready,
      started,
      search: controller.search,
      feedback: controller.feedback,
      celebration: controller.celebration,
    },
    (command) => {
      if (!ready || !started) return;
      activateAudio();
      controller.command(command);
    },
  );
  playCue();
}

function people(): { id: PersonId; mood: Mood }[] {
  const state = controller.state,
    ws = controller.ws;
  if (ws.problem.graph.id !== "campus") return [];
  const world = worldState(state);
  const who = recipient();
  const check = goalCheck(ws.problem, ws.run);
  const busyWith =
    state.mode !== "lab" &&
    ws.problem.goal.type === "delivery" &&
    !(state.mode === "course" && state.activityId === "05")
      ? who
      : null;
  return (["lin", "xiaoman", "xiaoyu", "ale"] as PersonId[]).map((id) => ({
    id,
    // A recipient waits where the delivery is going.
    at: id === busyWith ? ws.problem.goal.destination : undefined,
    mood: world.festival
      ? "happy"
      : id === busyWith
        ? check.complete && ws.run.trace.length
          ? "happy"
          : "waiting"
        : id === "lin" && world.rehearsal
          ? "happy"
          : "idle",
  }));
}

/** A dry run of the cards, before the robot sets off: the path it means to
 * take. Re-planning shows up here the moment a rule changes. */
let plannedCache = { key: "", route: [] as string[] };
function plannedRoute(): string[] {
  const ws = controller.ws;
  if (ws.problem.goal.type !== "delivery" || !ws.plan.length || ws.run.trace.length)
    return [];
  const key = JSON.stringify([ws.id, ws.revision, controller.graphRevision, ws.plan]);
  if (plannedCache.key === key) return plannedCache.route;
  const route = dryRoute(ws.problem, ws.plan);
  plannedCache = { key, route: route.length > 1 ? route : [] };
  return plannedCache.route;
}

function boardView(): BoardView {
  const ws = controller.ws;
  const state = controller.state;
  const active = [
    ws.problem.start,
    ...ws.run.trace
      .filter((frame) => frame.event === "move")
      .map((frame) => frame.node),
  ];
  const world = worldState(state);
  return {
    graph: ws.problem.graph,
    graphRevision: controller.graphRevision,
    epoch: controller.epoch,
    mode: ws.problem.graph.id === "campus" ? "campus" : "lab",
    robotNode: ws.run.node,
    cargo: ws.run.cargo,
    delivered: ws.run.delivered,
    energy: ws.run.energy,
    capacity: ws.problem.capacity,
    startNode: ws.problem.start,
    goalNode: ws.problem.goal.destination,
    selectedNode: ws.selectedNode,
    selectedRoad: ws.selectedRoad,
    manualRoute:
      ws.problem.goal.type === "reach" || ws.tab === "routes"
        ? ws.manualRoute
        : [],
    suggestions: controller.search?.routes ?? [],
    activeRoute: active,
    plannedRoute: plannedRoute(),
    explored: controller.search?.explored ?? [],
    playing: controller.playing,
    reducedMotion: state.settings.reducedMotion,
    showCosts:
      ws.tab === "rules" ||
      ws.tab === "routes" ||
      ws.problem.goal.type === "reach",
    showLabels: true,
    world: {
      ...world,
      rain:
        state.mode !== "lab" &&
        state.activityId === "12" &&
        !ws.problem.factsKnown,
    },
    people: people(),
    bubbles,
    inventory: ws.run.inventory,
  };
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) controller.pause();
});
window.addEventListener("pagehide", save);
render();
createBoardGame(shell.boardHost, {
  read: boardView,
  nodeClick: (id) => {
    if (ready && started && !modals.open())
      controller.command({ type: "drawNode", id });
  },
  roadClick: (id) => {
    if (ready && started && !modals.open())
      controller.command({ type: "selectRoad", id });
  },
  motionChanged: (moving) => controller.setMoving(moving),
  ready: () => {
    ready = true;
    render();
  },
  error: (message) => {
    controller.pause();
    ready = false;
    notice = message;
    render();
    const body = modals.show("棋盘还没有摆好", "help");
    body.append(
      el("p", "side-copy", message),
      button("重新加载", "reload", () => location.reload(), "button primary"),
    );
  },
});
setInterval(() => {
  if (!modals.open() && started && ready) controller.tick();
}, 620);

(window as Window & { NovaCourseLinks?: { mountReturn(): void } }).NovaCourseLinks?.mountReturn();

// Read-only diagnostics: browser tests must perform edits through visible controls.
if (import.meta.env.DEV)
  Object.defineProperty(window, "__workshop", {
    value: {
      snapshot: () =>
        structuredClone({
          state: controller.state,
          run: getWorkspace(controller.state).run,
          playing: controller.playing,
          moving: controller.moving,
          celebration: controller.celebration,
          ready,
          started,
          view: boardView(),
        }),
    },
  });

}
void startChapter();
