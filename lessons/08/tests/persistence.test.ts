import test from "node:test";
import assert from "node:assert/strict";
import {openRepository, SaveRepository, DEVICE_KEY, type PlatformHost, type StoragePort} from "../src/persistence.ts";
import {SAVE_KEY, GUESS_KEY, freshState} from "../src/state.ts";
import type {NovaPlatformClient} from "../../../shared/linkage/platform-client.d.ts";

const storage=()=>{const m=new Map<string,string>();return {map:m,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);}};};
test("平台握手及章端口打开后才读取学习记录，keys和原校验保持唯一",async()=>{
  const calls:string[]=[],port:StoragePort={getItem:()=>{calls.push("read");return null;},setItem:()=>{}};
  const client={ready:Promise.resolve(),openChapter:async(o:Parameters<NovaPlatformClient["openChapter"]>[0])=>{assert.equal(o.chapter,8);assert.deepEqual(o.keys,[SAVE_KEY,GUESS_KEY]);assert.equal(o.validate!(SAVE_KEY,JSON.stringify(freshState())),true);assert.equal(o.validate!(SAVE_KEY,"bad"),false);assert.equal(o.validate!(GUESS_KEY,JSON.stringify([{guess:600,seen:530,at:1}])),true);calls.push("open");return port;}} as unknown as NovaPlatformClient;
  let release!:()=>void;const host:PlatformHost={NovaPlatformReady:new Promise<NovaPlatformClient>(r=>{release=()=>r(client);})};
  const pending=openRepository(host);await Promise.resolve();assert.deepEqual(calls,[]);
  release();const repo=await pending;repo.read();assert.deepEqual(calls,["open","read"]);
});
test("登录端口失败不偷读游客记录，平台缺席返回独立游客仓库",async()=>{
  const client={ready:Promise.resolve(),openChapter:async()=>{throw new Error("account unavailable");}} as unknown as NovaPlatformClient;
  await assert.rejects(openRepository({NovaPlatformReady:Promise.resolve(client)}),/account unavailable/);
  assert.ok(await openRepository({}) instanceof SaveRepository);
  assert.ok(await openRepository({NovaPlatformReady:Promise.resolve(null)}) instanceof SaveRepository);
});
test("设备声音与动态偏好不进入学习快照；损坏原文不被空项目覆盖",()=>{
  const learn=storage(),device=storage(),repo=new SaveRepository(learn,device),s=freshState();
  s.reducedMotion=true;s.workspace={recipe:{seed:23,steps:20,w:3,cls:0},tide:0,muted:true};
  repo.savePreferences({muted:true,reducedMotion:true});repo.write(s);
  const raw=JSON.parse(learn.map.get(SAVE_KEY)!);assert.equal(raw.reducedMotion,undefined);assert.equal(raw.workspace.muted,undefined);assert.ok(device.map.has(DEVICE_KEY));
  assert.deepEqual(repo.preferences(),{muted:true,reducedMotion:true});
  learn.setItem(SAVE_KEY,"bad");repo.read();assert.equal(repo.write(freshState()),false);assert.equal(learn.map.get(SAVE_KEY),"bad");
});
