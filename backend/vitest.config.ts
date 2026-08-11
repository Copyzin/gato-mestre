import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // PGlite (wasm) leva alguns segundos para subir na primeira vez
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
