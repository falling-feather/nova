import { el, button } from "./tool-dom.ts";
import { chips, kindThumb } from "./controls.ts";
import type { TaskSession } from "./task-context.ts";
import { nameOf } from "./task-context.ts";
import { KIND_NAMES, KNOWN_KINDS } from "../media/types.ts";
import type { KnownKind } from "../media/types.ts";
import { OBJECT_FACTS } from "../content/lesson-guides.ts";
import { assetUrl } from "../asset-url.ts";

/** The child's own, checked label — shown right under the assistant's guess so
 * the two sources of a "name" can be compared side by side. */
export function labelCard(ctx: TaskSession, allowExample = false): HTMLElement {
  const card = el("section", "label-card");
  const head = el("header", "label-head");
  const me = el("img", "label-face");
  me.alt = "";
  const setMe = (mood: "checking" | "sure" | "unsure") => {
    const src = assetUrl(`ui/child/${mood}.png`);
    if (me.getAttribute("src") !== src) me.src = src;
  };
  setMe("checking");
  const titles = el("div", "label-titles");
  titles.append(el("span", "label-stamp", "我的核对"), el("span", "label-sub", "有依据的名字，由你来贴"));
  head.append(me, titles);
  const status = el("p", "label-status");
  const kinds = ctx.guide.camera?.kinds ?? [...KNOWN_KINDS];
  let label: KnownKind | "unknown" | "" = ctx.current?.confirmedLabel ?? "";
  const picker = chips(
    "这张照片是",
    [
      ...kinds.map((k) => ({ value: k, label: KIND_NAMES[k] })),
      { value: "unknown", label: "？先留问号" },
    ],
    label,
    (v) => {
      label = v as typeof label;
    },
    "label-chips",
  );
  const actions = el("div", "tool-actions");
  actions.append(
    button(
      "贴上标签",
      "confirm-label",
      () => {
        if (!label) {
          ctx.say("先从上面选一个名字。");
          return;
        }
        ctx.confirmLabel(label);
      },
      "button primary",
    ),
    button("查一查依据", "label-source", () => {
      if (!ctx.current) {
        ctx.say("先拍一张照片。");
        return;
      }
      ctx.record("sourceCheck", ctx.current.source);
      ctx.sourceChecked = true;
      const kind = ctx.current.options.kind;
      ctx.showReference({
        title: KIND_NAMES[kind],
        image: kindThumb(kind),
        lines: [OBJECT_FACTS[kind], "这是拍照时观察台上放着的东西。"],
      });
    }),
  );
  if (allowExample)
    actions.append(
      button("放进例子册", "add-example", () => {
        ctx.appendExample();
      }),
    );
  if (ctx.activity.kind === "correct")
    actions.append(
      button("看看学习版本", "model-check", () => {
        const version = ctx.model().version;
        ctx.record("modelCheck", String(version));
        ctx.showReference({
          title: `小助手还是第 ${version} 版`,
          lines: [
            "你改的是这一张照片的记录。",
            "例子册没动，小助手也没有重新学，所以它还是原来的样子。",
          ],
        });
      }),
    );
  function paint() {
    const shot = ctx.current;
    setMe(
      !shot?.confirmedLabel
        ? "checking"
        : shot.confirmedLabel === "unknown"
          ? "unsure"
          : "sure",
    );
    if (!shot) {
      status.textContent = "还没有照片。拍一张，再来贴标签。";
      return;
    }
    const guess = nameOf(shot.prediction.label);
    status.replaceChildren(
      el("span", "label-pair is-ai", `小助手猜：${guess}`),
      el(
        "span",
        `label-pair ${shot.confirmedLabel ? "is-mine" : "is-empty"}`,
        shot.confirmedLabel ? `我贴的：${nameOf(shot.confirmedLabel)}` : "我贴的：还没贴",
      ),
    );
  }
  ctx.listeners.add(paint);
  paint();
  card.append(head, status, picker, actions);
  return card;
}

