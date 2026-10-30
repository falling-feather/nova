import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
const sharedFiles = new Set(['course-links.js', 'platform-client.js', 'storage-contract.js', 'storage-manifest.json']);
function standaloneAssets(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (pathname.startsWith('/platform/')) {
    const name = pathname.slice('/platform/'.length);
    if (!sharedFiles.has(name)) { next(); return; }
    res.setHeader('Content-Type', name.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/javascript; charset=utf-8');
    res.end(readFileSync(fileURLToPath(new URL(`../../shared/linkage/${name}`, import.meta.url)))); return;
  }
  // This preview serves the real public client, but has no identity service.
  // Explicit absence avoids Vite's HTML fallback being mistaken for an API reply.
  if (pathname.startsWith('/api/')) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: '独立预览未接入个人服务。' })); return; }
  next();
}
export default defineConfig({ base: './', cacheDir: '.work/vite-cache', server: { port: 5370, strictPort: true, host: '127.0.0.1', fs: { allow: ['../..'] }, watch: { ignored: ['**/.work/**', '**/dist/**'] } }, preview: { port: 5370, strictPort: true, host: '127.0.0.1' }, plugins: [{ name: 'chapter10-standalone-public-assets', configureServer: server => { server.middlewares.use(standaloneAssets); }, configurePreviewServer: server => { server.middlewares.use(standaloneAssets); } }] });
