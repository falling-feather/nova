import type { ForestState } from "../core/types.ts";
import { currentActivityId, phaseFor } from "../core/state.ts";
import { ACTIVITIES, MISSIONS } from "../content/activities.ts";
import { connectionAt } from "../core/navigation.ts";
import type { WorldAction } from "../core/life.ts";
import { button, el, icon, iconButton, textIfChanged } from "./dom.ts";
import { assetUrl } from "../asset-url.ts";
import { objectiveGuide } from "../core/objective-guide.ts";
import "./objective-guide.css";
import "./living-world.css";

export interface ShellActions {
  start(): void;
  openActivity(id?: string): void;
  openMap(): void;
  openJournal(): void;
  openSettings(): void;
  toggleMute(): void;
  moveTouch(direction: number): void;
  lift(): void;
  worldAction(): void;
}

interface ShellView {
  ready: boolean;
  started: boolean;
  blocked: boolean;
  location: string;
  nearby: string | null;
  nearbyWorld: WorldAction | null;
  traveling: boolean;
  warning: string | null;
}

const NUMERALS = ["一", "二", "三", "四", "五"];

export class Shell {
  readonly panelHost: HTMLElement;
  private readonly root: HTMLElement;
  private readonly actions: ShellActions;
  private readonly welcome: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly startLabel: HTMLElement;
  private readonly welcomeNote: HTMLElement;
  private readonly loading: HTMLElement;
  private readonly loadingBar: HTMLElement;
  private readonly backdrop: HTMLElement;
  private readonly missionTitle: HTMLElement;
  private readonly activityTitle: HTMLElement;
  private readonly progress: HTMLElement;
  private readonly leaves: HTMLElement[];
  private readonly location: HTMLElement;
  private readonly objective: HTMLButtonElement;
  private readonly objectiveArrow: HTMLElement;
  private readonly objectiveInstruction: HTMLElement;
  private readonly objectivePlace: HTMLElement;
  private readonly objectiveCompanion: HTMLElement;
  private readonly objectiveAction: HTMLElement;
  private readonly muteButton: HTMLButtonElement;
  private readonly interaction: HTMLButtonElement;
  private readonly interactionTitle: HTMLElement;
  private readonly worldInteraction: HTMLButtonElement;
  private readonly worldInteractionTitle: HTMLElement;
  private readonly liftButton: HTMLButtonElement;
  private readonly warning: HTMLElement;
  private readonly toastNode: HTMLElement;
  private ready = false;
  private started = false;
  private blocked = true;
  private muted: boolean | null = null;
  private touchDirection = 0;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(root: HTMLElement, actions: ShellActions) {
    this.root = root;
    this.actions = actions;
    root.classList.add("forest-ui");

    this.welcome = el("section", "welcome-page");
    this.welcome.setAttribute("aria-labelledby", "forest-title");
    const welcomeMark = el("div", "welcome-mark");
    welcomeMark.append(icon("leaf"), el("span", "", "第三章 · 机器眼中的世界"));
    const title = el("h1", "forest-title", "森语奇旅");
    title.id = "forest-title";
    const subtitle = el("p", "welcome-subtitle", "和 AI 一起认识世界");
    const welcomeDescription = el(
      "p",
      "welcome-description",
      "小助手的眼睛有点模糊了。带上好奇心，从中央营地出发，一起看一看、听一听，再找找答案的依据。",
    );
    this.startButton = button(
      "森林正在醒来…",
      () => {
        if (this.ready && !this.started) this.actions.start();
      },
      "button primary start-button",
      "leaf",
    );
    this.startButton.disabled = true;
    this.startLabel = this.startButton.querySelector("span")!;
    this.welcomeNote = el("p", "welcome-note");
    this.loading = el("p", "loading-note", "正在装好森林画面，请稍等。");
    this.loading.setAttribute("role", "status");
    this.loadingBar = el("span", "loading-bar");
    const loadingTrack = el("span", "loading-track");
    loadingTrack.append(this.loadingBar);
    this.loading.append(loadingTrack);
    // A painted still of the camp covers the screen until the live scene is ready.
    this.backdrop = el("div", "welcome-backdrop");
    this.backdrop.setAttribute("aria-hidden", "true");
    this.backdrop.style.backgroundImage = `url("${assetUrl("ui/title-art.png")}")`;
    const welcomeControls = el("div", "welcome-controls");
    const walk = el("span");
    walk.append(
      el("kbd", "", "A D"),
      document.createTextNode(" / "),
      el("kbd", "", "← →"),
      document.createTextNode(" 走一走"),
    );
    const interact = el("span");
    interact.append(
      el("kbd", "", "E"),
      document.createTextNode(" 调查 · 也可以点击林间小路"),
    );
    welcomeControls.append(walk, interact);
    this.welcome.append(
      welcomeMark,
      title,
      subtitle,
      welcomeDescription,
      this.startButton,
      this.welcomeNote,
      this.loading,
      welcomeControls,
    );

    this.hud = el("div", "forest-hud");
    this.hud.hidden = true;
    const missionNote = button(
      "",
      () => this.actions.openJournal(),
      "mission-note",
    );
    missionNote.setAttribute("aria-label", "查看我的委托");
    missionNote.replaceChildren();
    const missionLeaf = icon("leaf", "mission-leaf");
    const missionCopy = el("span", "mission-copy");
    this.missionTitle = el("span", "mission-title");
    this.activityTitle = el("span", "mission-activity");
    const missionFooter = el("span", "mission-footer");
    this.progress = el("span", "leaf-progress");
    this.leaves = Array.from({ length: 5 }, () => {
      const leaf = el("span", "progress-leaf");
      leaf.append(icon("leaf"));
      this.progress.append(leaf);
      return leaf;
    });
    this.location = el("span", "location-label");
    missionFooter.append(this.progress, this.location);
    missionCopy.append(this.missionTitle, this.activityTitle, missionFooter);
    missionNote.append(missionLeaf, missionCopy);
    this.objective=button("",()=>this.actions.openActivity(this.objective.dataset.activity),"objective-guide");
    this.objective.dataset.action="follow-objective";
    this.objectiveArrow=el("span","objective-arrow");this.objectiveArrow.setAttribute("aria-hidden","true");
    const objectiveCopy=el("span","objective-copy");
    this.objectiveInstruction=el("span","objective-instruction");
    this.objectivePlace=el("span","objective-place");
    this.objectiveCompanion=el("span","objective-companion");
    this.objectiveAction=el("span","objective-action");
    objectiveCopy.append(this.objectiveInstruction,this.objectivePlace,this.objectiveCompanion,this.objectiveAction);
    this.objective.replaceChildren(this.objectiveArrow,objectiveCopy);
    const missionStack=el("div","mission-stack");missionStack.append(missionNote,this.objective);

    const topTools = el("nav", "top-tools");
    const returnHost = el("nav", "nova-return-host");
    returnHost.dataset.novaReturnHost = "";
    topTools.setAttribute("aria-label", "返回、声音与暂停");
    this.muteButton = iconButton("关闭声音", "volume", () =>
      this.actions.toggleMute(),
    );
    topTools.append(
      returnHost,
      this.muteButton,
      iconButton("暂停与设置", "pause", () => this.actions.openSettings()),
    );

    const fieldTools = el("nav", "field-tools");
    fieldTools.setAttribute("aria-label", "随身工具");
    const toolEntries: Array<{
      name: string;
      symbol: "camera" | "sound" | "journal" | "map";
      action: () => void;
    }> = [
      {
        name: "相机",
        symbol: "camera",
        action: () => this.actions.openActivity("tool:camera"),
      },
      {
        name: "声音",
        symbol: "sound",
        action: () => this.actions.openActivity("tool:sound"),
      },
      {
        name: "线索册",
        symbol: "journal",
        action: () => this.actions.openJournal(),
      },
      { name: "地图", symbol: "map", action: () => this.actions.openMap() },
    ];
    for (const tool of toolEntries) {
      const item = el("div", "field-tool");
      const control = iconButton(tool.name, tool.symbol, tool.action);
      control.dataset.tool = tool.symbol;
      item.append(control, el("span", "tool-caption", tool.name));
      fieldTools.append(item);
    }

    const movement = el("div", "movement-hint");
    movement.append(
      el("kbd", "", "A D"),
      document.createTextNode(" / "),
      el("kbd", "", "← →"),
      document.createTextNode(" 移动"),
      el("span", "hint-separator", "·"),
      document.createTextNode("点击小路也能走"),
    );

    this.interaction = el("button", "interaction-prompt");
    this.interaction.type = "button";
    this.interaction.hidden = true;
    this.interaction.append(el("kbd", "", "E"));
    this.interactionTitle = el("span");
    this.interaction.append(this.interactionTitle);
    this.interaction.addEventListener("click", () =>
      this.actions.openActivity(),
    );
    this.worldInteraction = el("button", "world-action-prompt");
    this.worldInteraction.type = "button";
    this.worldInteraction.hidden = true;
    this.worldInteractionTitle = el("span");
    this.worldInteraction.append(
      el("kbd", "", "F"),
      this.worldInteractionTitle,
    );
    this.worldInteraction.addEventListener("click", () =>
      this.actions.worldAction(),
    );
    const interactionDock = el("div", "world-action-dock");
    interactionDock.append(this.interaction, this.worldInteraction);

    const touchControls = el("div", "touch-controls");
    touchControls.setAttribute("aria-label", "触屏移动");
    touchControls.append(
      this.directionButton("向左走", "left", -1),
      this.directionButton("向右走", "right", 1),
    );
    this.liftButton = iconButton(
      "乘升降台到树冠",
      "up",
      () => this.actions.lift(),
      "lift-control",
    );
    this.liftButton.hidden = true;
    touchControls.append(this.liftButton);

    this.warning = el("p", "forest-warning");
    this.warning.setAttribute("role", "status");
    this.warning.hidden = true;
    this.toastNode = el("div", "forest-toast");
    this.toastNode.setAttribute("role", "status");
    this.toastNode.setAttribute("aria-live", "polite");
    this.toastNode.hidden = true;
    this.hud.append(
      missionStack,
      fieldTools,
      movement,
      interactionDock,
      touchControls,
    );
    this.panelHost = el("div", "panel-host");
    this.panelHost.id = "forest-panels";
    root.replaceChildren(
      topTools,
      this.backdrop,
      this.welcome,
      this.hud,
      this.warning,
      this.panelHost,
      this.toastNode,
    );
    // Notices follow the actual card height, including wrapped mobile directions.
    const placeNotices=()=>root.style.setProperty("--forest-notice-top",`${missionStack.offsetTop+missionStack.offsetHeight+14}px`);
    new ResizeObserver(placeNotices).observe(missionStack);
    window.addEventListener("resize",placeNotices);
    requestAnimationFrame(placeNotices);

    // Releasing a finger outside the page must not leave movement held down.
    window.addEventListener("blur", () => this.releaseMovement());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.releaseMovement();
    });
  }

  private directionButton(
    label: string,
    symbol: "left" | "right",
    direction: number,
  ): HTMLButtonElement {
    const control = iconButton(label, symbol, () => {}, "touch-direction");
    control.addEventListener("pointerdown", (event) => {
      if (this.blocked || !this.started) return;
      event.preventDefault();
      control.setPointerCapture(event.pointerId);
      this.touchDirection = direction;
      this.actions.moveTouch(direction);
    });
    const release = () => {
      if (this.touchDirection === direction) this.releaseMovement();
    };
    control.addEventListener("pointerup", release);
    control.addEventListener("pointercancel", release);
    control.addEventListener("lostpointercapture", release);
    control.addEventListener("keydown", (event) => {
      if (
        (event.key === " " || event.key === "Enter") &&
        !event.repeat &&
        !this.blocked &&
        this.started
      ) {
        event.preventDefault();
        this.touchDirection = direction;
        this.actions.moveTouch(direction);
      }
    });
    control.addEventListener("keyup", (event) => {
      if (event.key === " " || event.key === "Enter") release();
    });
    control.addEventListener("blur", release);
    return control;
  }

  private releaseMovement(): void {
    if (this.touchDirection === 0) return;
    this.touchDirection = 0;
    this.actions.moveTouch(0);
  }

  update(state: ForestState, view: ShellView): void {
    this.ready = view.ready;
    this.started = view.started;
    if (view.blocked && !this.blocked) {
      this.releaseMovement();
      if (this.toastTimer !== undefined) clearTimeout(this.toastTimer);
      this.toastNode.hidden = true;
    }
    this.blocked = view.blocked;
    this.root.classList.toggle("is-blocked", view.blocked);
    this.root.classList.toggle("is-started", view.started);
    this.root.querySelector<HTMLElement>(".top-tools")!.inert = view.started && view.blocked;
    this.root.classList.toggle(
      "reduced-motion",
      state.preferences.reducedMotion,
    );
    this.welcome.hidden = view.started;
    this.hud.hidden = !view.started;
    this.startButton.disabled = !view.ready;
    this.welcome.setAttribute("aria-busy", String(!view.ready));
    const returning =
      state.completed.length > 0 ||
      state.observations.length > 0 ||
      state.sounds.length > 0;
    textIfChanged(
      this.startLabel,
      view.ready ? (returning ? "继续我的冒险" : "走进森林") : "森林正在醒来…",
    );
    textIfChanged(
      this.welcomeNote,
      returning
        ? `已完成 ${state.completed.length} / 25 项探索 · 留下 ${state.observations.length + state.sounds.length} 份线索`
        : "",
    );
    this.loading.hidden = view.ready;
    this.backdrop.classList.toggle("is-gone", view.ready);

    const active = ACTIVITIES.find(
      (item) => item.id === currentActivityId(state),
    )!;
    const mission = MISSIONS[active.mission - 1];
    const goal=objectiveGuide(state.player,active.id,phaseFor(state),state.completed);
    this.objective.hidden=!goal;
    this.objective.disabled=view.blocked||view.traveling;
    if(goal){
      this.objective.dataset.activity=goal.activityId;
      this.objective.dataset.direction=goal.direction;
      textIfChanged(this.objectiveArrow,({left:"←",right:"→",up:"↑",down:"↓",here:"↓"})[goal.direction]);
      textIfChanged(this.objectiveInstruction,view.traveling?"正在换层，沿通路前进":goal.instruction);
      textIfChanged(this.objectivePlace,goal.place);
      textIfChanged(this.objectiveCompanion,goal.companion);
      textIfChanged(this.objectiveAction,goal.direction==="here"?"点击调查 · 也可以按 E":goal.action);
      this.objective.setAttribute("aria-label",`${goal.instruction}，${goal.place}，${goal.companion}，${goal.action}`);
    }
    textIfChanged(
      this.missionTitle,
      `委托${NUMERALS[active.mission - 1]} · ${mission.title}`,
    );
    textIfChanged(
      this.activityTitle,
      state.completed.length === ACTIVITIES.length
        ? "森林朋友的委托都完成了，可以再去看看。"
        : `${active.id}  ${active.title}`,
    );
    const completedHere = ACTIVITIES.filter(
      (item) =>
        item.mission === active.mission && state.completed.includes(item.id),
    ).length;
    this.progress.setAttribute(
      "aria-label",
      `本次委托已完成 ${completedHere} / 5`,
    );
    this.leaves.forEach((leaf, index) =>
      leaf.classList.toggle("is-complete", index < completedHere),
    );
    textIfChanged(
      this.location,
      `${view.location}${state.player.elevation === "canopy" && !view.traveling ? " · 树冠" : ""}`,
    );

    if (this.muted !== state.preferences.muted) {
      this.muted = state.preferences.muted;
      const label = this.muted ? "开启声音" : "关闭声音";
      this.muteButton.replaceChildren(icon(this.muted ? "muted" : "volume"));
      this.muteButton.setAttribute("aria-label", label);
      this.muteButton.setAttribute("aria-pressed", String(this.muted));
      this.muteButton.title = label;
    }

    this.interaction.hidden =
      !view.nearby || view.blocked || !view.started || view.traveling;
    if (view.nearby) {
      const nearby = ACTIVITIES.find((item) => item.id === view.nearby);
      const revisit=state.completed.includes(view.nearby);
      textIfChanged(this.interactionTitle, `${revisit?"回看 · ":""}${nearby?.title ?? view.nearby}`);
      this.interaction.classList.toggle("is-revisit",revisit);
      this.interaction.setAttribute("aria-label", `${revisit?"回看已完成的探索":"点击开始"}：${nearby?.title ?? view.nearby}，也可以按 E`);
    }
    this.interaction.classList.toggle("is-current", view.nearby === active.id && !state.completed.includes(active.id));
    this.worldInteraction.hidden =
      !view.nearbyWorld || view.blocked || !view.started || view.traveling;
    if (view.nearbyWorld) {
      textIfChanged(this.worldInteractionTitle, view.nearbyWorld.title);
      this.worldInteraction.setAttribute(
        "aria-label",
        `F · ${view.nearbyWorld.title}`,
      );
    }
    const phase = phaseFor(state);
    const connection = connectionAt(
      state.player.x,
      state.player.elevation,
      phase,
    );
    this.liftButton.hidden = phase < 3;
    this.liftButton.disabled = view.blocked || view.traveling || !connection;
    const liftLabel =
      phase < 3
        ? "整理好例子册后开放树冠通路"
        : connection
          ? `经${connection.name}${state.player.elevation === "canopy" ? "回到地面" : "前往树冠"}`
          : "靠近升降台、木坡或树阶后换层";
    this.liftButton.setAttribute("aria-label", liftLabel);
    this.liftButton.title = liftLabel;
    this.warning.hidden = !view.warning;
    if (view.warning) textIfChanged(this.warning, view.warning);
  }

  loadProgress(value: number): void {
    this.loadingBar.style.width = `${Math.round(Math.max(0.04, Math.min(1, value)) * 100)}%`;
  }

  toast(message: string): void {
    if (this.toastTimer !== undefined) clearTimeout(this.toastTimer);
    textIfChanged(this.toastNode, message);
    this.toastNode.hidden = false;
    this.toastTimer = setTimeout(() => {
      this.toastNode.hidden = true;
    }, 4200);
  }
}
