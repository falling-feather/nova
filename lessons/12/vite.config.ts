import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  cacheDir: '.work/vite-cache',
  server: { fs: { allow: ["../.."] }, watch: { ignored: ['**/.work/**', '**/tmp/**'] } },
  build: { target: 'es2022' },
});
