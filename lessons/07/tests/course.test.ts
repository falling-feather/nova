import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Course } from "../src/course/course.ts";
import { ProgressStorage } from "../src/core/storage.ts";
import { STATIONS } from "../src/content/lessons.ts";
import { draftSignature } from "../src/core/publication.ts";
import { Dictionary, Tokenizer } from "../src/model/tokenizer.ts";
import { TinyTransformer } from "../src/model/transformer.ts";
import type { Models } from "../src/model/assets.ts";
import { sceneData } from "../src/scene/data.ts";
import { inspector } from "../src/ui/room-view.ts";
import { softmax } from "../src/model/transformer.ts";

const read = (path: string) =>
  readFileSync(new URL("../public/models/" + path, import.meta.url));
const json = (path: string) => JSON.parse(read(path).toString("utf8"));
const dictionary = new Dictionary(json("words.json"));
const model = (name: string) => {
  const buffer = read(name + ".bin");
  return new TinyTransformer(
    json(name + ".json"),
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length),
  );
};
const models: Models = {
  dictionary,
  tokenizer: new Tokenizer(json("tokenizer.json"), dictionary),
  council: model("council"),
  press: model("press"),
  map: json("name-map.json"),
  basket: json("basket.json").lines,
};
Object.assign(globalThis, { window: globalThis });
const course = (id: string) => {
  const c = new Course(models, new ProgressStorage(null));
  c.progress.route = "full";
  for (const s of STATIONS) {
    if (s.id === id) break;
    c.progress.done[s.id] = true;
  }
  c.enter(id);
  return c;
};

test("free context edits run the arranged tokens and undo without rewriting signed evidence", () => {
  const c = course("12");
  const original = c.currentText;
  c.captureCouncil("a");
  assert.equal(c.setCouncilText("小明吃了一个苹果。"), true);
  c.captureCouncil("b");
  assert.ok(c.councilComparison);
  assert.notDeepEqual(c.councilComparison!.a.vector, c.councilComparison!.b.vector);
  const snapshot = structuredClone(c.councilExperiment);
  c.undoMove();
  assert.equal(c.currentText, original);
  assert.deepEqual(c.councilExperiment, snapshot);
  assert.equal(c.setCouncilText("𰻞".repeat(49)), false, "model context limit is enforced before mutation");
  assert.equal(c.currentText, original);
  c.flush();
});

test("free comparison rejects identical inputs and a different query or model layer", () => {
  const c = course("12");
  c.captureCouncil("a");
  c.captureCouncil("b");
  assert.equal(c.councilComparison, null);
  c.setCouncilText("小明吃了一个苹果。");
  c.layer++;
  c.captureCouncil("b");
  assert.equal(c.councilComparison, null);
  c.layer--;
  c.selectedIndex = 0;
  c.captureCouncil("b");
  assert.equal(c.councilComparison, null);
  c.flush();
});

test("turning a long word tray changes only the view and leaves full model input intact",()=>{
  const c=course("12"); c.setCouncilText("苹果"+"小明吃了一个。".repeat(5));
  const input=[...c.meeting.tokens],result=c.meeting.result;
  assert.ok(input.length>20);
  const ids=new Set<string>();
  for(let page=0;page<c.councilWindow.pages;page++) { c.setCouncilPage(page); const data=sceneData(c,false);assert.ok(data.tiles.length<=11);data.tiles.forEach(t=>ids.add(t.id));assert.equal(c.meeting.result,result);assert.deepEqual(c.meeting.tokens,input); }
  assert.equal(ids.size,input.length);c.flush();
});

test("a genuine free A/B and a correct interpretation can finish the core context stage", async()=>{
  const c=course("12"); c.progress.route="core";
  c.captureCouncil("a"); c.setCouncilText("小明吃了一个苹果。"); c.captureCouncil("b");
  await c.perform("answer","same"); assert.equal(c.ready,false);
  await c.perform("answer","diff"); assert.equal(c.ready,true);
  assert.equal(c.review(0,"最大格差11.4810；上下文改变了表示，连线仍只是观察线索。"),true);
  const signed=structuredClone(c.progress.reviews.council);
  c.setCouncilText("我的苹果削了皮。"); c.captureCouncil("b");
  assert.deepEqual(c.progress.reviews.council,signed);
  c.flush();
});

