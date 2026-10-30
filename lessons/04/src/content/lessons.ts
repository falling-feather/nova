import type { Problem, ActionCard } from "../core/types.ts";
import type { PanelTab } from "../core/app-types.ts";
import {
  createCampus,
  createReferenceLab,
  createLabGraph,
  defaultProblem,
  defaultPlan,
} from "../core/graphs.ts";

/** Who speaks in the panel and on the board. All are fictional campus people. */
export type SpeakerId = "paopao" | "lin" | "xiaoman" | "xiaoyu" | "ale" | "crew";

export interface Speaker {
  id: SpeakerId;
  name: string;
  role: string;
  /** Map node the person stands beside on the campus board. */
  place: string | null;
}

export const SPEAKERS: Record<SpeakerId, Speaker> = {
  paopao: { id: "paopao", name: "跑跑", role: "行动站的送货小车", place: null },
  lin: { id: "lin", name: "林老师", role: "音乐社老师", place: "music" },
  xiaoman: {
    id: "xiaoman",
    name: "小满",
    role: "演出队队长",
    place: "plaza",
  },
  xiaoyu: { id: "xiaoyu", name: "小雨", role: "刚转来的新同学", place: "plaza" },
  ale: { id: "ale", name: "阿乐", role: "今天的值日生", place: "charge" },
  crew: { id: "crew", name: "施工队", role: "修路的叔叔阿姨", place: null },
};

export interface Lesson {
  id: number;
  title: string;
  minutes: number;
  /** The part of the open-day story this lesson carries. */
  mission: string;
}

export const LESSONS: readonly Lesson[] = [
  {
    id: 1,
    title: "大家需要什么帮助",
    minutes: 25,
    mission: "开放日前一天上午，行动站收到一张没写完的便签",
  },
  {
    id: 2,
    title: "把事情排成步骤",
    minutes: 30,
    mission: "前一天下午，合唱队排练前要把乐谱书送齐",
  },
  {
    id: 3,
    title: "给行动加上规则",
    minutes: 35,
    mission: "前一天傍晚，修路、下雨、搬道具，规矩一条条多起来",
  },
  {
    id: 4,
    title: "选择合适的走法",
    minutes: 30,
    mission: "开放日上午，路况一直在变",
  },
  {
    id: 5,
    title: "我的校园小方案",
    minutes: 30,
    mission: "开放日下午，由你来帮一个人",
  },
];

export interface Activity {
  id: string;
  lesson: number;
  title: string;
  /** One line for the catalogue. */
  question: string;
  /** The tab the activity opens on. */
  focus: PanelTab;
  /** Tabs this activity needs; the rest stay behind “更多工具”. */
  tools: PanelTab[];
  speaker: SpeakerId;
  /** What the speaker says when the activity opens. */
  line: string;
  /** The one-sentence finding shown when the activity is done. */
  discovery: string;
  /** For teachers and parents; folded by default. */
  teacher: string;
  /** What changes in the world once this activity is done. */
  world?: string;
  /** The activity whose finished plan this one starts from. */
  carryFrom?: string;
}

const A = (
  id: number,
  value: Omit<Activity, "id" | "lesson">,
): Activity => ({
  id: String(id).padStart(2, "0"),
  lesson: Math.ceil(id / 5),
  ...value,
});

