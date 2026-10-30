import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
// Integrated build uses the chapter's one authoritative engine. An isolated worktree
// can point to that engine read-only, while a standalone checkout remains buildable.
const workflowEntry = process.env.NOVA_CHAPTER12_ENGINE
  ? path.resolve(process.env.NOVA_CHAPTER12_ENGINE)
  : path.resolve(projectRoot, '../12/src/engine/index.ts');
const classifierEntry = process.env.NOVA_CHAPTER10_MODEL
  ? path.resolve(process.env.NOVA_CHAPTER10_MODEL)
  : path.resolve(projectRoot, '../10/src/model.ts');
const imports: Record<string, { entry: string; source: string; missing: string[] }> = {
  'virtual:nova-chapter12': { entry: workflowEntry, source: `export {validateArtifact,validateConfig,runToCompletion} from ${JSON.stringify(workflowEntry.replaceAll('\\', '/'))};`, missing: ['validateArtifact', 'validateConfig', 'runToCompletion'] },
  'virtual:nova-chapter10': { entry: classifierEntry, source: `export {validateModel,validateImage,predict} from ${JSON.stringify(classifierEntry.replaceAll('\\', '/'))};export {importArtifact} from ${JSON.stringify(path.join(path.dirname(classifierEntry), 'project.ts').replaceAll('\\', '/'))};export {CLASS_NAMES} from ${JSON.stringify(path.join(path.dirname(classifierEntry), 'samples.ts').replaceAll('\\', '/'))};`, missing: ['validateModel', 'validateImage', 'predict', 'importArtifact'] }
};
export default defineConfig({
  base: './', cacheDir: '.work/vite-cache',
  server: { fs: { allow: ["../.."] }, port: 5373, strictPort: true, host: '127.0.0.1', watch: { ignored: ['**/tmp/**', '**/.work/**'] } },
  plugins: [{
    name: 'nova-optional-chapter-runtimes',
    resolveId(id) { if (id in imports) return `\0${id}`; },
    load(id) {
      const entry = imports[id.slice(1)]; if (!entry) return;
      if (existsSync(entry.entry)) return `export const available = true;${entry.source}`;
      return `export const available=false;export const CLASS_NAMES={};const missing=()=>{throw new Error('前章运行器尚未接入')};export {${entry.missing.map(name => `missing as ${name}`).join(',')}};`;
    }
  }]
});
