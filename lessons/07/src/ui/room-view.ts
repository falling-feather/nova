import type { Course } from "../course/course.ts";
import { PRONOUNS, INSERTS, PAIRS, HEAD_LABELS, FOUNDRY1_NEXT } from "../course/course.ts";
import {
  PEOPLE,
  CELLS,
  type Foundry2,
  type Foundry4,
  type Foundry5,
  type Gallery8,
  type Press23,
  type Council15,
  type ExperimentEvidence,
} from "../course/records.ts";
import { ANNIVERSARY_FACTS } from "../content/lessons.ts";
import { canPublish, publicationConflicts } from "../core/publication.ts";
import { authors } from "../core/authors.ts";
import { newsClaims } from "../core/news.ts";
import { cosine, softmax } from "../model/transformer.ts";
import { repeats } from "../model/generate.ts";
import { SPECIAL } from "../model/tokenizer.ts";
import { probabilityLabel } from "../core/probability.ts";
import { typeCaseReading } from "../course/observations.ts";
import { contextDock, contextSurface } from "./context-exhibit.ts";
import {
  button as b,
  segmented as seg,
  select,
  escape as e,
  icon,
} from "./dom.ts";
export const TITLES: Record<string, string> = {
  "01": "一句话，怎样变成活字？",
  "02": "哪两块，总挨在一起？",
  "03": "这个名字，字字认识吗？",
  "04": "字架越大，就越好吗？",
  "05": "给特刊，挑一副字架。",
  "06": "翻开一块活字的背面。",
  "07": "一个词，和谁更像？",
  "08": "你觉得，它该站在哪？",
  "09": "相似的名牌，从哪来？",
  "10": "一个「苹果」，两种用法。",
  "11": "一句话，开了一场会。",
  "12": "给「苹果」换个上下文。",
  "13": "这句话里的代词，指向谁？",
  "14": "多一句话，会改变什么？",
  "15": "同一场会，不同的观察。",
  "16": "先写一张提问牌。",
  "17": "一格一格，把分数算出来。",
  "18": "100颗糖，怎样分？",
  "19": "把听见的话，混合起来。",
  "20": "没有座位，还分得清吗？",
  "21": "下一块，想印什么？",
  "22": "还没写下的字，能看见吗？",
  "23": "换个胆量，会写成怎样？",
  "24": "写得流畅，就是真实的吗？",
  "25": "让这一版，值得被读到。",
};
export const BRIEFS: Record<string, string> = {
  "01": "写一句话，看看三种拆法。活字可以拿起、重新排。",
  "02": "先猜一对最常相邻的字，再亲手把它们铸成一块。",
  "03": "把一个常用词和一个生僻名字放上桌，比较用了几块。",
  "04": "拖动字架滑块，观察同一句话要用多少块。",
  "05": "用同一段特刊文字，比较三副字架的取舍。",
  "06": "选一块活字，看看模型记录的那串数字。",
  "07": "选两个词，看看地图上的距离与真正的相似度。",
  "08": "把新活字放到你预测的位置，再和模型比一比。",
  "09": "换一对词，比较它们的用法和数字名牌。",
  "10": "同一个「苹果」，只看初始名牌能确定意思吗？",
  "11": "点选一块活字，看它怎样分配这一轮的注意力。",
  "12": "先留住原句，再换个线索，观察同一个词怎样变化。",
  "13": "移动、删除或替换一句话里的线索，再看代词的变化。",
  "14": "保留原句，再插入一段话，比较真实的计算结果。",
  "15": "换一位记录员，看看同一句话的不同观察。",
  "16": "改一格数字，看看提问牌和名片怎样对应。",
  "17": "先猜谁的分数大，再算一遍对应相乘、相加。",
  "18": "调整放大镜，观察100颗糖怎样重新分配。",
  "19": "按刚才的比例，混合四个人的发言。",
  "20": "移动下排字牌，比较有、无座位号的结果。",
  "21": "拿起一块候选字，拖到上方，让句子接着写。",
  "22": "再印下一块，看看它能看见前面的哪些词。",
  "23": "开头和种子保持相同，比较三种温度的续写。",
  "24": "拿着安排表核对稿件，亲自判断哪些说法可靠。",
  "25": "写下标题和开头，和字字一起编辑、核对、出版。",
};
const short = (text: string, n = 18) =>
  text.length > n ? text.slice(0, n) + "…" : text;
const pct = probabilityLabel;
export function experimentMarkup(
  record: ExperimentEvidence | null | undefined,
): string {
  if (!record)
    return '<p class="fineprint">完成两次实际操作后，这里会保留你的A/B输入和读数。</p>';
  return `<section class="experiment-evidence"><p><b>改动变量：</b>${e(record.variable)}<br><b>固定条件：</b>${e(record.fixed)}</p><div class="evidence-pair"><section><h3>A · 实际记录</h3><p>${e(record.before)}</p></section><section><h3>B · 实际记录</h3><p>${e(record.after)}</p></section></div></section>`;
}
const input = (field: string, value: string, placeholder: string, max = 40) =>
  `<input data-field="${field}" maxlength="${max}" value="${e(value)}" placeholder="${e(placeholder)}" autocomplete="off">`;
