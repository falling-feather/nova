import { el } from "./dom.ts";
import { meter } from "./controls.ts";
import type { TaskSession, AssistantOutput } from "./task-context.ts";
import { nameOf } from "./task-context.ts";
import { assetUrl } from "../asset-url.ts";
import { nearestExamples } from "../media/classifier.ts";
import { KNOWN_KINDS, SOUND_KINDS } from "../media/types.ts";
import type { Prediction } from "../media/types.ts";

const SOUND_WORDS: Record<string, string> = {
  bell: "风铃声",
  water: "流水声",
  bird: "鸟鸣",
  clock: "钟表声",
};
const soundName = (label: string) => SOUND_WORDS[label] ?? nameOf(label);

export function certaintyWord(value: number): string {
  if (value >= 0.75) return "很有把握";
  if (value >= 0.55) return "比较有把握";
  if (value >= 0.4) return "有一点把握";
  return "拿不准";
}
function likenessWord(value: number): string {
  if (value >= 0.8) return "非常像";
  if (value >= 0.6) return "很像";
  if (value >= 0.4) return "有点像";
  return "不太像";
}
function unknownReason(prediction: Prediction): string {
  if (!Number.isFinite(prediction.distance))
    return "照片里几乎找不到能用的线索。";
  if (prediction.distance > 0.42)
    return "它翻遍了例子册，没找到长得像的照片。";
  const ranked = KNOWN_KINDS.map((k) => prediction.scores[k]).sort(
    (a, b) => b - a,
  );
  if (ranked[0] - ranked[1] < 0.25) return "有两种东西它都觉得像，拿不定主意。";
  return "它的把握太低，不敢乱说。";
}

function bars(
  items: { label: string; score: number }[],
  best: string,
  limit = 3,
): HTMLElement {
  const list = el("ul", "guess-bars");
  list.setAttribute("aria-label", "每个候选的得分");
  for (const item of items
    .filter((i) => i.score > 0.005)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)) {
    const row = el("li", item.label === best ? "is-best" : "");
    row.append(
      el("span", "guess-name", item.label),
      meter(item.score),
      el("span", "guess-score", `${Math.round(item.score * 100)}`),
    );
    list.append(row);
  }
  return list;
}

function certainty(value: number): HTMLElement {
  const row = el("div", "certainty");
  row.append(
    el("span", "certainty-label", "把握"),
    meter(value, value >= 0.55 ? "is-sure" : value >= 0.4 ? "is-maybe" : "is-unsure"),
    el("span", "certainty-word", certaintyWord(value)),
  );
  return row;
}

function photo(src: string, caption: string, className = ""): HTMLElement {
  const figure = el("figure", `mini-photo ${className}`.trim());
  const img = el("img");
  img.src = src;
  img.alt = caption;
  figure.append(img, el("figcaption", "", caption));
  return figure;
}

/** Each object keeps its own colour in the vote strip, matching the toy itself. */
const KIND_COLORS: Record<string, string> = {
  car: "#d9806a",
  block: "#d3a06c",
  bell: "#d7b04a",
  radio: "#6f9f86",
  leaf: "#86ad5a",
  pinecone: "#987552",
  maple: "#cf7448",
  ginkgo: "#cdbb55",
};
/** One segmented strip: the three nearest photos vote, closer ones weigh more. */
function votes(prediction: Prediction): HTMLElement {
  const wrap = el("div", "vote-block");
  const ranked = KNOWN_KINDS.map((k) => ({ kind: k, score: prediction.scores[k] }))
    .filter((v) => v.score > 0.005)
    .sort((a, b) => b.score - a.score);
  const strip = el("div", "vote-strip");
  strip.setAttribute("role", "img");
  strip.setAttribute(
    "aria-label",
    `得票：${ranked.map((v) => `${nameOf(v.kind)}${Math.round(v.score * 100)}`).join("，")}`,
  );
  const legend = el("p", "vote-legend");
  for (const v of ranked) {
    const part = el("span", "vote-part");
    part.style.width = `${v.score * 100}%`;
    part.style.background = KIND_COLORS[v.kind];
    strip.append(part);
    const key = el("span", "vote-key");
    const dot = el("i");
    dot.style.background = KIND_COLORS[v.kind];
    key.append(dot, document.createTextNode(`${nameOf(v.kind)} ${Math.round(v.score * 100)}`));
    legend.append(key);
  }
  wrap.append(el("p", "why-title", "三张各投一票，越像的票越重："), strip, legend);
  return wrap;
}

