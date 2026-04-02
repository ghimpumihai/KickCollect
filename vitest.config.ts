import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**", ".next/**"],
    setupFiles: ["./__tests__/setup.ts"],
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      all: true,
      include: [
        "lib/services/**/*.ts",
        "lib/validation/**/*.ts",
        "app/collection/page.tsx",
        "app/card/*/page.tsx",
      ],
    },
  },
});
