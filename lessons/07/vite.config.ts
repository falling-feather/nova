import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  cacheDir: '.work/vite-cache',
  server: { fs: { allow: ["../.."] }, watch: { ignored: ["**/.work/**", "**/tmp/**"] } },
  build: { rollupOptions: { output: { manualChunks: (id: string) => id.includes("node_modules/three") ? "three" : undefined } } },
});
