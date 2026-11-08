import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Unit tests for the TypeScript cores (*.test.ts, Node environment) and the React demos
// (*.test.tsx, jsdom environment via the `@vitest-environment jsdom` docblock in each file).
export default defineConfig({
  plugins: [react()],
  test: {
    include: ["patterns/**/typescript/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["patterns/**/typescript/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "**/main.ts"],
      reporter: ["text", ["text-summary", { file: "summary.txt" }]],
      reportsDirectory: "./coverage",
    },
  },
});