export const ACTIVITIES: Activity[] = [
  A(1, {
    title: "缺了半句话的委托",
    question: "便签只写了“帮我送一下”。先把要做的事问清楚。",
    focus: "task",
    tools: ["task"],
    speaker: "paopao",
    line: "委托板上的便签只有一句：“帮我送一下。——林”。送什么、送去哪、交给谁、怎样才算送到？我一样都不知道，你帮我问问林老师吧。",
    discovery: "要先把目标说清楚。没写出来的要求，跑跑猜不出来。",
    teacher:
      "目标澄清：任务需要明确对象、物品、地点和完成条件。机器不会自行补全缺失的需求信息。",
  }),
  A(2, {
    title: "拿对要送的东西",
    question: "图书角的东西很多，对照任务卡挑出要送的那一样。",
    focus: "task",
    tools: ["task"],
    speaker: "lin",
    line: "图书角的架子上什么都有：书、活动手册、演出道具。我要的是乐谱书，可别拿错啦。",
    discovery: "出发前先核对东西对不对，后面的行动才靠得住。",
    teacher: "行动依赖可靠信息。延续第三章的核对习惯：先对照资料，再行动。",
  }),
  A(3, {
    title: "地图上找目的地",
    question: "地图上有个地名被雨打湿了，根据图例把它补回去。",
    focus: "task",
    tools: ["task"],
    speaker: "paopao",
    line: "我的地图上，有一栋楼的名字被雨打湿了，看不清。林老师在音乐教室——是哪一栋？提示：红屋顶，房顶上有个音符。",
    discovery: "地图是把真实的校园画简单了。缺了重要的信息，就得补上。",
    teacher:
      "表示（representation）：地图是任务用的简化模型，关键信息缺失会让计划无法对应现实。",
  }),
  A(4, {
    title: "到达就算完成吗",
    question: "跑跑先照着“送到音乐教室”跑一趟。到了，就算送完了吗？",
    focus: "steps",
    tools: ["steps", "task"],
    speaker: "paopao",
    line: "我先照着“送到音乐教室”跑一趟！你看看，这样算不算送完了？",
    discovery: "动作做完了，不等于事情办成了。要看目标有没有真正达到。",
    teacher:
      "完成条件要可观察：到达、交付、确认分别检查。执行完所有指令不等于满足任务目标。",
  }),
  A(5, {
    title: "选择合适的帮助",
    question: "委托板上又来了三张便签，分别交给谁来帮最合适？",
    focus: "task",
    tools: ["task"],
    speaker: "paopao",
    line: "委托板上又贴了三张便签。有的事自己顺手就能做，有的每天都一样，有的要边走边看路况。分别交给谁来帮最合适？",
    discovery: "用不用工具、用哪种工具，要看事情本身需要什么。",
    teacher:
      "不是所有任务都需要 AI 或规划工具。按任务是否固定、是否需要比较与应对变化来选择帮助方式。",
  }),
  A(6, {
    title: "空手到教室",
    question: "照着任务卡排出的第一份步骤，还缺哪些动作？",
    focus: "steps",
    tools: ["steps"],
    speaker: "paopao",
    line: "林老师说，合唱队排练还差乐谱书。这回我自己排步骤：照任务卡上的完成条件，排了三张卡——去音乐教室、交书、确认。先试一次？",
    discovery: "要先拿到东西，才能把它交出去。一件事常常要拆成好几步。",
    teacher: "任务分解：目标描述的是结果，执行需要补齐中间动作及其前置条件。",
  }),
  A(7, {
    title: "顺序颠倒了",
    question: "把“取书”这张卡挪到最前面，跑跑会怎样？先猜，再试。",
    focus: "steps",
    tools: ["steps"],
    speaker: "paopao",
    line: "要是“取书”这张卡排在最前面，我还能送到吗？先猜猜我会在哪儿停下，再试一次。",
    discovery: "后面的动作要靠前面的动作先做好。顺序一换，结果就变了。",
    teacher: "顺序与依赖：动作有前置条件，换序会改变结果。先预测再检验。",
    carryFrom: "06",
  }),
  A(8, {
    title: "哪一步有作用",
    question: "阿乐在步骤最前面加了一张卡。它有用吗？",
    focus: "steps",
    tools: ["steps"],
    speaker: "ale",
    line: "跑跑每次出门，我都习惯让它先去补给站充电，就在你的步骤最前面加了一张“去补给站”。这样好吧？",
    discovery: "没用的步骤只会多花力气；真正需要的步骤，一步也不能少。",
    teacher:
      "计划的效率：区分必要步骤与冗余步骤，用同一地图上两次成功运行的消耗作比较。",
    carryFrom: "07",
  }),
  A(9, {
    title: "两份物品怎么送",
    question: "要送两本，车厢只放得下一本。怎么办？",
    focus: "steps",
    tools: ["steps"],
    speaker: "lin",
    line: "排练的人多，乐谱要两本才够！跑跑说它的车厢今天只放得下一本，你帮它想想办法。",
    discovery: "一次装不下，就把同一组步骤再做一遍。",
    teacher: "重复与资源限制：受载量约束时，把一组步骤重复执行完成分批。",
    carryFrom: "08",
  }),
  A(10, {
    title: "我的第一次试运行",
    question: "先猜结果，再一步一步看，最后完整跑一遍。",
    focus: "steps",
    tools: ["steps"],
    speaker: "paopao",
    line: "这是你排好的完整步骤单。出发前先猜猜会发生什么，再一步一步看，最后从头到尾跑一遍。",
    discovery: "计划好不好，要让它真的跑一跑才知道。",
    teacher: "预测—单步—整体运行：用实际执行结果检验计划。",
    world: "两本乐谱送到了，音乐教室开始排练。",
    carryFrom: "09",
  }),
  A(11, {
    title: "施工路段不能走",
    question: "施工队要封一段路。原来的步骤还能用吗？",
    focus: "rules",
    tools: ["rules", "steps"],
    speaker: "crew",
    line: "今天要修路！请在棋盘上点一段路，放上路障。放好以后，看看跑跑还能不能把书送到。",
    discovery: "路障就是不能过，不是“多花点力气也能过”。",
    teacher:
      "约束与代价不同：封闭是硬约束（不可通行），而不是一个很大的代价。环境改变后要重新检查原计划。",
    carryFrom: "08",
  }),
  A(12, {
    title: "看不清就先核对",
    question: "书架标签被雨淋湿了，跑跑会怎么做？",
    focus: "steps",
    tools: ["steps", "rules"],
    speaker: "paopao",
    line: "下雨了，图书角的书架标签被淋湿，我看不清是不是乐谱书。看不清的时候，我该怎么办？",
    discovery: "不确定的信息不能当真。先核对，再行动。",
    teacher: "不确定信息的处理：资料未核对时暂停并请求确认，而不是默认正确。",
    carryFrom: "11",
  }),
  A(13, {
    title: "装得下再出发",
    question: "小满要两件演出道具。每件占两格，怎么装？",
    focus: "steps",
    tools: ["steps"],
    speaker: "xiaoman",
    line: "开放日要演出！请把两件演出道具送到音乐教室，我们要排练。道具可比书大多了。",
    discovery: "件数一样，占的地方可能不一样。先算清装不装得下。",
    teacher: "资源约束：容量按体积（格数）计算，而不是按件数。",
    carryFrom: "12",
  }),
  A(14, {
    title: "出发前检查能量",
    question: "在沙盘的路上放代价牌，算算能量够不够。",
    focus: "routes",
    tools: ["routes"],
    speaker: "xiaoman",
    line: "跑跑的电够它跑一趟吗？工坊里有个沙盘，就是缩小的校园。给路放上代价牌，算算要花多少能量。",
    discovery: "走几段路和花多少能量，是两回事。",
    teacher:
      "代价与预算：路段数与能量代价是不同的量；预算是硬条件，出发前先估算。",
  }),
  A(15, {
    title: "规则互相打架",
    question: "道具箱只能走坡道，可坡道正在维修。还能送到吗？",
    focus: "steps",
    tools: ["steps", "rules"],
    speaker: "xiaoman",
    line: "道具箱有轮子，只能走坡道，不能上台阶。可我刚听说，音乐教室的坡道正在维修……",
    discovery:
      "有时候怎么都办不到。说清原因、找能做决定的人商量，比硬闯更好。",
    teacher:
      "约束冲突：没有可行方案时，如实报告冲突并请有权限的人调整目标，不能删除固定事实来“通关”。",
    world: "演出改到活动广场，舞台搭起来了。",
    carryFrom: "13",
  }),
  A(16, {
    title: "同一个目标两条路",
    question: "自己画一条路，再看看助手的建议，两条都走一走。",
    focus: "routes",
    tools: ["routes"],
    speaker: "paopao",
    line: "开放日到了！我要去音乐教室取节目单。你先在沙盘上画一条路，再看看规划助手怎么建议。两条不同的路都走一走。",
    discovery: "到同一个地方，可以有不止一条路。",
    teacher:
      "搜索与候选：规划助手在当前地图条件下真实寻找候选路线；建议需要人来比较和检验。",
  }),
  A(17, {
    title: "谁需要坡道",
    question: "道具箱要推回音乐教室，台阶近，可它能走吗？",
    focus: "routes",
    tools: ["routes"],
    speaker: "xiaoman",
    line: "上午的节目演完了，道具箱要推回音乐教室。台阶那条路最近，可箱子有轮子，推不上台阶呀。",
    discovery: "先满足必须遵守的条件，再挑合适的路。",
    teacher: "必要条件优先：先排除不满足通行要求的路线，再按目标比较。",
  }),
  A(18, {
    title: "刚才的路封了",
    question: "走到一半收到封路消息，从当前位置重新安排。",
    focus: "routes",
    tools: ["routes"],
    speaker: "paopao",
    line: "访客越来越多，可能有路要临时封起来。我们先出发，路上收到消息再说。",
    discovery:
      "计划会被变化打断。重新规划要从现在的位置和剩下的能量出发，花掉的能量不会回来。",
    teacher:
      "重新规划：环境变化后从当前状态（位置、剩余预算）重新求解，已消耗资源不可恢复。",
  }),
  A(19, {
    title: "我希望什么优先",
    question: "比较“少走几步”和“少花能量”，也换个预算试试。",
    focus: "routes",
    tools: ["routes"],
    speaker: "paopao",
    line: "“最好的路”是哪条？要看你想让我少走几步，还是少花能量。换个目标、换个预算，都试试看。",
    discovery: "要优化什么，由人来决定。目标一换，最好的路也可能换。",
    teacher:
      "优化目标：预算内最少步数与最少能量是不同目标；目标由人设定，换目标可能换选择。",
  }),
  A(20, {
    title: "再试一次并说理由",
    question: "两条路一样省，走一走，再说说你选哪条。",
    focus: "routes",
    tools: ["routes"],
    speaker: "paopao",
    line: "这次有两条路都只花 4 点能量。两条都走一走，再告诉我：你选哪条，为什么？",
    discovery: "同样好的答案可以不止一个，关键是说清理由。",
    teacher: "多解：同样最优的方案不止一个，不存在唯一的“标准路线”。",
    world: "访客们来到活动广场，开放日热闹起来。",
  }),
  A(21, {
    title: "先选择要帮谁",
    question: "从三位老朋友里选一位，看清这份委托。",
    focus: "project",
    tools: ["project"],
    speaker: "paopao",
    line: "开放日下午，大家都忙起来了。这一次，由你来决定帮谁：林老师、小雨、小满，都有事要找我。",
    discovery: "先想清楚帮谁、帮什么，工具才知道要做什么。",
    teacher: "需求驱动：人的需要决定任务目标。",
  }),
  A(22, {
    title: "准备必要的信息",
    question: "只留下这次用得上的资料，不要的个人信息去掉。",
    focus: "project",
    tools: ["project"],
    speaker: "paopao",
    line: "做这件事，我需要知道哪些资料？只给我用得上的就好，用不上的个人信息别给我。",
    discovery: "资料够用就好。不需要的个人信息，不要收集。",
    teacher: "最少必要信息与隐私：区分完成任务所需资料和无关的个人信息。",
  }),
  A(23, {
    title: "搭出自己的安排",
    question: "用步骤卡排出自己的安排，让跑跑跑通。",
    focus: "steps",
    tools: ["steps", "rules", "project"],
    speaker: "paopao",
    line: "这一次全由你来排。需要的话可以看看参考步骤，但最后要你来检查它对不对。",
    discovery: "安排由你决定；助手给的建议，也要由你来检查。",
    teacher: "人决定如何使用工具，并对工具给出的建议负责核对。",
  }),
  A(24, {
    title: "常规和变化都试试",
    question: "同一份方案，普通情况和路况变化后各试一次。",
    focus: "project",
    tools: ["project", "steps", "rules"],
    speaker: "paopao",
    line: "好方案要经得起变化。先在平常的路况下试一次，再让路况变一变，用同一份方案再试一次。",
    discovery: "好方案要经得起变化。遇到办不到的情况，停下来求助也是好结果。",
    teacher:
      "检验与稳健性：在常规与变化条件下分别测试；合理的停止和求助也是有效结果，两次测试不保证所有情况都可靠。",
  }),
  A(25, {
    title: "介绍我的方案",
    question: "给方案起个名字，说清帮了谁、怎么做、检查了什么。",
    focus: "project",
    tools: ["project", "steps"],
    speaker: "paopao",
    line: "最后一步：给你的方案起个名字，再用自己的话介绍它——帮了谁，用了哪些资料，哪一步是助手帮忙的，你检查了什么。",
    discovery: "你把需要、步骤、规则和检验，变成了一份真正能跑起来的方案。",
    teacher:
      "小学段综合：目标、信息核对、步骤与规则、检验与说明，并区分人和工具各自做了什么。",
    world: "下午的演出开始了，开放日热热闹闹！",
  }),
];