function renderImage(
  body: HTMLElement,
  output: Extract<AssistantOutput, { kind: "image" }>,
): string {
  const { prediction } = output;
  const unknown = prediction.label === "unknown";
  const near = nearestExamples(output.features, output.model, 3);
  if (near.length) {
    const why = el("div", "why-block");
    why.append(el("p", "why-title", "它是怎么猜的：翻例子册，找出最像的三张"));
    const row = el("div", "why-row");
    for (const item of near)
      row.append(
        photo(
          item.example.image,
          `${nameOf(item.example.label)} · ${likenessWord(item.likeness)}`,
        ),
      );
    why.append(row, votes(prediction));
    body.append(why);
  }
  const sure = certainty(prediction.confidence);
  sure.title = "把握要看两件事：票是不是都投给了同一种东西，最像的那张又到底有多像。";
  body.append(sure);
  if (unknown) {
    body.append(el("p", "why-note", unknownReason(prediction)));
    return "嗯……这一张我说不准。";
  }
  return `我猜，这是「${nameOf(prediction.label)}」。`;
}

function renderText(
  body: HTMLElement,
  output: Extract<AssistantOutput, { kind: "text" }>,
): string {
  const note = el("p", "read-note");
  let rest = output.text;
  const words = [...output.analysis.keywords].sort((a, b) => b.length - a.length);
  while (rest.length) {
    let hit = -1,
      word = "";
    for (const w of words) {
      const at = rest.indexOf(w);
      if (at >= 0 && (hit < 0 || at < hit)) {
        hit = at;
        word = w;
      }
    }
    if (hit < 0) {
      note.append(document.createTextNode(rest));
      break;
    }
    note.append(document.createTextNode(rest.slice(0, hit)));
    const before = rest.slice(Math.max(0, hit - 4), hit);
    const negated = /不要|不是|别找|排除|不找/.test(before);
    note.append(el("mark", negated ? "is-crossed" : "", word));
    rest = rest.slice(hit + word.length);
  }
  body.append(el("p", "why-title", "它在文字里找到的关键词"), note);
  const chipsRow = el("div", "read-candidates");
  for (const kind of output.analysis.candidates)
    chipsRow.append(el("span", "pill success", nameOf(kind)));
  if (chipsRow.childElementCount) body.append(chipsRow);
  if (note.querySelector(".is-crossed"))
    body.append(el("p", "why-note", "划掉的词前面有“不要”，所以被排除了。"));
  else if (!output.analysis.keywords.length)
    body.append(el("p", "why-note", "它只认识词表里的名字，这句话里一个也没找到。"));
  return output.analysis.candidates.length
    ? `这段文字要找的是「${output.analysis.candidates.map(nameOf).join("、")}」。`
    : "我没读到认识的东西名字。";
}

function renderSound(
  body: HTMLElement,
  output: Extract<AssistantOutput, { kind: "sound" }>,
): string {
  const p = output.prediction;
  body.append(
    certainty(p.confidence),
    bars(
      SOUND_KINDS.map((k) => ({ label: soundName(k), score: p.scores[k] })),
      p.label === "unknown" ? "" : soundName(p.label),
      4,
    ),
    el("p", "why-note", "它比较的是声音的高低和一下一下的节奏，不是在“听懂”话。"),
  );
  return p.label === "unknown"
    ? "太吵了，我听不清是什么声音。"
    : `我听着像「${soundName(p.label)}」。`;
}

function renderFusion(
  body: HTMLElement,
  output: Extract<AssistantOutput, { kind: "fusion" }>,
): string {
  const { result, question } = output;
  const best = result.candidates[0];
  const name = (label: string) =>
    question === "sound" ? soundName(label) : nameOf(label);
  if (result.candidates.length)
    body.append(
      bars(
        result.candidates.map((c) => ({ label: name(c.label), score: c.score })),
        name(best.label),
      ),
    );
  if (result.conflict)
    body.append(el("p", "why-warn", "这些线索说法不一样，或者还没确认是不是一对。"));
  body.append(el("p", "why-note", result.explanation));
  return best
    ? `${question === "sound" ? "问声音" : "问东西"}的话，我选「${name(best.label)}」。`
    : "这些线索不够回答这个问题。";
}