test("free exploration reaches every workshop without fabricating prerequisite completions and restores its location",()=>{
  const c=new Course(models,new ProgressStorage(null));
  c.startExploring();
  for(const id of ["16","06","12","21","25"]) { c.enter(id); assert.equal(c.id,id); }
  assert.deepEqual(c.progress.done,{});
  const restored=new Course(models,new ProgressStorage({getItem:()=>JSON.stringify(c.progress),setItem(){},removeItem(){}}));
  assert.equal(restored.id,"25"); assert.equal(restored.exploring,true); assert.deepEqual(restored.progress.done,{});
  c.flush(); restored.flush();
});

test("a free context and its frozen snapshots survive restoration; corrupt additions protect the original", () => {
  const c = course("12");
  c.captureCouncil("a");
  c.setCouncilText("我的苹果削了皮。");
  c.captureCouncil("b");
  let raw = JSON.stringify(c.progress);
  const port = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; }, removeItem: () => {} };
  const restored = new Course(models, new ProgressStorage(port));
  restored.enter("12");
  assert.equal(restored.currentText, c.currentText);
  assert.deepEqual(restored.councilExperiment, c.councilExperiment);
  const corrupt = JSON.parse(raw);
  corrupt.notes.workbench.experiments["12"].a.vector = [null];
  raw = JSON.stringify(corrupt);
  const protectedStore = new ProgressStorage(port);
  assert.ok(protectedStore.loaded.warning);
  assert.equal(protectedStore.save(c.progress), false);
  assert.equal(raw, JSON.stringify(corrupt));
  c.flush(); restored.flush();
});

test("next-token candidates and their attention share one cached inference for unchanged input", async () => {
  const c = course("21");
  const first = c.printPrediction;
  assert.equal(c.printPrediction, first);
  assert.equal(c.candidates, c.candidates);
  await c.perform("print-token", c.candidates[0].id);
  assert.equal(c.printPrediction === first, false);
  c.flush();
});

test("generation completion requires interpreting a genuine next-candidate transition rather than click count",async()=>{
  const c=course("21");
  await c.perform("print-token",c.candidates[0].id);
  assert.equal(c.ready,false);
  assert.ok(c.printTransitions.length);
  await c.perform("answer","recalculated");
  assert.equal(c.ready,true);
  const trace=structuredClone(c.printTransitions[0]);
  await c.perform("undo");
  assert.deepEqual(c.printTransitions[0],trace);
  c.flush();
});

test("fill includes the real vocabulary winner and keeps the unrenormalized probabilities", async () => {
  const c = course("09");
  await c.perform("fill");
  const r = c.council.run("那只小猫在沙发上睡觉。", models.tokenizer.tokens("那只小猫在沙发上睡觉。").indexOf("小猫"));
  const p = softmax(r.result.logits.values().next().value!);
  assert.equal(c.lastFill[0].word, "小猫");
  assert.ok(c.lastFill[0].probability > 0.99);
  assert.equal(c.lastFill.find((v) => v.word === "小狗")?.probability, p[models.tokenizer.id("小狗")]);
  assert.ok(c.lastFillRemaining >= 0);
  assert.ok(Math.abs(c.lastFill.reduce((s, v) => s + v.probability, 0) + c.lastFillRemaining - 1) < 1e-6);
  const html = inspector(c, "fill").html;
  assert.match(html, /小猫/);
  assert.match(html, /其余/);
  assert.doesNotMatch(html, /小狗<b>0\.0%/);
  c.flush();
});

test("the size question explains already visible readings instead of asking for a prediction", () => {
  const c = course("04");
  const html = inspector(c, "size").html;
  assert.doesNotMatch(html, /你预测/);
  assert.match(html, /读数/);
  c.flush();
});

