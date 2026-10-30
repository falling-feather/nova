import { validateProject } from './core.ts';
import { createProject } from './seed.ts';
import type { Project } from './types.ts';
import { toArtifact } from './core.ts';
import type { ChapterStoragePort } from '../../../shared/linkage/platform-client.d.ts';

export const STORAGE_KEY = 'nova.capstone.project.v1';
const DEVICE_KEY = 'nova.capstone.device.v1';
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<ChapterStoragePort, 'flush' | 'saveArtifact'>>;
let storage: StoragePort = { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) };
export async function initializeStorage(): Promise<void> {
  const platform = await window.NovaPlatformReady;
  if (!platform) return;
  await platform.ready;
  storage = await platform.openChapter({ chapter: 13, keys: [STORAGE_KEY], validate: (_key, raw) => { try { decode(raw); return true; } catch { return false; } } });
}
function decode(raw: string): Project {
  const saved: unknown = JSON.parse(raw);
  if (!saved || typeof saved !== 'object' || !('schema' in saved) || saved.schema !== 'nova-capstone-save' || !('version' in saved) || saved.version !== 1 || !('project' in saved)) throw new Error('存档格式或版本不支持');
  validateProject(saved.project);
  return saved.project;
}
export function loadDeviceSettings(): { guideSeen: boolean; muted: boolean } {
  try { const value = JSON.parse(localStorage.getItem(DEVICE_KEY) ?? '{}'); return { guideSeen: value.guideSeen === true, muted: value.muted === true }; }
  catch { return { guideSeen: false, muted: false }; }
}
export function saveDeviceSettings(value: { guideSeen: boolean; muted: boolean }): void {
  try { localStorage.setItem(DEVICE_KEY, JSON.stringify(value)); } catch { /* Device preference failure does not change a learning snapshot. */ }
}
export async function flushProject(): Promise<void> {
  const status = await storage.flush?.();
  if (status?.storageError) throw new Error(status.storageError);
  if (status?.fenced) throw new Error('学习记录状态已变化，请回奇点重新进入。');
}
export async function syncArtifact(project: Project): Promise<void> {
  if (!storage.saveArtifact) return;
  storage.saveArtifact({ id: `capstone-${project.id}`, title: project.title || '未命名共创展作品', mimeType: 'application/json', data: JSON.stringify(toArtifact(project)) });
  await flushProject();
}
export function loadProject(): { project: Project; recovery: string | null; error: string | null } {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { project: createProject(), recovery: null, error: null };
    return { project: decode(raw), recovery: null, error: null };
  } catch (e) {
    return { project: createProject(), recovery: raw, error: `存档无法读取：${e instanceof Error ? e.message : '未知错误'}。原文仍保留，当前临时项目不会自动覆盖它。` };
  }
}

export function saveProject(p: Project): { ok: true } | { ok: false; error: string } {
  try {
    p.updatedAt = new Date().toISOString();
    storage.setItem(STORAGE_KEY, JSON.stringify({ schema: 'nova-capstone-save', version: 1, project: p }));
    return { ok: true };
  } catch { return { ok: false, error: '浏览器未能保存（可能空间已满或存储被禁用）。请导出项目文件，当前内容仍在页面中。' }; }
}
