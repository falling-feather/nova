import { createProject, enableWorkshop, validateProject } from './project.ts';
import type { ProjectState } from './project.ts';
import type { ChapterStoragePort, NovaPlatformClient } from '../../../shared/linkage/platform-client';

export const STORAGE_KEY = 'nova-ch10-trusted-data-v1';
export type ProjectStorage = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<ChapterStoragePort, 'flush' | 'saveArtifact'>>;
export type ChapterPlatform = Pick<NovaPlatformClient, 'ready' | 'openChapter'>;
export const browserProjectStorage: ProjectStorage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
export async function connectChapterStorage(ready: Promise<ChapterPlatform | null> | undefined): Promise<ProjectStorage> {
  const platform = await ready;
  if (!platform) return browserProjectStorage;
  await platform.ready;
  // The chapter's decoder blocks malformed records before any write. Keeping that
  // authority here also permits an explicit user recovery to replace bad records.
  return platform.openChapter({ chapter: 10, keys: [STORAGE_KEY] });
}
const DEVICE_KEY = 'nova-ch10-device-v1';
export function loadDeviceMute(): boolean {
  try { const raw = browserProjectStorage.getItem(DEVICE_KEY); return raw ? JSON.parse(raw).muted !== false : true; }
  catch { return true; } // Sound is optional; unavailable device storage keeps the page silent.
}
export function writeDeviceMute(muted: boolean): { ok: boolean; error: string } {
  try { browserProjectStorage.setItem(DEVICE_KEY, JSON.stringify({ muted })); return { ok: true, error: '' }; }
  catch (error) { return { ok: false, error: `声音偏好未保存：${message(error)}` }; }
}
export interface LoadedProject { project: ProjectState; recoveryRaw: string | null; error: string; restored: boolean; blocked: boolean; }
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

export function decodeProject(raw: string): ProjectState {
  const value: unknown = JSON.parse(raw);
  validateProject(value);
  enableWorkshop(value);
  return value;
}
export function loadProject(storage: Pick<ProjectStorage, 'getItem'>): LoadedProject {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    const project = raw === null ? createProject() : decodeProject(raw);
    enableWorkshop(project);
    return { project, recoveryRaw: null, error: '', restored: raw !== null, blocked: false };
  } catch (error) {
    const project = createProject(); enableWorkshop(project);
    return { project, recoveryRaw: raw, error: message(error), restored: false, blocked: true };
  }
}
export function writeProject(storage: Pick<ProjectStorage, 'setItem'>, project: ProjectState): { ok: boolean; error: string } {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(project)); return { ok: true, error: '' }; }
  catch (error) { return { ok: false, error: `保存失败：${message(error)}。当前作品仍可导出。` }; }
}
