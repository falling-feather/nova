import type { KnownKind, SoundKind, SpecimenOptions } from "../media/types.ts";

/** Which hands-on controls a camera station shows. Each lesson exposes only the
 * conditions it is about, so two lessons never feel like the same form. */
export type CameraControl =
  | "wipe"
  | "cover"
  | "angle"
  | "light"
  | "background"
  | "kind"
  | "variant";

export interface LessonGuide {
  camera?: {
    controls: CameraControl[];
    kinds?: KnownKind[];
    start?: Partial<SpecimenOptions>;
  };
  sounds?: SoundKind[];
  noise?: boolean;
  /** The idea the activity just let the child experience, named afterwards. */
  word: { term: string; text: string };
  /** What to try first, shown when the workbench opens. */
  hint?: string;
}

const FIRST_STEPS: Record<string, string> = {
  "01": "先在取景框上来回拖，擦掉镜头上的雾，再抓住叶子的边把它推开。",
  "02": "先选“风铃”，点“播放录音”听一听，再请小助手也听一听。",
  "03": "先点“读便签”，看看上面写了什么。",
  "04": "按“播放短片”，或者拖动进度条，看看开头、中间和结尾。",
  "05": "先在观察台拍一张，再去“听一听”。最后把两条线索合起来。",
  "06": "先就这样拍一张，再把叶子推开，拍第二张。",
  "07": "先听一听瀑布边的录音，请小助手也听一听。",
  "08": "先在暗处拍一张，再调亮光线或者转一转，拍第二张。",
  "09": "先拍一张积木，再只换背景纸拍一张，最后只换玩具。",
  "10": "照片和录音都准备好，再去“线索合起来”，两种问法都试一试。",
  "11": "拍一张，看看小助手猜的是什么，再贴上你查证过的名字。",
  "12": "先点一件东西，再点它该去的盒子；也可以直接拖过去。",
  "13": "给小车贴上名字、颜色和材料。材料看不出来的时候，翻开资料卡。",
  "14": "拍一张寄来的东西，再翻开资料卡，看看寄件人是怎么说的。",
  "15": "拍一张、贴好名字、放进例子册。换不同的样子，多放几个。",
  "16": "拍一张斜放的小车，看看小助手怎么说，再改正这一张的记录。",
  "17": "打开邮差送来的例子册，一张一张对一对名字。",
  "18": "转一转、换一个，拍下小助手没见过的样子，再放进例子册。",
  "19": "先打开来访的图鉴，再去观察台拍一张黄纸上的小车。",
  "20": "先拍一张“老问题”照片，再到“考一考”把这一版封存起来。",
  "21": "先看看那一角照片，再听录音、读访客说的话。",
  "22": "先在“听一听”里放一段录音，再去“声音档案”写下来。",
  "23": "拍一片枫叶、一片银杏叶，贴好名字放进例子册。",
  "24": "先试着擦镜头、调亮光线，看看小助手能不能看清。",
  "25": "给委托取个名字，写清问题和核对办法，然后自己先试一次。",
};

const TOYS: KnownKind[] = ["car", "block", "bell", "radio"];
const ALL: KnownKind[] = [
  "car",
  "block",
  "bell",
  "radio",
  "leaf",
  "pinecone",
  "maple",
  "ginkgo",
];
const ALL_SOUNDS: SoundKind[] = ["bell", "water", "bird", "clock"];

