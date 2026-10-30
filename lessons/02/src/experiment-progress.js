/** Visible learning steps follow the evidence already gathered in the session. */
export function experimentProgress(id, s) {
  let step = 0,
    next = "",
    questions = [];
  switch (id) {
    case "origins":
      step = s.answers.origin === "uncertain" ? 2 : s.observed ? 1 : 0;
      next = [
        "读完两段回答，再点“我观察好了”。",
        "选择你的判断，看看证据是否足够。",
        "挑选一种能够重复、比较的测试方法。",
      ][step];
      questions =
        step === 2 ? ["origin-evidence"] : step === 1 ? ["origin-answer"] : [];
      break;
    case "rules":
      step = Math.min(2, s.inputs.length);
      next = [
        "输入一句话，或点击一个示例，再观察回答。",
        "再换一种说法，比较命中的规则有没有变化。",
        "现在判断：这台机器为什么可能听错？",
      ][step];
      if (step === 2) questions = ["rule-answer"];
      break;
    case "learning":
      step =
        s.checked && s.counterexample ? 2 : s.epochs > 0 || s.showTests ? 1 : 0;
      next = [
        "先观察叶片，再点击“开始学习”，看分界线怎样改变。",
        "用新叶子检验，补充对照例子后再检验一次。",
        "比较训练和检验结果，判断怎样知道它真的学会了。",
      ][step];
      if (step === 2) questions = ["learn-answer"];
      break;
    case "games": {
      const explored =
        s.search.total >= 6 && s.search.visits.filter(Boolean).length >= 2;
      step = explored ? (s.answers.search === "uncertain" ? 2 : 1) : 0;
      next = [
        "把至少六次尝试分给两个或更多方向，观察结果。",
        "比较各方向的尝试次数，再作判断。",
        "把模拟与史实分开：核对2016年的比赛对手。",
      ][step];
      questions =
        step === 2 ? ["match-answer"] : step === 1 ? ["search-answer"] : [];
      break;
    }
    case "generation":
      step =
        s.tokens.length >= 3 && s.temperatures.size >= 2
          ? 2
          : s.tokens.length
            ? 1
            : 0;
      next = [
        "选一句开头，点击“抽一个词”，观察可能性。",
        "拖动滑块换一种设置，再抽词；两种设置至少观察三次。",
        "观察完成。接得通顺，是否就意味着内容真实？",
      ][step];
      if (step === 2) questions = ["generation-answer"];
      break;
    case "frontiers":
      step =
        s.checkedRecord && s.evidence.length >= 2
          ? 2
          : s.evidence.length
            ? 1
            : 0;
      next = [
        "点击材料卡，打开第一条线索。",
        "再打开另一种材料，并核对盒子与入库记录的编号。",
        "用核对过的线索，判断盒子里是什么。",
      ][step];
      if (step === 2) questions = ["frontier-answer"];
      break;
    case "industry":
      step = s.revealed ? 2 : 0;
      next = s.revealed
        ? "对照证据，选择“支持”“矛盾”或“证据不足”。"
        : "读这句说法，再点击“打开这份证据”。";
      if (s.revealed) questions = ["evidence-answer"];
      break;
    case "future":
      step = s.card ? 2 : s.fields.who && s.fields.problem ? 1 : 0;
      next = s.card
        ? "研究卡已经准备好，可以下载，也可以继续修改。"
        : "写下服务对象和具体问题，再选择检验与复查方法。";
      break;
    default:
      throw new Error("Unknown experiment: " + id);
  }
  return { step, next, questions };
}
