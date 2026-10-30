import { createSession, type Session } from "./session.ts";
import { ATTRIBUTES, RATES } from "./types.ts";
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const SAVE_KEY="nova-light-apprentice-v1";
export const PREVIOUS_EXPERIMENT_KEY="nova-light-apprentice-previous-experiment";
export function encodeSession(s:Session) {return JSON.stringify(s);}
const object=(v:unknown):v is Record<string,unknown> => !!v&&typeof v==="object"&&!Array.isArray(v);
const finite=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<1e6;
const ids=(v:unknown)=>Array.isArray(v)&&v.length<10000&&v.every(x=>typeof x==="string"&&/^(t\d{3}|v[1-5][ab]\d{2}|e\d{3})$/.test(x));
function validModels(v:unknown) {
  return object(v)&&ATTRIBUTES.every(a=>{const m=v[a];return object(m)&&Array.isArray(m.weights)&&m.weights.length===6&&m.weights.every(finite)&&finite(m.bias)&&Number.isInteger(m.steps)&&Number(m.steps)>=0;});
}
function valid(s:unknown):s is Session {
  if(!object(s)||s.schema!==1||!Number.isSafeInteger(s.experiment)||Number(s.experiment)<1||!Number.isInteger(s.stage)||Number(s.stage)<1||Number(s.stage)>5||!Number.isInteger(s.unlocked)||Number(s.unlocked)<Number(s.stage)||Number(s.unlocked)>5)return false;
  if(!ATTRIBUTES.includes(s.active as typeof ATTRIBUTES[number])||!["train","test","exhibit"].includes(String(s.mode))||!Object.hasOwn(RATES,String(s.rate))||!validModels(s.models))return false;
  if(typeof s.selectedId!=="string"||!ids([s.selectedId])||!ids(s.reviewedIds)||!ids(s.learnedIds)||!ids(s.contaminatedIds))return false;
  if(!object(s.edits)||!Object.entries(s.edits).every(([id,labels])=>ids([id])&&object(labels)&&Object.entries(labels).every(([a,v])=>ATTRIBUTES.includes(a as typeof ATTRIBUTES[number])&&typeof v==="boolean")))return false;
  if(!Array.isArray(s.receipts)||s.receipts.length>80||!s.receipts.every(r=>object(r)&&validModels(r.before)&&ids([r.photoId])&&typeof r.photoName==="string"&&Number.isInteger(r.id)&&finite(r.rate)&&object(r.targets)&&typeof r.reviewed==="boolean"&&Array.isArray(r.updates)&&r.updates.length>0&&r.updates.length<=3&&r.updates.every(u=>object(u)&&ATTRIBUTES.includes(u.attribute as typeof ATTRIBUTES[number])&&object(u.before)&&object(u.after)&&validModels({flower:u.before,green:u.before,quality:u.before})&&validModels({flower:u.after,green:u.after,quality:u.after})&&finite(u.beforeProbability)&&finite(u.afterProbability)&&Array.isArray(u.delta)&&u.delta.length===6&&u.delta.every(finite)&&finite(u.biasDelta))))return false;
  if(!Array.isArray(s.inspections)||s.inspections.length>60||!s.inspections.every(r=>object(r)&&ATTRIBUTES.includes(r.attribute as typeof ATTRIBUTES[number])&&Number.isInteger(r.stage)&&Number.isInteger(r.box)&&Number.isInteger(r.eligible)&&Number.isInteger(r.correct)&&Number.isInteger(r.modelStep)&&Array.isArray(r.rows)&&r.rows.every(row=>object(row)&&ids([row.id])&&finite(row.probability)&&typeof row.predicted==="boolean"&&typeof row.actual==="boolean"&&typeof row.excluded==="boolean")))return false;
  return Number.isInteger(s.sequence)&&object(s.boxIndex)&&Object.values(s.boxIndex).every(v=>v===0||v===1)&&Array.isArray(s.filtersSeen)&&s.filtersSeen.every(v=>typeof v==="string")&&Array.isArray(s.ratesTried)&&s.ratesTried.every(r=>Object.hasOwn(RATES,String(r)))&&typeof s.flowerDelivery==="boolean"&&typeof s.locked==="boolean"&&typeof s.wallVersion==="string"&&s.wallVersion.length<4000&&object(s.wall)&&Object.entries(s.wall).every(([id,e])=>ids([id])&&object(e)&&[...ATTRIBUTES,"reserve"].includes(String(e.attribute))&&["student","model"].includes(String(e.by))&&finite(e.probability))&&Array.isArray(s.completed)&&s.completed.every(v=>Number.isInteger(v)&&v>=1&&v<=5)&&typeof s.note==="string"&&s.note.length<4000&&object(s.observations)&&Object.entries(s.observations).every(([k,v])=>/^[1-5]$/.test(k)&&typeof v==="string"&&v.length<4000);
}
function withExtras(s:Session):Session|null {
  const x=s as Partial<Session>,fresh=createSession();
  const glossary=x.glossary??fresh.glossary,intros=x.intros??fresh.intros,guesses=x.guesses??fresh.guesses,alwaysGuess=x.alwaysGuess??fresh.alwaysGuess,learnedFor=x.learnedFor??fresh.learnedFor;
  const education=x.education??fresh.education;
  if(!object(education)||!Array.isArray(education.seen)||education.seen.length>80||!education.seen.every(v=>typeof v==="string"&&/^[1-5]:[a-z-]+$/.test(v))||typeof education.last!=="string"||education.last.length>40)return null;
  if(!object(learnedFor)||!ATTRIBUTES.every(a=>ids(learnedFor[a])))return null;
  if(!Array.isArray(glossary)||glossary.length>40||!glossary.every(v=>typeof v==="string"&&v.length<40))return null;
  if(!Array.isArray(intros)||!intros.every(v=>Number.isInteger(v)&&v>=1&&v<=6))return null;
  if(!object(guesses)||!Number.isInteger(guesses.right)||!Number.isInteger(guesses.total)||guesses.right<0||guesses.right>guesses.total||guesses.total>1e6)return null;
  if(typeof alwaysGuess!=="boolean")return null;
  return {...s,glossary,intros,guesses,alwaysGuess,learnedFor,education};
}
export function decodeSession(raw:string|null):{state:Session;warning:string} {
  if(!raw)return {state:createSession(),warning:""};
  try {if(raw.length>512000)throw new Error("存档过大");const s:unknown=JSON.parse(raw);if(!valid(s))throw new Error("存档结构无效");const state=withExtras(s);if(!state)throw new Error("存档结构无效");return {state,warning:""};}
  catch {return {state:createSession(),warning:"上次的记录读不出来，这里换了一张新的工作台。"};}
}
