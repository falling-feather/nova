// The five rooms and twenty-five stations of chapter 7, as designed in README.md.
export type RoomId = "foundry" | "gallery" | "council" | "counting" | "press";

export interface Station {
  id: string;          // "01".."25"
  room: RoomId;
  title: string;
  task: string;        // what the student does, in one or two short sentences
  finding: string;     // what they should have noticed once it is done
  synthesis?: boolean; // the fifth station of each room
}

export interface Room {
  id: RoomId;
  name: string;
  question: string;
  bug: string;         // the typesetter's fault this room explains
  page: string;        // the special-issue page it fills
  minutes: number;
}

export const ROOMS: Room[] = [
  { id: "foundry", name: "铸字房", question: "模型读句子时，读的是字、词，还是别的什么？", bug: "字字把一句话切成的块，和我们想的不一样。", page: "第一版 · 铸字篇", minutes: 25 },
  { id: "gallery", name: "名牌馆", question: "一块活字怎样带上“意思”？", bug: "字字给每块活字挂了一张写满数字的名牌。", page: "第二版 · 名牌篇", minutes: 25 },
  { id: "council", name: "议事厅", question: "一个词的意思，怎样被句子里的其他词改变？", bug: "“苹果”是水果还是手机，要看它在会上听了谁。", page: "第三版 · 议事篇", minutes: 35 },
  { id: "counting", name: "账房", question: "“多听谁一点”是怎样算出来的？", bug: "谁听谁多少，是一笔一笔算出来的账。", page: "第四版 · 账房篇", minutes: 30 },
  { id: "press", name: "排印车间", question: "模型怎样写出一句话？", bug: "字字写作时只能看前面，胆子太小就会一直重复。", page: "第五版 · 合写特刊", minutes: 35 },
];

