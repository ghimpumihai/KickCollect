import { beforeEach, describe, expect, it } from "vitest";

import { createMockCard } from "@/__tests__/factories";
import { GET, POST } from "@/app/api/cards/route";
import { getCardStore, resetCardStoreForTests } from "@/lib/server/card-store";
import type { CardEntry } from "@/types/card";

const BASE_URL = "http://localhost/api/cards";

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

beforeEach(() => {
  const cards: CardEntry[] = [
    createMockCard({ id: 1, player: "One" }),
    createMockCard({ id: 2, player: "Two" }),
    createMockCard({ id: 3, player: "Three" }),
    createMockCard({ id: 4, player: "Four" }),
  ];

  resetCardStoreForTests(cards);
});

describe("GET /api/cards", () => {
  it("returns paginated cards with metadata", async () => {
    const response = GET(new Request(`${BASE_URL}?page=2&pageSize=2`));
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
    const response = GET(new Request(`${BASE_URL}?page=0&pageSize=2`));
    const body = await readJson<{ error: string; issues?: string[] }>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed.");
    expect(body.issues).toContain("Page must be at least 1.");
  });
});

describe("POST /api/cards", () => {
  it("creates a card in server RAM and returns 201", async () => {
    const response = await POST(
      new Request(BASE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createValidCardPayload({ player: "Created Card", value: 22.5 })),
      }),
    );
    const body = await readJson<CardEntry>(response);

    expect(response.status).toBe(201);
    expect(body.id).toBe(5);
    expect(body.player).toBe("Created Card");
    expect(body.value).toBe("$22.50");
    expect(getCardStore().getById(5)).toEqual(body);
  });

  it("returns 400 when body validation fails", async () => {
    const response = await POST(
      new Request(BASE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createValidCardPayload({ player: "", year: 1800 })),
      }),
    );
    const body = await readJson<{ error: string; issues?: string[] }>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed.");
    expect(body.issues).toContain("Player name must be at least 2 characters.");
    expect(body.issues).toContain("Year must be 1900 or later.");
  });

  it("returns 400 for malformed JSON payloads", async () => {
    const response = await POST(
      new Request(BASE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-valid-json",
      }),
    );
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON body.");
  });
});
