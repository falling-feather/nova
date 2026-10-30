import { defineConfig } from "vite";
export default defineConfig({ server: { fs: { allow: ["../.."] } }, cacheDir: ".work/vite-cache", base: "./", build: { target: "es2022" } });
