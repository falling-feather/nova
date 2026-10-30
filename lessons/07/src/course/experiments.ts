import type { CouncilExperiment, CouncilSnapshot, ExperimentEvidence } from "./records.ts";
import { cosine } from "../model/transformer.ts";

const queryKey = (s: CouncilSnapshot) => `${s.tokens[s.query]}/${s.tokens.slice(0, s.query).filter(t => t === s.tokens[s.query]).length}`;
export const experimentKey = (a: CouncilSnapshot, b: CouncilSnapshot) => JSON.stringify([a.tokens, a.query, b.tokens, b.query, a.layer, a.head]);
export const sameCouncilView = (a: CouncilSnapshot, b: CouncilSnapshot) =>
  a.layer === b.layer && a.head === b.head && queryKey(a) === queryKey(b);
/** Compare the same occurrence under the same model layer/head, with an actual input change. */
export function compareCouncil(record: CouncilExperiment | undefined) {
  const a = record?.a, b = record?.b;
  if (!a || !b || !sameCouncilView(a,b) ||
    JSON.stringify(a.tokens) === JSON.stringify(b.tokens)) return null;
  const delta = Math.max(...a.vector.map((value, i) => Math.abs(value - b.vector[i])));
  return { a, b, delta, changed: delta > 1e-6, similarity: cosine(new Float32Array(a.vector), new Float32Array(b.vector)), key: experimentKey(a, b) };
}
export function experimentEvidence(station: string, record: CouncilExperiment | undefined): ExperimentEvidence | null {
  const pair = compareCouncil(record);
  if (!pair) return null;
  const row = (s: CouncilSnapshot) => `${s.tokens.join("")}\n查询“${s.tokens[s.query]}” · 前四格 ${s.vector.slice(0,4).map(v => v.toFixed(3)).join(" / ")}\n关注：${s.attention.map(v => `${v.word} ${(v.weight*100).toFixed(2)}%`).join("、")}`;
  return { station, variable: "同一词元的上下文或位置", fixed: `同一议事厅模型；第${pair.a.layer+1}层；${pair.a.head < 0 ? "四头平均" : `第${pair.a.head+1}头`}；表示余弦 ${pair.similarity.toFixed(4)}，最大格差 ${pair.delta.toFixed(4)}。连线是计算权重，不能单独证明完整原因。`, before: row(pair.a), after: row(pair.b) };
}
