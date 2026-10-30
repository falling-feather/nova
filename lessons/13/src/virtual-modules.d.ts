declare module 'virtual:nova-chapter12' {
  export const available: boolean;
  export function validateArtifact(value: unknown): { ok: true; artifact: unknown } | { ok: false; errors: string[] };
  export function validateConfig(value: unknown): string[];
  export function runToCompletion(config: unknown): unknown;
}
declare module 'virtual:nova-chapter10' {
  export const available: boolean;
  export function validateModel(value: unknown): void;
  export function validateImage(value: unknown): void;
  export function predict(model: unknown, image: unknown): unknown;
  export function importArtifact(raw: string): unknown;
  export const CLASS_NAMES: Record<string, string>;
}
