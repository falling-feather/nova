import { readFile } from 'node:fs/promises';
import { createDefaultConfig, exportArtifact, validateArtifact, runToCompletion } from '../src/engine/index.ts';

async function main(): Promise<void> {
  const filename = process.argv[2];
  if (!filename) { console.error('用法：npm run run:artifact -- <第12章项目包.json>；或 --demo'); process.exitCode = 2; return; }
  const incoming: unknown = filename === '--demo'
    ? exportArtifact(createDefaultConfig(), [], { prediction: '', explanation: '', revision: '' })
    : JSON.parse(await readFile(filename, 'utf8'));
  const checked = validateArtifact(incoming);
  if (!checked.ok) { console.error(JSON.stringify({ valid: false, errors: checked.errors })); process.exitCode = 2; return; }
  // 从项目包的初始状态重新执行。旧证据只作回放，不能代替新的测试。
  const run = runToCompletion(checked.artifact.payload.config);
  console.log(JSON.stringify({ valid: true, engine: checked.artifact.payload.engine, status: run.status, stopReason: run.stopReason, final: run.environment.world, observation: run.observation, calls: run.calls, waterUsedMl: run.waterUsedMl }));
}

main().catch(error => { console.error(JSON.stringify({ valid: false, errors: [error instanceof Error ? error.message : String(error)] })); process.exitCode = 2; });
