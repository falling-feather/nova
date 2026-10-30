import { CLASS_IDS } from './samples.ts';
import type { ClassId } from './samples.ts';

export interface PixelImage { width: number; height: number; data: ArrayLike<number>; }
export type FeatureMode = 'color' | 'shape' | 'color-shape';
export interface TrainConfig { featureMode: FeatureMode; epochs: number; learningRate: number; }
export interface TrainingSample { id: string; groupId: string; label: ClassId; image: PixelImage; }
export interface ClassifierModel {
  schema: 'nova-pixel-classifier'; version: 1; extractor: 'pixel-grid-v1';
  classes: ClassId[]; featureMode: FeatureMode;
  normalization: { mean: number[]; std: number[] };
  weights: number[][];
  training: { sampleCount: number; epochs: number; learningRate: number; regularization: number; };
}
export interface Prediction { label: ClassId; confidence: number; probabilities: number[]; }
export interface EvaluationRow extends Omit<Prediction, 'label'> { id: string; groupId: string; label: ClassId; predicted: ClassId; }
export interface EvaluationReport { total: number; correct: number; accuracy: number; confusion: number[][]; perClass: { label: ClassId; total: number; correct: number; recall: number | null; }[]; rows: EvaluationRow[]; }
export interface LossPoint { epoch: number; loss: number; }
export const FEATURE_NAMES: Record<FeatureMode, string> = { color: '颜色线索', shape: '轮廓与网格', 'color-shape': '颜色＋轮廓' };
export function featureCount(mode: FeatureMode): number { return mode === 'color' ? 6 : mode === 'shape' ? 20 : 26; }

export function validateImage(image: PixelImage): void {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 8 || image.height < 8 || image.width > 512 || image.height > 512 || !image.data || image.data.length !== image.width * image.height * 4) throw new Error('像素图像尺寸或RGBA字节数量不正确（8至512像素）。');
  for (let i = 0; i < image.data.length; i++) if (!Number.isFinite(image.data[i]) || image.data[i] < 0 || image.data[i] > 255) throw new Error('像素必须是0至255的有限数值。');
}

/** Frozen, hand-written feature extractor: border color, object color and a 4×4 contour grid. No labels are read. */
export function extractFeatures(image: PixelImage, mode: FeatureMode): number[] {
  validateImage(image);
  if (!['color', 'shape', 'color-shape'].includes(mode)) throw new Error('不支持的特征提取模式。');
  const { width, height, data } = image;
  const bg = [0, 0, 0]; let borderCount = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (x < 2 || y < 2 || x >= width - 2 || y >= height - 2) {
    const p = (y * width + x) * 4;
    for (let c = 0; c < 3; c++) bg[c] += data[p + c];
    borderCount++;
  }
  for (let c = 0; c < 3; c++) bg[c] /= borderCount;
  const mask = new Uint8Array(width * height), fg = [0, 0, 0];
  let count = 0, minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4;
    const distance = Math.sqrt((data[p] - bg[0]) ** 2 + (data[p + 1] - bg[1]) ** 2 + (data[p + 2] - bg[2]) ** 2);
    if (distance > 55 && data[p + 3] > 128) {
      mask[y * width + x] = 1; count++;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (let c = 0; c < 3; c++) fg[c] += data[p + c];
    }
  }
  const color = [...fg.map(c => c / Math.max(1, count) / 255), ...bg.map(c => c / 255)];
  const shape = Array<number>(20).fill(0);
  if (count) {
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const binCount = Array<number>(16).fill(0);
    let edges = 0;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const bin = Math.min(3, Math.floor((y - minY) / bh * 4)) * 4 + Math.min(3, Math.floor((x - minX) / bw * 4));
      binCount[bin]++; shape[bin] += mask[y * width + x];
      if (mask[y * width + x] && (!mask[y * width + x - 1] || !mask[y * width + x + 1] || !mask[(y - 1) * width + x] || !mask[(y + 1) * width + x])) edges++;
    }
    for (let i = 0; i < 16; i++) shape[i] /= Math.max(1, binCount[i]);
    shape[16] = bw / Math.max(bw, bh); shape[17] = bh / Math.max(bw, bh);
    shape[18] = count / (bw * bh); shape[19] = edges / count;
  }
  return mode === 'color' ? color : mode === 'shape' ? shape : [...color, ...shape];
}

export function softmax(logits: number[]): number[] {
  const max = Math.max(...logits), exponentials = logits.map(x => Math.exp(x - max));
  const sum = exponentials.reduce((a, b) => a + b, 0);
  return exponentials.map(x => x / sum);
}
function forward(weights: number[][], x: number[]): number[] { return softmax(weights.map(row => row.at(-1)! + x.reduce((sum, value, j) => sum + value * row[j], 0))); }
function normalized(model: ClassifierModel, features: number[]): number[] { return features.map((x, i) => (x - model.normalization.mean[i]) / model.normalization.std[i]); }

export function validateConfig(config: TrainConfig): void {
  if (!config || !['color', 'shape', 'color-shape'].includes(config.featureMode) || !Number.isInteger(config.epochs) || config.epochs < 20 || config.epochs > 1000 || !Number.isFinite(config.learningRate) || config.learningRate < 0.001 || config.learningRate > 0.5) throw new Error('训练配置超出范围：20至1000轮，学习率0.001至0.5。');
}

