export interface PersonalUser { id: string; username: string; displayName: string }
export interface PlatformStatus {
  user: PersonalUser | null; online: boolean; supported: boolean; fenced: boolean;
  message: string; storageError: string; pending: number; conflicts: number[];
}
export interface PersonalArtifact {
  id: string; title: string; mimeType: 'application/json' | 'text/html' | 'text/plain' | 'image/png';
  /** PNG uses a data:image/png;base64,... URL; other formats use their original export text. */
  data: string;
}
export interface ChapterPayload {
  records: Record<string, string | null>;
  /** The unchanged encoded nova-chapter-progress v1 summary. */
  summary: string | null;
  artifacts: Record<string, PersonalArtifact>;
}
export interface ChapterStoragePort extends Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  flush(): Promise<PlatformStatus>;
  saveArtifact(artifact: PersonalArtifact): void;
}
export interface ChapterListing {
  chapter: number; revision?: number; updatedAt?: number; summary: string | null;
  recordCount: number; artifacts: Omit<PersonalArtifact, 'data'>[];
  pending?: boolean; conflict?: boolean; recoveryCount?: number;
}
export interface NovaPlatformClient {
  ready: Promise<PlatformStatus>;
  openChapter(options: { chapter: number; keys: readonly string[]; validate?: (key: string, raw: string) => boolean }): Promise<ChapterStoragePort>;
  status(): PlatformStatus;
  sync(): Promise<PlatformStatus>;
  progressStorage(): Pick<Storage, 'getItem' | 'setItem'>;
  listChapters(): Promise<ChapterListing[]>;
  snapshot(chapter: number): Promise<ChapterPayload>;
  importRecords(chapter: number, records: ChapterPayload['records'], extra?: Pick<ChapterPayload, 'summary' | 'artifacts'>): Promise<PlatformStatus>;
  resolveConflict(chapter: number, choice: 'local' | 'remote'): Promise<void>;
  recoveries(chapter: number): Promise<{ payload: ChapterPayload; localRevision: number }[]>;
  register(input: { username: string; displayName: string; password: string }): Promise<{ user: PersonalUser; recoveryCode: string }>;
  login(input: { username: string; password: string }): Promise<{ user: PersonalUser }>;
  recover(input: { username: string; password: string; recoveryCode: string }): Promise<{ user: PersonalUser; recoveryCode: string }>;
  logout(): Promise<{ user: null }>;
}
declare global {
  interface Window {
    NovaPlatform?: NovaPlatformClient;
    NovaPlatformReady?: Promise<NovaPlatformClient | null>;
  }
}
