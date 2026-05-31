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
    globalSetup: ["./__tests__/global-setup.ts"],
    setupFiles: ["./__tests__/setup.ts"],
    globals: true,
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      all: true,
      include: [
        "lib/auth/**/*.ts",
        "lib/client/**/*.ts",
        "lib/services/**/*.ts",
        "lib/server/**/*.ts",
        "lib/validation/**/*.ts",
        "app/api/**/*.ts",
        "app/auth/page.tsx",
        "app/collection/page.tsx",
        "app/card/*/page.tsx",
      ],
    },
  },
});