export interface Lab {
  id: string;
  title: string;
  question: string;
  line: string;
}

export const LABS: readonly Lab[] = [
  {
    id: "R1",
    title: "先找一条通路",
    question: "每段路一样难走，画一条段数最少的路。",
    line: "沙盘上每段路都一样难走。画一条能到终点、段数又最少的路吧。",
  },
  {
    id: "R2",
    title: "近路未必省",
    question: "上面的路段数少却难走，换个目标比比看。",
    line: "上面那条路只有两段，可都是陡坡。换成“少走几步”和“少花能量”两个目标，各检查一次。",
  },
  {
    id: "R3",
    title: "给道路放代价牌",
    question: "改一段路的路况，先猜结果，再检验。",
    line: "点一段路，换一张代价牌，路面就会跟着变。先猜猜最好的路会不会变，再试试。",
  },
  {
    id: "R4",
    title: "有路也可能到不了",
    question: "封几段路，分清“能量不够”和“根本没路”。",
    line: "放路障试试：有时候是有路但能量不够，有时候是根本没路可走。两种情况都找出来。",
  },
  {
    id: "R5",
    title: "预算改变了",
    question: "把预算从 6 点改成 8 点，最好的路会变吗？",
    line: "把能量预算从 6 点改成 8 点，分别检查一次，看看哪些路能走了、最好的路有没有变。",
  },
  {
    id: "R6",
    title: "同样好的答案",
    question: "两条路一样省，两条都走一走。",
    line: "上面 2＋2，下面 1＋1＋1＋1，两条路都只花 4 点能量。两条都走一走。",
  },
  {
    id: "R7",
    title: "走到一半，新情况",
    question: "走一段再封路，能量可能不够了，如实记下来。",
    line: "先走一段，再收封路消息。剩下的能量可能不够了——如果真的到不了，就如实说清楚原因。",
  },
  {
    id: "R8",
    title: "我的道路沙盘",
    question: "自己出一道路线题：普通情况和改一段路后各检验一次。",
    line: "这是你的沙盘：选大小、定起点和终点，先检验一次，再改一段路检验一次，最后写下你的发现。",
  },
];

