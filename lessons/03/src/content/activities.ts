import type { InteractionPoint } from "../render/contracts.ts";
import type { KnownKind } from "../media/types.ts";

export type ActivityKind =
  | "camera"
  | "sound"
  | "message"
  | "motion"
  | "fusion"
  | "occlusion"
  | "noise"
  | "angle"
  | "background"
  | "conflict"
  | "name"
  | "sorting"
  | "attributes"
  | "unknown"
  | "album"
  | "correct"
  | "repair"
  | "diversity"
  | "bias"
  | "evaluate"
  | "delivery"
  | "soundarchive"
  | "leaves"
  | "rain"
  | "author";
export interface Requirement {
  action: string;
  minimum: number;
  label: string;
}
export interface Activity extends InteractionPoint {
  mission: number;
  kind: ActivityKind;
  subject: KnownKind;
  prompt: string;
  discovery: string;
  requirements: Requirement[];
  noteRequired?: boolean;
}
export const MISSIONS = [
  {
    id: 1,
    title: "修好小助手的眼睛",
    minutes: 25,
    chapter: "先让小助手看清楚",
    unlock: "西边溪谷的绳门打开了！带上相机，去找照片里的线索。",
  },
  {
    id: 2,
    title: "找到照片里的线索",
    minutes: 30,
    chapter: "小助手的答案，也要找依据",
    unlock: "找到图鉴箱啦！营地工坊和两边的深林都可以去了。",
  },
  {
    id: 3,
    title: "整理乱掉的标签",
    minutes: 30,
    chapter: "给每个例子一个靠得住的名字",
    unlock: "例子册编好了！树冠升降台和风雨谷开放，去找更多不一样的样子。",
  },
  {
    id: 4,
    title: "帮它认识更多样子",
    minutes: 35,
    chapter: "改一改，再用新照片考一考",
    unlock: "考试记录存好了。溪边小舟开通，打开地图就能快速回到去过的地方。",
  },
  {
    id: 5,
    title: "我们来接新任务",
    minutes: 30,
    chapter: "把学到的办法，带给森林朋友",
    unlock: "五次委托全部完成！你的线索册、例子册和自己出的委托，都留在森林里了。",
  },
] as const;
const r = (action: string, minimum: number, label: string): Requirement => ({
  action,
  minimum,
  label,
});
const make = (
  id: number,
  title: string,
  kind: ActivityKind,
  designX: number,
  subject: KnownKind,
  prompt: string,
  discovery: string,
  requirements: Requirement[],
  noteRequired = false,
  elevation: "ground" | "canopy" = "ground",
): Activity => ({
  id: String(id).padStart(2, "0"),
  title,
  kind,
  mission: Math.ceil(id / 5),
  x: 18000 + designX * 180,
  elevation,
  phase: Math.min(4, Math.floor((id - 1) / 5)),
  subject,
  prompt,
  discovery,
  requirements: [...requirements, r("understand", 1, "想一想这次的发现")],
  noteRequired,
});