export function surface(c: Course): string {
  if (c.hub) return "";
  if (["01", "03", "04", "05"].includes(c.id)) {
    const sentence =
      c.id === "05" ? "晨风中学的合唱团在礼堂表演了歌曲。" : c.sentence;
    return `<div class="sentence-ribbon">${c.id === "05" ? `<span>${sentence}</span>` : input("sentence", sentence, c.id === "03" ? "写一个名字…" : "交给字字的一句话…")}<span class="ribbon-icon">${icon("pen")}</span></div>`;
  }
  if (c.id === "02")
    return `<div class="stage-note">已铸 ${c.note<Foundry2>("02", { rounds: [] }).rounds.length} 轮 · 三轮完成入门${c.lastCast ? `<small>你猜「${e(c.lastCast.chosen)}」；最高「${e(c.lastCast.winner.replace("+", ""))}」 · ${c.lastCast.count.toLocaleString()} 次</small>` : "<small>先猜一对，再看真实统计；之后可自由研究。</small>"}</div>`;
  if (c.room === "council") {
    return contextSurface(c);
  }
  if (c.id === "08") return "";
  if (c.id === "09")
    return `<div class="stage-note">${e(PAIRS[c.pairIndex][0])} <span class="thin">↔</span> ${e(PAIRS[c.pairIndex][1])}<small>两个完整名牌的相似度：${cosine(c.models.council.embedding(c.models.tokenizer.id(PAIRS[c.pairIndex][0])), c.models.council.embedding(c.models.tokenizer.id(PAIRS[c.pairIndex][1]))).toFixed(2)}</small></div>`;
  if (c.id === "16" || c.id === "17")
    return `<div class="stage-note">小雨把伞借给了小林，因为<span class="ink-teal">她</span>今天没带伞。<small>这里用三格名牌亲手计算。</small></div>`;
  if (c.id === "20")
    return `<div class="stage-note">「${c.seatResults.a.join("")}」 ↔ 「${c.seatResults.b.join("")}」<small>上排保留原句；移动下排，再比较同一个人的结果。</small></div>`;
  if (c.room === "press") {
    if (["21", "22"].includes(c.id)) {
      const n = c.printState;
      return `<div class="sentence-ribbon print-line">${c.id === "21" ? input("prompt", n.prompt, "写一个开头…", 24) : `<span>${e(n.prompt)}</span>`}<span class="printed-text" aria-live="polite">${e(c.models.tokenizer.decode(n.printed))}</span><span class="caret"></span></div>`;
    }
    if (c.id === "23") {
      const n = c.note<Press23>("23", { low: [], high: [] });
      return `<div class="proof-paper experiment-paper"><p class="paper-kicker">同样的开头 · 相同种子从100开始</p><h2>下课了，</h2><div class="sample-columns three-samples">${[
        ["低温 0.2", n.low],
        ["中温 1.0", n.middle ?? []],
        ["高温 2.0", n.high],
      ]
        .map(
          ([label, list]) =>
            `<section><h3>${label}</h3>${(list as string[]).map((text, i) => `<p><small>0${i + 1}</small>${e(text)}<em>${repeats(c.models.tokenizer.tokens(text)) ? "出现重复片段" : ""}</em></p>`).join("") || "<p class='muted'>等待你开始这一组实验。</p>"}</section>`,
        )
        .join(
          "",
        )}</div>${n.custom ? `<div class="custom-output"><b>你的旋钮 · ${n.customTemperature}</b>${e(n.custom)}</div>` : ""}</div>`;
    }
    if (c.id === "24") {
      const n = c.news,
        claims = newsClaims(n.text.slice(n.prompt?.length ?? 0));
      return `<article class="proof-paper news-paper"><header><h2>晨风报</h2><span>校庆特刊 · 校稿中</span></header><h3>请你为这段新闻把关</h3><p class="news-text">${e(n.prompt ?? "")}<span class="ai-writing">${e(n.text.slice(n.prompt?.length ?? 0))}</span></p><div class="fact-slips">${claims
        .map((claim) => {
          const mark = n.marks[claim.key],
            correct = mark === (claim.correct ? "yes" : "no");
          return `<div class="fact-slip ${mark ? (correct ? "confirmed" : "incorrect") : ""}"><span>${e(claim.label)} · <b>${e(claim.text)}</b></span>${b("核对", "inspect-fact", claim.key, false)}</div>`;
        })
        .join(
          "",
        )}</div><p class="paper-foot">蓝线是字字的续写。先打开安排表，再核对具体说法。</p></article>`;
    }
    if (c.id === "25") {
      const d = c.draft;
      return `<article class="proof-paper compose-paper"><header><h2>晨风报</h2><span>校庆特刊</span></header><input aria-label="新闻标题" class="headline-input" data-field="draft-headline" maxlength="40" value="${e(d.headline)}" placeholder="给这一版，起一个名字"><textarea aria-label="你写的开头" class="opening-input" data-field="draft-opening" maxlength="80" rows="2" placeholder="先在纸上写下你的开头…">${e(d.opening)}</textarea>${d.ai ? `<div class="draft-editor"><textarea aria-label="修改字字的续写" data-field="draft-edited" rows="4">${e(d.edited)}</textarea><p class="credit-line"><span class="ai-writing">修改后可检视逐字署名</span>${b("查看署名", "inspect-authors")}</p></div>` : `<div class="blank-copy"><span></span><span></span><p>接下来，让字字接着写。</p></div>`}<div class="paper-columns"><section><h4>我的观察</h4><p>${e(c.progress.reviews.council?.observation ?? "这一路的发现，会随特刊一起保存。")}</p></section><section><h4>来源记录</h4>${b("打开校庆安排表", "inspect-source")}<p class="muted">先核对，再出版。</p></section></div></article>`;
    }
  }
  return "";
}
export function dock(c: Course): string {
  const t = c.models.tokenizer;
  let content = "";
  switch (c.id) {
    case "01":
      content =
        seg(
          [
            { text: "按字", value: "chars" },
            { text: "按词", value: "words" },
            { text: "字字", value: "model" },
          ],
          "mode",
          c.mode,
        ) +
        b("拆开看看", "analyse", "", true) +
        b("换一句", "presets") +
        b("并排比较", "inspect-compare");
      break;
    case "02":
      content =
        `<span class="dock-caption">点一对你预测最常相邻的活字</span>` +
        b("看这一轮的次数", "inspect-cast");
      break;
    case "03":
      content =
        ["司马光", "饕餮", "苹果"].map((w) => b(w, "rare", w)).join("") +
        b("排一排", "rare-input", "", true);
      break;
    case "04": {
      const k = c.note<Foundry4>("04", { seen: [] }).value ?? 0;
      content =
        `<label class="slider-control"><span>字架</span><input type="range" data-field="size" min="0" max="${t.data.merges.length}" step="20" value="${k}" aria-label="字架合并轮数"><output>${t.withMerges(k).size} 块</output></label>` +
        b("看取舍", "inspect-size", "", true);
      break;
    }
    case "05": {
      const n = c.note<Foundry5>("05", {});
      content =
        seg(
          [
            { text: `小 · ${t.withMerges(0).size}`, value: "0" },
            { text: `中 · ${t.size}`, value: "1" },
            {
              text: `大 · ${t.withMerges(t.data.merges.length).size}`,
              value: "2",
            },
          ],
          "choice",
          String(n.choice ?? ""),
        ) + b("写下取舍", "inspect-choice", "", true);
      break;
    }
    case "06":
      content =
        `<span class="dock-caption">点字块翻面 · 背面先看4个数</span>` +
        b("查看完整名牌", "inspect-selected", "", true) +
        b("收回字面", "fold-nameplates");
      break;
    case "07":
      content =
        `<label class="search-control">${icon("search")}${input("search", c.selected, "找一个词…", 20)}</label>` +
        b("翻开名牌", "search", "", true);
      break;
    case "08":
      content =
        c.models.map.clusters
          .filter((x) => ["fruit", "animal", "vehicle", "food"].includes(x.key))
          .map((x) => b(x.name, "place-region", x.key))
          .join("") + b("看我的预测", "inspect-placements");
      break;
    case "09":
      content =
        select(
          PAIRS.map((pair, i) => ({
            text: pair.join(" ↔ "),
            value: String(i),
          })),
          "pair",
          String(c.pairIndex),
          "比较",
        ) +
        b("比一比", "pair-current") +
        b("试一次填空", "fill", "", true);
      break;
    case "10":
      content =
        b("找到苹果", "pick", "苹果", true) +
        b("只看名牌，够吗？", "inspect-question");
      break;
    case "11":
      content =
        `<span class="dock-caption">点选词元，连接随之改变</span>` +
        b("看计算", "inspect-selected", "", true);
      break;
    case "12":
      content = contextDock(c);
      break;
    case "13":
      content =
        select(
          PRONOUNS.map((s, i) => ({ text: short(s, 17), value: String(i) })),
          "pronoun",
          String(c.pronoun),
          "换一句",
        ) +
        b("观察这句", "pronoun-current", "", true) +
        b("看计算", "inspect-selected");
      break;
    case "14":
      content =
        select(
          [
            { text: "原句", value: "-1" },
            ...INSERTS.map((s, i) => ({
              text: short(s, 14),
              value: String(i),
            })),
          ],
          "insert",
          String(c.inserted),
          "加入线索",
        ) + b("对照读数", "inspect-question", "", true);
      break;
    case "15":
      content = layerControls(c) + b("留下观察", "inspect-heads", "", true);
      break;
    case "16":
      content =
        b("修改提问牌", "inspect-ledger", "query", true) +
        b("翻开四张名片", "inspect-ledger", "key");
      break;
    case "17":
      content =
        b("先猜谁最高", "inspect-score", "", true) +
        b("展开算式", "inspect-score");
      break;
    case "18":
      content =
        `<label class="slider-control"><span>弱</span><input type="range" min="-2" max="2" step="0.25" data-field="magnify" value="${Math.log2(c.ledger.magnifier ?? 1)}" aria-label="放大镜强度"><span>强</span><output>×${(c.ledger.magnifier ?? 1).toFixed(2)}</output></label>` +
        b("看这笔账", "inspect-weights");
      break;
    case "19":
      content =
        b("调和发言", "mix", "", true) +
        b("查看新名牌", "inspect-mix") +
        b("只听一个人？", "inspect-question");
      break;
    case "20":
      content =
        seg(
          [
            { text: "拿掉座位号", value: "0" },
            { text: "放回座位号", value: "1" },
          ],
          "seats",
          c.seats ? "1" : "0",
        ) +
        b("对照结果", "inspect-seats") +
        b("延伸：小林60%", "inspect-challenge");
      break;
    case "21":
      content =
        b("印下最可能的一块", "best-token", "", true) +
        b(
          "撤下一块",
          "undo",
          "",
          false,
          c.printState.printed.length ? "" : "disabled",
        ) +
        b("换开头", "restart-input") +
        b("看前后候选", "inspect-generation");
      break;
    case "22":
      content =
        b("再印一块", "best-token", "", true) +
        b("看它能听见谁", "inspect-causal") +
        b("我发现", "inspect-question");
      break;
    case "23":
      content =
        b(
          c.progress.route === "core" ? "低温 · 0.2" : "低温，印三遍",
          "generate",
          "low",
          true,
        ) +
        b(
          c.progress.route === "core" ? "中温 · 1.0" : "中温，印三遍",
          "generate",
          "middle",
        ) +
        b(
          c.progress.route === "core" ? "高温 · 2.0" : "高温，印三遍",
          "generate",
          "high",
        ) +
        b("为用途挑一版", "inspect-temperature") +
        `<label class="slider-control small"><span>胆量</span><input type="range" min=".2" max="2" step=".1" value="${c.temperature}" data-field="temperature" aria-label="生成温度"><output>${c.temperature.toFixed(1)}</output></label>` +
        b("按当前胆量试写", "generate", "custom");
      break;
    case "24":
      content =
        b("查看安排表", "inspect-source", "", true) + b("再写一段", "news");
      break;
    case "25":
      content =
        `<span class="workflow">撰稿 <i>—</i> <b>${c.draft.ai ? "校对" : "合写"}</b> <i>—</i> 出版</span>` +
        b(
          c.draft.ai ? "请字字再写一次" : "请字字接着写",
          "continue",
          "",
          !c.draft.ai,
        ) +
        b("展开校稿纸", "inspect-editor") +
        b("出版前校对", "inspect-proof", "", !!c.draft.ai);
      break;
  }
  if (c.ready && !c.done && c.needsReview)
    content =
      content.replace(/class="primary(?=\s|")/g, 'class="quiet') +
      b(c.id === "25" ? "签字，出版特刊" : "记下这次发现", "review", "", true);
  if (c.done)
    content =
      content.replace(/class="primary(?=\s|")/g, 'class="quiet') +
      b(
        c.id === "25" ? "展开我的特刊" : "下一步 " + icon("arrow"),
        c.id === "25" ? "edition" : "next",
        "",
        true,
      );
  return content;
}
export function layerControls(c: Course) {
  return (
    select(
      [0, 1, 2, 3].map((v) => ({ text: `第${v + 1}层`, value: String(v) })),
      "layer",
      String(c.layer),
      "楼层",
    ) +
    select(
      [
        { text: "全部", value: "-1" },
        ...[0, 1, 2, 3].map((v) => ({
          text: "记录员" + "甲乙丙丁"[v],
          value: String(v),
        })),
      ],
      "head",
      String(c.head),
      "记录员",
    )
  );
}
export function question(c: Course) {
  const defs: Record<string, { text: string; answers: [string, string][] }> = {
    "01": {
      text: "字字的拆法，和按词拆总是一样吗？",
      answers: [
        ["完全一样", "same"],
        ["不总一样，要看词表和合并规则", "some"],
      ],
    },
    "04": {
      text: "根据小字架与最大字架的实际读数，怎样解释这批材料的变化？",
      answers: [
        ["词元数至少减少一半", "half"],
        ["词元数减少，但未减半；存的活字更多", "less"],
        ["词元数没有减少", "same"],
      ],
    },
    "10": {
      text: "只看“苹果”的初始名牌，能确定它在这句话里指什么吗？",
      answers: [
        ["能", "yes"],
        ["还需要上下文", "no"],
      ],
    },
    "12": {
      text: "对照A/B读数，这两种上下文中的“苹果”表示有变化吗？",
      answers: [
        ["本次读数没有变化", "same"],
        ["本次表示随上下文改变", "diff"],
      ],
    },
    "14": {
      text: "插话后，这位记录员分给“妹妹”的注意力怎样变化？",
      answers: [
        ["减少了", "less"],
        ["差别很小", "same"],
        ["增加了", "more"],
      ],
    },
    "19": {
      text: "如果只给一个人100%的权重，混合结果是什么？",
      answers: [
        ["等于这个人的发言稿", "same"],
        ["等于四个人的平均", "average"],
      ],
    },
    "22": {
      text: "排印车间能看到还没有写出来的词元吗？",
      answers: [
        ["能", "yes"],
        ["不能", "no"],
      ],
    },
  };
  const item = defs[c.id];
  // 01：已答对但还没比较够两句话时，面板里留着肯定和下一步提示
  const next =
    c.id === "01" &&
    c.note<{ answered?: boolean }>("01", {}).answered &&
    !c.ready
      ? `<p class="result-note">${FOUNDRY1_NEXT}</p>`
      : "";
  return item
    ? `<section class="activity-unit"><p class="inspector-lead">${item.text}</p><div class="choices">${item.answers.map(([text, value]) => b(text, "answer", value)).join("")}</div>${next}</section>`
    : "";
}
export function inspector(
  c: Course,
  kind: string,
  argument = "",
): { title: string; html: string } {
  const t = c.models.tokenizer;
  if (kind === "generation") {
    const trace = c.printTransitions.at(-1);
    if (!trace)
      return {
        title: "先亲手印下一块",
        html: "<p>拿起托盘里的候选字，放到排印行。每一次选择都会成为下一轮的实际输入。</p>",
      };
    return {
      title: "你的选择，怎样进入下一轮？",
      html: `<p><b>A 输入：</b>${e(t.decode(trace.input))}<br><b>亲选：</b>${e(t.vocab[trace.token])}<br><b>B 输入：</b>${e(t.decode(trace.output))}</p><table class="prediction-table"><caption>各自按实际概率排序，未重新归一化</caption><thead><tr><th>序</th><th>A 候选</th><th>B 候选</th></tr></thead><tbody>${trace.before.map((a, i) => `<tr><th>${i + 1}</th><td>${e(a.text)}<br>${pct(a.p)}</td><td>${e(trace.after[i].text)}<br>${pct(trace.after[i].p)}</td></tr>`).join("")}</tbody></table><p>未列候选合计：A ${pct(Math.max(0, 1 - trace.before.reduce((s, x) => s + x.p, 0)))}；B ${pct(Math.max(0, 1 - trace.after.reduce((s, x) => s + x.p, 0)))}</p><section class="activity-unit"><p>下一轮怎样使用刚才选择的词元？</p><div class="choices">${b("把它加入已写内容，再算下一轮", "answer", "recalculated")}${b("候选一直照旧，与选择无关", "answer", "unchanged")}</div></section>`,
    };
  }
  if (kind === "free-context")
    return {
      title: "冻结的上下文对照",
      html:
        experimentMarkup(c.freeCouncilEvidence) +
        "<p>先比较实际表示。连线只显示本次注意力权重；表示余弦也不等于分类概率。可以改一个条件再试，原来的A/B不会跟着改。</p>",
    };
  if (kind === "experiment")
    return {
      title: "我的实际实验记录",
      html: experimentMarkup(c.reviewEvidence),
    };
  if (kind === "temperature") {
    const n = c.note<Press23>("23", { low: [], high: [] });
    return {
      title: "选词方式，要服务于什么用途？",
      html: `<p>三组固定“下课了，”与种子100，只改温度。可以为“写一则校庆消息”或“找故事点子”挑一组，也可以在解释中拒绝全部。</p><div class="temperature-results">${(["low", "middle", "high"] as const).map((key, i) => `<section><h3>${["低温0.2", "中温1.0", "高温2.0"][i]}</h3><p>${n[key]?.length ? e(n[key]![0] || "（模型选择立即结束）") : "尚未运行"}</p>${b("选择这组作起点", "temperature-choice", key, false, `aria-pressed="${n.choice === key}" ${n[key]?.length ? "" : "disabled"}`)}</section>`).join("")}</div><label class="write-label">我的用途与依据<textarea data-field="temperature-reason" rows="3" placeholder="引用上面一句实际输出，说明适用之处、局限或为什么仍须修改">${e(n.reason ?? "")}</textarea></label><p class="fineprint">选择与说明只记录你的判断；字数不代表理解质量。温度不提供事实，下一步要核对来源。</p>`,
    };
  }
  if (kind === "source")
    return {
      title: "编辑部 · 校庆安排",
      html: `<p class="muted">本课虚构校庆的权威资料</p><dl class="source-list">${ANNIVERSARY_FACTS.map((f) => `<dt>${e(f.label)}</dt><dd>${e(f.value)}</dd>`).join("")}</dl>`,
    };
  if (kind === "compare")
    return {
      title: "同一句话，三种拆法",
      html:
        [
          ["按字", Array.from(c.sentence).filter((x) => x.trim())],
          ["按词", c.models.dictionary.split(c.sentence)],
          ["字字", t.tokens(c.sentence)],
        ]
          .map(
            ([title, words]) =>
              `<section class="compare-line"><h3>${title}</h3><p>${(words as string[]).map((w) => `<span class="mini-type">${e(w)}</span>`).join("")}</p></section>`,
          )
          .join("") + question(c),
    };
  if (kind === "cast")
    return {
      title: "这一筐报纸的统计",
      html: `<p>每次合并后，重新统计相邻片段。</p><ol class="weight-list">${c.pairs.map((p) => `<li><span>${e(p.a)} + ${e(p.b)}</span><b>${p.count.toLocaleString()} 次</b></li>`).join("")}</ol>${c.lastCast ? `<p class="result-note">你选的是${e(c.lastCast.chosen)}；本轮最高是${e(c.lastCast.winner)}。</p>` : ""}`,
    };
  if (kind === "size") {
    const value = c.note<Foundry4>("04", { seen: [] }).value ?? 0,
      small = typeCaseReading(c.models, 0),
      current = typeCaseReading(c.models, value),
      largest = typeCaseReading(c.models, t.data.merges.length);
    return {
      title: "字架大小与排字长度",
      html: `<div class="reading"><strong>${current.size}</strong><span>当前字表大小</span></div><p>${t.data.baseCount} 个基础字符 + ${value} 个合并片段 + ${t.data.specials.length} 个功能符</p><p>同样${small.lines}行，当前平均：${small.average.toFixed(1)} → ${current.average.toFixed(1)}块。</p><p class="result-note">小字架${small.size}块 → 最大字架${largest.size}块；平均序列长度${small.average.toFixed(1)} → ${largest.average.toFixed(1)}。这是已测得的读数。</p>${question(c)}`,
    };
  }
  if (kind === "choice")
    return {
      title: "把取舍写下来",
      html: `<p>后续模型仍使用训练时配套的字表；这里记录你的选型判断。</p><label class="write-label">我更看重…<textarea data-field="reason" rows="4" placeholder="结合刚才的块数与字架大小说明">${e(c.note<Foundry5>("05", {}).reason ?? "")}</textarea></label>${["优先控制字表大小", "优先减少序列长度", "在两个成本间折中"].map((reason) => b(reason, "reason", reason)).join("")}`,
    };
  if (kind === "question") {
    let readings = "";
    if (c.id === "12") {
      readings =
        c.councilComparison || c.contextComparison
          ? experimentMarkup(c.reviewEvidence)
          : `<p class="result-note">先在同一组、同一层和记录员下，实际切换到两种上下文。已运行的读数会保留在这里；换组后要重新做对照。</p>`;
    }
    if (c.id === "14") {
      const original = c.council.run(PRONOUNS[0]),
        q = original.tokens.indexOf("她"),
        m = original.tokens.indexOf("妹妹"),
        before = original.result.attention[c.layer][2][q][m];
      readings = `<div class="result-note"><p>原句：${pct(before)}<br>当前句：${pct(c.attention(c.meeting.tokens.indexOf("她"))[c.meeting.tokens.indexOf("妹妹")] ?? 0)}</p></div><p class="fineprint">同一层、记录员丙，比较“她”分给“妹妹”的注意力。</p>`;
    }
    return { title: "把刚才看见的，说清楚", html: readings + question(c) };
  }
  if (kind === "selected" && c.room === "gallery") {
    const vector = c.models.council.embedding(t.id(c.selected));
    const bars = Array.from(vector)
      .map(
        (v) =>
          '<i style="height:' +
          Math.min(100, Math.abs(v) * 300) +
          "%;--bar:" +
          (v < 0 ? "#59858f" : "#b08552") +
          '"></i>',
      )
      .join("");
    const related =
      c.id === "06"
        ? '<h3>先比较两张名牌</h3><p>它们的长度相同吗？里面哪些数字不同？可以收起这里，再翻开另一块活字。</p><p class="fineprint">每一格是一维数字，通常不能直接当成固定的词义标签。相似度可以到词义地图继续研究。</p>'
        : '<h3>完整名牌最像的词</h3><ol class="weight-list">' +
          c
            .nearest(c.selected)
            .map(
              (w) =>
                "<li><span>" +
                e(w.text) +
                "</span><b>" +
                w.similarity.toFixed(2) +
                "</b></li>",
            )
            .join("") +
          '</ol><p class="fineprint">相似度范围−1到1。二维位置只帮助观察，不能代替完整名牌的计算。</p>';
    return {
      title: c.selected + " · 名牌",
      html:
        '<p class="muted">' +
        vector.length +
        '个训练得到的数字</p><div class="embedding">' +
        bars +
        '</div><p class="mono">' +
        Array.from(vector)
          .slice(0, 8)
          .map((v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2))
          .join(" · ") +
        " …</p>" +
        related +
        (c.id === "10" ? question(c) : ""),
    };
  }
  if (
    (kind === "selected" && c.room === "council") ||
    kind === "heads" ||
    kind === "matrix"
  ) {
    const rows = c.meeting.tokens
      .map((word, i) => ({ word, value: c.attention()[i] }))
      .sort((a, b) => b.value - a.value);
    const matrix = () =>
      `<div class="matrix-scroll"><table class="attention-matrix"><caption>行是提问词，列是被听的词。${c.head < 0 ? "这里显示四位记录员的平均。" : ""}</caption><thead><tr><th></th>${c.meeting.tokens.map((w) => `<th>${e(w)}</th>`).join("")}</tr></thead><tbody>${c.meeting.tokens
        .map(
          (w, i) =>
            `<tr><th>${e(w)}</th>${c
              .attention(i)
              .map(
                (v, j) =>
                  `<td style="background:rgba(42,120,110,${0.06 + v * 0.8})" title="${e(w)} → ${e(c.meeting.tokens[j])}：${pct(v)}">${(v * 100).toFixed(0)}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("")}</tbody></table></div>`;
    if (kind === "matrix")
      return {
        title: "完整注意力矩阵",
        html:
          b("← 返回这个词的观察", "inspect-selected") +
          layerControls(c) +
          matrix(),
      };
    let prediction = "";
    if (c.id === "13") {
      const q = c.meeting.tokens.findIndex((w) => w === "她" || w === "他"),
        masked = c.council.run(c.currentText, q),
        prob = softmax(masked.result.logits.get(q)!);
      prediction = `<h3>遮住代词，再做一次预测</h3><p>“他” ${pct(prob[t.id("他")])} · “她” ${pct(prob[t.id("她")])}</p><p class="fineprint">比较改变线索后的预测；注意力连线本身不是模型正确的证明。</p>`;
    }
    return {
      title: `${c.selected} · 注意力`,
      html: `${layerControls(c)}<ol class="weight-bars">${rows
        .slice(0, 5)
        .map(
          (r) =>
            `<li><span>${e(r.word)}</span><i><b style="width:${r.value * 100}%"></b></i><em>${pct(r.value)}</em></li>`,
        )
        .join(
          "",
        )}</ol>${b("展开完整注意力矩阵", "inspect-matrix")}${prediction}<p class="fineprint">这是当前计算的权重，不是答对概率，也不是完整的“理由”。</p>${kind === "heads" ? `<h3>这句话里，我观察到…</h3><div class="choices">${HEAD_LABELS.map((x) => b(x, "head-note", x)).join("")}</div><p>已记录 ${Object.keys(c.note<Council15>("15", { notes: {} }).notes).length} 位记录员。</p>` : ""}`,
    };
  }
  if (kind === "seats") {
    const r = c.seatResults,
      a = r.first[0],
      b = r.second[r.b.indexOf("小雨")],
      delta = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    return {
      title: "同一个小雨，换到另一边",
      html: `<p>${c.seats ? "保留了座位号。" : "拿掉了所有座位号。"}比较小雨在两句话里得到的新名牌：</p><table class="reading-table"><thead><tr><th>句子</th><th>三格名牌</th></tr></thead><tbody><tr><th>${e(r.a.join(""))}</th><td>${a.map((v) => v.toFixed(3)).join(" · ")}</td></tr><tr><th>${e(r.b.join(""))}</th><td>${b.map((v) => v.toFixed(3)).join(" · ")}</td></tr></tbody></table><p class="result-note">最大差异：${delta.toFixed(4)}。${r.a.join("") === r.b.join("") ? "先移动下排字牌，试试不同词序。" : delta < 0.00001 ? "同一词元的结果随人交换。" : "位置信息改变了计算。"}</p><p class="fineprint">这里使用三格手算教具演示，不保证模型因此理解或答对。</p>`,
    };
  }
  if (kind === "selected")
    return {
      title: c.selected,
      html: `<p>这是一块${t.has(c.selected) ? "在字表中的" : "字表未收录的"}词元。</p><p>对应编号：${t.id(c.selected)}</p>`,
    };
  if (kind === "placements") {
    const entries = Object.keys(c.note<Gallery8>("08", { placed: {} }).placed);
    return {
      title: "我先放，模型再揭晓",
      html:
        entries
          .map(
            (word) =>
              `<section><h3>${word}</h3><p>完整名牌最像：${c
                .nearest(word, 3)
                .map((n) => `${n.text} ${n.similarity.toFixed(2)}`)
                .join("、")}</p></section>`,
          )
          .join("") || "<p>先在地图上放一块活字。</p>",
    };
  }
  if (kind === "fill")
    return {
      title: "真实的完形填空",
      html: `<p class="inspector-lead">那只____在沙发上睡觉。</p><ol class="weight-list">${c.lastFill.map((r, i) => `<li><span>${e(r.word)}${i === 0 ? " · 全词表最高" : ""}</span><b>${pct(r.probability)}</b></li>`).join("")}<li><span>其余词元合计</span><b>${pct(c.lastFillRemaining)}</b></li></ol><p>遮住“小猫”后，双向议事厅模型现场计算全词表概率。列出真实前五名及四个对比词，重合只列一次；未对展示的词重新归一化。</p><p class="fineprint">极小的非零值显示为小于阈值，0%仅表示数值为零。最高概率不等于唯一合理答案，也不保证事实正确。</p>`,
    };
  if (kind === "ledger" || kind === "challenge" || kind === "mix") {
    const l = c.ledger,
      group = kind === "challenge" ? "query" : argument || "query";
    const card = (name: string, values: number[], type: string, row: number) =>
      `<section class="number-card"><h3>${name}</h3>${values.map((v, col) => `<div><span>${CELLS[col]}</span>${b("−", "dial", `${type}:${row}:${col}:-0.5`, false, `aria-label="减小${name}${CELLS[col]}"`)}<output>${v}</output>${b("+", "dial", `${type}:${row}:${col}:0.5`, false, `aria-label="增大${name}${CELLS[col]}"`)}</div>`).join("")}</section>`;
    return {
      title:
        kind === "challenge"
          ? "让小林得到至少60%"
          : kind === "mix"
            ? "四份发言，混成新名牌"
            : "三格小名牌",
      html:
        kind === "mix"
          ? `<p>新名牌：${c.ledgerResult.mixed.map((v) => v.toFixed(2)).join(" · ")}</p>${l.values.map((v, i) => card(PEOPLE[i] + "的发言稿", v, "value", i)).join("")}`
          : group === "query"
            ? card("她的提问牌", l.query, "query", 0) +
              `<p class="result-note">“她”听小林 ${pct(c.ledgerResult.weights[1])}</p><p class="fineprint">数字越匹配，分数越高。这三格是人为指定的手算教具。</p>`
            : l.keys
                .map((v, i) => card(PEOPLE[i] + "的名片", v, "key", i))
                .join(""),
    };
  }
  if (kind === "score")
    return {
      title: "先预测，再逐步算",
      html: `<p>谁的分数最高？</p><div class="choices">${PEOPLE.map((name, i) => b(name, "guess", String(i))).join("")}</div>${PEOPLE.map((name, i) => `<section class="equation"><h3>${name}</h3><p>${c.ledger.keys[i].map((v, j) => `${c.ledger.query[j]}×${v}`).join(" + ")}</p>${c.ledger.computed[i] ? `<strong>= ${c.ledgerResult.scores[i].toFixed(2)}</strong>` : b("算这一笔", "compute", String(i), false, c.ledger.guess === undefined ? "disabled" : "")}</section>`).join("")}`,
    };
  if (kind === "weights")
    return {
      title: "分数怎样变成比例",
      html: `<ol class="weight-list">${PEOPLE.map((name, i) => `<li><span>${name} · ${c.ledgerResult.scores[i].toFixed(1)} 分</span><b>${pct(c.ledgerResult.weights[i])}</b></li>`).join("")}</ol><p>先将分数放大，用指数变成正数，再除以总和。这叫 softmax。</p><p class="fineprint">糖果按整数分配，总数始终100；计算仍用未取整的权重。</p>`,
    };
  if (kind === "causal") {
    const result = c.printPrediction,
      layer = result.result.attention.at(-1)!,
      last = result.ids.length - 1;
    return {
      title: "它只能看已经写下的词",
      html: `<div class="causal-words">${result.ids.map((id, i) => `<span>${e(id === SPECIAL.BOS ? "起点" : t.vocab[id])}<small>${pct(layer.reduce((sum, head) => sum + head[last][i], 0) / layer.length)}</small></span>`).join("")}<span class="future">未来的词<br>不可见</span></div>${question(c)}`,
    };
  }
  if (kind === "fact") {
    const claim = newsClaims(
      c.news.text.slice(c.news.prompt?.length ?? 0),
    ).find((x) => x.key === argument);
    if (!claim)
      return { title: "核对具体说法", html: "<p>先从稿件里选择一条陈述。</p>" };
    const mark = c.news.marks[claim.key];
    return {
      title: claim.label + " · 核对",
      html: `<p>字字写：<b>${e(claim.text)}</b></p><p>安排表：<b>${e(claim.expected)}</b></p><div class="choices">${b("一致", "mark", claim.key + "|yes")}${b("不一致", "mark", claim.key + "|no")}</div>${mark ? `<p class="result-note">${mark === (claim.correct ? "yes" : "no") ? "你的核对有依据。" : "再比较两边的具体内容。"}</p>` : ""}`,
    };
  }
  if (kind === "proof") {
    const d = c.draft,
      conflicts = publicationConflicts(d);
    return {
      title: "出版之前，编辑签字",
      html: `${conflicts.length ? `<p>请先亲手改正或删除这些冲突：</p><ul>${conflicts.map((r) => `<li>${e(r.text)} → ${e(r.expected)}</li>`).join("")}</ul>` : `<p>未发现本课规则能识别的冲突，其他说法仍需你核对。</p>`}<div class="proof-checks">${[
        ["facts", "我核对了具体事实"],
        ["readability", "我通读并处理了重复"],
        ["attribution", "我确认保留了AI标识"],
      ]
        .map(([key, text]) =>
          b(
            `${d.proof?.[key as "facts" | "readability" | "attribution"] ? icon("check") : "○"} ${text}`,
            "proof",
            key,
          ),
        )
        .join(
          "",
        )}</div>${b("送印这一版", "publish", "", true, canPublish(d) ? "" : "disabled")}`,
    };
  }
  if (kind === "editor") {
    const d = c.draft;
    return {
      title: "展开校稿纸",
      html: `<p>这里与桌面稿件同步。修改后，当前稿件的校对签认会撤销。</p><label class="write-label">标题${input("draft-headline", d.headline, "新闻标题", 40)}</label><label class="write-label">我的开头<textarea data-field="draft-opening" maxlength="80" rows="3">${e(d.opening)}</textarea></label>${d.ai ? `<details><summary>对照AI原始续写</summary><p class="authored-copy">${e(d.ai)}</p></details><label class="write-label">编辑续写<textarea data-field="draft-edited" rows="8">${e(d.edited)}</textarea></label>${b("查看逐字署名", "inspect-authors")}` : "<p>先写一个尚未结束的开头，再请字字续写。</p>"}${b("核对安排表", "inspect-source")}${b("出版前校对", "inspect-proof")}`,
    };
  }
  if (kind === "authors")
    return {
      title: "哪些字，是谁写的？",
      html: `<p class="authored-copy">${authors(c.draft.ai, c.draft.edited)
        .map(
          (span) =>
            `<span class="${span.by === "ai" ? "ai-writing" : ""}">${e(span.text)}</span>`,
        )
        .join(
          "",
        )}</p><p class="fineprint">蓝线保留AI原稿中的字；你修改和新增的字标为人工编辑。</p>`,
    };
  return { title: "手边的观察", html: "<p>先选择一件教具。</p>" };
}
