// 五个地点、二十五个环节。文案面向初中生：短句、具体、先做再命名。

import type { Palette } from "../render/sand.ts";

export type LocationId = "beach" | "workshop" | "market" | "stall" | "night";

export interface Location {
  id: LocationId;
  level: number;
  name: string;
  time: string;
  palette: Palette;
  question: string;
}

export const LOCATIONS: Location[] = [
  { id: "beach", level: 1, name: "潮汐沙滩", time: "清晨", palette: "dawn", question: "往一幅画里加噪声，会发生什么？" },
  { id: "workshop", level: 2, name: "修复棚", time: "上午", palette: "morning", question: "师傅怎样学会把乱沙收回来？" },
  { id: "market", level: 3, name: "贝壳市集", time: "午后", palette: "afternoon", question: "从纯噪声出发，怎样画出一幅新画？" },
  { id: "stall", level: 4, name: "配方摊", time: "黄昏", palette: "dusk", question: "怎样让师傅画我想要的东西？" },
  { id: "night", level: 5, name: "灯塔夜场", time: "夜晚", palette: "night", question: "一场 AI 生成的演出，人要负责什么？" },
];

export type Speaker = "master" | "host" | "kid" | "elder";

export const SPEAKERS: Record<Speaker, { name: string; role: string }> = {
  master: { name: "沙画师傅", role: "会从乱沙里画出画的机器" },
  host: { name: "阿澜", role: "沙画节主持人" },
  kid: { name: "小贝", role: "拾贝壳的孩子" },
  elder: { name: "潮伯", role: "画了四十年沙画的老艺人" },
};

export interface Step {
  id: number;
  location: LocationId;
  title: string;
  /** 这一环节要学生做的事，一句话 */
  task: string;
  /** 做完之后要形成的认识（完成后显示） */
  insight: string;
  synthesis?: boolean;
}

