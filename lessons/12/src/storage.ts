import { validateArtifact } from './engine/index.ts';
import type { LearningArtifact } from './engine/index.ts';
import type { ChapterStoragePort } from '../../../shared/linkage/platform-client.d.ts';
import {CANVAS_KEY,decodeCanvas} from './canvas-draft.ts';
import type {CanvasDraft} from './canvas-draft.ts';

export const STORAGE_KEY = 'nova.ch12.workbench.v1';
export const DEVICE_KEY = 'nova.ch12.device.v1';
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<ChapterStoragePort, 'flush' | 'saveArtifact'>>;
export interface ViewPreferences { welcomeSeen: boolean; muted: boolean }
export interface Session {
  version: 1; artifact: LearningArtifact; unit: number; scenarioName: string; novelInitial: string;
  ui?: { welcomeSeen: boolean; muted?: boolean };
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

export function decodeSession(raw: string): Session {
    const parsed: unknown = JSON.parse(raw);
    if (!object(parsed)) throw new Error('续学记录不是对象。');
    const checked = validateArtifact(parsed.artifact);
    if (!checked.ok) throw new Error(checked.errors.join(' '));
    if (parsed.version !== 1 || !Number.isInteger(parsed.unit) || Number(parsed.unit) < 0 || Number(parsed.unit) > 4 || typeof parsed.scenarioName !== 'string' || parsed.scenarioName.length > 100 || typeof parsed.novelInitial !== 'string' || parsed.novelInitial.length > 300) throw new Error('续学记录格式无效。');
    if (parsed.ui !== undefined && (!object(parsed.ui) || typeof parsed.ui.welcomeSeen !== 'boolean' || (parsed.ui.muted !== undefined && typeof parsed.ui.muted !== 'boolean'))) throw new Error('界面偏好格式无效。');
    return { version: 1, artifact: checked.artifact, unit: Number(parsed.unit), scenarioName: parsed.scenarioName, novelInitial: parsed.novelInitial, ui: parsed.ui as Session['ui'] };
}

/** 本章存档唯一读写口；账号 port 与游客 port 的字段、校验和内核相同。 */
export class SessionStore {
  private storage: StorageLike;
  private device?: StorageLike;
  constructor(storage: StorageLike, device?: StorageLike) { this.storage = storage; this.device = device; }
  readRaw(): string | null { return this.storage.getItem(STORAGE_KEY); }
  readCanvasRaw():string|null{return this.storage.getItem(CANVAS_KEY);}
  loadCanvas():CanvasDraft|null{const raw=this.readCanvasRaw();return raw===null?null:decodeCanvas(raw);}
  saveCanvas(draft:CanvasDraft):void{const raw=JSON.stringify(draft);decodeCanvas(raw);this.storage.setItem(CANVAS_KEY,raw);}
  load(): Session | null {
    const raw = this.readRaw(); return raw === null ? null : decodeSession(raw);
  }
  save(session: Session): void {
    const checked = validateArtifact(session.artifact);
    if (!checked.ok) throw new Error(checked.errors.join(' '));
    this.storage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  readViewPreferences(): Partial<ViewPreferences> {
    if (!this.device) return {};
    try { const raw = this.device.getItem(DEVICE_KEY); if (!raw) return {}; const value: unknown = JSON.parse(raw); if (!object(value) || value.version !== 1) return {}; return { ...(typeof value.muted === 'boolean' ? { muted: value.muted } : {}), ...(typeof value.welcomeSeen === 'boolean' ? { welcomeSeen: value.welcomeSeen } : {}) }; }
    catch { return {}; }
  }
  saveViewPreferences(preferences: Partial<ViewPreferences>): void { this.device?.setItem(DEVICE_KEY, JSON.stringify({ version: 1, ...this.readViewPreferences(), ...preferences })); }
  saveMuted(muted: boolean): void { this.saveViewPreferences({ muted }); }
  async flush(): Promise<void> { const status = await this.storage.flush?.(); if (status?.storageError) throw new Error(status.storageError); }
  async saveArtifact(artifact: LearningArtifact): Promise<void> {
    await this.storage.saveArtifact?.({ id: `ch12-${artifact.createdAt.replace(/[^0-9]/g, '')}`, title: artifact.title, mimeType: 'application/json', data: JSON.stringify(artifact) });
    await this.flush();
  }
}

export async function browserSessionStore(): Promise<SessionStore> {
  const local: StorageLike = { getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) };
  const platform = await window.NovaPlatformReady;
  if (platform) await platform.ready;
  const storage = platform ? await platform.openChapter({ chapter: 12, keys: [STORAGE_KEY,CANVAS_KEY], validate: (key, raw) => { try { if(key===CANVAS_KEY)decodeCanvas(raw);else if(key===STORAGE_KEY)decodeSession(raw);else return false;return true; } catch { return false; } } }) : local;
  return new SessionStore(storage, local);
}
