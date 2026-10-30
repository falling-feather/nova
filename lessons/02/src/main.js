import "./ui/tokens.css";
import "./ui/hud.css";
import "./ui/dialogs.css";
import "../../../shared/linkage/course-links.js";
import {
  rooms,
  roomById,
  items,
  itemById,
  itemsInRoom,
  photoById,
  sources,
  AS_OF,
  resolveRoomId,
} from "./content.js";
import {
  createState,
  visitRoom,
  selectItem,
  searchItems,
  completeInvestigation,
  saveResearchCard,
} from "./state.js";
import { elizaReply } from "./activities.js";
import { qualityMode } from "./render/quality.js";
import { learningTasks, researchCard } from "./learning.js";
import { createLearningUI } from "./ui/learning.js";
import { escapeHTML as esc } from "./ui/archive-markup.js";
import {
  catalogueMarkup,
  indexMarkup,
  paintPlates,
  itemDate,
} from "./ui/catalogue.js";
import "./ui/learning.css";
import "./ui/orientation.css";
import "./ui/pages.css";
import { folioPages, readingPages, indexPages } from "./ui/pages.js";
import { floorMapMarkup, minimapMarkup } from "./ui/floor-map.js";
import { createFootsteps } from "./audio.js";
import { loadCanvasFonts } from "./render/fonts.js";
async function startChapter() {
const platform = await window.NovaPlatformReady;
if (platform) await platform.ready;
const key = "nova-thought-court-progress-v1", welcomeKey = "nova-museum-orientation-v1";
const decodeProgress = raw => {
  const value = JSON.parse(raw || 'null');
  if (value !== null && (typeof value !== 'object' || Array.isArray(value))) throw Error('原参观记录无法读取，原文已保留。');
  return value;
};
const chapterStorage = platform
  ? await platform.openChapter({ chapter: 2, keys: [key, welcomeKey], validate: (name, raw) => {
      try { return name === welcomeKey || (decodeProgress(raw), true); } catch { return false; }
    } })
  : { getItem: key => localStorage.getItem(key), setItem: (key, raw) => localStorage.setItem(key, raw) };
const $ = (id) => document.getElementById(id);
let initialProgress,
  storageAvailable = true, readableProgress = true;
try {
  initialProgress = decodeProgress(chapterStorage.getItem(key));
} catch {
  storageAvailable = false;
  readableProgress = false;
}
let state = createState(initialProgress),
  world,
  filter = "all",
  returnFocus,
  toastTimer,
  navigating = false,
  initializing = true;
let studyRequest = 0,
  navigationRequest = 0;
let guidePhase = null,
  pendingWelcome = true,
  guideFocus = null;
try {
  pendingWelcome = chapterStorage.getItem(welcomeKey) !== "seen";
} catch {
  /* Optional preference; the visit still works without storage. */
}
let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const dialogs = [...document.querySelectorAll("dialog")];
const qualityKey = "nova-museum-quality";
let savedQuality;
try {
  savedQuality = localStorage.getItem(qualityKey);
} catch {
  /* URL choice still works without storage. */
}
const selectedQuality = qualityMode(
  new URL(location.href).searchParams.get("quality") || savedQuality,
);
const soundKey = "nova-museum-footsteps";
let soundSetting = null;
try {
  soundSetting = localStorage.getItem(soundKey);
} catch {
  /* Footsteps default to on for this visit. */
}
const footsteps = createFootsteps({ enabled: soundSetting !== "off" });
function syncSound() {
  const on = footsteps.enabled;
  $("toggle-sound").setAttribute("aria-pressed", String(on));
  $("toggle-sound").setAttribute("aria-label", "脚步声：" + (on ? "开" : "关"));
  $("footstep-sound").checked = on;
}
function setSound(on) {
  footsteps.setEnabled(on);
  try {
    localStorage.setItem(soundKey, on ? "on" : "off");
  } catch {
    /* The choice still applies to this visit. */
  }
  syncSound();
}
syncSound();
$("toggle-sound").addEventListener("click", () => setSound(!footsteps.enabled));
$("footstep-sound").addEventListener("change", (e) =>
  setSound(e.target.checked),
);
for (const type of ["pointerdown", "keydown"])
  window.addEventListener(type, () => footsteps.enabled && footsteps.unlock(), {
    once: true,
  });
// Both choice rows (opening page and visitor notes) share one pending choice;
// applying it reloads the space, so the button appears only after a change.
let pendingQuality = selectedQuality;
function syncQuality() {
  document
    .querySelectorAll("[data-quality]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.quality === pendingQuality),
      ),
    );
  document
    .querySelectorAll("[data-apply-quality]")
    .forEach((b) => (b.hidden = pendingQuality === selectedQuality));
}
document.querySelectorAll("[data-quality]").forEach((b) =>
  b.addEventListener("click", () => {
    pendingQuality = qualityMode(b.dataset.quality);
    syncQuality();
  }),
);
syncQuality();
document.querySelectorAll("[data-apply-quality]").forEach((button) =>
  button.addEventListener("click", () => {
    const value = pendingQuality;
    try {
      localStorage.setItem(qualityKey, value);
    } catch {
      /* The URL is authoritative for this visit. */
    }
    const url = new URL(location.href);
    url.searchParams.set("quality", value);
    location.replace(url.href);
  }),
);
const roomLabel = (id) => roomById[id]?.name || "思想之庭";
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 3800);
}
function save() {
  if (!readableProgress) { toast('原参观记录无法读取，原文已保留；请先从个人页导出后恢复。'); return false; }
  try {
    chapterStorage.setItem(
      key,
      JSON.stringify({
        visited: state.visited,
        note: state.note,
        investigations: state.investigations,
        research: state.research,
      }),
    );
    storageAvailable = true;
    return true;
  } catch {
    storageAvailable = false;
    toast("浏览器未允许保存；本次参观仍可继续。");
    return false;
  }
}
function count() {
  $("read-count").textContent = state.visited.length + " / " + items.length;
  $("study-count").textContent =
    state.investigations.length + " / " + Object.keys(learningTasks).length;
  if (readableProgress) window.dispatchEvent(new CustomEvent('nova:progress', { detail: {
    chapter: 2, completed: state.investigations.length, total: Object.keys(learningTasks).length,
    pathLabel: '展厅探究与研究卡', artifactCount: Number(Boolean(state.research)) + Number(Boolean(state.note)),
  }}));
}
const learningUI = createLearningUI({
  root: $("study-body"),
  getProgress: () => state,
  onComplete: (id) => {
    finishOrientation();
    state = completeInvestigation(state, id);
    save();
    count();
  },
  onResearch: (fields) => {
    state = saveResearchCard(state, fields);
    return save();
  },
  onRead: (id) => read(id),
  onRoom: (id) => openStudy(id),
  onVisit: (id) => travel(resolveRoomId(id)),
  onEffect: (id, effect) => {
    const display = world?.museum?.studyDisplays?.get(id);
    if (display && world.ready && !world.failed) {
      display.update(effect);
      world.refreshReflections = true;
      world.renderPreparedFrame();
    }
  },
});
function openStudy(id, mode = "experiment") {
  if (!Object.hasOwn(learningTasks, id)) return;
  ++studyRequest;
  learningUI.open(id, mode);
  openDialog("study-dialog");
  if (guidePhase === "experiment" && mode === "experiment") finishOrientation();
}
$("study-dialog").addEventListener("close", () => {
  if (!navigating) studyRequest++;
});
function rememberWelcome() {
  try {
    chapterStorage.setItem(welcomeKey, "seen");
  } catch {
    /* A shared/private browser can show the guide again next visit. */
  }
}
function maybeWelcome() {
  if (
    !pendingWelcome ||
    initializing ||
    navigating ||
    !world?.ready ||
    world.failed ||
    dialogs.some((d) => d.open)
  )
    return;
  pendingWelcome = false;
  if (!location.hash.startsWith("#item/")) openDialog("welcome-dialog");
}
function finishOrientation() {
  guidePhase = null;
  $("orientation-hint").hidden = true;
}
function updateOrientation(item = null) {
  guideFocus = item;
  if (!guidePhase) return;
  const experiment = guidePhase === "experiment";
  $("orientation-hint").hidden = false;
  $("orientation-step").textContent = experiment ? "03" : item ? "02" : "01";
  $("orientation-title").textContent = experiment
    ? "把刚刚看到的，动手试一试。"
    : item
      ? `你找到了：${item.title}`
      : "沿着蓝色地毯，找到第一件展品。";
  $("orientation-description").textContent = experiment
    ? "打开本厅实验，跟随蓝色操作提示完成一次探索。"
    : item
      ? "按 E 或点击下面的按钮阅读。按 Esc 即可回到这里。"
      : "用 WASD 行走，按住鼠标拖动环顾。靠近展品时会出现它的名称。";
  $("orientation-action").textContent = experiment
    ? "试一试本厅实验 →"
    : item
      ? "阅读这件展品 →"
      : "查看参观路线 →";
}
$("welcome-dialog").addEventListener("close", rememberWelcome);
$("skip-welcome").addEventListener("click", () => {
  finishOrientation();
  $("welcome-dialog").close();
});
$("start-welcome").addEventListener("click", () => {
  guidePhase = "walk";
  $("welcome-dialog").close();
  updateOrientation(world?.focus && itemById[world.focus]);
  $("world").focus({ preventScroll: true });
});
$("replay-welcome").addEventListener("click", () => {
  pendingWelcome = false;
  finishOrientation();
  openDialog("welcome-dialog");
});
$("dismiss-orientation").addEventListener("click", finishOrientation);
$("orientation-action").addEventListener("click", () => {
  if (guidePhase === "experiment")
    openStudy(roomById[state.roomId] ? state.roomId : "origins");
  else if (guideFocus) read(guideFocus.id);
  else openDialog("map-dialog");
});
$("reading-dialog").addEventListener("close", () =>
  updateOrientation(world?.focus && itemById[world.focus]),
);
$("open-study").addEventListener("click", () =>
  openStudy(roomById[state.roomId] ? state.roomId : "origins"),
);
$("room-study").addEventListener("click", () =>
  openStudy(roomById[state.roomId] ? state.roomId : "origins"),
);
$("room-guide").addEventListener("click", () =>
  openStudy(roomById[state.roomId] ? state.roomId : "origins", "guide"),
);
$("loading-study").addEventListener("click", () =>
  openStudy("origins", "guide"),
);
function block() {
  world?.setBlocked(initializing || dialogs.some((d) => d.open) || navigating);
}
function restoreReturnHost() {
  const host = $("novaReturnHost");
  if ($("loading").classList.contains("hidden")) {
    document.querySelector('.topbar nav[aria-label="参观"]').prepend(host);
  } else {
    document.querySelector('.loading-head .quality-choice').before(host);
  }
}
function openDialog(id) {
  const target = $(id);
  returnFocus = document.activeElement;
  dialogs.forEach((d) => {
    if (d !== target && d.open) d.close();
  });
  if (!target.open) target.showModal();
  if (id === 'map-dialog' && !target.dataset.paged) {
    const area = target.querySelector('.map-layout');
    folioPages(area, [
      { label: '平面导览图', className: 'map-page', nodes: [$("floor-map")] },
      { label: '七厅与入口', className: 'map-page', nodes: [$("map-list")] },
    ]);
    target.dataset.paged = 'true';
  }
  if (id === 'help-dialog' && !target.dataset.paged) {
    const content = document.createElement('div');
    content.className = 'help-pages';
    target.querySelector('.sheet-head').after(content);
    folioPages(content, [
      ...[...target.querySelectorAll('.help-section')].map(section => ({ label: section.querySelector('h3').textContent, nodes: [section] })),
      { label: '记录与资料日期', nodes: [target.querySelector('.sheet-note')] },
    ]);
    target.dataset.paged = 'true';
  }
  block();
}
function closeDialogs() {
  dialogs.forEach((d) => {
    if (d.open) d.close();
  });
  block();
}
dialogs.forEach((d) => {
  d.querySelector("[data-close]")?.addEventListener("click", () => d.close());
  d.addEventListener("close", () => {
    queueMicrotask(() => {
      restoreReturnHost();
      block();
      if (!dialogs.some((x) => x.open)) {
        returnFocus?.focus?.({ preventScroll: true });
        if (location.hash.startsWith("#item/"))
          history.replaceState(null, "", "#room/" + state.roomId);
        maybeWelcome();
      }
    });
  });
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  });
});
let lastPose = { x: -5.6, z: 6.9, yaw: 0 },
  hallCardTimer,
  hallCardRoom = null,
  walkedMs = 0,
  lastPoseAt = 0;
