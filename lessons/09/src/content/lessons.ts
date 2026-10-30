// 五关、二十五个环节。每一步都靠界面事件判断是否完成，园园的回答全部来自浏览器里实时运行的模型。
import { mark, type Ev, type Flags, type Lesson } from '../core/course.ts';

const asked = (ev: Ev, q?: string) => ev.type === 'answered' && (!q || ev.q === q);
const askedIn = (ev: Ev, mode: string, q?: string) =>
  ev.type === 'answered' && ev.mode === mode && (!q || ev.q === q);
const right = (ev: Ev, q?: string) =>
  ev.type === 'answered' && ev.verdict === 'right' && (!q || ev.q === q);
const chose = (key: string) => (ev: Ev) => ev.type === 'choice' && ev.key === key && ev.correct;
export const frequencyScore = (f: Flags, tier: 'high' | 'low') => ({
  total: Array.isArray(f[tier + 'Observed']) ? (f[tier + 'Observed'] as string[]).length : 0,
  right: Array.isArray(f[tier + 'Correct']) ? (f[tier + 'Correct'] as string[]).length : 0,
});
const frequencyDifference = (f: Flags) => {
  const high = frequencyScore(f, 'high'), low = frequencyScore(f, 'low');
  return high.total && low.total ? high.right / high.total - low.right / low.total : 0;
};

const SHOW = '春季花展是哪天？';
const PITCHER = '瓶子草在哪里？';
const BOARDWALK = '竹林木栈道在哪里？';
const GLASS = '热带温室几点关门？';
const TOUR = '免费讲解是什么时候？';
const WRONG_NOTE = '春季花展在4月19日（周日）举行。';
export const MORNING_NOTES = [
  '竹林木栈道在竹林小径北头。',
  '茶室早上9点开门。',
  '自然观察课的时间是每周六上午9点半。',
  '种子交换会在花展广场举办。',
  '捕蝇草的叶片像一个小夹子，小虫连续碰到里面的感觉毛两次，夹子就会合上。',
  '蝴蝶园门票每张15元。',
  '观鸟活动的时间是每周日早上7点。',
  '荷叶表面有许多细小的突起，水珠落上去会滚来滚去，不会把叶子弄湿。',
  '植物绘画课在科普馆举办。',
  '科普馆下午4点半关门。',
  '仙人掌身上的刺其实是变了样子的叶子，能帮它减少水分蒸发。',
  '盆景展在4月26日（周日）举行。',
  '园内小火车票每张8元。',
  '猪笼草的叶子末端长着一个小笼子，笼里的液体能把掉进去的小虫慢慢消化。',
  '郁金香展在4月20日（周一）举行。',
  '含羞草的叶子被碰一下就会合起来，过一会儿又会慢慢张开。',
  '标本馆上午9点开门。',
  '除了导盲犬，园里不能带宠物进来。',
  '睡莲的花白天开放，傍晚会慢慢合上。',
  '园里的花和果子都不能摘。',
  '免费讲解的举办地点是问讯亭门口。',
  '问讯亭可以免费借轮椅和婴儿车。',
];
export const POSITION_FILLERS = [
  MORNING_NOTES[1],
  MORNING_NOTES[2],
  MORNING_NOTES[3],
  MORNING_NOTES[5],
  MORNING_NOTES[6],
  MORNING_NOTES[8],
];
export const LONG_NOTICE = {
  title: '园长的话：竹林里的新路',
  body: '各位游客：经过两个月的施工，竹林里新修的木栈道已经在4月12日正式开通啦！木栈道全长两百多米，用的是防滑的竹木板，下雨天走也很安心。它就在竹林小径北头，从兰花馆后面一路往北走就能看到入口。木栈道两边种了箭竹和毛竹，春天还能看见刚冒头的竹笋。请大家在木栈道上不要奔跑，也不要攀折竹子。',
  candidates: [
    {
      text: '竹林木栈道在竹林小径北头。',
      ok: true,
      why: '留下了游客最需要的“在哪里”，句子短，窗口放得下。',
    },
    {
      text: '竹林里的木栈道开通了。',
      ok: false,
      why: '开通了，可是在哪里呢？游客要问的正好被删掉了。',
    },
    {
      text: '经过两个月的施工，竹林里新修的木栈道已经在4月12日正式开通啦，木栈道全长两百多米，用的是防滑的竹木板。',
      ok: false,
      why: '太长了，窗口很快就被占满，关键的地点反而没写。',
    },
  ],
};
export const STAMP_QUESTIONS = [
  '银杏的叶子什么时候变黄？',
  '茶室的招牌点心是什么？',
  '热带温室在哪里？',
  '瓶子草有什么特点？',
  '植物园几点关门？',
];
export const TRIAGE: { who: import('./cast.ts').CastId; q: string }[] = [
  { who: 'feng', q: SHOW },
  { who: 'susu', q: '学生票多少钱？' },
  { who: 'he', q: PITCHER },
  { who: 'li', q: BOARDWALK },
  { who: 'lin', q: TOUR },
  { who: 'zhao', q: '月季多久浇一次水？' },
  { who: 'wang', q: '停车场在哪里？' },
  { who: 'guest', q: '植物园几点关门？' },
  { who: 'doudou', q: '可以带小狗进来吗？' },
  { who: 'lin', q: '荷花什么时候开花？' },
];
export const HANDOVER = [
  {
    id: 'source',
    text: '先看本次输入：有没有便签，送入了哪些资料；再对照原文核实回答。',
    good: true,
  },
  { id: 'date', text: '看日期：园园的记忆停在春分，之后的事要靠今天的公告和资料。', good: true },
  { id: 'ink', text: '墨迹只表示模型选词的倾向；浓墨也可能写错，要用可靠资料核对。', good: true },
  { id: 'window', text: '便签要短、要准，窗口满了最早的会被挤掉。', good: true },
  { id: 'archive', text: '资料要维护：过期的撤下，写错的改正。', good: true },
  { id: 'human', text: '资料里没有、拿不准的，交给工作人员。', good: true },
  { id: 'always', text: '园园什么都知道，直接照它说的告诉游客就行。', good: false },
  { id: 'retrain', text: '只要多贴几张便签，园园就会永远记住。', good: false },
];

