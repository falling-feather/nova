import { Course, SENTENCES, type Action } from "../course/course.ts";
import {
  ROOMS,
  STATIONS,
  ANNIVERSARY_FACTS,
  isCoreStation,
  stationsForRoute,
  roomOf,
  stationsOf,
  type RoomId,
} from "../content/lessons.ts";
import { HINTS, CONCEPTS, conceptForStation } from "../content/learning.ts";
import { roomDone, encode } from "../core/state.ts";
import { sceneData } from "../scene/data.ts";
import { Workshop, type Hotspot } from "../scene/workshop.ts";
import {
  dock,
  surface,
  inspector,
  experimentMarkup,
  TITLES,
  BRIEFS,
} from "./room-view.ts";
import { button as b, escape as e, icon } from "./dom.ts";
import { TileControls } from "./tile-controls.ts";
import { atelier, type AtelierPage } from "./atelier.ts";
import { taskStatus } from "./task-status.ts";
import { contextComparison } from "./context-exhibit.ts";
import { compareCouncil } from "../course/experiments.ts";
import { PagePanels } from "./page-panels.ts";
import { EditorSheets } from "./editor-sheets.ts";
import { WorkshopSound } from "./sound.ts";
import {
  readDeviceSettings,
  writeDeviceSettings,
  type DeviceSettings,
} from "../core/device-settings.ts";
import "./desktop.css";

const ROOM_SUBTITLES: Record<RoomId, string> = {
  foundry: "拆字 · 铸字 · 词元",
  gallery: "名牌 · 相似度 · 表示",
  council: "上下文 · 多头注意力",
  counting: "打分 · 分配 · 混合",
  press: "预测 · 生成 · 人机合写",
};
type Modal =
  | "notebook"
  | "settings"
  | "review"
  | "edition"
  | "route"
  | "reset"
  | "room"
  | "guide"
  | "comparison"
  | null;

