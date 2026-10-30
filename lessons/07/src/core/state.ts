// Course progress for chapter 7. Everything a student makes is kept here and saved
// under its own key, so the five rooms can hand their results on to the special issue.
import { CORE_STATIONS, STATIONS, stationsForRoute, type LearningRoute, type RoomId } from "../content/lessons.ts";
import type { ExperimentEvidence } from "../course/records.ts";
import { canPublish } from "./publication.ts";
import type { Press25 } from "../course/records.ts";

export const SAVE_KEY = "nova-type-house-v1";

export type View = "hub" | RoomId;

export interface IssueSpan {
  text: string;
  by: "ai" | "student";
}
export interface Progress {
  version: 1;
  view: View;
  current: string;
  route: LearningRoute;
  exploring?: boolean;
  done: Record<string, boolean>;
  introSeen: boolean;
  finale: boolean;
  notes: Record<string, unknown>; // per-station working data, keyed by station id
  settings: { reducedMotion: boolean };
  reviews: Partial<Record<RoomId, { choice: number; observation: string; evidence?: ExperimentEvidence }>>;
}

export function newProgress(): Progress {
  return {
    version: 1,
    view: "hub",
    current: "01",
    route: "core",
    exploring: false,
    done: {},
    introSeen: false,
    finale: false,
    notes: {},
  settings: { reducedMotion: false },
    reviews: {},
  };
}

export function isUnlocked(p: Progress, id: string): boolean {
  const i = STATIONS.findIndex((s) => s.id === id);
  if (i < 0) return false;
  if (p.done[id]) return true;
  if (p.route === "core") return CORE_STATIONS.filter((s) => s < id).every((s) => p.done[s]);
  return STATIONS.slice(0, i).every((s) => p.done[s.id]);
}

export function roomUnlocked(p: Progress, room: RoomId): boolean {
  return STATIONS.some((s) => s.room === room && isUnlocked(p, s.id));
}

export function roomDone(p: Progress, room: RoomId): boolean {
  return STATIONS.filter((s) => s.room === room).every((s) => p.done[s.id]);
}

export function nextOpen(p: Progress): string {
  const route = stationsForRoute(p.route);
  return route.find((id) => !p.done[id]) ?? "25";
}

export function encode(p: Progress): string {
  // Legacy records can carry this preference; new snapshots keep device settings separate.
  const { settings, ...learning }=p;
  return JSON.stringify(learning);
}

