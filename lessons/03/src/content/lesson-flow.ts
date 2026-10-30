import { guideFor } from "./lesson-guides.ts";

export type LessonUnit =
  | "wipe"
  | "cover"
  | "angle"
  | "light"
  | "background"
  | "kind"
  | "variant"
  | "capture"
  | "photo-album"
  | "result"
  | "verify"
  | "compare"
  | "label"
  | "label-source"
  | "add-example"
  | "model-check"
  | "sound-select"
  | "sound-variant"
  | "listen"
  | "sound-predict"
  | "sound-verify"
  | "noise"
  | "improve"
  | "message-first"
  | "message-second"
  | "tool-choose"
  | "text-predict"
  | "motion-scrub"
  | "motion-select"
  | "motion-predict"
  | "motion-verify"
  | "fusion-question"
  | "fusion-source"
  | "fusion-select"
  | "fuse"
  | "clue-read"
  | "sort-color"
  | "sort-use"
  | "attribute-name"
  | "attribute-color"
  | "attribute-source"
  | "attribute-material"
  | "unknown"
  | "packet-open"
  | "example-edit"
  | "train"
  | "compare-models"
  | "album-save"
  | "freeze"
  | "test-known"
  | "test-heldout"
  | "delivery"
  | "archive-content"
  | "archive-source"
  | "archive-save"
  | "rain-choice"
  | "author-title"
  | "author-question"
  | "author-materials"
  | "author-object"
  | "author-cover"
  | "author-light"
  | "author-explanation"
  | "author-save"
  | "author-test";

export type StepCondition =
  | { type: "read" }
  | { type: "event"; action: string; count: number; value?: string }
  | {
      type: "option";
      key:
        | "blur"
        | "occlusion"
        | "angle"
        | "light"
        | "kind"
        | "variant"
        | "background"
        | "soundKind"
        | "soundNoise"
        | "question";
      value: string | number;
    }
  | { type: "photos"; count: number }
  | { type: "labelled" }
  | { type: "source" }
  | { type: "examples"; count: number }
  | { type: "current-example" }
  | { type: "trained" }
  | { type: "field"; label: string; length: number }
  | { type: "choice"; label: string; value: string }
  | { type: "motion-frames" }
  | { type: "authored" };
export interface LessonStep {
  id: string;
  unit: LessonUnit;
  title: string;
  say: string;
  done: StepCondition;
}
export interface KnowledgeCheck {
  question: string;
  choices: readonly [string, string, string];
  answer: number;
  explanation: string;
}
export interface LessonFlow {
  opening: string;
  question: string;
  steps: readonly LessonStep[];
  check: KnowledgeCheck;
  exploration: string;
}
const event = (action: string, count = 1, value?: string): StepCondition => ({
  type: "event",
  action,
  count,
  ...(value ? { value } : {}),
});
const option = (
  key: Extract<StepCondition, { type: "option" }>["key"],
  value: string | number,
): StepCondition => ({ type: "option", key, value });
const beat = (
  unit: LessonUnit,
  title: string,
  say: string,
  done: StepCondition = { type: "read" },
): Omit<LessonStep, "id"> => ({ unit, title, say, done });
const photo = (count: number, say = "把现在的画面拍下来，看看我会怎样判断。") =>
  beat("capture", "留下这张照片", say, { type: "photos", count });
const result = (say = "这是我根据线索作出的判断。认对、认错和拿不准，都值得认真记录。") =>
  beat("result", "看看发生了什么", say);
const verify = () =>
  beat(
    "verify",
    "翻开资料核对",
    "我的猜测还需要依据。翻开资料卡，把照片和资料放在一起看。",
    event("verify"),
  );
const label = () =>
  beat("label", "贴上有依据的名字", "根据刚才查到的资料选一个名字，再贴到这张照片上。", {
    type: "labelled",
  });
const source = () =>
  beat("label-source", "先查一查依据", "名字来自查证，不能只照抄我的猜测。看看观察台的资料。", {
    type: "source",
  });