// Pairs share a colour but not a use, so the two sortings visibly regroup them.
const SORT_ITEMS = [
  { kind: "car" as KnownKind, color: "红色", use: "玩具" },
  { kind: "maple" as KnownKind, color: "红色", use: "自然观察" },
  { kind: "bell" as KnownKind, color: "黄色", use: "会响的东西" },
  { kind: "ginkgo" as KnownKind, color: "黄色", use: "自然观察" },
  { kind: "radio" as KnownKind, color: "绿色", use: "会响的东西" },
  { kind: "leaf" as KnownKind, color: "绿色", use: "自然观察" },
];
// Where each painted crate's blank plate sits, as % of the 4:3 picture.
const CRATES = [
  { art: "light", x: 40.2, y: 58.9, w: 30 },
  { art: "dark", x: 40.6, y: 60.8, w: 34 },
  { art: "white", x: 43.2, y: 60.2, w: 30 },
] as const;
const BINS = {
  color: ["红色", "黄色", "绿色"],
  use: ["玩具", "会响的东西", "自然观察"],
} as const;
export function sortingTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "sorting-station"),
    cards = el("div", "sorting-cards"),
    bins = el("div", "sorting-bins");
  let mode: "color" | "use" = "color",
    selected: KnownKind | null = null;
  const placed = new Map<string, string>();
  for (const e of ctx.state.evidence[ctx.activity.id]?.events ?? []) {
    const item = SORT_ITEMS.find((i) => i.kind === e.value);
    if (!item) continue;
    if (e.action === "sortColor") placed.set(`color:${item.kind}`, item.color);
    if (e.action === "sortUse") placed.set(`use:${item.kind}`, item.use);
  }
  function place(category: string) {
    const item = SORT_ITEMS.find((i) => i.kind === selected);
    if (!item) {
      ctx.say("先点一件东西，再点它要去的盒子；也可以直接拖过去。");
      return;
    }
    if (placed.has(`${mode}:${item.kind}`)) {
      ctx.say(`${nameOf(item.kind)}已经放好了，挑一件还没放的。`);
      return;
    }
    if (item[mode] !== category) {
      ctx.say(
        `现在是按${mode === "color" ? "颜色" : "用途"}分。再看看${nameOf(item.kind)}是什么${mode === "color" ? "颜色" : "用途"}？`,
      );
      return;
    }
    placed.set(`${mode}:${item.kind}`, category);
    ctx.record(mode === "color" ? "sortColor" : "sortUse", item.kind);
    selected = null;
    const rest = SORT_ITEMS.filter((i) => !placed.has(`${mode}:${i.kind}`));
    const other = mode === "color" ? "use" : "color";
    const otherDone = SORT_ITEMS.every((i) => placed.has(`${other}:${i.kind}`));
    ctx.say(
      rest.length
        ? `${nameOf(item.kind)}放进了「${category}」。还有 ${rest.length} 件。`
        : !otherDone
          ? mode === "color"
            ? "按颜色分好了！现在换成“按用途分”，看看同样六件东西会怎么分。"
            : "按用途分好了！再换成“按颜色分”试试。"
          : "两种都分好了。按颜色分时，枫叶和小车在一组；按用途分时，它们就分开了。分组要看这次的任务是什么。",
    );
    render();
  }
  function render() {
    cards.replaceChildren();
    bins.replaceChildren();
    for (const item of SORT_ITEMS) {
      const where = placed.get(`${mode}:${item.kind}`);
      const node = button(
        "",
        `sort-item-${item.kind}`,
        () => {
          selected = item.kind;
          render();
        },
        "sorting-card",
      );
      node.replaceChildren();
      node.draggable = true;
      node.setAttribute("aria-label", `选择${nameOf(item.kind)}`);
      node.classList.toggle("selected", selected === item.kind);
      node.classList.toggle("is-placed", !!where);
      const img = el("img");
      img.src = kindThumb(item.kind);
      img.alt = "";
      node.append(
        img,
        el("span", "", nameOf(item.kind)),
        el("small", "", where ? `在「${where}」里` : "还没放好"),
      );
      node.ondragstart = (e) => {
        selected = item.kind;
        e.dataTransfer?.setData("text/plain", item.kind);
      };
      cards.append(node);
    }
    BINS[mode].forEach((category, index) => {
      const node = button(category, `bin-${category}`, () => place(category), "sorting-bin");
      const crate = CRATES[index];
      node.replaceChildren();
      node.style.backgroundImage = `url("${assetUrl(`ui/sorting-crate-${crate.art}.png`)}")`;
      node.style.setProperty("--plate-x", `${crate.x}%`);
      node.style.setProperty("--plate-y", `${crate.y}%`);
      node.style.setProperty("--plate-w", `${crate.w}%`);
      // Long names shrink so they stay on the plate.
      node.style.setProperty(
        "--label-size",
        `${Math.min(8, (crate.w * 0.88) / category.length).toFixed(2)}cqw`,
      );
      const items = el("span", "bin-items");
      const inside = SORT_ITEMS.filter((i) => placed.get(`${mode}:${i.kind}`) === category);
      for (const item of inside) {
        const img = el("img", "bin-item");
        img.src = assetUrl(`specimens/${item.kind}-1.png`);
        img.alt = "";
        items.append(img);
      }
      node.setAttribute(
        "aria-label",
        inside.length
          ? `放进「${category}」，里面有${inside.map((i) => nameOf(i.kind)).join("、")}`
          : `放进「${category}」`,
      );
      node.append(items, el("span", "bin-label", category));
      node.ondragover = (e) => e.preventDefault();
      node.ondrop = (e) => {
        e.preventDefault();
        place(category);
      };
      bins.append(node);
    });
  }
  const modes = chips(
    "这次怎么分",
    [
      { value: "color", label: "按颜色分" },
      { value: "use", label: "按用途分" },
    ],
    mode,
    (v) => {
      mode = v as typeof mode;
      selected = null;
      render();
    },
    "mode-chips",
  );
  pane.append(modes, cards, el("p", "station-lead", "放进这几个盒子："), bins);
  render();
  return pane;
}

