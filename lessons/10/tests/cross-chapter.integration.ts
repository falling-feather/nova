import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createProject, confirmSplit, trainVersion, exportArtifact, recordComparison, comparisonPreview } from '../src/project.ts';
import { predict } from '../src/model.ts';
import { unknownImage } from '../src/samples.ts';

test('the original chapter 13 adapter imports new workshop evidence and runs the one authoritative classifier', async () => {
  const adapter = process.env.NOVA_CHAPTER13_ADAPTER ? pathToFileURL(resolve(process.env.NOVA_CHAPTER13_ADAPTER)) : new URL('../../13/src/foreign.ts', import.meta.url);
  const source = await readFile(adapter, 'utf8');
  const moduleUrl = (text: string) => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
  const classifier = moduleUrl(`export const available=true;export {predict,validateModel,validateImage} from ${JSON.stringify(new URL('../src/model.ts', import.meta.url).href)};export {importArtifact} from ${JSON.stringify(new URL('../src/project.ts', import.meta.url).href)};export {CLASS_NAMES} from ${JSON.stringify(new URL('../src/samples.ts', import.meta.url).href)};`);
  // Only virtual module bindings change in memory. The consumer adapter stays original.
  const runtime = stripTypeScriptTypes(source).replace('virtual:nova-chapter10', classifier).replace('virtual:nova-chapter12', moduleUrl('export const available=false;'));
  const foreign = await import(moduleUrl(runtime));
  const project = createProject(); project.mission.confirmed = true; project.config.featureMode = 'shape'; confirmSplit(project);
  const version = trainVersion(project), comparison = comparisonPreview(project, null, version.id);
  recordComparison(project, null, version.id, comparison.outcome, 'keep', '轮廓在换色材料上仍有效');
  const artifact = exportArtifact(project), session = foreign.inspectClassifier(artifact);
  for (const sample of artifact.payload.demoSamples) {
    const result = foreign.runClassifier(session, sample.image, sample.id, sample.label);
    const original = predict(version.model, sample.image);
    assert.equal(result.label, original.label); assert.equal(result.confidence, original.confidence); assert.deepEqual(result.probabilities, original.probabilities);
  }
  const image = unknownImage(); const unknown = foreign.runClassifier(session, { ...image, data: Array.from(image.data) }, 'unknown', null);
  assert.deepEqual(unknown.probabilities, predict(version.model, image).probabilities);
});