/** Place an arrow on an SVG plan; plan units are metres, yaw 0 faces -z (up). */
function placeArrow(node, x, z, yaw, rotateChild = null) {
  if (!node) return;
  const turn = (-yaw * 180) / Math.PI;
  if (rotateChild) {
    node.setAttribute(
      "transform",
      `translate(${x.toFixed(2)} ${z.toFixed(2)})`,
    );
    rotateChild.setAttribute("transform", `rotate(${turn.toFixed(1)})`);
  } else
    node.setAttribute(
      "transform",
      `translate(${x.toFixed(2)} ${z.toFixed(2)}) rotate(${turn.toFixed(1)})`,
    );
}
function updatePose(x, z, yaw) {
  // The walking keys stay on screen until the visitor has walked a little.
  const now = performance.now();
  if (
    Math.hypot(x - lastPose.x, z - lastPose.z) > 0.01 &&
    now - lastPoseAt < 200
  )
    walkedMs += now - lastPoseAt;
  lastPoseAt = now;
  if (walkedMs > 6000 && state.visited.length && !guidePhase)
    $("controls-hint").classList.add("learned");
  lastPose = { x, z, yaw };
  placeArrow($("minimap-player"), x, z, yaw);
  if ($("map-dialog").open) {
    const you = $("map-you");
    placeArrow(you, x, z, yaw, you?.querySelector(".map-you-arrow"));
  }
}
/** Entering a hall enlarges its wall label with one line of introduction. */
function showHallCard(room) {
  if (initializing || hallCardRoom === room.id) return;
  hallCardRoom = room.id;
  const label = $("room-label");
  label.classList.add("introducing");
  clearTimeout(hallCardTimer);
  hallCardTimer = setTimeout(() => label.classList.remove("introducing"), 4200);
}
function updateRoom(room, options) {
  state = visitRoom(state, room.id, options);
  document.documentElement.style.setProperty("--hall", room.color || "#a8865a");
  $("room-num").textContent = room.n || "序";
  $("room-num").classList.toggle("cjk", !room.n);
  $("room-title").textContent = room.id === "atrium" ? "思想之庭" : room.name;
  $("room-line").textContent =
    room.id === "atrium" ? "入口 · 七座展厅由此开始" : room.year;
  $("room-intro").firstElementChild.textContent =
    room.id === "atrium" ? "沿着七座展厅，从一个问题走到今天。" : room.intro;
  document
    .querySelectorAll("[data-room]")
    .forEach((b) => b.classList.toggle("current", b.dataset.room === room.id));
  document
    .querySelectorAll("[data-mm-room]")
    .forEach((g) => g.classList.toggle("here", g.dataset.mmRoom === room.id));
  $("minimap-room").textContent = room.n || "序";
  $("minimap-name").textContent = room.id === "atrium" ? "入口" : room.name;
  showHallCard(room);
  const studyId = roomById[room.id] ? room.id : "origins";
  $("room-invitation-label").textContent =
    room.id === "atrium"
      ? "从这里开始"
      : "本厅实验 · " + learningTasks[studyId].label;
  $("room-invitation-title").textContent = learningTasks[studyId].title;
}
function focusItem(id) {
  const hint = $("focus-hint");
  const item = id && itemById[id];
  updateOrientation(item);
  document.body.classList.toggle("focusing", !!item);
  // The old label stays in place while it fades, rather than blinking empty.
  if (!item) return hint.classList.remove("active");
  hint.innerHTML = `<span class="focus-meta">${esc(item.kind === "company" ? "机构档案" : item.date)}</span><strong class="focus-title">${esc(item.title)}</strong><span class="focus-keys"><span><kbd>E</kbd>阅读</span><span><kbd>F</kbd>实验</span></span>`;
  hint.classList.add("active");
}
window.addEventListener("keydown", (e) => {
  if (
    e.code === "KeyF" &&
    !e.repeat &&
    world?.ready &&
    !world.blocked &&
    world.focus &&
    !e.target.closest("input,textarea,button,select,dialog")
  ) {
    e.preventDefault();
    openStudy(itemById[world.focus].studyId || itemById[world.focus].roomId);
  }
});
function updateHash(value) {
  history.pushState(null, "", "#" + value);
}
function cancelNavigation() {
  navigationRequest++;
  studyRequest++;
  navigating = false;
  $("transition").classList.remove("active");
  block();
}
async function travel(id, { hash = true } = {}) {
  id = resolveRoomId(id);
  const request = ++navigationRequest;
  studyRequest++;
  navigating = true;
  if (hash) updateHash("room/" + id);
  closeDialogs();
  block();
  if (initializing) {
    updateRoom(roomById[id] || { id: "atrium", name: "思想之庭" });
    navigating = false;
    block();
    return true;
  }
  $("transition").classList.add("active");
  if (!reduced) await new Promise((r) => setTimeout(r, 370));
  if (request !== navigationRequest) return false;
  world?.goRoom(id);
  updateRoom(roomById[id] || { id: "atrium", name: "思想之庭" });
  try {
    await world?.present();
  } catch (error) {
    if (request !== navigationRequest) return false;
    console.error("Museum entry frame failed", error);
    world.failed = true;
    world.syncLoop();
    failure("空间画面暂时无法继续，馆藏档案仍可阅读。刷新可重新进入。");
  }
  if (request !== navigationRequest) return false;
  if (!reduced) await new Promise((r) => setTimeout(r, 120));
  if (request !== navigationRequest) return false;
  $("transition").classList.remove("active");
  navigating = false;
  block();
  $("world").focus();
  if (!world?.ready) toast("空间尚未就绪，馆藏仍可直接阅读。");
  return true;
}
function renderMap() {
  $("map-list").innerHTML =
    '<button data-room="atrium" style="--hall:#9c7b4c"><span>序</span><div><strong>思想之庭</strong><small>入口</small></div><i><span class="go">前往</span><span class="here">你在这里</span></i></button>' +
    rooms
      .map(
        (r) =>
          `<button data-room="${r.id}" style="--hall:${r.color}"><span>${r.n}</span><div><strong>${esc(r.name)}</strong><small>${esc(r.year)}</small></div><i><span class="go">前往</span><span class="here">你在这里</span></i></button>`,
      )
      .join("");
  $("floor-map").innerHTML = floorMapMarkup();
  $("map-dialog")
    .querySelectorAll("[data-room]")
    .forEach((b) => {
      b.addEventListener("click", () => travel(b.dataset.room));
      if (b.tagName.toLowerCase() === "g")
        b.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            travel(b.dataset.room);
          }
        });
    });
}
const itemNumber = Object.fromEntries(items.map((item, i) => [item.id, i + 1]));
function renderResults() {
  const query = $("search").value.trim();
  $("results").innerHTML = indexMarkup(searchItems(query, filter), {
    rooms,
    query,
    visited: state.visited,
    numberOf: (id) => itemNumber[id],
  });
  $("results")
    .querySelectorAll("[data-item]")
    .forEach((b) => b.addEventListener("click", () => read(b.dataset.item)));
  indexPages($("results"));
}
function archive() {
  renderResults();
  openDialog("archive-dialog");
  $("search").focus();
}
function activity(item) {
  if (item.id === "eliza")
    return '<section class="activity"><h3>和规则机器说一句话</h3><p>这个小程序和当年的ELIZA一样，只会抓关键词、套句式。说一句话，看它怎样回应，又是哪条规则在起作用。</p><form id="eliza-form"><input id="eliza-input" aria-label="输入一句日常想法" maxlength="160" placeholder="例如：我喜欢画画"/><button>看它怎么回</button></form><output id="eliza-output" aria-live="polite"></output></section>';
  if (item.kind === "future")
    return (
      '<section class="activity"><h3>写下你的问题</h3><textarea id="future-note" maxlength="280" aria-label="写给未来的问题" placeholder="我希望人工智能能够帮助……">' +
      esc(state.note) +
      '</textarea><p>最多 280 字。记录保存在这台浏览器。</p><button id="save-note">保存我的问题</button><output id="note-status" aria-live="polite"></output></section>'
    );
  if (item.activity === "matches")
    return '<section class="activity"><h3>核对一下</h3><p>2016年在韩国首尔，和AlphaGo下了五局棋的是谁？</p><div class="choice-row"><button data-answer="yes">李世石</button><button data-answer="no">柯洁</button></div><output id="choice-output" aria-live="polite"></output></section>';
  if (item.activity === "evidence")
    return '<section class="activity"><h3>判断一句说法</h3><p>有人说：“一家公司有一次新产品比别人晚，就说明它永远落后了。”这个说法有道理吗？</p><div class="choice-row"><button data-evidence="no">证据还不够</button><button data-evidence="yes">说得对</button></div><output id="choice-output" aria-live="polite"></output></section>';
  return "";
}
function read(id, { hash = true } = {}) {
  if (itemById[id] && guidePhase === "walk") guidePhase = "experiment";
  const item = itemById[id];
  if (!item) return;
  state = selectItem(state, id);
  save();
  count();
  if (hash) updateHash("item/" + id);
  const room = roomById[item.roomId];
  const studyId = item.studyId || item.roomId;
  $("reading-room").textContent = room
    ? `第${room.n}展厅　${room.name}`
    : "思想之庭";
  $("reading-dialog").style.setProperty("--hall", room?.color || "#9c7b4c");
  $("reading-body").innerHTML = catalogueMarkup(item, {
    room,
    photo: photoById[item.asset],
    base: import.meta.env.BASE_URL,
    sources,
    itemById,
    activity: activity(item),
    study: learningTasks[studyId] && {
      id: studyId,
      title: learningTasks[studyId].title,
    },
    number: itemNumber[id],
    total: items.length,
  });
  paintPlates($("reading-body"), room?.color || "#9c7b4c", item);
  let pageReader;
  $("reading-body")
    .querySelectorAll("[data-article-section]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const heading = $("article-section-" + button.dataset.articleSection);
        pageReader?.showContaining(heading);
        heading.focus({ preventScroll: true });
      }),
    );
  const index = items.findIndex((i) => i.id === id);
  $("reading-body")
    .querySelector("[data-open-study]")
    ?.addEventListener("click", () => openStudy(studyId));
  $("reading-body")
    .querySelectorAll("[data-related]")
    .forEach((b) => b.addEventListener("click", () => read(b.dataset.related)));
  $("prev-item").disabled = index === 0;
  $("next-item").disabled = index === items.length - 1;
  $("prev-title").textContent = items[index - 1]?.title || "";
  $("next-title").textContent = items[index + 1]?.title || "";
  $("eliza-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const reply = elizaReply($("eliza-input").value);
    $("eliza-output").textContent =
      "用到的规则：「" + reply.rule + "」 → " + reply.text;
  });
  $("save-note")?.addEventListener("click", () => {
    state = { ...state, note: $("future-note").value.slice(0, 280) };
    const ok = save();
    $("note-status").textContent = ok
      ? "已保存，下次打开仍在。"
      : "本次参观期间会暂时保留；这个浏览器不允许长期保存。";
  });
  document.querySelectorAll("[data-answer]").forEach((b) =>
    b.addEventListener("click", () => {
      $("choice-output").textContent =
        (b.dataset.answer === "yes" ? "正确。" : "再核对一下。") +
        "2016年在首尔对李世石，4比1；2017年在乌镇对柯洁，3比0。";
    }),
  );
  document.querySelectorAll("[data-evidence]").forEach((b) =>
    b.addEventListener("click", () => {
      $("choice-output").textContent =
        (b.dataset.evidence === "no"
          ? "是的，证据不够。"
          : "这一步跳得太远了。") +
        "一次产品发布只是一件事；研究、产品和市场要分开看，也要看不同的时间。";
    }),
  );
  openDialog("reading-dialog");
  pageReader = readingPages($("reading-body"));
  $("reading-dialog").scrollTo({ top: 0, behavior: "instant" });
}
function openMap() {
  openDialog("map-dialog");
  const you = $("map-you");
  placeArrow(
    you,
    lastPose.x,
    lastPose.z,
    lastPose.yaw,
    you?.querySelector(".map-you-arrow"),
  );
}
$("open-map").addEventListener("click", openMap);
$("minimap").addEventListener("click", openMap);
$("open-archive").addEventListener("click", archive);
$("loading-archive").addEventListener("click", archive);
$("back-archive").addEventListener("click", archive);
$("home").addEventListener("click", () => travel("atrium"));
$("search").addEventListener("input", renderResults);
document.querySelectorAll("[data-filter]").forEach((b) =>
  b.addEventListener("click", () => {
    filter = b.dataset.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((f) => f.classList.toggle("selected", f === b));
    renderResults();
  }),
);
$("prev-item").addEventListener("click", () =>
  read(items[items.findIndex((i) => i.id === state.itemId) - 1]?.id),
);
$("next-item").addEventListener("click", () =>
  read(items[items.findIndex((i) => i.id === state.itemId) + 1]?.id),
);
$("visit-exhibit").addEventListener("click", () =>
  travel(itemById[state.itemId].roomId),
);
$("open-help").addEventListener("click", () => openDialog("help-dialog"));
$("as-of").textContent = AS_OF;
$("reduce-motion").checked = reduced;
function reducedChanged() {
  reduced = $("reduce-motion").checked;
  document.documentElement.classList.toggle("reduced", reduced);
  world?.setReducedMotion?.(reduced);
}
reducedChanged();
$("reduce-motion").addEventListener("change", reducedChanged);
$("fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    toast("当前浏览器未允许进入全屏。");
  }
});
function hashDestination() {
  try {
    const [type, id] = decodeURIComponent(location.hash.slice(1)).split("/");
    return { type, id };
  } catch {
    return {};
  }
}
function applyHash() {
  cancelNavigation();
  const { type, id } = hashDestination();
  if (type === "item" && itemById[id]) read(id, { hash: false });
  else if (
    type === "room" &&
    (roomById[id] || id === "atrium" || id === "future")
  )
    travel(id, { hash: false });
  else travel("atrium", { hash: false });
}
function desiredEntry() {
  const dest = hashDestination();
  if (dest.type === "item" && itemById[dest.id])
    return { roomId: itemById[dest.id].roomId, study: false };
  return {
    roomId: dest.type === "room" ? resolveRoomId(dest.id) : "atrium",
    study: false,
  };
}
window.addEventListener("hashchange", applyHash);
renderMap();
$("minimap-plan").innerHTML = minimapMarkup();
updatePose(lastPose.x, lastPose.z, lastPose.yaw);
count();
// The opening page lists the halls; each lights up as preparation advances.
$("loading-halls").innerHTML = rooms
  .map(
    (r) =>
      `<li style="--hall:${r.color}"><span>${r.n}</span><b>${esc(r.name)}</b><time>${esc(r.year)}</time></li>`,
  )
  .join("");
