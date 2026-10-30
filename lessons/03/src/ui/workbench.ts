import type { ForestState } from "../core/types.ts";
import type { Activity } from "../content/activities.ts";
import { MISSIONS } from "../content/activities.ts";
import { evidenceStatus } from "../core/state.ts";
import { answerKnowledge, stepReady } from "../core/lesson-flow.ts";
import { flowFor, conceptFor } from "../content/lesson-flow.ts";
import type { LessonUnit } from "../content/lesson-flow.ts";
import { guideFor, wordArt } from "../content/lesson-guides.ts";
import type { AudioPlayer } from "../media/audio.ts";
import { TaskSession } from "./task-context.ts";
import { lessonTools } from "./lesson-tools.ts";
import { el, button } from "./tool-dom.ts";
import { icon } from "./dom.ts";
import { assetUrl } from "../asset-url.ts";
import "./lesson.css";

export interface WorkbenchActions {
  close(): void;
  changed(): void;
  complete(id: string): void;
  message(text: string): void;
}
const UNIT_NAMES: Partial<Record<LessonUnit, string>> = {
  wipe: "擦镜头",
  cover: "改变遮挡",
  angle: "转动对象",
  light: "改变光线",
  background: "更换背景",
  kind: "选择对象",
  variant: "换一个同类个体",
  capture: "拍一张照片",
  "photo-album": "翻看已经拍下的照片",
  result: "看看实际判断",
  verify: "查阅资料",
  compare: "比较两张照片",
  label: "核对并贴标签",
  "label-source": "查标签依据",
  "add-example": "收入例子册",
  "model-check": "查看学习版本",
  "sound-select": "选择录音",
  "sound-variant": "换一份同类录音",
  listen: "播放录音",
  "sound-predict": "让助手听",
  "sound-verify": "核对声音来源",
  noise: "改变录音条件",
  improve: "想补救办法",
  "message-first": "读便签",
  "message-second": "看口信",
  "tool-choose": "选择工具",
  "text-predict": "让助手读文字",
  "motion-scrub": "观察短片",
  "motion-select": "换一段短片",
  "motion-predict": "比较连续画面",
  "motion-verify": "核对运动方向",
  "fusion-question": "换一种问法",
  "fusion-source": "核对线索来源",
  "fusion-select": "选择线索组合",
  fuse: "合并线索",
  "clue-read": "读来件说明",
  "sort-color": "按颜色分类",
  "sort-use": "按用途分类",
  "attribute-name": "名称标签",
  "attribute-color": "颜色标签",
  "attribute-source": "查制作说明",
  "attribute-material": "材料标签",
  unknown: "保留未知",
  "packet-open": "打开来访例子册",
  "example-edit": "逐张检查例子",
  train: "重新学习",
  "compare-models": "比较学习版本",
  "album-save": "保存例子册",
  freeze: "固定测试版本",
  "test-known": "测试原问题",
  "test-heldout": "测试新材料",
  delivery: "交还失物",
  "archive-content": "记录声音内容",
  "archive-source": "记录声音来源",
  "archive-save": "保存声音档案",
  "rain-choice": "选择处理办法",
  "author-title": "修改委托名称",
  "author-question": "修改问题",
  "author-materials": "选择委托材料",
  "author-object": "选择照片对象",
  "author-cover": "设置遮挡",
  "author-light": "设置光线",
  "author-explanation": "修改核对说明",
  "author-save": "保存委托",
  "author-test": "测试我的委托",
};

