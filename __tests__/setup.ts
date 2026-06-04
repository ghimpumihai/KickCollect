import "@testing-library/jest-dom/vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { vi } from "vitest";

const TEST_DB_URL_PATH = path.resolve(__dirname, "..", ".test-database-url");

if (existsSync(TEST_DB_URL_PATH)) {
  const databaseUrl = readFileSync(TEST_DB_URL_PATH, "utf8").trim();

  if (databaseUrl.length > 0) {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = databaseUrl;
    process.env.DIRECT_URL = databaseUrl;
    process.env.POSTGRES_PRISMA_URL = databaseUrl;
    process.env.POSTGRES_URL = databaseUrl;
    process.env.POSTGRES_URL_NON_POOLING = databaseUrl;
  }
}

vi.mock("@/lib/stores/user-insights-context", () => ({
  useUserInsights: () => ({
    preferences: { pageSize: 6 },
    setPageSizePreference: vi.fn(),
    activity: [],
    recordActivity: vi.fn(),
  }),
}));