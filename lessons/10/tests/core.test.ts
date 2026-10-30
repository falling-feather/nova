import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFeatures, trainClassifier, predict, validateModel, evaluate } from '../src/model.ts';
import { makeGroup, sampleImage, samplesForGroups, CLASS_IDS } from '../src/samples.ts';
import { createProject, assignGroup, confirmSplit, trainVersion, sealVersion, openFinalTest, addCollection, createFreshTest, setSampleLabel, validateProject, exportArtifact, importArtifact, keepEvidence, failureCaseCount } from '../src/project.ts';

test('features come from rendered pixels; repeated generation and training are reproducible', () => {
  const group = makeGroup('one', 42, 'studio');
  const image = sampleImage(group, 0);
  assert.deepEqual(image, sampleImage(group, 0));
  const changed = { ...image, data: Array.from(image.data, (_, i) => i % 4 === 3 ? 255 : 230) };
  assert.notDeepEqual(extractFeatures(image, 'color-shape'), extractFeatures(changed, 'color-shape'));
  const samples = samplesForGroups([group, makeGroup('two', 54, 'studio')]);
  const config = { featureMode: 'color-shape' as const, epochs: 180, learningRate: 0.08 };
  const a = trainClassifier(samples, config);
  const b = trainClassifier(samples, config);
  assert.deepEqual(a.model, b.model);
  assert.ok(a.losses.at(-1)!.loss < a.losses[0].loss);
  assert.ok(evaluate(a.model, samples).accuracy > 0.8);
  const reversed = samples.map(s => ({ ...s, label: CLASS_IDS[(CLASS_IDS.indexOf(s.label) + 1) % 3] }));
  assert.notDeepEqual(trainClassifier(reversed, config).model.weights, a.model.weights);
  assert.equal(predict(a.model, image).probabilities.reduce((a, b) => a + b, 0).toFixed(8), '1.00000000');
});

test('group moves are atomic and training excludes validation and sealed final samples', () => {
  const project = createProject();
  project.mission.confirmed = true;
  const trainId = project.groups.find(g => project.assignments[g.id] === 'train')!.id;
  assignGroup(project, trainId, 'validation');
  const group = project.groups.find(g => g.id === trainId)!;
  const all = samplesForGroups([group]);
  assert.ok(all.every(s => project.assignments[s.groupId] === 'validation'));
  confirmSplit(project);
  const version = trainVersion(project);
  const expected = samplesForGroups(project.groups.filter(g => project.assignments[g.id] === 'train'), project.labels);
  assert.deepEqual(version.model.normalization, trainClassifier(expected, project.config).model.normalization);
  assert.equal(version.training.total, expected.length);
  assert.ok(!version.training.rows.some(s => project.assignments[s.groupId] === 'test'));
});

test('final test requires a frozen version, preserves old reports, and exposes used test groups', () => {
  const project = createProject();
  project.mission.confirmed = true;
  confirmSplit(project);
  const version = trainVersion(project);
  assert.throws(() => openFinalTest(project, version.id), /封存/);
  sealVersion(project, version.id);
  const first = openFinalTest(project, version.id);
  assert.equal(first.independent, true);
  const frozen = structuredClone(version);
  addCollection(project, 'mixed');
  confirmSplit(project);
  const v2 = trainVersion(project);
  sealVersion(project, v2.id);
  assert.equal(openFinalTest(project, v2.id).independent, false);
  assert.deepEqual(version, frozen);
  createFreshTest(project);
  confirmSplit(project);
  const v3 = trainVersion(project);
  sealVersion(project, v3.id);
  assert.equal(openFinalTest(project, v3.id).independent, true);
});

test('label changes make a new dataset revision and never rewrite trained weights', () => {
  const project = createProject();
  project.mission.confirmed = true;
  confirmSplit(project);
  const version = trainVersion(project);
  const model = structuredClone(version.model);
  const sample = version.training.rows[0];
  const revision = project.dataRevision;
  setSampleLabel(project, sample.id, sample.label === 'book' ? 'cup' : 'book');
  assert.equal(project.dataRevision, revision + 1);
  assert.deepEqual(version.model, model);
  assert.throws(() => trainVersion(project), /确认.*分袋/);
});