const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
function validNotes(notes: unknown): notes is Progress["notes"] {
  if (!record(notes)) return false;
  const arrays: Record<string, string[]> = {
    "01": ["tries"],
    "02": ["rounds"],
    "03": ["tries"],
    "04": ["seen"],
    "06": ["flipped"],
    "07": ["visited"],
    "09": ["pairs"],
    "11": ["seen"],
    "12": ["viewed"],
    "13": ["tried"],
    "14": ["inserted"],
    "21": ["printed"],
    "22": ["printed"],
    "23": ["low", "high"],
    ledger: [
      "query",
      "keys",
      "values",
      "computed",
      "magnifiers",
      "seatsCompared",
    ],
  };
  for (const [id, note] of Object.entries(notes)) {
    if (!record(note)) return false;
    if (arrays[id]?.some((key) => !Array.isArray(note[key]))) return false;
    for (const [key, value] of Object.entries(note)) {
      if (
        [
          "tries",
          "flipped",
          "visited",
          "pairs",
          "viewed",
          "tried",
          "inserted",
          "low",
          "high",
        ].includes(key) &&
        (!Array.isArray(value) || value.some((x) => typeof x !== "string"))
      )
        return false;
    }
    if (
      id === "08" &&
      (!record(note.placed) ||
        Object.values(note.placed).some(
          (v) =>
            !Array.isArray(v) ||
            v.length !== 2 ||
            v.some((x) => !Number.isFinite(x)),
        ))
    )
      return false;
    if (
      id === "05" &&
      note.choice !== undefined &&
      (!Number.isInteger(note.choice) ||
        Number(note.choice) < 0 ||
        Number(note.choice) > 2)
    )
      return false;
    if (
      id === "15" &&
      (!record(note.notes) ||
        Object.entries(note.notes).some(
          ([k, v]) => !/^[0-3]-[0-3]$/.test(k) || typeof v !== "string",
        ))
    )
      return false;
    if (id === "15" && note.measured !== undefined && (
      !record(note.measured) || Object.entries(note.measured).some(([key, value]) =>
        !/^[0-3]-[0-3]$/.test(key) || !record(value) || typeof value.label !== "string" ||
        !Number.isFinite(value.share) || Number(value.share) < 0 || Number(value.share) > 1.00001 ||
        !Number.isFinite(value.spread) || Number(value.spread) < 0 || Number(value.spread) > 1.00001 ||
        (value.text !== undefined && (typeof value.text !== "string" || value.text.length > 200))
      )
    )) return false;
    if (
      ["21", "22"].includes(id) &&
      (note.printed as unknown[]).some(
        (v) => !Number.isInteger(v) || Number(v) < 0,
      )
    )
      return false;
    if (
      id === "02" &&
      (note.rounds as unknown[]).some(
        (v) =>
          !record(v) ||
          typeof v.pair !== "string" ||
          typeof v.guess !== "string" ||
          !Number.isFinite(v.count) ||
          !Number.isFinite(v.inCase),
      )
    )
      return false;
    if (id === "ledger") {
      const vec = (v: unknown) =>
        Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
      if (
        !vec(note.query) ||
        !(note.keys as unknown[]).every(vec) ||
        !(note.values as unknown[]).every(vec) ||
        (note.keys as unknown[]).length !== 4 ||
        (note.values as unknown[]).length !== 4
      )
        return false;
      if (
        note.seatOrder !== undefined &&
        (!Array.isArray(note.seatOrder) ||
          [...note.seatOrder].sort().join(",") !== "0,1,2" ||
          note.seatOrder.some((x) => !Number.isInteger(x)))
      )
        return false;
      if (
        note.seatMoves !== undefined &&
        (!Number.isInteger(note.seatMoves) || Number(note.seatMoves) < 0)
      )
        return false;
      if (
        note.seatNumbers !== undefined &&
        typeof note.seatNumbers !== "boolean"
      )
        return false;
    }
    if (id === "workbench") {
      if (
        note.sentences !== undefined &&
        (!record(note.sentences) ||
          Object.entries(note.sentences).some(
            ([station, text]) =>
              !["01", "03", "04"].includes(station) ||
              typeof text !== "string" ||
              text.length > 80,
          ))
      )
        return false;
      if (note.council !== undefined) {
        if (!record(note.council)) return false;
        const integer = (value: unknown, min: number, max: number) =>
          Number.isInteger(value) &&
          Number(value) >= min &&
          Number(value) <= max;
        for (const [station, order] of Object.entries(note.council)) {
          if (
            !/^(11|12|13|14|15)$/.test(station) ||
            !record(order) ||
            typeof order.source !== "string" ||
            order.source.length > 200 ||
            !Array.isArray(order.tokens) ||
            order.tokens.length < 1 ||
            order.tokens.length > 64 ||
            order.tokens.some(
              (x) => typeof x !== "string" || x.length < 1 || x.length > 40,
            )
          )
            return false;
          if (
            !integer(order.query, 0, order.tokens.length - 1) ||
            !integer(order.applePair, 0, 1) ||
            !["phone", "fruit"].includes(String(order.appleKind)) ||
            !integer(order.pronoun, 0, 4) ||
            !integer(order.inserted, -1, 2) ||
            !integer(order.layer, 0, 3) ||
            !integer(order.head, -1, 3)
          )
            return false;
          if (order.edited !== undefined && (typeof order.edited !== "boolean" || order.tokens.length > 48)) return false;
        }
      }
      if (note.experiments !== undefined) {
        if (!record(note.experiments)) return false;
        const snapshot = (v: unknown): boolean => record(v) && Array.isArray(v.tokens) && v.tokens.length > 0 && v.tokens.length <= 48 &&
          v.tokens.every(t => typeof t === "string" && t.length > 0 && t.length <= 40) &&
          (v.tokens as string[]).join("").length <= 200 && Number.isInteger(v.query) && Number(v.query) >= 0 && Number(v.query) < v.tokens.length &&
          Number.isInteger(v.layer) && Number(v.layer) >= 0 && Number(v.layer) <= 3 && Number.isInteger(v.head) && Number(v.head) >= -1 && Number(v.head) <= 3 &&
          Array.isArray(v.vector) && v.vector.length === 128 && v.vector.every(Number.isFinite) && Array.isArray(v.attention) && v.attention.length <= 3 &&
          v.attention.every(a => record(a) && typeof a.word === "string" && Number.isFinite(a.weight) && Number(a.weight) >= 0 && Number(a.weight) <= 1);
        for (const [station, experiment] of Object.entries(note.experiments)) {
          if (!/^(11|12|13|14|15)$/.test(station) || !record(experiment) ||
            (experiment.a !== undefined && !snapshot(experiment.a)) || (experiment.b !== undefined && !snapshot(experiment.b)) ||
            (experiment.answer !== undefined && !["diff", "same"].includes(String(experiment.answer))) ||
            (experiment.answerFor !== undefined && typeof experiment.answerFor !== "string")) return false;
        }
      }
    }
    if (id === "guide" && (!Array.isArray(note.seen) || note.seen.some(v => typeof v !== "string" || !STATIONS.some(s => s.id === v)))) return false;
    if (
      id === "24" &&
      (typeof note.text !== "string" ||
        !Number.isFinite(note.seed) ||
        !record(note.marks))
    )
      return false;
    if (
      id === "25" &&
      ["headline", "opening", "ai", "edited"].some(
        (k) => typeof note[k] !== "string",
      )
    )
      return false;
    if (id === "12" && note.observations !== undefined) {
      if (!Array.isArray(note.observations) || note.observations.length > 40 || note.observations.some((v) =>
        !record(v) || !Number.isInteger(v.pair) || ![0, 1].includes(Number(v.pair)) || !["phone", "fruit"].includes(String(v.kind)) ||
        !Number.isInteger(v.layer) || Number(v.layer) < 0 || Number(v.layer) > 3 ||
        !Number.isInteger(v.head) || Number(v.head) < -1 || Number(v.head) > 3 ||
        typeof v.text !== "string" || v.text.length > 200 ||
        !Array.isArray(v.vector) || v.vector.length < 1 || v.vector.length > 1024 || !v.vector.every(Number.isFinite) ||
        !Number.isFinite(v.device) || !Number.isFinite(v.fruit) || !Array.isArray(v.attention) || v.attention.length > 3 ||
        v.attention.some((a) => !record(a) || typeof a.word !== "string" || !Number.isFinite(a.weight) || Number(a.weight) < 0 || Number(a.weight) > 1)
      )) return false;
    }
    if (id === "09" && note.fill !== undefined) {
      const f = note.fill;
      if (!record(f) || !Array.isArray(f.candidates) || f.candidates.length > 9 ||
        !Number.isFinite(f.remaining) || Number(f.remaining) < 0 || Number(f.remaining) > 1 ||
        f.candidates.some((v) => !record(v) || typeof v.word !== "string" || !Number.isFinite(v.probability) || Number(v.probability) < 0 || Number(v.probability) > 1)
      ) return false;
    }
    if(id==="21"&&note.transitions!==undefined) {
      const ids=(v:unknown)=>Array.isArray(v)&&v.length>0&&v.length<=64&&v.every(n=>Number.isInteger(n)&&n>=0);
      const candidates=(v:unknown)=>Array.isArray(v)&&v.length===8&&v.every(c=>record(c)&&Number.isInteger(c.id)&&typeof c.text==="string"&&Number.isFinite(c.p)&&Number(c.p)>=0&&Number(c.p)<=1);
      if(!Array.isArray(note.transitions)||note.transitions.length>12||note.transitions.some(t=>!record(t)||!ids(t.input)||!ids(t.output)||!Number.isInteger(t.token)||!candidates(t.before)||!candidates(t.after))||
        (note.observed!==undefined&&typeof note.observed!=="boolean")) return false;
    }
    if (id === "23" && (
      (note.middle !== undefined && (!Array.isArray(note.middle) || note.middle.some((v) => typeof v !== "string"))) ||
      (note.choice !== undefined && !["low", "middle", "high"].includes(String(note.choice))) ||
      (note.reason !== undefined && typeof note.reason !== "string")
    )) return false;
  }
  return true;
}