export const STATIONS: Station[] = [
  { id: "01", room: "foundry", title: "进门的一句话", task: "写一句话交给字字，比一比：按字拆、按词拆、字字拆，三种拆法有什么不同。", finding: "字字的拆法和按字拆、按词拆都不完全一样：常见的词它早就铸成了一整块，不常见的词只能拆成单字或半个词。" },
  { id: "02", room: "foundry", title: "亲手铸字", task: "先猜哪两块最常相邻，再铸字、核对统计。试三轮，观察合并后次数怎样变化；之后可以自由研究。", finding: "字架上的活字是从大量文字里统计出来的：最常挨在一起的两块，被铸成了一块。" },
  { id: "03", room: "foundry", title: "生僻的名字", task: "输入同学的名字、新造的词或外文，看看要用几块活字。", finding: "常用的词一块就够；不常见的词要拆成好几块；字架上根本没有的字，只能用空白块代替。" },
  { id: "04", room: "foundry", title: "字架放多大", task: "调整字架的大小，比较每句话要用几块活字、字架要占多少地方。", finding: "字架越大，一句话用的块越少，但要存的活字越多；加到一定程度，再加也省不了几块。" },
  { id: "05", room: "foundry", title: "给排字机挑一副字架", task: "为特刊挑一个字架大小，说出你的理由。", finding: "词元是模型阅读的基本单位；字架多大，是“块数”和“占地”之间的取舍。", synthesis: true },
  { id: "06", room: "gallery", title: "翻开名牌", task: "翻开几块活字背后的名牌，看看上面写着什么。", finding: "在模型里，一个词元就是一串数字。" },
  { id: "07", room: "gallery", title: "词义地图", task: "在地上的词义地图里走一走，找找各组活字聚在哪里。", finding: "在这个模型里，用法相近的词往往有相近的名牌；地图压缩了信息，精确比较要看相似度。" },
  { id: "08", room: "gallery", title: "放放看", task: "先猜几块新活字该站在哪里，再看它们实际站在哪里、和谁最像。", finding: "名牌之间像不像，可以真实地算出来。" },
  { id: "09", room: "gallery", title: "名牌从哪来", task: "看看两个词常出现在什么样的句子里，再比比它们的名牌。", finding: "名牌从训练句子中学来，用法会影响相似程度；这不等于模型拥有人的理解。" },
  { id: "10", room: "gallery", title: "两面派“苹果”", task: "在地图上找到“苹果”，看它离水果和手机各有多远。", finding: "初始名牌包含多种用法；要确定这一次的意思，还需要句子里的线索。", synthesis: true },
  { id: "11", room: "council", title: "开会", task: "一句话变成一场会议。点一位与会者，看它在听谁。", finding: "每个词元都会听其他词元说话，按相关程度分配“听”的多少。" },
  { id: "12", room: "council", title: "苹果是哪一个", task: "比较“小明用苹果拍了一张照片”和“小明吃了一个苹果”这样的两句话：“苹果”在听谁？开完会，它的名牌更像谁？", finding: "改变上下文会改变模型中的表示；变化的方向和大小以实际计算为准。" },
  { id: "13", room: "council", title: "她是谁", task: "在几句话里移动、删除或替换线索词，看“她”的注意力跟着去了哪里。", finding: "线索在哪里，注意力往往就跟到哪里；但这只是实测到的现象，不等于模型的“理由”。" },
  { id: "14", room: "council", title: "捣乱的人", task: "在句子中间插进一段无关的话，看注意力有没有被分走。", finding: "无关的话可能分走一些注意力，也可能被忽略，要看实际算出来的结果。" },
  { id: "15", room: "council", title: "几位记录员", task: "换不同楼层、不同记录员看同一句话，比较两位并记录本句表现；还可继续探索更多头与层。", finding: "不同头和层可以形成不同的注意力模式；一次观察不能说明它永远关注哪种关系。", synthesis: true },
  { id: "16", room: "counting", title: "提问牌与名片", task: "给“她”写一张提问牌，再给四位与会者各写一张名片。", finding: "提问牌写“我想找什么”，名片写“我是什么”。" },
  { id: "17", room: "counting", title: "打分", task: "拨算盘：提问牌和每张名片对应格相乘，再相加。", finding: "对应相乘再相加（点积）：对得越上，分越高。" },
  { id: "18", room: "counting", title: "按比例分糖", task: "把 100 颗糖按分数分给四位；拉动放大镜，看差距怎样变化。", finding: "分高的分得多，总数永远是 100%；放大镜越强，差距拉得越大。" },
  { id: "19", room: "counting", title: "混合发言", task: "按分到的糖，把四份发言稿调和成“她”的新名牌。", finding: "听了谁多少，新名牌里就有谁多少：这就是加权混合。" },
  { id: "20", room: "counting", title: "拿掉座位号", task: "移动下排字牌，比较有、无座位号时，同一个人的新名牌是否改变。完成后可另做“让小林被听见”的调参挑战。", finding: "在这场双向小会议里，去掉位置信息后，同一词元的结果只随排列交换。位置让计算能区分顺序，但不保证答对。", synthesis: true },
  { id: "21", room: "press", title: "下一块是什么", task: "亲手选择下一块，查看前后候选和实际输入。可以撤下重选，比较不同续写。", finding: "生成就是一次次预测下一个词元。" },
  { id: "22", room: "press", title: "只能听前面的", task: "每印下一块，看新活字在听谁。", finding: "写作时只能看已经写下的字，看不到还没写出来的字。" },
  { id: "23", room: "press", title: "胆量旋钮", task: "固定开头和种子，比较低、中、高温的实际续写，为一种用途挑选并解释。深入路线再比较多次抽样。", finding: "低温让高概率候选更集中，高温让选择更分散；这改变选词方式，不保证事实正确。" },
  { id: "24", room: "press", title: "流畅不等于正确", task: "让字字续写校庆新闻，再逐条核对其中的“事实”。", finding: "字字会写出通顺却不真实的句子：它没有读过这张安排表，不能把流畅的续写当作事实。" },
  { id: "25", room: "press", title: "合写特刊", task: "你写标题和开头，字字续写，你来修改；版面上标出哪些字是 AI 写的。", finding: "人机合写需要人来把关，并注明 AI 的参与。", synthesis: true },
];

export const stationsOf = (room: RoomId) => STATIONS.filter(s => s.room === room);
export const roomOf = (id: RoomId) => ROOMS.find(r => r.id === id)!;

/** The short route has its own prerequisites; skipped studies never receive stamps. */
export const CORE_STATIONS = ["01", "06", "12", "21", "22", "23", "24", "25"] as const;
export type LearningRoute = "core" | "full";
export const isCoreStation = (id: string) => (CORE_STATIONS as readonly string[]).includes(id);
export const CORE_REVIEWS = ["01", "06", "12", "25"];
export const stationsForRoute = (route: LearningRoute): readonly string[] => route === "core" ? CORE_STATIONS : STATIONS.map((s) => s.id);

/** The real arrangements of this year's anniversary, used to check the typesetter's news. */
export const ANNIVERSARY_FACTS = [
  { key: "school", label: "学校", value: "晨风中学" },
  { key: "n", label: "第几届校庆", value: "第六十届" },
  { key: "day", label: "哪一天", value: "十月十八日，周六" },
  { key: "venue", label: "演出地点", value: "礼堂" },
  { key: "group", label: "表演的社团", value: "合唱团" },
  { key: "program", label: "节目", value: "歌曲《晨风》" },
  { key: "award", label: "获奖", value: "初二（三）班获得一等奖" },
];
