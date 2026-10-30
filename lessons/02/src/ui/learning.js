import { rooms, roomById, itemById, resolveRoomId } from "../content.js";
import { galleryGuides } from "../content/gallery-guides.js";
import { elizaReply } from "../activities.js";
import { experimentProgress } from "../experiment-progress.js";
import { folioPages, indexPages } from "./pages.js";
import {
  learningTasks,
  trainingLeaves,
  testLeaves,
  lessonExamples,
  classify,
  trainEpoch,
  fitTrainingExamples,
  classificationScore,
  tokenProbabilities,
  chooseToken,
  searchCandidates,
  emptySearch,
  exploreBranch,
  researchCard,
  evidenceCards,
  remainingCandidates,
  evaluateEvidenceCase,
} from "../learning.js";
import {
  escapeHTML as esc,
  sourceChips,
  galleryGuideMarkup,
} from "./archive-markup.js";

const choice = (action, value, label, selected) =>
  `<button class="study-choice${selected ? " selected" : ""}" data-action="${action}" data-value="${value}" aria-pressed="${!!selected}"><i class="choice-mark" aria-hidden="true">${selected ? "✓" : ""}</i><b>${label}</b><span>${selected ? "已选择" : "选择"}</span></button>`;
const note = (text) => `<p class="model-note">${text}</p>`;
/** Follow-up questions keep their own feedback, so an answer never shows above its question. */
const FOLLOW_UPS = new Set(["origin-evidence", "match-answer"]);
const conclusion = (s, question, action, options) => {
  if (!s.uiProgress.questions.includes(action)) return "";
  const own = FOLLOW_UPS.has(action)
    ? s.feedbackFor === action
    : !FOLLOW_UPS.has(s.feedbackFor);
  return `<section class="study-question"><small class="question-label">轮到你来判断 · 点击一个选项</small><h3>${question}</h3><div class="study-choices">${options.map(([value, label]) => choice(action, value, label, s.selections?.[action] === value)).join("")}</div>${s.feedback && own ? `<p class="study-feedback" role="status">${esc(s.feedback)}</p>` : ""}</section>`;
};
const tokenContexts = [
  {
    prefix: "雨停了，天空出现一道",
    tokens: ["彩虹", "桥", "微笑"],
    probabilities: [0.75, 0.2, 0.05],
  },
  {
    prefix: "墙上的钟走得",
    tokens: ["很慢", "飞快", "香甜"],
    probabilities: [0.55, 0.4, 0.05],
  },
];
const claims = [
  {
    title: "一家公司有一次新产品比别人晚，就说明它永远落后了。",
    item: "google-path",
    evidence:
      "Google和DeepMind的团队在2016年用AlphaGo赢下李世石，2017年发表了提出Transformer的论文，2021年发表了AlphaFold的详细论文。2022年底，第一个让大众惊叹的对话产品来自OpenAI；此后Google陆续推出Gemini系列，到2026年仍在发布新的模型。",
    answer: "insufficient",
    explanation:
      "证据不够。研究、产品和市场是不同的方面，一次事件说明不了“永远”。",
  },
  {
    title: "AlphaGo在2016年和2017年的两次比赛，对手不是同一个人。",
    item: "lee-match",
    evidence:
      "2016年3月，AlphaGo在韩国首尔与李世石对弈五局，比分4比1。2017年5月，AlphaGo在中国浙江乌镇与柯洁对弈三局，比分3比0。",
    answer: "supported",
    explanation:
      "证据支持它：2016年的对手是李世石，2017年是柯洁。时间和人物要一起核对。",
  },
  {
    title: "只要能下载一个模型的权重，就可以随便拿它做任何事。",
    item: "open-weights",
    evidence:
      "2023年2月公开的LLaMA，只供研究者申请、用于非商业的研究；后来的Llama 2允许在一定条件下用于商业产品，用户特别多的公司还要另行申请；Mistral 7B则采用宽松的Apache 2.0许可证。能不能修改、能不能用来赚钱，由每个模型自己的许可证规定。",
    answer: "contradicted",
    explanation:
      "证据和它矛盾。能下载权重，不代表没有限制；能不能用、能不能改、能不能用来赚钱，要看许可证。",
  },
];
function newSession() {
  return {
    feedback: "",
    answers: {},
    inputs: [],
    rule: "",
    reply: "",
    input: "",
    model: { weights: [0, 0], bias: 0 },
    epochs: 0,
    showTests: false,
    counterexample: false,
    checked: false,
    search: emptySearch(),
    context: 0,
    temperature: 1,
    tokens: [],
    temperatures: new Set(),
    claim: 0,
    revealed: false,
    solved: [],
    evidence: [],
    checkedRecord: false,
    fields: { who: "", problem: "", check: "", risk: "" },
  };
}

