import type { ChapterStoragePort, NovaPlatformClient } from '../../../../shared/linkage/platform-client.d.ts';
import type { PageDoc } from './prompt.ts';
import type { HandoverCase, Saved } from './session.ts';
import type { Garden } from '../content/world.ts';
import type { Flags } from './course.ts';
import { MODE_LABEL, STAMP_LABEL as REVIEW_LABEL } from './course.ts';
import { LESSONS } from '../content/lessons.ts';

export const SAVE_KEY = 'nova-seasons-conservatory-v1';
export const JOURNEY_KEY = 'nova-seasons-journey-v1';
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const ids = new Set(LESSONS.map((l) => l.id));
const idList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length <= 25 && v.every((x) => ids.has(x)) && new Set(v).size === v.length;
const validFlags = (v: unknown): v is Flags =>
  object(v) &&
  Object.values(v).every(
    (x) =>
      typeof x === 'boolean' ||
      typeof x === 'string' ||
      (typeof x === 'number' && Number.isFinite(x)) ||
      (Array.isArray(x) && x.length <= 200 && x.every((y) => typeof y === 'string'))
  );


export interface JourneySave { schema: 1; active: boolean; lesson: number; step: number; done: string[]; skipped: string[]; flags: Record<string, Flags>; steps?: Record<string, number> }

