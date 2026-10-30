import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const sourceRoot = process.env.NOVA_SOURCE_WORKSPACE || ownRoot;
const load = relative => import(pathToFileURL(path.join(sourceRoot, relative)).href);
const data = await load('lessons/10/src/project.ts');
const model = await load('lessons/10/src/model.ts');
const samples = await load('lessons/10/src/samples.ts');
const action = await load('lessons/12/src/engine/index.ts');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function trainedProject(featureMode = 'color') {
  const p = data.createProject(); p.mission.confirmed = true; p.config.featureMode = featureMode;
  data.confirmSplit(p); data.trainVersion(p); return p;
}

test('10: swapping object colors produces real mistakes; changing reference labels cannot alter inference', () => {
  const p = trainedProject(), version = p.versions[0];
  const group = samples.makeGroup('qa-unseen', 3297, 'mixed');
  const outputs = samples.CLASS_IDS.map((label, i) => ({ expected: label, ...model.predict(version.model, samples.sampleImage(group, i * 2)) }));
  assert.ok(outputs.some(r => r.label !== r.expected && r.confidence > 0.5), 'The color model must expose actual confident errors');
  const before = digest(version.model);
  data.setSampleLabel(p, samples.sampleId(p.groups[0], 0), 'book');
  assert.equal(digest(version.model), before, 'Editing a draft label must not retrain an archived version');
});

test('10: viewing a sealed group consumes independence even if the group is moved back', () => {
  const p = data.createProject(); p.mission.confirmed = true;
  const id = p.groups.find(g => p.assignments[g.id] === 'test').id;
  data.assignGroup(p, id, 'validation'); data.assignGroup(p, id, 'test');
  data.confirmSplit(p); const v = data.trainVersion(p); data.sealVersion(p, v.id);
  assert.equal(data.openFinalTest(p, v.id).independent, false);
});

test('10: new data and final reports preserve the old model, dataset and test result', () => {
  const p = trainedProject(); const v = p.versions[0]; data.sealVersion(p, v.id); data.openFinalTest(p, v.id);
  const before = digest(v);
  data.addCollection(p, 'mixed'); data.createFreshTest(p); data.confirmSplit(p); data.trainVersion(p);
  assert.equal(digest(v), before);
  const restored = data.importArtifact(JSON.stringify(data.exportArtifact(p)));
  assert.equal(digest(restored.versions[0]), before);
});

test('10: duplicate captures cannot become independent examples merely by receiving a different name', () => {
  const p = data.createProject(), original = p.groups[0];
  p.groups.push({ ...original, id: 'qa-copy-with-new-name' }); p.assignments['qa-copy-with-new-name'] = 'test';
  assert.throws(() => data.validateProject(p));
});

test('12: a completion statement changes the log, not the greenhouse', () => {
  const run = action.createRun(action.createDefaultConfig()); const before = digest(run.environment.world);
  action.recordStatement(run, '已经浇水完成');
  assert.equal(digest(run.environment.world), before);
  assert.equal(run.waterUsedMl, 0);
  assert.equal(run.status, 'running');
});

test('12: repeated request ID cannot water twice; a retry still counts as a tool call', () => {
  const run = action.createRun(action.createDefaultConfig());
  action.invokeManualTool(run, { tool: 'water', amount: 20, requestId: 'qa-retry' });
  const before = digest({ world: run.environment.world, water: run.waterUsedMl });
  const calls = run.calls;
  action.invokeManualTool(run, { tool: 'water', amount: 20, requestId: 'qa-retry' });
  assert.equal(digest({ world: run.environment.world, water: run.waterUsedMl }), before);
  assert.equal(run.calls, calls + 1);
  assert.equal(run.lastReceipt.duplicate, true);
  assert.equal(run.lastReceipt.applied, false);
});

test('12: an already satisfied goal needs a fresh observation and no watering', () => {
  const config = action.createDefaultConfig(); config.initial.moisture = 47; config.initial.temperature = 25;
  config.mode = 'planner';
  const run = action.runToCompletion(config);
  assert.equal(run.status, 'succeeded'); assert.equal(run.waterUsedMl, 0); assert.equal(run.calls, 1);
  assert.equal(run.logs.some(log => log.kind === 'action'), false);
});

test('12: a predefined workflow can verify an already satisfied goal without taking actions', () => {
  const config = action.createDefaultConfig(); config.initial.moisture = 47; config.initial.temperature = 25;
  const run = action.runToCompletion(config);
  assert.equal(run.status, 'succeeded'); assert.equal(run.waterUsedMl, 0);
  assert.ok(run.calls >= 1); assert.equal(run.logs.some(log => log.kind === 'action'), false);
});

test('12: blocked water remains a visible failure, not a simulated successful animation', () => {
  const config = action.createDefaultConfig(); config.faults.pumpBlocked = true;
  const run = action.runToCompletion(config);
  assert.notEqual(run.status, 'succeeded'); assert.equal(run.environment.world.moisture, config.initial.moisture);
  assert.equal(run.waterUsedMl, 0); assert.ok(run.logs.some(log => log.receipt && log.receipt.deliveredMl === 0));
});

test('12: exporting and checking a historical run keeps its original goal and world', () => {
  const config = action.createDefaultConfig(), run = action.runToCompletion(config);
  const before = digest(run.config); config.goal.moistureMin = 80;
  assert.equal(digest(run.config), before);
  const artifact = action.exportArtifact(run.config, [run], { prediction: '', explanation: '', revision: '' });
  const restored = action.validateArtifact(JSON.parse(JSON.stringify(artifact)));
  assert.equal(restored.ok, true);
  assert.equal(digest(restored.artifact.evidence.runs[0].config), before);
});