export const LESSON_GUIDES: Record<string, LessonGuide> = {
  "01": {
    camera: { controls: ["wipe", "cover"], start: { blur: 0.8, occlusion: 0.6 } },
    word: {
      term: "输入",
      text: "交给 AI 的照片、声音、文字，都叫“输入”。输入看不清，AI 也很难看明白。",
    },
  },
  "02": {
    sounds: ALL_SOUNDS,
    word: {
      term: "声音识别",
      text: "听出“这是什么声音”叫声音识别；把说的话变成文字，是另一种本领，叫语音转文字。",
    },
  },
  "03": {
    word: {
      term: "关键词",
      text: "小助手读便签时，会找“小车”“铃铛”这样的关键词。读到“不要”，就得把后面的东西排除。",
    },
  },
  "04": {
    word: {
      term: "视频",
      text: "视频就是一张张照片连起来放。比较前后几张，才看得出东西往哪儿动。",
    },
  },
  "05": {
    camera: { controls: ["kind"], kinds: ["bell", "radio"] },
    sounds: ["bell", "bird"],
    word: {
      term: "多模态",
      text: "能同时用上图片、声音、文字等好几种信息的 AI，叫多模态 AI。",
    },
  },
  "06": {
    camera: { controls: ["cover"], start: { occlusion: 0.65 } },
    word: {
      term: "信息不完整",
      text: "输入缺了一大块，AI 也会被难住，甚至把挡在前面的叶子当成答案。",
    },
  },
  "07": {
    sounds: ["bird", "water", "bell"],
    noise: true,
    word: {
      term: "噪声",
      text: "混在声音里、没有用的杂音叫噪声。噪声越大，越难听清真正的声音。",
    },
  },
  "08": {
    camera: { controls: ["angle", "light"], start: { light: 0.55 } },
    word: {
      term: "同类不同样",
      text: "同一件东西换个角度、换个光线，在 AI 眼里可能就像另一件东西。",
    },
  },
  "09": {
    camera: { controls: ["background", "kind"], kinds: ["block", "car"] },
    word: {
      term: "控制变量",
      text: "一次只改一个条件，才知道是谁影响了结果。科学家把这个办法叫“控制变量”。",
    },
  },
  "10": {
    camera: { controls: [] },
    sounds: ["bird"],
    word: {
      term: "问对问题",
      text: "同一组线索，问“这是什么东西”和问“这是什么声音”，答案可以完全不一样。",
    },
  },
  "11": {
    // A car turned on its side reads as tall and brown-red, so the starting
    // assistant confidently calls it a pinecone (measured with the painted
    // objects): its guess and a checked label differ at once.
    camera: { controls: ["kind", "angle"], kinds: TOYS, start: { angle: 60 } },
    word: {
      term: "标签",
      text: "告诉 AI“这张是什么”的名字叫标签。人贴的标签要有依据，AI 说出的只是“猜测”。",
    },
  },
  "12": {
    word: {
      term: "分类",
      text: "按一个标准把东西分成几组，叫分类。标准一换，分组也跟着换。",
    },
  },
  "13": {
    word: {
      term: "属性",
      text: "名字、颜色、材料……一件东西可以有好几个属性，每一个都可以是一张标签。",
    },
  },
  "14": {
    camera: { controls: ["angle"] },
    word: {
      term: "未知",
      text: "不知道就说不知道。把“问号”认真记下来，比乱贴一个名字更可靠。",
    },
  },
  "15": {
    camera: {
      controls: ["kind", "angle", "variant", "background"],
      kinds: ALL,
    },
    word: {
      term: "训练数据",
      text: "一组带着正确标签的例子，叫训练数据。AI 就是从这些例子里学会认东西的。",
    },
  },
  "16": {
    camera: {
      controls: ["kind", "angle"],
      kinds: ["car", "block"],
      start: { angle: 60 },
    },
    word: {
      term: "记录和学习",
      text: "改正这一次的答案，AI 并不会学到新东西；要让它学，得改它学习用的例子。",
    },
  },
  "17": {
    camera: {
      controls: ["kind", "background"],
      kinds: ["car", "block"],
      start: { kind: "car", background: "blue" },
    },
    word: {
      term: "重新训练",
      text: "把例子修好以后，让 AI 再学一遍，叫重新训练。不重新学，它还是老样子。",
    },
  },
  "18": {
    camera: {
      controls: ["angle", "variant", "kind"],
      kinds: ["car", "block", "bell"],
    },
    word: {
      term: "数据多样性",
      text: "例子里有各种角度、各种样子，AI 才认得更多。重复拍同一张，帮不上忙。",
    },
  },
  "19": {
    camera: {
      controls: ["background", "kind"],
      kinds: ["car", "block"],
      start: { background: "yellow" },
    },
    word: {
      term: "数据偏差",
      text: "如果小车总在蓝纸上，AI 可能只记住了“蓝色”。这种不小心混进例子里的规律，叫偏差。",
    },
  },
  "20": {
    camera: { controls: ["kind", "angle"], kinds: ["car", "block", "bell"] },
    word: {
      term: "测试数据",
      text: "用 AI 没学过的新照片来考它，才知道它是真学会了，还是只记住了老照片。",
    },
  },
  "21": {
    camera: { controls: ["cover"], start: { occlusion: 0.5 } },
    sounds: ["bell", "bird", "clock"],
    word: {
      term: "证据",
      text: "结论要有证据撑着。把照片、声音和说明对上，才能放心下结论。",
    },
  },
  "22": {
    sounds: ALL_SOUNDS,
    word: {
      term: "内容和来源",
      text: "录音里有鸟叫，不代表鸟就在这儿——可能是播放器在放。记录时要把“听到什么”和“从哪来”分开。",
    },
  },
  "23": {
    camera: {
      controls: ["kind", "angle", "variant"],
      kinds: ["maple", "ginkgo", "leaf"],
    },
    word: {
      term: "举一反三",
      text: "学会的方法能用到新东西上：整理、学习、检验，换成叶子也一样。",
    },
  },
  "24": {
    camera: {
      controls: ["wipe", "light"],
      start: { light: 0.45, blur: 0.55 },
    },
    sounds: ALL_SOUNDS,
    noise: true,
    word: {
      term: "不确定",
      text: "照片暗、声音吵的时候，AI 和人都会拿不准。重拍、补线索，或者老实留个问号，都是好办法。",
    },
  },
  "25": {
    word: {
      term: "人来把关",
      text: "出题的是你，检查的也是你。AI 是帮手，答案对不对，最后要靠人来把关。",
    },
  },
};