/** 本章唯一存储入口与解码器。非法原文保留，调用方暂停覆盖；平台同步复用相同键与校验。 */
type StoragePort = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<ChapterStoragePort, 'flush' | 'saveArtifact'>>;
type ChapterPlatform = { ready: Promise<unknown>; openChapter(options: Parameters<NovaPlatformClient['openChapter']>[0]): Promise<StoragePort> };
let port: StoragePort | null = null;
export const readRaw = (key: string) => (port ?? localStorage).getItem(key);
export const writeSave = (key: string, data: unknown) => { const storage = port ?? localStorage, raw = JSON.stringify(data); if (storage.getItem(key) !== raw) storage.setItem(key, raw); };
export async function initializeStorage(g: Garden, questionCount: number, ready: Promise<ChapterPlatform | null> | undefined = typeof window === 'undefined' ? undefined : window.NovaPlatformReady) {
  const platform = ready ? await ready : null;
  if (!platform) { port = null; return }
  await platform.ready;
  port = await platform.openChapter({ chapter: 9, keys: [SAVE_KEY, JOURNEY_KEY], validate: (key, raw) => {
    try { if (key === SAVE_KEY) decodeSession(raw, g, questionCount); else if (key === JOURNEY_KEY) decodeJourney(raw); else return false; return true }
    catch { return false }
  } });
}
export async function saveArtifact(id: string, title: string, data: string) {
  await port?.saveArtifact?.({ id, title, mimeType: 'application/json', data });
  if (port?.flush) await port.flush();
}
export function readSession(g: Garden, questionCount: number): Saved | null {
  const raw = readRaw(SAVE_KEY);
  if (!raw) return null;
  return decodeSession(raw, g, questionCount);
}
export function decodeSession(raw: string, g: Garden, questionCount: number): Saved {
  const s = JSON.parse(raw) as Saved;
      if (
        s.schema !== 1 ||
        !Number.isInteger(s.day) ||
        s.day < 1 ||
        s.day > 5 ||
        !Number.isInteger(s.question) ||
        s.question < 0 ||
        s.question >= questionCount ||
        !Object.hasOwn(MODE_LABEL, s.mode) ||
        !Array.isArray(s.notes) ||
        !Array.isArray(s.records) ||
        !Array.isArray(s.retired) ||
        typeof s.edits !== 'object' ||
        !s.edits
      )
        throw Error('无效记录');
      if (
        s.customQuestion !== undefined &&
        s.customQuestion !== null &&
        (typeof s.customQuestion !== 'string' || s.customQuestion.length > 160)
      )
        throw Error('无效问题');
      // 先核验全部嵌套字段，再替换内存；坏存档原文保留给用户导出。
      const pageIds = new Set([...g.world.pages, ...g.world.latePages].map((p) => p.n));
      const strings = (a: unknown, max: number) =>
        Array.isArray(a) && a.every((x) => typeof x === 'string' && x.length <= max);
      if (s.drafts !== undefined && (!object(s.drafts) || typeof s.drafts.note !== 'string' || s.drafts.note.length > 400 || !object(s.drafts.pages) || !Object.entries(s.drafts.pages).every(([n, lines]) => pageIds.has(Number(n)) && strings(lines, 240) && (lines as string[]).length === g.world.pages.concat(g.world.latePages).find(p => p.n === Number(n))!.lines.length))) throw Error('无效草稿');
      const validPage = (p: PageDoc) =>
        p && pageIds.has(p.n) && typeof p.title === 'string' && strings(p.lines, 240);
      if (s.handoverCase !== undefined && (!s.handoverCase || !['beforeId', 'afterId'].every((key) => {
        const value = s.handoverCase![key as keyof HandoverCase];
        return value === null || (Number.isInteger(value) && Number(value) > 0);
      }))) throw Error('无效交班引用');
      if (
        (s.k !== undefined && (!Number.isInteger(s.k) || s.k < 1 || s.k > 5)) ||
        (s.filed !== undefined &&
          s.filed !== null &&
          (!Array.isArray(s.filed) || !s.filed.every((n) => pageIds.has(n)))) ||
        (s.lesson !== undefined && s.lesson !== '' && !/^(0[1-9]|1[0-9]|2[0-5])$/.test(s.lesson)) ||
        (s.who !== undefined && typeof s.who !== 'string') ||
        (s.tag !== undefined && typeof s.tag !== 'string') ||
        (s.latePosted !== undefined && typeof s.latePosted !== 'boolean') ||
        (s.transfers !== undefined &&
          (!Array.isArray(s.transfers) ||
            !s.transfers.every(
              (x) =>
                x &&
                typeof x.q === 'string' &&
                Number.isInteger(x.day) &&
                x.day >= 1 &&
                x.day <= 5 &&
                typeof x.appropriate === 'boolean'
            )))
      )
        throw Error('无效课程工作台');
      if (
        Array.isArray(s.edits) ||
        !Object.entries(s.edits).every(
          ([n, lines]) =>
            pageIds.has(Number(n)) &&
            strings(lines, 240) &&
            lines.length === g.world.pages.concat(g.world.latePages).find((p) => p.n === Number(n))!.lines.length &&
            lines.every((x) => x.trim())
        ) ||
        !s.retired.every((n) => pageIds.has(n))
      )
        throw Error('无效资料');
      if (
        !s.notes.every(
          (n) =>
            n &&
            typeof n.id === 'string' &&
            typeof n.text === 'string' &&
            n.text.length <= 400 &&
            typeof n.from === 'string'
        ) ||
        !s.records.every(
          (r) =>
            r &&
            Number.isInteger(r.id) &&
            r.id > 0 &&
            Number.isInteger(r.day) &&
            r.day >= 1 &&
            r.day <= 5 &&
            Object.hasOwn(MODE_LABEL, r.mode) &&
            typeof r.q === 'string' &&
            typeof r.answer === 'string' &&
            (r.evidence === undefined ||
              (!!r.evidence &&
                typeof r.evidence.title === 'string' &&
                typeof r.evidence.text === 'string')) &&
            Array.isArray(r.tokens) &&
            r.tokens.every(
              (t) =>
                t &&
                typeof t.text === 'string' &&
                Number.isFinite(t.prob) &&
                t.prob >= 0 &&
                t.prob <= 1
            ) &&
            strings(r.notes, 400) &&
            Array.isArray(r.pages) &&
            r.pages.every((n) => pageIds.has(n)) &&
            Array.isArray(r.sourcePages) &&
            r.sourcePages.every(validPage) &&
            ['right', 'wrong', 'notfound', 'unknown'].includes(r.verdict) &&
            (r.review === null || Object.hasOwn(REVIEW_LABEL, r.review)) &&
            (r.reviewHistory === undefined || (Array.isArray(r.reviewHistory) && r.reviewHistory.every((entry) =>
              entry && Object.hasOwn(REVIEW_LABEL, entry.review) && (entry.at === null || (typeof entry.at === 'string' && Number.isFinite(Date.parse(entry.at))))
            ))) &&
            typeof r.model === 'string'
        )
      )
        throw Error('无效记录');

  return s;
}
export function readJourney(): JourneySave | null {
  const raw = readRaw(JOURNEY_KEY);
  if (!raw) return null;
  return decodeJourney(raw);
}
export function decodeJourney(raw: string): JourneySave {
  const v: unknown = JSON.parse(raw);
      if (
        !object(v) ||
        v.schema !== 1 ||
        typeof v.active !== 'boolean' ||
        !Number.isInteger(v.lesson) ||
        Number(v.lesson) < 0 ||
        Number(v.lesson) >= 25 ||
        !Number.isInteger(v.step) ||
        Number(v.step) < 0 ||
        Number(v.step) > LESSONS[Number(v.lesson)].steps.length ||
        !idList(v.done) ||
        !idList(v.skipped) ||
        v.skipped.some((x) => x !== '23') ||
        !object(v.flags) ||
        !Object.entries(v.flags).every(([id, f]) => ids.has(id) && validFlags(f))
      )
        throw Error('无效课程存档');
      if (
        v.steps !== undefined &&
        (!object(v.steps) ||
          !Object.entries(v.steps).every(
            ([id, n]) =>
              ids.has(id) &&
              Number.isInteger(n) &&
              Number(n) >= 0 &&
              Number(n) <= LESSONS.find((l) => l.id === id)!.steps.length
          ))
      )
        throw Error('无效课程步骤');

  return v as unknown as JourneySave;
}

export interface DeviceSettings { muted: boolean; reduced: boolean; smooth: boolean }
const DEVICE_KEY = 'nova-seasons-preferences-v1';
export function readDevice(): DeviceSettings | null {
  const raw = localStorage.getItem(DEVICE_KEY);
  if (!raw) return null;
  const v: unknown = JSON.parse(raw);
  if (!object(v) || !['muted', 'reduced', 'smooth'].every(key => typeof v[key] === 'boolean')) throw Error('设备偏好无法读取');
  return v as unknown as DeviceSettings;
}
export const writeDevice = (value: DeviceSettings) => localStorage.setItem(DEVICE_KEY, JSON.stringify(value));
