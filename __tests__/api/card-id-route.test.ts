import { beforeEach, describe, expect, it } from "vitest";

import { createMockCard } from "@/__tests__/factories";
import { DELETE, GET, PUT } from "@/app/api/cards/[id]/route";
import { getCardStore, resetCardStoreForTests } from "@/lib/server/card-store";
import type { CardEntry } from "@/types/card";

const BASE_URL = `${process.env.TEST_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"}/api/cards`;

function createRouteContext(id: string) {
  return {
    params: Promise.resolve({ id }),
  };
}

function createValidCardUpdate(overrides: Record<string, unknown> = {}) {
  return {
    player: "Updated Player",
    ...overrides,
  };
}

function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

beforeEach(async () => {
  await resetCardStoreForTests([
    createMockCard({ id: 1, player: "One" }),
    createMockCard({ id: 2, player: "Two" }),
  ]);
});

describe("GET /api/cards/[id]", () => {
  it("returns a card when id exists", async () => {
    const response = await GET(new Request(`${BASE_URL}/1`), createRouteContext("1"));
    const body = await readJson<CardEntry>(response);

    expect(response.status).toBe(200);
    expect(body.id).toBe(1);
    expect(body.player).toBe("One");
  });

  it("returns 404 when card does not exist", async () => {
    const response = await GET(new Request(`${BASE_URL}/99`), createRouteContext("99"));
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(404);
    expect(body.error).toBe("Card not found.");
  });

  it("returns 400 when id validation fails", async () => {
    const response = await GET(new Request(`${BASE_URL}/abc`), createRouteContext("abc"));
    const body = await readJson<{ error: string; issues?: string[] }>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed.");
    expect(body.issues).toContain("Card id must be a number.");
  });
});

describe("PUT /api/cards/[id]", () => {
  it("updates card fields and keeps path id authoritative", async () => {
    const response = await PUT(
      new Request(`${BASE_URL}/1`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createValidCardUpdate({ id: 999, value: 30, fav: true })),
      }),
      createRouteContext("1"),
    );
    const body = await readJson<CardEntry>(response);

    expect(response.status).toBe(200);
    expect(body.id).toBe(1);
    expect(body.value).toBe("$30.00");
    expect(body.fav).toBe(true);
    expect((await getCardStore().getById(1))?.id).toBe(1);
  });

  it("returns 400 when update payload is invalid", async () => {
    const response = await PUT(
      new Request(`${BASE_URL}/1`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ player: "", dupes: -2 }),
      }),
      createRouteContext("1"),
    );
    const body = await readJson<{ error: string; issues?: string[] }>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed.");
    expect(body.issues).toContain("Player name must be at least 2 characters.");
    expect(body.issues).toContain("Duplicate count cannot be negative.");
  });

  it("returns 400 for malformed JSON payloads", async () => {
    const response = await PUT(
      new Request(`${BASE_URL}/1`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{not-valid-json",
      }),
      createRouteContext("1"),
    );
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON body.");
  });
});

describe("DELETE /api/cards/[id]", () => {
  it("deletes an existing card and returns 204", async () => {
    const response = await DELETE(new Request(`${BASE_URL}/1`, { method: "DELETE" }), createRouteContext("1"));

    expect(response.status).toBe(204);
    expect(await getCardStore().getById(1)).toBeUndefined();
  });

  it("returns 404 when deleting unknown card", async () => {
    const response = await DELETE(new Request(`${BASE_URL}/99`, { method: "DELETE" }), createRouteContext("99"));
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(404);
    expect(body.error).toBe("Card not found.");
  });
});
