// 本章的存档：原画、实验记录、配方与回访预览。复现核对和展演始终重新计算。

import { validRecipe, type Recipe } from "./core/recipe.ts";
import { validExperiments } from "./core/experiment.ts";

export const SAVE_KEY = "nova-tides-course-v1";
export const GUESS_KEY = "nova-tides-course-guesses";

export interface Work {
  id: string;
  recipe: Recipe;
  /** 在哪个环节画出来的 */
  step: number;
  created: number;
  title?: string;
  /** 仅供回访显示的8位预览；复现核对始终重新运行浮点模型。 */
  preview?: string;
  /** 第一次有据可查的实际计算；回访的字节预览不冒充本次运行。 */
  generation?: { model:string; ms:number; computedAt:number };
}

export interface SaveState {
  version: 1;
  current: number;
  done: number[];
  /** 自由探索中已验证但尚未与 done 连成前缀的环节。 */
  verified?: number[];
  workspace?: {recipe:Recipe;tide:number;muted?:boolean;introSeen?:boolean};
  /** 学生的沙画，32×32 字节的 base64 */
  drawing: string | null;
  drawingFrom: "hand" | "booth" | null;
  /** 冲刷学生这幅画的那阵潮水（噪声种子） */
  tideSeed: number;
  album: Work[];
  program: string[];
  /** 每个环节自己的记录 */
  evidence: Record<string, Record<string, unknown>>;
  /** 每站自己的观察，可在学习手册中补写；旧存档无需迁移。 */
  reflections?: Record<string, string>;
  welcomed?: boolean;
  reducedMotion?: boolean;
  largeText?: boolean;
  programTitle?: string;
  creditText?: string;
}

export function freshState(): SaveState {
  return { version: 1, current: 1, done: [], drawing: null, drawingFrom: null, tideSeed: 2026, album: [], program: [], evidence: {} };
}

