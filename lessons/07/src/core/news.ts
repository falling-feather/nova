import { ANNIVERSARY_FACTS } from "../content/lessons.ts";
const facts = Object.fromEntries(ANNIVERSARY_FACTS.map(f => [f.key, f.value]));
export const NEWS_RULES: { key: string; label: string; re: RegExp; truth: (m: string) => boolean }[] = [
  { key: "school", label: "学校", re: /晨风中学|明德中学|春晖小学|实验中学/, truth: m => m === facts.school },
  { key: "n", label: "第几届", re: /第[一二三四五六七八九十百]+届/, truth: m => m === facts.n },
  { key: "day", label: "哪一天", re: /本周[一二三四五六日]|[一二三四五六七八九十]+月[一二三四五六七八九十]+日/, truth: m => facts.day.includes(m.replace(/^本/, "")) },
  { key: "group", label: "表演的社团", re: /合唱团|舞蹈队|鼓号队|戏剧社|民乐团|朗诵队/, truth: m => m === facts.group },
  { key: "venue", label: "地点", re: /在(礼堂|操场|体育馆|大厅|报告厅|图书馆|后山)/, truth: m => m.slice(1) === facts.venue },
  { key: "program", label: "节目", re: /(歌曲|合唱|舞蹈|鼓乐|话剧|民乐|诗朗诵)《[^》]+》/, truth: m => m === facts.program },
  { key: "award", label: "获奖", re: /(初[一二三]|[五六]年级)（[一二三四五六]）班获得了?(一等奖|二等奖|冠军|优秀奖|最佳表演奖)/, truth: m => m.replace("获得了", "获得") === facts.award },
];

/** Checks the course's finite fact patterns; it is not a general fact-checking model. */
export function newsClaims(text: string) {
  return NEWS_RULES.flatMap(rule => Array.from(text.matchAll(new RegExp(rule.re.source, "g")), match => ({
    key: `${rule.key}:${match.index}`, label: rule.label, text: match[0], correct: rule.truth(match[0]), expected: facts[rule.key],
  })));
}
