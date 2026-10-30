import { decode, encode, SAVE_KEY, type Progress } from "./state.ts";
import { stationsForRoute } from "../content/lessons.ts";
import type { ChapterStoragePort, NovaPlatformClient, PersonalArtifact } from "../../../../shared/linkage/platform-client.d.ts";
export type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem"> & Partial<Pick<ChapterStoragePort,"flush"|"saveArtifact">>;
type ChapterOptions=Parameters<NovaPlatformClient["openChapter"]>[0];
interface PlatformReader {ready:PromiseLike<unknown>;openChapter:(options:ChapterOptions)=>Promise<StoragePort>}
interface PlatformSource {
  NovaPlatformReady?: PromiseLike<PlatformReader|null>;
  readonly localStorage?: StoragePort;
}
/** Startup selects one account-aware port before ProgressStorage reads or emits a summary. */
export async function openProgressPort(source: PlatformSource = window as unknown as PlatformSource): Promise<StoragePort|null> {
  const platform=await source.NovaPlatformReady;
  if(platform) {
    await platform.ready;
    return platform.openChapter({chapter:7,keys:[SAVE_KEY],validate:(key,raw)=>key===SAVE_KEY&&!decode(raw).warning});
  }
  try { return source.localStorage ?? null; } catch { return null; }
}

/** One authority for reading and writing the chapter save; damaged records are never overwritten. */
export class ProgressStorage {
  readonly original: string | null;
  readonly loaded: ReturnType<typeof decode>;
  private port: StoragePort | null;
  private cleared = false;
  constructor(port: StoragePort | null) {
    this.port = port;
    let raw: string | null = null;
    try { raw = port?.getItem(SAVE_KEY) ?? null; } catch { this.port = null; }
    this.original = raw;
    this.loaded = decode(raw);
    if (raw && !this.loaded.warning) this.summarize(this.loaded.progress);
  }
  private summarize(progress: Progress) {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent === "undefined") return;
    if (!Object.keys(progress.done).length && !Object.keys(progress.notes).length) return;
    const route = stationsForRoute(progress.route);
    window.dispatchEvent(new CustomEvent("nova:progress", { detail: {
      chapter: 7, completed: route.filter((id) => progress.done[id]).length, total: route.length,
      pathLabel: progress.route === "core" ? "核心路线" : "完整探索",
      artifactCount: progress.finale && (progress.notes["25"] as { spans?: unknown[] } | undefined)?.spans?.length ? 1 : 0,
    } }));
  }
  save(progress: Progress): boolean {
    if (!this.port || this.loaded.warning || this.cleared) return false;
    try { this.port.setItem(SAVE_KEY, encode(progress)); this.summarize(progress); return true; } catch { return false; }
  }
  async flushQueued() { await this.port?.flush?.(); }
  async saveArtifact(title:string,data:string,mimeType:PersonalArtifact["mimeType"]) {
    if(!this.port?.saveArtifact)return;
    const id="issue-"+sha256Hex(new TextEncoder().encode(data));
    await this.port.saveArtifact({id,title,mimeType,data});
  }
  reset(): boolean {
    try { this.port?.removeItem(SAVE_KEY); this.cleared = !!this.port; return this.cleared; } catch { return false; }
  }
}
import { sha256Hex } from '../../../../shared/linkage/digest.mts';