test("three genuine BPE guesses complete the introduction while further casting remains available", async () => {
  const c = course("02");
  for (let i = 0; i < 3; i++) await c.perform("cast", c.pairs[0].a + "+" + c.pairs[0].b);
  assert.equal(c.ready, true);
  await c.perform("cast", c.pairs[0].a + "+" + c.pairs[0].b);
  assert.equal(c.note<{ rounds: unknown[] }>("02", { rounds: [] }).rounds.length, 4);
  c.flush();
});

test("context evidence requires a real matched A/B pair and the signed snapshot stays fixed", async () => {
  const c = course("12");
  c.progress.route = "core";
  assert.equal(c.contextComparison, null);
  await c.perform("apple-pair", 1);
  await c.perform("context", "fruit");
  const pair = c.contextComparison!;
  assert.equal(pair.a.pair, 1);
  assert.equal(pair.b.pair, 1);
  assert.equal(pair.a.layer, pair.b.layer);
  assert.equal(pair.a.head, pair.b.head);
  await c.perform("answer", "diff");
  assert.ok(c.review(0, "两种苹果上下文的表示读数不同，连线不能单独证明完整原因。"));
  const snapshot = structuredClone(c.progress.reviews.council!.evidence);
  await c.perform("layer", 2);
  assert.equal(c.contextComparison, null, "a new layer needs two actual observations");
  await c.perform("context", "phone");
  assert.ok(c.contextComparison);
  assert.deepEqual(c.progress.reviews.council!.evidence, snapshot);
  c.flush();
});

test("visits across unmatched sentence groups cannot count as an A/B experiment", async () => {
  const c = course("12");
  await c.perform("apple-pair", 1);
  await c.perform("context", "fruit");
  await c.perform("apple-pair", 0);
  await c.perform("layer", 0);
  assert.equal(c.contextComparison, null);
  await c.perform("answer", "diff");
  assert.equal(c.note<{ answer?: string }>("12", {}).answer, undefined);
  c.flush();
});

test("the head review freezes its own measured heads even after a context experiment", async () => {
  const c = course("15");
  c.enter("12");
  await c.perform("context", "fruit");
  c.enter("15");
  await c.perform("head", 0);
  await c.perform("head-note", "本句偏向自己");
  await c.perform("head", 1);
  await c.perform("head-note", "集中于几个词");
  const record = c.reviewEvidence!;
  assert.equal(record.station, "15");
  assert.match(record.before, /记录员甲/);
  assert.match(record.after, /记录员乙/);
  assert.match(record.before, /实测/);
  assert.ok(c.review(0, "两位记录员的实测分配不同，只能说明这句话的模式。"));
  assert.equal(c.progress.reviews.council!.evidence?.station, "15");
  c.flush();
});

test("the position review keeps controlled with/without-seat results in separate snapshots", async () => {
  const c = course("20");
  c.moveTile("seats", 0, 2);
  await c.perform("seats", 0);
  await c.perform("seats", 1);
  assert.equal(c.ready, true, "the separate 60% challenge is optional");
  const record = c.reviewEvidence!;
  assert.match(record.before, /无座位号/);
  assert.match(record.after, /有座位号/);
  assert.match(record.before, /0\.0000/);
  c.flush();
});

test("a core temperature experiment uses paired seeds, needs a decision and can be cancelled and redone", async () => {
  const c = course("23");
  c.progress.route = "core";
  const running = c.perform("generate", "low");
  assert.ok(c.busy);
  c.cancel();
  await running;
  assert.equal(c.note<{ low: string[] }>("23", { low: [] }).low.length, 0);
  assert.equal(c.progress.done["23"], undefined);
  for (const which of ["low", "middle", "high"]) await c.perform("generate", which);
  const n = c.note<{ low: string[]; middle: string[]; high: string[] }>("23", null!);
  assert.equal(n.low.length, 1);
  assert.equal(n.middle.length, 1);
  assert.equal(n.high.length, 1);
  assert.notEqual(n.low[0], n.high[0]);
  assert.equal(c.ready, false, "running the model alone does not submit the editorial decision");
  const first = n.low[0];
  await c.perform("generate", "low");
  assert.equal(n.low[0], first, "the same seed and temperature reproduce the same result");
  await c.perform("temperature-choice", "middle");
  await c.perform("temperature-reason", "我为消息选中温作起点，但三种输出都需要查证事实。");
  assert.equal(c.ready, true);
  assert.equal(c.progress.done["23"], true);
  c.flush();
});

