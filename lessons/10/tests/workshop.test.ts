import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, previewCollection, addCollection, confirmSplit, trainVersion, comparisonPreview, recordComparison, recordBoundaryCheck, completedUnitFlags, sealVersion, openFinalTest, validateProject, exportArtifact, importArtifact, enableWorkshop, keepEvidence, completedUnits, runBaseline } from '../src/project.ts';
import { sampleImage, unknownImage } from '../src/samples.ts';
import { predict } from '../src/model.ts';
import { loadProject, writeProject, STORAGE_KEY, connectChapterStorage, browserProjectStorage } from '../src/storage.ts';
import type { PlatformStatus } from '../../../shared/linkage/platform-client';

function trained(mode: 'color' | 'shape' = 'shape') {
  const project = createProject();
  project.mission.confirmed = true;
  confirmSplit(project);
  project.config.featureMode = mode;
  const version = trainVersion(project);
  return { project, version };
}
test('a blank workshop has no completed learning evidence', () => {
  assert.deepEqual(completedUnitFlags(createProject()), [false, false, false, false, false]);
});

test('sampling preview is the exact next collection without consuming identity or changing history', () => {
  const project = createProject();
  const before = structuredClone(project);
  const preview = previewCollection(project, 'dim');
  assert.deepEqual(project, before);
  const actual = addCollection(project, 'dim');
  assert.deepEqual(actual, preview);
  assert.deepEqual(sampleImage(actual, 2), sampleImage(preview, 2));
  assert.equal(project.dataRevision, before.dataRevision + 1);
  assert.equal(project.splitConfirmedRevision, null);
});

test('a correct first version can finish research by an accurate comparison and a reasoned choice', () => {
  const { project, version } = trained();
  const comparison = comparisonPreview(project, null, version.id);
  assert.equal(version.validation.correct, version.validation.total);
  assert.equal(comparison.outcome, 'improved');
  assert.throws(() => recordComparison(project, null, version.id, 'worse', 'keep', '保留轮廓'), /读数/);
  assert.equal(project.research?.comparisons.length, 0);
  recordComparison(project, null, version.id, comparison.outcome, 'keep', '轮廓');
  assert.equal(project.versions.length, 1);
  assert.equal(project.evidence.length, 0);
  assert.equal(completedUnitFlags(project)[3], true);
  validateProject(project);
});

test('fair comparisons run both original models on the same frozen validation set', () => {
  const { project, version: first } = trained('color');
  const frozen = structuredClone(first);
  addCollection(project, 'mixed');
  project.config.featureMode = 'shape';
  confirmSplit(project);
  const second = trainVersion(project);
  const preview = comparisonPreview(project, first.id, second.id);
  recordComparison(project, first.id, second.id, preview.outcome, 'keep', '换色后仍能分清轮廓');
  const comparison = project.research!.comparisons[0];
  assert.deepEqual(comparison.before.rows.map(r => r.id), comparison.after.rows.map(r => r.id));
  assert.deepEqual(first, frozen);
  const forged = structuredClone(project);
  forged.research!.comparisons[0].before.rows[0].predicted = 'cup';
  forged.research!.comparisons[0].before.rows[0].probabilities = [0, 1, 0];
  assert.throws(() => validateProject(forged), /预测|成绩|报告/);
  assert.throws(() => comparisonPreview(project, first.id, first.id), /同一版本/);
});

test('identical valid comparisons update one record instead of farming evidence counts', () => {
  const { project, version } = trained();
  const preview = comparisonPreview(project, null, version.id);
  recordComparison(project, null, version.id, preview.outcome, 'keep', '轮廓');
  recordComparison(project, null, version.id, preview.outcome, 'revise', '补光照');
  assert.equal(project.research!.comparisons.length, 1);
  assert.equal(project.research!.comparisons[0].decision, 'revise');
  assert.throws(() => recordComparison(project, null, version.id, preview.outcome, 'keep', '  '), /依据/);
});

test('unknown-input handling records real prediction and manual takeover without changing its label', () => {
  const { project, version } = trained();
  sealVersion(project, version.id);
  openFinalTest(project, version.id);
  project.modelCard = { limits: '这是有限三类合成图片模型', humanTakeover: '范围外交给同学核对' };
  assert.equal(completedUnitFlags(project)[4], false);
  const actual = predict(version.model, unknownImage());
  recordBoundaryCheck(project, version.id, 'human');
  assert.deepEqual(project.research!.boundaryChecks[0].prediction, actual);
  assert.equal(completedUnitFlags(project)[4], true);
  const forged = structuredClone(project);
  forged.research!.boundaryChecks[0].prediction.confidence = 0;
  assert.throws(() => validateProject(forged), /范围|预测/);
  validateProject(project);
});

