import { test } from "node:test";
import assert from "node:assert/strict";
import { decode, isUnlocked, newProgress } from "../src/core/state.ts";
import { ProgressStorage } from "../src/core/storage.ts";
import {
  canPublish,
  draftSignature,
  type Draft,
} from "../src/core/publication.ts";
import { REVIEWS, reviewReady } from "../src/content/learning.ts";
import { newsClaims } from "../src/core/news.ts";
import { freshLedger } from "../src/course/records.ts";

test("unknown stations and gaps in restored completion cannot unlock later rooms", () => {
  const p = newProgress();
  assert.equal(isUnlocked(p, "not-a-station"), false);
  p.done = { "01": true, "05": true, "24": true, "25": true };
  p.finale = true;
  const { route, ...legacy } = p;
  const restored = decode(JSON.stringify(legacy)).progress;
  assert.equal(isUnlocked(restored, "06"), false);
  assert.equal(restored.finale, false);
  assert.deepEqual(restored.done, { "01": true });
});

test("a damaged save is retained even when the temporary session makes progress", () => {
  let raw = "{damaged";
  const store = new ProgressStorage({
    getItem: () => raw,
    setItem: (_k, v) => {
      raw = v;
    },
    removeItem: () => {
      raw = "";
    },
  });
  const p = newProgress();
  p.done["01"] = true;
  assert.equal(store.save(p), false);
  assert.equal(raw, "{damaged");
  assert.equal(store.original, raw);
});

test("storage failure is recoverable and does not discard the in-memory work", () => {
  let full = true,
    raw = "";
  const store = new ProgressStorage({
    getItem: () => null,
    setItem: (_k, v) => {
      if (full) throw Error("quota");
      raw = v;
    },
    removeItem: () => {},
  });
  const p = newProgress();
  p.done["01"] = true;
  assert.equal(store.save(p), false);
  full = false;
  assert.equal(store.save(p), true);
  assert.equal(decode(raw).progress.done["01"], true);
});

test("the pagehide flush after a deliberate reset cannot resurrect the previous save", () => {
  let raw: string | null = null;
  const store = new ProgressStorage({
    getItem: () => raw,
    setItem: (_k, v) => {
      raw = v;
    },
    removeItem: () => {
      raw = null;
    },
  });
  const p = newProgress();
  p.done["01"] = true;
  store.save(p);
  assert.equal(store.reset(), true);
  assert.equal(store.save(p), false);
  assert.equal(raw, null);
});

test("a malformed station record is identified instead of being used by the room", () => {
  const p = newProgress();
  p.notes["01"] = { tries: null, answered: true };
  assert.ok(decode(JSON.stringify(p)).warning);
  assert.deepEqual(decode(JSON.stringify(p)).progress.notes, {});
});

test("saved choices, token lists and attention head references are validated before restoration", () => {
  for (const [id, value] of [
    ["05", { choice: 99, reason: "test" }],
    ["15", { notes: { "9-9": "test" } }],
    ["15", { notes: {}, measured: { "0-0": { label: "test", share: "bad", spread: 0.5 } } }],
    ["09", { pairs: [], swapped: true, fill: { candidates: [{ word: "小猫", probability: NaN }], remaining: 0 } }],
    ["12", { viewed: [], observations: [{ pair: 0, kind: "phone", vector: null }] }],
    ["21", { prompt: "你好", printed: "not-an-array", picks: 5 }],
  ] as const) {
    const p = newProgress();
    p.notes[id] = value;
    assert.ok(decode(JSON.stringify(p)).warning, id);
  }
});

test("malformed new review evidence protects the original instead of silently dropping a record", () => {
  const p = newProgress();
  p.reviews.foundry = { choice: 1, observation: "词元不同", evidence: { station: "01" } as never };
  assert.ok(decode(JSON.stringify(p)).warning);
});

test("invalid physical workbench saves cannot produce missing seats or invalid model queries", () => {
  for (const notes of [
    { ledger: { ...freshLedger(), seatOrder: [0, 0, 2] } },
    { workbench: { sentences: { "01": 42 } } },
    {
      workbench: {
        council: {
          "13": {
            source: "她",
            tokens: ["她"],
            query: 9,
            applePair: 0,
            appleKind: "phone",
            pronoun: 0,
            inserted: -1,
            layer: 3,
            head: 2,
          },
        },
      },
    },
  ]) {
    const p = newProgress();
    p.notes = notes;
    assert.ok(decode(JSON.stringify(p)).warning);
  }
  const legacy = newProgress();
  const { seatOrder, seatMoves, ...oldLedger } = freshLedger();
  legacy.notes.ledger = oldLedger;
  assert.equal(decode(JSON.stringify(legacy)).warning, "");
});

test("publication requires proofreading the current text, and edits revoke that approval", () => {
  const d: Draft = {
    headline: "晨风校庆",
    opening: "本周六，",
    ai: "在操场表演。",
    edited: "合唱团在礼堂表演。",
  };
  assert.equal(canPublish(d), false);
  d.proof = {
    signature: draftSignature(d),
    facts: true,
    readability: true,
    attribution: false,
  };
  assert.equal(canPublish(d), false);
  d.proof.attribution = true;
  assert.equal(canPublish(d), true);
  d.edited += "再次修改。";
  assert.equal(canPublish(d), false);
});

test("a checked box cannot approve a known contradiction in the news draft", () => {
  const d: Draft = {
    headline: "校庆新闻",
    opening: "本周六，",
    ai: "举行第五十四届校庆。",
    edited: "举行第五十四届校庆，舞蹈队在操场表演。",
  };
  d.proof = {
    signature: draftSignature(d),
    facts: true,
    readability: true,
    attribution: true,
  };
  assert.equal(canPublish(d), false);
});

test("news checking examines repeated claims and accepts the reference award wording", () => {
  const claims = newsClaims(
    "合唱团在礼堂演出。舞蹈队在操场演出。初二（三）班获得一等奖。",
  );
  assert.equal(claims.filter((c) => !c.correct).length, 2);
  assert.equal(claims.find((c) => c.label === "获奖")?.correct, true);
});

test("each room review needs a defensible conclusion and the student's own observation", () => {
  for (const room of Object.keys(REVIEWS) as (keyof typeof REVIEWS)[]) {
    assert.equal(reviewReady(room, REVIEWS[room].correct, ""), false);
    assert.equal(
      reviewReady(room, (REVIEWS[room].correct + 1) % 3, "我比较了两次实验。"),
      false,
    );
    assert.equal(
      reviewReady(room, REVIEWS[room].correct, "我比较了两次实验。"),
      true,
    );
  }
});
