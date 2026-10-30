import { SAVE_KEY, GUESS_KEY, decodeState, type SaveState } from "./state.ts";
import type {ChapterStoragePort,PersonalArtifact} from "../../../shared/linkage/platform-client.d.ts";

export type StoragePort=Pick<Storage,"getItem"|"setItem">&Partial<Pick<ChapterStoragePort,"flush"|"saveArtifact">>;
export interface DevicePreferences{muted:boolean;reducedMotion:boolean;}
export const DEVICE_KEY="nova-tides-device-v1";
export type PlatformHost=Pick<Window,"NovaPlatformReady">;
export function validateRecord(key:string,raw:string){
  if(key===SAVE_KEY)return !decodeState(raw).warning;
  if(key!==GUESS_KEY)return false;
  try{const list=JSON.parse(raw);return Array.isArray(list)&&list.every(g=>g&&typeof g==="object"&&Number.isFinite(g.guess)&&Number.isFinite(g.seen));}catch{return false;}
}
export async function openRepository(host:PlatformHost=window as unknown as PlatformHost){
  const platform=await host.NovaPlatformReady;
  if(!platform)return new SaveRepository();
  await platform.ready;
  const port=await platform.openChapter({chapter:8,keys:[SAVE_KEY,GUESS_KEY],validate:validateRecord});
  return new SaveRepository(port);
}
export function encodeProgress(state:SaveState){
  const clean={...state};delete clean.largeText;delete clean.reducedMotion;
  if(clean.workspace){clean.workspace={...clean.workspace};delete clean.workspace.muted;}
  return JSON.stringify(clean);
}
/** 本章唯一存档读写入口；平台同步接入复用原 JSON，不另建 UI 进度。 */
export class SaveRepository {
  rejectedRaw?:string;
  constructor(privateStorage?:StoragePort,deviceStorage?:StoragePort){this.storage=privateStorage;this.deviceStorage=deviceStorage;}
  private storage?:StoragePort;
  private deviceStorage?:StoragePort;
  private port(){return this.storage??globalThis.localStorage;}
  read(){
    let raw:string|null=null;try{raw=this.port().getItem(SAVE_KEY);}catch{/* 存储不可读时可体验并手动导出。 */}
    const result=decodeState(raw);this.rejectedRaw=result.rejectedRaw;return result;
  }
  write(state:SaveState){if(this.rejectedRaw!==undefined)return false;this.port().setItem(SAVE_KEY,encodeProgress(state));return true;}
  preferences():DevicePreferences{
    try{const raw=(this.deviceStorage??globalThis.localStorage).getItem(DEVICE_KEY),p=raw?JSON.parse(raw):{};return {muted:p.muted===true,reducedMotion:p.reducedMotion===true};}catch{return {muted:false,reducedMotion:false};}
  }
  savePreferences(p:DevicePreferences){(this.deviceStorage??globalThis.localStorage).setItem(DEVICE_KEY,JSON.stringify(p));}
  artifact(value:PersonalArtifact){this.storage?.saveArtifact?.(value);}
  accept(raw:string){const result=decodeState(raw);if(result.warning)throw new Error(result.warning);this.rejectedRaw=undefined;return result.state;}
  reset(){this.rejectedRaw=undefined;}
}
