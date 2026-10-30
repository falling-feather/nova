/** Hall guides: the question a hall asks, a route, a sourced chronology, notes on evidence and terms. */
import { frontiersGuide } from "./renovation.js";
export const galleryGuides = {
  frontiers: frontiersGuide,
  origins: {
    question: "“机器会不会思考”，怎样变成一个可以研究的问题？",
    overview:
      "人工智能从几个问题开始。这间展厅陈列三件事：图灵把“机器能思考吗”改写成一场游戏；四位科学家在一份计划书里给这个领域起了名字；罗森布拉特造出了一台会从例子里学习的机器。",
    goal: "分清“提出想法”“写下计划”和“做成实验”，并说出判断机器的本领需要什么证据。",
    route: ["turing", "dartmouth", "perceptron"],
    timeline: [
      {
        date: "1943",
        title: "用数学描述简化的神经元",
        text: "麦卡洛克和皮茨用逻辑描述了简化的神经细胞网络，这是一个数学模型。",
        sources: ["mcculloch-pitts"],
      },
      {
        date: "1950",
        title: "图灵提出“模仿游戏”",
        text: "只凭文字交谈，看提问者能否分出人和机器。",
        sources: ["turing"],
      },
      {
        date: "1955-08-31",
        title: "计划书里第一次出现“人工智能”",
        text: "四位科学家写下研究计划，邀请同行次年夏天共同研究。",
        sources: ["dartmouth"],
      },
      {
        date: "1956",
        title: "达特茅斯的夏季研究",
        text: "研究者聚到一起，人工智能成为一门学科。",
        sources: ["dartmouth", "dendral"],
      },
      {
        date: "1958",
        title: "感知机学会分辨左右",
        text: "机器第一次公开展示从例子中学习：分辨卡片上的记号在左边还是右边。",
        sources: ["perceptron"],
      },
    ],
    evidence: [
      {
        title: "从动词里找线索",
        text: "计划书里写的是“打算”“尝试”，论文里讲的是“模型”。先分清材料属于哪一类，再判断它能证明多少。",
        sources: ["dartmouth", "mcculloch-pitts"],
      },
      {
        title: "实验的题目也是史料",
        text: "感知机最早学的是分辨左右的卡片。记下输入和输出是什么，就不会把简单的分类说成“看懂了世界”。",
        sources: ["perceptron"],
      },
    ],
    glossary: [
      { term: "模型", meaning: "为了研究一个问题，保留最重要的部分、省略其他细节的简化表示。" },
      { term: "假设", meaning: "一个可以继续找证据、设计实验来检验的猜想。" },
      { term: "图灵测试", meaning: "看机器在文字交谈中能否被人误认为是人的一种测试。" },
      { term: "权重", meaning: "模型里决定每条输入分量轻重的数字，学习时会被调整。" },
    ],
  },
  rules: {
    question: "程序会回应、会推理时，它的答案从哪里来？",
    overview:
      "这间展厅属于“规则”：有的程序把化学家的经验写成规则，有的靠抓关键词和人交谈，还有一台专门下国际象棋的计算机。规则很管用，也会遇到例外；热潮之后的低谷，把人们拉回到真实的效果。",
    goal: "看懂一条规则怎样得出结果，找出一个它会出错的例子，并说明低谷时期的研究为什么没有全部停止。",
    route: ["dendral", "eliza", "winter", "deepblue"],
    timeline: [
      {
        date: "1965",
        title: "DENDRAL帮化学家缩小范围",
        text: "把化学知识写进程序，排除不可能的分子结构。",
        sources: ["dendral"],
      },
      {
        date: "1966",
        title: "ELIZA开始与人交谈",
        text: "靠关键词和预先写好的句式维持对话，许多人却觉得它懂自己。",
        sources: ["eliza"],
      },
      {
        date: "1966",
        title: "一份报告检查机器翻译",
        text: "ALPAC报告评估了翻译的质量和成本，也建议继续支持基础研究。",
        sources: ["alpac"],
      },
      {
        date: "1980年代",
        title: "专家系统进入工厂和公司",
        text: "专家系统被用到实际工作中，也遇到了维护难、成本高的问题。",
        sources: ["experts"],
      },
      {
        date: "1990年代",
        title: "低谷中，研究仍在继续",
        text: "商业热度下降时，机器学习等研究一直有人在做。",
        sources: ["expert-debate"],
      },
      {
        date: "1997",
        title: "深蓝赢下国际象棋比赛",
        text: "专门的芯片、搜索和局面评分，共同赢了世界冠军。",
        sources: ["deepblue", "deepblue-paper"],
      },
    ],
    evidence: [
      {
        title: "把一句回应拆开看",
        text: "史料记录ELIZA依靠预设句式和关键词替换。在本厅的规则实验室里找出命中的词，再换一种说法，看规则还灵不灵。",
        sources: ["eliza"],
      },
      {
        title: "低谷没有唯一的“开关”",
        text: "ALPAC报告讨论的是翻译，专家系统的口述史讨论的是商业和研究。不同材料说的是不同的事。",
        sources: ["alpac", "expert-debate"],
      },
    ],
    glossary: [
      { term: "规则", meaning: "“如果……就……”这样写清楚的步骤。" },
      { term: "专家系统", meaning: "把某个领域专家的知识写成规则，用来协助判断的程序。" },
      { term: "搜索", meaning: "在许多可能的方案里，按一定顺序找出可行或更好的那一个。" },
      { term: "例外", meaning: "规则没有考虑到的情况；发现例外，能帮助改进规则。" },
    ],
  },
  learning: {
    question: "怎样知道机器学到的是规律，而不是背下了练习题？",
    overview:
      "这间展厅陈列机器学习的三样条件：好的方法、大量的例子和足够快的计算。反向传播让网络学会从错误中调整，显卡让计算变快，ImageNet准备了海量图片；三者在2012年的AlexNet身上汇合。",
    goal: "分清练习题和考试题（训练与测试），说明数据、方法和算力怎样配合，并举出一个换了新例子就可能出错的原因。",
    route: ["backprop", "cuda", "imagenet", "alexnet"],
    timeline: [
      {
        date: "1986",
        title: "网络学会从错误中调整",
        text: "反向传播论文说明了怎样一层层调整权重，让中间层学出有用的特征。",
        sources: ["backprop"],
      },
      {
        date: "2006",
        title: "显卡有了新用途",
        text: "CUDA让科学家能用显卡里的大量计算单元同时计算。",
        sources: ["cuda"],
      },
      {
        date: "2009",
        title: "ImageNet建起大型图片库",
        text: "图片按类别整理，每一张都经过人工核对。",
        sources: ["imagenet"],
      },
      {
        date: "2010",
        title: "一年一度的识图比赛开始",
        text: "研究者在同一套题目上比较方法，看谁认得更准。",
        sources: ["ilsvrc"],
      },
      {
        date: "2012",
        title: "AlexNet大幅领先",
        text: "深层网络、显卡训练和海量数据共同发挥作用。",
        sources: ["alexnet"],
      },
      {
        date: "2018",
        title: "数据也要有说明书",
        text: "研究者建议记录数据为什么收集、包括什么、适合怎样使用。",
        sources: ["datasheets"],
      },
    ],
    evidence: [
      {
        title: "分数要连着规则看",
        text: "AlexNet论文里的“前五名错误率”允许猜五个答案，它和只看第一个答案的分数不一样。",
        sources: ["alexnet"],
      },
      {
        title: "数据背后有人的工作",
        text: "ImageNet论文说明了人工核对标签的工作；数据说明书的研究建议公开数据的来历和适用范围。",
        sources: ["imagenet", "datasheets"],
      },
    ],
    glossary: [
      { term: "训练集", meaning: "用来教模型的例子，像平时的练习题。" },
      { term: "测试集", meaning: "专门留出来检查模型的例子，像没见过的考试题。" },
      { term: "泛化", meaning: "遇到没见过的新例子，也能判断正确的本领。" },
      { term: "过拟合", meaning: "把练习题背得太熟，换一批题反而做不好。" },
      { term: "样本偏差", meaning: "收集的例子不够全面，代表不了真实会遇到的情况。" },
    ],
  },
  games: {
    question: "在棋盘上练出的本领，怎样带去解决新的问题？",
    overview:
      "棋类是人工智能研究的练习场：规则清楚，胜负分明。这间展厅陈列两次AlphaGo比赛、只和自己下棋的AlphaGo Zero，最后走出棋盘，看模型怎样帮科学家预测蛋白质的形状。",
    goal: "分清两次AlphaGo比赛，说明搜索和学习各起什么作用，以及科学研究为什么仍需要实验验证。",
    route: ["lee-match", "ke-match", "alphago-zero", "alphafold"],
    timeline: [
      {
        date: "1997",
        title: "深蓝赢下国际象棋",
        text: "专门的硬件和搜索，赢了国际象棋世界冠军。",
        sources: ["deepblue-paper", "deepblue"],
      },
      {
        date: "2015-10",
        title: "AlphaGo第一次战胜职业棋手",
        text: "在与李世石比赛之前，AlphaGo已在2015年赢过职业棋手。",
        sources: ["alphago-lee"],
      },
      {
        date: "2016-03",
        title: "首尔五局，4比1",
        text: "AlphaGo战胜李世石，第四局由李世石获胜。",
        sources: ["alphago-lee", "alphago-seoul-record"],
      },
      {
        date: "2017-05",
        title: "乌镇三局，3比0",
        text: "AlphaGo战胜柯洁，随后宣布不再参加对人比赛。",
        sources: ["alphago-ke", "alphago-next"],
      },
      {
        date: "2017-10",
        title: "AlphaGo Zero只和自己下棋",
        text: "不看人类棋谱，靠自我对弈学会了围棋。",
        sources: ["alphago-zero"],
      },
      {
        date: "2020",
        title: "AlphaFold在蛋白质评测中取得突破",
        text: "预测结果和实验测出的结构放在一起比较。",
        sources: ["alphafold"],
      },
      {
        date: "2021-07",
        title: "AlphaFold公开详细论文",
        text: "公布了方法、结果，以及每个预测的可信程度。",
        sources: ["alphafold"],
      },
    ],
    evidence: [
      {
        title: "搜索与学习一起配合",
        text: "AlphaGo的研究说明：用网络挑出值得考虑的落点、判断局面，再用搜索往前推算。",
        sources: ["alphago-lee"],
      },
      {
        title: "走进科学，要换一套证据",
        text: "AlphaFold论文把预测结构和实验结构并排比较。一个看起来很像的模型，不能凭样子就说它对了。",
        sources: ["alphafold"],
      },
    ],
    glossary: [
      { term: "策略", meaning: "在一个局面里，决定下一步怎么走的办法。" },
      { term: "探索", meaning: "给不太熟悉的走法一些尝试的机会，也许能找到更好的。" },
      { term: "强化学习", meaning: "根据行动之后得到的奖励或惩罚，学习怎样更好地完成目标。" },
      { term: "自我对弈", meaning: "程序和自己下棋，从胜负中积累经验。" },
      { term: "置信度", meaning: "模型对自己答案的把握有多大，仍需要实际结果来检验。" },
    ],
  },
  generation: {
    question: "模型怎样一步步写出文字、画出图像？又为什么会出错？",
    overview:
      "这间展厅属于“生成”：Transformer让词与词互相关注，GPT学会接着往下写，ChatGPT把它变成了人人能用的对话助手；另一侧，生成对抗网络和扩散模型学会了画图。生成的内容是模型算出来的，并不是从某个资料库里查到的标准答案。",
    goal: "说出文字生成和图像生成的基本思路，分清论文、模型和产品，并学会检查一段生成内容的依据。",
    route: ["transformer", "gpt", "chatgpt", "open-weights"],
    timeline: [
      {
        date: "2017",
        title: "Transformer让词与词互相关注",
        text: "原论文先用翻译做实验，后来成了许多大模型的基础。",
        sources: ["transformer"],
      },
      {
        date: "2018",
        title: "先预训练，再学具体任务",
        text: "早期GPT先读大量文字，再用少量例子学习具体任务。",
        sources: ["gpt"],
      },
      {
        date: "2020-05",
        title: "提问时给几个例子",
        text: "GPT-3论文研究了在提问里放几个示例，模型能完成哪些任务。",
        sources: ["gpt-3-paper"],
      },
      {
        date: "2020-06",
        title: "扩散模型一步步去噪画图",
        text: "从满屏噪点出发，一步步去掉噪点，画出图像。",
        sources: ["diffusion"],
      },
      {
        date: "2021—2022",
        title: "潜空间扩散节省计算",
        text: "先在压缩过的空间里生成，再还原成大图，省下许多计算。",
        sources: ["latent-diffusion"],
      },
      {
        date: "2022",
        title: "ChatGPT面向公众",
        text: "用示范和反馈训练助手，发布时也写明了它会出错。",
        sources: ["instructgpt", "chatgpt"],
      },
      {
        date: "2023",
        title: "更多模型公开权重",
        text: "LLaMA、通义千问、Mistral等模型来到开发者的工作台上。",
        sources: ["llama", "qwen-start", "mistral"],
      },
    ],
    evidence: [
      {
        title: "同样叫生成，方法不同",
        text: "语言模型一个词接一个词地往下写；扩散模型一步步去掉噪点；潜空间扩散换了一个地方去噪。",
        sources: ["gpt", "diffusion", "latent-diffusion"],
      },
      {
        title: "说得流畅，不等于说得对",
        text: "ChatGPT最初的发布页就写明：它可能给出看似合理却错误的回答。",
        sources: ["chatgpt", "instructgpt"],
      },
    ],
    glossary: [
      { term: "词元", meaning: "模型处理文字时用的小片段，可能是一个字、一个词或词的一部分。" },
      { term: "预训练", meaning: "先用大量材料打好基础，再按用途进一步调整。" },
      { term: "采样", meaning: "按照每个候选词的可能性，抽出下一个词。" },
      { term: "扩散生成", meaning: "从噪点出发，一步步去掉噪点，生成图像的方法。" },
      { term: "潜空间", meaning: "把复杂的内容压缩成更小的一组数字，在那里进行计算。" },
      { term: "开放权重", meaning: "公开模型学到的那一大串数字，别人可以下载使用。" },
    ],
  },
  industry: {
    question: "怎样读一家人工智能公司的历史，才不会被一个新闻标题带着走？",
    overview:
      "今天的人工智能由许多机构共同推动：有人设计芯片，有人建设云平台，有人训练模型，有人把模型装进手机，也有人用它研究天气和科学问题。这间展厅的二十个抽屉里存放着二十家机构的档案。读它们，先看时间、做了什么、在什么条件下做的，再讨论变化。",
    goal: "用至少两份有日期的材料，讲清一家机构的一次转折，分清“成立”“发表论文”“发布产品”和“合作变化”。",
    route: ["openai-path", "google-path", "deepseek-path", "many-paths"],
    timeline: [
      {
        date: "1993",
        title: "英伟达从图形计算起步",
        text: "后来，显卡计算成了深度学习的重要基础。",
        sources: ["cuda"],
      },
      {
        date: "2010",
        title: "DeepMind成立",
        text: "从研究会学习的系统开始，后来做出了AlphaGo和AlphaFold。",
        sources: ["deepmind-start"],
      },
      {
        date: "2015",
        title: "OpenAI以研究机构身份成立",
        text: "成立说明记录了它当时的目标和组织形式。",
        sources: ["openai-start"],
      },
      {
        date: "2019",
        title: "大规模计算合作",
        text: "微软与OpenAI合作，为训练大模型提供计算平台。",
        sources: ["microsoft-start"],
      },
      {
        date: "2022",
        title: "对话产品进入日常",
        text: "ChatGPT让许多人第一次用平常的语言与模型对话。",
        sources: ["chatgpt"],
      },
      {
        date: "2023",
        title: "合并、开放和平台同时发生",
        text: "Google DeepMind成立，开放权重模型发布，Bedrock平台上线。",
        sources: ["deepmind-start", "mistral", "bedrock"],
      },
      {
        date: "2024—2026",
        title: "效率、推理与合作继续变化",
        text: "DeepSeek的报告让训练效率受到关注，合作关系也在不断调整。",
        sources: ["deepseek-v3", "deepseek-r1-paper", "microsoft-now"],
      },
    ],
    evidence: [
      {
        title: "公司公告能证明什么",
        text: "公司原文可以核对发布日期、型号和当时开放的功能。要判断谁更可靠，还需要相同条件下的独立测试。",
        sources: ["amazon-nova", "apple-release"],
      },
      {
        title: "读成本表，别漏了“不包括”",
        text: "V3报告的成本只算了最后一次训练，此前的研究和试验都没有算进去。",
        sources: ["deepseek-v3"],
      },
      {
        title: "一家机构，几条分支",
        text: "合并公告记录组织变化，AlphaFold论文记录科学研究，两件事要分开看。",
        sources: ["deepmind-start", "alphafold"],
      },
    ],
    glossary: [
      { term: "机构成立", meaning: "一个组织开始运作的时间，常常比它出名的产品早很多年。" },
      { term: "发布", meaning: "公开介绍一项成果；真正能用、谁能用，还要看具体说明。" },
      { term: "技术报告", meaning: "介绍方法、训练和实验的材料，里面的成绩多是自己测的。" },
      { term: "平台", meaning: "让别人部署、连接和使用工具的服务；平台上的模型不一定都是它自己训练的。" },
    ],
  },
  future: {
    question: "你想让人工智能帮助谁？又怎样确认它真的帮上了忙？",
    overview:
      "历史走到这里，下一页由你来写。不妨从历史里借几样研究的工具：想清楚要帮谁，准备合适的材料，和原来的办法比一比，把失败也记下来，再请使用的人一起判断。许多大项目，都是从一个能检验的小问题开始的。",
    goal: "写出一个帮助对象清楚、检验方法具体的研究问题，并想一想：可能会出什么错，谁来检查结果。",
    route: ["future", "imagenet", "alphafold", "chatgpt"],
    timeline: [
      {
        date: "1966",
        title: "效果和需要一起看",
        text: "ALPAC报告提出的问题至今有用：真的需要吗？效果好吗？花费多少？",
        sources: ["alpac"],
      },
      {
        date: "2009",
        title: "先认识你用的数据",
        text: "ImageNet的建设说明：要知道例子从哪里来，漏掉了什么。",
        sources: ["imagenet"],
      },
      {
        date: "2018",
        title: "给材料写一份说明书",
        text: "记录数据的来源、组成和用途，帮后来的人知道它适合做什么。",
        sources: ["datasheets"],
      },
      {
        date: "2021",
        title: "答案带上可信程度",
        text: "AlphaFold在给出预测时，也标出了每个部分的可信程度。",
        sources: ["alphafold"],
      },
      {
        date: "2022",
        title: "公开局限也是成果的一部分",
        text: "ChatGPT发布时，就列出了它可能出现的错误。",
        sources: ["chatgpt"],
      },
      {
        date: "2023",
        title: "从设计到使用都要检查风险",
        text: "美国国家标准与技术研究院发布了一份自愿采用的人工智能风险管理框架。",
        sources: ["nist-rmf"],
      },
    ],
    evidence: [
      {
        title: "把大愿望变成能检验的小问题",
        text: "“帮助所有人学习”太大了；“能不能帮同学检查一种常见的错别字”，就可以设计实验来比较。",
        sources: ["alpac", "datasheets"],
      },
      {
        title: "成功和失败都要留下来",
        text: "AlphaFold把预测和实验结果作比较，ChatGPT记录了已知局限。只展示成功，会让人看不见失败。",
        sources: ["alphafold", "chatgpt"],
      },
      {
        title: "用了工具，责任还在",
        text: "风险管理框架提醒：谁准备材料、谁核对结果、出了问题怎样暂停，都要事先想好。",
        sources: ["nist-rmf"],
      },
    ],
    glossary: [
      { term: "帮助对象", meaning: "你想帮助的具体的人；先了解他们需要什么，不要替他们猜。" },
      { term: "对照", meaning: "原来的办法做得怎样，用来比较新工具到底改进了什么。" },
      { term: "失败条件", meaning: "在什么情况下，工具可能做不好。" },
      { term: "保护隐私", meaning: "只用完成任务真正需要的信息，能不用个人信息就不用。" },
      { term: "责任分工", meaning: "说清谁定目标、谁查结果、谁处理问题；用了工具，不等于把这些交给它。" },
    ],
  },
};
