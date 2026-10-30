import contract from "../linkage/storage-contract.js";
import type { ChapterStoragePort } from "../linkage/platform-client.d.ts";
import {
  createCreator,
  decodeProjectImport,
  importLegacyData,
  validateCreator,
} from "./project.ts";
import { validateSession, hasSavedWork } from "../neural/session.ts";
import {
  validateProject as validateLegacyCapstone,
  hasLearningRecord,
} from "../../lessons/13/src/core.ts";
import type { CreatorProject } from "./types.ts";

export const CREATOR_INDEX = "nova-creator-index-v1";
type Stored = { revision: number; project: CreatorProject };
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(contract.creatorDatabase, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("projects");
      request.result.createObjectStore("meta");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export function migrateLocalRecords(
  p: CreatorProject,
  storage: Pick<Storage, "getItem">,
): void {
  for (const [chapter, key] of [
    [10, "nova-ch10-trusted-data-v1"],
    [11, "nova-neural-ch11-v1"],
    [13, "nova.capstone.project.v1"],
  ] as const) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    p.legacy.push({ chapter, raw });
    try {
      const value: unknown = JSON.parse(raw);
      if (chapter === 10) importLegacyData(p, value);
      if (chapter === 11) {
        validateSession(value);
        if (!hasSavedWork(value)) p.legacy.pop();
      }
      if (chapter === 13) {
        validateLegacyCapstone(value);
        if (!hasLearningRecord(value)) p.legacy.pop();
        else {
          p.title = value.title;
          p.brief = {
            audience: value.brief.audience,
            need: value.brief.need,
            boundary: value.brief.boundary,
          };
        }
      }
    } catch {
      /* The untouched raw record remains explicitly available in the historical-results drawer. */
    }
  }
}
export class CreatorStore {
  project: CreatorProject;
  private revision: number;
  private port: ChapterStoragePort | null;
  private pending: Promise<void> = Promise.resolve();
  private constructor(
    project: CreatorProject,
    revision: number,
    port: ChapterStoragePort | null,
  ) {
    this.project = project;
    this.revision = revision;
    this.port = port;
  }
  static async open(): Promise<CreatorStore> {
    const platform = await window.NovaPlatformReady;
    if (platform) await platform.ready;
    const port = platform
      ? await platform.openChapter({ chapter: 13, keys: [CREATOR_INDEX] })
      : null;
    const fresh = createCreator();
    migrateLocalRecords(fresh, localStorage);
    const requested = new URL(location.href).searchParams.get("project"),
      db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["projects", "meta"], "readwrite"),
        projects = tx.objectStore("projects"),
        meta = tx.objectStore("meta");
      let result: Stored | undefined;
      const current = meta.get("current");
      current.onsuccess = () => {
        const id = requested ?? current.result;
        if (id) {
          const found = projects.get(id);
          found.onsuccess = () => {
            if (!found.result) {
              tx.abort();
              reject(Error("找不到这个创作项目，请从课程目录重新进入。"));
              return;
            }
            try {
              validateCreator(found.result.project);
              result = found.result;
            } catch (error) {
              tx.abort();
              reject(
                Error(
                  `原创作记录保留：${error instanceof Error ? error.message : String(error)}`,
                ),
              );
            }
          };
        } else {
          result = { revision: 0, project: fresh };
          projects.put(result, fresh.id);
          meta.put(fresh.id, "current");
        }
      };
      tx.oncomplete = () => {
        db.close();
        resolve(new CreatorStore(result!.project, result!.revision, port));
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error ?? Error("本机项目未能打开，原数据保留。"));
      };
    });
  }
  save(): Promise<void> {
    const request = this.pending.then(() => this.write());
    this.pending = request.catch(() => {});
    return request;
  }
  private async write(): Promise<void> {
    validateCreator(this.project);
    const p = structuredClone(this.project),
      expected = this.revision;
    p.updatedAt = new Date().toISOString();
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["projects", "meta"], "readwrite"),
        store = tx.objectStore("projects");
      let conflict = false;
      const get = store.get(p.id);
      get.onsuccess = () => {
        const old = get.result as Stored | undefined;
        if (!old || old.revision !== expected) {
          conflict = true;
          tx.abort();
          return;
        }
        store.put({ revision: expected + 1, project: p }, p.id);
        tx.objectStore("meta").put(p.id, "current");
      };
      tx.oncomplete = () => {
        this.revision = expected + 1;
        this.project.updatedAt = p.updatedAt;
        db.close();
        try {
          localStorage.setItem(
            CREATOR_INDEX,
            JSON.stringify({
              id: p.id,
              title: p.title,
              updatedAt: p.updatedAt,
            }),
          );
        } catch {
          /* The canonical project is safely in IndexedDB; the index is optional. */
        }
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(
          conflict
            ? Error(
                "这个项目已在另一章节更新。请先导出当前草稿，或重新载入最新项目。",
              )
            : tx.error,
        );
      };
    });
  }
  private async addProject(p: CreatorProject): Promise<void> {
    await this.pending;
    validateCreator(p);
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["projects", "meta"], "readwrite");
      tx.objectStore("projects").add({ revision: 0, project: p }, p.id);
      tx.objectStore("meta").put(p.id, "current");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
    this.project = p;
    this.revision = 0;
    await this.save();
    const url = new URL(location.href);
    url.searchParams.set("project", p.id);
    history.replaceState(null, "", url);
  }
  async import(raw: string): Promise<void> {
    const p = decodeProjectImport(raw);
    p.id = crypto.randomUUID();
    p.title = (p.title + " · 导入").slice(0, 100);
    await this.addProject(p);
  }
  async create(): Promise<void> {
    await this.addProject(createCreator());
  }
  static async list(): Promise<
    { id: string; title: string; updatedAt: string }[]
  > {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("projects", "readonly"),
        request = tx.objectStore("projects").getAll();
      tx.oncomplete = () => {
        db.close();
        resolve(
          (request.result as Stored[])
            .map(({ project: p }) => ({
              id: p.id,
              title: p.title,
              updatedAt: p.updatedAt,
            }))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }
  async saveArtifact(
    chapter: number,
    title: string,
    data: string,
  ): Promise<void> {
    const platform = await window.NovaPlatformReady;
    const port = platform
      ? await platform.openChapter({ chapter, keys: [CREATOR_INDEX] })
      : this.port;
    if (port) {
      port.saveArtifact({
        id: `creator-${this.project.id}-${chapter}`,
        title,
        mimeType: "application/json",
        data,
      });
      await port.flush();
    }
  }
}
export function publishProgress(p: CreatorProject, chapter: 10 | 11 | 13) {
  const e = p.evidence,
    flags =
      chapter === 10
        ? [
            e.sampling > 0,
            e.labelChecks > 0,
            e.splitChecks > 0,
            e.baselineRuns > 0,
            e.datasetShared > 0,
          ]
        : chapter === 11
          ? [
              e.forwardRuns > 0,
              e.gradientRuns > 0,
              p.models.some((m) => m.owner === 11 && m.model.steps > 0),
              e.structureComparisons > 0,
              p.models.some((m) => m.owner === 11 && m.sealed),
            ]
          : [
              e.briefConfirmed > 0,
              e.graphEdits > 0,
              p.runs.some((r) => r.status === "complete"),
              p.runs.some((r) => r.verdict === "pass" || r.verdict === "fail"),
              p.releases.length > 0,
            ];
  let completed = flags.filter(Boolean).length;
  try {
    const raw = localStorage.getItem(`nova-chapter-progress-v1:${chapter}`);
    if (raw) {
      const old = JSON.parse(raw);
      if (
        old.total === 5 &&
        Number.isInteger(old.completed) &&
        old.completed >= 0 &&
        old.completed <= 5
      )
        completed = Math.max(completed, old.completed);
    }
  } catch {
    /* Historical summaries never override validated project data. */
  }
  window.dispatchEvent(
    new CustomEvent("nova:progress", {
      detail: {
        chapter,
        completed,
        total: 5,
        pathLabel:
          chapter === 10
            ? "数据检视 · 历史完成保留"
            : chapter === 11
              ? "网络训练 · 历史完成保留"
              : "AI创作 · 历史完成保留",
        artifactCount:
          chapter === 13
            ? p.releases.length
            : p.models.filter((m) => m.owner === chapter).length,
      },
    }),
  );
}
export function chapterURL(chapter: number, projectId?: string): string {
  const url = new URL(
    `/chapters/${String(chapter).padStart(2, "0")}/`,
    location.href,
  );
  url.searchParams.set("novaChapter", String(chapter));
  url.searchParams.set(
    "novaReturn",
    new URL(`/courses/?chapter=${chapter}`, url).href,
  );
  if (projectId) url.searchParams.set("project", projectId);
  return url.href;
}
