import { exhibits, companies } from "./content/archives.js";
import { articles, articleText } from "./content/articles/index.js";
import { sourceById, AS_OF } from "./content/sources.js";
import assets from "./content/assets.json" with { type: "json" };
import {
  gallerySpecs,
  localToWorld,
  worldToLocal,
  resolveRoomId,
} from "./spatial/layout.js";
export { localToWorld, worldToLocal, resolveRoomId };
export { AS_OF };
export const sources = sourceById;
export const photoById = Object.fromEntries(assets.map((a) => [a.id, a]));
const definitions = [
  [
    "origins",
    "问题的诞生",
    "THE FIRST QUESTION",
    "1943—1958",
    "一个问题，一个名字，一台会学习的机器。",
    "typewriter",
    "turing",
  ],
  [
    "rules",
    "规则与探索",
    "RULES & REALITY",
    "1965—1997",
    "把专家的经验写成规则，直到规则不够用。",
    "terminal",
    "eliza",
  ],
  [
    "learning",
    "让机器学习",
    "LEARNING TO SEE",
    "1986—2018",
    "方法、例子和算力，在2012年终于相遇。",
    "network",
    "alexnet",
  ],
  [
    "games",
    "一局棋之外",
    "BEYOND THE BOARD",
    "1997—2021",
    "从棋盘上的胜负，到实验室里的蛋白质。",
    "go",
    "lee-match",
  ],
  [
    "generation",
    "生成的浪潮",
    "A NEW INTERFACE",
    "2014 → 今天",
    "一个词接一个词，一步接一步：会写也会画的模型。",
    "tokens",
    "chatgpt",
  ],
  [
    "frontiers",
    "多模态与新能力",
    "BEYOND WORDS",
    "2021 → 今天",
    "看、听、想、做：模型开始接触真实世界。",
    "terminal",
    "multimodal",
  ],
  [
    "industry",
    "当下AI群像",
    "MANY PATHS FORWARD",
    "今天 · 2026",
    "二十家机构，许多条道路，没有唯一的答案。",
    "archive",
    "many-paths",
  ],
];
// One colour per hall, used on its panels, banners and floor medallion.
const hallColors = {
  origins: "#2f6f6a",
  rules: "#a8692b",
  learning: "#2d5c97",
  games: "#9c3d3d",
  generation: "#6a4c9c",
  frontiers: "#3d7d55",
  industry: "#a07c28",
};
export const rooms = definitions.map((d, i) => ({
  ...gallerySpecs[i],
  color: hallColors[d[0]],
  id: d[0],
  name: d[1],
  en: d[2],
  year: d[3],
  intro: d[4],
  artifact: d[5],
  hero: d[6],
  index: i,
  n: String(i + 1).padStart(2, "0"),
}));
export const roomById = Object.assign(
  Object.create(null),
  Object.fromEntries(rooms.map((r) => [r.id, r])),
);
function dossierSearch(d) {
  return d ? d.evidence.flatMap((e) => [e.title, e.text]).join(" ") : "";
}
export const items = [
  ...exhibits.map((e) => ({
    ...e,
    article: articles[e.id] ?? "",
    name: e.title,
    roomId: e.gallery,
    kind: "history",
    search: [
      e.title,
      e.subtitle,
      e.place ?? "",
      e.people ?? "",
      articleText(articles[e.id]),
      e.fact ?? "",
      e.look ?? "",
      e.date,
      dossierSearch(e.dossier),
    ].join(" "),
  })),
  ...companies.map((c) => ({
    ...c,
    article: articles[c.id] ?? "",
    title: c.name,
    subtitle: c.tag,
    date: c.milestones.map((m) => m[0]).join(" · "),
    roomId: "industry",
    kind: "company",
    search: [
      c.name,
      c.tag,
      articleText(articles[c.id]),
      c.fact ?? "",
      ...c.milestones.flat(),
      dossierSearch(c.dossier),
    ].join(" "),
  })),
  {
    id: "future",
    name: "下一站，由你来书写",
    title: "下一站，由你来书写",
    subtitle: "一张写给未来的研究卡",
    intro: "七十多年前，图灵写下了一个问题。下一个问题，可以由你来写。",
    article: articles.future,
    fact: "你写下的问题会保留在本章记录中。记录保存在这台浏览器。",
    date: "未来",
    roomId: "industry",
    studyId: "future",
    kind: "future",
    sources: [],
    related: ["turing"],
    question: "我想让人工智能帮助……",
    search: "未来 下一站 由你来书写 留言 研究卡 " + articleText(articles.future),
  },
];
export const itemById = Object.assign(
  Object.create(null),
  Object.fromEntries(items.map((i) => [i.id, i])),
);
export function itemsInRoom(id) {
  return items.filter((i) => i.roomId === id);
}
export const atlasName = "奇点 · 思想之庭";