export function getActivity(id: string) {
  const value = ACTIVITIES.find((a) => a.id === id);
  if (!value) throw new Error("没有这项活动");
  return value;
}
export function isRouteActivity(id: string) {
  return ["14", "16", "17", "18", "19", "20"].includes(id);
}
const go = (id: string, target: string): ActionCard => ({
  id,
  type: "go",
  target,
});

export function routeProblem(kind = "reference"): Problem {
  const graph =
    kind === "reference"
      ? createReferenceLab()
      : createLabGraph(Number(kind), Number(kind));
  const start = graph.nodes[0].id,
    goal = kind === "reference" ? "G" : graph.nodes.at(-1)!.id;
  return {
    graph,
    start,
    goal: { type: "reach", destination: goal },
    energy: 6,
    capacity: 2,
    objective: "fewestSteps",
    requireRamp: false,
    factsKnown: true,
  };
}

/** The music room's map label is rain-smudged until activity 03 repairs it. */
export function hideMusicLabel(problem: Problem): void {
  const node = problem.graph.nodes.find((n) => n.id === "music");
  if (node) node.label = "？";
}

/** The plan written straight from the task card's completion conditions. */
export function conditionsPlan(problem: Problem): ActionCard[] {
  const goal = problem.goal;
  if (goal.type !== "delivery") return [];
  return [
    go("card-go-goal", goal.destination),
    {
      id: "card-give",
      type: "give",
      item: goal.item,
      amount: goal.quantity,
    },
    { id: "card-confirm", type: "confirm" },
  ];
}

