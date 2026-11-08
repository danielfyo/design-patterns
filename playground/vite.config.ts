import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

// The playground lives in /playground but renders the React demos that sit next to
// each pattern (patterns/**/typescript/*Demo.tsx), so Vite must be allowed to read the repo root.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  server: { fs: { allow: [repoRoot] } },
  build: { outDir: fileURLToPath(new URL("../dist/playground", import.meta.url)), emptyOutDir: true },
});