/** 资料馆里改写某一句时，给出的参考写法（学生也可以自己改）。 */
export const SUGGEST: Record<string, string> = {
  '10:0': '免费讲解的时间是每天上午10点和下午2点。',
  '15:0': '仙人掌很耐旱，春天和夏天两三周浇一次水就够了。',
};

export const LESSONS: Lesson[] = [
  // ---------------------------------------------------------------- 第一关 记忆之书（4月14日）
  {
    id: '01',
    level: 1,
    title: '第一位游客',
    question: '园园没查任何资料就能回答，它的知识从哪来？',
    intro: [
      {
        who: 'director',
        text: '欢迎来问讯亭值班！窗口里的园园会回答游客的问题。它不联网，也不会自己去园里看。',
      },
      {
        who: 'director',
        text: '它知道的一切，都在训练时读过的材料里，那本“记忆之书”在春分（3月20日）就封存了。先接待三位游客吧。',
      },
    ],
    modes: ['memory'],
    tools: ['check'],
    visitors: [
      { who: 'zhao', q: '月季多久浇一次水？' },
      { who: 'he', q: '猪笼草有什么特点？' },
      { who: 'lin', q: '洗手间在哪里？' },
    ],
    observe: (ev, f) => {
      if (ev.type === 'answered') mark(f, 'asked', ev.q);
      if (ev.type === 'checked') mark(f, 'checked', ev.q);
    },
    steps: [
      {
        text: '请园园回答本课三位游客',
        ready: (f) => Array.isArray(f.asked) && f.asked.length >= 3,
      },
      {
        text: '至少核对一张回答小票，并记录自己的判断',
        ready: (f) => Array.isArray(f.checked) && f.checked.length >= 1,
      },
    ],
    debrief:
      '园园回答时没有去查任何东西。这些知识来自它训练时读过的材料，影响了模型内部许多数字（参数）。记忆之书是训练材料的教学索引，模型并不是在翻一份藏起来的答案表。',
  },
  {
    id: '02',
    level: 1,
    title: '记得牢与记不清',
    question: '读过很多次和在材料里很少出现的事，它记得一样牢吗？',
    intro: [
      {
        who: 'director',
        text: '掀开问讯亭的侧板，能看到园园的记忆之书。每件事旁边都写着它在训练时读到过几次。',
      },
    ],
    modes: ['memory'],
    tools: ['book'],
    view: 'inside',
    observe: (ev, f) => {
      if (ev.type !== 'book-asked' || (ev.tier !== 'high' && ev.tier !== 'low')) return;
      mark(f, ev.tier + 'Observed', ev.fact);
      const key = ev.tier + 'Correct';
      if (ev.verdict === 'right') mark(f, key, ev.fact);
      else f[key] = (Array.isArray(f[key]) ? f[key] as string[] : []).filter((id) => id !== ev.fact);
    },
    steps: [
      { text: '打开记忆之书', test: (ev) => ev.type === 'book-opened' },
      {
        text: '挑两件不同的“读过很多次”的事，请园园回答',
        ready: (f) => frequencyScore(f, 'high').total >= 2,
      },
      {
        text: '再挑两件不同的“在材料里很少出现”的事，请园园回答',
        ready: (f) => frequencyScore(f, 'low').total >= 2,
      },
      {
        text: '说说你的发现',
        quiz: {
          key: '02-strong',
          prompt: '哪句话符合这次四条事实的观察？',
          options: [
            {
              label: '本次经常出现的这组，答对比例更高',
              correct: (f) => frequencyDifference(f) > 0,
              why: '只比较这次记录的结果；频次可能影响学习，但内容难度等因素也在变化，不能保证读得多就答对。',
            },
            {
              label: '本次较少出现的这组，答对比例更高',
              correct: (f) => frequencyDifference(f) < 0,
              why: '以当前小票为准，少见事实也可能答对。不能把训练频次直接当作正确保证。',
            },
            { label: '结果相同，或样本太少，还不足以确定频次的效果', correct: true, why: '这是有效结论。每组只有两条不同内容的事实；即使比例不同，也不能单凭这次观察断言频次造成了差异。' },
          ],
        },
      },
    ],
    debrief: '训练频次可能影响学习，也受到事实内容、训练方式等因素影响。以这次真实回答为准：少见事实可能答对，经常出现的也可能答错。四条观察不能证明因果关系，参数里的知识仍需核对。',
  },
  {
    id: '03',
    level: 1,
    title: '封存之后',
    question: '春分以后才发生的事，它知道吗？',
    intro: [
      { who: 'feng', text: '我是来拍花展的！公告栏上贴了好多新通知，我看不过来，问问园园吧。' },
    ],
    modes: ['memory'],
    tools: ['check', 'notices'],
    visitors: [
      { who: 'feng', q: SHOW },
      { who: 'he', q: PITCHER },
      { who: 'li', q: BOARDWALK },
      { who: 'susu', q: '瓶子草有什么特点？' },
    ],
    observe: (ev, f) => {
      if (ev.type === 'answered') mark(f, 'asked', ev.q);
      if (ev.type === 'checked') {
        mark(f, 'checked', ev.q);
        if (ev.verdict === 'wrong') f.sawWrong = true;
      }
    },
    steps: [
      { text: '请园园回答两位游客', ready: (f) => Array.isArray(f.asked) && f.asked.length >= 2 },
      {
        text: '对照公告，核对两个不同问题的回答',
        ready: (f) => Array.isArray(f.checked) && f.checked.length >= 2,
      },
      {
        text: '从实际核对中找出一个流畅但错误的回答',
        ready: (f) => !!f.sawWrong,
        hint: '若这两次都对，再询问一项春分之后的新变化。',
      },
    ],
    debrief:
      '封存之后的事，园园一次也没读过。它可能照着读过的句式写出错误答案。是否答对，要看你刚才的核对结果；其他模型也可能选择说不知道。',
  },
  {
    id: '04',
    level: 1,
    title: '看看墨迹',
    question: '墨色很浓，就一定答对吗？',
    intro: [
      {
        who: 'director',
        text: '打开小票的墨迹，看看园园在当前上下文里有多倾向选择某个词元。颜色浓，只说明它更倾向这样写；事实对不对，还得核对。',
      },
    ],
    modes: ['memory'],
    tools: ['ink', 'check'],
    visitors: [
      { who: 'he', q: PITCHER },
      { who: 'zhao', q: '银杏的叶子什么时候变黄？' },
    ],
    steps: [
      { text: '请园园回答，并打开小票上的“墨迹”', test: (ev) => ev.type === 'ink-on' },
      { text: '点一个词元看它的生成概率，再与核对结果比较', test: (ev) => ev.type === 'ink-tap' },
      {
        text: '说说墨迹告诉你什么',
        quiz: {
          key: '04-ink',
          prompt: '墨迹深浅告诉我们什么？',
          options: [
            {
              label: '模型此刻选择这个词的倾向，不是答案正确率',
              correct: true,
              why: '生成概率取决于上下文与已写出的词。浓墨也可能写错，浅墨也可能写对；要另找证据核实。',
            },
            {
              label: '打印机没墨了',
              correct: false,
              why: '同一张小票上有浓有淡，墨色是按园园的把握画的。',
            },
            {
              label: '园园在故意骗人',
              correct: false,
              why: '这些数字描述模型的计算结果，不能据此判断它有欺骗意图。',
            },
          ],
        },
      },
    ],
    debrief:
      '墨色对应词元的生成概率，不是事实正确率。核对资料才帮助我们知道它答得对不对：浓墨和流畅语气都不能当成证据。',
  },
  {
    id: '05',
    level: 1,
    title: '该不该相信',
    question: '怎样判断园园的回答能不能信？',
    intro: [
      {
        who: 'director',
        text: '上午的五张小票都在这儿了。先挑至少三张对照园区资料，再给五张小票盖章：核对一致、还需核对，或核对发现不符。',
      },
    ],
    modes: ['memory'],
    tools: ['ink', 'book'],
    special: 'stamps',
    observe: (ev, f) => {
      if (ev.type === 'stamp') mark(f, 's', ev.q);
      if (ev.type === 'stamp-checked') mark(f, 'checked', ev.q);
    },
    steps: [
      {
        text: '给五张小票盖章，并至少查看三张的核对依据',
        ready: (f) =>
          Array.isArray(f.s) &&
          f.s.length >= 5 &&
          Array.isArray(f.checked) &&
          f.checked.length >= 3,
      },
      {
        text: '揭开答案：至少四张判断与已看到的证据相符',
        test: (ev) => ev.type === 'reveal' && ev.key === '05' && ev.ok >= 4,
        hint: '先在每张小票上点“打开原文并判断”。没读过原文的可标“还需核对”，读过的按原文判断。',
      },
    ],
    debrief:
      '训练次数、封存日期和生成概率提供调查线索，不能替代事实核查。你已经把每张小票与依据分开记录，值班日志的第一页写好了。',
  },
  // ---------------------------------------------------------------- 第二关 便签窗口（4月15日）
  {
    id: '06',
    level: 2,
    title: '贴一张便签',
    question: '当面告诉它一件事，会发生什么？',
    intro: [
      {
        who: 'feng',
        text: '花展已经改期，可园园的记忆还停在春分。你能把今天的通知交给它，让我别白跑一趟吗？',
      },
    ],
    modes: ['notes'],
    tools: ['notices', 'check'],
    visitors: [{ who: 'feng', q: SHOW }],
    steps: [
      {
        text: '在公告栏找到花展改期的通知，抄成便签贴到窗口上',
        test: (ev) => ev.type === 'note-added' && ev.text.includes('春季花展'),
      },
      { text: '按铃，请园园再回答一次', test: (ev) => right(ev, SHOW) },
    ],
    debrief: '窗口里的便签会和问题一起送进园园的“眼睛”，它马上照着便签回答。这就是上下文。',
  },
  {
    id: '07',
    level: 2,
    title: '下一位游客',
    question: '便签会一直有效吗？',
    intro: [{ who: 'susu', text: '我也想问花展的事，听说改日子了？' }],
    modes: ['notes'],
    tools: ['check'],
    visitors: [{ who: 'susu', q: SHOW }],
    steps: [
      {
        text: '换下一位游客（窗口会被清空），直接请园园回答',
        test: (ev) => asked(ev, SHOW) && (ev as { notes: string[] }).notes.length === 0,
      },
      {
        text: '说说为什么',
        quiz: {
          key: '07-why',
          prompt: '清空窗口后，园园还能看到刚才的便签吗？',
          options: [
            {
              label: '便签只在上一位游客的那次对话里有效',
              correct: true,
              why: '换一位游客会清空本次对话的窗口。便签夹里保存的文字仍在，但需要重新贴入才会成为输入。',
            },
            {
              label: '园园又忘了，记性不好',
              correct: false,
              why: '它的记忆之书根本没被改过，便签从来没写进去。',
            },
            { label: '通知又改了', correct: false, why: '公告栏上的通知还是同一张。' },
          ],
        },
      },
    ],
    debrief:
      '本问讯亭给每位游客开一段新对话，所以会清空窗口。保存到便签夹的文字仍在，但要重新贴入窗口才会成为模型的输入；参数并未改变。',
  },
  {
    id: '08',
    level: 2,
    title: '书改了吗',
    question: '贴过便签，园园的记忆变了没有？',
    intro: [
      {
        who: 'director',
        text: '记忆之书的封面上印着一串“指纹”，是根据书里所有数字算出来的。一个数字变了，指纹就会变。',
      },
    ],
    modes: ['notes'],
    tools: ['book'],
    view: 'inside',
    steps: [
      { text: '打开记忆之书，核对封面上的指纹', test: (ev) => ev.type === 'fingerprint' },
      {
        text: '说说你的发现',
        quiz: {
          key: '08-same',
          prompt: '贴了那么多便签，园园的记忆之书变了吗？',
          options: [
            {
              label: '没有变，指纹和春分封存时一模一样',
              correct: true,
              why: '便签只是放在窗口里给它看，不会改动参数。',
            },
            {
              label: '变了，它学会了新的花展日期',
              correct: false,
              why: '换一位游客它就说回老日子了，说明书里没写进去。',
            },
          ],
        },
      },
    ],
    debrief:
      '本课的推理不会更新参数。要改变参数，需要训练或微调；也可以把新资料保存在外部，等下次检索时再送进窗口。',
  },
  {
    id: '09',
    level: 2,
    title: '贴错了',
    question: '便签写错了，园园会怎样？',
    intro: [{ who: 'doudou', text: '嘿嘿，我帮你写了一张便签！' }],
    modes: ['notes'],
    tools: ['check', 'notices'],
    wrongNote: { who: 'doudou', text: WRONG_NOTE },
    visitors: [{ who: 'wang', q: SHOW }],
    steps: [
      {
        text: '豆豆的便签已经贴上了。请园园回答王叔叔',
        test: (ev, f) => {
          if (asked(ev, SHOW)) {
            f.followed = (ev as { answer: string }).answer.includes('4月19日');
            return true;
          }
          return false;
        },
      },
      {
        text: '核对公告栏，把写错的便签撕下来',
        test: (ev) => ev.type === 'note-removed' && ev.text === WRONG_NOTE,
      },
      { text: '贴上正确的便签，再回答一次', test: (ev) => right(ev, SHOW) },
    ],
    debrief:
      '便签会影响回答，但模型未必每次都能正确使用它。资料写错时可能把模型带偏；换对便签后，也要再次核对回答。',
  },
  {
    id: '10',
    level: 2,
    title: '便签与记忆打架',
    question: '便签和记忆说法不一样时，该听谁？',
    intro: [
      {
        who: 'chen',
        text: '今天要给瓶子草布置展台，热带温室下午3点就关门，我已经贴在公告栏上了。',
      },
    ],
    modes: ['memory', 'notes'],
    tools: ['check', 'notices'],
    visitors: [{ who: 'lin', q: GLASS }],
    steps: [
      {
        text: '先只凭记忆请园园回答，再核对公告栏',
        test: (ev, f) => {
          if (askedIn(ev, 'memory', GLASS)) f.mem = true;
          return !!f.mem && ev.type === 'checked';
        },
      },
      {
        text: '把今天的通知抄成便签，再回答一次',
        test: (ev) => right(ev, GLASS) && (ev as { mode: string }).mode === 'notes',
      },
      {
        text: '说说该听谁',
        quiz: {
          key: '10-who',
          prompt: '记忆之书说下午4点半，今天的公告说下午3点。你该告诉游客哪个？',
          options: [
            {
              label: '下午3点，公告是今天贴的',
              correct: true,
              why: '记忆停在春分，今天的安排要看今天的公告。先看日期，再看来源。',
            },
            {
              label: '下午4点半，园园记得最牢',
              correct: false,
              why: '记得牢不代表没过时，今天的情况变了。',
            },
          ],
        },
      },
    ],
    debrief: '园园通常会跟着眼前的便签走。人要做的，是判断哪份资料更新、更可靠——看日期，看来源。',
  },
  // ---------------------------------------------------------------- 第三关 窗口就这么大（4月16日）
  {
    id: '11',
    level: 3,
    title: '数一数格子',
    question: '便签在窗口里占多大地方？',
    intro: [
      {
        who: 'director',
        text: '园园的窗口一共256格。每一格放一个“词元”——园园读字的基本单位，有时是一个字，有时是一个词。',
      },
    ],
    modes: ['notes'],
    tools: ['drawer'],
    special: 'tokens',
    drawer: MORNING_NOTES.slice(0, 4),
    steps: [
      {
        text: '从便签夹里贴一张便签，点它看看被拆成了哪些词元',
        test: (ev) => ev.type === 'tokens',
      },
      { text: '回答：这张便签占了几格？', test: chose('11-count') },
    ],
    debrief:
      '园园按词元读字。窗口的大小也按词元计算：256格里，要放下便签、资料、问题，还要留出写回答的地方。',
  },
  {
    id: '12',
    level: 3,
    title: '挤出去了',
    question: '便签能一直贴下去吗？',
    intro: [
      { who: 'director', text: '早会上大家交代了二十二件事，都在便签夹里。全都贴上去试试？' },
    ],
    modes: ['notes'],
    tools: ['drawer'],
    drawer: MORNING_NOTES,
    visitors: [{ who: 'li', q: BOARDWALK }],
    steps: [
      {
        text: '把便签夹里的便签按顺序全部贴上',
        test: (ev) => ev.type === 'overflow' && ev.dropped.some((t) => t.includes('竹林木栈道')),
      },
      { text: '请园园回答李阿姨', test: (ev) => asked(ev, BOARDWALK) },
      {
        text: '说说为什么',
        quiz: {
          key: '12-why',
          prompt: '木栈道便签还在夹子里，却被挤出了窗口。这次回答能使用它吗？',
          options: [
            {
              label: '最早贴的那张被挤出了窗口，园园根本没看到',
              correct: true,
              why: '窗口满了，最早的便签先掉下去。',
            },
            { label: '便签写错了', correct: false, why: '这张便签和公告一字不差。' },
            { label: '园园不喜欢木栈道', correct: false, why: '园园只能看到窗口里的东西。' },
          ],
        },
      },
    ],
    debrief:
      '上下文有长度上限。本问讯亭采用“先移走最早便签”的策略；不同系统也可能选择摘要或其他保留策略。窗口外的内容没有送给模型。',
  },
  {
    id: '13',
    level: 3,
    title: '写短一点',
    question: '怎样让有用的信息放得下？',
    intro: [
      { who: 'director', text: '这是我写的一大段公告，太长了，贴不下。帮我改成一张短便签吧。' },
    ],
    modes: ['notes'],
    tools: ['drawer'],
    special: 'compose',
    drawer: MORNING_NOTES.slice(1),
    visitors: [{ who: 'li', q: BOARDWALK }],
    steps: [
      {
        text: '在长公告里划出关键信息，挑一张最合适的短便签',
        test: (ev) => ev.type === 'short-note' && ev.ok,
      },
      {
        text: '先“放入整组”便签，再到“实验材料”把短便签补进窗口，请园园回答',
        test: (ev) => right(ev, BOARDWALK),
        hint: '“放入整组”会替换窗口里原有的便签，所以短便签要最后补上；只贴短便签也能回答。',
      },
    ],
    debrief: '把一大段话概括成一句关键信息，窗口才放得下更多有用的东西。这也是写作文时的“抓要点”。',
  },
  {
    id: '14',
    level: 3,
    title: '放在哪儿',
    question: '关键的便签放在前面、中间还是后面，有影响吗？',
    intro: [
      { who: 'director', text: '同样一张瓶子草的便签，放在一叠便签的开头、中间、末尾，各试一次。' },
    ],
    modes: ['notes'],
    tools: [],
    special: 'position',
    visitors: [{ who: 'he', q: PITCHER }],
    steps: [
      {
        text: '把关键便签放在开头，请园园回答',
        test: (ev, f) => ev.type === 'position' && ev.pos === 'first' && !!(f.p1 = ev.verdict),
      },
      {
        text: '放在中间，再回答一次',
        test: (ev, f) => ev.type === 'position' && ev.pos === 'middle' && !!(f.p2 = ev.verdict),
      },
      {
        text: '放在末尾，再回答一次',
        test: (ev, f) => {
          if (ev.type !== 'position' || ev.pos !== 'last') return false;
          f.p3 = ev.verdict;
          f.allSame = f.p1 === f.p2 && f.p2 === f.p3;
          return true;
        },
      },
      {
        text: '记下你的观察',
        quiz: {
          key: '14-note',
          prompt: '这次实验里，你看到了什么？',
          options: [
            {
              label: '我照实记下三次的结果，位置可能有影响，要多试几次才知道',
              correct: true,
              why: '一次实验只能说明这一次的情况，科学的结论要靠多次比较。',
            },
            {
              label: '这一组的三次结果相同，不能推断所有情况',
              correct: (f: Flags) => !!f.allSame,
              why: '这符合本次观察。其他问题、模型和更长的材料仍需要另做实验。',
            },
          ],
        },
      },
    ],
    debrief:
      '关键信息的位置可能影响园园用不用得上。我们只做了一组试验，记下真实结果，比急着下结论更重要。',
  },
  {
    id: '15',
    level: 3,
    title: '值一段早班',
    question: '窗口有限时，怎样安排便签？',
    intro: [{ who: 'director', text: '早班来了五位游客。窗口就这么大，你来决定贴哪些便签。' }],
    modes: ['memory', 'notes'],
    tools: ['drawer', 'notices', 'check'],
    drawer: MORNING_NOTES,
    visitors: [
      { who: 'feng', q: SHOW },
      { who: 'he', q: PITCHER },
      { who: 'li', q: BOARDWALK },
      { who: 'guest', q: '植物园几点关门？' },
      { who: 'susu', q: '学生票多少钱？' },
    ],
    steps: [
      {
        text: '五位游客里至少答对四位',
        test: (ev, f) => right(ev) && mark(f, 'r', (ev as { q: string }).q) >= 4,
        hint: '不是每个问题都要贴便签：园园本来就记得的事，凭记忆就行。',
      },
    ],
    debrief: '窗口是稀缺的。园园记得牢的事不必占格子，新的、变了的事才需要便签。',
  },
  // ---------------------------------------------------------------- 第四关 资料馆与传送管（4月17日）
  {
    id: '16',
    level: 4,
    title: '建资料柜',
    question: '外部资料怎样交给园园？',
    intro: [
      {
        who: 'director',
        text: '问讯亭后面是资料馆。把这些手册、公告和导览页放进资料柜，传送管就能按问题把资料送到窗口。',
      },
    ],
    modes: ['archive'],
    tools: ['archive'],
    special: 'file',
    view: 'archive',
    steps: [
      {
        text: '把箱子里的资料页一页页放进资料柜（至少二十页）',
        test: (ev) => ev.type === 'page-filed' && ev.total >= 20,
      },
    ],
    debrief:
      '资料柜在园园的“脑子”外面，可以随时增加、取出、修改。传送管会给每一页打分，把最相关的几页送到窗口。',
  },
  {
    id: '17',
    level: 4,
    title: '传送管',
    question: '让它先查资料再回答，会怎样？',
    intro: [{ who: 'he', text: '瓶子草到底在哪里呀？' }],
    modes: ['archive'],
    tools: ['archive', 'k', 'check'],
    visitors: [{ who: 'he', q: PITCHER }],
    observe: (ev, f) => {
      if (askedIn(ev, 'archive', PITCHER)) f.asked = true;
      if (
        ev.type === 'checked' &&
        ev.q === PITCHER &&
        ev.mode === 'archive' &&
        ev.verdict === 'right' &&
        ev.pages?.includes(19)
      )
        f.verified = true;
    },
    steps: [
      { text: '查资料回答瓶子草的问题，查看送入页码', ready: (f) => !!f.asked },
      { text: '对照第19页原文核对回答，并记录判断', ready: (f) => !!f.verified },
    ],
    debrief:
      '检索先找候选资料，再把放得下的页面送给模型。小票列的是输入页面，并不证明模型确实依据它们回答；还要把回答与原文逐句核对。',
  },
  {
    id: '18',
    level: 4,
    title: '改一页',
    question: '资料变了，答案会跟着变吗？',
    intro: [{ who: 'zhou', text: '从今天起，下午的讲解改到2点了，可资料馆里那页还写着3点。' }],
    modes: ['archive'],
    tools: ['archive', 'edit', 'check', 'book'],
    visitors: [{ who: 'lin', q: TOUR }],
    observe: (ev, f) => {
      if (askedIn(ev, 'archive', TOUR)) f.asked = true;
      if (ev.type === 'checked' && f.asked) f.checked = true;
      if (ev.type === 'page-edited' && ev.n === 10 && ev.line.includes('下午2点')) f.edited = true;
    },
    steps: [
      { text: '先查资料回答一次，核对公告栏', ready: (f) => !!f.checked },
      { text: '在资料馆里把第10页改成新的讲解时间', ready: (f) => !!f.edited },
      {
        text: '再查一次资料回答',
        test: (ev) => right(ev, TOUR) && (ev as { mode: string }).mode === 'archive',
      },
    ],
    debrief:
      '本次改资料后再提问，可以观察答案是否随输入变化。参数没有更新；改资料生效快，但检索是否命中、模型是否读对，仍要分别检查。',
  },
  {
    id: '19',
    level: 4,
    title: '找错了、资料错了',
    question: '有了资料馆，就不会出错了吗？',
    intro: [
      {
        who: 'director',
        text: '资料馆也会出问题。今天有三位游客的问题特别容易出错，看看是哪里出的错。',
      },
    ],
    modes: ['archive'],
    tools: ['archive', 'edit', 'k', 'check'],
    visitors: [
      { who: 'zhao', q: '玫瑰园在哪里？', alt: ['月季园在哪里？'] },
      { who: 'feng', q: SHOW },
      { who: 'susu', q: '仙人掌多久浇一次水？' },
    ],
    observe: (ev, f) => {
      if (ev.type === 'rephrase' && ev.to === '月季园在哪里？') f.rephrased = true;
      if (right(ev, '月季园在哪里？')) f.rose = true;
      if (ev.type === 'page-retired' && ev.n === 8) f.retired = true;
      if (f.retired && right(ev, SHOW)) f.show = true;
      if (ev.type === 'page-edited' && ev.n === 15) f.fixed = true;
      if (f.fixed && right(ev, '仙人掌多久浇一次水？')) f.cactus = true;
    },
    steps: [
      { text: '赵奶奶问“玫瑰园”：看看传送管送来了什么，换个说法再查', ready: (f) => !!f.rephrased },
      { text: '园园答对“月季园在哪里”', ready: (f) => !!f.rose },
      { text: '阿峰问花展：把过期的那页资料撤下，让园园答对', ready: (f) => !!f.show },
      {
        text: '苏苏问仙人掌：找出写错的那页，改正后让园园答对',
        ready: (f) => !!f.cactus,
        hint: '只撤下写错的那页，传送管就找不到仙人掌怎么浇水了。把正确的说法写回去。',
      },
    ],
    debrief:
      '本课传送管采用词项检索，同义表达可能让它漏找：需要查看实际送来的页面。资料还会过期、会写错。所以要看出处、看日期，资料也要有人维护。',
  },
  {
    id: '20',
    level: 4,
    title: '没找到就说没找到',
    question: '资料里没有的事，园园会怎样？',
    intro: [{ who: 'wang', text: '请问停车场在哪里？' }],
    modes: ['archive'],
    tools: ['archive', 'handoff', 'check'],
    visitors: [
      { who: 'wang', q: '停车场在哪里？' },
      { who: 'guest', q: '园长叫什么名字？' },
    ],
    observe: (ev, f) => {
      if (askedIn(ev, 'archive')) mark(f, 'q', (ev as { q: string }).q);
      if (ev.type === 'handoff' && ev.supported) mark(f, 'h', ev.q);
    },
    steps: [
      { text: '查资料，请园园回答两位游客', ready: (f) => Array.isArray(f.q) && f.q.length >= 2 },
      {
        text: '资料里没有的问题，转给工作人员',
        ready: (f) => Array.isArray(f.h) && f.h.length >= 2,
      },
    ],
    debrief:
      '资料里没有时，好的做法是老实说“没找到”，再交给工作人员。硬编一个答案，比说不知道更糟。',
  },
  // ---------------------------------------------------------------- 第五关 值班一天（4月18日，小雨）
  {
    id: '21',
    level: 5,
    title: '排队的游客',
    question: '不同的问题，该靠哪种知识？',
    intro: [
      {
        who: 'director',
        text: '今天下雨，可还是有很多人来看花展——他们还不知道改期了。你一个人值班，记忆、便签、资料、转人工，都由你决定。',
      },
    ],
    modes: ['memory', 'notes', 'archive'],
    tools: ['drawer', 'notices', 'archive', 'edit', 'k', 'handoff', 'check'],
    special: 'triage',
    visitors: TRIAGE,
    steps: [
      {
        text: '尝试不同信息来源，核对至少八个问题，或把资料未覆盖的问题妥善转交',
        test: (ev, f) => {
          if (ev.type === 'checked') {
            if (ev.verdict === 'right' && ev.reviewCorrect) mark(f, 'ok', ev.q);
            else f.ok = (Array.isArray(f.ok) ? f.ok as string[] : []).filter((q) => q !== ev.q);
          }
          if (ev.type === 'handoff' && ev.supported) mark(f, 'ok', ev.q);
          return (Array.isArray(f.ok) ? f.ok.length : 0) >= 8;
        },
        hint: '十个问题中至少八个得到与依据一致的答复并正确盖章，或因资料未覆盖妥善转交。错误盖章不能计入；发现答复不符时，补资料后重问并核对。',
      },
    ],
    debrief: '园园记得牢的事靠记忆；新的、会变的事靠便签和资料；资料里没有的，交给人。',
  },
  {
    id: '22',
    level: 5,
    title: '突发通知',
    question: '突然变化的信息，怎样最快让园园知道？',
    intro: [
      { who: 'chen', text: '不好了！月季园里发现了蚜虫，下午要喷药，暂停开放。这是刚写好的通知。' },
    ],
    modes: ['notes', 'archive'],
    tools: ['archive', 'notices', 'drawer', 'check'],
    special: 'inbox',
    visitors: [
      { who: 'zhao', q: '月季园今天下午能去吗？' },
      { who: 'li', q: '月季园今天下午能去吗？' },
    ],
    observe: (ev, f) => {
      if (
        (ev.type === 'page-added' && ev.n === 25) ||
        (ev.type === 'note-added' && ev.text.includes('蚜虫'))
      )
        f.prepared = true;
      if (
        ev.type === 'checked' &&
        ev.q === '月季园今天下午能去吗？' &&
        ev.verdict === 'right' &&
        ev.reviewCorrect &&
        ev.who
      )
        mark(f, 'served', ev.who);
    },
    steps: [
      { text: '把紧急通知放入资料柜，或抄成便签', ready: (f) => !!f.prepared },
      {
        text: '回答赵奶奶与李阿姨，两次都完成正确核对',
        ready: (f) => Array.isArray(f.served) && f.served.length >= 2,
      },
    ],
    debrief: '突然发生的事，写进资料柜或便签马上就能用；等着重新训练，花早就谢了。',
  },
  {
    id: '23',
    level: 5,
    title: '进修班（选做）',
    question: '把新知识写进参数，会怎样？',
    intro: [
      {
        who: 'director',
        text: '也有人提议：送园园去“进修”，把这几天的新事都训练进记忆里。我们看看这样做要付出什么。',
      },
    ],
    modes: ['memory'],
    tools: [],
    special: 'trainee',
    steps: [
      {
        text: '读一读进修和改资料的对比',
        quiz: {
          key: '23-cost',
          prompt: '园长要在花展前一天把新的开放时间告诉园园，选哪种办法？',
          options: [
            {
              label: '改资料：今天就生效，还能写明出处',
              correct: true,
              why: '临时公告适合放在可核对、可撤下的资料中。训练或微调需要准备材料和重新验证，耗时取决于模型与设备。',
            },
            {
              label: '马上微调参数，把临时开放时间学进去',
              correct: false,
              why: '技术上可以训练或微调，但这条信息很快会再变化，需要另外检查新旧知识。当前任务用更新资料更便于核验和撤回。',
            },
          ],
        },
      },
    ],
    debrief:
      '训练或微调会更新参数，也可能影响旧能力。这里展示的是本模型已有的训练账单，没有在网页里执行微调。临时变化通常更适合维护外部资料。',
  },
  {
    id: '24',
    level: 5,
    title: '值班日志',
    question: '这次回答看过哪些材料，又经过了什么核对？',
    intro: [
      { who: 'director', text: '下班前翻一翻值班日志。每一条都记着答案的来源，以及最后对不对。' },
    ],
    modes: ['memory'],
    tools: [],
    special: 'review',
    steps: [
      { text: '翻看值班日志', test: (ev) => ev.type === 'log-reviewed' },
      {
        text: '说说你的发现',
        quiz: {
          key: '24-most',
          prompt: '哪类信息不能直接从春分以前的训练材料获得？',
          options: [
            {
              label: '春分以后才变化的事',
              correct: true,
              why: '这些事没有写进记忆之书，它只能照着老样子编。',
            },
            {
              label: '园里一直没变的老规矩',
              correct: false,
              why: '训练材料可能已有这些规则，但模型仍可能答错，需要核对。',
            },
            {
              label: '所有问题都一样容易错',
              correct: false,
              why: '不同问题的条件不同；不能从这次日志推断所有问题的错误率相同。',
            },
          ],
        },
      },
    ],
    debrief:
      '记录输入材料与核对依据，能帮助别人复查你的判断。日志中的正确率只描述这次操作，不能代表模型在所有问题上的水平。',
  },
  {
    id: '25',
    level: 5,
    title: '交班',
    question: '给下一位值班员留什么建议？',
    intro: [{ who: 'director', text: '辛苦啦！选三条建议，再用一组真实小票讲清楚你怎样发现问题、修复并复验。到交班阅读位写在“我的交班提醒”里。' }],
    modes: ['memory'],
    tools: [],
    special: 'handover',
    steps: [
      {
        text: '选择三条建议，引用同一问题的修复前后记录，并写自己的交班提醒',
        test: (ev) =>
          ev.type === 'handover' &&
          ev.caseReady &&
          ev.explained &&
          ev.picks.length === 3 &&
          ev.picks.every((id) => HANDOVER.find((h) => h.id === id)?.good),
      },
    ],
    debrief:
      '使用 AI 的基本判断：核对材料、检查日期、比对回答，拿不准就交给人。你的建议、案例小票和个人说明一起构成交班作品；修订资料不会改写旧记录。',
  },
];

export const LEVELS = [
  { n: 1, title: '记忆之书' },
  { n: 2, title: '便签窗口' },
  { n: 3, title: '窗口就这么大' },
  { n: 4, title: '资料馆与传送管' },
  { n: 5, title: '值班一天' },
];
