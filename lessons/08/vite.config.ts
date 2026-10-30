import { defineConfig, type ViteDevServer } from "vite";
// 独立章端口没有平台服务；明确404，避免SPA回退HTML被当作平台脚本解析。
const independentPlatform=(server:Pick<ViteDevServer,"middlewares">)=>{
  server.middlewares.use("/platform",(_req,res)=>{res.statusCode=404;res.setHeader("Content-Type","text/plain; charset=utf-8");res.end("Platform is provided by the integrated hub.");});
};
export default defineConfig({
  base: "./",
  cacheDir: '.work/vite-cache',
  // 工作树通过只读 junction 复用依赖，资源 URL 应留在当前章节的开发服务内。
  resolve: { preserveSymlinks:true },
  server: { fs: { allow: ["../.."] }, watch: { ignored: ["**/.work/**"] } },
  worker: { format: "es" },
  optimizeDeps: { exclude: ["onnxruntime-web"] },
  build: { chunkSizeWarningLimit: 1200 },
  plugins:[{name:"tides-independent-port",configureServer:independentPlatform,configurePreviewServer:independentPlatform}],
});
