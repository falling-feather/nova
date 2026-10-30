import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession, capture} from '../session.ts';
import {SessionStore, progressDetail,chapterStorage} from '../persistence.ts';
const memory=()=>{const data=new Map<string,string>();return {data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};};
test('old sessions restore exactly; fresh views do not create a learning record',()=>{
  const storage=memory(),s=newSession(6);storage.setItem('nova-neural-ch6-v1',JSON.stringify(s));
  const store=new SessionStore(6,storage);assert.deepEqual(store.load().state,s);
  assert.equal(progressDetail(s).completed,0);
  assert.equal(store.load().active,false);
});
test('bad source is preserved until explicit replacement; save failures retain memory data',()=>{
  const storage=memory();storage.setItem('nova-neural-ch6-v1','bad-original');
  const store=new SessionStore(6,storage),result=store.load();
  assert.ok(result.blocked);assert.equal(result.raw,'bad-original');
  assert.equal(store.save(result.state).ok,false);assert.equal(storage.getItem(store.key),'bad-original');
  store.allowReplacement();assert.equal(store.save(newSession(6)).ok,true);
  const denied=new SessionStore(11,{getItem:()=>null,setItem:()=>{throw new Error('quota');}});
  denied.load();const draft=newSession(11);draft.hypothesis='仍在内存';
  assert.equal(denied.save(draft).ok,false);assert.equal(draft.hypothesis,'仍在内存');
});
test('presentation preferences are optional and never count as evidence',()=>{
  const s=newSession(11);s.presentation={guideSeen:[0]};
  const storage=memory(),store=new SessionStore(11,storage);store.load();store.save(s);
  assert.deepEqual(store.load().state.presentation,s.presentation);
  assert.equal(progressDetail(s).completed,0);
  const w=s.workspaces.egret,a=capture(w,'A',0);w.probe=[.6,.2];
  w.records.push({id:'e',unit:0,title:'真实输入对照',prediction:'预测',explanation:'解释',snapshots:[a,capture(w,'B',0)],createdAt:new Date().toISOString()});
  assert.equal(progressDetail(s).completed,1);
});
test('chapter storage waits for account readiness before opening or reading; preferences are excluded',async()=>{
  const globals=globalThis as unknown as {window?:unknown},original=globals.window,account=memory();
  const state=newSession(6);state.hypothesis='账号中的草稿';account.setItem('nova-neural-ch6-v1',JSON.stringify(state));
  let ready!:()=>void,opened=false,guestRead=false;
  globals.window={NovaPlatformReady:Promise.resolve({ready:new Promise<void>(resolve=>ready=resolve),openChapter:async(options:{keys:string[];validate:(key:string,raw:string)=>boolean})=>{
    opened=true;assert.deepEqual(options.keys,['nova-neural-ch6-v1']);assert.ok(options.validate(options.keys[0],JSON.stringify(state)));return account;
  }}),localStorage:{getItem:()=>{guestRead=true;return null;}}};
  try {const pending=chapterStorage(6);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(opened,false);ready();const store=new SessionStore(6,await pending);assert.equal(store.load().state.hypothesis,'账号中的草稿');assert.equal(guestRead,false);}
  finally {globals.window=original;}
});
test('a loaded platform failure does not fall back to a visitor record',async()=>{
  const globals=globalThis as unknown as {window?:unknown},original=globals.window;let guestRead=false;
  globals.window={NovaPlatformReady:Promise.resolve({ready:Promise.resolve(),openChapter:async()=>{throw new Error('account unavailable');}}),localStorage:{getItem:()=>{guestRead=true;return null;}}};
  try {await assert.rejects(chapterStorage(11),/account unavailable/);assert.equal(guestRead,false);}finally{globals.window=original;}
});
test('standalone absence uses visitor storage and keeps the original validator',async()=>{
  const globals=globalThis as unknown as {window?:unknown},original=globals.window,guest=memory();guest.setItem('nova-neural-ch11-v1','damaged visitor source');globals.window={localStorage:guest};
  try {const store=new SessionStore(11,await chapterStorage(11));assert.ok(store.load().blocked);assert.equal(guest.getItem(store.key),'damaged visitor source');}finally{globals.window=original;}
});
