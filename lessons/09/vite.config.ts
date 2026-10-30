import { defineConfig, type ViteDevServer, type PreviewServer } from 'vite';
// 独立章没有平台服务。返回真实404，让共享客户端走已规定的游客路径；不返回SPA的HTML给脚本。
const standaloneServices = (server: ViteDevServer | PreviewServer) => {
  server.middlewares.use((request, response, next) => {
    if (/^\/(platform\/|api(?:\/|$))/.test(request.url ?? '')) {
      response.statusCode = 404;
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end('Standalone chapter: platform service is not mounted.');
    } else next();
  });
};
export default defineConfig({
  base: './',
  cacheDir: '.work/vite-cache',
  plugins: [{ name: 'standalone-services', configureServer: standaloneServices, configurePreviewServer: standaloneServices }],
  server: { fs: { allow: ["../.."] }, watch: { ignored: ['**/design/**', '**/docs/**', '**/tmp/**', '**/.work/**'] } },
});
