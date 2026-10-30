import test from "node:test";
import assert from "node:assert/strict";
import { exhibits, companies, itemById } from "../src/content/archives.js";
import { sources, sourceById, AS_OF } from "../src/content/sources.js";
import { galleryGuides } from "../src/content/gallery-guides.js";
import { articles, articleBlocks, articleText } from "../src/content/articles/index.js";

const roomIds = ["origins", "rules", "learning", "games", "generation", "frontiers", "industry", "future"];
const archiveItems = [...exhibits, ...companies];
const historicalIds = [
  "turing", "dartmouth", "perceptron", "dendral", "eliza", "winter", "deepblue",
  "backprop", "cuda", "imagenet", "alexnet", "lee-match", "ke-match", "alphago-zero",
  "alphafold", "transformer", "gpt", "chatgpt", "open-weights", "openai-path",
  "deepseek-path", "google-path", "many-paths",
];
const companyIds = [
  "openai", "google", "deepseek", "anthropic", "meta", "microsoft", "nvidia",
  "amazon", "ibm", "alibaba", "baidu", "tencent", "bytedance", "zhipu", "moonshot",
  "minimax", "mistral", "xai", "huawei", "apple",
];

function checkSources(ids, location) {
  assert.ok(Array.isArray(ids) && ids.length > 0, `${location}: sourceIds are required`);
  assert.equal(new Set(ids).size, ids.length, `${location}: duplicate citation`);
  for (const id of ids) assert.ok(Object.hasOwn(sourceById, id), `${location}: unknown source ${id}`);
}

function checkEvidence(entries, location) {
  assert.ok(Array.isArray(entries) && entries.length > 0, `${location}: evidence is required`);
  for (const entry of entries) {
    assert.ok(entry.title?.trim() && entry.text?.trim(), `${location}: incomplete evidence`);
    checkSources(entry.sources, `${location}/${entry.title}`);
  }
}

test("every archive has a long article and an evidence dossier that cites its sources", () => {
  assert.equal(exhibits.length, 29);
  assert.equal(companies.length, 20);
  assert.deepEqual(exhibits.slice(0, historicalIds.length).map((item) => item.id), historicalIds, "historical IDs preserve saved progress");
  assert.deepEqual(companies.map((item) => item.id), companyIds, "company IDs preserve saved progress");
  for (const item of archiveItems) {
    assert.equal(itemById[item.id], item, `${item.id}: lookup must use the expanded object`);
    const blocks = articleBlocks(articles[item.id]);
    const isCompany = companyIds.includes(item.id);
    assert.ok(
      articleText(articles[item.id]).length >= (isCompany ? 250 : 650),
      `${item.id}: the article is too short to read as an essay`,
    );
    assert.ok(blocks.filter((b) => b.type === "h").length >= 3, `${item.id}: the article needs section headings`);
    assert.equal(blocks[0].type, "h", `${item.id}: the article opens with a section heading`);
    const dossier = item.dossier;
    assert.ok(dossier, `${item.id}: missing dossier`);
    checkEvidence(dossier.evidence, item.id);
    for (const entry of dossier.evidence) {
      for (const id of entry.sources) {
        assert.ok(item.sources.includes(id), `${item.id}: evidence source absent from its source list: ${id}`);
      }
    }
  }
});

test("each gallery offers a navigable reading route and sourced chronological context", () => {
  assert.deepEqual(Object.keys(galleryGuides).sort(), roomIds.toSorted());
  for (const [roomId, guide] of Object.entries(galleryGuides)) {
    for (const field of ["question", "overview", "goal"]) assert.ok(guide[field]?.trim(), `${roomId}/${field}`);
    assert.ok(guide.route.length > 0, `${roomId}: empty route`);
    assert.equal(new Set(guide.route).size, guide.route.length, `${roomId}: repeated stop`);
    for (const id of guide.route) assert.ok(id === "future" || Object.hasOwn(itemById, id), `${roomId}: missing stop ${id}`);
    assert.ok(guide.timeline.length >= 4, `${roomId}: historical context is missing`);
    let previousYear = 0;
    for (const event of guide.timeline) {
      assert.ok(event.date?.trim() && event.title?.trim() && event.text?.trim(), `${roomId}: incomplete event`);
      const year = Number(event.date.match(/^\d{4}/)?.[0]);
      assert.ok(Number.isInteger(year) && year >= previousYear, `${roomId}: chronology is not ordered`);
      assert.ok(year <= Number(AS_OF.slice(0, 4)), `${roomId}: imagined future event presented as history`);
      previousYear = year;
      checkSources(event.sources, `${roomId}/${event.title}`);
    }
    checkEvidence(guide.evidence, roomId);
    assert.ok(guide.glossary.length >= 3, `${roomId}: terms need explanations`);
    assert.equal(new Set(guide.glossary.map((entry) => entry.term)).size, guide.glossary.length);
    for (const entry of guide.glossary) assert.ok(entry.term?.trim() && entry.meaning?.trim(), `${roomId}: empty definition`);
  }
});

test("citations resolve to unique public sources and keep review dates separate from publication dates", () => {
  assert.equal(new Set(sources.map((source) => source.id)).size, sources.length);
  assert.equal(AS_OF, "2026-10-10");
  for (const source of sources) {
    assert.equal(new URL(source.url).protocol, "https:", source.id);
    assert.ok(source.title && source.publisher && source.scope, source.id);
    assert.match(source.accessed, /^\d{4}-\d{2}-\d{2}$/, source.id);
    if (source.verifiedAt) assert.equal(source.accessed, source.verifiedAt, source.id);
    else assert.ok(source.accessed < AS_OF, `${source.id}: an unchecked legacy source must not acquire today's review date`);
  }
});

test("the collection distinguishes proposal, match, research and release milestones", () => {
  assert.match(itemById.dartmouth.date, /1955.*1956/);
  assert.deepEqual(itemById["lee-match"].match, { opponent: "李世石", aiWins: 4, humanWins: 1 });
  assert.deepEqual(itemById["ke-match"].match, { opponent: "柯洁", aiWins: 3, humanWins: 0 });
  assert.ok(galleryGuides.origins.timeline.some((event) => event.date.startsWith("1943")));
  assert.ok(galleryGuides.generation.timeline.some((event) => /扩散/.test(event.title)));
  assert.ok(galleryGuides.learning.timeline.some((event) => /2010/.test(event.date)));
  assert.ok(itemById.apple.milestones.some(([date]) => date === "2024-06"));
  assert.ok(itemById.apple.milestones.some(([date]) => date === "2024-10"));
});