/** The picture that goes with each word. Pictures only — never training data. */
const WORD_ART: Record<string, string> = {
  "01": "01-input",
  "02": "02-sound-recognition",
  "03": "03-keywords",
  "04": "04-video",
  "05": "05-multimodal",
  "06": "06-incomplete-information",
  "07": "07-noise",
  "08": "08-different-views",
  "09": "09-controlled-variable",
  "10": "10-ask-the-question",
  "11": "11-label",
  "12": "12-classification",
  "13": "13-attributes",
  "14": "14-unknown",
  "15": "15-training-data",
  "16": "16-record-vs-learning",
  "17": "17-retraining",
  "18": "18-data-diversity",
  "19": "19-data-bias",
  "20": "20-test-data",
  "21": "21-evidence",
  "22": "22-content-and-source",
  "23": "23-transfer",
  "24": "24-uncertainty",
  "25": "25-human-check",
};
export function wordArt(id: string): string | undefined {
  return WORD_ART[id] ? `ui/glossary/${WORD_ART[id]}.png` : undefined;
}

export function guideFor(id: string): LessonGuide {
  const guide = LESSON_GUIDES[id] ?? { word: { term: "", text: "" } };
  return { ...guide, hint: guide.hint ?? FIRST_STEPS[id] };
}

/** What a fact card says about each teaching object. */
export const OBJECT_FACTS: Record<KnownKind, string> = {
  car: "红色的木头小车：四个轮子，车身上有几扇小窗。",
  block: "木头积木：方方正正，有一面带着一个圆。",
  bell: "黄铜铃铛：顶上有个提环，摇一摇会叮当响。",
  radio: "绿色小播放器：有一块喇叭网，能放录好的声音。",
  leaf: "绿叶子：中间一条粗叶脉，两边是细细的侧脉。",
  pinecone: "松果：一片片鳞片，像屋顶上的小瓦。",
  maple: "枫叶：像张开的手掌，有好几个尖角。",
  ginkgo: "银杏叶：像一把小扇子，叶脉一根根散开。",
};

export const SOUND_FACTS: Record<SoundKind, string> = {
  bell: "营地大树下的风铃，风一吹就叮——叮——地响。",
  water: "白石桥下的溪水，哗哗地一直流，没有停顿。",
  bird: "这段鸟叫是从播放器里放出来的录音，不是真的小鸟在唱。",
  clock: "图书树屋里的钟，嘀嗒、嘀嗒，一下一下很均匀。",
};