export function renderWorkbench(
  container: HTMLElement,
  state: ForestState,
  activity: Activity,
  audio: AudioPlayer,
  actions: WorkbenchActions,
): () => void {
  const flow = flowFor(activity.id),
    revisiting = state.completed.includes(activity.id);
  const panel = el("section", "paper-panel workbench lesson-workbench");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "workbench-title");
  panel.dataset.activity = activity.id;
  const header = el("header", "lesson-header"),
    heading = el("div");
  const title = el("h2", "", activity.title);
  title.id = "workbench-title";
  heading.append(
    el(
      "p",
      "lesson-eyebrow",
      `委托${"一二三四五"[activity.mission - 1]} · ${MISSIONS[activity.mission - 1].title}`,
    ),
    title,
  );
  const close = button("", "close", actions.close, "icon-button lesson-close");
  close.replaceChildren(icon("close"));
  close.setAttribute("aria-label", "关闭，回到森林");
  header.append(heading, close);
  const coach = el("div", "lesson-coach"),
    face = el("img", "lesson-coach-face");
  face.src = assetUrl("ui/assistant/idle.png");
  face.alt = "森林小助手";
  const coachCopy = el("div", "lesson-coach-copy"),
    coachTitle = el("strong"),
    coachLine = el("p");
  coachCopy.append(coachTitle, coachLine);
  const feedback = el("p", "lesson-feedback");
  feedback.setAttribute("role", "status");
  feedback.hidden = true;
  const replay = button(
    "再读一遍",
    "lesson-replay",
    () => {
      if (!("speechSynthesis" in window) || state.preferences.muted) {
        showFeedback("文字会一直留在这里，可以按自己的速度阅读。");
        return;
      }
      speechSynthesis.cancel();
      const voice = new SpeechSynthesisUtterance(
        `${coachTitle.textContent}。${coachLine.textContent}`,
      );
      voice.lang = "zh-CN";
      voice.rate = 0.88;
      speechSynthesis.speak(voice);
    },
    "lesson-text-button",
  );
  coach.append(face, coachCopy, replay);
  let disposed = false,
    pending = false,
    mounted = false;
  const ctx = new TaskSession(state, activity, {
    changed: () => {
      if (mounted) schedule();
      actions.changed();
    },
    message: showFeedback,
  });
  const progress = ctx.progress;
  if (revisiting && (progress.phase === "intro" || progress.phase === "ready"))
    progress.phase = "explore";
  let index = Math.max(
    0,
    flow.steps.findIndex((step) => step.id === progress.stepId),
  );
  let freeUnit: LessonUnit = flow.steps.some((s) => s.unit === "capture")
    ? "capture"
    : flow.steps[0].unit;
  const tools = lessonTools(ctx, audio),
    content = el("main", "lesson-content"),
    special = el("div", "lesson-special");
  const freeControls = el("div", "lesson-free-controls"),
    freeSelect = el("select");
  freeSelect.setAttribute("aria-label", "这次想试什么");
  const guide = guideFor(activity.id);
  const units = [...new Set(flow.steps.map((s) => s.unit))];
  for (const control of units.includes("capture") ? (guide.camera?.controls ?? []) : [])
    if (!units.includes(control)) units.unshift(control);
  if (units.includes("capture")) units.push("photo-album");
  if (units.includes("listen")) {
    if ((guide.sounds?.length ?? 0) > 1 && !units.includes("sound-select"))
      units.push("sound-select");
    units.push("sound-variant");
  }
  if (units.includes("author-title")) units.push("author-light");
  if (units.includes("motion-scrub")) units.push("motion-select");
  if (units.includes("fuse")) units.push("fusion-select");
  if (units.includes("test-known") && !units.includes("test-heldout")) units.push("test-heldout");
  // The leaf slider and the shutter share one screen, so the menu no longer switches between them.
  const coverWithShutter = units.includes("cover") && units.includes("capture");
  for (const unit of units) {
    if (coverWithShutter && unit === "cover") continue;
    const option = el(
      "option",
      "",
      coverWithShutter && unit === "capture" ? "推开或挡住叶子，拍一张" : (UNIT_NAMES[unit] ?? unit),
    );
    option.value = unit;
    freeSelect.append(option);
  }
  freeSelect.value = freeUnit;
  freeSelect.onchange = () => {
    freeUnit = freeSelect.value as LessonUnit;
    feedback.hidden = true;
    render();
  };
  const review = button(
    "再看一遍引导",
    "lesson-review",
    () => enterGuided(0),
    "lesson-text-button",
  );
  freeControls.append(el("label", "", "这次想试什么"), freeSelect, review);
  content.append(freeControls, tools.root, special);
  const footer = el("footer", "lesson-footer"),
    back = button(
      "上一步",
      "lesson-back",
      () => {
        if (progress.phase === "guided" && index > 0) enterGuided(index - 1);
        else {
          progress.phase = "explore";
          save();
          render();
        }
      },
      "button lesson-back",
    );
  const stepStatus = el("span", "lesson-step-status"),
    next = button("一起试试", "lesson-next", advance, "button primary lesson-next");
  next.dataset.initialFocus = "true";
  const nudge = el("span", "lesson-action-note", "完成发光处的操作，再继续");
  footer.append(back, stepStatus, nudge, next);
  panel.append(header, coach, feedback, content, footer);
  container.replaceChildren(panel);
  function showFeedback(message: string) {
    feedback.textContent = message
      .replace(/看看右边[^。？]*[。？]?/g, "稍后一起核对。")
      .replace(/看右边/g, "看看实际结果");
    feedback.hidden = false;
  }
  function save() {
    ctx.savePresentation();
    actions.changed();
  }
  function schedule() {
    if (pending || disposed) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      if (!disposed) refresh();
    });
  }
  function snapshot() {
    return {
      state,
      id: activity.id,
      options: ctx.options,
      current: ctx.current,
      soundKind: ctx.soundKind,
      soundNoise: progress.soundNoise,
      question: ctx.question,
      sourceChecked: ctx.sourceChecked,
      fields: tools.fields(),
    };
  }
  function enterGuided(to: number) {
    index = Math.max(0, Math.min(flow.steps.length - 1, to));
    progress.phase = "guided";
    progress.stepId = flow.steps[index].id;
    feedback.hidden = true;
    save();
    render();
    requestAnimationFrame(() => tools.firstControl()?.focus({ preventScroll: true }));
  }
  function advance() {
    if (progress.phase === "intro") {
      enterGuided(index);
      return;
    }
    if (progress.phase === "guided") {
      if (!stepReady(flow.steps[index], snapshot())) {
        showFeedback("先完成这一处操作，我们再看下一步。");
        return;
      }
      if (index < flow.steps.length - 1) enterGuided(index + 1);
      else {
        progress.phase = "explore";
        feedback.hidden = true;
        save();
        render();
      }
      return;
    }
    if (progress.phase === "explore") {
      const missing = evidenceStatus(state, activity.id).missing.filter(
        (m) => m !== "想一想这次的发现" && !m.startsWith("用自己的话"),
      );
      if (missing.length && !revisiting) {
        showFeedback(`还有一处需要确认：${missing[0]}。可以从上面的菜单选择对应操作。`);
        return;
      }
      progress.phase = "check";
      feedback.hidden = true;
      save();
      render();
      return;
    }
    if (progress.phase === "check") {
      if (!state.evidence[activity.id].events.some((e) => e.action === "understand")) return;
      if (!activity.noteRequired) {
        complete();
        return;
      }
      progress.phase = "note";
      feedback.hidden = true;
      save();
      render();
      return;
    }
    if (progress.phase === "note") {
      if (state.evidence[activity.id].note.trim().length < 6) return;
      complete();
      return;
    }
    complete();
  }
  function complete() {
    const status = evidenceStatus(state, activity.id);
    if (!status.complete && !revisiting) {
      showFeedback(status.missing[0]);
      progress.phase = "explore";
      save();
      render();
      return;
    }
    progress.phase = "ready";
    save();
    actions.complete(activity.id);
  }
  function renderSpecial() {
    special.replaceChildren();
    if (progress.phase === "intro") {
      const picture = el("img", "lesson-intro-art"),
        art = wordArt(activity.id);
      if (art) picture.src = assetUrl(art);
      picture.alt = "这次一起探索的事情";
      special.append(
        picture,
        el("p", "lesson-intro-question", flow.question),
        el("p", "lesson-intro-note", "先跟着做一次，再自己试试。随时可以回到森林，进度会留下来。"),
      );
    } else if (progress.phase === "check") {
      special.append(el("p", "lesson-concept", conceptFor(activity.id)));
      const choices = el("div", "lesson-check-choices");
      flow.check.choices.forEach((choice, i) => {
        const control = button(
          choice,
          `knowledge-${i}`,
          () => {
            const result = answerKnowledge(state, activity.id, i);
            for (const item of choices.children) item.classList.remove("is-correct", "is-retry");
            control.classList.add(result.correct ? "is-correct" : "is-retry");
            control.setAttribute("aria-pressed", String(result.correct));
            showFeedback(`${result.correct ? "说清楚了。" : "再想一想。"}${result.explanation}`);
            ctx.changed();
          },
          "lesson-answer",
        );
        control.setAttribute("aria-pressed", "false");
        choices.append(control);
      });
      special.append(choices);
    } else if (progress.phase === "note") {
      const label = el("label", "lesson-reflection-label", "我的发现"),
        note = el("textarea", "reflection lesson-reflection");
      note.setAttribute("aria-label", "我的发现");
      note.maxLength = 500;
      note.rows = 4;
      note.placeholder = "我发现……　我这样判断，是因为……";
      note.value = state.evidence[activity.id].note;
      note.oninput = () => {
        state.evidence[activity.id].note = note.value;
        ctx.changed();
      };
      label.append(note);
      special.append(
        label,
        el("p", "lesson-intro-note", "写一句自己的发现，至少6个字。不需要照抄小助手的话。"),
      );
    } else if (progress.phase === "ready") {
      const badge = el("img", "lesson-earned-leaf");
      badge.src = assetUrl(`ui/badges/leaf-${activity.mission}.png`);
      badge.alt = "这一次的发现叶";
      special.append(
        badge,
        el("h3", "", guideFor(activity.id).word.term),
        el("p", "lesson-concept", activity.discovery),
      );
    }
  }
  function render() {
    const phase = progress.phase;
    panel.dataset.phase = phase;
    panel.classList.toggle("reduced-motion", state.preferences.reducedMotion);
    freeControls.hidden = phase !== "explore";
    tools.root.hidden = phase !== "guided" && phase !== "explore";
    special.hidden = !tools.root.hidden;
    if (phase === "guided") {
      const step = flow.steps[index];
      panel.dataset.step = step.id;
      coachTitle.textContent = step.title;
      coachLine.textContent = step.say;
      tools.show(step.unit);
    } else if (phase === "explore") {
      panel.dataset.step = "explore";
      coachTitle.textContent = revisiting ? "欢迎回来，继续你的探索" : "现在，换你自己试试";
      coachLine.textContent = flow.exploration;
      tools.show(freeUnit, coverWithShutter && freeUnit === "capture" ? ["cover"] : []);
    } else {
      panel.dataset.step = phase;
      coachTitle.textContent =
        phase === "intro"
          ? "这次，我们一起弄明白"
          : phase === "check"
            ? "想一想刚才的发现"
            : phase === "note"
              ? "用自己的话留下发现"
              : "这片发现叶，属于你";
      coachLine.textContent =
        phase === "intro"
          ? flow.opening
          : phase === "check"
            ? flow.check.question
            : phase === "note"
              ? "说清做了什么、发现了什么，以及还有哪里不确定。"
              : "操作、依据和记录都留下来了。把这份发现带回森林吧。";
      renderSpecial();
    }
    content.scrollTop = 0;
    refresh();
  }
  function refresh() {
    const phase = progress.phase;
    if (phase === "guided" || phase === "explore") tools.refresh();
    const ready =
      phase === "guided"
        ? stepReady(flow.steps[index], snapshot())
        : phase === "check"
          ? state.evidence[activity.id].events.some((e) => e.action === "understand")
          : phase === "note"
            ? state.evidence[activity.id].note.trim().length >= 6
            : true;
    next.hidden = !ready;
    nudge.hidden = ready || phase !== "guided";
    back.hidden = phase === "intro" || (phase === "guided" && index === 0);
    stepStatus.textContent =
      phase === "guided"
        ? `带做 · ${index + 1} / ${flow.steps.length}`
        : phase === "explore"
          ? "自主探索"
          : phase === "check"
            ? "回顾一个知识点"
            : phase === "note"
              ? "留下一句发现"
              : "";
    next.textContent =
      phase === "intro"
        ? "一起试试"
        : phase === "guided"
          ? index === flow.steps.length - 1
            ? "我来自己试试"
            : "继续探索"
          : phase === "explore"
            ? "整理我的发现"
            : phase === "check"
              ? "带上这个发现"
              : phase === "note"
                ? "写好了"
                : revisiting
                  ? "保存这次回访"
                  : "完成这一站";
    const finishing =
      phase === "ready" || phase === "note" || (phase === "check" && !activity.noteRequired);
    next.dataset.action = finishing ? "complete-activity" : "lesson-next";
    if (finishing) next.textContent = revisiting ? "保存这次回访" : "收下发现叶";
    next.classList.toggle("is-ready", ready);
    save();
  }
  panel.addEventListener("input", schedule);
  panel.addEventListener("change", schedule);
  panel.addEventListener("click", schedule);
  mounted = true;
  render();
  return () => {
    disposed = true;
    ctx.savePresentation();
    ctx.dispose();
    audio.stop();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  };
}
