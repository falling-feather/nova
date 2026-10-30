/** New, independently sourced exhibits for the approved seven-stage expansion. */
const reviewed = "2026-10-03";
export const additionalSources = [
  [
    "clip-release",
    "CLIP: Connecting text and images",
    "OpenAI",
    "2021-01-05",
    "https://openai.com/index/clip/",
    "图文关联、分类任务与研究局限。",
  ],
  [
    "gpt4o-release",
    "Hello GPT-4o",
    "OpenAI",
    "2024-05-13",
    "https://openai.com/index/hello-gpt-4o/",
    "多种输入输出的历史发布节点；不作为最新型号介绍。",
  ],
  [
    "o1-release",
    "Introducing OpenAI o1-preview",
    "OpenAI",
    "2024-09-12",
    "https://openai.com/index/introducing-openai-o1-preview/",
    "推理取向模型与任务适用条件。",
  ],
  [
    "robotics-release",
    "Gemini Robotics brings AI into the physical world",
    "Google DeepMind",
    "2025-03-12",
    "https://deepmind.google/blog/gemini-robotics-brings-ai-into-the-physical-world/",
    "视觉、语言与行动的研究案例；演示不表示所有情境可靠。",
  ],
  [
    "gan-paper",
    "Generative Adversarial Networks",
    "Goodfellow等 / arXiv",
    "2014-06-10",
    "https://arxiv.org/abs/1406.2661",
    "生成器与判别器共同训练的原始论文。",
  ],
].map(([id, title, publisher, published, url, scope]) => ({
  id,
  title,
  publisher,
  published,
  url,
  scope,
  kind: "原始发布或论文",
  accessed: reviewed,
  verifiedAt: reviewed,
  reviewStatus: "2026-10-03已核验",
}));

/** The newer exhibits use the same reading layers as the original collection. */
const exhibit = (fields) => ({ date: String(fields.year), ...fields });

