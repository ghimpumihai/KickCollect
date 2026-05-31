import { beforeEach, describe, expect, it } from "vitest";

import { createAuthenticatedRequest, createTestUser, resetAuthState } from "@/__tests__/auth-helpers";
import { createMockCard } from "@/__tests__/factories";
import { GET, POST } from "@/app/api/cards/route";
import { getCardStore, resetCardStoreForTests } from "@/lib/server/card-store";
import type { CardEntry } from "@/types/card";

const BASE_URL = `${process.env.TEST_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"}/api/cards`;

function createValidCardPayload(overrides: Record<string, unknown> = {}) {
  const { id, ...payload } = createMockCard();
  void id;

  return {
    ...payload,
    ...overrides,
  };
}

function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

let testUser: Awaited<ReturnType<typeof createTestUser>>["user"];
let adminUser: Awaited<ReturnType<typeof createTestUser>>["user"];

beforeEach(async () => {
  await resetAuthState();
  const { user } = await createTestUser();
  testUser = user;
  const { user: admin } = await createTestUser({ role: "ADMIN" });
  adminUser = admin;
  const cards: CardEntry[] = [
    createMockCard({ id: 1, player: "One" }),
    createMockCard({ id: 2, player: "Two" }),
    createMockCard({ id: 3, player: "Three" }),
    createMockCard({ id: 4, player: "Four" }),
  ];

  await resetCardStoreForTests(testUser.id, cards);
  await resetCardStoreForTests(adminUser.id, cards);
});

describe("GET /api/cards", () => {
  it("returns paginated cards with metadata", async () => {
    const response = await GET(await createAuthenticatedRequest(`${BASE_URL}?page=2&pageSize=2`, {}, { user: testUser }));
    const body = await readJson<{
      items: CardEntry[];
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(2);
    expect(body.totalItems).toBe(4);
    expect(body.totalPages).toBe(2);
    expect(body.items.map((card) => card.id)).toEqual([3, 4]);
  });

  it("returns 400 when pagination query is invalid", async () => {
    const response = await GET(await createAuthenticatedRequest(`${BASE_URL}?page=0&pageSize=2`, {}, { user: testUser }));
    const body = await readJson<{ error: string; issues?: string[] }>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed.");
    expect(body.issues).toContain("Page must be at least 1.");
  });
});

describe("POST /api/cards", () => {
  it("creates a card in the database and returns 201", async () => {
    const response = await POST(
      await createAuthenticatedRequest(BASE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createValidCardPayload({ player: "Created Card", value: 22.5 })),
      }, { user: adminUser }),
    );
    const body = await readJson<CardEntry>(response);

    expect(response.status).toBe(201);
    expect(body.id).toBe(5);
    expect(body.player).toBe("Created Card");
    expect(body.value).toBe("$22.50");
    expect(await getCardStore().getById(adminUser.id, 5)).toEqual(body);
  });

  it("filters cards by search term", async () => {
    const response = await GET(await createAuthenticatedRequest(`${BASE_URL}?search=three`, {}, { user: testUser }));
    const body = await readJson<{ items: CardEntry[] }>(response);

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].player).toBe("Three");
  });

  it("returns 400 when body validation fails", async () => {
    const response = await POST(
      await createAuthenticatedRequest(BASE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createValidCardPayload({ player: "", year: 1800 })),
      }, { user: adminUser }),
    );
    const body = await readJson<{ error: string; issues?: string[] }>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed.");
    expect(body.issues).toContain("Player name must be at least 2 characters.");
    expect(body.issues).toContain("Year must be 1900 or later.");
  });

  it("returns 400 for malformed JSON payloads", async () => {
    const response = await POST(
      await createAuthenticatedRequest(BASE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-valid-json",
      }, { user: adminUser }),
    );
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON body.");
  });

  it("returns 403 when a non-admin creates a card", async () => {
    const response = await POST(
      await createAuthenticatedRequest(BASE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createValidCardPayload({ player: "Blocked Card" })),
      }, { user: testUser }),
    );
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(403);
    expect(body.error).toBe("Only admins can add cards.");
  });

  it("returns 401 without an authenticated session", async () => {
    const response = await GET(new Request(BASE_URL));
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication required.");
  });
});