const add = () =>
  beat(
    "add-example",
    "把这份例子收好",
    "照片和你核对过的标签一起放进例子册，才是一份可用的例子。",
    { type: "current-example" },
  );
const train = () =>
  beat("train", "让我重新学一次", "例子册是草稿。按下重新学习，我才会使用刚才改好的材料。", {
    type: "trained",
  });
const listen = (count = 1) =>
  beat(
    "listen",
    "先听这一份录音",
    "听清它的高低和节奏。需要时，也可以展开文字说明。",
    event("listen", count),
  );
const hear = (count = 1) =>
  beat(
    "sound-predict",
    "请我也听一听",
    "我会比较声音的特点。我的答案同样需要核对。",
    event("soundPredict", count),
  );
const checkSource = () =>
  beat(
    "fusion-source",
    "这些线索对得上吗",
    "照片里的东西、录音和说明要有对应关系。确认过来源，再把它们放在一起。",
    { type: "source" },
  );
const fuse = (count = 1) =>
  beat(
    "fuse",
    "把线索合起来",
    "看看补上另一种线索后，判断有什么变化。多一条线索也不保证一定正确。",
    event("fuse", count),
  );
const testNew = (count = 1) =>
  beat(
    "test-heldout",
    "用新照片试一试",
    "这张照片没有放进学习用的例子册。看看刚学过的方法能不能用上。",
    event("heldout", count),
  );
const packet = () =>
  beat(
    "packet-open",
    "打开邮差的例子册",
    "先看看寄来的照片和标签。它们会保留在你的例子草稿中。",
    event("packet"),
  );
const archive = (count: number) => [
  beat("archive-content", "先记录听到什么", "这一栏只写声音的内容，暂时不写它从哪里来。", {
    type: "choice",
    label: "听到的是",
    value: count === 1 ? "bird" : "water",
  }),
  beat("archive-source", "再记录声音从哪里来", "依据刚才的声源资料，选择这份声音的实际来源。", {
    type: "choice",
    label: "声音从哪里来",
    value: count === 1 ? "播放器" : "溪水",
  }),
  beat(
    "archive-save",
    "存好这一条声音档案",
    "把内容和来源分开保留，方便下一位访客核对。",
    event("archive", count),
  ),
];
const changeKind = (kind: string, name: string) =>
  beat("kind", `换成${name}`, "这次只换观察对象，其他条件先保持不变。", option("kind", kind));