const hallRows = [...$("loading-halls").children];
function showProgress(n, message) {
  $("loading-bar").style.width = n + "%";
  $("loading-percent").textContent = n + "%";
  $("loading-message").textContent = message;
  $("loading").style.setProperty("--lit", String(n / 100));
  hallRows.forEach((row, i) => row.classList.toggle("lit", n >= 14 + i * 12));
}
// While the halls prepare, show one true story at a time from the collection.
const loadingFacts = items
  .filter((i) => i.fact && i.kind !== "future")
  .sort(() => Math.random() - 0.5);
let factIndex = 0,
  factTimer = null;
function nextLoadingFact() {
  if ($("loading").classList.contains("hidden") || !loadingFacts.length) {
    clearInterval(factTimer);
    return;
  }
  const item = loadingFacts[factIndex++ % loadingFacts.length];
  const box = $("loading-fact").parentElement;
  box.classList.remove("in");
  void box.offsetWidth;
  $("loading-fact-meta").textContent =
    "馆藏一则 · " +
    (item.kind === "company" ? item.title : item.date + " · " + item.title);
  $("loading-fact").textContent = item.fact;
  box.classList.add("in");
}
nextLoadingFact();
factTimer = setInterval(nextLoadingFact, 6500);
const initialRoute = hashDestination();
if (initialRoute.type === "item" && itemById[initialRoute.id])
  read(initialRoute.id, { hash: false });
