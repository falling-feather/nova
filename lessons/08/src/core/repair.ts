import {toBytes} from "./diffusion.ts";
import {restoreScore} from "./metrics.ts";
import {bytesToBase64} from "../state.ts";

export interface RepairRecord{
  sourceImage:string;manualImage:string;modelImage:string;
  mine:number;master:number;modelVersion:string;computedAt:number;
}
/** 比较结果是当时三个材料的快照；后续画刷只改 manualDraft。 */
export function repairRecord(source:Float32Array,manual:Float32Array,model:Float32Array,version:string):RepairRecord{
  return {sourceImage:bytesToBase64(toBytes(source)),manualImage:bytesToBase64(toBytes(manual)),modelImage:bytesToBase64(toBytes(model)),mine:restoreScore(manual,source),master:restoreScore(model,source),modelVersion:version,computedAt:Date.now()};
}