test("placing a word selects the word just placed, not the next unseen word", async () => {
  const c = course("08");
  await c.perform("place", [0.5, 0.5]);
  assert.equal(c.selected, "梨");
  assert.equal(c.holding, "熊猫");
  await c.perform("place", [0.8, 0.8]);
  assert.equal(c.selected, "熊猫");
  assert.equal(c.holding, "地铁");
  c.flush();
});
test("editing during generation cancels the outdated continuation and retains the edit", async () => {
  const c = course("25");
  await c.perform("draft", ["opening", "本周六，"]);
  const running = c.perform("continue");
  assert.ok(c.busy);
  await c.perform("draft", ["opening", "合唱团在礼堂"]);
  await running;
  assert.equal(c.draft.opening, "合唱团在礼堂");
  assert.equal(c.draft.ai, "");
  assert.equal(c.busy, "");
  c.flush();
});
test("withdrawing proofreading also withdraws publication and the completion stamp", async () => {
  const c = course("25"),
    d = c.draft;
  Object.assign(d, {
    headline: "校庆",
    opening: "本周六，",
    ai: "合唱团在礼堂表演。",
    edited: "合唱团在礼堂表演。",
  });
  d.proof = {
    signature: draftSignature(d),
    facts: true,
    readability: true,
    attribution: true,
  };
  await c.perform("publish");
  assert.ok(d.spans);
  assert.ok(c.review(2, "核对了演出的地点。"));
  await c.perform("proof", "facts");
  assert.equal(c.progress.finale, false);
  assert.equal(c.progress.done["25"], undefined);
  assert.equal(c.progress.reviews.press, undefined);
  assert.equal(d.spans, undefined);
  c.flush();
});
test("a saved later lesson restores its intended query and attention head", () => {
  const c = course("13");
  assert.equal(c.selected, "她");
  assert.equal(c.layer, 3);
  assert.equal(c.head, 2);
  c.enter("13");
  assert.equal(c.meeting.tokens[c.queryIndex], "她");
  c.flush();
});

test("an immediate end prediction preserves the existing edited draft", async () => {
  const c = course("25");
  Object.assign(c.draft, {
    opening: "校庆结束了。",
    ai: "原来的续写。",
    edited: "我已经修改过的稿件。",
  });
  c.generate = async () => "";
  let notice = "";
  c.onNotice = (message) => (notice = message);
  await c.perform("continue");
  assert.equal(c.draft.ai, "原来的续写。");
  assert.equal(c.draft.edited, "我已经修改过的稿件。");
  assert.match(notice, /结束/);
  c.flush();
});

test("moving a type block changes the source sentence without dropping unknown text, and can be undone", async () => {
  const c = course("01");
  await c.perform("sentence", "小猫小猫龘。");
  const original = c.sentence;
  const pieces = c.foundryPieces.map((p) => p.text);
  assert.ok(c.moveTile("sentence", 0, pieces.length - 2));
  const moved = [...pieces];
  moved.splice(pieces.length - 2, 0, moved.splice(0, 1)[0]);
  assert.equal(c.sentence, moved.join(""));
  assert.ok(c.sentence.includes("龘"));
  assert.equal(c.moveTile("sentence", -1, 0), false);
  c.undoMove();
  assert.equal(c.sentence, original);
  assert.equal(c.canUndoMove, false);
  c.flush();
});

test("foundry drafts belong to each experiment and a misplaced map word can be taken back", async () => {
  const c = course("04");
  c.enter("01");
  await c.perform("sentence", "小猫在沙发上睡觉。");
  c.enter("03");
  await c.perform("rare", "苹果");
  c.enter("01");
  assert.equal(c.sentence, "小猫在沙发上睡觉。");
  c.enter("03");
  assert.equal(c.sentence, "苹果");
  c.flush();
  const map = course("08");
  await map.perform("place", [0.25, 0.5]);
  await map.perform("place", [0.5, 0.75]);
  await map.perform("unplace");
  assert.equal(map.holding, "熊猫");
  assert.deepEqual(
    map.note<{ placed: Record<string, number[]> }>("08", { placed: {} }).placed,
    { 梨: [0.25, 0.5] },
  );
  map.flush();
});