export const STEPS: Step[] = [
  { id: 1, location: "beach", title: "画一幅沙画", task: "用手指在沙上画一幅画，或者从展位上借一幅。", insight: "一幅图就是一片有厚有薄的沙：32×32 个格子，每格一个数。" },
  { id: 2, location: "beach", title: "一道道潮水", task: "拖动潮水尺，从第 0 道一直拖到最后一道，再盯住一个格子看它怎么变。", insight: "噪声水平越高，原画的系数越小、随机扰动的系数越大。本尺展示各水平的样子，不是实拍潮水。" },
  { id: 3, location: "beach", title: "还认得出吗", task: "先猜到第几道就认不出了，再一幅幅看，标出你真正认不出的那一道。", insight: "画是一点点丢掉的，不是突然消失的。" },
  { id: 4, location: "beach", title: "终点有什么相同", task: "四幅画都被冲到最后一道，猜猜哪一片是你的画。", insight: "冲到最后，各幅画接近同一种噪声分布；每个格子并不相同，原画信息却已经极少。" },
  { id: 5, location: "beach", title: "冲乱容易，复原难", task: "试着把最后的乱沙抹回你的画，再看看师傅从这片乱沙里画出了什么。", insight: "加噪谁都会；最后的乱沙几乎不保留原画信息。生成依靠学到的规律，并不保证找回原画。", synthesis: true },
  { id: 6, location: "workshop", title: "当一次师傅", task: "你的画被冲乱了一半。用刷子把它抹回来，再和原画比一比。", insight: "往回收很难：你得猜出哪些沙是被冲乱的。" },
  { id: 7, location: "workshop", title: "师傅的练习本", task: "翻几页练习本：每一页都是一道“猜扰动”的题，看看师傅猜得准不准。", insight: "训练时比较预测与真实扰动，用误差调整参数；和第五章一样，调整有依据，并非把误差直接照抄给参数。" },
  { id: 8, location: "workshop", title: "只收一步", task: "让师傅一次只收一步：先看它猜出的扰动，再减掉一点。多收几步试试。", insight: "每一步只往回收一小点，画是一步步显出来的。" },
  { id: 9, location: "workshop", title: "一步到位会怎样", task: "让师傅面对一片纯乱沙，先一步到位，再一步步来，比较两幅结果，再看看它每一步心里猜的画。", insight: "对本章训练好的师傅，多步生成通常比一步更有结构；原图估计随步骤变化，不是预存答案。" },
  { id: 10, location: "workshop", title: "我和师傅比一比", task: "选择不同强弱的潮水，先亲手修，再比较模型的实际结果。", insight: "噪声较轻时原图信息更多；修复效果仍要依据这次实际比较，模型的能力来自训练。", synthesis: true },
  { id: 11, location: "market", title: "捡一枚贝壳", task: "捡一枚带编号的贝壳，看师傅从它那片乱沙里一步步画出一幅画，再拖胶片条回看。", insight: "生成：从纯噪声出发，一步步去噪。" },
  { id: 12, location: "market", title: "再来一次", task: "用同一枚贝壳再画一次，核对两幅是不是一模一样。", insight: "同一模型、同一完整配方和相同计算环境下，本章的生成结果可以复现。" },
  { id: 13, location: "market", title: "换一枚", task: "再捡几枚贝壳，排成一排；然后去练习本里找和每幅最像的一幅。", insight: "不同种子往往产生不同结果。师傅现场计算图像；抽样对照不能排除它记住训练图的可能。" },
  { id: 14, location: "market", title: "分几次收沙", task: "同一枚贝壳，分别收 2、5、20、50 次，比较效果和用时。", insight: "更多步数通常需要更多计算；图像是否改善，要比较这次实际结果。" },
  { id: 15, location: "market", title: "我的第一张配方卡", task: "把你最喜欢的一幅记成配方卡，再按配方码把它原样复现出来。", insight: "配方记录种子、条件、力度和步数。同一模型与采样方式下可以复现，跨设备可能有细微差异。", synthesis: true },
  { id: 16, location: "stall", title: "抽签", task: "抽几支题目签，用同一枚贝壳让师傅按题作画。", insight: "条件把生成引向某个类别。" },
  { id: 17, location: "stall", title: "攥紧一点", task: "先确认只改条件力度，再选两幅实际结果，用 A/B 解释你的观察。", insight: "力度为0时不使用类别引导；更强不一定更好，要同时检查题目、轮廓与细节。" },
  { id: 18, location: "stall", title: "我的控制变量实验", task: "自主研究种子、题目或步数中的一个，保持其他条件相同，留下 A/B 和结论。", insight: "公平对照要固定其他条件；一组实验的结论只支持当前模型与这组结果。" },
  { id: 19, location: "stall", title: "两支签一起抽", task: "选两支不同题目签，固定其他条件；选择实际 A/B 比例并记录观察。", insight: "混合可能画出有趣的东西，也可能两不像：组合不一定行得通。" },
  { id: 20, location: "stall", title: "配方挑战", task: "摊主拿出三幅画，找出能原样画出它们的配方。", insight: "种子、题目、力度、步数各自起作用；配方对了，画就一模一样。", synthesis: true },
  { id: 21, location: "night", title: "选节目", task: "从配方卡册里挑出 6 幅作品，编排夜场；说明一张未采用图的理由。", insight: "策展：展示什么、按什么顺序、舍弃什么，由人根据用途决定。" },
  { id: 22, location: "night", title: "它画不出的", task: "观众点了“长颈鹿”和“我家的小狗”，试试师傅能不能画。", insight: "这位师傅只支持12种类别条件，没有接收任意文字和指定宠物身份的能力。" },
  { id: 23, location: "night", title: "打上标识", task: "给节目单上的每幅作品加上“AI 生成”标识，导出一张，再检查文件里写了什么。", insight: "向观众说明哪些内容由AI生成，并检查可见标签与文件说明；转存或截图可能使标识丢失。" },
  { id: 24, location: "night", title: "每一笔从哪来", task: "打开致谢墙，看看师傅学过的涂鸦来自哪里，再把致谢写进节目单。", insight: "训练数据来自真实的人，应当尊重与署名。" },
  { id: 25, location: "night", title: "夜场开演", task: "开演！看完灯塔上的投影秀，回答潮伯的问题：这算谁的作品？", insight: "作品里有人的选择、工具的计算，也有许多人画过的涂鸦。", synthesis: true },
];

export function stepsOf(location: LocationId): Step[] {
  return STEPS.filter((s) => s.location === location);
}

export function locationOf(stepId: number): Location {
  const step = STEPS[stepId - 1];
  return LOCATIONS.find((l) => l.id === step.location)!;
}

/** 第 22 环节观众点的题目；刻意没有收进签筒。 */
export const UNKNOWN_REQUESTS = ["长颈鹿", "我家的小狗"];
