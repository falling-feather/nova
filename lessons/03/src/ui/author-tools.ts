import { el, button } from "./tool-dom.ts";
import { chips, scale, kindThumb } from "./controls.ts";
import type { TaskSession } from "./task-context.ts";
import { hashText } from "./task-context.ts";
import { KNOWN_KINDS, KIND_NAMES } from "../media/types.ts";
import type { KnownKind, SoundKind } from "../media/types.ts";
import { drawSpecimen } from "../media/specimens.ts";
import { inspectAuthored } from "../media/authored.ts";

export function authorTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "author-station");
  const previous = ctx.progress.author;
  const title = el("input"),
    question = el("textarea"),
    explanation = el("textarea");
  title.setAttribute("aria-label", "委托名称");
  title.placeholder = "给委托取个名字，比如：谁在树下唱歌";
  title.maxLength = 36;
  title.value = previous?.title ?? "";
  question.setAttribute("aria-label", "我要问的问题");
  question.placeholder = "要访客回答什么？比如：照片里是什么东西？";
  question.maxLength = 180;
  question.value = previous?.question ?? "";
  explanation.setAttribute("aria-label", "给访客的核对说明");
  explanation.placeholder = "答案的依据在哪里？哪一步要人来检查？";
  explanation.maxLength = 320;
  explanation.value = previous?.explanation ?? "";
  const canvas = el("canvas", "author-canvas");
  canvas.width = canvas.height = 288;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "委托用的照片");
  const redraw = () => drawSpecimen(canvas, ctx.options);
  const selected = new Set(previous?.tools ?? ["image"]);
  let soundKind: SoundKind = previous.soundKind;
  function invalidate() {
    if (ctx.state.authored) ctx.state.authored.tested = false;
    ctx.progress.author = { title: title.value, question: question.value, explanation: explanation.value, tools: [...selected], soundKind };
    ctx.changed();
  }
  for (const input of [title, question, explanation])
    input.addEventListener("input", invalidate);
  const materials = el("div", "material-toggles");
  for (const [key, label] of [
    ["image", "照片"],
    ["sound", "声音"],
    ["text", "文字线索"],
  ] as const) {
    const toggle = el("button", "material-toggle", label);
    toggle.type = "button";
    toggle.dataset.material = key;
    toggle.setAttribute("aria-label", `委托使用${label}`);
    const paint = () => {
      toggle.classList.toggle("is-on", selected.has(key));
      toggle.setAttribute("aria-pressed", String(selected.has(key)));
    };
    toggle.addEventListener("click", () => {
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
      invalidate();
      paint();
    });
    paint();
    materials.append(toggle);
  }
  const field = (label: string, input: HTMLElement) => {
    const wrap = el("label", "author-field");
    wrap.append(el("span", "chip-title", label), input);
    return wrap;
  };
  const left = el("div", "author-fields");
  left.append(
    field("委托名称", title),
    field("我要问的问题", question),
    el("span", "chip-title", "要用到的材料"),
    materials,
    chips(
      "声音材料",
      [
        { value: "bell", label: "铃声" },
        { value: "water", label: "水流" },
        { value: "bird", label: "鸟鸣" },
        { value: "clock", label: "钟表" },
      ],
      soundKind,
      (v) => {
        soundKind = v as SoundKind;
        invalidate();
      },
      "sound-chips",
    ),
    field("给访客的核对说明", explanation),
  );
  const right = el("div", "author-preview");
  right.append(
    canvas,
    chips(
      "照片里放什么",
      KNOWN_KINDS.map((k) => ({ value: k, label: KIND_NAMES[k], image: kindThumb(k) })),
      ctx.options.kind,
      (v) => {
        ctx.options.kind = v as KnownKind;
        invalidate();
        redraw();
      },
      "kind-chips is-compact",
    ),
    scale({
      label: "给访客留多少遮挡",
      min: 0,
      max: 0.75,
      step: 0.05,
      value: ctx.options.occlusion,
      start: "不挡",
      end: "挡住",
      words: (v) => (v < 0.05 ? "不挡" : v < 0.4 ? "挡一点" : "挡一大半"),
      input: (v) => {
        ctx.options.occlusion = v;
        redraw();
      },
      commit: () => invalidate(),
    }),
    scale({
      label: "照片的光线",
      min: 0.3,
      max: 1.3,
      step: 0.05,
      value: ctx.options.light,
      start: "暗",
      end: "亮",
      words: (v) => (v < 0.6 ? "很暗" : v < 0.9 ? "有点暗" : v <= 1.1 ? "刚刚好" : "很亮"),
      input: (v) => {
        ctx.options.light = v;
        redraw();
      },
      commit: () => invalidate(),
    }),
  );
  function save(): boolean {
    if (
      title.value.trim().length < 2 ||
      question.value.trim().length < 5 ||
      explanation.value.trim().length < 6 ||
      selected.size === 0
    ) {
      ctx.say("还差一点：取个名字、写清问题和核对说明，再至少选一种材料。");
      return false;
    }
    ctx.state.authored = {
      title: title.value.trim(),
      question: question.value.trim(),
      explanation: explanation.value.trim(),
      kind: ctx.options.kind,
      options: { ...ctx.options },
      tools: [...selected],
      sound: selected.has("sound")
        ? { kind: soundKind, noise: 0.1, variant: 6 }
        : null,
      tested: false,
    };
    ctx.record("author", hashText(JSON.stringify(ctx.state.authored)));
    ctx.say("委托存好了。自己先试一次，看看问题、材料和说明对不对得上。");
    return true;
  }
  const actions = el("div", "tool-actions");
  actions.append(
    button("保存我的委托", "save-author", () => void save(), "button primary"),
    button("自己先试一次", "test-author", () => {
      if (!save()) return;
      const task = ctx.state.authored!;
      const output = inspectAuthored(task, ctx.model());
      task.tested = true;
      ctx.record(
        "playAuthored",
        hashText(
          JSON.stringify({
            question: task.question,
            options: task.options,
            tools: task.tools,
            result: output.result,
          }),
        ),
      );
      ctx.show(output);
      ctx.say("小助手试着答了你的委托，看右边。答不出、答错了，也是一道好题的一部分。");
    }),
  );
  const layout = el("div", "author-layout");
  layout.append(left, right);
  pane.append(layout, actions);
  redraw();
  return pane;
}