function leafGraph(s) {
  const points = lessonExamples(s.counterexample);
  const [wx, wy] = s.model.weights,
    b = s.model.bias;
  let boundary = "";
  if (Math.abs(wy) > 0.0001) {
    const y0 = (-b / wy) * 10,
      y1 = (-(wx + b) / wy) * 10;
    boundary = `<line x1="54" y1="${250 - y0 * 20}" x2="414" y2="${250 - y1 * 20}" stroke="#775b32" stroke-width="2.5"/>`;
  } else if (Math.abs(wx) > 0.0001) {
    const x = (-b / wx) * 10;
    boundary = `<line x1="${54 + x * 36}" y1="35" x2="${54 + x * 36}" y2="250" stroke="#775b32" stroke-width="2.5"/>`;
  }
  return `<svg viewBox="0 0 468 296" role="img" aria-label="叶片宽度和长度的分类图，圆叶为蓝色，细长叶为金色。模型分界线随学习改变。"><defs><clipPath id="leaf-plot"><rect x="54" y="40" width="360" height="210"/></clipPath></defs>
  ${[0, 2, 4, 6, 8, 10].map((i) => `<path d="M54 ${250 - i * 20}H414 M${54 + i * 36} 40V250" stroke="#897b611a"/><text x="${54 + i * 36}" y="269" text-anchor="middle">${i}</text>`).join("")}
  <text x="54" y="24">长度</text><text x="390" y="289">宽度</text><g clip-path="url(#leaf-plot)">${boundary}</g>
  ${points.map((p) => `<ellipse cx="${54 + p.x * 36}" cy="${250 - p.y * 20}" rx="${p.label ? 6 : 10}" ry="${p.label ? 14 : 9}" fill="${p.label ? "#a88347" : "#477e85"}" stroke="#f6f1e5" stroke-width="2" transform="rotate(-20 ${54 + p.x * 36} ${250 - p.y * 20})"/>`).join("")}
  ${s.showTests ? testLeaves.map((p, i) => `<g><circle cx="${54 + p.x * 36}" cy="${250 - p.y * 20}" r="16" fill="none" stroke="${classify(s.model, p) === p.label ? "#477e85" : "#a76144"}" stroke-dasharray="3 3"/><text x="${54 + p.x * 36}" y="${255 - p.y * 20}" text-anchor="middle">${i + 1}</text></g>`).join("") : ""}</svg>`;
}
function learningMetrics(s) {
  const training = lessonExamples(s.counterexample);
  return `<span><b>${Math.round(classificationScore(s.model, training) * 100)}%</b>训练样本正确率</span><span><b>${s.showTests ? Math.round(classificationScore(s.model, testLeaves) * 100) + "%" : "—"}</b>新样本正确率</span><span><b>${s.epochs}</b>已训练轮数</span>`;
}
function tokenVisual(s) {
  const c = tokenContexts[s.context],
    prob = tokenProbabilities(c.probabilities, s.temperature);
  return `<div class="sentence-output">${c.prefix}<strong>${esc(s.tokens.at(-1) || "…")}</strong></div><div class="probability-bars">${c.tokens.map((word, i) => `<div><span>${word}</span><i style="--prob:${prob[i] * 100}%"></i><b>${Math.round(prob[i] * 100)}%</b></div>`).join("")}</div><div class="token-history" aria-label="已生成的词语">${
    s.tokens
      .slice(-12)
      .map((t) => `<span>${esc(t)}</span>`)
      .join("") || "<small>按下“抽一个词”，看看会抽中哪个。</small>"
  }</div>`;
}
function searchBoard(s) {
  const stones = [
    [1, 2, 0],
    [2, 3, 1],
    [2, 4, 0],
    [4, 2, 1],
    [4, 3, 0],
    [5, 2, 1],
    [3, 5, 0],
    [4, 6, 1],
    [6, 5, 0],
    [7, 5, 1],
    [5, 6, 0],
    [7, 7, 1],
  ];
  return `<svg viewBox="0 0 320 300" role="img" aria-label="九路教学棋盘与三个候选方向，示意搜索，不是历史棋谱。"><rect x="28" y="8" width="266" height="266" rx="8" fill="#d2b381"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${41 + i * 30} 21V261 M41 ${21 + i * 30}H281" stroke="#66503870" stroke-width=".7"/>`).join("")}${stones.map(([x, y, c]) => `<circle cx="${41 + x * 30}" cy="${21 + y * 30}" r="11.5" fill="${c ? "#f7eedc" : "#383b37"}" stroke="#8a704f"/>`).join("")}${searchCandidates.map((c, i) => `<g><circle cx="${41 + c.x * 30}" cy="${21 + c.y * 30}" r="13" fill="#edf0e7" stroke="#507f82" stroke-width="2"/><text x="${41 + c.x * 30}" y="${26 + c.y * 30}" text-anchor="middle" fill="#355e61">${String.fromCharCode(65 + i)}</text></g>`).join("")}<text x="160" y="295" text-anchor="middle">剩余探索机会 ${12 - s.search.total} / 12</text></svg>`;
}

