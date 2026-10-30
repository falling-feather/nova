import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, teachPhoto } from "../src/core/session.ts";
import { decodeSession, encodeSession } from "../src/core/storage.ts";
test("valid session round trip preserves parameters and corrections", () => {
  const s=createSession(); s.models.green.weights[0]=1.25; s.edits.t001={green:false};
  const loaded=decodeSession(encodeSession(s));
  assert.equal(loaded.warning,""); assert.deepEqual(loaded.state,s);
});
test("corrupt and future-schema saves report limitation and preserve a usable fresh session", () => {
  for(const raw of ["{bad",JSON.stringify({...createSession(),schema:99}),JSON.stringify({...createSession(),stage:7})]) {
    const loaded=decodeSession(raw); assert.ok(loaded.warning); assert.equal(loaded.state.stage,1);
  }
});
test("invalid parameter and undo snapshots are rejected before inference", () => {
  const s=createSession(); s.models.green.weights[0]=Infinity;
  assert.ok(decodeSession(JSON.stringify(s)).warning);
  const bad=createSession(); (bad as unknown as {receipts:unknown[]}).receipts=[{before:{},updates:[]}];
  assert.ok(decodeSession(JSON.stringify(bad)).warning);
});
test("older saves without the new desk fields load with safe defaults", () => {
  const s=createSession() as unknown as Record<string,unknown>;
  for(const key of ["glossary","intros","guesses","alwaysGuess"])delete s[key];
  const loaded=decodeSession(JSON.stringify(s));
  assert.equal(loaded.warning,"");
  assert.deepEqual(loaded.state.glossary,[]);assert.deepEqual(loaded.state.intros,[]);
  assert.deepEqual(loaded.state.guesses,{right:0,total:0});assert.equal(loaded.state.alwaysGuess,false);
});
test("malformed new fields are rejected instead of trusted", () => {
  const s=createSession();(s as unknown as {guesses:unknown}).guesses={right:5,total:2};
  assert.ok(decodeSession(JSON.stringify(s)).warning);
});
