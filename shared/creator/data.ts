import {
  sampleImage,
  referenceLabel,
  CLASS_SHORT,
} from "../../lessons/10/src/samples.ts";
import { extractFeatures } from "../../lessons/10/src/model.ts";
import type { FeatureMode } from "../../lessons/10/src/model.ts";
import type { ProjectState } from "../../lessons/10/src/project.ts";
import type {
  CreatorProject,
  Dataset,
  DenseModel,
  NumericRow,
  PixelBuffer,
  SampleAsset,
  Split,
} from "./types.ts";
import { fitNormalization, normalize } from "./model.ts";
const images = new WeakMap<SampleAsset, PixelBuffer>(),
  features = new WeakMap<SampleAsset, Map<FeatureMode, number[]>>(),
  signatures = new WeakMap<SampleAsset, string>();
export function assetImage(asset: SampleAsset): PixelBuffer {
  if (asset.origin.kind === "pixels") return asset.origin.image;
  let image = images.get(asset);
  if (!image) {
    const raw = sampleImage(asset.origin.group, asset.origin.index);
    image = {
      width: raw.width,
      height: raw.height,
      data: Array.from(raw.data),
    };
    images.set(asset, image);
  }
  return image;
}
export function assetFeatures(asset: SampleAsset, mode: FeatureMode): number[] {
  let cache = features.get(asset);
  if (!cache) {
    cache = new Map();
    features.set(asset, cache);
  }
  let value = cache.get(mode);
  if (!value) {
    value = extractFeatures(assetImage(asset), mode);
    cache.set(mode, value);
  }
  return value;
}
export const splitOf = (dataset: Dataset, asset: SampleAsset) =>
  dataset.bags[asset.group];
export function activeAssets(
  p: CreatorProject,
  dataset = p.dataset,
): SampleAsset[] {
  return p.assets.filter(
    (a) =>
      dataset.labels[a.id] !== undefined && !dataset.excluded.includes(a.id),
  );
}
export function splitAssets(
  p: CreatorProject,
  split: Split,
  dataset = p.dataset,
): SampleAsset[] {
  return activeAssets(p, dataset).filter((a) => splitOf(dataset, a) === split);
}
export function datasetIssues(
  p: CreatorProject,
  dataset = p.dataset,
): string[] {
  const issues: string[] = [];
  if (dataset.classes.length < 2) issues.push("至少需要两个类别。");
  for (const split of ["train", "validation"] as const) {
    const rows = splitAssets(p, split, dataset);
    for (const c of dataset.classes)
      if (!rows.some((a) => dataset.labels[a.id] === c.id))
        issues.push(
          `${split === "train" ? "训练" : "验证"}资料缺少「${c.name}」。`,
        );
  }
  const signatures = new Map<string, { split: Split; label: string }>();
  for (const a of activeAssets(p, dataset)) {
    const key = assetSignature(a),
      split = splitOf(dataset, a),
      label = dataset.labels[a.id],
      previous = signatures.get(key);
    if (previous && previous.split !== split)
      issues.push("同一幅图出现在不同资料区：请把重复图归为同组或排除副本。");
    if (previous && previous.label !== label)
      issues.push("相同图像的标签发生冲突，请核对。");
    signatures.set(key, { split, label });
  }
  return [...new Set(issues)];
}
export function assetSignature(a: SampleAsset): string {
  const cached = signatures.get(a);
  if (cached) return cached;
  const pixels = assetImage(a);
  let hash = 2166136261;
  for (const value of [pixels.width, pixels.height, ...pixels.data])
    hash = Math.imul(hash ^ value, 16777619);
  const result = (hash >>> 0).toString(16);
  signatures.set(a, result);
  return result;
}
export function datasetFingerprint(dataset: Dataset): string {
  let h = 2166136261;
  const raw = JSON.stringify([
    dataset.classes,
    Object.entries(dataset.labels).sort(),
    Object.entries(dataset.bags).sort(),
    [...dataset.excluded].sort(),
  ]);
  for (const c of raw) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16);
}
export function numericRows(
  p: CreatorProject,
  model: Pick<DenseModel, "featureMode" | "mean" | "std" | "classes">,
  split: Split,
  dataset = p.dataset,
): NumericRow[] {
  return splitAssets(p, split, dataset).map((a) => ({
    id: a.id,
    label: model.classes.findIndex((c) => c.id === dataset.labels[a.id]),
    x: normalize(model, assetFeatures(a, model.featureMode)),
  }));
}
export function prepareTraining(
  p: CreatorProject,
  mode: FeatureMode,
  dataset = p.dataset,
) {
  const issues = datasetIssues(p, dataset);
  if (issues.length) throw Error(issues[0]);
  const raw = splitAssets(p, "train", dataset).map((a) =>
    assetFeatures(a, mode),
  );
  const scale = fitNormalization(raw);
  const spec = { ...scale, featureMode: mode, classes: dataset.classes };
  return {
    ...scale,
    train: numericRows(p, spec, "train", dataset),
    validation: numericRows(p, spec, "validation", dataset),
  };
}
export function moveGroup(p: CreatorProject, group: string, split: Split) {
  if (!p.assets.some((a) => a.group === group)) throw Error("找不到这组资料。");
  if (p.dataset.bags[group] === split) return false;
  p.dataset.bags[group] = split;
  p.dataset.revision++;
  if (split !== "test" && !p.seenGroups.includes(group))
    p.seenGroups.push(group);
  return true;
}
export function referenceFor(asset: SampleAsset): string | null {
  return asset.origin.kind === "synthetic"
    ? referenceLabel(asset.origin.index)
    : null;
}
export function appendLegacyDataset(
  p: CreatorProject,
  source: ProjectState,
  datasetSource: Pick<
    ProjectState,
    "groups" | "labels" | "assignments"
  > = source,
): Dataset {
  const prefix = `ch10-${source.createdAt.replace(/\D/g, "")}`,
    labels: Record<string, string> = {},
    bags: Record<string, Split> = {};
  for (const group of datasetSource.groups) {
    const groupId = `${prefix}-${group.id}`;
    bags[groupId] = datasetSource.assignments[group.id];
    for (let index = 0; index < 6; index++) {
      const original = `${group.id}-${referenceLabel(index)}-${(index % 2) + 1}`,
        id = `${prefix}-${original}`;
      labels[id] = datasetSource.labels[original] ?? referenceLabel(index);
      if (!p.assets.some((a) => a.id === id))
        p.assets.push({
          id,
          group: groupId,
          source: "第十章 · 合成教学图样",
          origin: { kind: "synthetic", group: structuredClone(group), index },
        });
    }
  }
  return {
    revision: source.dataRevision,
    classes: Object.entries(CLASS_SHORT).map(([id, name]) => ({ id, name })),
    labels,
    bags,
    excluded: [],
    reviewed: [],
  };
}
