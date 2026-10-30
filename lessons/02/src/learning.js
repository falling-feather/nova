/** Deterministic teaching models. These are not original historical programs. */
export const learningTasks = Object.freeze({
  origins: {
    title: "隔着屏幕，能认出谁？",
    label: "模仿游戏",
    time: "约 2 分钟",
    steps: ["读两段对话", "说出你的判断", "设计一个更好的测试"],
    lesson: "回答像人，只是调查的开始。",
  },
  rules: {
    title: "拆开机器的回答",
    label: "规则实验室",
    time: "约 3 分钟",
    steps: ["输入一句话", "看它用了哪条规则", "找出它会出错的地方"],
    lesson: "会回话，不等于听懂了。",
  },
  learning: {
    title: "让一条线学会分类",
    label: "学习工作台",
    time: "约 3 分钟",
    steps: ["看带答案的叶子", "调整分界线，或让它自己学", "用新叶子检验它"],
    lesson: "学习靠例子；学会了没有，要用没见过的例子来检验。",
  },
  games: {
    title: "下一步，值得探索哪里？",
    label: "搜索沙盘",
    time: "约 3 分钟",
    steps: ["分配十二次尝试", "比较三条路的结果", "回到真实的比赛"],
    lesson: "试得越多越可靠；试得越少，结论越要留有余地。",
  },
  generation: {
    title: "一句话，怎样接下去？",
    label: "生成工作台",
    time: "约 3 分钟",
    steps: ["选一句开头", "调节“稳妥”与“多样”", "把生成和事实分开"],
    lesson: "模型挑的是可能性高的词；可能性高，不等于是真的。",
  },
  industry: {
    title: "让证据决定结论",
    label: "档案核对",
    time: "约 3 分钟",
    steps: ["读一句说法", "打开证据", "判断它站不站得住"],
    lesson: "先看证据和时间，再下结论。",
  },
  frontiers: {
    title: "几条线索，能找到它？",
    label: "多模态证据台",
    time: "约 3 分钟",
    steps: ["打开不同的线索", "看看还剩哪些可能", "核对编号再判断"],
    lesson: "几种线索互相核对；信息不够时，可以暂不下结论。",
  },
  future: {
    title: "写下你的下一站",
    label: "未来研究卡",
    time: "约 2 分钟",
    steps: ["想好要帮助谁", "说清一个具体问题", "想好怎样检验"],
    lesson: "你可以提出问题，也可以设计检验答案的方法。",
  },
});

export const evidenceCards = Object.freeze([
  {
    id: "image",
    label: "照片线索",
    text: "一张照片：一个绿色、椭圆形的小东西。光看样子，可能是叶子，也可能是种子。",
    candidates: ["leaf", "seed"],
  },
  {
    id: "sound",
    label: "声音记录（文字稿）",
    text: "轻轻摇一摇盒子，听到硬硬的小东西碰撞的声音。种子或贝壳都可能这样响。",
    candidates: ["seed", "shell"],
  },
  {
    id: "record",
    label: "文字编号",
    text: "入库记录 S-03：绿色种子标本。还要核对眼前盒子上的编号是不是一样。",
    candidates: ["seed"],
  },
]);
export function remainingCandidates(ids = []) {
  const selected = new Set(Array.isArray(ids) ? ids : []);
  return ["leaf", "seed", "shell"].filter((id) =>
    evidenceCards
      .filter((c) => selected.has(c.id))
      .every((c) => c.candidates.includes(id)),
  );
}
export function evaluateEvidenceCase({ evidence = [], choice, checked = false } = {}) {
  const selected = evidenceCards.filter(
    (c) => Array.isArray(evidence) && evidence.includes(c.id),
  );
  if (selected.length < 2)
    return { ok: false, message: "先打开至少两种线索，比一比它们分别说明了什么。" };
  if (!selected.some((c) => c.id === "record") || !checked)
    return {
      ok: false,
      message: "线索已经帮你排除了一些可能。再打开文字记录，核对一下盒子上的编号。",
    };
  if (choice !== "seed")
    return {
      ok: false,
      message:
        choice === "uncertain"
          ? "先不下结论也可以。不过现在编号和线索都对上了，可以作出有依据的判断了。"
          : "这个答案和核对过的线索对不上，再比较一次。",
    };
  return {
    ok: true,
    message: "你用几种线索排除了错误答案，又核对了编号。真正的人工智能工具，也需要这样检查输入和结果。",
  };
}