test('old artifacts validate before workshop upgrade and keep weights, evidence and completed facts', () => {
  const { project, version: first } = trained('color');
  delete project.research;
  const failures = first.validation.rows.filter(r => r.label !== r.predicted);
  [failures[0], failures[2]].forEach(r => keepEvidence(project, first.id, r));
  project.improvement = '换颜色的案例提示需要看轮廓';
  project.config.featureMode = 'shape';
  const second = trainVersion(project);
  sealVersion(project, second.id); openFinalTest(project, second.id);
  project.modelCard = { limits: '只用于三类合成教学图片', humanTakeover: '未知物件由同学核对' };
  const old = exportArtifact(project);
  const restored = importArtifact(JSON.stringify(old));
  assert.equal(restored.research, undefined);
  const frozen = structuredClone(restored.versions);
  const before = completedUnits(restored);
  enableWorkshop(restored);
  assert.equal(completedUnits(restored), before);
  assert.deepEqual(restored.versions, frozen);
  assert.deepEqual(importArtifact(JSON.stringify(exportArtifact(restored))).versions, frozen);
});
test('a legal old partial artifact stays partial after migration without inventing research or tests', () => {
  const { project } = trained('color'); delete project.research; runBaseline(project);
  const old = exportArtifact(project); assert.equal(old.evidence.completed, 3);
  const restored = importArtifact(JSON.stringify(old)); const frozen = structuredClone(restored.versions);
  enableWorkshop(restored); assert.equal(completedUnits(restored), 3);
  assert.deepEqual(restored.versions, frozen); assert.equal(restored.research!.comparisons.length, 0);
  assert.deepEqual(restored.research!.legacy, { analysis: null, delivery: null });
  assert.equal(exportArtifact(importArtifact(JSON.stringify(exportArtifact(restored)))).evidence.completed, 3);
});

test('storage owns read, decode and write; corrupt data and rejected writes stay observable', () => {
  const values = new Map([[STORAGE_KEY, '{broken']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const loaded = loadProject(storage);
  assert.equal(loaded.recoveryRaw, '{broken');
  assert.equal(loaded.blocked, true);
  assert.equal(values.get(STORAGE_KEY), '{broken');
  assert.ok(loaded.error);
  const blocked = { ...storage, setItem: () => { throw new Error('quota'); } };
  assert.equal(writeProject(blocked, createProject()).ok, false);
  assert.equal(values.get(STORAGE_KEY), '{broken');
  assert.equal(writeProject(storage, createProject()).ok, true);
  assert.equal(loadProject(storage).recoveryRaw, null);
  values.set(STORAGE_KEY, '');
  assert.equal(loadProject(storage).blocked, true);
  assert.equal(loadProject(storage).recoveryRaw, '');
});
test('platform storage waits for identity and readiness before opening, and initialization failure never falls back to guest', async () => {
  const status: PlatformStatus = { user: null, online: true, supported: true, fenced: false, message: '', storageError: '', pending: 0, conflicts: [] };
  let ready!: (status: PlatformStatus) => void; let opened = 0;
  const port = { getItem: (_key: string) => null, setItem: (_key: string, _raw: string) => {}, removeItem: (_key: string) => {}, flush: async () => status, saveArtifact: () => {} };
  const pending = new Promise<PlatformStatus>(resolve => { ready = resolve; });
  const opening = connectChapterStorage(Promise.resolve({ ready: pending, openChapter: async options => { opened++; assert.equal(options.chapter, 10); assert.deepEqual(options.keys, [STORAGE_KEY]); return port; } }));
  await Promise.resolve(); assert.equal(opened, 0); ready(status);
  assert.equal(await opening, port); assert.equal(opened, 1);
  assert.equal(await connectChapterStorage(undefined), browserProjectStorage);
  await assert.rejects(connectChapterStorage(Promise.resolve({ ready: Promise.resolve(status), openChapter: async () => { throw new Error('account stopped'); } })), /account stopped/);
});
test('exposed training, validation and opened test groups cannot erase their exposure ledger', () => {
  const { project, version } = trained();
  const missing = structuredClone(project); missing.seenGroups = [];
  assert.throws(() => validateProject(missing), /暴露|已见/);
  sealVersion(project, version.id); openFinalTest(project, version.id);
  project.seenGroups = project.seenGroups.filter(id => project.assignments[id] !== 'test');
  assert.throws(() => validateProject(project), /暴露|已见/);
});
