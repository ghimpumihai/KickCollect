import { beforeEach, describe, expect, it } from "vitest";

import { createMockCard } from "@/__tests__/factories";
import { GET } from "@/app/api/cards/stats/route";
import { resetCardStoreForTests } from "@/lib/server/card-store";

const BASE_URL = `${process.env.TEST_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"}/api/cards/stats`;

function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

beforeEach(async () => {
  await resetCardStoreForTests([
    createMockCard({ id: 1, rarity: "Rare", position: "MID", fav: true, value: "$20.00" }),
    createMockCard({ id: 2, rarity: "Rare", position: "MID", fav: false, value: "$10.00" }),
    createMockCard({ id: 3, rarity: "Common", position: "GK", fav: false, value: "$5.00" }),
  ]);
});

describe("GET /api/cards/stats", () => {
  it("returns aggregate statistics", async () => {
    const response = await GET(new Request(BASE_URL));
    const body = await readJson<{
      totalCards: number;
      totalValue: string;
      averageValue: string;
      favoriteCards: number;
      duplicateCards: number;
      rarityBreakdown: Array<{ rarity: string; count: number }>;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.totalCards).toBe(3);
    expect(body.totalValue).toBe("$35.00");
    expect(body.averageValue).toBe("$11.67");
    expect(body.favoriteCards).toBe(1);
    expect(body.rarityBreakdown.find((entry) => entry.rarity === "Rare")?.count).toBe(2);
  });

  it("supports filters", async () => {
    const response = await GET(new Request(`${BASE_URL}?rarity=Rare&fav=true`));
    const body = await readJson<{ totalCards: number; favoriteCards: number }>(response);

    expect(response.status).toBe(200);
    expect(body.totalCards).toBe(1);
    expect(body.favoriteCards).toBe(1);
  });
});