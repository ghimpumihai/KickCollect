import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@/lib/stores/user-insights-context", () => ({
  useUserInsights: () => ({
    preferences: { pageSize: 6 },
    setPageSizePreference: vi.fn(),
    activity: [],
    recordActivity: vi.fn(),
  }),
}));