/** 课程与完成证据的唯一配置；场景标记、委托册、工具面板均读取这里。 */
export const ACTIVITIES: Activity[] = [
  make(
    1,
    "照片里藏着谁",
    "camera",
    0,
    "car",
    "镜头起雾了，还有一片叶子挡在前面。擦一擦、推开叶子，拍一张清楚的照片，再翻开资料卡对一对。",
    "拍下来，不等于认出来。小助手只能从画面里找线索——画面看不清，它也会糊涂。",
    [
      r("adjust", 1, "擦镜头或推开叶子"),
      r("capture", 1, "拍一张照片"),
      r("verify", 1, "翻资料卡核对"),
    ],
  ),
  make(
    2,
    "声音从哪里来",
    "sound",
    7,
    "bell",
    "风铃和溪水都在响。播放两种声音，请小助手听一听，再核对声音是从哪儿来的。",
    "声音也是线索。听出“这是风铃声”，和把说的话变成文字，是两种不一样的本领。",
    [
      r("listen", 2, "听两种声音"),
      r("soundPredict", 1, "请小助手听一听"),
      r("verify", 1, "核对声音从哪来"),
    ],
  ),
  make(
    3,
    "便签和口信",
    "message",
    12,
    "car",
    "有人留下一张便签，还捎来一段口信。看清它们要什么，再选一个合适的工具帮忙。",
    "同一个要求，可以写下来，也可以说出来。先看清在问什么，再选对工具。",
    [
      r("message", 2, "看便签、读口信"),
      r("textPredict", 1, "让小助手读一读"),
      r("toolChoose", 1, "选对工具"),
    ],
  ),
  make(
    4,
    "照片之间发生了什么",
    "motion",
    17,
    "car",
    "拖动这段小短片，看看开头、中间和结尾。只看一张，你能说出小车往哪边开吗？",
    "一张照片只留下一瞬间。把前后几张连起来看，才知道东西往哪儿动。",
    [
      r("frame", 3, "看开头、中间、结尾"),
      r("motionPredict", 1, "请小助手比一比"),
      r("verify", 1, "核对小车方向"),
    ],
  ),
  make(
    5,
    "合起来再看一次",
    "fusion",
    22,
    "bell",
    "铃铛和播放器长得有点像。拍一张、听一段，再把对得上的线索合在一起。",
    "照片、声音、说明可以互相帮忙——前提是它们说的是同一件东西。",
    [
      r("capture", 1, "拍一张"),
      r("listen", 1, "听一段"),
      r("fuse", 1, "把线索合起来"),
      r("sourceCheck", 1, "确认线索是一对"),
    ],
  ),
  make(
    6,
    "被挡住的一角",
    "occlusion",
    -14,
    "car",
    "照片只露出一个角。挪开叶子前后各拍一张，比一比小助手的回答。",
    "被挡住一大半，小助手也会犯难。先把信息补全，比让它硬猜更好。",
    [
      r("occlusion", 1, "挪一挪叶子"),
      r("capture", 2, "前后各拍一张"),
      r("compare", 1, "比一比两次回答"),
    ],
  ),
  make(
    7,
    "吵闹的录音",
    "noise",
    -29,
    "radio",
    "瀑布边太吵了！换个安静点的地方，同一种声音再录一次，比一比两份录音。",
    "噪声会盖住真正的声音。走近一点重新录，比按一个“消除噪声”的按钮更靠谱。",
    [
      r("noise", 1, "换个地方录"),
      r("listen", 2, "听两份录音"),
      r("soundPredict", 2, "小助手听两次"),
      r("improveChoice", 1, "想一个补救办法"),
    ],
  ),
  make(
    8,
    "换个方向还是它",
    "angle",
    -44,
    "car",
    "在白石桥边转一转玩具、调一调光线。它还是同一件东西，小助手还认得吗？",
    "同一件东西，换个角度就换个样子。小助手没见过的样子，就可能认不出来。",
    [
      r("angle", 1, "转一转或调光线"),
      r("capture", 2, "拍下两种样子"),
      r("compare", 1, "比一比"),
    ],
  ),
  make(
    9,
    "背景也会带偏",
    "background",
    -20,
    "block",
    "先只换背景纸，再只换玩具。一次只改一样，才看得出是谁在影响小助手。",
    "一次只改一个条件，才知道到底是什么在左右小助手的判断。",
    [
      r("background", 1, "换背景纸"),
      r("object", 1, "换玩具"),
      r("capture", 3, "拍三张对照照"),
      r("compare", 1, "比一比"),
    ],
  ),
  make(
    10,
    "两条线索打架了",
    "conflict",
    -58,
    "radio",
    "照片里是播放器，录音里却是鸟叫。这一次，到底在问“是什么东西”，还是“是什么声音”？",
    "画面里的东西和录音里的声音，回答的是两个不同的问题。先弄清楚在问什么。",
    [
      r("capture", 1, "拍下画面"),
      r("listen", 1, "听录音"),
      r("question", 2, "两种问法都试试"),
      r("fuse", 1, "合起来看"),
      r("sourceCheck", 1, "核对声音来源"),
    ],
    true,
  ),
  make(
    11,
    "名字是谁贴的",
    "name",
    -3,
    "car",
    "给照片贴上名字。哪个是你查证过的，哪个只是小助手猜的？要分清楚。",
    "你贴的标签要有依据；小助手给的只是猜测。人贴的标签也可能贴错，同样要核对。",
    [
      r("capture", 1, "拍一张"),
      r("predict", 1, "看小助手的猜测"),
      r("label", 1, "贴上我的标签"),
      r("sourceCheck", 1, "查一查依据"),
    ],
  ),
  make(
    12,
    "换个任务怎样分",
    "sorting",
    -75,
    "block",
    "同一堆道具，先按颜色分，再按用途分。分法不同，分出来的组也不同。",
    "分类要看任务。按颜色分和按用途分，同一件东西可以去不同的组。",
    [
      r("sortColor", 6, "按颜色分好六件"),
      r("sortUse", 6, "按用途分好六件"),
    ],
  ),
  make(
    13,
    "一件东西几张标签",
    "attributes",
    32,
    "car",
    "一辆红色的木头小车，可以贴几张标签？只留下有依据的。",
    "一件东西可以有好几张标签。看得出的写下来，看不出的要查资料。",
    [
      r("attribute", 3, "贴三种标签"),
      r("sourceCheck", 1, "查资料"),
    ],
  ),
  make(
    14,
    "先留一个问号",
    "unknown",
    50,
    "pinecone",
    "这件寄来的东西还没有靠得住的名字。查一查，实在不确定，就带着理由先画一个问号。",
    "不知道的时候，认真地留一个问号。乱贴的名字，比问号更麻烦。",
    [
      r("unknown", 1, "放进问号夹"),
      r("verify", 1, "查已有资料"),
    ],
    true,
  ),
  make(
    15,
    "编好我们的例子册",
    "album",
    -3,
    "car",
    "拍下小车、积木等东西，核对名字，把不同样子的照片放进例子册。",
    "带着正确名字的一组照片，就是小助手学习用的“课本”。",
    [
      r("exampleAdd", 4, "放进四个例子"),
      r("class", 2, "至少两类东西"),
      r("albumSave", 1, "保存例子册"),
    ],
  ),
  make(
    16,
    "先改正这一张",
    "correct",
    10,
    "car",
    "先核对这一张照片，改正这一次的记录，再去看看小助手学会的版本有没有变。",
    "改正这一张，只改了这一次的记录。小助手学过的东西，并没有跟着变。",
    [
      r("capture", 1, "拍一张"),
      r("recordCorrect", 1, "改正这次记录"),
      r("modelCheck", 1, "看看学习版本"),
    ],
  ),
  make(
    17,
    "找出例子里的错签",
    "repair",
    -3,
    "block",
    "森林邮差送来一本待修的例子册，有一张标签贴错了。找出来、改正它，再让小助手重新学一遍。",
    "例子贴错了，小助手就会学错。改好例子，还得让它重新学一遍才算数。",
    [
      r("packet", 1, "打开待修例子册"),
      r("exampleRelabel", 1, "改正错签"),
      r("train", 1, "让它重新学"),
      r("compare", 1, "比一比学前学后"),
    ],
  ),
  make(
    18,
    "补什么更有帮助",
    "diversity",
    9,
    "car",
    "在树冠上换个角度拍。重复的照片和不一样的照片，哪种更能帮到小助手？",
    "照片多，不等于样子多。补上它没见过的样子，再考一考才知道有没有用。",
    [
      r("different", 2, "拍两种新样子"),
      r("exampleAdd", 2, "放进例子册"),
      r("train", 1, "重新学"),
      r("recheck", 1, "再考一次"),
    ],
    false,
    "canopy",
  ),
  make(
    19,
    "别只记住背景",
    "bias",
    74,
    "car",
    "来访的图鉴里，小车总在蓝纸上，积木总在黄纸上。补上换了背景的例子，再用新照片考一考。",
    "小助手可能偷偷记住了背景颜色。补上换背景的例子，它才会去看东西本身。",
    [
      r("backgroundCross", 2, "拍换背景的例子"),
      r("exampleAdd", 2, "放进例子册"),
      r("train", 1, "重新学"),
      r("heldout", 1, "用新照片考"),
    ],
  ),
  make(
    20,
    "新照片见面会",
    "evaluate",
    -44,
    "car",
    "先把这一版小助手封存起来，考考原来的问题照片，再用它从没见过的新照片考一考。",
    "认对老照片不算本事。用没见过的新照片考一考，才知道它真正学会了多少。",
    [
      r("freeze", 1, "封存这一版"),
      r("knownTest", 1, "考老照片"),
      r("heldout", 2, "考两张新照片"),
    ],
    true,
  ),
  make(
    21,
    "找回会响的小玩具",
    "delivery",
    -83,
    "bell",
    "访客丢了一个会响的小玩具，只留下一角照片、一段声音和一句话。找对线索，再把玩具交还。",
    "交还之前，先让照片、声音和说明对得上。结论要有证据撑着。",
    [
      r("capture", 1, "看照片线索"),
      r("listen", 1, "听录音"),
      r("fuse", 1, "把线索合起来"),
      r("deliver", 1, "交还玩具"),
    ],
  ),
  make(
    22,
    "给声音档案起名字",
    "soundarchive",
    -33,
    "radio",
    "给录音起名字：听到的是什么？又是从哪里放出来的？两样分开写。",
    "听到的内容和声音从哪儿来，是两回事。改了档案，也不等于小助手重新学了。",
    [
      r("listen", 2, "听两份录音"),
      r("archive", 2, "写两份档案"),
      r("sourceCheck", 1, "核对内容和来源"),
    ],
  ),
  make(
    23,
    "给自然角补一本图鉴",
    "leaves",
    49,
    "maple",
    "自然角送来新的叶子照片。分清枫叶和银杏叶，放进例子册，再拿一片新叶子考一考。",
    "整理、学习、检验——这套办法换成叶子，也一样好用。",
    [
      r("leafCapture", 2, "拍两种叶子"),
      r("exampleAdd", 2, "放进例子册"),
      r("train", 1, "重新学"),
      r("heldout", 1, "考一片新叶子"),
    ],
  ),
  make(
    24,
    "雨天来的困难委托",
    "rain",
    89,
    "car",
    "下雨了：照片又暗又糊，录音很吵，说明还少一句。重拍、补线索，还是先留个问号？说说你的理由。",
    "遇到难题，可以重拍、补线索，也可以老实说“还不确定”。办法要跟着问题选。",
    [
      r("investigate", 2, "试两种调查办法"),
      r("decision", 1, "定下处理办法"),
    ],
    true,
  ),
  make(
    25,
    "我来出一道委托",
    "author",
    0,
    "car",
    "轮到你出题了！用森林里的素材设计一道委托，写清问题和核对依据，自己先试一次。",
    "你出的委托，要能让别人检查对不对——这比让小助手每题都答对更重要。",
    [
      r("author", 1, "保存我的委托"),
      r("playAuthored", 1, "自己先试一次"),
    ],
    true,
  ),
];
export function activityById(id: string): Activity {
  const value = ACTIVITIES.find((a) => a.id === id);
  if (!value) throw new Error(`没有这项委托：${id}`);
  return value;
}