function renderMotion(
  body: HTMLElement,
  output: Extract<AssistantOutput, { kind: "motion" }>,
): string {
  const words = {
    left: "向左开",
    right: "向右开",
    still: "停在原地",
    unknown: "看不出来",
  } as const;
  const arrow = el("div", `motion-arrow is-${output.result.direction}`);
  arrow.append(el("span", "", output.result.direction === "left" ? "←" : output.result.direction === "right" ? "→" : output.result.direction === "still" ? "•" : "?"));
  body.append(
    arrow,
    el(
      "p",
      "why-note",
      output.frames < 2
        ? "只看了一张画面，比不出前后。"
        : `它比较了你看过的 ${output.frames} 张画面里，小车的位置怎么变。`,
    ),
  );
  return output.result.direction === "unknown"
    ? "画面太少，我看不出它往哪儿走。"
    : `我看出来了：小车${words[output.result.direction]}。`;
}

function renderCompare(
  body: HTMLElement,
  output: Extract<AssistantOutput, { kind: "compare" }>,
): string {
  const row = el("div", "compare-row");
  for (const [shot, tag] of [
    [output.before, "上一张"],
    [output.after, "这一张"],
  ] as const)
    row.append(
      photo(
        shot.image,
        `${tag}：${nameOf(shot.prediction.label)} · ${certaintyWord(shot.prediction.confidence)}`,
      ),
    );
  body.append(row);
  const same = output.before.prediction.label === output.after.prediction.label;
  return same
    ? "两张我都这么猜。条件变了，我的答案没变。"
    : "条件一变，我的答案也变了！";
}

function renderVersions(
  body: HTMLElement,
  output: Extract<AssistantOutput, { kind: "versions" }>,
): string {
  const row = el("div", "compare-row");
  row.append(
    photo(output.image, `第 ${output.beforeVersion} 版：${nameOf(output.before.label)}`),
    photo(output.image, `第 ${output.afterVersion} 版：${nameOf(output.after.label)}`),
  );
  body.append(row);
  return output.before.label === output.after.label
    ? "重新学了之后，这张我还是这么认。"
    : "重新学了之后，我对这张的看法变了。";
}

function renderTest(
  body: HTMLElement,
  output: Extract<AssistantOutput, { kind: "test" }>,
): string {
  const r = output.result;
  const right = r.expected === r.predicted;
  const row = el("div", "test-card");
  row.append(
    photo(r.image, r.heldout ? "我没见过的新照片" : "老问题照片"),
    el(
      "p",
      right ? "test-verdict is-right" : "test-verdict is-wrong",
      `答案：${nameOf(r.expected)}\n我答：${nameOf(r.predicted)}\n${right ? "答对了" : "答错了"}`,
    ),
  );
  body.append(row);
  return right ? "这一题我答对了！" : "这一题我答错了，记下来，看看哪里没学好。";
}

/** The assistant's voice: only its own guesses appear here, never the answer key. */
export function assistantCard(ctx: TaskSession, compact = false): HTMLElement {
  const card = el("section", "assistant-card");
  card.setAttribute("aria-live", "polite");
  const head = el("header", "assistant-head");
  const face = el("img", "assistant-face");
  face.alt = "";
  const setFace = (mood: AssistantMood) => {
    const src = assetUrl(`ui/assistant/${mood}.png`);
    if (face.getAttribute("src") !== src) face.src = src;
    face.dataset.mood = mood;
  };
  setFace("idle");
  for (const mood of ["sure", "unsure", "right", "wrong"] as const)
    new Image().src = assetUrl(`ui/assistant/${mood}.png`);
  const titles = el("div", "assistant-titles");
  titles.append(
    el("span", "assistant-name", "小助手的判断"),
    el("span", "assistant-tag", "它会猜错，要你来核对"),
  );
  const bubble = el("p", "assistant-bubble");
  head.append(face, titles);
  const body = el("div", "assistant-body");
  const details = el("details", "assistant-detail");
  details.append(el("summary", "", "想知道它参考了什么？"), body);
  card.append(head, bubble, compact ? details : body);
  let shown: AssistantOutput | null | undefined;
  function render() {
    if (ctx.output === shown) return;
    shown = ctx.output;
    body.replaceChildren();
    card.classList.remove("is-thinking");
    void card.offsetWidth;
    card.classList.add("is-thinking");
    const output = ctx.output;
    details.open = Boolean(output && ["compare", "versions", "test"].includes(output.kind));
    setFace(moodFor(output));
    if (!output) {
      bubble.textContent = idleLine(ctx);
      card.classList.add("is-idle");
      return;
    }
    card.classList.remove("is-idle");
    const say =
      output.kind === "image"
        ? renderImage(body, output)
        : output.kind === "text"
          ? renderText(body, output)
          : output.kind === "sound"
            ? renderSound(body, output)
            : output.kind === "fusion"
              ? renderFusion(body, output)
              : output.kind === "motion"
                ? renderMotion(body, output)
                : output.kind === "compare"
                  ? renderCompare(body, output)
                  : output.kind === "versions"
                    ? renderVersions(body, output)
                    : renderTest(body, output);
    bubble.textContent = say;
  }
  ctx.listeners.add(render);
  render();
  return card;
}

