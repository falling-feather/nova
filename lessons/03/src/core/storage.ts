import type { ForestState } from "./types.ts";
import { createState, phaseFor } from "./state.ts";
import { canReach, CAMP_X } from "./world.ts";
import { validateSave } from "./save-validation.ts";
import { encodeSave, decodeSave } from "./save-codec.ts";
export const SAVE_KEY = "nova-forest-whispers-v1";
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export function readSave(storage: StorageLike): {
  state: ForestState;
  warning: string | null;
  writable: boolean;
} {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null)
      return { state: createState(), warning: null, writable: true };
    const value: unknown = decodeSave(raw);
    if (!validateSave(value))
      return {
        state: createState(),
        warning:
          "原有学习记录暂时无法读取，已保留原文件。请先导出记录或在设置里明确重新开始。",
        writable: false,
      };
    if (!canReach(value.player.x, value.player.elevation, phaseFor(value)))
      value.player = { x: CAMP_X, elevation: "ground" };
    return { state: value, warning: null, writable: true };
  } catch {
    return {
      state: createState(),
      warning:
        "学习记录未能读取，原有记录不会被覆盖。可以继续临时体验，并导出新作品。",
      writable: false,
    };
  }
}
export function writeSave(
  storage: StorageLike,
  state: ForestState,
): { ok: boolean; error: string | null } {
  try {
    storage.setItem(SAVE_KEY, encodeSave(state));
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error:
        "本机空间不足或不允许保存。这次作品仍在当前页面，请先导出，暂时不要关闭页面。",
    };
  }
}
