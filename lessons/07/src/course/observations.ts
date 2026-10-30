import type { Course } from "./course.ts";
import type { ContextObservation, Council12, Council15, ExperimentEvidence, Foundry1, Foundry5, Gallery6, Gallery9, Press23 } from "./records.ts";
import { cosine } from "../model/transformer.ts";
import type { Models } from "../model/assets.ts";

export const contextKey = (observation: ContextObservation) => `${observation.pair}/${observation.layer}/${observation.head}`;

export function typeCaseReading(models: Models, merges: number) {
  const tokenizer = models.tokenizer.withMerges(merges), sample = models.basket.slice(0, 60);
  if (!sample.length) throw new Error("缺少用于比较字架的报纸材料");
  return { size: tokenizer.size, lines: sample.length, average: sample.reduce((sum, text) => sum + tokenizer.tokens(text).length, 0) / sample.length };
}

export function matchingContexts(note: Council12, pair?: number, layer?: number, head?: number) {
  const list = note.observations ?? [];
  for (const b of [...list].reverse()) {
    if (pair !== undefined && b.pair !== pair || layer !== undefined && b.layer !== layer || head !== undefined && b.head !== head) continue;
    const a = list.find((v) => v.pair === b.pair && v.layer === b.layer && v.head === b.head && v.kind !== b.kind);
    if (a) return { a: a.kind === "phone" ? a : b, b: b.kind === "fruit" ? b : a };
  }
  return null;
}

/** Evidence comes from actions already recorded, and is frozen when the author signs. */
export function reviewEvidence(c: Course): ExperimentEvidence | null {
  const t = c.models.tokenizer;
  if (c.room === "foundry") {
    const tries = c.note<Foundry1>("01", { tries: [], answered: false }).tries;
    if (c.id === "01") {
      if (tries.length < 2) return null;
      const row = (text: string) => `${text}\n按词：${c.models.dictionary.split(text).join(" | ")}\n字字：${t.tokens(text).join(" | ")}`;
      return { station: "01", variable: "句子", fixed: "同一训练字表与分词规则", before: row(tries.at(-2)!), after: row(tries.at(-1)!) };
    }
    const n = c.note<Foundry5>("05", {});
    if (n.choice === undefined) return null;
    const row = (merges: number) => { const reading = typeCaseReading(c.models, merges); return `${reading.size}块字架；同样${reading.lines}行平均${reading.average.toFixed(2)}个词元`; };
    return { station: "05", variable: "字架大小", fixed: "相同60行训练材料；后续模型字表不变", before: row(0), after: row([0, t.data.modelMerges, t.data.merges.length][n.choice]) };
  }
  if (c.room === "gallery") {
    if (c.id === "10") {
      const pairs = c.note<Gallery9>("09", { pairs: [], swapped: false }).pairs;
      if (pairs.length < 2) return null;
      const row = (pair: string) => {
        const words = pair.split("/");
        return `${words.join(" ↔ ")}\n完整初始名牌余弦：${cosine(c.models.council.embedding(t.id(words[0])), c.models.council.embedding(t.id(words[1]))).toFixed(4)}`;
      };
      return { station: "09", variable: "比较的词对", fixed: "同一模型的完整初始名牌；二维地图只是示意，不代替向量计算", before: row(pairs.at(-2)!), after: row(pairs.at(-1)!) };
    }
    const words = c.note<Gallery6>("06", { flipped: [] }).flipped;
    if (words.length < 2) return null;
    const row = (word: string) => `${word} · ${c.models.council.config.dim}个数\n前四格：${Array.from(c.models.council.embedding(t.id(word))).slice(0, 4).map((v) => v.toFixed(3)).join(" · ")}`;
    return { station: "06", variable: "词元", fixed: "同一模型的初始词向量，不含上下文", before: row(words.at(-2)!), after: row(words.at(-1)!) };
  }
  if (c.room === "council") {
    const pair = c.id === "12" ? c.contextComparison : null;
    if (pair) {
      const row = (v: typeof pair.a) => `${v.text}\n电子参照 ${v.device.toFixed(3)}；水果参照 ${v.fruit.toFixed(3)}\n“苹果”关注：${v.attention.map((a) => `${a.word} ${(a.weight * 100).toFixed(2)}%`).join("、")}`;
      return { station: "12", variable: "苹果所在句子的上下文", fixed: `同一模型、初始名牌、第${pair.a.layer + 1}层、${pair.a.head < 0 ? "四头平均" : "记录员" + "甲乙丙丁"[pair.a.head]}；余弦相似度，不是分类概率。表示A/B余弦 ${cosine(new Float32Array(pair.a.vector), new Float32Array(pair.b.vector)).toFixed(4)}`, before: row(pair.a), after: row(pair.b) };
    }
    const note = c.note<Council15>("15", { notes: {} });
    const notes = Object.entries(note.notes).filter(([key]) => note.measured?.[key]);
    if (notes.length < 2) return null;
    const row = ([key, observation]: [string, string]) => {
      const [layer, head] = key.split("-").map(Number), measured = note.measured![key];
      return `第${layer + 1}层，记录员${"甲乙丙丁"[head]}\n${measured.text ?? "旧记录未保存原句"}\n实测：${measured.label} ${(measured.share * 100).toFixed(2)}%，分散度${measured.spread.toFixed(3)}\n我的纪要：${observation}`;
    };
    return { station: "15", variable: "观察的层或头", fixed: "同一句子才能作受控头层对照；若两条原句不同，应分别解释，不能只归因于头层", before: row(notes.at(-2)!), after: row(notes.at(-1)!) };
  }
  if (c.room === "counting") {
    const r = c.seatResults;
    const row = (seats: boolean) => {
      const current = c.seatComparison(seats), a = current.first[0], b = current.second[current.b.indexOf("小雨")];
      const delta = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
      return `${seats ? "有" : "无"}座位号\n原句小雨：${a.map((v) => v.toFixed(4)).join(" · ")}\n换序小雨：${b.map((v) => v.toFixed(4)).join(" · ")}\n最大差异：${delta.toFixed(4)}`;
    };
    return { station: "20", variable: "是否加入座位号", fixed: `同一手算名牌；两条排列固定为“${r.a.join("")}”与“${r.b.join("")}”，逐组比较同一个小雨`, before: row(false), after: row(true) };
  }
  const d = c.draft, temp = c.note<Press23>("23", { low: [], high: [] });
  if (!d.ai || !d.edited) return null;
  return { station: "25", variable: "编辑修改", fixed: `依据本课校庆安排表；${temp.choice ? "温度实验选择：" + temp.choice + "；" + (temp.reason ?? "") : "事实仍需独立核对"}`, before: d.opening + d.ai, after: d.opening + d.edited };
}