function taskMarkup(id, s) {
  if (id === "frontiers") {
    const names = { leaf: "叶片标本", seed: "种子标本", shell: "贝壳标本" },
      candidates = remainingCandidates(s.evidence);
    return `<p class="frontier-brief">一只盒子的标签脱落了。打开几种线索，判断盒子里装的是什么。</p><div class="frontier-evidence">${evidenceCards.map((c) => `<button class="evidence-tile ${s.evidence.includes(c.id) ? "opened" : ""}" data-action="frontier-clue" data-value="${c.id}" aria-pressed="${s.evidence.includes(c.id)}"><strong>${c.label}</strong><span class="evidence-symbol" aria-hidden="true">${c.id === "image" ? '<svg viewBox="0 0 100 70"><ellipse cx="50" cy="35" rx="27" ry="17" fill="#729575"/><path d="M27 44L74 27" stroke="#a7b995" stroke-width="2"/></svg>' : c.id === "sound" ? '<span class="sound-glyph">▂ ▅ ▃ ▇ ▄ ▂ ▆ ▃</span>' : '<b class="record-code">S–03</b>'}</span><small>${s.evidence.includes(c.id) ? esc(c.text) : "打开这条线索 →"}</small></button>`).join("")}</div><div class="evidence-candidates"><small>现在还可能是</small><p>${candidates.map((id) => names[id]).join(" · ")}</p></div><button class="secondary" data-action="frontier-check">${s.checkedRecord ? "✓ 盒子编号和记录对上了" : "核对盒子上的编号 S–03"}</button>${conclusion(
      s,
      "盒子里装的是什么？",
      "frontier-answer",
      [
        ["leaf", "叶片标本"],
        ["seed", "种子标本"],
        ["shell", "贝壳标本"],
        ["uncertain", "还不能确定"],
      ],
    )}${note("这是本馆编写的练习：照片用图形代替，声音用文字记录代替。")}`;
  }
  if (id === "origins")
    return `<div class="dialogue-pair"><article><small>记录 A</small><p>问：下雨天可以做什么？</p><blockquote>“也许可以画一扇窗，把没出门的风景画出来。”</blockquote></article><article><small>记录 B</small><p>问：下雨天可以做什么？</p><blockquote>“先看看有没有带伞，再决定是出去走走，还是读一本书。”</blockquote></article></div>${note("两段对话都由本馆为练习编写，背后既没有真人，也没有人工智能。")}${!s.observed ? '<button class="primary" data-action="origin-observe">我观察好了，开始判断 →</button>' : ""}${conclusion(
      s,
      "只看这两句话，你能确定谁更聪明吗？",
      "origin-answer",
      [
        ["style", "能，写得更有诗意的那个"],
        ["uncertain", "还不能，证据不够"],
      ],
    )}${
      s.answers.origin === "uncertain"
        ? conclusion(s, "怎样让判断更可靠？", "origin-evidence", [
            ["length", "看谁答得长"],
            ["repeat", "换几个问题多问几次，并先定好判断标准"],
          ])
        : ""
    }`;
  if (id === "rules")
    return `<form id="rule-lab-form" class="rule-lab"><label for="rule-lab-input">对规则机器说一句话</label><div><input id="rule-lab-input" maxlength="160" value="${esc(s.input)}" placeholder="试试：我不喜欢下雨"/><button class="primary">看它怎么回</button></div></form><div class="example-row">${["我喜欢小猫", "我不喜欢下雨", "今天真好"].map((x) => `<button data-action="rule-example" data-value="${x}">${x}</button>`).join("")}</div><div class="rule-trace"><div><small>01 · 你说的话</small><b>${esc(s.input || "等待输入")}</b></div><i>→</i><div><small>02 · 命中的规则</small><b>${esc(s.rule || "找关键词")}</b></div><i>→</i><div><small>03 · 它的回答</small><b>${esc(s.reply || "回答会出现在这里")}</b></div></div>${note("这台机器只会找关键词、套句式，并不理解情绪。试两种不同的说法，尤其是带“不喜欢”的句子。")}${conclusion(
      s,
      "它为什么可能听错“不喜欢”？",
      "rule-answer",
      [
        ["feel", "因为它在体会我的心情"],
        ["pattern", "它只认出了关键词，没读懂整句话"],
      ],
    )}`;
  if (id === "learning")
    return `<div class="classifier-layout"><div class="learning-plot" data-visual>${leafGraph(s)}</div><div class="classifier-controls"><div class="plot-legend"><span>● 圆叶子</span><span>◆ 细长叶子</span></div><p>拖动滑块调整分界线，或者让程序从带答案的例子里自己学。</p>${[
      ["wx", "宽度的作用", s.model.weights[0]],
      ["wy", "长度的作用", s.model.weights[1]],
      ["bias", "判断门槛", s.model.bias],
    ]
      .map(
        ([key, label, value]) =>
          `<label>${label}<input type="range" data-model="${key}" min="-3" max="3" step="0.05" value="${value}" aria-label="${label}"/></label>`,
      )
      .join(
        "",
      )}<div class="button-stack"><button class="primary" data-action="train">开始学习</button><button class="secondary" data-action="test-leaves">用两片新叶子检验</button>${s.showTests ? '<button class="secondary" data-action="counterexample">补充两片不同的叶子</button>' : ""}</div></div></div><div class="learning-metrics" data-metrics>${learningMetrics(s)}</div>${note("这是一个简化的感知机，叶片数据是为练习编写的。虚线圈是它从未学过的新叶子。")}${conclusion(
      s,
      "练习题全对，就说明它什么都会了吗？",
      "learn-answer",
      [
        ["all", "是的，全对就够了"],
        ["new", "还要用新例子检验，也要看例子是否足够多样"],
      ],
    )}`;
  if (id === "games")
    return `<div class="search-layout"><div>${searchBoard(s)}</div><div class="search-branches">${searchCandidates.map((c, i) => `<button data-action="explore" data-value="${i}" ${s.search.total >= 12 ? "disabled" : ""}><span class="branch-letter">${String.fromCharCode(65 + i)}</span><div><b>${c.name}</b><small>试了 ${s.search.visits[i]} 次 · 赢了 ${s.search.wins[i]} 次</small><i style="--prob:${s.search.visits[i] ? (s.search.wins[i] / s.search.visits[i]) * 100 : 0}%"></i></div><em>再试一次 ＋</em></button>`).join("")}<button class="text-button" data-action="reset-search">重新分配机会 ↻</button></div></div>${note("棋盘和结果是为练习设计的示意，不是真实的AlphaGo，也不是历史棋谱。试的次数少，判断就可能不稳。")}${conclusion(
      s,
      "某个方向只试了一次就赢了，能说明它最好吗？",
      "search-answer",
      [
        ["certain", "能，赢一次就够了"],
        ["uncertain", "不能，要多试几次、比一比，结论也要留余地"],
      ],
    )}${
      s.search.total >= 6
        ? conclusion(
            s,
            "回到真实历史：2016年首尔五局棋，AlphaGo的对手是谁？",
            "match-answer",
            [
              ["lee", "李世石"],
              ["ke", "柯洁"],
            ],
          )
        : ""
    }`;
  if (id === "generation")
    return `<div class="generation-context"><label for="token-context">选一句开头</label><select id="token-context">${tokenContexts.map((c, i) => `<option value="${i}" ${s.context === i ? "selected" : ""}>${c.prefix}…</option>`).join("")}</select></div><div data-visual class="token-workbench">${tokenVisual(s)}</div><label class="temperature-label">稳妥一些 <input id="token-temperature" type="range" min="0.35" max="1.8" step="0.05" value="${s.temperature}" aria-label="词语概率分散程度"/> 多样一些</label><div class="generation-actions"><button class="primary" data-action="sample">抽一个词</button><span>已经抽了 ${s.tokens.length} 次</span></div><ol class="generation-stages"><li>读前面的话</li><li>算出每个词的可能性</li><li>按可能性抽一个词</li><li>接着往下写</li></ol>${note("这里的可能性是本馆预先设好的，没有连接真实的大模型；真实的模型要考虑的复杂得多。")}${conclusion(
      s,
      "被抽中的词可能性很高，就说明整句话一定是真的吗？",
      "generation-answer",
      [
        ["true", "是的，读起来顺就是真的"],
        ["verify", "不是，还要核对事实和来源"],
      ],
    )}`;
  if (id === "industry") {
    const c = claims[s.claim],
      item = itemById[c.item];
    return `<div class="evidence-case"><span class="folio-eyebrow">第 ${s.claim + 1} 题 / 共 ${claims.length} 题</span><h2>${c.title}</h2><button class="secondary" data-action="reveal">${s.revealed ? "证据已经打开" : "打开这份证据 ↓"}</button>${s.revealed ? `<article class="opened-evidence"><small>${esc(item.date)} · ${esc(item.title)}</small><p>${esc(c.evidence)}</p><div>${sourceChips([...new Set([...item.sources, ...(c.item === "lee-match" ? itemById["ke-match"].sources : [])])])}</div></article>` : ""}</div>${
      s.revealed
        ? conclusion(s, "这份证据和这句说法是什么关系？", "evidence-answer", [
            ["supported", "证据支持它"],
            ["contradicted", "证据和它矛盾"],
            ["insufficient", "证据不够，推不出来"],
          ])
        : ""
    }${s.solved.includes(s.claim) ? `<button class="primary" data-action="next-claim">${s.claim === 2 ? "收好这组证据" : "下一题 →"}</button>` : ""}`;
  }
  return `<form id="research-card-form" class="research-form"><div class="research-card-paper"><small>我的研究卡</small><label>我想帮助谁？<input name="who" maxlength="45" placeholder="例如：看不清小字的爷爷奶奶" value="${esc(s.fields.who)}"/></label><label>帮他们解决什么具体问题？<textarea name="problem" maxlength="95" placeholder="例如：读出药盒上的小字">${esc(s.fields.problem)}</textarea></label></div><label>怎样知道它真的有用？<select name="check"><option value="">选一种检验方法</option><option value="advert" ${s.fields.check === "advert" ? "selected" : ""}>只看广告和演示</option><option value="compare" ${s.fields.check === "compare" ? "selected" : ""}>比较使用前后的变化，听听使用者的感受</option></select></label><label>如果它出错了，怎么办？<select name="risk"><option value="">选一种处理方式</option><option value="ignore" ${s.fields.risk === "ignore" ? "selected" : ""}>继续相信它，不管问题</option><option value="review" ${s.fields.risk === "review" ? "selected" : ""}>保护个人信息、请人复查，必要时停用</option></select></label><button class="primary">保存我的研究卡</button></form>${s.card ? `<div class="saved-research-card"><small>你的下一站</small><p>${esc(s.card)}</p><button class="secondary" data-action="download-card">下载我的研究卡 ↓</button></div>` : ""}${s.feedback ? `<p class="study-feedback" role="status">${esc(s.feedback)}</p>` : ""}${note("研究卡和探究记录保存在这台浏览器。想法随时可以修改。")}`;
}