export const additionalExhibits = [
  exhibit({
    id: "gan",
    gallery: "generation",
    year: 2014,
    title: "两个模型的较量",
    subtitle: "伊恩·古德费洛等 · 生成对抗网络",
    place: "加拿大 蒙特利尔大学",
    people: "伊恩·古德费洛等",
    intro: "一个模型负责造出图片，另一个负责识破它，两者在较量中一起进步。",
    fact: "论文把生成器和判别器的较量写成了一场两人对弈的数学游戏：一方多得一分，另一方就少一分。",
    question: "一张图看起来像照片，你还需要知道什么，才能判断它是不是真的拍到的？",
    sources: ["gan-paper", "stylegan"],
    related: ["diffusion-models", "transformer"],
    dossier: {
      evidence: [
        {
          title: "回到原始论文",
          text: "2014年的论文介绍了两个模型和它们共同训练的目标。展厅里的图形卡片只是帮助理解的示意。",
          sources: ["gan-paper"],
        },
      ],
    },
  }),
  exhibit({
    id: "diffusion-models",
    gallery: "generation",
    year: 2020,
    title: "从噪点里显影",
    subtitle: "何、贾因、阿比尔等 · 扩散模型",
    place: "美国 加州大学伯克利分校",
    people: "乔纳森·何、阿杰·贾因、彼得·阿比尔",
    intro: "一幅图，能否从满屏的噪点开始，一小步一小步地变清楚？",
    fact: "后来的研究找到了加快的办法：生成一张图只要几十步，有的方法甚至只要几步。",
    question: "用模型生成一张校园照片，和找到一张真实拍摄的校园照片，有什么不同？",
    sources: ["diffusion", "latent-diffusion"],
    related: ["gan", "chatgpt"],
    dossier: {
      evidence: [
        {
          title: "两篇论文，两个关键步骤",
          text: "2020年的论文介绍了去噪扩散，2021年的论文介绍了潜空间方法。展厅里的演示只是示意，并不是真实模型内部的计算。",
          sources: ["diffusion", "latent-diffusion"],
        },
      ],
    },
  }),
  exhibit({
    id: "clip",
    gallery: "frontiers",
    year: 2021,
    title: "图与文的配对",
    subtitle: "OpenAI · CLIP",
    place: "美国 旧金山",
    intro: "看到一张小狗的照片，你能说出好几种描述它的话。机器能吗？",
    fact: "CLIP是英文“对比式语言—图像预训练”的缩写。",
    question: "如果照片拍得很模糊，再加一句文字说明，就一定能认对吗？",
    sources: ["clip-release", "multimodal-neurons"],
    related: ["imagenet", "multimodal"],
    dossier: {
      evidence: [
        {
          title: "发布说明里也写了局限",
          text: "CLIP的发布文章既介绍了方法，也列出了局限。展厅里用配对卡片说明它的思路，并没有运行真正的CLIP模型。",
          sources: ["clip-release"],
        },
      ],
    },
  }),
  exhibit({
    id: "multimodal",
    gallery: "frontiers",
    year: 2024,
    title: "看、听、说",
    subtitle: "OpenAI · 多模态模型GPT-4o",
    place: "美国 旧金山",
    intro: "找一件丢失的展品，你会看照片、听录音，还是查文字记录？",
    fact: "发布那天，研究者当场演示了用GPT-4o在两个人之间做实时翻译：一个人说英语，另一个人说意大利语。",
    question: "如果要确认一件事，你会选哪两种材料互相核对？",
    sources: ["gpt4o-release", "clip-release"],
    related: ["clip", "reasoning"],
    dossier: {
      evidence: [
        {
          title: "发布资料展示了什么",
          text: "GPT-4o的发布资料展示了能力，也说明了发布时不同功能有各自的开放条件。展厅任务里的线索，是预先编写的教学案例。",
          sources: ["gpt4o-release", "clip-release"],
        },
      ],
    },
  }),
  exhibit({
    id: "reasoning",
    gallery: "frontiers",
    year: 2024,
    title: "回答之前，先想一想",
    subtitle: "OpenAI o1、DeepSeek-R1 · 推理模型",
    place: "美国、中国",
    intro: "一道难题，答案写了很多步骤，就一定对吗？",
    fact: "2025年9月，DeepSeek-R1的研究论文发表在《自然》杂志上，还登上了那一期的封面。",
    look: "工作台上的网络模型提醒我们：推理也是一层层的计算，写出来的步骤，并不是模型真实的“内心”。",
    question: "怎样才能发现一段看起来很通顺的解释里藏着的错误？",
    sources: ["o1-release", "deepseek-r1-paper", "r1-nature"],
    related: ["deepseek-path", "multimodal"],
    dossier: {
      evidence: [
        {
          title: "发布说明与技术报告",
          text: "o1-preview的发布说明和DeepSeek-R1的技术报告都提供了具体的测试。展厅任务里的步骤是教学简化，并不是模型真实的思考过程。",
          sources: ["o1-release", "deepseek-r1-paper"],
        },
      ],
    },
  }),
  exhibit({
    id: "embodied",
    gallery: "frontiers",
    year: 2025,
    title: "从会说话，到会动手",
    subtitle: "Google DeepMind · Gemini Robotics",
    place: "英国、美国",
    intro: "一句“把它放到那里”，足以让机器人安全地完成任务吗？",
    fact: "和Gemini Robotics一同发布的，还有一套检验机器人是否懂得安全常识的测试题，名叫ASIMOV，取自写下“机器人三定律”的科幻作家阿西莫夫。",
    look: "工作台上，机械臂旁边放着一块方木和一个画好的方框。它要先确认目标在哪，再伸手——真实的机器人也需要这样的停顿。",
    question: "你会怎样把一句含糊的指令说得更清楚？",
    sources: ["robotics-release", "asimov-benchmark"],
    related: ["reasoning", "many-paths"],
    dossier: {
      evidence: [
        {
          title: "原始资料介绍的研究",
          text: "Gemini Robotics的发布介绍了“视觉、语言、行动”结合的研究案例。展厅里的机械臂不受远程控制，只演示一项有限任务的确认过程。",
          sources: ["robotics-release"],
        },
      ],
    },
  }),
];
export const frontiersGuide = {
  question: "看、听、读几种线索，怎样一起帮我们做判断？",
  overview:
    "这个展厅有四件馆藏：把图片和文字配对的CLIP，能看能听的多模态模型，回答前先推敲的推理模型，以及会动手的机器人。先看它们各自会什么，再到证据台亲手核对几条线索。",
  goal: "说出几种信息怎样互相印证，也知道什么时候应该停下来再检查一遍。",
  route: ["clip", "multimodal", "reasoning", "embodied"],
  timeline: [
    {
      date: "2021",
      title: "图片与文字连在一起",
      text: "CLIP从大量图文配对中学习，用一句话就能描述要找的图。",
      sources: ["clip-release"],
    },
    {
      date: "2024-05",
      title: "一个模型能看、能听、能说",
      text: "GPT-4o展示了文字、图片和声音结合的方向。",
      sources: ["gpt4o-release"],
    },
    {
      date: "2024-09",
      title: "回答之前先推敲",
      text: "o1-preview让模型在难题上投入更多推理时间。",
      sources: ["o1-release"],
    },
    {
      date: "2025-01",
      title: "推理研究继续",
      text: "DeepSeek-R1公开了提升推理能力的训练方法。",
      sources: ["deepseek-r1-paper"],
    },
    {
      date: "2025-03",
      title: "从会说话到会动手",
      text: "Gemini Robotics把看、听懂语言和动手操作结合起来。",
      sources: ["robotics-release"],
    },
  ],
  evidence: [
    {
      title: "让线索互相核对",
      text: "信息的形式越丰富，越要检查：它们可靠吗，说的是同一件事吗？",
      sources: ["clip-release", "gpt4o-release"],
    },
    {
      title: "看演示，也看条件",
      text: "一次演示是在什么输入、什么环境下完成的，和“能做什么”一样重要。",
      sources: ["o1-release", "robotics-release"],
    },
  ],
  glossary: [
    { term: "模态", meaning: "信息的形式，比如文字、图片和声音。" },
    { term: "交叉核对", meaning: "用不同的材料检查同一个判断，留意哪里对不上。" },
    { term: "推理", meaning: "从已知的条件出发，一步步得出结论。" },
    { term: "停止条件", meaning: "事先约定：遇到什么情况，就先停下来请人检查。" },
  ],
};
