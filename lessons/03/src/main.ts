import type {} from "../../../shared/linkage/platform-client.d.ts";
import "./ui/styles.css";
import "../../../shared/linkage/course-links.js";
import "./ui/workbench.css";
import {
  createForestGame,
  activateForestLife,
  greetForestResident,
  inspectForest,
} from "./render/ForestScene.ts";
import type { Elevation, ForestViewState } from "./render/contracts.ts";
import { Shell } from "./ui/shell.ts";
import { renderMap } from "./ui/map.ts";
import { renderJournal } from "./ui/journal.ts";
import { renderWorkbench } from "./ui/workbench.ts";
import { createLivingPanel } from "./ui/living.ts";
import { el, button } from "./ui/tool-dom.ts";
import { assetUrl } from "./asset-url.ts";
import { guideFor, wordArt } from "./content/lesson-guides.ts";
import { ACTIVITIES, MISSIONS, activityById } from "./content/activities.ts";
import {
  CANOPY_CONNECTIONS,
  LIFE_INTERACTIONS,
  RESIDENTS,
} from "./content/habitats.ts";
import {
  completeActivity,
  currentActivityId,
  phaseFor,
  createState,
} from "./core/state.ts";
import {
  canReach,
  movePlayer,
  CAMP_X,
  regionAt,
  INTERACTION_RADIUS,
} from "./core/world.ts";
import {
  canNavigate,
  chooseConnection,
  connectionAt,
  sampleTraversal,
} from "./core/navigation.ts";
import type { TraversalPlan } from "./core/navigation.ts";
import {
  beginTraversal,
  advanceTraversal,
  retargetTraversal,
} from "./core/traversal.ts";
import type { TraversalDestination, TraversalState } from "./core/traversal.ts";
import { nearbyWorldAction } from "./core/life.ts";
import { readSave, writeSave, SAVE_KEY } from "./core/storage.ts";
import type { StorageLike } from "./core/storage.ts";
import { createSeedExamples } from "./media/specimens.ts";
import { loadSpecimenArt } from "./media/specimen-art.ts";
import { fitExamples } from "./media/classifier.ts";
import { AudioPlayer } from "./media/audio.ts";