export function createLearningUI({
  root,
  getProgress,
  onComplete,
  onResearch,
  onRead,
  onRoom,
  onVisit,
  onEffect,
}) {
  const sessions = new Map();
  let current = "origins",
    tab = "experiment";
  const session = () => {
    if (!sessions.has(current)) {
      const value = newSession(),
        saved = getProgress().research;
      if (current === "future" && saved) {
        const card = researchCard(saved);
        if (card.ok) {
          value.fields = card.fields;
          value.card = card.note;
        }
      }
      sessions.set(current, value);
    }
    return sessions.get(current);
  };
  function render() {
    const active = document.activeElement;
    let focusSelector = "";
    if (root.contains(active)) {
      if (active.id) focusSelector = "#" + CSS.escape(active.id);
      else if (active.dataset.action)
        focusSelector = `[data-action="${CSS.escape(active.dataset.action)}"]${active.dataset.value !== undefined ? `[data-value="${CSS.escape(active.dataset.value)}"]` : ""}`;
      else if (active.dataset.tab)
        focusSelector = `[data-tab="${CSS.escape(active.dataset.tab)}"]`;
      else if (active.form?.id)
        focusSelector = `#${CSS.escape(active.form.id)} button`;
    }
    const physicalRoom = roomById[resolveRoomId(current)];
    const room =
        current === "future"
          ? { ...physicalRoom, name: itemById.future.title }
          : physicalRoom,
      task = learningTasks[current],
      s = session(),
      done = getProgress().investigations;
    const previousStep = s.uiProgress?.step;
    s.uiProgress = experimentProgress(current, s);
    root
      .closest("dialog")
      ?.style.setProperty("--hall", physicalRoom?.color || "#9c7b4c");
    root.innerHTML = `<div class="folio-nav" aria-label="七座展厅">${rooms.map((r) => `<button data-room="${r.id}" class="${resolveRoomId(current) === r.id ? "current" : ""} ${done.includes(r.id) ? "done" : ""}" aria-label="${esc(r.name)}${done.includes(r.id) ? "，已完成探究" : ""}" ${resolveRoomId(current) === r.id ? 'aria-current="step"' : ""}><span>${done.includes(r.id) ? "✓" : r.n}</span><small>${esc(r.name)}</small></button>`).join("")}</div>
      <div class="folio-title"><div><small>${room.n} / ${task.label}</small><h2>${esc(room.name)}</h2></div><div class="lab-location"><span>${task.time}</span><button data-visit-study="${current}" class="text-button">前往该展厅 →</button></div></div>
      ${current === "industry" ? '<div class="exit-study"><span>第七厅出口 · 把问题留给未来</span><button class="secondary" data-room="future">填写我的研究卡 ↗</button></div>' : current === "future" ? '<div class="exit-study"><span>七厅探究之后，你想提出什么问题？</span><button class="secondary" data-room="industry">返回档案核对</button></div>' : ""}
      <div class="folio-tabs" role="tablist" aria-label="探究手册内容">${[
        ["experiment", "实验"],
        ["guide", "导读"],
        ["passport", "足迹"],
      ]
        .map(
          ([value, label]) =>
            `<button role="tab" id="study-tab-${value}" data-tab="${value}" aria-controls="study-panel" tabindex="${tab === value ? 0 : -1}" aria-selected="${tab === value}" class="${tab === value ? "active" : ""}">${label}</button>`,
        )
        .join("")}</div>
      <div class="folio-content" id="study-panel" role="tabpanel" aria-labelledby="study-tab-${tab}" tabindex="0">${tab === "guide" ? galleryGuideMarkup(galleryGuides[current]) : tab === "passport" ? passport() : `<div class="task-heading"><h3>${task.title}</h3><ol>${task.steps.map((x, i) => `<li class="${i === s.uiProgress.step ? "current" : i < s.uiProgress.step ? "past" : ""}" ${i === s.uiProgress.step ? 'aria-current="step"' : ""}><b>${i < s.uiProgress.step ? "✓" : i + 1}</b>${x}</li>`).join("")}</ol></div><div class="lab-instruction"><span>现在做什么</span><p>${s.uiProgress.next}</p></div><div class="experiment-body">${taskMarkup(current, s)}</div>${done.includes(current) ? `<div class="study-complete" role="status"><span>✓</span><div><b>这一站已经完成。</b><p>${task.lesson}</p></div></div>` : ""}`}</div>`;
    if (focusSelector)
      root.querySelector(focusSelector)?.focus({ preventScroll: true });
    if (
      tab === "experiment" &&
      s.feedback &&
      !s.uiProgress.questions.includes(s.feedbackFor)
    ) {
      const message = document.createElement("p");
      message.className = "study-feedback";
      message.setAttribute("role", "status");
      message.textContent = s.feedback;
      root.querySelector(".experiment-body").append(message);
    }
    if (
      tab === "experiment" &&
      previousStep !== undefined &&
      previousStep !== s.uiProgress.step
    ) {
      const next =
        root.querySelector(".study-question h3") ||
        root.querySelector(".lab-instruction");
      next.setAttribute("tabindex", "-1");
      next.focus({ preventScroll: true });
    }
    const content = root.querySelector('.folio-content');
    s.pageByTab ||= {};
    if (tab === 'experiment') {
      const body = root.querySelector('.experiment-body');
      const tools = [], questions = [], notes = [];
      for (const node of [...body.children]) {
        if (node.matches('.study-question')) questions.push(node);
        else if (node.matches('.model-note, .generation-stages')) notes.push(node);
        else tools.push(node);
      }
      const left = document.createElement('div'), right = document.createElement('div');
      left.className = 'experiment-object'; right.className = 'experiment-actions';
      const feedback = tools.filter(node => node.matches('.study-feedback'));
      feedback.forEach(node => tools.splice(tools.indexOf(node), 1));
      if (['learning', 'games'].includes(current)) {
        const layout = tools.shift(); left.append(layout.children[0]); right.append(layout.children[0]);
        left.append(...tools);
      } else if (current === 'generation') {
        left.append(...tools.splice(0, 2)); right.append(...tools);
      } else if (current === 'frontiers') {
        left.append(...tools.splice(0, 3)); right.append(...tools);
      } else if (current === 'industry') {
        left.append(tools.shift()); right.append(...tools);
      } else if (current === 'future') {
        left.append(...tools);
      } else left.append(...tools);
      const activeQuestion = questions.pop();
      if (activeQuestion) right.append(activeQuestion);
      right.append(...feedback);
      const experiment = document.createElement('div');
      experiment.className = 'core-experiment core-' + current;
      experiment.append(left, right);
      const pages = [{ label: '动手实验', nodes: [experiment] },
        { label: '任务步骤与实现边界', nodes: [content.querySelector('.task-heading'), content.querySelector('.lab-instruction'), ...notes] },
        ...questions.map(node => ({ label: '回看判断 · ' + node.querySelector('h3').textContent, nodes: [node] }))];
      const complete = content.querySelector('.study-complete');
      if (complete) pages.push({ label: '本次发现', nodes: [complete] });
      const initial = previousStep !== s.uiProgress.step ? 0 : s.pageByTab[tab] || 0;
      folioPages(content, pages, { initial, onSelect: index => { s.pageByTab[tab] = index; } });
    } else if (tab === 'guide') {
      const pages = [];
      for (const section of [...content.children]) {
        const title = section.querySelector('h3,h2')?.textContent || '导读';
        const records = section.querySelector('.history-trail, .reading-route, .evidence-grid, .glossary');
        if (!records) pages.push({ label: title, nodes: [section] });
        else for (const record of [...records.children]) {
          const shell = records.cloneNode(false);
          shell.append(record);
          pages.push({ label: title, className: 'guide-section', nodes: [shell] });
        }
      }
      folioPages(content, pages, { initial: s.pageByTab[tab] || 0, onSelect: index => { s.pageByTab[tab] = index; } });
    } else {
      const pages = [...content.querySelectorAll('.passport-pages > button')].map(node => ({ label: node.querySelector('b').textContent, nodes: [node] }));
      pages.unshift({ label: '参观足迹', nodes: [content.querySelector('.passport-opening')] });
      folioPages(content, pages, { initial: s.pageByTab[tab] || 0, onSelect: index => { s.pageByTab[tab] = index; } });
    }
  }
  function passport() {
    const done = getProgress().investigations;
    return `<div class="passport-opening"><div class="passport-seal">${done.length}<small>/ ${Object.keys(learningTasks).length}</small></div><div><span class="folio-eyebrow">足迹</span><h2>带着问题，走过历史。</h2><p>这里记录你在七座展厅完成的实验和研究卡。它不是成绩，只是一路走来的足迹。</p></div></div><div class="passport-pages">${rooms.map((r) => `<button data-room="${r.id}"><span>${done.includes(r.id) ? "✓" : r.n}</span><div><b>${r.name}</b><small>${learningTasks[r.id].lesson}</small></div><em>${done.includes(r.id) ? "再做一次" : "前往 →"}</em></button>`).join("")}</div>`;
  }
  function finish(message, effect = {}) {
    session().feedback = message;
    if (!getProgress().investigations.includes(current)) onComplete(current);
    onEffect?.(current, { complete: true, ...effect });
  }
  function runRule(input) {
    const s = session();
    s.input = String(input).slice(0, 160);
    const reply = elizaReply(s.input);
    s.rule = reply.rule;
    s.reply = reply.text;
    if (s.input.trim() && !s.inputs.includes(s.input.trim()))
      s.inputs.push(s.input.trim());
    onEffect?.(current, { value: Math.min(1, s.inputs.length / 3) });
    render();
  }
  root.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    if (button.dataset.room) {
      onRoom(button.dataset.room);
      return;
    }
    if (button.dataset.visitStudy) {
      onVisit(button.dataset.visitStudy);
      return;
    }
    if (button.dataset.read) {
      onRead(button.dataset.read);
      return;
    }
    if (button.dataset.tab) {
      tab = button.dataset.tab;
      render();
      root.closest("dialog").scrollTop = 0;
      return;
    }
    const s = session(),
      action = button.dataset.action,
      value = button.dataset.value;
    if (!action) return;
    s.selections ??= {};
    if (button.classList.contains("study-choice")) s.selections[action] = value;
    if (action === "origin-observe") s.observed = true;
    s.feedbackFor = action;
    if (
      action === "frontier-clue" &&
      evidenceCards.some((c) => c.id === value)
    ) {
      s.evidence = [...new Set([...s.evidence, value])];
      s.feedback = "";
      onEffect?.(current, { value: s.evidence.length / 4 });
    }
    if (action === "frontier-check") {
      if (s.evidence.includes("record")) {
        s.checkedRecord = true;
        s.feedback =
          "盒子上的 S–03 和入库记录对上了。再比较一下其他线索，然后作判断。";
      } else s.feedback = "先打开“文字编号”这条线索，再核对眼前的盒子。";
    }
    if (action === "frontier-answer") {
      const result = evaluateEvidenceCase({
        evidence: s.evidence,
        choice: value,
        checked: s.checkedRecord,
      });
      if (result.ok) finish(result.message);
      else s.feedback = result.message;
    }
    if (action === "origin-answer") {
      s.answers.origin = value;
      s.feedback =
        value === "uncertain"
          ? "两句话确实说明不了谁更聪明。接下来，设计一个更可靠的测试。"
          : "写得美令人印象深刻，但只凭这一点还不能下结论。";
    }
    if (action === "origin-evidence") {
      if (value === "repeat")
        finish(
          "这是一个能重复、能比较的测试。图灵也是这样做的：先说清楚要观察什么。",
        );
      else s.feedback = "长短只是表面，一次回答说明不了它的本事，换一个办法。";
    }
    if (action === "rule-example") {
      runRule(value);
      return;
    }
    if (action === "rule-answer") {
      if (s.inputs.length < 2)
        s.feedback = "先试至少两种不同的说法，看看它怎么回。";
      else if (value === "pattern")
        finish("这就是规则的漏洞：抓住关键词，不等于读懂整句话。");
      else s.feedback = "看看第二步：它其实只是在找词、套句式。";
    }
    if (action === "train") {
      const training = lessonExamples(s.counterexample),
        result = fitTrainingExamples(s.model, training);
      s.model = result.model;
      s.epochs += result.epochs;
      s.feedback =
        classificationScore(s.model, training) === 1
          ? `学了${result.epochs}轮，练习题已全部答对。现在用两片新叶子检验它。`
          : `学了${result.epochs}轮，仍有练习题答错。可以继续调整，也别忘了用新叶子检验。`;
      onEffect?.(current, {
        value: classificationScore(s.model, trainingLeaves),
      });
    }
    if (action === "test-leaves") {
      s.showTests = true;
      s.checked = true;
      s.feedback =
        "虚线圈是它从未学过的新叶子。练习题和新题的正确率，可能并不相同。";
    }
    if (action === "counterexample") {
      s.counterexample = true;
      s.checked = false;
      for (let i = 0; i < 6; i++)
        s.model = trainEpoch(s.model, lessonExamples(true));
      s.epochs += 6;
      s.feedback =
        "补充了两片形状不同的叶子，又学了六轮。再看原来的新叶子：补充例子，不一定总能变好。";
      onEffect?.(current, { value: classificationScore(s.model, testLeaves) });
    }
    if (action === "learn-answer") {
      if (!s.epochs || !s.checked || !s.counterexample)
        s.feedback =
          "先让它学习、用新叶子检验，再补充不同的例子，看看分界线怎样变化。";
      else if (value === "new")
        finish(
          "你用新例子检验了模型，也观察了补充例子后的变化。真实世界的数据，还会带来更多新问题。",
        );
      else
        s.feedback = "比一比两个正确率：熟悉的题做对了，不代表新题也能做对。";
    }
    if (action === "explore") {
      s.search = exploreBranch(s.search, Number(value));
      onEffect?.(current, {
        value: s.search.total / 12,
        branch: Number(value),
      });
    }
    if (action === "reset-search") {
      s.search = emptySearch();
      s.answers.search = null;
      s.feedback = "";
    }
    if (action === "search-answer") {
      s.answers.search = value;
      s.feedback =
        value === "uncertain"
          ? "试的次数少，结果只能作参考。接下来，把两场真实的比赛分清楚。"
          : "只试一次，说明不了全部可能。把机会分给不同的方向试试。";
    }
    if (action === "match-answer") {
      if (
        s.search.total < 6 ||
        s.search.visits.filter(Boolean).length < 2 ||
        s.answers.search !== "uncertain"
      )
        s.feedback = "先探索至少两个方向、共六次，再回答“赢一次够不够”。";
      else if (value === "lee")
        finish(
          "正确：2016年对李世石，2017年对柯洁。沙盘里的模拟只是练习，不能当作真实比赛的证据。",
        );
      else
        s.feedback = "柯洁参加的是2017年乌镇的三局棋，可以打开相关档案核对。";
    }
    if (action === "sample") {
      s.feedback = "";
      const c = tokenContexts[s.context],
        p = tokenProbabilities(c.probabilities, s.temperature);
      s.tokens.push(c.tokens[chooseToken(p)]);
      s.temperatures.add(s.temperature.toFixed(2));
      onEffect?.(current, {
        value: s.tokens.length / 8,
        text: c.prefix + s.tokens.at(-1),
      });
    }
    if (action === "generation-answer") {
      if (s.tokens.length < 3 || s.temperatures.size < 2)
        s.feedback = "先在“稳妥”和“多样”两种设置下各试一次，一共至少抽三次。";
      else if (value === "verify")
        finish(
          "你看到了模型选词的多样性，也记住了要核对事实：生成和查证，需要一起用。",
        );
      else s.feedback = "可能性高，只说明模型倾向这样接，不能证明它是事实。";
    }
    if (action === "reveal") s.revealed = true;
    if (action === "evidence-answer") {
      const c = claims[s.claim];
      if (value === c.answer) {
        if (!s.solved.includes(s.claim)) s.solved.push(s.claim);
        s.feedback = c.explanation;
      } else
        s.feedback =
          "再对照一下说法和证据。留意“永远”“随便”这样的词，是否把话说得太满。";
    }
    if (action === "next-claim") {
      if (s.claim < 2) {
        s.claim++;
        s.revealed = false;
        s.feedback = "";
      } else
        finish("三次判断都已完成。不同机构的道路，还可以继续在档案里比较。");
    }
    if (action === "download-card") {
      const blob = new Blob(
          [
            `奇点 · 思想之庭\n我的未来研究卡\n\n${s.card}\n\n这是我的一个想法，还需要调查和检验。`,
          ],
          { type: "text/plain;charset=utf-8" },
        ),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "我的未来研究卡.txt";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    render();
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const s = session();
    if (e.target.id === "rule-lab-form")
      runRule(root.querySelector("#rule-lab-input").value);
    if (e.target.id === "research-card-form") {
      const values = Object.fromEntries(new FormData(e.target));
      s.fields = values;
      const result = researchCard(values);
      if (result.ok) {
        s.card = result.note;
        const saved = onResearch(result.fields);
        finish(
          saved
            ? "研究卡已保存。下一步，可以去观察身边真实的需要，和同学、老师讨论怎样检验。"
            : "研究卡先保留在这次参观里；浏览器没有允许长期保存，记得下载带走。",
          { text: result.note },
        );
      } else s.feedback = result.message;
      render();
    }
  });
  root.addEventListener("input", (e) => {
    const s = session(),
      target = e.target;
    if (target.dataset.model) {
      const value = Number(target.value);
      if (target.dataset.model === "bias") s.model.bias = value;
      else s.model.weights[target.dataset.model === "wx" ? 0 : 1] = value;
      root.querySelector("[data-visual]").innerHTML = leafGraph(s);
      root.querySelector("[data-metrics]").innerHTML = learningMetrics(s);
    }
    if (target.id === "token-temperature") {
      s.temperature = Number(target.value);
      root.querySelector("[data-visual]").innerHTML = tokenVisual(s);
    }
    if (target.id === "rule-lab-input") s.input = target.value;
    if (target.form?.id === "research-card-form")
      s.fields[target.name] = target.value;
  });
  root.addEventListener("change", (e) => {
    if (e.target.id === "token-context") {
      const s = session();
      s.context = Number(e.target.value);
      s.tokens = [];
      s.temperatures.clear();
      render();
    }
  });
  root.addEventListener("keydown", (e) => {
    if (
      e.target.getAttribute("role") !== "tab" ||
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
    )
      return;
    e.preventDefault();
    const tabs = ["experiment", "guide", "passport"],
      index = tabs.indexOf(tab);
    tab =
      e.key === "Home"
        ? tabs[0]
        : e.key === "End"
          ? tabs.at(-1)
          : tabs[
              (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
                tabs.length
            ];
    render();
    root.querySelector(`#study-tab-${tab}`).focus();
    root.closest("dialog").scrollTop = 0;
  });
  return {
    open(id, mode = "experiment") {
      if (!Object.hasOwn(learningTasks, id))
        throw new Error("Unknown learning room");
      current = id;
      tab = mode;
      render();
      root.closest("dialog").scrollTop = 0;
    },
    refresh: render,
  };
}
