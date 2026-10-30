import type { LessonUnit } from "../content/lesson-flow.ts";
import type { TaskSession } from "./task-context.ts";
import type { AudioPlayer } from "../media/audio.ts";
import { cameraTool, soundTool, messageTool, motionTool, fusionTool } from "./observation-tools.ts";
import {
  labelCard,
  sortingTool,
  attributesTool,
  unknownTool,
  deliveryTool,
  archiveSoundTool,
  rainDecisionTool,
} from "./label-tools.ts";
import { learningTool, evaluationTool } from "./learning-tools.ts";
import { authorTool } from "./author-tools.ts";
import { assistantCard, referenceCard } from "./assistant-card.ts";
import { el } from "./tool-dom.ts";
import { SOUND_FACTS } from "../content/lesson-guides.ts";

type Bank =
  | "camera"
  | "sound"
  | "message"
  | "motion"
  | "fusion"
  | "label"
  | "sorting"
  | "attributes"
  | "unknown"
  | "delivery"
  | "archive"
  | "rain"
  | "learning"
  | "evaluation"
  | "author"
  | "result";
interface UnitView {
  bank: Bank;
  focus: string;
  context?: string[];
  reference?: boolean;
  result?: boolean;
}
const action = (name: string) => `[data-action="${name}"]`;
const group = (label: string) => `[role="radiogroup"][aria-label="${label}"]`;
const range = (label: string) => `input[type="range"][aria-label="${label}"]`;
const field = (label: string) => `[aria-label="${label}"]`;
const camera = (focus: string, context: string[] = [".viewfinder"]): UnitView => ({
  bank: "camera",
  focus,
  context,
});
const sound = (focus: string): UnitView => ({ bank: "sound", focus, context: [".sound-stage"] });

/** A unit selects a real existing tool, never a scripted imitation of its result. */
const UNITS: Record<LessonUnit, UnitView> = {
  wipe: camera(".viewfinder", [".wipe-field"]),
  cover: camera(".viewfinder", [range("叶子挡住了多少")]),
  angle: camera(range("转一转")),
  light: camera(range("光线")),
  background: camera(group("背景纸")),
  kind: camera(group("观察的东西")),
  variant: camera(".stepper-field"),
  capture: camera(action("capture")),
  "photo-album": { ...camera(".film-strip", []), result: true },
  result: { bank: "result", focus: ".assistant-card" },
  verify: { ...camera(action("verify")), reference: true },
  compare: { ...camera(action("compare"), []), result: true },
  label: {
    bank: "label",
    focus: ".label-chips",
    context: [".label-head", ".label-status", action("confirm-label")],
  },
  "label-source": { bank: "label", focus: action("label-source"), reference: true },
  "add-example": { bank: "label", focus: action("add-example"), context: [".label-status"] },
  "model-check": { bank: "label", focus: action("model-check"), reference: true },
  "sound-select": sound(group("选一份录音")),
  listen: { ...sound(action("listen")), context: [".sound-stage", ".tool-help"] },
  "sound-variant": sound(action("new-recording")),
  "sound-predict": { ...sound(action("sound-predict")), result: true },
  "sound-verify": { ...sound(action("sound-verify")), reference: true },
  noise: sound(range("周围有多吵")),
  improve: sound(group("下一步，怎么补救")),
  "message-first": { bank: "message", focus: action("message-first"), context: [".message-paper"] },
  "message-second": {
    bank: "message",
    focus: action("message-second"),
    context: [".message-paper"],
  },
  "tool-choose": {
    bank: "message",
    focus: group("这份文字，交给哪个工具？"),
    context: [".message-paper"],
  },
  "text-predict": {
    bank: "message",
    focus: action("text-predict"),
    context: [".message-paper"],
    result: true,
  },
  "motion-scrub": {
    bank: "motion",
    focus: range("短片进度"),
    context: [".motion-screen", action("play-motion")],
  },
  "motion-select": { bank: "motion", focus: group("换一段短片"), context: [".motion-screen"] },
  "motion-predict": {
    bank: "motion",
    focus: action("motion-predict"),
    context: [".motion-screen"],
    result: true,
  },
  "motion-verify": {
    bank: "motion",
    focus: action("motion-verify"),
    context: [".motion-screen"],
    reference: true,
  },
  "fusion-question": { bank: "fusion", focus: group("这一次问的是"), context: [".clue-tray"] },
  "fusion-source": { bank: "fusion", focus: ".source-check" },
  "fusion-select": { bank: "fusion", focus: ".clue-tray" },
  fuse: { bank: "fusion", focus: action("fuse"), context: [".clue-tray"], result: true },
  "clue-read": {
    bank: "fusion",
    focus: action("read-clue"),
    context: ['[data-clue="message"]'],
    result: true,
  },
  "sort-color": { bank: "sorting", focus: ".sorting-cards", context: [".sorting-bins"] },
  "sort-use": {
    bank: "sorting",
    focus: ".sorting-cards",
    context: [".sorting-bins", ".mode-chips"],
  },
  "attribute-name": { bank: "attributes", focus: group("名字标签"), context: [".attribute-photo"] },
  "attribute-color": {
    bank: "attributes",
    focus: group("颜色标签"),
    context: [".attribute-photo"],
  },
  "attribute-source": {
    bank: "attributes",
    focus: action("attribute-source"),
    context: [".attribute-photo"],
    reference: true,
  },
  "attribute-material": {
    bank: "attributes",
    focus: group("材料标签"),
    context: [".attribute-photo"],
    reference: true,
  },
  unknown: {
    bank: "unknown",
    focus: ".reason-chips",
    context: [action("save-unknown")],
    reference: true,
  },
  "packet-open": { bank: "learning", focus: action("open-packet"), context: [".learning-board"] },
  "example-edit": { bank: "learning", focus: ".example-grid", context: [".example-pagination"] },
  train: { bank: "learning", focus: action("train"), context: [".learning-board"] },
  "compare-models": { bank: "learning", focus: action("compare-models"), result: true },
  "album-save": { bank: "learning", focus: action("save-album"), context: [".learning-board"] },
  freeze: { bank: "evaluation", focus: action("freeze"), context: [".exam-lock"] },
  "test-known": {
    bank: "evaluation",
    focus: action("test-known"),
    context: [".exam-lock"],
    result: true,
  },
  "test-heldout": {
    bank: "evaluation",
    focus: action("test-heldout"),
    context: [".exam-lock"],
    result: true,
  },
  delivery: {
    bank: "delivery",
    focus: ".kind-chips",
    context: [".visitor-quote", action("deliver")],
  },
  "archive-content": { bank: "archive", focus: group("听到的是") },
  "archive-source": { bank: "archive", focus: group("声音从哪里来"), reference: true },
  "archive-save": {
    bank: "archive",
    focus: action("archive-sound"),
    context: [".archive-draft", ".archive-list"],
  },
  "rain-choice": { bank: "rain", focus: ".plan-chips", context: [action("rain-decision")] },
  "author-title": { bank: "author", focus: field("委托名称") },
  "author-question": { bank: "author", focus: field("我要问的问题") },
  "author-materials": { bank: "author", focus: ".material-toggles", context: [group("声音材料")] },
  "author-object": { bank: "author", focus: group("照片里放什么"), context: [".author-canvas"] },
  "author-cover": { bank: "author", focus: range("给访客留多少遮挡"), context: [".author-canvas"] },
  "author-light": { bank: "author", focus: range("照片的光线"), context: [".author-canvas"] },
  "author-explanation": { bank: "author", focus: field("给访客的核对说明") },
  "author-save": { bank: "author", focus: action("save-author"), context: [".author-canvas"] },
  "author-test": {
    bank: "author",
    focus: action("test-author"),
    context: [".author-canvas"],
    result: true,
  },
};

