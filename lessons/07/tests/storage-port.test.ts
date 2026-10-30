import { test } from "node:test";
import assert from "node:assert/strict";
import { openProgressPort } from "../src/core/storage.ts";
import { SAVE_KEY, encode, newProgress } from "../src/core/state.ts";
import type { NovaPlatformClient } from "../../../shared/linkage/platform-client.d.ts";

test("platform initialization finishes before any chapter read and preserves the one save key", async () => {
  const calls: string[]=[];
  const port={getItem(_key:string){calls.push("read");return null;},setItem(){},removeItem(){}};
  type Options=Parameters<NovaPlatformClient["openChapter"]>[0];
  let client:{ready:Promise<unknown>;openChapter:(options:Options)=>Promise<typeof port>};
  const boot=Promise.resolve().then(()=>{calls.push("bootstrap");return client;});
  client={ready:Promise.resolve().then(()=>{calls.push("account");}),async openChapter(options:Options){calls.push("open");assert.equal(options.chapter,7);assert.deepEqual(options.keys,[SAVE_KEY]);assert.ok(options.validate);assert.equal(options.validate(SAVE_KEY,encode(newProgress())),true);assert.equal(options.validate(SAVE_KEY,"{"),false);return port;}};
  const root={NovaPlatformReady:boot,get localStorage():typeof port{throw Error("guest store must not be read for a signed-in port");}};
  const selected=await openProgressPort(root);
  assert.equal(selected,port); selected!.getItem(SAVE_KEY);
  assert.deepEqual(calls,["bootstrap","account","open","read"]);
});
test("an absent platform allows guest learning; a failed available platform does not mix guest data",async()=>{
  const guest={getItem(){return "guest";},setItem(){},removeItem(){}};
  assert.equal(await openProgressPort({localStorage:guest}),guest);
  await assert.rejects(openProgressPort({NovaPlatformReady:Promise.reject(Error("account initialization failed")),localStorage:guest}),/account initialization failed/);
});