// display-only measure words for "选第N辆小车"
const MEASURES: Record<string, string> = { car: "辆", block: "块", leaf: "片", maple: "片", ginkgo: "片", pinecone: "颗", radio: "台" };
const sample = (count: number, kind: string, name: string, variant?: number) => [
  changeKind(kind, name),
  ...(variant === undefined
    ? []
    : [
        beat(
          "variant",
          `选第${variant + 1}${MEASURES[kind] ?? "个"}${name}`,
          "换一个同类的个体，让例子里出现不同的样子。",
          option("variant", variant),
        ),
      ]),
  photo(count),
  source(),
  label(),
  add(),
];
const knowledge: Record<string, KnowledgeCheck> = {
  "01": {
    question: "照片拍清楚后，我的答案就一定对吗？",
    choices: ["一定对，不用再看", "仍要和实物或资料核对", "清楚的照片不能交给AI"],
    answer: 1,
    explanation: "拍清楚改善了输入；认得对不对，还要另找依据核对。",
  },
  "02": {
    question: "听出风铃声，属于哪一种本领？",
    choices: ["把说话写成文字", "看图片认颜色", "辨认声音的种类"],
    answer: 2,
    explanation: "声音识别辨认声音种类；语音转文字处理的是人说的话。",
  },
  "03": {
    question: "面对一张写着要求的便签，先做什么？",
    choices: ["读清要求，再选择文字工具", "只听附近的声音", "不看便签直接猜"],
    answer: 0,
    explanation: "先认清信息的形式和问题，再选能处理这种信息的工具。",
  },
  "04": {
    question: "想知道小车往哪边开，什么线索更有用？",
    choices: ["只看轮子的颜色", "只看最后一张照片", "比较前后连续的画面"],
    answer: 2,
    explanation: "连续画面包含先后变化，一张照片只记录一个瞬间。",
  },
  "05": {
    question: "什么时候适合把照片和录音一起用？",
    choices: ["数量多就都放进去", "核对过来源，而且和问题有关", "它们看起来都很漂亮"],
    answer: 1,
    explanation: "多种信息可以互补，前提是来源和问题能对应起来。",
  },
  "06": {
    question: "叶子挡住了一大半，先怎样帮忙？",
    choices: ["挪开遮挡，补全画面", "要求AI必须给一个名字", "多点几次同一张照片"],
    answer: 0,
    explanation: "先补充缺失的信息，再检查判断是否变化。",
  },
  "07": {
    question: "瀑布声盖住了鸟鸣，哪个办法有帮助？",
    choices: ["随便改一个答案", "更用力地按播放", "靠近声源或换安静处重新录"],
    answer: 2,
    explanation: "改善真实采集条件，能让需要的声音更容易听清。",
  },
  "08": {
    question: "同一件东西换个角度，为什么我可能认不出？",
    choices: ["它一定变成了别的东西", "新的画面样子可能超出我的经验", "物件的名字会自动改变"],
    answer: 1,
    explanation: "物件没变，输入画面却变了。没有见过的样子可能让判断变难。",
  },
  "09": {
    question: "想知道背景有没有影响，怎样比较？",
    choices: ["其他条件不动，只换背景", "同时换物件、背景和光线", "只挑一次正确的结果"],
    answer: 0,
    explanation: "一次只改一个条件，才能更清楚地看出它带来的影响。",
  },
  "10": {
    question: "播放器放着鸟叫，怎样描述最准确？",
    choices: ["画面里的物件一定是鸟", "有鸟叫就不用看照片", "物件是播放器，录音内容是鸟鸣"],
    answer: 2,
    explanation: "物件、声音内容和声音来源回答的是不同的问题。",
  },
  "11": {
    question: "我猜的名字和你贴的标签，应该怎样对待？",
    choices: ["AI说什么就贴什么", "分清来源，两者都要有依据", "人的标签永远不会错"],
    answer: 1,
    explanation: "机器会猜错，人也会贴错。要保留依据，而不是只看谁说的。",
  },
  "12": {
    question: "同一片枫叶可以进入不同的组吗？",
    choices: ["可以，要看按颜色还是按用途分", "不行，它只能属于一组", "只要想放哪里都可以"],
    answer: 0,
    explanation: "分类标准由任务决定；标准改变，分组可以跟着改变。",
  },
  "13": {
    question: "看不清小车的材料时，怎么办？",
    choices: ["凭颜色猜材料", "查制作说明，再贴材料标签", "把所有材料都贴上"],
    answer: 1,
    explanation: "颜色常能从照片看出，材料却可能需要额外资料。",
  },
  "14": {
    question: "两张便签说法不一样，暂时查不清时怎么办？",
    choices: ["选看起来更好听的名字", "把问号藏起来", "留下问号和理由，再请求补充资料"],
    answer: 2,
    explanation: "认真保留未知，比没有依据地强行给名字更可靠。",
  },
  "15": {
    question: "学习用的例子需要什么？",
    choices: ["照片，以及核对过的标签", "只有一串名字", "随便配上标签的漂亮照片"],
    answer: 0,
    explanation: "照片告诉助手看什么，标签告诉它这一例叫什么；两者要对应。",
  },
  "16": {
    question: "只改正这一次的照片记录，会自动让我学会吗？",
    choices: ["会，所有旧版本都会变", "不会，记录与学习是不同动作", "会，照片会自动变成训练材料"],
    answer: 1,
    explanation: "改记录只影响这份记录。改学习材料、重新学习需要明确执行。",
  },
  "17": {
    question: "修好例子里的错标签之后，还需要什么？",
    choices: ["立刻宣布什么都会了", "把错误记录全部藏起来", "重新学习，再比较实际结果"],
    answer: 2,
    explanation: "修改草稿没有自动更新模型，重学后还要检验变化。",
  },
  "18": {
    question: "想帮助我认识更多样子，哪种例子更有价值？",
    choices: ["同一张照片复制很多份", "不同个体和角度，且标签可靠的照片", "数量多就可以，不看标签"],
    answer: 1,
    explanation: "例子的准确性与覆盖范围都重要，重复数量不能替代不同样子。",
  },
  "19": {
    question: "小车总在蓝纸上，可能带来什么问题？",
    choices: ["我可能误把蓝背景当成认车的线索", "蓝纸会把小车变成积木", "所有AI都会只认识蓝色"],
    answer: 0,
    explanation: "偶然一起出现的背景可能带偏判断，需要交叉背景的例子来检验。",
  },
  "20": {
    question: "为什么还要考没参与学习的新照片？",
    choices: ["新照片一定更简单", "新照片会自动教会AI", "熟悉照片认对，不代表新情况也能处理"],
    answer: 2,
    explanation: "新材料帮助我们检查适用范围；测试时不把答案偷偷放进学习材料。",
  },
  "21": {
    question: "交还失物前，应该依据什么？",
    choices: ["最先出现的猜测", "与访客要求对应、核对过的线索", "最漂亮的物件"],
    answer: 1,
    explanation: "把问题、线索和结论对应起来，再作决定。",
  },
  "22": {
    question: "录音里听见鸟鸣，能说明鸟就在旁边吗？",
    choices: ["不能，也可能是播放器的录音", "能，只要听见就一定在", "鸟鸣只能来自照片"],
    answer: 0,
    explanation: "录音内容与播放来源要分别记录，不能混在一起。",
  },
  "23": {
    question: "把整理图鉴的方法用到叶片上，先做什么？",
    choices: ["沿用玩具的旧标签", "让AI直接猜所有树种", "核对新材料，整理例子，再学习和检验"],
    answer: 2,
    explanation: "方法可以迁移，具体材料和标签仍需重新核对。",
  },
  "24": {
    question: "照片暗、声音吵，还无法确认时怎么办？",
    choices: ["必须马上给出确定答案", "补充材料、改善条件，必要时保留未知", "把把握分改高一些"],
    answer: 1,
    explanation: "不同困难需要不同办法，合理表达不确定也是负责任的选择。",
  },
  "25": {
    question: "一个能交给别人尝试的委托，需要什么？",
    choices: ["明确问题、合适材料和可核对的依据", "保证AI每次都答对", "只要题目足够难"],
    answer: 0,
    explanation: "人负责设定任务、检查材料与核对结果，AI是帮助完成任务的工具。",
  },
};