export const trainingLeaves = Object.freeze([
  { id: "r1", x: 2, y: 2, label: 0 },
  { id: "r2", x: 5, y: 3, label: 0 },
  { id: "r3", x: 7, y: 5, label: 0 },
  { id: "l1", x: 2, y: 6, label: 1 },
  { id: "l2", x: 4, y: 8, label: 1 },
  { id: "l3", x: 5, y: 9, label: 1 },
]);
export const testLeaves = Object.freeze([
  { id: "new1", x: 6, y: 9, label: 1 },
  { id: "new2", x: 8, y: 7, label: 0 },
]);
const contrastingLeaves = Object.freeze([
  { id: "wide", x: 9, y: 8, label: 0 },
  { id: "long", x: 6, y: 8, label: 1 },
]);
export function lessonExamples(expanded = false) {
  return expanded ? [...trainingLeaves, ...contrastingLeaves] : trainingLeaves;
}
/** @param {{weights:number[],bias:number}} model @param {{x:number,y:number}} sample */
export function classify(model, sample) {
  return (model.weights[0] * sample.x) / 10 +
    (model.weights[1] * sample.y) / 10 +
    model.bias >=
    0
    ? 1
    : 0;
}
export function trainEpoch(model, samples) {
  const next = { weights: [...model.weights], bias: model.bias };
  for (const sample of samples) {
    const correction = (sample.label - classify(next, sample)) * 0.5;
    next.weights[0] += (correction * sample.x) / 10;
    next.weights[1] += (correction * sample.y) / 10;
    next.bias += correction;
  }
  return next;
}
export function classificationScore(model, samples) {
  return samples.length
    ? samples.filter((p) => classify(model, p) === p.label).length /
        samples.length
    : 0;
}
export function fitTrainingExamples(model, samples) {
  let next = { weights: [...model.weights], bias: model.bias },
    epochs = 0;
  if (!samples.length) return { model: next, epochs };
  do {
    next = trainEpoch(next, samples);
    epochs++;
  } while (epochs < 30 && classificationScore(next, samples) < 1);
  return { model: next, epochs };
}
export function tokenProbabilities(base, temperature = 1) {
  const t = Number.isFinite(temperature)
    ? Math.max(0.35, Math.min(1.8, temperature))
    : 1;
  const values = base.map((p) => Math.pow(p, 1 / t)),
    sum = values.reduce((a, b) => a + b, 0);
  return values.map((p) => p / sum);
}
export function chooseToken(probabilities, random = Math.random()) {
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (random < cumulative) return i;
  }
  return probabilities.length - 1;
}
export const searchCandidates = Object.freeze([
  {
    name: "守住左侧",
    x: 3,
    y: 3,
    outcomes: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
  },
  {
    name: "争取中间",
    x: 5,
    y: 4,
    outcomes: [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
  },
  {
    name: "扩展右侧",
    x: 6,
    y: 6,
    outcomes: [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
  },
]);
export function emptySearch() {
  return { visits: [0, 0, 0], wins: [0, 0, 0], total: 0 };
}
export function exploreBranch(state, index) {
  if (!Number.isInteger(index) || index < 0 || index > 2 || state.total >= 12)
    return state;
  const next = {
    visits: [...state.visits],
    wins: [...state.wins],
    total: state.total + 1,
  };
  next.wins[index] += searchCandidates[index].outcomes[next.visits[index]];
  next.visits[index]++;
  return next;
}
export function researchCard({
  who = "",
  problem = "",
  check = "",
  risk = "",
}) {
  who = String(who).trim().slice(0, 45);
  problem = String(problem).trim().slice(0, 95);
  if (who.length < 2 || problem.length < 4)
    return { ok: false, message: "先写清楚你想帮助谁，以及一个具体的问题。" };
  if (check !== "compare")
    return {
      ok: false,
      message: "只看宣传和感觉还不够。试试比较使用前后的变化，也听听使用的人怎么说。",
    };
  if (risk !== "review")
    return {
      ok: false,
      message: "模型会出错。把“请人复查、保护个人信息、必要时停用”也写进你的设计里。",
    };
  return {
    ok: true,
    fields: { who, problem, check, risk },
    note: `我希望帮助${who}，解决“${problem}”的问题。我会比较使用前后的变化，听听使用者的感受；保护个人信息，请人复查，必要时停止使用。`.slice(
      0,
      280,
    ),
  };
}