function failure(message) {
  $("loading-message").textContent = message;
  $("loading-percent").textContent = "馆藏阅读仍可使用";
  $("loading-bar").style.width = "100%";
  $("loading").classList.remove("hidden");
  toast(message);
}
try {
  const fontsReady = loadCanvasFonts();
  const { MuseumWorld } = await import("./render/world.js");
  world = new MuseumWorld($("world"), {
    quality: selectedQuality,
    onPick: (id, action) =>
      action?.kind === "guide"
        ? openStudy(action.roomId, "guide")
        : action?.kind === "study"
          ? openStudy(action.roomId)
          : read(id),
    onRoom: updateRoom,
    onFocus: focusItem,
    onFailure: failure,
    onFootstep: (running, foot, strength) =>
      footsteps.step(running, foot, strength),
    onPose: updatePose,
    onRunChange: (running) =>
      $("controls-hint").classList.toggle("running", running),
    onProgress: showProgress,
  });
  world.setReducedMotion(reduced);
  block();
  await fontsReady;
  await world.init(() => desiredEntry().roomId);
  for (const id of state.investigations)
    world.museum.studyDisplays.get(id)?.update({ complete: true });
  if (state.research)
    world.museum.studyDisplays
      .get("future")
      ?.update({ complete: true, text: researchCard(state.research).note });
  world.refreshReflections = true;
  // Inputs remain available while GPU work finishes. Reconcile the latest view
  // after each fence; an earlier warm-up destination must not win a later click.
  while (true) {
    const target = desiredEntry();
    const intent = [location.hash, studyRequest, navigationRequest].join("|");
    world.goRoom(target.roomId);
    await world.present();
    if (intent !== [location.hash, studyRequest, navigationRequest].join("|"))
      continue;
    updateRoom(roomById[target.roomId] || { id: "atrium", name: "思想之庭" }, {
      preserveItem: $("reading-dialog").open,
    });
    break;
  }
  initializing = false;
  $("loading").classList.add("hidden");
  restoreReturnHost();
  block();
  maybeWelcome();
  showHallCard(
    roomById[world.roomId] || { id: "atrium", n: "序", name: "思想之庭" },
  );
} catch (error) {
  initializing = false;
  console.error("Museum initialization failed", error);
  failure("空间暂时未能加载。可先打开馆藏档案，或刷新重试。");
}
if (!storageAvailable) toast("本次参观记录暂时不能保存在浏览器中。");
window.museum = {
  get state() {
    return state;
  },
  get world() {
    return world;
  },
  read,
  travel,
  rooms,
  items,
};

}
void startChapter();