type AssistantMood = "idle" | "sure" | "unsure" | "right" | "wrong";
/** The face follows the assistant's real state: its own certainty, or a checked
 * test result. "right" and "wrong" appear only when an answer key was compared. */
function moodFor(output: AssistantOutput | null): AssistantMood {
  if (!output) return "idle";
  switch (output.kind) {
    case "image":
    case "sound": {
      const { label, confidence } = output.prediction;
      if (label === "unknown" || confidence < 0.4) return "unsure";
      return confidence >= 0.55 ? "sure" : "idle";
    }
    case "text":
      return output.analysis.candidates.length ? "sure" : "unsure";
    case "motion":
      return output.result.direction === "unknown" ? "unsure" : "sure";
    case "fusion":
      return output.result.conflict || !output.result.candidates.length ? "unsure" : "sure";
    case "test":
      return output.result.expected === output.result.predicted ? "right" : "wrong";
    default:
      return "idle";
  }
}

function idleLine(ctx: TaskSession): string {
  const kind = ctx.activity.kind;
  if (["fusion", "conflict", "delivery", "rain"].includes(kind) && ctx.current && !ctx.sound)
    return "照片已经备好了，请先让我听这份录音，再把线索合起来。";
  if (["sound", "noise", "soundarchive"].includes(kind))
    return "放一段声音给我听，我来猜猜是什么。";
  if (kind === "message") return "把字条交给我，我来读一读。";
  if (kind === "motion") return "让我看看这段短片，我来说说小车往哪儿开。";
  if (kind === "sorting" || kind === "attributes")
    return "这一项由你来整理，我在旁边看着学。";
  if (kind === "author") return "出好题以后，让我来试着答一答。";
  if (["repair", "bias", "evaluate"].includes(kind))
    return "帮我修好例子册，再出题考考我。";
  return "拍一张照片给我看，我来猜猜是什么。";
}

/** A checked fact card, visually distinct from the assistant's guesses. */
export function referenceCard(ctx: TaskSession): HTMLElement {
  const card = el("section", "reference-card");
  card.hidden = true;
  let shown: unknown;
  function render() {
    if (ctx.reference === shown) return;
    shown = ctx.reference;
    const ref = ctx.reference;
    card.hidden = !ref;
    if (!ref) return;
    card.replaceChildren();
    const head = el("header", "reference-head");
    const fold = el("button", "reference-close", "×");
    fold.type = "button";
    fold.setAttribute("aria-label", "收起资料卡");
    fold.addEventListener("click", () => {
      card.hidden = true;
    });
    head.append(el("span", "reference-stamp", "资料卡"), el("strong", "", ref.title), fold);
    card.append(head);
    const row = el("div", "reference-row");
    if (ref.image) {
      const img = el("img");
      img.src = ref.image;
      img.alt = ref.title;
      row.append(img);
    }
    const text = el("div", "reference-text");
    for (const line of ref.lines) text.append(el("p", "", line));
    row.append(text);
    card.append(row);
    card.classList.remove("is-flipped");
    void card.offsetWidth;
    card.classList.add("is-flipped");
    // The card opens below the picture; bring it into view so it is noticed.
    requestAnimationFrame(() => {
      if (card.isConnected && !card.hidden)
        card.scrollIntoView({ block: "nearest", behavior: card.closest(".reduced-motion") ? "auto" : "smooth" });
    });
  }
  ctx.listeners.add(render);
  render();
  return card;
}
