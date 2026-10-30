import type {
  HeaderView,
  ShellActions,
  ShellAPI,
  TaskCardView,
} from "./contracts";
import { button, el, icon } from "./dom";
import { itemIcon, personPortrait } from "../art/paper-people.ts";
import "./styles.css";

let nextShellId = 0;

function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

function withIcon(element: HTMLButtonElement, name: string): HTMLButtonElement {
  element.prepend(icon(name));
  return element;
}

/** Change a button's words without touching its icon. */
function setButtonLabel(element: HTMLButtonElement, text: string): void {
  const node = Array.from(element.childNodes).find(
    (child) => child.nodeType === Node.TEXT_NODE,
  );
  if (node && node.textContent !== text) node.textContent = text;
}

const FIRST_VISIT_COPY =
  "便签上只写了半句话。跑跑会照你的安排一步步去做——先弄清要做什么，再排步骤、试一试。";

/** The shell owns its chrome. Course, lab and project views own the three hosts. */
export class WorkshopShell implements ShellAPI {
  readonly boardHost: HTMLElement;
  readonly panelHost: HTMLElement;
  readonly modalHost: HTMLElement;

  private readonly surface: HTMLElement;
  private readonly taskCard: HTMLElement;
  private readonly lessonLabel: HTMLElement;
  private readonly progressLabel: HTMLElement;
  private readonly progressButton: HTMLButtonElement;
  private readonly lessonDots: HTMLElement[];
  private readonly loading: HTMLElement;
  private readonly welcome: HTMLElement;
  private readonly welcomeBadgeText: HTMLElement;
  private readonly welcomeHeading: HTMLElement;
  private readonly welcomeCopy: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly labStartButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly pauseLabel: HTMLElement;
  private readonly energyValue: HTMLElement;
  private readonly energyTrack: HTMLElement;
  private readonly energyFill: HTMLElement;
  private readonly loadValue: HTMLElement;
  private readonly loadDots: HTMLElement;
  private readonly mission: HTMLElement;
  private readonly toastElement: HTMLElement;
  private readonly toastMessage: HTMLElement;
  private readonly mobileBoardButton: HTMLButtonElement;
  private readonly mobilePanelButton: HTMLButtonElement;
  private readonly modeButtons: Map<HeaderView["mode"], HTMLButtonElement>;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private lastNotice: string | null = null;
  private lastCapacity = -1;
  private lastTaskKey = "";

