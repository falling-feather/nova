import { isPhotoData } from "./photo-format.ts";

/** Keep each photo once on disk while each immutable learning version retains
 * its own labels and feature vectors. Runtime state does not contain aliases. */
export function encodeSave(state: unknown): string {
  const images: string[] = [],
    indices = new Map<string, number>();
  const compact = JSON.parse(
    JSON.stringify(state, (key, value) => {
      if (key !== "image" || !isPhotoData(value)) return value;
      let index = indices.get(value);
      if (index === undefined) {
        index = images.length;
        images.push(value);
        indices.set(value, index);
      }
      return `@image:${index}`;
    }),
  );
  return JSON.stringify({
    format: "forest-media-table",
    storageVersion: 1,
    images,
    state: compact,
  });
}
export function decodeSave(raw: string): unknown {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== "object" || value === null || !("format" in value))
    return value;
  const record = value as Record<string, unknown>;
  if (
    record.format !== "forest-media-table" ||
    record.storageVersion !== 1 ||
    !Array.isArray(record.images) ||
    !record.images.every(isPhotoData)
  )
    throw new Error("不能读取这份存储格式");
  const images = record.images as string[];
  return JSON.parse(JSON.stringify(record.state), (key, reference) => {
    if (
      key !== "image" ||
      typeof reference !== "string" ||
      !reference.startsWith("@image:")
    )
      return reference;
    const index = Number(reference.slice(7));
    if (!Number.isInteger(index) || index < 0 || index >= images.length)
      throw new Error("图片索引不完整");
    return images[index];
  });
}
