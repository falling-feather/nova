/* Learning objectives and evidence. All spatial fields come from layout.js.
   Student-facing text is short and spoken by 小汀: `intro` opens the task,
   `hints[evidence]` names the next action, `takeaway` closes it in one line.
   `knowledge` and `boundary` are fuller notes for teachers and the journal. */
(function (G) {
  const main = [
    {
      id: "arrival",
      n: "01",
      title: "这朵花叫什么？",
      minutes: 18,
      required: ["photo", "recognize", "verify", "stranger", "save"],
      steps: ["拍照", "识图", "核对", "考考 AI", "收进游记"],
      icons: ["camera", "search", "tag", "question", "book"],
      intro: "AI 学过花圃里的三种花。挑一朵你喜欢的，给它拍张照吧！",
      hints: {
        photo: "左右转一转，找到最好看的样子，然后按「拍照」。",
        recognize: "拍好啦！按「识图」，看看 AI 猜它叫什么。",
        verify: "AI 只是在猜。看看花旁的小标牌，它猜对了吗？拿不准也没关系。",
        stranger: "园丁新种的暖阳菊，AI 从没学过。先猜一猜：AI 认得出来吗？",
        save: "给照片起个名字，收进你的游记吧！",
      },
      takeaway:
        "识图是 AI 比一比照片里的颜色，去猜名字。它只认得学过的花，没见过的也会硬猜一个，所以要自己核对！",
      question: "AI 是怎么认花的？碰到没学过的花，它会怎么样？",
      knowledge:
        "拍照是在记录画面；识图是在根据画面提出判断。本例的识图工具只比较照片里各种颜色的多少，和学过的三种花逐个比，挑最像的。它不认识没学过的花，只会把它硬说成最像的那一种，所以颜色相同、形状不同的暖阳菊会被认成金穗花。结果只是候选，要查看标牌确认。",
      boundary:
        "相机取景与拍摄是真实三维渲染；识图使用三类教学植物的像素颜色模板匹配，柱状图显示的正是它比较的12个色相区间。第四朵暖阳菊不在模板里，用来演示模型只认识学过的类别。不是通用植物识别，也不是直接读取物件名称。",
    },
    {
      id: "distinguish",
      n: "02",
      title: "哪个用了 AI？",
      minutes: 20,
      required: ["date", "content", "method", "timer", "uncertain"],
      steps: ["按日期排", "按画面找", "猜一猜", "定时开灯", "想一想"],
      icons: ["photo", "search", "info", "lamp", "question"],
      intro:
        "照相馆的相册会自己排照片，展灯会自己亮。它们都用了 AI 吗？我们来查一查！",
      hints: {
        date: "先按「按日期排」，看看照片怎样排队。",
        content: "再按「找花朵照片」，这次相册要看着画面去找。",
        method: "两种整理办法，哪一个用到了 AI？想好了就点一个。",
        timer: "给展灯选一个开灯时间，再分别看看到点前和到点时。",
        uncertain: "那扇门会自己打开，它用了 AI 吗？想好了就选一个。",
      },
      takeaway:
        "按日期排序只是比一比数字；按画面找花，要分析图片，才用到了 AI。会自己动的东西，不一定有 AI。",
      question: "会自己动的东西，就一定用了 AI 吗？",
      knowledge:
        "按日期排序读取已有日期；本例的识图按钮分析画面。定时灯按设定时间开关。机器人是能在现实空间行动的机器，AI 也可以在软件里工作。不能只凭外形或“会自动动起来”判断内部方法。",
      boundary:
        "日期排序、定时器是真实规则计算；图像检索读取照片像素。未知装置没有给出内部说明，课程不要求猜测。规则与学习不是整个 AI 领域的绝对分界。",
    },
    {
      id: "everyday",
      n: "03",
      title: "原来，这些也是 AI",
      minutes: 25,
      required: [
        "translate",
        "checkOrder",
        "transcribe",
        "publish",
        "toolChoice",
        "information",
      ],
      steps: ["翻译", "拿丝带", "听口信", "发通知", "选办法", "想一想"],
      icons: ["sparkle", "check", "speaker", "sign", "door", "book"],
      intro: "服务社收到一张英文订单，还要贴一条广播通知。请 AI 来帮帮忙吧！",
      hints: {
        translate: "订单是英文写的。按「翻译」看看它说了什么。",
        checkOrder: "订单要什么颜色的丝带？选出正确的那一种。",
        transcribe: "AI 把广播口信写成了文字。先听一听原声，看看哪里写错了。",
        publish: "把写错的地方改正，再按「发布通知」。",
        toolChoice: "进门一定要刷脸吗？选一种你觉得合适的办法。",
        information: "书架总给你推荐恐龙书。你想怎么做？",
      },
      takeaway:
        "翻译、把声音变成文字、推荐图书，都是 AI 在帮忙。可 AI 也会听错写错，用之前要核对；要不要用，由你决定。",
      question: "翻译和把声音变成文字，都是 AI 在帮忙吗？它会出错吗？",
      knowledge:
        "语言工具可以帮助翻译和整理语音内容；播放器只是播放已有声音。无论工具怎样帮助，你仍要根据任务选择物品、核对时间，再决定是否发布。刷脸和推荐也可以用于生活；先看看任务是否需要它，以及它用了哪些信息，再作选择。",
      boundary:
        "本离线版用已校订的双语教学卡和语音转写案例呈现流程，不运行通用翻译或语音识别模型。播放/朗读与文字编辑是实际功能；案例转写不是对你声音的识别。",
    },
    {
      id: "create",
      n: "04",
      title: "和 AI 一起画画",
      minutes: 40,
      required: ["draw", "candidates", "select", "refine", "exhibit"],
      steps: ["起笔", "看续画", "选一张", "改一改", "挂起来"],
      icons: ["pencil", "sparkle", "heart", "brush", "photo"],
      intro:
        "园丁阿禾请你给花园添一幅画。你先画几笔，AI 会想出两种画法，最后由你决定！",
      hints: {
        draw: "在画纸上随便画几笔：一片花瓣、一根茎都可以。",
        candidates: "画好了？按「请 AI 续画」，看看它想到了什么。",
        select: "你更喜欢哪一张？也可以只要自己的原画。",
        refine: "在画上再添几笔，或者写一句为什么这样选。",
        exhibit: "按「挂进花园」，把作品放进小镇吧！",
      },
      takeaway:
        "AI 能给出创作的点子，但画什么、留什么，都由你决定。作品里最重要的，是你的想法。",
      question: "这幅画里，哪些是你的决定？哪些是 AI 的点子？",
      knowledge:
        "创作工具可以依据线索提出新的候选。你可以接受、修改、拒绝，也可以完全自己画。最终作品不靠“像不像标准答案”评判，而要看它是否表达了你的想法。",
      boundary:
        "续画使用本地条件形状模型：从原创合成线描样本学习均值与变化基，再依主要轮廓笔迹条件采样。只支持花朵/树/蝴蝶三类线描，不是通用图像大模型；三维展示牌由普通程序放置。",
    },
  ];
  const sides = [
    {
      id: "birds",
      n: "S01",
      title: "池塘边，谁在唱歌？",
      minutes: 6,
      required: ["listen", "analyze", "compare", "keep"],
      steps: ["录音", "分析", "对照", "收藏"],
      icons: ["speaker", "wave", "search", "heart"],
      intro: "芦苇丛里有三种鸟叫声。录下一段，让 AI 听听是哪一种！",
      hints: {
        listen: "选一个地方的声音，按「录一段」。",
        analyze: "按「分析声音」，AI 会把声音变成一根根柱子来比较。",
        compare: "按「听参考声」，和你录的像不像？",
        keep: "做成一张声音明信片，收进游记吧！",
      },
      takeaway:
        "AI 能比较声音的高低和变化，分辨是哪种叫声，但它听不懂鸟儿在说什么。",
      question: "AI 能分辨鸟叫声，它听得懂鸟在说什么吗？",
      knowledge:
        "声音也能被记录和分析。这里根据频率和变化形状寻找相似的参考声；候选需要对照。这不是在理解一句话，也不能仅凭一种声音知道周围的一切。",
      boundary:
        "三种声音是原创合成教学鸟鸣，不代表真实物种。系统实际分析合成音频的频率特征，不读取所选类别当作识别结果。",
    },
    {
      id: "ocr",
      n: "S02",
      title: "手写数字，电脑认得吗？",
      minutes: 6,
      required: ["write", "read", "correct", "ticket"],
      steps: ["写数字", "识别", "确认", "打小票"],
      icons: ["pencil", "search", "check", "bread"],
      intro: "面包师要按你写的数量装面包。在纸上写一个 0 到 9 的数字吧！",
      hints: {
        write: "在白纸上写一个数字，也可以拿一张样卡。",
        read: "按「识别数字」，看看 AI 认成了几。",
        correct: "认对了吗？不对就改过来，再按「就用这个数」。",
        ticket: "按「打印小票」，看看柜台上的面包！",
      },
      takeaway: "AI 能把纸上的字变成电脑能用的数字，但要先核对，对了再用。",
      question: "纸上的字，是怎样变成电脑能用的数字的？",
      knowledge:
        "识别工具从图像里提出字符候选。你可以核对并修改，再用确认后的数量工作。不确定不是书写者的错；换一种记录办法也能完成任务。",
      boundary:
        "真实本地近邻数字识别，参考样本来自 scikit-learn 自带 UCI 手写数字小数据集。只处理单个 0—9，不是通用中文 OCR。",
    },
    {
      id: "music",
      n: "S03",
      title: "你弹一句，我接一句",
      minutes: 9,
      required: ["play", "continue", "choose", "attach"],
      steps: ["弹开头", "接一句", "选一版", "留下来"],
      icons: ["note", "sparkle", "heart", "star"],
      intro: "随便按几个琴键，弹出你的开头。音乐亭会接着弹下去！",
      hints: {
        play: "弹三个以上的音，当作你的开头。",
        continue: "按「请 AI 接一句」，听听它怎么接。",
        choose: "喜欢就按「就要这一版」；不喜欢，可以再接一次。",
        attach: "给曲子起个名字，留在音乐亭！",
      },
      takeaway: "AI 会根据学过的旋律接着创作。好不好听，你说了算。",
      question: "AI 接的旋律是从哪里来的？好不好听由谁决定？",
      knowledge:
        "你给出起句，系统依据它学到的音符变化分布提出续写。原句与续写分别保留，你可以重来或自己接着弹。音乐好不好听，最终由你的用途与感受决定。",
      boundary:
        "本地二阶马尔可夫音符模型，训练自原创短旋律。是小型统计生成模型，不是 MusicRNN 或通用作曲大模型。声音由 Web Audio 合成。",
    },
    {
      id: "sources",
      n: "S04",
      title: "找到的图，还是画出的图？",
      minutes: 5,
      required: ["search", "generate", "source", "label"],
      steps: ["找一张", "画一张", "查来源", "贴标签"],
      icons: ["search", "sparkle", "info", "tag"],
      intro:
        "同样是花的图片，一张是从图库找到的，一张是 AI 新画的。怎么分清它们？",
      hints: {
        search: "按「从图库找」，找一张小镇的照片。",
        generate: "按「请 AI 画」，生成一朵新的花。",
        source: "看起来分不清？翻开「来源卡」看看。",
        label: "给两张图贴上正确的标签，放进游记。",
      },
      takeaway:
        "「找」是从已有的图片里挑，「生成」是 AI 新画的。看来源，比看像不像更靠谱。",
      question: "一张图很像照片，就能证明它是真的吗？",
      knowledge:
        "检索是在已有内容中寻找；生成是在给定条件下产生候选。我们要查看来源和用途，而不凭画风猜“真或假”。生成作品可用于想象海报，不能自动充当现场记录。",
      boundary:
        "本地图像库检索与小型线描模型生成实际运行。资料卡记录来源类别；不是互联网搜索，也不作真假鉴定。",
    },
    {
      id: "colorize",
      n: "S05",
      title: "老照片里，帽子是什么颜色？",
      minutes: 5,
      required: ["compare", "evidence", "uncertain", "save"],
      steps: ["试上色", "找线索", "下结论", "展出来"],
      icons: ["brush", "search", "question", "photo"],
      intro: "阁楼里有张黑白老照片。AI 能给它上色，可原来到底是什么颜色呢？",
      hints: {
        compare: "试试「红帽子」和「蓝帽子」，两种都挺像吧？",
        evidence: "翻翻照片背面和日记，有没有写着颜色？",
        uncertain: "资料里找不到答案。你会怎么说？",
        save: "给照片标上「想象上色」，再展出来。",
      },
      takeaway:
        "AI 上的颜色看着很自然，却不一定是真的。没有证据时，就说「还不知道」。",
      question: "AI 上的颜色看起来很真，就是原来的颜色吗？",
      knowledge:
        "图像可以补出看起来合理的颜色，但原始资料未必包含答案。没有证据时，可以说暂时不知道，并把上色版本标为想象，而不是历史事实。",
      boundary:
        "黑白图与上色候选均为原创教学插图，颜色由程序合成，不冒充实时图像生成或真实历史照片。",
    },
    {
      id: "offline",
      n: "S06",
      title: "断网了，什么还能用？",
      minutes: 4,
      required: ["switch", "local", "remote", "record"],
      steps: ["断开网络", "本地识别", "远程查询", "记下来"],
      icons: ["wifi", "search", "house", "pencil"],
      intro: "杂货铺的网络断了！看看哪些功能还能用。",
      hints: {
        switch: "先关掉「网络」开关，假装断网了。",
        local: "按「在本机识别」，价签上的数字还能认出来吗？",
        remote: "再按「查会员资料」，这个还能成功吗？",
        record: "两边有什么不同？按「记下来」。",
      },
      takeaway:
        "有的 AI 在自己的设备上就能算，有的要连远处的电脑。能不能离线，和是不是 AI 是两回事。",
      question: "断网以后，AI 还能工作吗？",
      knowledge:
        "有些模型可以在自己的设备上计算，有些服务需要远处的计算机。能否离线取决于实现方式，不等于是不是 AI。遇到连接问题，可以换用可用工具。",
      boundary:
        "本地数字模型真实运行；远程请求为显式通信情境模拟，没有秘密发起外网请求。",
    },
    {
      id: "clarify",
      n: "S07",
      title: "把那盆放到那里",
      minutes: 5,
      required: ["request", "clarify", "place", "confirm"],
      steps: ["说请求", "说清楚", "摆一摆", "确认"],
      icons: ["speaker", "pointer", "flower", "check"],
      intro: "有人说：「把那盆放到那里。」可是，哪一盆？放到哪里？",
      hints: {
        request: "先按「发出请求」，听听助手怎么回答。",
        clarify: "点一盆花，再点一个展台，把意思说清楚。",
        place: "让助手去摆，或者自己动手摆。",
        confirm: "摆对了吗？对的话按「就是这里」。",
      },
      takeaway: "跟 AI 说话要说清楚。说不清的时候，好的助手会先问一问。",
      question: "话没说清楚的时候，AI 能猜到你的意思吗？",
      knowledge:
        "协作时可以补充对象、位置和目标。信息不足时先问一问，通常比贸然执行更可靠。你也可以自己摆放，不必让所有任务都由 AI 完成。",
      boundary:
        "本版是可执行的规则对话情境，不是通用自然语言智能体。选定物件与位置后，三维物件实际移动。",
    },
    {
      id: "access",
      n: "S08",
      title: "让一幅画被「听」见",
      minutes: 7,
      required: ["draft", "edit", "listen", "attach"],
      steps: ["看草稿", "改一改", "听一听", "挂上去"],
      icons: ["sparkle", "pencil", "speaker", "photo"],
      intro: "有位看不清的朋友，想「听」听你的画。帮它写一段说明吧！",
      hints: {
        draft: "按「看草稿」，AI 先写了一段说明。",
        edit: "草稿说得对吗？加上你自己的想法。",
        listen: "按「朗读」，听听你写的说明。",
        attach: "满意了，就挂到作品旁边！",
      },
      takeaway: "AI 可以先写个草稿，但只有你知道画里的心意，要亲手改一改。",
      question: "AI 写的说明，能代替你说出画里的心意吗？",
      knowledge:
        "图片描述、文字朗读和人工说明可以一起服务阅读。工具的描述要对照作品，创作者的意图也需要自己表达。不要把未经检查的草稿直接当成事实。",
      boundary:
        "草稿为学生可修改的通用教学模板，非视觉语言模型。可编辑文本与设备语音合成实际工作；没有可用语音时保留字幕。",
    },
    {
      id: "simple",
      n: "S09",
      title: "不用 AI，也能做好",
      minutes: 6,
      required: ["choose", "position", "try", "keep"],
      steps: ["选办法", "放位置", "试一试", "说理由"],
      icons: ["bell", "pin", "walk", "pencil"],
      intro: "园丁忙着种花，总听不见有人来。门铃、留言牌、自动提醒，选哪个好？",
      hints: {
        choose: "选一种提醒办法。",
        position: "把它放在哪里，来访的人才看得到？",
        try: "按「请访客试试」，看看管不管用。",
        keep: "写一句你的理由，留下这个办法。",
      },
      takeaway: "解决问题不一定要用 AI。最合适的办法，才是最好的办法。",
      question: "最好的办法，一定是用 AI 的办法吗？",
      knowledge:
        "工具是否适合，要回到具体需求。普通按钮、清楚的标牌也可能足够。选择 AI 方案或普通方案都可以，关键是效果、使用者的意愿和你的理由。",
      boundary:
        "真实门铃/物件摆放和访客动画；识别提醒是明确标注的区域感应情境，非人脸识别。",
    },
  ];
  const summary = {
    id: "summary",
    n: "G01",
    title: "当一回小导游",
    minutes: 20,
    required: ["route", "tour", "reflection", "report"],
    steps: ["选三处", "带朋友逛", "写感想", "制作纪念图"],
    icons: ["route", "walk", "pencil", "book"],
    intro: "四个主线任务都完成啦！带一位新朋友逛逛春汀，介绍你的发现吧。",
    hints: {
      route: "选三个你最想介绍的地方。",
      tour: "带朋友走到每个地方，说说你在那里的发现。",
      reflection: "写一句：现在的你，怎样理解 AI？",
      report: "回顾四站发现，再做一张有照片、作品和感想的纪念图。",
    },
    takeaway: "用自己的经历介绍 AI，就是最好的介绍。",
    question: "离开小镇以后，你会怎样向别人介绍 AI？",
    knowledge:
      "你可以用自己的照片、操作和作品说明具体功能，而不是只说“它很智能”。仍不知道的事情可以保留为问题，报告记录经历，不代表自动评定学习成绩。",
    boundary:
      "纪念图在本机组合真实照片、作品和学生说明的节选；不生成虚构作品、不根据点击次数声称知识掌握。支线可选，图中不包含私人练习草稿，完整记录可以导出存档。",
  };
  for (const q of [...main, ...sides, summary])
    Object.assign(q, TownLayout.activities[q.id]);
  G.Curriculum = {
    main,
    sides,
    summary,
    all: [...main, ...sides, summary],
    get(id) {
      return this.all.find((q) => q.id === id);
    },
    // The next thing 小汀 suggests for an activity, given recorded evidence.
    nextHint(q, evidence = []) {
      const missing = q.required.find((x) => !evidence.includes(x));
      return missing ? q.hints[missing] : null;
    },
    stageNames: ["初遇", "辨清", "发现", "共创", "分享"],
  };
})(globalThis);