const lesson = (
  id: string,
  opening: string,
  steps: Omit<LessonStep, "id">[],
  exploration: string,
): LessonFlow => ({
  opening,
  question: knowledge[id].question,
  steps: steps.map((step, index) => ({
    ...step,
    id: `${id}-${String(index + 1).padStart(2, "0")}-${step.unit}`,
  })),
  check: knowledge[id],
  exploration,
});

export const LESSON_FLOWS: Record<string, LessonFlow> = {
  "01": lesson(
    "01",
    "我只能看到你交给我的画面。今天先让画面清楚起来，再一起核对我的判断。",
    [
      beat(
        "wipe",
        "先擦清镜头",
        "按住取景画面来回擦，先把雾擦掉。",
        option("blur", 0),
      ),
      beat(
        "cover",
        "把叶子轻轻推开",
        "抓住叶子的边向左拖，让被挡住的物件露出来。",
        option("occlusion", 0),
      ),
      photo(1),
      result("画面清楚了，判断仍然只是猜测。接下来找资料核对。"),
      verify(),
    ],
    "再挡住一点、拍一张，然后推开再拍。我的判断和把握发生了什么变化？",
  ),
  "02": lesson(
    "02",
    "声音也能成为输入。我们先听两种声音，再分清我是在认声音，还是在把话写成文字。",
    [
      listen(),
      hear(),
      result(),
      beat(
        "sound-verify",
        "核对声音从哪来",
        "打开声源资料，检查录音内容与现场物件。",
        event("verify"),
      ),
      beat(
        "sound-select",
        "换成溪水录音",
        "这次换一种声音，留意持续的水声和一声声的铃声有什么不同。",
        option("soundKind", "water"),
      ),
      listen(2),
      hear(2),
      result(),
    ],
    "再选一种录音，先说说自己的判断，再请我听，并查声源资料。",
  ),
  "03": lesson(
    "03",
    "要求可以写下来，也可以说出来。先认清手里的信息，才能选对工具。",
    [
      beat(
        "message-first",
        "读一读便签",
        "只看这一张便签：它想要什么，又不要什么？",
        event("message", 1),
      ),
      beat(
        "message-second",
        "看看口信的文字",
        "口信已由人写成文字。这一次，工具处理的是这些文字。",
        event("message", 2),
      ),
      beat(
        "tool-choose",
        "选一个合适的工具",
        "我们现在读的是文字，选择能处理文字线索的入口。",
        event("toolChoose"),
      ),
      beat(
        "text-predict",
        "请我读一读",
        "留意我找出的关键词，以及“不要”这样的限制。",
        event("textPredict"),
      ),
      result(),
    ],
    "换一份便签再读，看看否定词会怎样改变要求。",
  ),
  "04": lesson(
    "04",
    "一张照片留下一个瞬间。想知道小车往哪儿动，需要比较前后画面。",
    [
      beat(
        "motion-scrub",
        "看看开头、中间和结尾",
        "拖动短片进度，分别停在三个位置，留意小车在哪里。",
        { type: "motion-frames" },
      ),
      beat(
        "motion-predict",
        "把连续画面交给我",
        "我会比较画面里的位置变化。你观察到的方向和我一样吗？",
        event("motionPredict"),
      ),
      result(),
      beat(
        "motion-verify",
        "核对运动方向",
        "用短片的实际先后顺序来检查，不能只看某一张的车头。",
        event("verify"),
      ),
    ],
    "只停在一张画面时，哪些事情能知道，哪些事情还不知道？",
  ),
  "05": lesson(
    "05",
    "有些助手能处理不止一种信息。照片和声音可以互相补充，先确认它们说的是同一件事。",
    [photo(1), result(), listen(), hear(), checkSource(), fuse(), result()],
    "选择不同的线索组合，比较判断；每次都先确认来源。",
  ),
  "06": lesson(
    "06",
    "被挡住的部分不会自动出现在我眼里。我们先保留原来的画面，再补全线索作对照。",
    [
      photo(1, "先拍下被挡住的一角，保留这次判断。"),
      result(),
      beat("cover", "只改变遮挡", "其他条件不动，把叶子向左推开。", option("occlusion", 0)),
      photo(2),
      beat("compare", "对照前后两张", "看看哪一部分信息变多了，再比较实际判断。", event("compare")),
      result(),
    ],
    "试着挡住不同程度，看看什么情况下信息开始不足。",
  ),
  "07": lesson(
    "07",
    "周围的杂音可能盖住需要的声音。改善采集条件，常常比催我再猜一次更有帮助。",
    [
      listen(),
      hear(),
      result(),
      beat(
        "noise",
        "换到安静一点的地方",
        "把采集位置调到安静处，录音种类保持不变。",
        option("soundNoise", 0.05),
      ),
      listen(2),
      hear(2),
      result(),
      beat("improve", "选择一个补救办法", "想想实际能怎样改善这份录音。", event("improveChoice")),
    ],
    "比较不同噪声条件。哪些声源更容易听清，哪些仍需要补录？",
  ),
  "08": lesson(
    "08",
    "同一件东西会有不同样子。我们让物件保持不变，只改一个观察条件。",
    [
      photo(1),
      result(),
      beat("angle", "把玩具转到30度", "先只转角度，保留原来的光线和背景。", option("angle", 30)),
      photo(2),
      beat(
        "compare",
        "看看两种样子",
        "同一件东西没有变，画面和判断可能发生变化。",
        event("compare"),
      ),
      result(),
    ],
    "再只调一次光线，和原来的照片比较。",
  ),
  "09": lesson(
    "09",
    "想知道谁影响了判断，一次只改变一个条件。先比较背景，再比较物件。",
    [
      photo(1),
      beat(
        "background",
        "只换成蓝色背景纸",
        "积木、角度和光线都保持不变。",
        option("background", "blue"),
      ),
      photo(2),
      changeKind("car", "小车"),
      photo(3),
      beat(
        "compare",
        "看看这次对照",
        "最近两张只换了物件；前面两张只换了背景。分开理解这两种变化。",
        event("compare"),
      ),
      result(),
    ],
    "自己选一种背景再作对照，每次只改变一样。",
  ),
  "10": lesson(
    "10",
    "画面里的物件和录音的内容，可以是不同的东西。先说清楚问题，再看答案。",
    [
      photo(1),
      listen(),
      hear(),
      checkSource(),
      fuse(),
      result("现在问的是画面里的物件。记住这次回答。"),
      beat(
        "fusion-question",
        "这次改问录音内容",
        "选择“录音里是什么声音”，材料保持不变。",
        option("question", "sound"),
      ),
      fuse(2),
      result("问题变了，答案所描述的对象也会改变。"),
    ],
    "用同一组线索试两种问法，并说清每种问法问的是什么。",
  ),
  "11": lesson(
    "11",
    "我给出的名字是猜测，你贴的标签要来自查证。把两个来源分清楚。",
    [photo(1), result(), source(), label()],
    "换个物件再拍，分别记录我的猜测和你的核对。",
  ),
  "12": lesson(
    "12",
    "分类要看这一次的任务。相同的东西，按颜色和按用途可能进入不同的组。",
    [
      beat("sort-color", "先按颜色分", "每次选一件，再放进相同颜色的箱子。", event("sortColor", 6)),
      beat(
        "sort-use",
        "现在改按用途分",
        "换成“按用途分”，重新安放同样的六件物件。",
        event("sortUse", 6),
      ),
    ],
    "观察小车与枫叶：两种分法中，它们什么时候在一起？",
  ),
  "13": lesson(
    "13",
    "名字、颜色和材料都是属性。每一张标签都需要相应的依据。",
    [
      beat(
        "attribute-name",
        "先贴名字",
        "看看图片，选择物件的名字。",
        event("attribute", 1, "名字:小车"),
      ),
      beat(
        "attribute-color",
        "再贴颜色",
        "这一条可以直接观察图片。",
        event("attribute", 1, "颜色:红色"),
      ),
      beat(
        "attribute-source",
        "材料需要什么依据",
        "翻开制作说明，看看物件是用什么做的。",
        event("sourceCheck"),
      ),
      beat(
        "attribute-material",
        "依据资料贴材料",
        "照片不一定能分清材料，把查到的内容写到标签上。",
        event("attribute", 1, "材料:木头"),
      ),
    ],
    "想想还有哪些属性能直接看出，哪些需要更多资料。",
  ),
  "14": lesson(
    "14",
    "暂时不知道也可以。关键是保留为什么不确定，以及接下来要查什么。",
    [
      photo(1),
      verify(),
      beat(
        "unknown",
        "带着理由留一个问号",
        "选一个有依据的理由，再把照片送进问号夹。",
        event("unknown"),
      ),
    ],
    "给寄件人想一个具体问题，帮助你补齐缺少的证据。",
  ),
  "15": lesson(
    "15",
    "例子册里的照片和标签要配成一对。我们收集两类东西，每类有不同个体。",
    [
      ...sample(1, "car", "小车", 3),
      ...sample(2, "car", "小车", 4),
      ...sample(3, "block", "积木", 3),
      ...sample(4, "block", "积木", 4),
      beat(
        "album-save",
        "保存这本例子册",
        "检查至少两类、四份例子，再保存。保存材料还不等于重新学习。",
        event("albumSave"),
      ),
    ],
    "给例子册再补一种有用的不同样子，避免反复放入同一张。",
  ),
  "16": lesson(
    "16",
    "改正这一张的记录，与改变我学过的内容，是两件事。我们实际检查一次。",
    [
      photo(1),
      result(),
      source(),
      label(),
      beat(
        "model-check",
        "看看学习版本有没有变",
        "你刚才改的是记录。检查我是否已经重新学习。",
        event("modelCheck"),
      ),
    ],
    "再核对一张照片，分别查看记录、例子册和学习版本。",
  ),
  "17": lesson(
    "17",
    "例子里的标签也可能贴错。查证、修正、重新学习和检验，是连续但不同的动作。",
    [
      packet(),
      beat(
        "example-edit",
        "逐张核对例子标签",
        "翻阅例子，打开资料查证，把不对应的标签改正。",
        event("exampleRelabel"),
      ),
      photo(1),
      train(),
      beat(
        "compare-models",
        "比较学前学后",
        "用同一张照片比较两个版本，保留真实变化。",
        event("compare"),
      ),
      result(),
    ],
    "换一张照片再检查，看看改进是否也适用于别的样子。",
  ),
  "18": lesson(
    "18",
    "重复照片增加了数量，不一定增加经验。让例子出现更多可靠的不同样子，再去检验。",
    [
      ...sample(1, "car", "小车", 5),
      beat("angle", "试一个新角度", "转到20度，给相同类别补一种外观。", option("angle", 20)),
      photo(2),
      source(),
      label(),
      add(),
      train(),
      beat(
        "test-known",
        "回到原问题照片试一试",
        "先检查熟悉的问题有没有变化，再决定还需要什么材料。",
        event("knownTest"),
      ),
      result(),
    ],
    "再用新照片检验；不要只看熟悉照片上的进步。",
  ),
  "19": lesson(
    "19",
    "如果每类东西总配一种背景，我可能把背景误当成线索。我们补上交叉背景的例子。",
    [
      packet(),
      changeKind("car", "小车"),
      beat(
        "background",
        "小车换到黄纸上",
        "让小车也出现在原来少见的背景中。",
        option("background", "yellow"),
      ),
      photo(1),
      source(),
      label(),
      add(),
      changeKind("block", "积木"),
      beat(
        "background",
        "积木换到蓝纸上",
        "两类物件都要见过不同背景。",
        option("background", "blue"),
      ),
      photo(2),
      source(),
      label(),
      add(),
      train(),
      testNew(),
      result(),
    ],
    "再选一种背景作检验，保留改善与没有改善的结果。",
  ),
  "20": lesson(
    "20",
    "熟悉照片上认对，不代表新情况也能处理。测试时先固定版本，再用新旧材料分别检查。",
    [
      photo(1),
      beat("freeze", "先封存这一版", "考试期间保持同一版本，才能比较结果。", event("freeze")),
      beat("test-known", "先看原来的问题", "保留老照片上的结果。", event("knownTest")),
      result(),
      testNew(),
      result(),
      testNew(2),
      result("两张新照片的结果都留下来，不能只保留正确的一张。"),
    ],
    "说说这一版擅长什么、还在哪些条件下会出错。",
  ),
  "21": lesson(
    "21",
    "帮助访客找东西，需要让每条线索都对应他的要求。先调查，再交还。",
    [
      photo(1),
      listen(),
      hear(),
      beat(
        "clue-read",
        "读清访客的说明",
        "看清楚要找的是什么，声音与物件不要混淆。",
        event("clueRead"),
      ),
      checkSource(),
      fuse(),
      result(),
      beat(
        "delivery",
        "交还有依据的物件",
        "根据核对过的线索选择失物，再交还给访客。",
        event("deliver"),
      ),
    ],
    "改变遮挡再检查，看看哪些线索是关键。",
  ),
  "22": lesson(
    "22",
    "一份声音档案要分开记录：听见什么，以及声音从哪里来。先用鸟鸣录音试一次。",
    [
      listen(),
      hear(),
      beat(
        "sound-verify",
        "查声源资料",
        "核对鸟鸣是现场声音，还是播放器中的录音。",
        event("verify"),
      ),
      ...archive(1),
      beat(
        "sound-select",
        "再听溪水",
        "换一种声音，看看来源是否相同。",
        option("soundKind", "water"),
      ),
      listen(2),
      hear(2),
      beat("sound-verify", "再核对一次来源", "每一份档案都需要自己的依据。", event("verify", 2)),
      ...archive(2),
    ],
    "再听其他录音，看看改档案与重训声音工具有什么区别。",
  ),
  "23": lesson(
    "23",
    "玩具上用过的整理方法，也能用于新的叶片材料。但新标签仍需重新查证。",
    [...sample(1, "maple", "枫叶"), ...sample(2, "ginkgo", "银杏叶"), train(), testNew(), result()],
    "补充另一个叶片个体，再检查助手的适用范围。",
  ),
  "24": lesson(
    "24",
    "雨天的困难可能来自照片、声音，也可能来自不完整的说明。分别检查，再选择办法。",
    [
      beat("wipe", "先处理镜头水汽", "擦清镜头，但先不要断言答案一定会变好。", option("blur", 0)),
      beat("light", "改善光线", "把光线调到合适的位置，保留物件本身。", option("light", 1)),
      photo(1),
      result(),
      beat(
        "noise",
        "改善录音条件",
        "换到安静一点的位置，试着保留需要的声音。",
        option("soundNoise", 0.1),
      ),
      listen(),
      hear(),
      beat(
        "clue-read",
        "看看雨湿的说明",
        "留意便签里还缺什么，缺失的信息不能靠猜补齐。",
        event("clueRead"),
      ),
      checkSource(),
      fuse(),
      result(),
      beat(
        "rain-choice",
        "决定下一步怎么办",
        "根据刚才发现的问题选择办法，也可以保留未知。",
        event("decision"),
      ),
    ],
    "用另一种办法再试，解释为什么这次选择它。",
  ),
  "25": lesson(
    "25",
    "最后由你出一道委托。问题、材料和核对依据都要清楚，再让助手实际试一次。",
    [
      beat("author-title", "给委托取个名字", "用一个简短名字，让访客知道这是哪一份委托。", {
        type: "field",
        label: "委托名称",
        length: 2,
      }),
      beat("author-question", "写清要问的问题", "写清想辨认的物件，或想识别的声音；一次只问一个问题。", {
        type: "field",
        label: "我要问的问题",
        length: 5,
      }),
      beat("author-materials", "选择需要的材料", "材料要和问题有关，至少保留一种。", {
        type: "field",
        label: "委托材料",
        length: 1,
      }),
      beat("author-object", "安排照片里的对象", "选一个准备让访客观察的对象。"),
      beat("author-cover", "设置一点观察困难", "可以保留适量遮挡，也可以选择清楚的画面。"),
      beat("author-explanation", "写好核对办法", "说明答案的依据，以及什么情况下需要人检查。", {
        type: "field",
        label: "给访客的核对说明",
        length: 6,
      }),
      beat("author-save", "保存委托", "把问题、材料和说明一起保存。", event("author")),
      beat("author-test", "自己先试一次", "观察助手的实际回答，检查你的委托是否说清楚了。", {
        type: "authored",
      }),
      result(),
    ],
    "修改一处说明或材料后再试，改过的作品必须重新检验。",
  ),
};

export function flowFor(id: string): LessonFlow {
  const flow = LESSON_FLOWS[id];
  if (!flow) throw new Error(`没有这项课程的引导：${id}`);
  return flow;
}
export function conceptFor(id: string): string {
  return guideFor(id).word.text;
}