async function startChapter() {
const platform = await window.NovaPlatformReady;
if (platform) await platform.ready;
// Defer storage access until inside the read/write error boundaries; some
// school browser policies throw even when reading the localStorage property.
const localPort: StorageLike = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
const storage = platform
  ? await platform.openChapter({ chapter: 3, keys: [SAVE_KEY],
      validate: (_key, raw) => readSave({ ...localPort, getItem: () => raw }).writable })
  : localPort;
const loaded = readSave(storage);
let state = loaded.state,
  writable = loaded.writable,
  warning = loaded.warning;
// The starting picture book is drawn from the painted objects, so it waits for
// them, and so does the start button. A save gets a new book only while its
// book is still the untouched starting one: every photo and example a child
// made keeps its original pixels.
let sceneReady = false,
  specimensReady = false;
const untouchedBook = () =>
  state.models.length === 1 &&
  state.models[0].examples.every((example) => example.id.startsWith("seed-"));
void loadSpecimenArt().then(() => {
  if (!state.models.length || untouchedBook())
    state.models = [fitExamples(createSeedExamples(), 1)];
  specimensReady = true;
  ready = sceneReady;
  updateShell();
});
const audio = new AudioPlayer();
audio.setEnabled(!state.preferences.muted);
let ready = false,
  started = false,
  targetX: number | null = null,
  pendingActivity: string | null = null;
let pendingRoute: {
    plan: TraversalPlan;
    destination: TraversalDestination;
  } | null = null,
  touchDirection = 0;
let transit: TraversalState | null = null;
let windowFocused = document.hasFocus();
let disposePanel: (() => void) | null = null,
  previousFocus: HTMLElement | null = null,
  saveTimer: number | undefined,
  lastPositionSave = 0;
const root = document.querySelector<HTMLElement>("#ui")!;
const shell = new Shell(root, {
  start,
  openActivity,
  openMap,
  openJournal,
  openSettings,
  toggleMute,
  moveTouch(direction) {
    touchDirection = direction;
    if (direction) {
      targetX = null;
      pendingActivity = null;
      pendingRoute = null;
      if (transit) transit = retargetTraversal(transit, null);
    }
  },
  lift: changeElevation,
  worldAction: interactWithWorld,
});
const livingHost = el("div", "living-panel-host");
livingHost.id = "forest-living";
root.append(livingHost);
const living = createLivingPanel(livingHost, {
  close: closePanel,
  goToActivity: openActivity,
  activate: activateLife,
});

function blocked() {
  return (
    !started ||
    shell.panelHost.childElementCount > 0 ||
    living.isOpen() ||
    document.hidden ||
    !windowFocused
  );
}
function persist() {
  if (!writable) return;
  const result = writeSave(storage, state);
  if (result.ok) window.dispatchEvent(new CustomEvent("nova:progress", { detail: {
    chapter: 3, completed: state.completed.length, total: ACTIVITIES.length, pathLabel: "森林委托",
    artifactCount: state.observations.length + state.sounds.length + Math.max(0, state.models.length - 1),
  }}));
  if (!result.ok) {
    warning = result.error;
    updateShell();
  } else if (warning?.includes("本机空间")) {
    warning = null;
    updateShell();
  }
}
function changed() {
  state.updatedAt = Date.now();
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(persist, 400);
  updateShell();
}
function nearest() {
  if (transit) return undefined;
  const activeId = currentActivityId(state);
  return ACTIVITIES.filter(
    (a) =>
      a.phase <= phaseFor(state) &&
      a.elevation === state.player.elevation &&
      Math.abs(a.x - state.player.x) <= INTERACTION_RADIUS &&
      (a.id === activeId || state.completed.includes(a.id)),
  ).sort(
    (a, b) =>
      Number(b.id === activeId) - Number(a.id === activeId) ||
      Math.abs(a.x - state.player.x) - Math.abs(b.x - state.player.x),
  )[0];
}
function updateShell() {
  const activeTransit = transit;
  const routeName =
    activeTransit &&
    CANOPY_CONNECTIONS.find(
      (connection) => connection.id === activeTransit.plan.connectionId,
    )?.name;
  shell.update(state, {
    ready,
    started,
    blocked: blocked(),
    location:
      routeName ||
      (state.player.elevation === "canopy"
        ? "树冠环廊"
        : regionAt(state.player.x).name),
    nearby: nearest()?.id ?? null,
    nearbyWorld: transit
      ? null
      : nearbyWorldAction(state.player, phaseFor(state)),
    traveling: transit !== null,
    warning,
  });
}
function stop() {
  targetX = null;
  touchDirection = 0;
  pendingActivity = null;
  pendingRoute = null;
  if (transit) transit = retargetTraversal(transit, null);
}
function readView(): ForestViewState {
  const sample = transit && sampleTraversal(transit.plan, transit.progress);
  return {
    x: sample ? sample.x : state.player.x,
    elevation: state.player.elevation,
    phase: phaseFor(state),
    blocked: blocked(),
    started,
    muted: state.preferences.muted,
    reducedMotion: state.preferences.reducedMotion,
    targetX: transit ? null : targetX,
    activeActivityId: currentActivityId(state),
    completedIds: state.completed,
    ...(sample
      ? { transit: { feetY: sample.y, slope: sample.slope, kind: sample.kind } }
      : {}),
  };
}
function start() {
  if (!ready) return;
  started = true;
  audio.setEnabled(!state.preferences.muted);
  updateShell();
  shell.toast(
    state.completed.length
      ? "欢迎回来！照片、例子册和委托都还在。"
      : "按 A / D 走路。走到发光的观察桌旁按 E，遇到森林伙伴按 F。",
  );
}
function walkTo(x: number) {
  if (blocked()) return;
  const origin = transit ? transit.plan.exit : state.player;
  const destination = { x, elevation: origin.elevation, activityId: null };
  if (!canNavigate(origin, destination, phaseFor(state))) {
    shell.toast("这条路还没开，先完成眼前的委托吧。");
    return;
  }
  setDestination(destination);
  updateShell();
}
function move(direction: number, seconds: number) {
  if (blocked()) return;
  if (transit) {
    if (direction) transit = retargetTraversal(transit, null);
    return;
  }
  const old = state.player.x;
  if (
    targetX !== null &&
    direction !== 0 &&
    Math.sign(targetX - old) !== Math.sign(direction)
  ) {
    targetX = null;
    pendingActivity = null;
    pendingRoute = null;
  }
  let x = movePlayer(old, direction, seconds, phaseFor(state));
  if (state.player.elevation === "canopy")
    x = Math.max(9000, Math.min(29700, x));
  if (targetX !== null && Math.abs(targetX - old) <= Math.abs(x - old) + 2) {
    x = targetX;
    targetX = null;
  }
  state.player.x = x;
  visitCurrentRegion();
  beginPendingTraversal();
  openPendingActivity();
  if (x !== old && performance.now() - lastPositionSave > 5000) {
    lastPositionSave = performance.now();
    changed();
  }
}
function visitCurrentRegion() {
  const region = regionAt(state.player.x).id;
  if (!state.visitedRegions.includes(region)) state.visitedRegions.push(region);
}
function openPendingActivity() {
  if (transit) return;
  if (pendingActivity) {
    const activity = activityById(pendingActivity);
    if (
      activity.elevation === state.player.elevation &&
      Math.abs(activity.x - state.player.x) < 155
    ) {
      const id = pendingActivity;
      pendingActivity = null;
      queueMicrotask(() => openActivity(id));
    }
  }
}
function beginPendingTraversal() {
  if (
    !pendingRoute ||
    transit ||
    Math.abs(state.player.x - pendingRoute.plan.entry.x) > 2
  )
    return;
  const route = pendingRoute;
  state.player = { ...route.plan.entry };
  transit = beginTraversal(route.plan, route.destination);
  targetX = null;
  pendingActivity = null;
  pendingRoute = null;
  touchDirection = 0;
  changed();
}
function setDestination(destination: TraversalDestination) {
  targetX = null;
  pendingActivity = null;
  pendingRoute = null;
  touchDirection = 0;
  if (transit) {
    transit = retargetTraversal(transit, destination);
    return;
  }
  const plan = chooseConnection(state.player, destination, phaseFor(state));
  if (plan) {
    pendingRoute = { plan, destination };
    targetX = plan.entry.x;
    beginPendingTraversal();
  } else {
    targetX =
      Math.abs(destination.x - state.player.x) < 0.05 ? null : destination.x;
    pendingActivity = destination.activityId;
    openPendingActivity();
  }
}
function updateTraversal(seconds: number) {
  if (!transit) return;
  transit = advanceTraversal(transit, seconds, blocked());
  if (transit.progress < 1) return;
  const completed = transit;
  transit = null;
  // Only a completed physical crossing changes the persistent floor and position.
  state.player = { ...completed.plan.exit };
  visitCurrentRegion();
  if (completed.destination) setDestination(completed.destination);
  changed();
}
function navigate(x: number, elevation: Elevation, id: string | null = null) {
  const origin = transit ? transit.plan.exit : state.player;
  const destination = { x, elevation, activityId: id };
  if (!canNavigate(origin, destination, phaseFor(state))) {
    shell.toast("这条路线还没有开放。");
    return;
  }
  closePanel();
  const plan = chooseConnection(origin, destination, phaseFor(state));
  setDestination(destination);
  if (plan) {
    const connection = CANOPY_CONNECTIONS.find(
      (item) => item.id === plan.connectionId,
    )!;
    shell.toast(
      `沿${connection.name}，前往${elevation === "canopy" ? "树冠" : "地面"}。`,
    );
  }
  updateShell();
}
function changeElevation() {
  if (blocked()) return;
  if (transit) return;
  if (phaseFor(state) < 3) {
    shell.toast("整理好例子册后，升降台、溪谷木坡和图书屋树阶会一起开放。");
    return;
  }
  const connection = connectionAt(
    state.player.x,
    state.player.elevation,
    phaseFor(state),
  );
  if (!connection) {
    const nearestConnection = connectionAt(
      state.player.x,
      state.player.elevation,
      phaseFor(state),
      Infinity,
    );
    shell.toast(
      nearestConnection
        ? `先走到${nearestConnection.name}，再切换路线。`
        : "先靠近一处树冠通路。",
    );
    return;
  }
  const elevation = state.player.elevation === "ground" ? "canopy" : "ground";
  navigate(
    elevation === "canopy" ? connection.topX : connection.bottomX,
    elevation,
  );
}
function worldInteractionAllowed(x: number, elevation: Elevation): boolean {
  return (
    started &&
    !transit &&
    !document.hidden &&
    windowFocused &&
    shell.panelHost.childElementCount === 0 &&
    elevation === state.player.elevation &&
    canReach(x, elevation, phaseFor(state)) &&
    Math.abs(x - state.player.x) <= INTERACTION_RADIUS
  );
}
function talkToResident(id: string) {
  const resident = RESIDENTS.find((item) => item.id === id);
  if (!resident || !worldInteractionAllowed(resident.x, resident.elevation))
    return;
  stop();
  living.showResident(resident, currentActivityId(state), phaseFor(state));
  updateShell();
  greetForestResident(game, id);
}
function activateLife(id: string) {
  const item = LIFE_INTERACTIONS.find((item) => item.id === id);
  if (!item || !worldInteractionAllowed(item.x, item.elevation)) return;
  stop();
  living.showInteraction(item, item.response);
  if (!activateForestLife(game, id))
    living.showInteraction(item, "这个物件暂时没有响应，先看看旁边的线索吧。");
  updateShell();
}
function interactWithWorld() {
  if (blocked() || transit) return;
  const action = nearbyWorldAction(state.player, phaseFor(state));
  if (action?.kind === "resident") talkToResident(action.id);
  else if (action) activateLife(action.id);
}
function toggleMute() {
  state.preferences.muted = !state.preferences.muted;
  audio.setEnabled(!state.preferences.muted);
  changed();
}
function preparePanel() {
  if (transit) touchDirection = 0;
  else stop();
  living.close();
  disposePanel?.();
  disposePanel = null;
  audio.stop();
  previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  shell.panelHost.replaceChildren();
}
function panelControls(): HTMLElement[] {
  return [...shell.panelHost.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')]
    .filter(node=>node.getClientRects().length>0 && !node.closest('[inert]'));
}
function focusPanel() {
  updateShell();
  requestAnimationFrame(() => {
    const controls=panelControls();
    (controls.find(node=>node.hasAttribute('data-initial-focus')) ?? controls.find(node=>node.closest('.lesson-focus')) ?? controls[0])?.focus();
  });
}
function closePanel() {
  living.close();
  disposePanel?.();
  disposePanel = null;
  audio.stop();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  shell.panelHost.replaceChildren();
  touchDirection = 0;
  updateShell();
  previousFocus?.focus();
  previousFocus = null;
  changed();
}
function openActivity(request?: string) {
  if (!started) return;
  const tool = request?.startsWith("tool:") ? request.slice(5) : null;
  const id = tool
    ? (nearest()?.id ?? currentActivityId(state))
    : (request ?? nearest()?.id ?? currentActivityId(state));
  const activity = ACTIVITIES.find((a) => a.id === id);
  if (!activity) return;
  if (!state.completed.includes(id) && id !== currentActivityId(state)) {
    shell.toast("这一站要等到后面的委托才开放，先做眼前这一站。");
    return;
  }
  const reachable =
    !transit &&
    activity.elevation === state.player.elevation &&
    Math.abs(activity.x - state.player.x) <= INTERACTION_RADIUS;
  if (!reachable && !state.completed.includes(id)) {
    navigate(activity.x, activity.elevation, id);
    shell.toast(`出发去「${activity.title}」。路上随时可以按方向键改主意。`);
    return;
  }
  if (
    tool === "sound" &&
    ![
      "sound",
      "noise",
      "fusion",
      "conflict",
      "delivery",
      "soundarchive",
      "rain",
    ].includes(activity.kind)
  ) {
    shell.toast(
      "这处观察台先用图片或资料调查。声音入口会在风铃和录音委托中使用。",
    );
    return;
  }
  preparePanel();
  disposePanel = renderWorkbench(shell.panelHost, state, activity, audio, {
    close: closePanel,
    changed,
    complete: finishActivity,
    message: (message) => shell.toast(message),
  });
  focusPanel();
}
function finishActivity(id: string) {
  const wasCompleted = state.completed.includes(id),
    result = completeActivity(state, id);
  if (!result.ok) {
    shell.toast(result.missing.join("；"));
    return;
  }
  const activity = activityById(id);
  closePanel();
  persist();
  if (wasCompleted) {
    shell.toast("这次回来看看的记录存好了。");
    return;
  }
  preparePanel();
  const panel = el("section", "paper-panel discovery-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "discovery-title");
  const heading = el(
    "h2",
    "",
    id === "25" ? "把你的发现留给森林" : "又收集到一片发现叶",
  );
  heading.id = "discovery-title";
  const content = el("div", "panel-body");
  const badge = el("img", "discovery-leaf");
  badge.src = assetUrl(
    id === "25" ? "ui/badges/leaf-all.png" : `ui/badges/leaf-${activity.mission}.png`,
  );
  badge.alt = "";
  content.append(
    el("p", "eyebrow", `第 ${state.completed.length} / ${ACTIVITIES.length} 片发现叶`),
    heading,
    el("p", "discovery-text", activity.discovery),
  );
  const word = guideFor(id).word;
  if (word.term) {
    const card = el("div", "ai-word");
    const art = wordArt(id);
    if (art) {
      const picture = el("img", "ai-word-art");
      picture.src = assetUrl(art);
      picture.alt = "";
      card.append(picture);
    }
    card.append(
      el("span", "ai-word-kicker", "AI 小词典 · 刚才你体验到的，有个名字"),
      el("strong", "ai-word-term", word.term),
      el("p", "ai-word-text", word.text),
    );
    content.append(card);
  }
  panel.append(badge);
  if (result.unlocked || id === "25")
    content.append(
      el("p", "unlock-message", MISSIONS[activity.mission - 1].unlock),
    );
  else
    content.append(
      el(
        "p",
        "muted",
        `下一处：${activityById(currentActivityId(state)).title}`,
      ),
    );
  const actions = el("div", "tool-actions");
  actions.append(
    button(
      id === "25" ? "翻开我的 AI 小词典" : "继续探索",
      "continue-exploration",
      () => {
        closePanel();
        if (id === "25") openJournal("glossary");
      },
      "button primary",
    ),
  );
  if (id !== "25")
    actions.append(
      button("沿路前往下一处", "go-next", () => {
        const next = activityById(currentActivityId(state));
        navigate(next.x, next.elevation, next.id);
      }),
    );
  content.append(actions);
  panel.append(content);
  shell.panelHost.replaceChildren(panel);
  focusPanel();
}
function openMap() {
  if (!started) return;
  preparePanel();
  renderMap(shell.panelHost, state, {
    select: (x, e) => navigate(x, e),
    fastTravel: (x, e) => {
      if (transit) {
        closePanel();
        shell.toast("先走到这段通路的出口，再使用溪边小舟。");
        return;
      }
      if (
        phaseFor(state) < 4 ||
        !canReach(x, e, phaseFor(state)) ||
        !state.visitedRegions.includes(regionAt(x).id)
      ) {
        shell.toast("先到达这片区域，回访时才能使用快捷回路。");
        return;
      }
      closePanel();
      state.player = { x, elevation: e };
      changed();
      shell.toast("沿溪边快捷回路回到熟悉的地方。");
    },
    close: closePanel,
  });
  focusPanel();
}
function exportRecords() {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          title: "森语奇旅·我的学习档案",
          exportedAt: new Date().toISOString(),
          scope: "本地课程素材与练习助手记录；课堂学习时长尚未实测",
          state,
        },
        null,
        2,
      ),
    ],
    { type: "application/json;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "森语奇旅-我的学习档案.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  shell.toast(
    "学习档案下载好了：照片、录音记录、标签、小助手的各个版本和你写的话都在里面。",
  );
}
function exportUnreadSave() {
  try {
    const original = storage.getItem(SAVE_KEY);
    if (original === null) {
      shell.toast("没有可导出的原始记录。");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([original], { type: "application/json;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "森语奇旅-原始未读记录.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    shell.toast("已导出未经修改的原始记录。");
  } catch {
    shell.toast("浏览器暂时不允许读取原始记录，记录没有被清除。");
  }
}
function openJournal(page: "clues" | "glossary" = "clues") {
  if (!started) return;
  preparePanel();
  renderJournal(
    shell.panelHost,
    state,
    {
      export: exportRecords,
      replayAuthored: () => openActivity("25"),
      close: closePanel,
      openActivity,
    },
    page,
  );
  focusPanel();
}
function openSettings() {
  if (!started) return;
  preparePanel();
  const panel = el("section", "paper-panel settings-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "休息与设置");
  const header = el("header", "panel-header");
  header.append(el("h2", "", "在树荫下休息一会儿"));
  const close = button("×", "close-settings", closePanel, "icon-button");
  close.setAttribute("aria-label", "关闭");
  header.append(close);
  const body = el("div", "panel-body");
  body.append(
    el("p", "", "进度会自动存在这台电脑上。"),
    button(
      state.preferences.muted ? "打开声音" : "关闭声音",
      "setting-sound",
      () => {
        toggleMute();
        openSettings();
      },
    ),
    button(
      state.preferences.reducedMotion ? "恢复环境动效" : "减少环境动效",
      "setting-motion",
      () => {
        state.preferences.reducedMotion = !state.preferences.reducedMotion;
        changed();
        openSettings();
      },
    ),
    button("导出我的学习档案", "export-records", exportRecords),
  );
  const help = el("details", "tool-help");
  help.append(
    el("summary", "", "怎么玩 · 小助手是怎么工作的"),
    el(
      "p",
      "",
      "A / D 或左右方向键走路，也可以点一下小路。E 打开观察桌，F 和森林伙伴说话、试试身边的小物件。M 地图，J 森林手册，Esc 关闭。树冠开放以后，在升降台、溪谷木坡或图书屋树阶旁按 ↑ 换层。触屏可以用屏幕上的按钮。",
    ),
    el(
      "p",
      "",
      "小助手在本机比较照片、声音和关键词。照片与记录保存在这台浏览器，也可以导出。实际识别仍在本机完成。",
    ),
  );
  const reset = el("details", "tool-help");
  reset.append(el("summary", "", "重新开始这一章"));
  const confirm = el("label", "check-field"),
    box = el("input");
  box.type = "checkbox";
  confirm.append(
    box,
    document.createTextNode("我已经导出要保留的作品，确认清除本章记录"),
  );
  reset.append(
    confirm,
    button("清除本章记录并重新开始", "reset-progress", () => {
      if (!box.checked) {
        shell.toast("先勾选确认，并导出需要保留的作品。");
        return;
      }
      try {
        storage.removeItem(SAVE_KEY);
      } catch {
        shell.toast("浏览器不允许清除记录，原记录仍保留。");
        return;
      }
      stop();
      transit = null;
      state = createState();
      state.models = [fitExamples(createSeedExamples(), 1)];
      writable = true;
      warning = null;
      started = false;
      closePanel();
      changed();
    }),
  );
  if (!writable)
    body.append(button("导出原始未读记录", "export-unread", exportUnreadSave));
  body.append(
    help,
    reset,
    button("继续探索", "resume", closePanel, "button primary"),
  );
  panel.append(header, body);
  shell.panelHost.replaceChildren(panel);
  focusPanel();
}

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  const typing =
    target instanceof HTMLElement &&
    target.matches('input,textarea,select,[contenteditable="true"]');
  if (event.key === "Escape" && shell.panelHost.childElementCount) {
    event.preventDefault();
    closePanel();
    return;
  }
  if (event.key === "Tab" && shell.panelHost.childElementCount) {
    const items = panelControls();
    const first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
    return;
  }
  if (typing || blocked()) return;
  if (event.key.toLowerCase() === "m") {
    event.preventDefault();
    openMap();
  }
  if (event.key.toLowerCase() === "j") {
    event.preventDefault();
    openJournal();
  }
});
window.addEventListener("blur", () => {
  windowFocused = false;
  if (transit) touchDirection = 0;
  else stop();
  audio.stop();
  updateShell();
});
window.addEventListener("focus", () => {
  windowFocused = true;
  lastFrame = performance.now();
  updateShell();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (transit) touchDirection = 0;
    else stop();
    audio.stop();
    persist();
  }
  lastFrame = performance.now();
  updateShell();
});
window.addEventListener("pagehide", persist);
let lastFrame = performance.now(),
  lastUI = 0;
function uiFrame(now: number) {
  const seconds = Math.min(0.1, (now - lastFrame) / 1000);
  if (transit) updateTraversal(seconds);
  else if (touchDirection && !blocked()) move(touchDirection, seconds);
  lastFrame = now;
  if (now - lastUI > 140) {
    updateShell();
    lastUI = now;
  }
  requestAnimationFrame(uiFrame);
}
const game = createForestGame(
  document.querySelector<HTMLElement>("#game")!,
  ACTIVITIES,
  {
    read: readView,
    move,
    walkTo,
    interact: (id) => openActivity(id),
    changeElevation,
    ready: () => {
      sceneReady = true;
      ready = specimensReady;
      updateShell();
    },
    progress: (value) => shell.loadProgress(value),
    hint: (message) => shell.toast(message),
    talk: talkToResident,
    life: activateLife,
  },
);
requestAnimationFrame(uiFrame);
updateShell();
(window as Window & { NovaCourseLinks?: { mountReturn(): void } }).NovaCourseLinks?.mountReturn();

// Read-only diagnostics are useful during classroom device checks. No progress
// mutation or answer-completion hook is exposed to the browser console.
if (new URLSearchParams(location.search).has("inspect"))
  Object.defineProperty(window, "forestInspect", {
    value: () => ({
      player: { ...state.player },
      transit: transit
        ? {
            connectionId: transit.plan.connectionId,
            progress: transit.progress,
            durationSeconds: transit.durationSeconds,
            entry: { ...transit.plan.entry },
            exit: { ...transit.plan.exit },
            destination: transit.destination
              ? { ...transit.destination }
              : null,
            sample: sampleTraversal(transit.plan, transit.progress),
          }
        : null,
      scene: structuredClone(inspectForest(game)),
      phase: phaseFor(state),
      current: currentActivityId(state),
      completed: [...state.completed],
      observations: state.observations.length,
      examples: state.examples.length,
      modelVersion: state.models.at(-1)?.version,
      blocked: blocked(),
      ready,
    }),
  });

}
void startChapter();