export class App {
  readonly root: HTMLElement;
  readonly course: Course;
  readonly workshop: Workshop;
  private inspectState: { kind: string; arg: string } | null = null;
  private modal: Modal = null;
  private modalFeedback = "";
  private roomPreview: RoomId = "foundry";
  private reviewChoice = -1;
  private reviewObservation = "";
  private reviewFeedback = "";
  private quality = "auto";
  private toastTimer = 0;
  private hotspots = new Map<string, HTMLElement>();
  private previousFocus: HTMLElement | null = null;
  private panelInvoker: HTMLElement | null = null;
  private rendering = false;
  private renderedHTML = new WeakMap<HTMLElement, string>();
  private renderedViews = new WeakMap<HTMLElement, string>();
  private tileControls: TileControls;
  private pages: PagePanels;
  private editors: EditorSheets;
  private atelierPage: AtelierPage = "edit";
  private contextOpen = false;
  private openNameplates = new Set<string>();
  private sound = new WorkshopSound();
  private devices: DeviceSettings;
  constructor(root: HTMLElement, course: Course, workshop: Workshop) {
    this.root = root;
    this.course = course;
    this.workshop = workshop;
    this.devices = readDeviceSettings(course.progress.settings.reducedMotion);
    this.quality = this.devices.quality;
    workshop.setQuality(this.devices.quality);
    root.innerHTML = `<div class="scene-shade" aria-hidden="true"></div><header id="topbar" class="topbar"></header><main><section id="heading" class="lesson-heading"></section><div id="surface" class="surface"></div><div id="hotspots" class="hotspots"></div><footer id="workbench-footer" class="workbench-footer"><aside id="task-status" class="task-status" aria-label="当前任务与完成条件"></aside><div class="workbench-tools"><div id="manipulation-help" class="manipulation-help"></div><div id="dock" class="dock"></div></div><div id="corner" class="corner"></div></footer></main><aside id="inspector" class="inspector" aria-label="教具检视" hidden></aside><dialog id="modal"><div id="modal-content"></div></dialog><div id="notice" class="notice" role="status" aria-live="polite"></div><div id="busy" class="busy" role="status" hidden></div>`;
    root.insertAdjacentHTML(
      "beforeend",
      '<div id="manipulation-status" class="manipulation-status" role="status" aria-live="polite" hidden></div>',
    );
    root.insertAdjacentHTML(
      "beforeend",
      '<aside id="atelier" class="atelier" aria-label="上下文编辑台" hidden></aside><div id="word-caption" class="word-caption" hidden></div><div id="context-drop" class="context-drop" aria-label="把线索卡放到句子里" hidden>放到桌上 · 重算这一句</div>',
    );
    this.pages = new PagePanels(root);
    this.editors = new EditorSheets(
      root,
      (field) => this.editorText(field),
      () => this.render(),
    );
    let dragged: { text: string; sentence: boolean } | null = null;
    root.addEventListener("dragstart", (event) => {
      const chip = (event.target as Element).closest<HTMLElement>(
        "[data-context-token],[data-context-sentence]",
      );
      if (!chip || course.busy) return;
      dragged = {
        text: chip.dataset.contextToken ?? chip.dataset.contextSentence!,
        sentence: !!chip.dataset.contextSentence,
      };
      event.dataTransfer?.setData("text/plain", dragged.text);
      this.element("context-drop").hidden = false;
    });
    root.addEventListener("dragover", (event) => {
      if (dragged) {
        event.preventDefault();
        event.dataTransfer!.dropEffect = "copy";
      }
    });
    root.addEventListener("drop", (event) => {
      event.preventDefault();
      if (
        dragged &&
        (event.target as Element).closest(
          "#context-drop,#hotspots,.sentence-ribbon",
        )
      ) {
        if (dragged.sentence) course.setCouncilText(dragged.text);
        else course.editCouncilToken("insert", dragged.text);
        this.sound.play(this.devices.muted);
      }
      dragged = null;
      this.element("context-drop").hidden = true;
    });
    root.addEventListener("dragend", () => {
      dragged = null;
      this.element("context-drop").hidden = true;
    });
    this.tileControls = new TileControls(
      root,
      workshop,
      course,
      () => !!this.modal || !!this.inspectState || !!course.busy,
      (message) => this.notice(message),
      (error) => this.fail(error),
    );
    course.onChange = () => this.render();
    course.onNotice = (message) => this.notice(message);
    workshop.onProject = (items) => this.project(items);
    workshop.onPapers = (papers) => {
      const selectors = {
        heading: "#heading",
        sentence: ".sentence-ribbon",
        document: ".proof-paper",
        context: ".context-invitation",
      };
      for (const [id, selector] of Object.entries(selectors)) {
        const element = this.root.querySelector<HTMLElement>(selector);
        if (!element) continue;
        if (id === "heading" || id === "document") {
          delete element.dataset.paper;
          continue;
        }
        const paper = papers.find((p) => p.id === id);
        if (!paper) {
          delete element.dataset.paper;
          continue;
        }
        element.dataset.paper = id;
        element.style.setProperty("--paper-transform", paper.matrix);
        element.style.setProperty("--paper-width", `${paper.pixels[0]}px`);
        element.style.setProperty("--paper-height", `${paper.pixels[1]}px`);
      }
      const ribbon = this.root.querySelector<HTMLElement>(".sentence-ribbon");
      if (ribbon) {
        if (window.innerWidth <= 760 && !this.course.hub)
          ribbon.style.top = `${this.element("heading").getBoundingClientRect().bottom + 12}px`;
        else ribbon.style.removeProperty("top");
      }
    };
    workshop.onFloor = (x, y) => {
      if (course.id === "08" && course.holding && !this.modal)
        void course.perform("place", [x, y]);
    };
    workshop.onFailure = (reason) => {
      this.notice(reason, 20000);
      this.openModal("settings");
    };
    workshop.setReduced(
      this.devices.reducedMotion ||
        matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    root.addEventListener("click", (event) => {
      const target = (event.target as Element).closest<HTMLElement>(
        "[data-cmd]",
      );
      if (target && !target.hasAttribute("disabled"))
        void this.command(
          target.dataset.cmd!,
          target.dataset.value ?? "",
        ).catch((error) => this.fail(error));
    });
    root.addEventListener("input", (event) => {
      const el = event.target as HTMLInputElement;
      if (["TEXTAREA", "INPUT"].includes(el.tagName) && el.type !== "range")
        void this.field(el, false);
      if (el.type === "range") {
        const out = el.parentElement?.querySelector("output");
        if (out && el.dataset.field === "temperature")
          out.value = Number(el.value).toFixed(1);
      }
    });
    root.addEventListener("change", (event) => {
      const el = event.target as HTMLInputElement;
      if (
        el.tagName === "SELECT" ||
        el.type === "range" ||
        el.type === "checkbox"
      )
        void this.field(el, true);
    });
    root.addEventListener("focusout", () =>
      window.setTimeout(() => this.render(), 0),
    );
    root.addEventListener("keydown", (event) => this.keydown(event));
    window.addEventListener("resize", () => this.render());
    const dialog = this.element<HTMLDialogElement>("modal");
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.closeModal();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          this.closeModal();
      }
    });
    if (course.hub) this.render();
    else course.enter(course.id);
    if (course.store.loaded.warning)
      this.notice(course.store.loaded.warning, 15000);
  }
  private element<T extends HTMLElement = HTMLElement>(id: string) {
    return this.root.querySelector<T>(`#${id}`)!;
  }
  private patch(id: string, html: string) {
    const host = this.element(id),
      active = document.activeElement as HTMLInputElement | null;
    // Text drafts stay local until applied. A live slider stays mounted, while its
    // model-derived readout and neighbouring actions must still be refreshed.
    if (
      active &&
      host.contains(active) &&
      active.matches("input[data-field],textarea[data-field]")
    ) {
      if (id === "dock" && active.type === "range") {
        const template = document.createElement("template");
        template.innerHTML = html;
        const nextInput = [
          ...template.content.querySelectorAll<HTMLInputElement>(
            "input[data-field]",
          ),
        ].find((input) => input.dataset.field === active.dataset.field);
        const currentGroup = [...host.children].find((node) =>
          node.contains(active),
        );
        const nextGroup =
          nextInput &&
          [...template.content.children].find((node) =>
            node.contains(nextInput),
          );
        if (currentGroup && nextGroup) {
          const readout = currentGroup.querySelector("output"),
            nextReadout = nextGroup.querySelector("output");
          if (readout && nextReadout)
            readout.textContent = nextReadout.textContent;
          for (const node of [...host.childNodes])
            if (node !== currentGroup) node.remove();
          let before = true;
          for (const node of [...template.content.childNodes]) {
            if (node === nextGroup) {
              before = false;
              continue;
            }
            if (before) host.insertBefore(node, currentGroup);
            else host.append(node);
          }
          this.renderedHTML.set(host, html);
          return;
        }
      } else return;
    }
    if (this.renderedHTML.get(host) === html) return;
    const view = `${this.course.hub ? "hub" : this.course.id}:${id === "inspector" ? this.inspectState?.kind : id === "modal-content" ? this.modal : ""}`;
    const scroll =
      this.renderedViews.get(host) === view
        ? Array.from(
            host.querySelectorAll<HTMLElement>(".proof-paper,.sentence-ribbon"),
          ).map((element) => ({
            selector: element.classList.contains("proof-paper")
              ? ".proof-paper"
              : ".sentence-ribbon",
            top: element.scrollTop,
            left: element.scrollLeft,
            paper: element.dataset.paper,
            style: element.getAttribute("style"),
          }))
        : [];
    const focusKey =
      active && host.contains(active) ? active.getAttribute("data-key") : null;
    host.innerHTML = html;
    this.renderedHTML.set(host, html);
    this.renderedViews.set(host, view);
    for (const previous of scroll) {
      const element = host.querySelector<HTMLElement>(previous.selector);
      if (element) {
        // Restore its projected dimensions before setting scrollTop, otherwise the
        // temporary flat layout can clamp the saved reading position back to zero.
        if (previous.paper) element.dataset.paper = previous.paper;
        if (previous.style) element.setAttribute("style", previous.style);
        element.scrollTop = previous.top;
        element.scrollLeft = previous.left;
      }
    }
    if (focusKey)
      host
        .querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"]`)
        ?.focus({ preventScroll: true });
  }
  render() {
    if (this.rendering) return;
    this.rendering = true;
    try {
      const c = this.course,
        room = roomOf(c.room);
      this.root.dataset.view = c.hub ? "hub" : c.room;
      this.root.dataset.station = c.id;
      this.root.classList.toggle("context-editing", this.contextOpen && !c.hub);
      this.root.classList.toggle("has-inspector", !!this.inspectState);
      this.patch(
        "topbar",
        `<div class="brand-row" data-nova-return-host><div class="brand-name">活字印书局</div>${!c.hub ? `<span class="current-room">${room.name}</span>` : '<span class="current-room">第七章</span>'}</div><div class="header-actions">${b(icon("list") + "游学图", "route")}${b("玩法", "guide")}${b(icon("book") + "<span>手记</span>", "notebook", "", false, 'aria-label="打开学习手记"')}${b(icon("gear"), "settings", "", false, 'aria-label="设置"')}</div>`,
      );
      (
        window as unknown as { NovaCourseLinks?: { mountReturn: () => void } }
      ).NovaCourseLinks?.mountReturn();
      const brand = this.element("topbar").querySelector(".brand-row")!;
      if (!brand.querySelector("#nova-course-return,.workshop-return"))
        brand.insertAdjacentHTML(
          "afterbegin",
          '<a class="workshop-return" href="../../courses/?chapter=7" aria-label="返回奇点">← 返回奇点</a>',
        );
      this.element("atelier").hidden =
        c.hub ||
        c.room !== "council" ||
        !!this.inspectState ||
        !this.contextOpen;
      this.patch("atelier", atelier(c, this.atelierPage));
      if (c.hub) {
        this.patch(
          "heading",
          `<div class="eyebrow"><span class="little-seal">奇点</span> 字里行间，有一座世界</div><h1>活字印书局<span class="title-stop">。</span></h1><p class="hub-intro">从一块活字，到一份自己的报纸。<br>在排字、改句和续写中，看见语言模型怎样工作。</p><div class="hero-action">${b(Object.keys(c.progress.done).length ? "继续我的排印之旅 " + icon("arrow") : "推门，开始排字 " + icon("arrow"), "resume", "", true)}<span>${c.progress.route === "core" ? "核心路线 · 8个环节，走到真实出版" : "完整探索 · 25个环节"}</span></div><div class="hub-route-choice">${b("核心路线", "learning-route", "core", false, `aria-pressed="${c.progress.route === "core"}"`)}${b("完整探索", "learning-route", "full", false, `aria-pressed="${c.progress.route === "full"}"`)}</div>`,
        );
        this.patch(
          "dock",
          `<div class="courtyard-caption"><span class="compass">南</span><span>拖动画面，环看院落<small>青瓦木构 · 一字一印</small></span>${b("展开游学图 " + icon("list"), "route")}</div>`,
        );
        this.patch(
          "corner",
          `<span class="chapter-note">Nº 07 <i></i> 语言模型的工作现场</span>`,
        );
      } else {
        this.patch(
          "heading",
          `<div class="eyebrow"><span>动手实验</span><span class="heading-line"></span>${b(e(conceptForStation(c.id)?.name ?? "语言模型"), "hint", "", false, 'class="concept-marker"')}</div><h1>${TITLES[c.id]}</h1><p class="task-line">${e(BRIEFS[c.id])}</p>`,
        );
        this.patch("dock", dock(c));
        this.patch(
          "corner",
          `${c.room === "council" && c.id !== "12" ? b(icon("pen") + "改句子", "open-context") : b("回到院落", "hub")}`,
        );
      }
      this.element("task-status").hidden = c.hub;
      this.patch("task-status", taskStatus(c));
      this.patch("surface", surface(c));
      this.patch(
        "word-caption",
        c.room === "council"
          ? `<span>观察 <b>「${e(c.meeting.tokens[c.queryIndex])}」</b></span>${b("看计算 ↗", "inspect-selected")}`
          : "",
      );
      const movable = [
        "01",
        "03",
        "04",
        "08",
        "11",
        "12",
        "13",
        "14",
        "15",
        "20",
        "21",
        "22",
      ].includes(c.id);
      const gesture =
        c.id === "08"
          ? c.holding
            ? `拿起「${e(c.holding)}」，拖进地图预测位置`
            : "四次预测已留下，可以对照或重新放置"
          : c.room === "press"
            ? "拿起候选字，拖入上方排印行"
            : c.id === "20"
              ? "拖动下排字牌，自己安排座位"
              : c.room === "foundry" && c.foundryPieces.length < 2
                ? "写一个短句，再拿起字牌调整顺序"
                : "按住字牌拖动，试试新的词序";
      const keys =
        c.id === "08"
          ? "也可点击区域按钮放置"
          : c.room === "press"
            ? "也可点选候选字或按 Enter"
            : "空格拿起 · 方向键换位 · Enter 放下";
      this.patch(
        "manipulation-help",
        !c.hub && movable
          ? `<span title="${keys}">${icon("hand")} ${gesture}</span>${c.canUndoMove && c.id !== "12" ? b("撤回", "undo-move") : ""}${c.id === "08" && Object.keys(c.note<{ placed: Record<string, unknown> }>("08", { placed: {} }).placed).length ? b("撤回落点", "unplace") : ""}`
          : "",
      );
      this.root.style.setProperty(
        "--dock-top",
        `${this.element("dock").getBoundingClientRect().top}px`,
      );
      this.root.style.setProperty(
        "--manipulation-top",
        `${this.element("manipulation-help").getBoundingClientRect().top}px`,
      );
      this.workshop.setData(
        sceneData(c, window.innerWidth <= 760, this.openNameplates),
      );
      this.root.style.setProperty(
        "--workbench-height",
        `${this.element("workbench-footer").getBoundingClientRect().height}px`,
      );
      this.workshop.inspect(this.sceneInset());
      this.workshop.refreshProjection();
      this.renderInspector();
      if (this.modal) this.renderModal();
      this.editors.prepare(this.root);
      this.pages.schedule(
        this.root.querySelector(".proof-paper"),
        `paper-${c.id}`,
      );
      const busy = this.element("busy");
      busy.hidden = !c.busy;
      busy.textContent = c.busy;
      const dockElement = this.element("dock");
      dockElement.inert = !!c.busy;
      dockElement.setAttribute("aria-busy", String(!!c.busy));
    } finally {
      this.rendering = false;
    }
  }
  private project(items: Hotspot[]) {
    const live = new Set(items.map((x) => x.id)),
      host = this.element("hotspots");
    for (const [id, el] of this.hotspots)
      if (!live.has(id)) {
        el.remove();
        this.hotspots.delete(id);
      }
    for (const item of items) {
      let el = this.hotspots.get(item.id);
      if (!el) {
        el = document.createElement(
          item.action === "drop-area" ? "div" : "button",
        );
        if (el instanceof HTMLButtonElement) el.type = "button";
        el.dataset.hotspot = item.id;
        el.addEventListener("pointerenter", () => this.workshop.hover(item.id));
        el.addEventListener("pointerleave", () => this.workshop.hover(""));
        el.addEventListener("focus", () => this.workshop.hover(item.id));
        el.addEventListener("blur", () => this.workshop.hover(""));
        this.hotspots.set(item.id, el);
        host.append(el);
      }
      el.dataset.cmd = item.action;
      el.dataset.value = item.value;
      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      el.style.width = `${item.width}px`;
      el.style.height = `${item.height}px`;
      el.hidden = !item.visible;
      if (item.action === "drop-area") {
        el.className = "drop-area-target";
        el.dataset.dropArea = item.value;
        el.removeAttribute("data-cmd");
        el.setAttribute("aria-hidden", "true");
      } else if (item.action === "room") {
        const r = roomOf(item.value as RoomId),
          unlocked = this.course.canEnterRoom(r.id);
        el.className = "door-label";
        el.innerHTML = `<span>${r.name}</span><small>${roomDone(this.course.progress, r.id) ? "已完成" : unlocked ? "推门进入 ↗" : "稍后抵达"}</small>`;
        el.setAttribute(
          "aria-label",
          r.name + "，" + (unlocked ? "进入" : "了解这间作坊"),
        );
      } else {
        el.className = "object-target";
        el.textContent = "";
        const movable =
          !!item.manipulation &&
          !this.modal &&
          !this.inspectState &&
          !this.course.busy;
        el.dataset.movable = String(movable);
        const position =
          item.manipulation?.kind === "reorder"
            ? `，第${item.manipulation.index + 1}位`
            : "";
        el.setAttribute(
          "aria-label",
          item.label +
            position +
            (movable
              ? "，可拖动字牌"
              : this.course.id === "06"
                ? "，点击翻面"
                : ""),
        );
        if (movable) el.setAttribute("aria-describedby", "manipulation-help");
        else el.removeAttribute("aria-describedby");
        el.title =
          item.label +
          (movable
            ? item.manipulation?.kind === "print"
              ? " · 拖入排印行，或点击印下"
              : " · 拖动拿起，点击选中"
            : this.course.id === "06"
              ? " · 点击翻面"
              : "");
      }
    }
    // Keep keyboard order aligned with the newly sorted, visible candidates.
    let cursor = host.firstElementChild;
    for (const item of items) {
      const node = this.hotspots.get(item.id)!;
      if (node === cursor) cursor = cursor.nextElementSibling;
      else host.insertBefore(node, cursor);
    }
    this.tileControls.update(items);
    const caption = this.element("word-caption"),
      selected = items.find(
        (item) => item.id === `word${this.course.queryIndex}`,
      );
    caption.hidden =
      this.course.hub ||
      this.course.room !== "council" ||
      !selected?.visible ||
      !!this.modal ||
      !!this.inspectState ||
      this.contextOpen;
    if (selected && !caption.hidden) {
      caption.style.left = `${selected.x}px`;
      caption.style.top = `${selected.y + selected.height / 2 + 12}px`;
    }
  }
  private sceneInset() {
    return !!this.inspectState || !!this.modal || this.contextOpen;
  }
  private openInspector(kind: string, arg = "") {
    if (!this.inspectState)
      this.panelInvoker = document.activeElement as HTMLElement;
    this.inspectState = { kind, arg };
    this.element("atelier").hidden = true;
    this.root.classList.add("has-inspector");
    this.workshop.inspect(true);
    this.renderInspector();
    this.element("inspector")
      .querySelector<HTMLButtonElement>(".close-button")
      ?.focus({ preventScroll: true });
  }
  private closeInspector() {
    this.inspectState = null;
    this.element("inspector").hidden = true;
    this.root.classList.remove("has-inspector");
    this.render();
    this.panelInvoker?.focus({ preventScroll: true });
  }
  private renderInspector() {
    const host = this.element("inspector");
    host.hidden = !this.inspectState;
    if (!this.inspectState) return;
    const { kind, arg } = this.inspectState,
      c = this.course;
    let result = inspector(c, kind, arg);
    if (kind === "hint")
      result = {
        title: "字字的小提示",
        html: `<span class="concept-marker">${e(conceptForStation(c.id)?.name ?? "语言模型")}</span><p class="inspector-lead">${e(HINTS[c.id])}</p><p class="concept-explanation">${e(conceptForStation(c.id)?.text ?? "")}</p><h3>这一步，值得留下的发现</h3><p>${e(c.station.finding)}</p>`,
      };
    if (kind === "checklist")
      result = {
        title: "这一步，留下什么？",
        html: `<ul class="evidence-list">${c.checks.map((x) => `<li class="${x.done ? "checked" : ""}">${x.done ? icon("check") : "<i></i>"}<span>${e(x.text)}</span></li>`).join("")}</ul>${c.ready && !c.done && c.needsReview ? b("解释并留下证据", "review", "", true) : ""}`,
      };
    if (kind === "presets")
      result = {
        title: "从一句话开始",
        html: `<div class="choices">${SENTENCES.map((s) => b(e(s), "use-sentence", s)).join("")}</div>`,
      };
    this.patch(
      "inspector",
      `<header><span class="panel-kicker">手边的观察</span>${b(icon("close"), "close-inspector", "", false, 'class="close-button" aria-label="收起检视窗"')}</header><h2>${e(result.title)}</h2><div class="inspector-content">${result.html}</div>`,
    );
    this.editors.prepare(host);
    this.pages.schedule(
      host.querySelector(".inspector-content"),
      `${c.id}-${kind}-${arg}`,
    );
  }
  private openModal(kind: Modal) {
    if (!this.modal) this.previousFocus = document.activeElement as HTMLElement;
    this.modal = kind;
    this.modalFeedback = "";
    this.element("word-caption").hidden = true;
    this.renderModal();
    const dialog = this.element<HTMLDialogElement>("modal");
    if (!dialog.open) dialog.showModal();
    this.pageModal();
    this.workshop.inspect(true);
    this.element("modal-content")
      .querySelector<HTMLElement>("[autofocus], .modal-close")
      ?.focus();
  }
  private closeModal() {
    this.element<HTMLDialogElement>("modal").close();
    if (this.modal === "guide") {
      const guide = this.course.note<{ seen: string[] }>("guide", { seen: [] });
      if (!guide.seen.includes(this.course.id)) {
        guide.seen.push(this.course.id);
        this.course.put("guide", guide);
        this.course.flush();
      }
    }
    this.modal = null;
    this.element("modal").classList.remove("comparison-dialog");
    this.workshop.inspect(this.sceneInset());
    this.workshop.refreshProjection();
    this.previousFocus?.focus({ preventScroll: true });
  }
  private pageModal() {
    if (
      this.modal &&
      !(["route", "comparison", "guide", "settings"] as string[]).includes(
        this.modal,
      )
    )
      this.pages.schedule(
        this.element("modal-content").querySelector(".modal-body"),
        `modal-${this.modal}-${this.course.id}`,
      );
  }
  private renderModal() {
    const c = this.course;
    this.element("modal").classList.toggle(
      "comparison-dialog",
      this.modal === "comparison",
    );
    this.element("modal").classList.toggle(
      "route-dialog",
      this.modal === "route",
    );
    this.element("modal").classList.toggle(
      "guide-dialog",
      this.modal === "guide",
    );
    this.element("modal").classList.toggle(
      "settings-dialog",
      this.modal === "settings",
    );
    let title = "",
      html = "",
      wide = false;
    if (this.modal === "comparison") {
      title = "改了一句话，哪里变了？";
      wide = true;
      html = contextComparison(c);
    } else if (this.modal === "guide") {
      title = c.hub
        ? "你是这一版特刊的编辑"
        : `${c.station.title} · 先试一小步`;
      html = `<div class="guide-emblem">字字 · 编辑部来信</div><p class="guide-intro">${c.hub ? "校庆特刊要开印了。你来排字、试线索、选续写，再核对并出版自己的文章。" : e(c.station.task)}</p><p>${c.hub ? "先在铸字房拆一句话；核心路线可以一路抵达出版，研究环节随时回访。" : e(HINTS[c.id])}</p><p class="fineprint">可以跳过带做，直接试验。实际操作、对照和编辑决定会进入手记；玩法介绍不计完成。</p><div class="guide-actions">${b("动手试一试", "guide-start", "", true)}${b("跳过，自己探索", "guide-start")}</div>`;
    } else if (this.modal === "route") {
      title = "从一句话，到一份自己的特刊";
      wide = true;
      html = `<div class="route-options">${b(c.exploring ? "返回推荐路线" : "自由探索所有作坊", "explore", c.exploring ? "guided" : "explore")}${b("核心路线 · 8环节", "learning-route", "core", c.progress.route === "core", `aria-pressed="${c.progress.route === "core"}"`)}${b("完整探索 · 25环节", "learning-route", "full", c.progress.route === "full", `aria-pressed="${c.progress.route === "full"}"`)}</div><p class="route-explanation">核心：分块 → 初始名牌 → 上下文 → 逐词元续写 → 温度对照 → 核对、编辑与出版。深入研究保留铸字、投影、多头与Q/K/V；切换路线保留全部草稿，未做的环节不计完成。</p><div class="route-map">${ROOMS.map(
        (r, i) =>
          `<section class="route-room"><div class="route-number">0${i + 1}</div><h3>${r.name}</h3><p>${ROOM_SUBTITLES[r.id]}</p><ol>${stationsOf(
            r.id,
          )
            .map(
              (s) =>
                `<li><button data-cmd="station" data-value="${s.id}" ${c.canEnter(s.id) ? "" : "disabled"} class="${c.id === s.id ? "selected" : ""} ${isCoreStation(s.id) ? "core-stop" : "study-stop"}"><span>${c.progress.done[s.id] ? "✓" : s.id}</span>${s.title}<small>${isCoreStation(s.id) ? "核心" : "研究"}</small></button></li>`,
            )
            .join("")}</ol></section>`,
      ).join(
        "",
      )}</div><p class="fineprint">观察与动手之后，再启下一页。已完成的实验可以随时回来重做。</p>`;
    } else if (this.modal === "notebook") {
      title = "我的排印手记";
      wide = true;
      html = `<div class="notebook-top"><p>已经留下 <b>${Object.keys(c.progress.done).length} / 25</b> 次观察</p>${b("保存学习记录", "export")}${b("导出特刊", "export-issue", "", true, c.progress.finale ? "" : "disabled")}</div>${c.store.loaded.warning ? `<p class="warning">${e(c.store.loaded.warning)}</p>${b("保存原始记录", "export-original")}` : ""}<div class="notebook-pages">${ROOMS.map(
        (r) =>
          `<section><span class="panel-kicker">${r.page}</span><h3>${r.name}</h3><p>${c.progress.reviews[r.id] ? e(c.progress.reviews[r.id]!.observation) : r.id === "counting" && c.progress.route === "core" ? "深入研究尚未完成，可以从游学图进入。" : "这一页，等待你的观察。"}</p>${c.progress.reviews[r.id]?.evidence ? `<details><summary>复查这次A/B证据</summary>${experimentMarkup(c.progress.reviews[r.id]!.evidence)}</details>` : ""}${CONCEPTS.filter(
            (x) =>
              STATIONS.find((s) => s.id === x.at)?.room === r.id &&
              c.progress.done[x.at],
          )
            .map(
              (x) =>
                `<details><summary>${x.name}</summary><p>${x.text}</p></details>`,
            )
            .join("")}</section>`,
      ).join("")}</div>`;
    } else if (this.modal === "settings") {
      title = "把作坊调到舒服的样子";
      html = `<label class="setting-row">画面精度<select data-field="quality"><option value="auto" ${this.quality === "auto" ? "selected" : ""}>平衡 · 默认</option><option value="fine" ${this.quality === "fine" ? "selected" : ""}>精细 · 更高分辨率</option><option value="eco" ${this.quality === "eco" ? "selected" : ""}>轻量 · 关闭景深</option></select></label><label class="setting-row">减少镜头移动<input type="checkbox" data-field="motion" ${this.devices.reducedMotion ? "checked" : ""}></label><label class="setting-row">静音<input type="checkbox" data-field="muted" ${this.devices.muted ? "checked" : ""}></label><p class="fineprint">选择适合当前设备的清晰度。精细画面保留更多材质和阴影细节；轻量适合较慢的设备。</p><div class="settings-foot">${b("保存学习记录", "export")}${b("重新开始", "reset-dialog")}</div>`;
    } else if (this.modal === "reset") {
      title = "重新装订这一本手记？";
      html = `<p>将清除这个浏览器里本课程的进度和特刊草稿。可以先保存一份学习记录。</p>${b("先保存记录", "export")}${b("保留，继续学习", "settings")}${b("清除并重新开始", "reset-confirm", "", true)}`;
    } else if (this.modal === "review") {
      const r = c.reviewDefinition;
      title = r.title;
      html = `${experimentMarkup(c.reviewEvidence)}<section class="activity-unit"><p class="review-question">${r.question}</p><div class="choices">${r.options.map((text, i) => b(e(text), "review-choice", String(i), false, `aria-pressed="${i === this.reviewChoice}"`)).join("")}</div></section><section class="activity-unit"><label class="write-label">${r.prompt}<textarea data-field="review-observation" rows="3" placeholder="引用前面一次实际输入或读数，再写自己的解释…">${e(this.reviewObservation)}</textarea></label><p class="fineprint">操作与提交条件由系统检查；理解质量由教师、同伴和后续任务判断。</p><p class="review-feedback" role="status">${e(this.reviewFeedback)}</p>${b(c.id === "25" ? "签字，完成特刊" : "把这一页装进手记", "review-submit", "", true)}</section>`;
    } else if (this.modal === "room") {
      const r = roomOf(this.roomPreview);
      title = r.name;
      html = `<p class="panel-kicker">${ROOM_SUBTITLES[r.id]}</p><p class="review-question">${r.question}</p><p>${r.bug}</p><p class="fineprint">先完成前一间作坊，把自己的观察装进手记，就能推开这里的门。</p>${b("继续眼前的实验", "resume", "", true)}`;
    } else if (this.modal === "edition") {
      title = "这一版，由你与字字合写";
      wide = true;
      const d = c.draft;
      html = `<article class="edition"><header><h2>晨风报</h2><span>校庆特刊 · 活字印书局</span></header><h3>${e(d.headline)}</h3><p class="edition-body">${d.spans?.map((s) => `<span class="${s.by === "ai" ? "ai-writing" : ""}">${e(s.text)}</span>`).join("") ?? ""}</p><footer>蓝线：保留的 AI 文字。其余：作者撰写或修改。<br>编辑记录：${e(c.progress.reviews.press?.observation ?? "")}</footer></article><div class="edition-actions">${b("保存这份特刊", "export-issue", "", true)}${b("回到院落", "hub")}</div>`;
    }
    const host = this.element("modal-content");
    host.classList.toggle("wide", wide);
    this.patch(
      "modal-content",
      `<header class="modal-header"><span class="panel-kicker">活字印书局 · 案头</span>${b(icon("close"), "close-modal", "", false, 'class="modal-close" aria-label="关闭窗口"')}</header><h2>${title}</h2><p class="modal-feedback" role="status" ${this.modalFeedback ? "" : "hidden"}>${e(this.modalFeedback)}</p><div class="modal-body">${html}</div>`,
    );
    this.editors.prepare(host);
    this.pageModal();
  }
  private async command(cmd: string, value: string) {
    this.tileControls.cancel();
    const c = this.course;
    if (cmd === "fold-nameplates") {
      this.openNameplates.clear();
      this.render();
      return;
    }
    if (cmd === "pick" && c.id === "06") {
      if (this.openNameplates.has(value)) this.openNameplates.delete(value);
      else this.openNameplates.add(value);
      await c.perform("pick", value);
      this.sound.play(this.devices.muted);
      return;
    }
    if (cmd === "open-context") {
      this.contextOpen = true;
      this.inspectState = null;
      this.render();
      this.element("atelier")
        .querySelector<HTMLInputElement>('input[data-field="council-text"]')
        ?.focus();
      return;
    }
    if (cmd === "close-context") {
      this.contextOpen = false;
      this.render();
      return;
    }
    if (cmd === "compare-context") {
      if (!compareCouncil({ a: c.councilExperiment.a, b: c.councilSnapshot })) {
        this.notice(
          "先换一句话，并保留同一个观察词、同一层和同一个头，再比较变化。",
        );
        return;
      }
      c.captureCouncil("b");
      this.contextOpen = false;
      this.render();
      this.openModal("comparison");
      return;
    }
    if (cmd === "comparison-answer") {
      this.modalFeedback = "";
      await c.perform("answer", value);
      this.renderModal();
      return;
    }
    if (cmd === "comparison-detail") {
      this.closeModal();
      this.openInspector("free-context");
      return;
    }
    if (cmd === "guide") {
      this.openModal("guide");
      return;
    }
    if (cmd === "explore") {
      if (value !== "guided") c.startExploring();
      this.navigate(() =>
        value === "guided"
          ? c.continue()
          : c.hub
            ? c.continue()
            : c.enter(c.id),
      );
      return;
    }
    if (cmd === "guide-start") {
      c.startExploring();
      const guide = c.note<{ seen: string[] }>("guide", { seen: [] });
      if (!guide.seen.includes(c.id)) guide.seen.push(c.id);
      c.put("guide", guide);
      c.flush();
      this.closeModal();
      if (c.hub) this.navigate(() => c.continue());
      return;
    }
    if (cmd === "atelier-page") {
      this.atelierPage = value as AtelierPage;
      this.render();
      return;
    }
    if (cmd === "council-page") {
      c.setCouncilPage(Number(value));
      return;
    }
    if (cmd === "capture-context") {
      c.captureCouncil(value as "a" | "b");
      this.sound.play(this.devices.muted, true);
      return;
    }
    if (cmd === "apply-context" || cmd === "set-context") {
      const changed = c.setCouncilText(
        cmd === "set-context" ? value : this.fieldValue("council-text"),
      );
      if (changed) {
        this.contextOpen = false;
        this.render();
        this.workshop.respond("reorder");
      }
      this.sound.play(this.devices.muted);
      return;
    }
    if (["insert-context", "replace-context", "remove-context"].includes(cmd)) {
      c.editCouncilToken(
        cmd === "insert-context"
          ? "insert"
          : cmd === "replace-context"
            ? "replace"
            : "remove",
        value || this.fieldValue("context-token"),
      );
      this.sound.play(this.devices.muted);
      return;
    }
    if (cmd === "learning-route") {
      if (value === "core" || value === "full") c.setRoute(value);
      this.notice(
        value === "core"
          ? "已选核心路线；研究记录和未完成环节都保留。"
          : "已选完整探索；从尚未完成的环节继续。",
      );
      return;
    }
    if (cmd === "undo-move") {
      c.undoMove();
      return;
    }
    if (cmd === "reset-order") {
      c.resetCouncilOrder();
      return;
    }
    if (cmd.startsWith("inspect-")) {
      this.openInspector(cmd.slice(8), value);
      return;
    }
    if (["notebook", "settings", "route", "edition"].includes(cmd)) {
      this.openModal(cmd as Modal);
      return;
    }
    if (cmd === "close-modal") {
      this.closeModal();
      return;
    }
    if (cmd === "close-inspector") {
      this.closeInspector();
      return;
    }
    if (cmd === "reset-dialog") {
      this.openModal("reset");
      return;
    }
    if (cmd === "reset-confirm") {
      if (c.reset()) location.reload();
      else this.notice("浏览器不允许清除保存记录，请检查存储权限。");
      return;
    }
    if (cmd === "hint" || cmd === "checklist" || cmd === "presets") {
      this.openInspector(cmd);
      return;
    }
    if (cmd === "export" || cmd === "export-original") {
      this.download(
        cmd === "export"
          ? "活字印书局-学习记录.json"
          : "活字印书局-原始记录.txt",
        cmd === "export"
          ? encode(c.progress)
          : (c.store.original ?? "无原始记录"),
        "application/json",
      );
      this.notice("已请求下载学习记录。");
      return;
    }
    if (cmd === "export-issue") {
      this.exportIssue();
      return;
    }
    if (cmd === "review") {
      this.reviewChoice = c.progress.reviews[c.room]?.choice ?? -1;
      this.reviewObservation = c.progress.reviews[c.room]?.observation ?? "";
      this.reviewFeedback = "";
      this.openModal("review");
      return;
    }
    if (cmd === "review-choice") {
      this.reviewChoice = Number(value);
      this.reviewFeedback = "";
      this.renderModal();
      return;
    }
    if (cmd === "review-submit") {
      if (!c.review(this.reviewChoice, this.reviewObservation)) {
        this.reviewFeedback =
          this.reviewChoice !== c.reviewDefinition.correct
            ? c.reviewDefinition.explanation
            : "引用一次实际输入或读数，写下你的观察，再装订这一页。";
        this.renderModal();
        return;
      }
      this.closeModal();
      this.closeInspector();
      this.notice(c.reviewDefinition.bridge, 6500);
      if (c.id === "25") this.openModal("edition");
      return;
    }
    if (cmd === "room") {
      if (!c.canEnterRoom(value as RoomId)) {
        this.roomPreview = value as RoomId;
        this.openModal("room");
        return;
      }
      this.navigate(() => c.enterRoom(value as RoomId));
      return;
    }
    if (cmd === "station") {
      this.navigate(() => c.enter(value));
      return;
    }
    if (cmd === "hub") {
      this.navigate(() => c.courtyard());
      return;
    }
    if (cmd === "resume" || cmd === "next") {
      this.navigate(() => c.continue());
      return;
    }
    if (c.busy) return;
    if (cmd === "use-sentence") {
      this.closeInspector();
      await c.perform("sentence", value);
      await c.perform("analyse");
      return;
    }
    if (cmd === "rare-input") {
      await c.perform("rare", this.fieldValue("sentence") || c.sentence);
      return;
    }
    if (cmd === "search") {
      const word = this.fieldValue("search").trim();
      if (!c.models.map.words.some((w) => w.text === word)) {
        this.notice("这张地图还没有这个词，可以试试苹果、小猫、地铁、学校。");
        return;
      }
      await c.perform("pick", word);
      this.openInspector("selected");
      return;
    }
    if (cmd === "pair-current") {
      await c.perform("pair", c.pairIndex);
      this.openInspector("selected");
      return;
    }
    if (cmd === "pronoun-current") {
      await c.perform("pronoun", c.pronoun);
      return;
    }
    if (cmd === "place-region") {
      const cluster = c.models.map.clusters.find((x) => x.key === value)!;
      await c.perform("place", [cluster.x, cluster.y]);
      return;
    }
    if (cmd === "best-token") {
      await c.perform("print-token", c.candidates[0].id);
      return;
    }
    if (cmd === "restart-input") {
      await c.perform(
        "restart",
        this.fieldValue("prompt") || c.printState.prompt,
      );
      return;
    }
    if (cmd === "mark") {
      const split = value.lastIndexOf("|");
      await c.perform("mark", [value.slice(0, split), value.slice(split + 1)]);
      return;
    }
    await c.perform(cmd as Action, value);
    this.workshop.respond(cmd);
    if (cmd === "print-token")
      this.root
        .querySelector<HTMLElement>('[data-hotspot][data-cmd="print-token"]')
        ?.focus({ preventScroll: true });
    if (cmd === "pick" && c.room === "gallery") this.openInspector("selected");
    if (cmd === "fill") this.openInspector("fill");
    if (cmd === "publish" && c.ready) {
      this.closeInspector();
      this.notice("校稿已经送印。再签下编辑记录，完成这一版。");
    }
    if (cmd === "mix") this.openInspector("mix");
    if (cmd === "answer" && c.ready) {
      this.notice("观察已留下，可以继续下一步。");
      this.closeInspector();
    }
  }
  private navigate(action: () => void) {
    this.contextOpen = false;
    this.openNameplates.clear();
    if (this.modal) this.closeModal();
    if (this.inspectState) this.closeInspector();
    document.activeElement instanceof HTMLElement &&
      document.activeElement.blur();
    action();
    const seen = this.course.note<{ seen: string[] }>("guide", {
      seen: [],
    }).seen;
    if (
      !stationsOf(this.course.room).some((station) =>
        seen.includes(station.id),
      ) &&
      !this.course.done &&
      !this.course.hub
    )
      this.openModal("guide");
    requestAnimationFrame(() => {
      const heading = this.element("heading").querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      (heading as HTMLElement)?.focus({ preventScroll: true });
    });
  }
  private fieldValue(name: string) {
    return (
      this.root.querySelector<HTMLInputElement>(`[data-field="${name}"]`)
        ?.value ?? ""
    );
  }
  private editorText(field: string) {
    if (field === "review-observation") return this.reviewObservation;
    if (field === "temperature-reason")
      return this.course.note<{ reason?: string }>("23", {}).reason ?? "";
    if (field === "reason")
      return this.course.note<{ reason?: string }>("05", {}).reason ?? "";
    if (field.startsWith("draft-")) {
      const key = field.slice(6) as "headline" | "opening" | "ai" | "edited";
      return this.course.draft[key] ?? "";
    }
    return "";
  }
  private async field(el: HTMLInputElement, changed: boolean) {
    this.tileControls.cancel();
    const field = el.dataset.field;
    if (!field) return;
    const c = this.course,
      value = this.editors.merge(el);
    if (field === "review-observation") {
      this.reviewObservation = value;
      this.editors.prepare(this.element("modal-content"));
      return;
    }
    if (field === "quality") {
      this.quality = value;
      this.devices.quality = value as DeviceSettings["quality"];
      writeDeviceSettings(this.devices);
      this.workshop.setQuality(value as "auto" | "fine" | "eco");
      return;
    }
    if (field === "motion") {
      this.devices.reducedMotion = el.checked;
      writeDeviceSettings(this.devices);
      this.workshop.setReduced(el.checked);
      return;
    }
    if (field === "muted") {
      this.devices.muted = el.checked;
      writeDeviceSettings(this.devices);
      return;
    }
    if (field.startsWith("draft-")) {
      await c.perform("draft", [field.slice(6), value]);
      return;
    }
    if (field === "reason") {
      await c.perform("reason", value);
      return;
    }
    if (field === "temperature-reason") {
      await c.perform("temperature-reason", value);
      return;
    }
    if (field === "sentence") {
      await c.perform("sentence", value);
      return;
    }
    if (field === "prompt") {
      await c.perform("restart", value);
      return;
    }
    if (!changed) return;
    if (
      [
        "size",
        "pair",
        "pronoun",
        "insert",
        "layer",
        "head",
        "magnify",
        "temperature",
      ].includes(field)
    )
      await c.perform(field as Action, Number(value));
  }
  private keydown(event: KeyboardEvent) {
    if (event.key === "Escape" && this.modal) {
      event.preventDefault();
      this.closeModal();
      return;
    }
    if (event.key === "Escape" && this.inspectState && !this.modal) {
      event.preventDefault();
      this.closeInspector();
    }
    if (
      event.key === "Enter" &&
      !event.isComposing &&
      event.target instanceof HTMLInputElement
    ) {
      const field = event.target.dataset.field;
      if (field === "sentence" || field === "search" || field === "prompt") {
        event.preventDefault();
        void this.command(
          field === "search"
            ? "search"
            : field === "prompt"
              ? "restart-input"
              : this.course.id === "03"
                ? "rare-input"
                : "analyse",
          "",
        );
      }
    }
  }
  private notice(message: string, duration = 3800) {
    if (this.modal) {
      this.modalFeedback = message;
      this.renderModal();
      return;
    }
    clearTimeout(this.toastTimer);
    const el = this.element("notice");
    el.textContent = message;
    el.classList.add("shown");
    this.toastTimer = window.setTimeout(
      () => el.classList.remove("shown"),
      duration,
    );
  }
  private fail(error: unknown) {
    console.error(error);
    this.notice("这一步没有完成，请重试。学习记录仍保留。", 6500);
  }
  private download(filename: string, text: string, type: string) {
    if (type === "text/html")
      void this.course.store
        .saveArtifact(this.course.draft.headline || filename, text, type)
        .catch(() =>
          this.notice("个人作品保存尚未完成，当前稿件与本机下载仍保留。"),
        );
    const url = URL.createObjectURL(
        new Blob([text], { type: type + ";charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private exportIssue() {
    const c = this.course,
      d = c.draft;
    if (!c.progress.finale) return;
    const body =
      d.spans
        ?.map(
          (s) =>
            `<span class="${s.by === "ai" ? "ai" : "human"}">${e(s.text)}</span>`,
        )
        .join("") ?? "";
    const records = ROOMS.map((room) => {
      const review = c.progress.reviews[room.id];
      return `<section><h3>${room.name} · 我的观察</h3><p>${e(review?.observation ?? "深入研究尚未留下编辑记录")}</p>${review?.evidence ? experimentMarkup(review.evidence) : ""}</section>`;
    }).join("");
    const sources = `<section><h3>本课核对来源 · 校庆安排表</h3><p>虚构校庆的课内权威资料；并非现实新闻。</p><ul>${ANNIVERSARY_FACTS.map((fact) => `<li>${e(fact.label)}：${e(fact.value)}</li>`).join("")}</ul></section>`;
    this.download(
      "活字印书局-我的特刊.html",
      `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${e(d.headline)} · 晨风报</title><style>body{max-width:780px;margin:60px auto;padding:30px;color:#302b23;background:#f5f0e4;font:18px/1.9 serif}h1{font-size:58px;border-block:3px double;padding:12px 0}h2{font-size:32px}.ai{text-decoration:underline;text-decoration-color:#518588;text-underline-offset:5px}small,footer{color:#666}section{border-top:1px solid #baac92;margin-top:32px}p{white-space:pre-wrap}.evidence-pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}.evidence-pair p{font-size:15px;overflow-wrap:anywhere}@media print{body{margin:0;background:white}}</style><header><small>活字印书局 · 校庆特刊 · ${c.progress.route === "core" ? "核心路线" : "完整探索"}</small><h1>晨风报</h1></header><h2>${e(d.headline)}</h2><p>${body}</p><footer>蓝线表示保留的 AI 原稿，其他文字由作者撰写或修改。<p>编辑记录：${e(c.progress.reviews.press?.observation ?? "")}</p></footer>${records}${sources}</html>`,
      "text/html",
    );
  }
}