test('invalid numbers, dimensions, groups and artifact versions fail visibly', () => {
  const project = createProject();
  project.mission.confirmed = true;
  confirmSplit(project);
  trainVersion(project);
  const artifact = exportArtifact(project);
  const restored = importArtifact(JSON.stringify(artifact));
  assert.deepEqual(restored.versions[0].model, project.versions[0].model);
  const badModel = structuredClone(project.versions[0].model);
  badModel.weights[0][0] = NaN;
  assert.throws(() => validateModel(badModel), /有限/);
  assert.throws(() => predict(project.versions[0].model, { width: 64, height: 64, data: [] }), /像素/);
  const badProject = structuredClone(project);
  badProject.groups.push(badProject.groups[0]);
  assert.throws(() => validateProject(badProject), /重复/);
  assert.throws(() => importArtifact(JSON.stringify({ ...artifact, version: 99 })), /版本/);
  const contaminated = structuredClone(project);
  contaminated.versions[0].snapshot.assignments[contaminated.versions[0].training.rows[0].groupId] = 'test';
  assert.throws(() => validateProject(contaminated), /训练.*袋/);
  const madeUpReport = structuredClone(project);
  madeUpReport.versions[0].validation.correct = madeUpReport.versions[0].validation.total;
  madeUpReport.versions[0].validation.accuracy = 1;
  assert.throws(() => validateProject(madeUpReport), /成绩.*输出/);
  const copiedObject = structuredClone(project);
  copiedObject.groups[1].seed = copiedObject.groups[0].seed;
  assert.throws(() => validateProject(copiedObject), /重复.*物件/);
  assert.throws(() => importArtifact(JSON.stringify({ ...artifact, title: undefined })), /标题/);
});

test('a real color shortcut fails on changed colors and a new shape version improves it', () => {
  const project = createProject();
  project.mission.confirmed = true;
  confirmSplit(project);
  const v1 = trainVersion(project);
  assert.ok(v1.training.accuracy > 0.9);
  assert.ok(v1.validation.accuracy < v1.training.accuracy);
  assert.ok(v1.validation.rows.filter(s => s.label !== s.predicted).length >= 2);
  addCollection(project, 'mixed');
  project.config.featureMode = 'shape';
  confirmSplit(project);
  const v2 = trainVersion(project);
  assert.ok(v2.validation.accuracy > v1.validation.accuracy);
  assert.equal(v1.model.featureMode, 'color');
  assert.equal(v2.model.featureMode, 'shape');
});

test('two consecutive photos of one object remain one failure case', () => {
  const project = createProject();
  project.mission.confirmed = true; confirmSplit(project);
  const v1 = trainVersion(project);
  const failures = v1.validation.rows.filter(row => row.predicted !== row.label);
  keepEvidence(project, v1.id, failures[0]);
  keepEvidence(project, v1.id, failures[1]);
  assert.equal(project.evidence.length, 2);
  assert.equal(failureCaseCount(project), 1);
  keepEvidence(project, v1.id, failures[2]);
  assert.equal(failureCaseCount(project), 2);
  const duplicate = structuredClone(project);
  duplicate.evidence.push(duplicate.evidence[0]);
  assert.throws(() => validateProject(duplicate), /重复.*证据/);
});

test('bad collection counters fail before moving or adding any existing group', () => {
  const project = createProject();
  addCollection(project, 'mixed');
  project.nextCollection = 1;
  assert.throws(() => validateProject(project), /计数器/);
  const before = structuredClone(project);
  assert.throws(() => addCollection(project, 'mixed'), /计数器/);
  assert.deepEqual(project, before);
  project.nextCollection = 2;
  createFreshTest(project);
  project.nextTest = 1;
  assert.throws(() => validateProject(project), /计数器/);
  const frozen = structuredClone(project);
  assert.throws(() => createFreshTest(project), /计数器/);
  assert.deepEqual(project, frozen);
});
