import type { Progress } from "./state.ts";
import type { Models } from "../model/assets.ts";
import type * as R from "../course/records.ts";
import { canPublish } from "./publication.ts";
import { newsClaims } from "./news.ts";
import { contextKey, matchingContexts } from "../course/observations.ts";
import { compareCouncil } from "../course/experiments.ts";
export interface Evidence {
  text: string;
  done: boolean;
}
export function evidence(p: Progress, m: Models, id: string, context?: { pair: number; layer: number; head: number }): Evidence[] {
  const n = <T>(key: string, fallback: T) => (p.notes[key] as T) ?? fallback;
  const e = (text: string, done: unknown): Evidence => ({ text, done: !!done });
  switch (id) {
    case "01": {
      const r = n<R.Foundry1>(id, { tries: [], answered: false });
      return [
        e("比较两句话", r.tries.length >= 2),
        e("找到不同的拆法", r.differed),
        e("说出观察", r.answered),
      ];
    }
    case "02": {
      const r = n<R.Foundry2>(id, { rounds: [] });
      return [e(`预测并核对三轮（${r.rounds.length}/3，可继续研究）`, r.rounds.length >= 3)];
    }
    case "03": {
      const r = n<R.Foundry3>(id, { tries: [] });
      return [
        e("试过三种名字", r.tries.length >= 3),
        e(
          "有一块就能排出的词",
          r.tries.some((w) => m.tokenizer.blocks(w).length === 1),
        ),
        e(
          "有拆开或未知的词",
          r.tries.some(
            (w) =>
              m.tokenizer.blocks(w).length > 1 ||
              m.tokenizer.blocks(w).some((b) => b.unknown),
          ),
        ),
      ];
    }
    case "04": {
      const r = n<R.Foundry4>(id, { seen: [] });
      return [
        e("比较小、中、大字架", r.seen.length >= 3),
        e("依据已显示的读数解释取舍", r.answer),
      ];
    }
    case "05": {
      const r = n<R.Foundry5>(id, {});
      return [
        e("选择一副字架", r.choice !== undefined),
        e("留下选择的理由", r.reason),
      ];
    }
    case "06": {
      const r = n<R.Gallery6>(id, { flipped: [] });
      return [e("翻开并比较两张不同的名牌", r.flipped.length >= 2)];
    }
    case "07": {
      const r = n<R.Gallery7>(id, { visited: [] });
      return [e("比较两组不同的词（还可自由探索）", r.visited.length >= 2)];
    }
    case "08": {
      const r = n<R.Gallery8>(id, { placed: {} });
      return [
        e("先放置，再看结果：两块活字", Object.keys(r.placed).length >= 2),
      ];
    }
    case "09": {
      const r = n<R.Gallery9>(id, { pairs: [], swapped: false });
      return [
        e("比较两对词", r.pairs.length >= 2),
        e("做一次真实填空", r.swapped),
      ];
    }
    case "10": {
      const r = n<R.Gallery10>(id, { found: false });
      return [
        e("找到苹果", r.found),
        e("说明为什么仍需上下文", r.answer === "no"),
      ];
    }
    case "11": {
      const r = n<R.Council11>(id, { seen: [] });
      return [e("比较两位与会者的注意力", r.seen.length >= 2)];
    }
    case "12": {
      const r = n<R.Council12>(id, { viewed: [] });
      const free = n<R.Workbench>("workbench", {}).experiments?.[id], pair = compareCouncil(free);
      if (pair && (!context || pair.a.layer === context.layer && pair.a.head === context.head)) return [
        e("固定查询词、层和头，留下真实上下文A/B", true),
        e("依据实际表示格差回答", free?.answerFor === pair.key && free.answer === (pair.delta > 1e-6 ? "diff" : "same")),
      ];
      const comparison = matchingContexts(r, context?.pair, context?.layer, context?.head);
      return [
        e(
          "固定组别、层和头，实际比较两种上下文",
          comparison,
        ),
        e("依据本组读数回答观察问题", comparison && r.answerFor === contextKey(comparison.a) && ["diff", "same"].includes(r.answer ?? "")),
      ];
    }
    case "13": {
      const r = n<R.Council13>(id, { tried: [] });
      return [e("比较两种指代说法", r.tried.length >= 2)];
    }
    case "14": {
      const r = n<R.Council14>(id, { inserted: [] });
      return [
        e("加入一段新线索", r.inserted.length > 0),
        e("依据实测结果判断", r.answer),
      ];
    }
    case "15": {
      const r = n<R.Council15>(id, { notes: {} });
      return [e("为两位记录员留下本句观察", Object.keys(r.notes).length >= 2)];
    }
    case "16": {
      const r = n<R.Ledger>("ledger", null!);
      return [e("亲手修改一个数字", r?.edited)];
    }
    case "17": {
      const r = n<R.Ledger>("ledger", null!);
      return [
        e("先作预测", r?.guess !== undefined),
        e("算过四笔账", r?.computed.every(Boolean)),
      ];
    }
    case "18": {
      const r = n<R.Ledger>("ledger", null!);
      return [
        e("试过较弱的放大镜", r?.magnifiers.includes(-1)),
        e("试过较强的放大镜", r?.magnifiers.includes(1)),
      ];
    }
    case "19": {
      const r = n<R.Ledger>("ledger", null!);
      return [
        e("混合发言", r?.mixed),
        e("理解只听一人的情况", r?.answer === "same"),
      ];
    }
    case "20": {
      const r = n<R.Ledger>("ledger", null!);
      return [
        e("亲手移动下排字牌", (r?.seatMoves ?? 0) > 0 || !!p.done["20"]),
        e("对比有、无座位号", r?.seatsCompared.every(Boolean)),
      ];
    }
    case "21": {
      const r = n<R.Press21>(id, { prompt: "", printed: [], picks: 0 });
      if(r.transitions) return [e("亲手选择词元，留下真实前后候选",r.transitions.length>0),e("依据对照理解下一轮重算",r.observed)];
      return [e("亲手选择三个词元，观察候选重算", r.picks >= 3)];
    }
    case "22": {
      const r = n<R.Press22>(id, { printed: [], looked: 0 });
      return [
        e("生成并观察因果注意力", r.looked >= (p.route === "core" ? 1 : 3)),
        e("说明能否看到未来", r.answer === "no"),
      ];
    }
    case "23": {
      const r = n<R.Press23>(id, { low: [], high: [] });
      if (p.route === "core") return [
        e("低温0.2，种子100的实际输出", r.low.length > 0),
        e("中温1.0，相同种子的实际输出", (r.middle?.length ?? 0) > 0),
        e("高温2.0，相同种子的实际输出", r.high.length > 0),
        e("为用途选择，引用一次实际结果说明", r.choice && r.reason?.trim()),
      ];
      return [
        e("低温三次", r.low.length === 3),
        e("高温三次", r.high.length === 3),
        e("实际比较中间温度", (r.middle?.length ?? 0) > 0),
        e("为用途选择，引用一次实际结果说明", r.choice && r.reason?.trim()),
      ];
    }
    case "24": {
      const r = n<R.Press24>(id, { text: "", marks: {}, seed: 1 });
      const correct = newsClaims(r.text.slice(r.prompt?.length ?? 0)).filter(
        (c) => r.marks[c.key] === (c.correct ? "yes" : "no"),
      ).length;
      return [e(`正确核对至少三条模型陈述（${correct}/3）`, correct >= 3)];
    }
    case "25": {
      const r = n<R.Press25>(id, {
        headline: "",
        opening: "",
        ai: "",
        edited: "",
        seed: 1,
      });
      return [
        e("写标题并与字字合写", r.headline && r.opening && r.ai),
        e("完成当前稿件的校对", canPublish(r)),
        e("送印这一版", r.spans),
      ];
    }
    default:
      return [];
  }
}