export function attributesTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "attribute-station");
  const photo = el("img", "attribute-photo");
  photo.src = kindThumb("car");
  photo.alt = "红色木头小车";
  const fields = el("div", "attribute-fields");
  for (const [dimension, correct, values] of [
    ["名字", "小车", ["小车", "积木", "播放器"]],
    ["颜色", "红色", ["红色", "蓝色", "绿色"]],
    ["材料", "木头", ["木头", "金属", "看不出来"]],
  ] as const) {
    fields.append(
      chips(
        `${dimension}标签`,
        values.map((v) => ({ value: v, label: v })),
        "",
        (v) => {
          if (v === correct) {
            ctx.record("attribute", `${dimension}:${v}`);
            ctx.say(
              dimension === "材料"
                ? "材料光看照片其实看不出来——你是从资料里知道它是木头的，这很重要。"
                : `「${dimension}：${v}」贴好了。这个从照片上就看得出来。`,
            );
          } else
            ctx.say(
              dimension === "材料"
                ? "材料从照片上不一定看得出，翻开资料卡查一查。"
                : "再看看照片，这张标签好像对不上。",
            );
        },
        "attribute-chips",
      ),
    );
  }
  const source = button("翻开资料卡", "attribute-source", () => {
    ctx.record("sourceCheck", "红色木制小车的制作说明");
    ctx.showReference({
      title: "小车的制作说明",
      image: kindThumb("car"),
      lines: [
        "名字：小车。颜色：红色。",
        "材料：木头——这一条是制作的人写下的，照片上看不出来。",
      ],
    });
  });
  const left = el("div", "attribute-left");
  left.append(photo, source);
  const layout = el("div", "attribute-layout");
  layout.append(left, fields);
  pane.append(layout);
  return pane;
}

export function unknownTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "unknown-station");
  let reason = "";
  pane.append(
    el("p", "station-lead", "说清楚：为什么现在还不能确定？"),
    chips(
      "我还不确定，因为",
      [
        { value: "两份便签的名字互相矛盾", label: "两张便签说法不一样" },
        { value: "图片看不清，需要补拍", label: "照片还不够清楚" },
        { value: "现有类别没有覆盖这个来件", label: "图鉴里没有这一类" },
      ],
      "",
      (v) => {
        reason = v;
      },
      "reason-chips",
    ),
    button(
      "带着问号放进问号夹",
      "save-unknown",
      () => {
        if (!reason || !ctx.current) {
          ctx.say("先拍一张照片，再选一个你不确定的原因。");
          return;
        }
        ctx.confirmLabel("unknown");
        ctx.record("unknown", `${ctx.current.id}:${reason}`);
        ctx.say(`放进问号夹了，理由是：${reason}。之后可以补拍、问寄件人或者查资料。`);
      },
      "button primary",
    ),
  );
  return pane;
}