test("moving council words reruns the exact token sequence and follows the same query occurrence", async () => {
  const c = course("13");
  await c.perform("pronoun", 1);
  const original = c.meeting;
  const from = c.queryIndex;
  assert.ok(c.moveTile("council", from, 0));
  assert.equal(c.queryIndex, 0);
  assert.equal(c.meeting.tokens[0], original.tokens[from]);
  assert.notDeepEqual(c.meeting.ids, original.ids);
  assert.notDeepEqual(
    c.attention(),
    Array.from(original.result.attention[c.layer][c.head][from]),
  );
  const store = new ProgressStorage({
    getItem: () => JSON.stringify(c.progress),
    setItem() {},
    removeItem() {},
  });
  const restored = new Course(models, store);
  restored.enter("13");
  assert.deepEqual(restored.meeting.ids, c.meeting.ids);
  assert.equal(restored.pronoun, 1);
  assert.equal(restored.queryIndex, 0);
  await c.perform("pronoun", 0);
  assert.equal(c.meeting.tokens[0], "哥哥");
  assert.equal(c.canUndoMove, false);
  c.flush();
  restored.flush();
});

test("the typeset sentence keeps reading order, and changing the query does not move its words", async () => {
  const c = course("11");
  const before = sceneData(c);
  const slots = (data: ReturnType<typeof sceneData>) =>
    data.tiles.map(({ id, x, z }) => ({ id, x, z }));
  await c.perform("pick", "@3");
  assert.deepEqual(slots(sceneData(c)), slots(before));
  await c.perform("pick", "@1");
  const movedWord = c.meeting.tokens[1];
  c.moveTile("council", 1, 3);
  const after = sceneData(c);
  const moved = after.tiles.find((t) => t.id === "word3")!;
  assert.equal(moved.text, movedWord);
  assert.equal(moved.selected, true);
  assert.deepEqual(after.tiles.map(tile=>tile.text),c.meeting.tokens);
  assert.ok(after.tiles.every((tile,i)=>i===0||tile.x>after.tiles[i-1].x));
  assert.equal(after.links.length, c.meeting.tokens.length);
  assert.ok(
    after.links.every((link) => link.from === "word3"),
  );
  assert.ok(after.links.some(link=>link.to==="word3"),"the self-attention weight must not disappear");
  assert.ok(Math.abs(after.links.reduce((sum,link)=>sum+link.weight,0)-1)<1e-6);
  assert.ok(after.links.some((link) => link.to === "word0"));
  c.flush();
});

test("seat rearrangement recalculates the same person's card and survives restore", async () => {
  const c = course("20");
  const original = c.seatResults;
  assert.deepEqual(original.b, original.a);
  assert.ok(c.moveTile("seats", 0, 2));
  assert.deepEqual(c.seatResults.b, ["小林", "借给", "小雨"]);
  let r = c.seatResults;
  r.first[0].forEach((v, i) =>
    assert.ok(Math.abs(v - r.second[r.b.indexOf("小雨")][i]) < 1e-10),
  );
  await c.perform("seats", 1);
  r = c.seatResults;
  assert.notDeepEqual(r.first[0], r.second[r.b.indexOf("小雨")]);
  const restored = new Course(
    models,
    new ProgressStorage({
      getItem: () => JSON.stringify(c.progress),
      setItem() {},
      removeItem() {},
    }),
  );
  restored.enter("20");
  assert.equal(restored.seats, true);
  assert.deepEqual(restored.seatResults.b, r.b);
  restored.flush();
  assert.ok(c.checks.find((check) => check.text.includes("移动"))?.done);
  c.undoMove();
  assert.deepEqual(c.seatResults.b, original.b);
  c.flush();
});