function unitRoot(node: HTMLElement): HTMLElement {
  return node.closest<HTMLElement>(".scale-field,.chip-field,.author-field,.stepper-field") ?? node;
}
function focusOnly(root: HTMLElement, targets: HTMLElement[]) {
  function visit(node: HTMLElement) {
    const whole = targets.includes(node),
      path = whole || targets.some((target) => node.contains(target));
    node.classList.toggle("flow-excluded", !path);
    node.inert = !path;
    if (whole) {
      for (const child of node.querySelectorAll<HTMLElement>(".flow-excluded")) {
        child.classList.remove("flow-excluded");
        child.inert = false;
      }
      return;
    }
    for (const child of node.children) if (child instanceof HTMLElement) visit(child);
  }
  visit(root);
}

export function lessonTools(ctx: TaskSession, audio: AudioPlayer) {
  const root = el("div", "lesson-tools"),
    storage = el("div", "lesson-storage");
  storage.hidden = true;
  const stage = el("div", "lesson-tool-stage"),
    supplements = el("div", "lesson-supplements");
  const ref = referenceCard(ctx),
    answer = assistantCard(ctx, true);
  const currentPhoto = el("img", "lesson-current-photo");
  currentPhoto.alt = "这次实际拍下的照片";
  const sourceEvidence = el("div", "lesson-source-evidence");
  root.append(stage, supplements, storage);
  const banks = new Map<Bank, HTMLElement>();
  let active: LessonUnit | null = null,
    activeBank: Bank | null = null,
    alongside: LessonUnit[] = [];
  const build = (bank: Bank): HTMLElement => {
    let node = banks.get(bank);
    if (node) return node;
    switch (bank) {
      case "camera":
        node = cameraTool(ctx);
        break;
      case "sound":
        node = soundTool(ctx, audio);
        break;
      case "message":
        node = messageTool(ctx);
        break;
      case "motion":
        node = motionTool(ctx);
        break;
      case "fusion":
        node = fusionTool(ctx);
        break;
      case "label":
        node = labelCard(
          ctx,
          ["album", "repair", "diversity", "bias", "leaves"].includes(ctx.activity.kind),
        );
        break;
      case "sorting":
        node = sortingTool(ctx);
        break;
      case "attributes":
        node = attributesTool(ctx);
        break;
      case "unknown":
        node = unknownTool(ctx);
        break;
      case "delivery":
        node = deliveryTool(ctx);
        break;
      case "archive":
        node = archiveSoundTool(ctx);
        break;
      case "rain":
        node = rainDecisionTool(ctx);
        break;
      case "learning":
        node = learningTool(ctx);
        break;
      case "evaluation":
        node = evaluationTool(ctx);
        break;
      case "author":
        node = authorTool(ctx);
        break;
      case "result":
        node = el("div", "lesson-result");
        break;
    }
    banks.set(bank, node);
    storage.append(node);
    return node;
  };
  function refresh() {
    if (!active) return;
    const unit = UNITS[active],
      bank = build(unit.bank),
      companions = alongside.map((extra) => UNITS[extra]).filter((extra) => extra.bank === unit.bank);
    for (const item of root.querySelectorAll(".lesson-focus"))
      item.classList.remove("lesson-focus");
    supplements.replaceChildren();
    if (active === "result") {
      bank.replaceChildren();
      if (ctx.current && ctx.output?.kind === "image") {
        currentPhoto.src = ctx.current.image;
        bank.append(currentPhoto);
      }
      bank.append(answer);
    } else {
      const focus = bank.querySelector<HTMLElement>(unit.focus);
      if (!focus)
        throw new Error(`课程操作缺少实际控件：${ctx.activity.id}/${active}/${unit.focus}`);
      const targets = [unitRoot(focus)];
      for (const selector of [
        ...(unit.context ?? []),
        ...companions.flatMap((extra) => [extra.focus, ...(extra.context ?? [])]),
      ])
        for (const context of bank.querySelectorAll<HTMLElement>(selector))
          targets.push(unitRoot(context));
      focusOnly(bank, targets);
      unitRoot(focus).classList.add("lesson-focus");
      // Picture gestures and clue selection have their own teaching steps.
      const finder = bank.querySelector<HTMLElement>(".viewfinder");
      if (finder)
        finder.classList.toggle(
          "is-readonly",
          active !== "wipe" && active !== "cover" && !alongside.includes("cover"),
        );
      const tray = bank.querySelector<HTMLElement>(".clue-tray");
      if (tray) tray.inert = active !== "fusion-select";
      if (unit.reference) supplements.append(ref);
      if (unit.result && ctx.output) supplements.append(answer);
      if (
        ["label", "label-source", "add-example", "model-check", "unknown"].includes(active) &&
        ctx.current
      ) {
        currentPhoto.src = ctx.current.image;
        supplements.prepend(currentPhoto);
      }
      if (active === "fusion-source") {
        sourceEvidence.replaceChildren(
          el("p", "", `照片资料：${ctx.current?.source ?? "还没有照片"}`),
          el("p", "", `录音资料：${SOUND_FACTS[ctx.soundKind]}`),
        );
        supplements.prepend(sourceEvidence);
      }
    }
  }
  return {
    root,
    /** `extra` units from the same tool bank stay on screen too, e.g. the leaf slider beside the shutter. */
    show(unit: LessonUnit, extra: LessonUnit[] = []) {
      active = unit;
      alongside = extra;
      ctx.cameraInput =
        unit === "wipe" ? "wipe" : unit === "cover" || extra.includes("cover") ? "cover" : "none";
      const definition = UNITS[unit];
      if (activeBank !== definition.bank) {
        for (const child of [...stage.children]) storage.append(child);
        activeBank = definition.bank;
        stage.append(build(definition.bank));
      }
      root.dataset.unit = unit;
      root.dataset.alongside = extra.join(" ");
      refresh();
    },
    refresh,
    fields(): Record<string, string> {
      return {
        ...Object.fromEntries(
          [
            ...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
              "input[aria-label],textarea[aria-label]",
            ),
          ].map((input) => [input.getAttribute("aria-label")!, input.value]),
        ),
        ...Object.fromEntries(
          [...root.querySelectorAll<HTMLElement>('[role="radiogroup"][aria-label]')].map(
            (group) => [
              group.getAttribute("aria-label")!,
              group.querySelector<HTMLElement>('[aria-checked="true"]')?.dataset.value ?? "",
            ],
          ),
        ),
        委托材料: ctx.progress.author.tools.join(","),
      };
    },
    firstControl(): HTMLElement | null {
      return (
        stage.querySelector<HTMLElement>(
          ".lesson-focus button,.lesson-focus input,.lesson-focus textarea,button.lesson-focus,input.lesson-focus,textarea.lesson-focus",
        ) ??
        [...stage.querySelectorAll<HTMLElement>("button,input,select")].find(
          (node) => !node.closest(".flow-excluded") && !node.hasAttribute("disabled"),
        ) ??
        null
      );
    },
  };
}