export function deliveryTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "delivery-station");
  let chosen = "";
  const quote = el("blockquote", "visitor-quote", "“我丢的是一件摇起来会响的小玩具。请把你核对过的那件交给我。”");
  pane.append(
    quote,
    chips(
      "失物袋里有这些，交还哪一件？",
      (["car", "block", "bell", "radio"] as KnownKind[]).map((k) => ({
        value: k,
        label: KIND_NAMES[k],
        image: kindThumb(k),
      })),
      "",
      (v) => {
        chosen = v;
      },
      "kind-chips",
    ),
    button(
      "交还，并说明依据",
      "deliver",
      () => {
        if (!chosen) {
          ctx.say("先从失物袋里选一件。");
          return;
        }
        if (chosen !== ctx.activity.subject) {
          ctx.say("这件和访客说的对不上。可以再听一听、再看看照片，不用着急交还。");
          return;
        }
        if (!ctx.current || !ctx.sound || !ctx.sourceChecked) {
          ctx.say("还差证据：要有照片、小助手听过的录音，并确认它们说的是同一件东西。");
          return;
        }
        ctx.record("deliver", chosen);
        ctx.record("verify", "失物主人的资料");
        ctx.say("访客收到了铃铛，开心地摇了摇！照片、声音和合起来的判断都留在委托档案里了。");
      },
      "button primary",
    ),
  );
  return pane;
}

export function archiveSoundTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "archive-station");
  let content = ctx.progress.archive.content,
    source = ctx.progress.archive.source;
  const list = el("ul", "archive-list");
  const draft = el("p", "archive-draft");
  const paintDraft = () => { draft.textContent = `声音内容：${content ? nameOf(content) : "还没选"}　·　来源：${source || "还没选"}`; };
  function paintList() {
    list.replaceChildren();
    const saved = ctx.state.sounds.filter(
      (s) => s.activityId === ctx.activity.id && s.sourceNote.startsWith("内容："),
    );
    for (const s of saved) list.append(el("li", "", s.sourceNote.replace("；已人工核对", "")));
    if (!saved.length) list.append(el("li", "is-empty", "还没有写好的档案。"));
  }
  pane.append(
    el("p", "station-lead", "先在“听一听”里放一段录音，再回来写档案。"),
    chips(
      "听到的是",
      ["bell", "water", "bird", "clock"].map((v) => ({ value: v, label: nameOf(v) })),
      content,
      (v) => {
        content = v;
        ctx.progress.archive.content = v; ctx.changed();
        paintDraft();
      },
      "archive-chips",
    ),
    chips(
      "声音从哪里来",
      [
        { value: "播放器", label: "播放器放的录音" },
        { value: "风铃", label: "现场的风铃" },
        { value: "溪水", label: "现场的溪水" },
        { value: "钟表", label: "钟表" },
      ],
      source,
      (v) => {
        source = v;
        ctx.progress.archive.source = v; ctx.changed();
        paintDraft();
      },
      "archive-chips",
    ),
    button(
      "存好这条档案",
      "archive-sound",
      () => {
        const record = ctx.state.sounds.find((s) => s.id === ctx.lastSoundId);
        if (!record || !content || !source) {
          ctx.say("先放一段录音，再选好“听到什么”和“从哪里来”。");
          return;
        }
        const actualSource: Record<string, string> = {
          bird: "播放器",
          bell: "风铃",
          water: "溪水",
          clock: "钟表",
        };
        if (content !== record.kind || source !== actualSource[record.kind]) {
          ctx.say("档案和资料对不上。分开想：听到的是什么？又是从哪里放出来的？");
          return;
        }
        record.sourceNote = `内容：${nameOf(content)}；来源：${source}；已人工核对`;
        ctx.record("archive", `${record.kind}:${record.variant}:${record.noise}`);
        ctx.record("sourceCheck", record.id);
        ctx.say("档案存好了。你改的是档案记录，声音识别工具并没有因此重新学。");
        paintList();
      },
      "button primary",
    ),
    draft,
    el("p", "chip-title", "已经存好的档案"),
    list,
  );
  paintList();
  paintDraft();
  return pane;
}

export function rainDecisionTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "rain-station");
  let decision = "";
  pane.append(
    el("p", "station-lead", "试过一些办法以后，决定怎么处理这份委托："),
    chips(
      "我的决定",
      [
        { value: "补拍并核对后再处理", label: "补拍清楚，核对后再处理" },
        { value: "结合图片和声音继续核对", label: "再补一种线索，合起来看" },
        { value: "保留未知并请求补充材料", label: "先留问号，请人补充资料" },
      ],
      "",
      (v) => {
        decision = v;
      },
      "plan-chips",
    ),
    button(
      "定下这个办法",
      "rain-decision",
      () => {
        if (!decision) {
          ctx.say("先选一个办法。");
          return;
        }
        ctx.record("decision", decision);
        ctx.say("决定好了。在右下角写一句：你为什么这样选？");
      },
      "button primary",
    ),
  );
  return pane;
}
