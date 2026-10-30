/* Short, revisitable names for experiences. These do not award mastery. */
(function (G) {
  const cards = {
    arrival: {
      term: "识别误判",
      icon: "search",
      color: "honey",
      experience: "暖阳菊和金穗花颜色很像，AI 却把名字猜错了。",
      meaning:
        "这样的认错，我们叫它「识别误判」。AI 给出的名字，需要我们再核对。",
      action: "看标牌、找可靠资料，或者请教懂的人。",
      recall: "认得像，不等于认得对。",
    },
    distinguish: {
      term: "自动化",
      icon: "lamp",
      color: "mint",
      experience: "展灯到点就亮，照片也能按日期自动排队。",
      meaning:
        "按设好的步骤自己工作，叫作「自动化」。会自动做事，还不足以说明它用了 AI。",
      action: "先问：它是按什么办法完成任务的？",
      recall: "会自己动，不一定用了 AI。",
    },
    everyday: {
      term: "信息核对",
      icon: "check",
      color: "sky",
      experience: "你对照了原话，改正了通知，才把它发布出去。",
      meaning:
        "把结果和原来的信息对一对，就是「信息核对」。AI 可以帮忙，确认的这一步交给我们。",
      action: "时间、数量、名字，使用前再检查一次。",
      recall: "先核对，再使用。",
    },
    create: {
      term: "人机共创",
      icon: "brush",
      color: "rose",
      experience: "你起笔、看候选，再决定要留下什么。",
      meaning:
        "人和 AI 一起出点子，可以叫作「人机共创」。你也可以拒绝 AI 的点子，坚持自己的画法。",
      action: "说一说：我的作品里，有哪些是我的决定？",
      recall: "AI 给点子，我来作决定。",
    },
    hallucination: {
      term: "AI 幻觉",
      icon: "question",
      color: "sky",
      experience:
        "想象一个写故事的 AI 说：“春汀广场有一条会喷火的真龙！”可小镇里根本没有。",
      meaning:
        "生成内容的 AI 有时会把编出来的信息，当成事实说得很像真的。这种情况常被叫作「AI 幻觉」。",
      action: "听起来像真的，也要找证据。写故事可以想象，介绍事实需要核对。",
      recall: "说得像真的，也可能是编的。",
      note: "这是讲解用的虚构例子。认花活动演示的是识别误判，不能把所有 AI 错误都叫作幻觉。",
    },
  };
  G.TownConcepts = cards;
})(globalThis);