export function trainClassifier(samples: TrainingSample[], config: TrainConfig): { model: ClassifierModel; losses: LossPoint[] } {
  validateConfig(config);
  if (samples.length < 6 || samples.length > 600 || CLASS_IDS.some(label => !samples.some(s => s.label === label)) || samples.some(s => !CLASS_IDS.includes(s.label))) throw new Error('训练袋至少需要6张样本，且三类都要有样本（上限600张）。');
  const features = samples.map(s => extractFeatures(s.image, config.featureMode));
  const dimension = features[0].length;
  const mean = Array.from({ length: dimension }, (_, i) => features.reduce((s, row) => s + row[i], 0) / samples.length);
  const std = mean.map((m, i) => Math.max(0.03, Math.sqrt(features.reduce((s, row) => s + (row[i] - m) ** 2, 0) / samples.length)));
  const inputs = features.map(row => row.map((v, i) => (v - mean[i]) / std[i]));
  const weights = CLASS_IDS.map(() => Array<number>(dimension + 1).fill(0));
  const regularization = 0.001;
  const losses: LossPoint[] = [];
  for (let epoch = 0; epoch <= config.epochs; epoch++) {
    const gradient = weights.map(row => row.map(() => 0)); let loss = 0;
    for (let n = 0; n < samples.length; n++) {
      const probabilities = forward(weights, inputs[n]), target = CLASS_IDS.indexOf(samples[n].label);
      loss -= Math.log(Math.max(1e-15, probabilities[target]));
      for (let c = 0; c < 3; c++) {
        const delta = probabilities[c] - Number(c === target);
        for (let j = 0; j < dimension; j++) gradient[c][j] += delta * inputs[n][j];
        gradient[c][dimension] += delta;
      }
    }
    if (epoch % 10 === 0 || epoch === config.epochs) losses.push({ epoch, loss: loss / samples.length });
    if (epoch === config.epochs) break;
    for (let c = 0; c < 3; c++) for (let j = 0; j <= dimension; j++) weights[c][j] -= config.learningRate * (gradient[c][j] / samples.length + (j < dimension ? regularization * weights[c][j] : 0));
  }
  const model: ClassifierModel = {
    schema: 'nova-pixel-classifier', version: 1, extractor: 'pixel-grid-v1', classes: [...CLASS_IDS], featureMode: config.featureMode,
    normalization: { mean, std }, weights, training: { sampleCount: samples.length, epochs: config.epochs, learningRate: config.learningRate, regularization },
  };
  validateModel(model);
  return { model, losses };
}

export function validateModel(value: unknown): asserts value is ClassifierModel {
  if (!value || typeof value !== 'object') throw new Error('分类模型缺失。');
  const model = value as ClassifierModel;
  if (model.schema !== 'nova-pixel-classifier' || model.version !== 1 || model.extractor !== 'pixel-grid-v1') throw new Error('分类模型版本或特征提取器不受支持。');
  if (!Array.isArray(model.classes) || model.classes.join(',') !== CLASS_IDS.join(',')) throw new Error('当前只支持铅笔、水杯、书本三类，顺序必须保持。');
  if (!['color', 'shape', 'color-shape'].includes(model.featureMode)) throw new Error('未知模型特征模式。');
  const dimension = featureCount(model.featureMode);
  const finiteArray = (v: unknown, length: number) => Array.isArray(v) && v.length === length && v.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e6);
  if (!model.normalization || !finiteArray(model.normalization.mean, dimension) || !finiteArray(model.normalization.std, dimension) || model.normalization.std.some(s => s < 0.03) || !Array.isArray(model.weights) || model.weights.length !== 3 || model.weights.some(row => !finiteArray(row, dimension + 1))) throw new Error('模型权重或归一化参数必须是正确维度的有限数值。');
  if (!model.training || !Number.isInteger(model.training.sampleCount) || model.training.sampleCount < 6 || model.training.sampleCount > 600 || model.training.regularization !== 0.001) throw new Error('模型训练记录无效。');
  validateConfig({ featureMode: model.featureMode, ...model.training });
}

/** Public pure inference API for chapter 13. Accepts Uint8ClampedArray or a serialized numeric RGBA array. */
export function predict(model: ClassifierModel, image: PixelImage): Prediction {
  validateModel(model);
  const probabilities = forward(model.weights, normalized(model, extractFeatures(image, model.featureMode)));
  const winner = probabilities.indexOf(Math.max(...probabilities));
  return { label: model.classes[winner], confidence: probabilities[winner], probabilities };
}

export function colorRule(image: PixelImage): Prediction {
  const features = extractFeatures(image, 'color').slice(0, 3);
  const anchors = [[183, 80, 32], [26, 113, 123], [111, 70, 155]];
  const distances = anchors.map(anchor => features.reduce((sum, v, i) => sum + (v - anchor[i] / 255) ** 2, 0));
  const probabilities = softmax(distances.map(d => -25 * d));
  const index = probabilities.indexOf(Math.max(...probabilities));
  return { label: CLASS_IDS[index], confidence: probabilities[index], probabilities };
}

export function evaluate(model: ClassifierModel | null, samples: TrainingSample[]): EvaluationReport {
  const confusion = CLASS_IDS.map(() => [0, 0, 0]);
  const rows: EvaluationRow[] = samples.map(sample => {
    const prediction = model ? predict(model, sample.image) : colorRule(sample.image);
    confusion[CLASS_IDS.indexOf(sample.label)][CLASS_IDS.indexOf(prediction.label)]++;
    return { id: sample.id, groupId: sample.groupId, label: sample.label, predicted: prediction.label, confidence: prediction.confidence, probabilities: prediction.probabilities };
  });
  const correct = rows.filter(s => s.label === s.predicted).length;
  return { total: rows.length, correct, accuracy: rows.length ? correct / rows.length : 0, confusion, rows, perClass: CLASS_IDS.map((label, i) => {
    const total = confusion[i].reduce((s, v) => s + v, 0), correct = confusion[i][i];
    return { label, total, correct, recall: total ? correct / total : null };
  }) };
}