/** 阿乐's habit: always visit the charging station first. */
export const DETOUR_CARD_ID = "ale-detour";

/** 小满's props replace the book task; the plan keeps its shape. */
export function propsGoal(problem: Problem): void {
  if (problem.goal.type !== "delivery") return;
  problem.goal = {
    ...problem.goal,
    item: "prop",
    quantity: 2,
    recipient: "小满",
    source: "library",
    destination: "music",
  };
  problem.capacity = 2;
  problem.factsKnown = true;
}

/** The ramp is under repair and the props box cannot climb stairs. */
export function rampConflict(problem: Problem): void {
  problem.requireRamp = true;
  problem.graph.roads = problem.graph.roads.map((r) =>
    r.to === "music" || r.from === "music"
      ? { ...r, closed: r.kind !== "stairs", locked: true }
      : r,
  );
}

/**
 * Reference scenario for each activity. Used the first time an activity is
 * opened before its source activity is finished, and by tests. When the
 * learner has finished the source activity, course-state starts from the
 * learner's own plan instead (see carriedScenario).
 */
export function scenarioFor(id: string): {
  problem: Problem;
  plan: ActionCard[];
} {
  let problem = defaultProblem();
  let plan = defaultPlan(problem);
  if (id === "01") {
    problem.factsKnown = false;
    plan = [];
  }
  if (id === "02" || id === "03" || id === "05") plan = [];
  if (["01", "02", "03"].includes(id)) hideMusicLabel(problem);
  if (id === "04")
    plan = plan.filter((c) => c.type !== "give" && c.type !== "confirm");
  if (id === "06") plan = conditionsPlan(problem);
  if (id === "07") {
    const take = plan.find((c) => c.type === "take")!;
    plan = [take, ...plan.filter((c) => c !== take)];
  }
  if (id === "08") plan = [go(DETOUR_CARD_ID, "charge"), ...plan];
  if (id === "09" || id === "10") {
    if (problem.goal.type === "delivery") problem.goal.quantity = 2;
    problem.capacity = 1;
    plan =
      id === "09"
        ? [
            go("to-source", "library"),
            { id: "take-one", type: "take", item: "book", amount: 1 },
            go("to-goal", "music"),
            { id: "give-one", type: "give", item: "book", amount: 1 },
            { id: "ack", type: "confirm" },
          ]
        : defaultPlan(problem);
  }
  if (id === "12") {
    problem.factsKnown = false;
    plan = defaultPlan({ ...problem, factsKnown: true });
  }
  if (id === "13") {
    propsGoal(problem);
    plan = [
      go("to-source", "library"),
      { id: "too-much", type: "take", item: "prop", amount: 2 },
      go("to-goal", "music"),
      { id: "hand-over", type: "give", item: "prop", amount: 2 },
      { id: "ack", type: "confirm" },
    ];
  }
  if (id === "15") {
    propsGoal(problem);
    rampConflict(problem);
    plan = defaultPlan(problem);
  }
  if (isRouteActivity(id)) {
    problem = routeProblem();
    plan = [];
    if (id === "16") {
      for (const road of problem.graph.roads) road.cost = 1;
      problem.energy = 8;
    }
    if (id === "17") {
      problem.graph = createCampus();
      problem.start = "plaza";
      problem.goal = { type: "reach", destination: "music" };
      problem.requireRamp = true;
      problem.energy = 8;
    }
    if (id === "18") {
      problem.energy = 12;
      problem.objective = "leastCost";
    }
    if (id === "19") problem.energy = 6;
    if (id === "20") {
      problem.energy = 8;
      problem.objective = "leastCost";
      problem.graph.roads
        .filter((r) => ["SU", "UG"].includes(r.id))
        .forEach((r) => (r.cost = 2));
    }
  }
  return { problem, plan };
}
export function labScenario(id: string): Problem {
  const p = routeProblem(id === "R8" ? "4" : "reference");
  if (id === "R1") {
    p.graph.roads.forEach((r) => (r.cost = 1));
    p.energy = 6;
  }
  if (id === "R2") {
    p.energy = 8;
    p.objective = "leastCost";
  }
  if (id === "R6") {
    p.graph.roads
      .filter((r) => ["SU", "UG"].includes(r.id))
      .forEach((r) => (r.cost = 2));
    p.objective = "leastCost";
  }
  if (id === "R7") {
    p.energy = 6;
    p.objective = "leastCost";
  }
  if (id === "R8") p.energy = 16;
  return p;
}
