import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/editor/**/*.ts", "src/ui/**/*.ts"],
      exclude: ["src/**/index.ts"],
    },
  },
});