export function decodeState(raw: string | null): { state: SaveState; warning?: string; rejectedRaw?: string } {
  if (!raw) return { state: freshState() };
  try {
    const s = JSON.parse(raw) as SaveState;
    const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
    const integer = (n: unknown, min: number, max: number) => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
    const image = (v:unknown) => typeof v === "string" && base64ToBytes(v).length === 1024;
    const finite = (v:unknown) => typeof v === "number" && Number.isFinite(v);
    const recipe = validRecipe;
    const evidence = (v: unknown,step:number) => {
      if (!record(v)) return false;
      const arrays: Record<string, "number" | "string"> = { pages: "number", seeds: "number", tried: "number", pair: "number", solved: "number", tries: "number", labeled: "string", picks: "string", viewed:"string" };
      for (const [key, value] of Object.entries(v)) {
        if (arrays[key] && (!Array.isArray(value) || value.some(x => typeof x !== arrays[key] || (typeof x === "number" && (!Number.isSafeInteger(x) || x < 0))))) return false;
        if (["guess", "seen", "pick", "mine", "master", "before", "page", "i", "seed", "cls", "error", "observation"].includes(key) && !finite(value)) return false;
        if (["logged", "brushed", "same", "compared", "reproduced", "swept", "a", "b", "checked", "credited", "sourceReviewed", "watched", "locked", "explained", "scrubbed", "mixed"].includes(key) && typeof value !== "boolean") return false;
        if (["code", "reason", "checkedWork", "showProgram", "watchedProgram"].includes(key) && typeof value !== "string") return false;
        if (["manualImage", "modelImage","sourceImage","draftSource","manualDraft"].includes(key) && !image(value)) return false;
        const bounds:Record<string,[number,number]>={index:[0,5],frame:[0,49],frameIndex:[0,49],k:[0,1000],max:[0,1000],cell:[-1,1023],observation:[0,2]};
        if(bounds[key]&&!integer(value,...bounds[key]))return false;
        if(key==="timings"&&(!Array.isArray(value)||value.some(t=>!record(t)||!integer(t.steps,1,50)||!integer(t.seed,1,9999)||!finite(t.ms)||Number(t.ms)<0)))return false;
        if(key==="fileInfo"&&(!record(value)||Object.values(value).some(x=>typeof x!=="string")))return false;
        if(key==="experiments"&&!validExperiments(value,s.album,step))return false;
        if(["rejectedWork","rejectionReason"].includes(key)&&typeof value!=="string")return false;
        if(key==="attempts"&&(!Array.isArray(value)||value.some(x=>!record(x)||!integer(x.target,0,2)||!recipe(x.recipe as Recipe)||!finite(x.similarity)||typeof x.same!=="boolean"||!image(x.preview))))return false;
        if (key === "answered" && (!record(value) || Object.values(value).some(x => typeof x !== "string"))) return false;
        if (key === "scores" && (!record(value) || Object.values(value).some(x => !record(x) || typeof x.mine !== "number" || typeof x.master !== "number" || !Number.isFinite(x.mine) || !Number.isFinite(x.master)))) return false;
      }
      if (v.pair !== undefined && (!(v.pair as number[]).length || (v.pair as number[]).length !== 2 || (v.pair as number[]).some(x => !integer(x, 0, 11)))) return false;
      if (v.tried !== undefined && (v.tried as number[]).some(x => !integer(x, 0, 11))) return false;
      if (v.cls !== undefined && !integer(v.cls, -1, 11)) return false;
      if(v.rejectedWork!==undefined&&!s.album.some(w=>w.id===v.rejectedWork))return false;
      return true;
    };
    if (!record(s) || s.version !== 1 || !integer(s.current, 1, 25) || !Array.isArray(s.done) ||
      s.done.some((n, i) => n !== i + 1) || s.done.length > 25 ||
      (s.verified!==undefined&&(!Array.isArray(s.verified)||new Set(s.verified).size!==s.verified.length||s.verified.some(n=>!integer(n,1,25)||s.done.includes(n))))||
      (s.workspace!==undefined&&(!record(s.workspace)||!recipe(s.workspace.recipe)||!integer(s.workspace.tide,0,1000)||[s.workspace.muted,s.workspace.introSeen].some(v=>v!==undefined&&typeof v!=="boolean")))||!integer(s.tideSeed, 1, 9999) ||
      ![null, "hand", "booth"].includes(s.drawingFrom) ||
      (s.drawing !== null && (typeof s.drawing !== "string" || base64ToBytes(s.drawing).length !== 1024)) ||
      !Array.isArray(s.album) || !s.album.every(w => record(w) && typeof w.id === "string" && w.id.length > 0 && recipe(w.recipe) && integer(w.step, 1, 25) && Number.isFinite(w.created) && (w.title === undefined || typeof w.title === "string") && (w.preview === undefined || (typeof w.preview === "string" && base64ToBytes(w.preview).length === 1024)) && (w.generation===undefined||(record(w.generation)&&typeof w.generation.model==="string"&&!!w.generation.model&&finite(w.generation.ms)&&w.generation.ms>=0&&finite(w.generation.computedAt)&&w.generation.computedAt>=0))) ||
      new Set(s.album.map(w => w.id)).size !== s.album.length || !Array.isArray(s.program) || s.program.length > 6 || new Set(s.program).size !== s.program.length ||
      !s.program.every(id => s.album.some(w => w.id === id)) ||
      (s.evidence !== undefined && (!record(s.evidence) || Object.entries(s.evidence).some(([k, v]) => !integer(Number(k), 1, 25) || !evidence(v,Number(k))))) ||
      (s.reflections !== undefined && (!record(s.reflections) || Object.values(s.reflections).some(v => typeof v !== "string"))) ||
      [s.welcomed, s.reducedMotion, s.largeText].some(v => v !== undefined && typeof v !== "boolean") ||
      (s.programTitle !== undefined && (typeof s.programTitle !== "string" || s.programTitle.length > 60)) ||
      (s.creditText !== undefined && (typeof s.creditText !== "string" || s.creditText.length > 500))) throw new Error("格式不对");
    const state = { ...freshState() };
    for (const key of ["current", "done", "verified", "workspace", "drawing", "drawingFrom", "tideSeed", "album", "program", "evidence", "reflections", "welcomed", "reducedMotion", "largeText", "programTitle", "creditText"] as const) {
      if (s[key] !== undefined) Object.assign(state, { [key]: s[key] });
    }
    return { state };
  } catch {
    return { state: freshState(), rejectedRaw: raw, warning: "上次的进度没能读出来，原记录已保留。这次可以临时体验；请在设置中先导出原记录，再选择保存新进度。" };
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