  constructor(root: HTMLElement, actions: ShellActions) {
    const instanceId = `workshop-${++nextShellId}`;
    this.surface = el("div", "workshop-app");
    this.surface.dataset.surface = "board";
    this.surface.dataset.mode = "course";

    const decoration = el("div", "desk-decoration");
    decoration.setAttribute("aria-hidden", "true");
    for (const className of [
      "desk-leaf leaf-top",
      "desk-leaf leaf-bottom",
      "desk-leaf leaf-right",
    ]) {
      const leaf = el("span", className);
      leaf.append(icon("leaf"));
      decoration.append(leaf);
    }

    const header = el("header", "workshop-header");
    const top = el("div", "workshop-topbar");
    const brand = el("div", "brand-plaque");
    const brandKicker = el("span", "brand-kicker", "小学 · 第四章");
    const brandName = el("h1", "brand-name");
    brandName.append(
      el("span", "brand-action", "行动"),
      el("span", "brand-workshop", "工坊"),
    );
    const brandLeaf = el("span", "brand-leaf");
    brandLeaf.setAttribute("aria-hidden", "true");
    brandLeaf.append(icon("leaf"));
    brand.append(brandKicker, brandName, brandLeaf);

    this.taskCard = el("section", "task-card");
    this.taskCard.setAttribute("aria-label", "任务卡");
    this.taskCard.setAttribute("aria-live", "polite");

    const headerMeta = el("div", "header-meta");
    const progress = button(
      "",
      "open-lessons-progress",
      actions.openLessons,
      "course-progress",
    );
    this.progressButton = progress;
    progress.setAttribute("aria-label", "查看课程进度");
    const progressTop = el("span", "progress-top");
    this.lessonLabel = el("strong", "lesson-label", "第 1 课");
    this.progressLabel = el("span", "progress-label", "0 / 25");
    progressTop.append(this.lessonLabel, this.progressLabel);
    const dots = el("span", "lesson-dots");
    dots.setAttribute("aria-hidden", "true");
    this.lessonDots = Array.from({ length: 5 }, (_, index) =>
      el("span", "lesson-dot", String(index + 1)),
    );
    dots.append(...this.lessonDots);
    progress.append(progressTop, dots);
    this.pauseButton = button(
      "",
      "pause",
      actions.pause,
      "pause-button icon-button",
    );
    this.pauseButton.append(icon("pause"));
    this.pauseLabel = el("span", "sr-only", "暂停");
    this.pauseButton.append(this.pauseLabel);
    this.pauseButton.title = "暂停";
    this.pauseButton.disabled = true;
    const returnHost = el("nav", "nova-return-host");
    returnHost.dataset.novaReturnHost = "";
    header.prepend(returnHost);
    headerMeta.append(progress, this.pauseButton);
    top.append(brand, this.taskCard, headerMeta);

    const toolbar = el("div", "workshop-toolbar");
    const nav = el("nav", "workshop-nav");
    nav.setAttribute("aria-label", "工坊工具");
    const course = withIcon(
      button("课程", "open-lessons", actions.openLessons, "nav-button"),
      "book",
    );
    const notebook = withIcon(
      button("作品册", "open-notebook", actions.openNotebook, "nav-button"),
      "notebook",
    );
    const lab = withIcon(
      button("路线实验室", "open-lab", actions.openLab, "nav-button"),
      "road",
    );
    const home = withIcon(
      button("回校园", "open-course", actions.openCourse, "nav-button"),
      "home",
    );
    const settings = withIcon(
      button(
        "设置",
        "open-settings",
        actions.openSettings,
        "nav-button nav-settings",
      ),
      "settings",
    );
    this.modeButtons = new Map([
      ["course", course],
      ["project", notebook],
      ["lab", lab],
    ]);
    nav.append(course, notebook, lab, home, settings);
    toolbar.append(nav);
    header.append(top, toolbar);

    const main = el("main", "workshop-main");
    const boardFrame = el("section", "workshop-board");
    boardFrame.id = `${instanceId}-board`;
    boardFrame.setAttribute("aria-label", "可操作的校园棋盘");
    this.boardHost = el("div", "board-host");
    this.boardHost.setAttribute("aria-label", "校园地图");
    this.loading = el("div", "board-loading");
    this.loading.setAttribute("role", "status");
    const loadingCard = el("div", "loading-card");
    loadingCard.append(
      icon("truck"),
      el("strong", "", "正在把纸艺校园摆上桌……"),
      el("span", "", "跑跑马上就到"),
    );
    this.loading.append(loadingCard);

    this.welcome = el("section", "welcome-note");
    this.welcome.hidden = true;
    const welcomeBadge = el("span", "welcome-badge");
    this.welcomeBadgeText = el("span", "", "开放日前一天");
    welcomeBadge.append(icon("flag"), this.welcomeBadgeText);
    this.welcomeHeading = el("h2", "", "行动站收到一张便签");
    this.welcomeCopy = el("p", "", FIRST_VISIT_COPY);
    this.startButton = withIcon(
      button(
        "去看看便签",
        "start",
        actions.start,
        "button primary welcome-start",
      ),
      "play",
    );
    this.labStartButton = withIcon(
      button(
        "先去路线实验室玩玩",
        "start-lab",
        actions.openLab,
        "button ghost welcome-lab",
      ),
      "road",
    );
    this.welcome.append(
      welcomeBadge,
      this.welcomeHeading,
      this.welcomeCopy,
      this.startButton,
      this.labStartButton,
    );

    this.toastElement = el("div", "board-toast");
    this.toastElement.hidden = true;
    this.toastElement.setAttribute("role", "status");
    this.toastElement.setAttribute("aria-live", "polite");
    this.toastElement.setAttribute("aria-atomic", "true");
    const toastMark = el("span", "toast-mark");
    toastMark.append(icon("help"));
    this.toastMessage = el("span", "toast-message");
    this.toastElement.append(toastMark, this.toastMessage);
    boardFrame.append(
      this.boardHost,
      this.loading,
      this.welcome,
      this.toastElement,
    );

    const panel = el("aside", "workshop-panel");
    panel.id = `${instanceId}-panel`;
    panel.setAttribute("aria-label", "任务与操作");
    this.panelHost = el("div", "panel-host");
    panel.append(this.panelHost);
    main.append(boardFrame, panel);

    const mobileTabs = el("div", "mobile-view-switch");
    mobileTabs.setAttribute("role", "tablist");
    mobileTabs.setAttribute("aria-label", "看棋盘或操作");
    this.mobileBoardButton = withIcon(
      button(
        "校园棋盘",
        "show-board",
        () => this.setSurface("board"),
        "mobile-view-tab active",
      ),
      "map",
    );
    this.mobilePanelButton = withIcon(
      button(
        "我的操作",
        "show-panel",
        () => this.setSurface("panel"),
        "mobile-view-tab",
      ),
      "notebook",
    );
    this.mobileBoardButton.setAttribute("role", "tab");
    this.mobilePanelButton.setAttribute("role", "tab");
    this.mobileBoardButton.setAttribute("aria-controls", boardFrame.id);
    this.mobilePanelButton.setAttribute("aria-controls", panel.id);
    this.mobileBoardButton.setAttribute("aria-selected", "true");
    this.mobilePanelButton.setAttribute("aria-selected", "false");
    this.mobilePanelButton.tabIndex = -1;
    for (const [target, control] of [
      ["board", this.mobileBoardButton],
      ["panel", this.mobilePanelButton],
    ] as const) {
      control.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const next =
          event.key === "Home"
            ? "board"
            : event.key === "End"
              ? "panel"
              : target === "board"
                ? "panel"
                : "board";
        this.setSurface(next);
        (next === "board"
          ? this.mobileBoardButton
          : this.mobilePanelButton
        ).focus();
      });
    }
    mobileTabs.append(this.mobileBoardButton, this.mobilePanelButton);

    const footer = el("footer", "workshop-statusbar");
    const resources = el("div", "resource-cluster");
    const energy = el("div", "resource resource-energy");
    energy.append(icon("energy"), el("span", "resource-label", "能量"));
    this.energyValue = el("strong", "resource-value", "0 / 0");
    this.energyTrack = el("span", "resource-meter");
    this.energyTrack.setAttribute("role", "meter");
    this.energyTrack.setAttribute("aria-label", "剩余能量");
    this.energyTrack.setAttribute("aria-valuemin", "0");
    this.energyFill = el("span", "resource-meter-fill");
    this.energyTrack.append(this.energyFill);
    energy.append(this.energyTrack, this.energyValue);
    const load = el("div", "resource resource-load");
    load.append(icon("truck"), el("span", "resource-label", "车厢"));
    this.loadDots = el("span", "load-dots");
    this.loadDots.setAttribute("aria-hidden", "true");
    this.loadValue = el("strong", "resource-value", "0 / 0");
    load.append(this.loadDots, this.loadValue);
    resources.append(energy, load);
    this.mission = el("p", "workshop-mission", "");
    footer.append(resources, this.mission);

    this.modalHost = el("div", "modal-host");
    this.surface.append(
      decoration,
      header,
      mobileTabs,
      main,
      footer,
      this.modalHost,
    );
    root.replaceChildren(this.surface);
    // A modal invalidates old world feedback; it must not return when the modal closes.
    const modalObserver = new MutationObserver(() => {
      const open = this.modalHost.childElementCount > 0;
      this.surface.classList.toggle("has-modal", open);
      header.inert = open;
      if (open) this.clearToast();
    });
    modalObserver.observe(this.modalHost, { childList: true });
  }

  private renderTask(task: TaskCardView): void {
    const key = JSON.stringify(task);
    if (key === this.lastTaskKey) return;
    this.lastTaskKey = key;
    const card = this.taskCard;
    card.replaceChildren();
    card.dataset.kind = task.kind;
    const face = el("span", "task-face");
    if (task.person) {
      const image = el("img");
      image.src = personPortrait(task.person, "idle", 50);
      image.alt = "";
      face.append(image);
    } else face.append(icon(task.kind === "reach" ? "road" : "target"));
    const copy = el("div", "task-copy");
    copy.append(el("span", "task-title", task.title));
    const facts = el("div", "task-facts");
    const fact = (text: string, className = "", art?: string) => {
      const chip = el("span", `task-fact ${className}`.trim());
      if (art) {
        const image = el("img");
        image.src = art;
        image.alt = "";
        chip.append(image);
      }
      chip.append(el("span", "", text));
      facts.append(chip);
    };
    fact(
      task.itemText,
      task.itemText.includes("？") ? "unknown" : "",
      task.item ? itemIcon(task.item, 22) : undefined,
    );
    fact(task.route, task.route.includes("？") ? "unknown" : "route");
    copy.append(facts);
    const stamps = el("div", "task-stamps");
    for (const stamp of task.stamps) {
      const chip = el(
        "span",
        `task-stamp${stamp.set ? " set" : ""}${stamp.met ? " met" : ""}${stamp.preference ? " preference" : ""}`,
        stamp.label,
      );
      if (stamp.met) chip.prepend(icon("check"));
      stamps.append(chip);
    }
    card.append(face, copy);
    if (task.stamps.length) card.append(stamps);
  }

  update(view: HeaderView): void {
    this.surface.dataset.mode = view.mode;
    this.surface.classList.toggle("is-playing", view.playing);
    this.surface.classList.toggle("is-moving", view.moving);
    this.surface.classList.toggle("is-ready", view.ready);
    this.surface.classList.toggle("is-started", view.started);
    this.renderTask(view.task);
    setText(this.mission, view.mission);
    setText(this.lessonLabel, `第 ${view.lesson} 课`);
    setText(this.progressLabel, `${view.completed} / 25`);
    this.progressLabel.setAttribute(
      "aria-label",
      `已完成 ${view.completed} 个环节，共 25 个`,
    );
    this.progressButton.setAttribute(
      "aria-label",
      `查看课程进度：第 ${view.lesson} 课，已完成 ${view.completed} 个环节，共 25 个`,
    );
    this.lessonDots.forEach((dot, index) => {
      dot.classList.toggle("current", index + 1 === view.lesson);
      dot.classList.toggle("done", view.completed >= 25);
    });
    for (const [mode, control] of this.modeButtons) {
      const active = mode === view.mode;
      control.classList.toggle("active", active);
      control.setAttribute("aria-pressed", String(active));
    }
    this.loading.hidden = view.ready;
    this.welcome.hidden = !view.ready || view.started;
    setText(this.welcomeBadgeText, view.resume ? "欢迎回来" : "开放日前一天");
    setText(
      this.welcomeHeading,
      view.resume ? view.resume.title : "行动站收到一张便签",
    );
    setText(
      this.welcomeCopy,
      view.resume ? view.resume.detail : FIRST_VISIT_COPY,
    );
    setButtonLabel(this.startButton, view.resume ? "接着做" : "去看看便签");
    this.startButton.disabled = !view.ready;
    this.labStartButton.disabled = !view.ready;
    this.pauseButton.disabled = !view.ready || !view.playing;
    setText(this.pauseLabel, view.playing ? "暂停" : "跑跑没在走");
    this.pauseButton.title = view.playing ? "暂停" : "跑跑走的时候可以暂停";
    setText(this.energyValue, `${view.energy} / ${view.energyMax}`);
    const energyMax = Math.max(1, view.energyMax);
    const energy = Math.max(0, Math.min(view.energy, energyMax));
    this.energyTrack.setAttribute("aria-valuenow", String(energy));
    this.energyTrack.setAttribute("aria-valuemax", String(energyMax));
    this.energyTrack.setAttribute(
      "aria-valuetext",
      `还剩 ${view.energy} 点，一共 ${view.energyMax} 点`,
    );
    this.energyFill.style.width = `${(energy / energyMax) * 100}%`;
    this.energyTrack.classList.toggle(
      "low",
      view.energy <= view.energyMax * 0.25,
    );
    setText(this.loadValue, `${view.load} / ${view.capacity} 格`);
    const capacity = Math.max(0, Math.min(6, Math.floor(view.capacity)));
    if (capacity !== this.lastCapacity) {
      this.loadDots.replaceChildren(
        ...Array.from({ length: capacity }, () => el("span", "load-slot")),
      );
      this.lastCapacity = capacity;
    }
    Array.from(this.loadDots.children).forEach((dot, index) =>
      dot.classList.toggle("filled", index < view.load),
    );
    this.loadValue.classList.toggle("over-capacity", view.load > view.capacity);
    if (view.notice !== this.lastNotice) {
      this.lastNotice = view.notice;
      if (view.notice) this.toast(view.notice);
    }
  }

  /** Only for messages about saving and loading; run feedback lives in bubbles. */
  toast(message: string): void {
    this.clearToast();
    if (!message || this.modalHost.childElementCount > 0) return;
    this.toastMessage.textContent = message;
    this.toastElement.hidden = false;
    this.toastTimer = setTimeout(() => this.clearToast(), 6500);
  }

  private clearToast(): void {
    if (this.toastTimer !== undefined) clearTimeout(this.toastTimer);
    this.toastTimer = undefined;
    this.toastElement.hidden = true;
  }

  private setSurface(surface: "board" | "panel"): void {
    this.surface.dataset.surface = surface;
    for (const [name, control] of [
      ["board", this.mobileBoardButton],
      ["panel", this.mobilePanelButton],
    ] as const) {
      const selected = name === surface;
      control.classList.toggle("active", selected);
      control.setAttribute("aria-selected", String(selected));
      control.tabIndex = selected ? 0 : -1;
    }
  }
}