/** A warning means that the original must be retained until the user starts afresh. */
export function decode(raw: string | null): {
  progress: Progress;
  warning: string;
} {
  if (!raw) return { progress: newProgress(), warning: "" };
  try {
    const v = JSON.parse(raw) as Partial<Progress>;
    if (
      v.version !== 1 ||
      !record(v.done) ||
      (v.notes !== undefined && !validNotes(v.notes))
    )
      throw new Error("记录格式不符");
    const p = newProgress();
    if (v.exploring !== undefined && typeof v.exploring !== "boolean") throw new Error("探索模式格式不符");
    p.exploring = v.exploring ?? false;
    const routed = v.route === "core" || v.route === "full";
    if (v.route !== undefined && !routed) throw new Error("学习路线不符");
    // Legacy saves used a linear prefix. New saves may contain genuine optional
    // studies and sparse core stamps, independent of the route currently selected.
    p.route = routed ? "core" : "full";
    for (const s of STATIONS)
      if (v.done[s.id] === true && (p.exploring || isUnlocked(p, s.id))) p.done[s.id] = true;
    p.route = routed ? v.route! : "full";
    p.introSeen = !!v.introSeen;
    p.notes =
      v.notes && typeof v.notes === "object"
        ? (v.notes as Record<string, unknown>)
        : {};
    p.settings = { reducedMotion: !!v.settings?.reducedMotion };
    if (record(v.reviews))
      for (const s of STATIONS.filter((s) => s.synthesis)) {
        const r = v.reviews[s.room];
        if (record(r) && r.evidence !== undefined && !validExperiment(r.evidence)) throw new Error("实验快照格式不符");
        if (
          record(r) &&
          Number.isInteger(r.choice) &&
          typeof r.observation === "string"
        )
          p.reviews[s.room] = {
            choice: r.choice as number,
            observation: r.observation,
            ...(validExperiment(r.evidence) ? { evidence: r.evidence } : {}),
          };
      }
    const draft=p.notes["25"] as Press25|undefined;
    const freeIssue=!!draft?.spans?.length&&canPublish(draft)&&!!p.reviews.press?.observation.trim();
    p.finale=!!v.finale&&!!p.done["25"]&&(p.exploring?freeIssue:CORE_STATIONS.every(id=>p.done[id]));
    p.current =
      STATIONS.some((s) => s.id === v.current) && (p.exploring || isUnlocked(p, v.current!))
        ? v.current!
        : nextOpen(p);
    p.view =
      v.view === "hub" || STATIONS.some((s) => s.room === v.view)
        ? v.view!
        : "hub";
    if (p.view !== "hub" && !p.exploring && !roomUnlocked(p, p.view)) p.view = "hub";
    return { progress: p, warning: "" };
  } catch {
    return {
      progress: newProgress(),
      warning:
        "上次的记录读不出来，原文已保留。本次可临时体验并导出；请在成果册保存原记录后，再决定是否重新开始。",
    };
  }
}

function validExperiment(value: unknown): value is ExperimentEvidence {
  return record(value) && ["station", "variable", "fixed", "before", "after"].every((key) => typeof value[key] === "string");
}
