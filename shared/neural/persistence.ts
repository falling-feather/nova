import {newSession,validateSession,hasSavedWork} from './session.ts';
import type {Session} from './session.ts';
import {seaIds} from './data.ts';
import type {ChapterStoragePort} from '../linkage/platform-client.js';

export type StoragePort = Pick<Storage,'getItem'|'setItem'> & Partial<Pick<ChapterStoragePort,'flush'|'saveArtifact'>>;
export type LoadResult = {state:Session;active:boolean;blocked:boolean;raw:string;error?:string};
export type SaveResult = {ok:boolean;queued?:boolean;error?:string};
export function progressDetail(s:Session) {
  const entries=seaIds.flatMap(id=>s.workspaces[id].records);
  return {chapter:s.chapter,completed:new Set(entries.map(r=>r.unit)).size,total:5,pathLabel:s.chapter===6?'五海域探索':'五工位实验',artifactCount:entries.length+seaIds.filter(id=>s.workspaces[id].final).length};
}
// Only this module accesses browser storage. BE can supply a StoragePort here.
export class SessionStore {
  readonly key:string;
  private chapter:6|11;
  private storage:StoragePort;
  private blocked=false;
  private raw='';
  constructor(chapter:6|11,storage:StoragePort) {this.chapter=chapter;this.storage=storage;this.key=`nova-neural-ch${chapter}-v1`;}
  load():LoadResult {
    try {
      this.raw=this.storage.getItem(this.key)??'';
      const state=this.raw?JSON.parse(this.raw):newSession(this.chapter);
      validateSession(state);if(state.chapter!==this.chapter)throw new Error('章节不一致');
      this.blocked=false;this.raw='';return {state,active:hasSavedWork(state),blocked:false,raw:''};
    } catch(e) {
      this.blocked=true;return {state:newSession(this.chapter),active:false,blocked:true,raw:this.raw,error:e instanceof Error?e.message:String(e)};
    }
  }
  save(state:Session):SaveResult {
    if(this.blocked)return {ok:false,error:'原存档尚未读取，请先导出原记录或明确新建项目。'};
    try {this.storage.setItem(this.key,JSON.stringify(state));return {ok:true,queued:!!this.storage.flush};}
    catch(e) {return {ok:false,error:e instanceof Error?e.message:String(e)};}
  }
  allowReplacement():void {this.blocked=false;this.raw='';}
  async flush():Promise<void> {const status=await this.storage.flush?.();if(status?.storageError||status?.fenced)throw new Error(status.storageError||status.message);}
  async saveArtifact(state:Session,data:string):Promise<void> {this.storage.saveArtifact?.({id:`nova-neural-${state.chapter}-${state.createdAt}`,title:state.projectTitle.trim()||'我的网络作品',mimeType:'application/json',data});}
}
export function browserStorage():StoragePort {
  // Accessing localStorage itself can throw, before getItem is reached.
  return {getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
}
export async function chapterStorage(chapter:6|11):Promise<StoragePort> {
  const platform=await window.NovaPlatformReady;
  if(!platform)return browserStorage();
  await platform.ready;
  return platform.openChapter({chapter,keys:[`nova-neural-ch${chapter}-v1`],validate:(_key,raw)=>{try {const state=JSON.parse(raw);validateSession(state);return state.chapter===chapter;}catch{return false;}}});
}
export function deviceSound(chapter:6|11,muted?:boolean):boolean {
  const key=`nova-neural-device-ch${chapter}-sound`;
  try {if(muted!==undefined)window.localStorage.setItem(key,muted?'muted':'on');return window.localStorage.getItem(key)==='muted';}catch{return muted??true;}
}
