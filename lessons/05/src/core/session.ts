import { newModel, predict, learn } from "./model.ts";
import { RATES, type AnalyzedPhoto, type Attribute, type Labels, type Models, type RateName } from "./types.ts";
import type { LearningUpdate } from "./model.ts";
export type Receipt = { id: number; photoId: string; photoName: string; rate: number; targets: Partial<Labels>; updates: (LearningUpdate & { attribute: Attribute })[]; before: Models; reviewed: boolean };
export type InspectionRow = { id: string; probability: number; predicted: boolean; actual: boolean; excluded: boolean };
export type Inspection = { stage: number; attribute: Attribute; box: number; eligible: number; correct: number; rows: InspectionRow[]; modelStep: number; modelKey?:string };
export type WallEntry = { attribute: Attribute | "reserve"; by: "student" | "model"; probability: number };
export type Session = {
  schema: 1; experiment:number; stage: number; unlocked: number; active: Attribute; selectedId: string; mode: "train" | "test" | "exhibit"; rate: RateName;
  models: Models; edits: Record<string, Partial<Labels>>; reviewedIds: string[]; learnedIds: string[]; contaminatedIds: string[];
  receipts: Receipt[]; sequence: number; inspections: Inspection[]; boxIndex: Record<string, number>;
  filtersSeen: string[]; flowerDelivery: boolean; locked: boolean; wall: Record<string, WallEntry>; wallVersion:string; completed: number[]; note: string; observations:Record<string,string>; ratesTried:RateName[];
  glossary:string[]; intros:number[]; guesses:{right:number;total:number}; alwaysGuess:boolean; learnedFor:Record<Attribute,string[]>;
  education:{seen:string[];last:string};
};
export function createSession(): Session { return {schema:1,experiment:1,stage:1,unlocked:1,active:"green",selectedId:"t001",mode:"train",rate:"medium",models:{flower:newModel(),green:newModel(),quality:newModel()},edits:{},reviewedIds:[],learnedIds:[],contaminatedIds:[],receipts:[],sequence:0,inspections:[],boxIndex:{},filtersSeen:[],flowerDelivery:false,locked:false,wall:{},wallVersion:"",completed:[],note:"",observations:{},ratesTried:[],glossary:[],intros:[],guesses:{right:0,total:0},alwaysGuess:false,learnedFor:{flower:[],green:[],quality:[]},education:{seen:[],last:""}}; }
export function editLabel(s: Session,id: string,attribute: Attribute,value: boolean) { s.edits[id] ??= {}; s.edits[id][attribute] = value; }
export function labelOf(s:Session,photo:AnalyzedPhoto,attribute:Attribute) { return s.edits[photo.id]?.[attribute] ?? photo.submitted[attribute]; }
export function reviewPhoto(s:Session,id:string) { if(!s.reviewedIds.includes(id))s.reviewedIds.push(id); }
export function selectPhoto(s: Session,id:string,mode:Session["mode"]) { s.selectedId=id; s.mode=mode; }
export function setRate(s:Session,rate:RateName) {s.rate=rate;}
export function availableBatches(s:Session) {
  if (s.stage <= 2) return [1];
  if (s.stage === 3) return s.flowerDelivery ? [2, 3] : [2];
  return [1, 2, 3, 4];
}
export function inspectPhoto(s:Session,photo:AnalyzedPhoto) {return predict(s.models[s.active],photo.features);}
export function teachPhoto(s:Session,photo:AnalyzedPhoto,attributes:Attribute[]):Receipt {
  if (s.locked || s.stage === 5) throw new Error("学徒已经封存：布展时只判断，不再学习");
  if (s.mode === "test") throw new Error("检验照片只用来判断；先把它转进训练再学");
  if (!attributes.length || new Set(attributes).size !== attributes.length) throw new Error("先选好要学的判断");
  const before = structuredClone(s.models), targets:Partial<Labels>={}, updates:Receipt["updates"]=[];
  for (const attribute of attributes) {
    const target=labelOf(s,photo,attribute); targets[attribute]=target;
    const update=learn(s.models[attribute],photo.features,target,RATES[s.rate]);
    updates.push({...update,attribute}); s.models[attribute]=update.after;
    if(!s.learnedFor[attribute].includes(photo.id))s.learnedFor[attribute].push(photo.id);
  }
  const receipt:Receipt={id:++s.sequence,photoId:photo.id,photoName:photo.name,rate:RATES[s.rate],targets,updates,before,reviewed:s.reviewedIds.includes(photo.id)};
  s.receipts.push(receipt); if(s.receipts.length>80)s.receipts.shift();
  if(!s.ratesTried.includes(s.rate))s.ratesTried.push(s.rate);
  if (!s.learnedIds.includes(photo.id)) s.learnedIds.push(photo.id);
  if (photo.role === "test" && !s.contaminatedIds.includes(photo.id)) {
    s.contaminatedIds.push(photo.id);
    for(const run of s.inspections) {
      for(const row of run.rows) if(row.id===photo.id) row.excluded=true;
      run.eligible=run.rows.filter(r=>!r.excluded).length;
      run.correct=run.rows.filter(r=>!r.excluded&&r.predicted===r.actual).length;
    }
  }
  return receipt;
}
export function undoLearning(s:Session) {
  if(s.locked)throw new Error("学徒已经封存，回到前面的关卡才能撤销学习");
  const receipt=s.receipts.pop(); if(!receipt)return false;
  s.models=structuredClone(receipt.before); return true;
}
export function runInspection(s:Session,photos:AnalyzedPhoto[],attribute:Attribute,box=0):Inspection {
  const rows=photos.map(photo=>{
    const probability=predict(s.models[attribute],photo.features);
    return {id:photo.id,probability,predicted:probability>=0.5,actual:photo.truth[attribute],excluded:s.contaminatedIds.includes(photo.id)};
  });
  const run:Inspection={stage:s.stage,attribute,box,eligible:rows.filter(r=>!r.excluded).length,correct:rows.filter(r=>!r.excluded&&r.predicted===r.actual).length,rows,modelStep:s.models[attribute].steps,modelKey:JSON.stringify(s.models[attribute])};
  s.inspections.push(run); if(s.inspections.length>60)s.inspections.shift();
  if(s.stage===3&&attribute==="flower")s.flowerDelivery=true;
  return run;
}
export function lockModels(s:Session){s.locked=true;}
export function placeExhibit(s:Session,photo:AnalyzedPhoto,attribute:Attribute|"reserve",manual:boolean):WallEntry {
  if(!s.locked||s.stage!==5)throw new Error("请定版封存后再布展");
  const probability=attribute==="reserve"?0.5:predict(s.models[attribute],photo.features);
  if(!manual&&probability>=0.35&&probability<=0.65)throw new Error("这张照片需要策展人复核");
  const entry:WallEntry={attribute,by:manual?"student":"model",probability};
  s.wall[photo.id]=entry; return entry;
}
export function unlockTerm(s:Session,id:string) { if(s.glossary.includes(id))return false; s.glossary.push(id); return true; }
export function switchStage(s:Session,stage:number) {
  if(!Number.isInteger(stage)||stage<1||stage>Math.min(5,s.unlocked))throw new Error("先完成前面的影展任务");
  s.stage=stage; s.active=stage===1?"green":stage===2?"quality":"flower"; s.mode=stage===5?"exhibit":"train";
  if(stage===5)lockModels(s); else s.locked=false;
}
