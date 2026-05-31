import { ZodError } from "zod";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestUser, resetAuthState } from "@/__tests__/auth-helpers";
import { createMockCard } from "@/__tests__/factories";
import { CardService } from "@/lib/services/card-service";

function createValidCardInput(overrides: Record<string, unknown> = {}) {
  const { id, ...baseCard } = createMockCard();
  void id;

  return {
    ...baseCard,
    ...overrides,
  };
}

describe("CardService", () => {
  let userId = 0;

  beforeEach(async () => {
    await resetAuthState();
    const { user } = await createTestUser();
    userId = user.id;
  });

  it("getAll returns defensive copies", async () => {
    const service = new CardService();
    await service.reset(userId, [createMockCard({ id: 10, player: "Original Player" })]);

    const cards = await service.getAll(userId);
    cards[0].player = "Mutated Player";

    expect((await service.getById(userId, 10))?.player).toBe("Original Player");
  });

  it("getPaginated returns metadata with sliced items", async () => {
    const service = new CardService();
    await service.reset(userId, [
      createMockCard({ id: 1, player: "One" }),
      createMockCard({ id: 2, player: "Two" }),
      createMockCard({ id: 3, player: "Three" }),
      createMockCard({ id: 4, player: "Four" }),
    ]);

    const page = await service.getPaginated(userId, 2, 2);

    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(2);
    expect(page.totalItems).toBe(4);
    expect(page.totalPages).toBe(2);
    expect(page.items.map((card) => card.id)).toEqual([3, 4]);
  });

  it("getPaginated returns an empty items array for pages beyond the dataset", async () => {
    const service = new CardService();
    await service.reset(userId, [createMockCard({ id: 1 }), createMockCard({ id: 2 })]);

    const page = await service.getPaginated(userId, 5, 2);

    expect(page.items).toEqual([]);
    expect(page.totalItems).toBe(2);
    expect(page.totalPages).toBe(1);
  });

  it("getById returns a copy and undefined for unknown ids", async () => {
    const service = new CardService();
    await service.reset(userId, [createMockCard({ id: 15, team: "Arsenal" })]);

    const card = await service.getById(userId, 15);
    expect(card).toBeDefined();

    if (!card) {
      throw new Error("Expected card to exist for this test.");
    }

    card.team = "Chelsea";

    expect((await service.getById(userId, 15))?.team).toBe("Arsenal");
    expect(await service.getById(userId, 9999)).toBeUndefined();
  });

  it("create generates next id and normalizes numeric value", async () => {
    const service = new CardService();
    await service.reset(userId, [
      createMockCard({ id: 4 }),
      createMockCard({ id: 12, player: "Existing Card" }),
    ]);

    const created = await service.create(userId, createValidCardInput({ value: 22.5 }));

    expect(created.id).toBe(13);
    expect(created.value).toBe("$22.50");
    expect(await service.getById(userId, 13)).toEqual(created);
  });

  it("create throws ZodError for invalid payload", async () => {
    const service = new CardService();
    await service.reset(userId, []);

    try {
      await service.create(userId, createValidCardInput({ player: "", year: 1800 }));
      throw new Error("Expected create to throw a ZodError.");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);

      const zodError = error as ZodError;
      const issueMessages = zodError.issues.map((issue) => issue.message);

      expect(issueMessages).toContain("Player name must be at least 2 characters.");
      expect(issueMessages).toContain("Year must be 1900 or later.");
    }
  });

  it("update merges provided fields and keeps route id authoritative", async () => {
    const service = new CardService();
    await service.reset(userId, [createMockCard({ id: 30, player: "Before", value: "$10.00", fav: false })]);

    const updated = await service.update(userId, 30, {
      id: 999,
      player: "After",
      value: 30,
      fav: true,
    });

    expect(updated).toEqual(
      expect.objectContaining({
        id: 30,
        player: "After",
        value: "$30.00",
        fav: true,
      }),
    );
    expect((await service.getById(userId, 30))?.id).toBe(30);
  });

  it("update returns undefined for missing cards", async () => {
    const service = new CardService();
    await service.reset(userId, [createMockCard({ id: 7 })]);

    const updated = await service.update(userId, 8, { player: "Nope" });

    expect(updated).toBeUndefined();
    expect((await service.getAll(userId))).toHaveLength(1);
  });

  it("update throws ZodError for invalid update payload", async () => {
    const service = new CardService();
    await service.reset(userId, [createMockCard({ id: 42, player: "Stable Name" })]);

    try {
      await service.update(userId, 42, { player: "", dupes: -1 });
      throw new Error("Expected update to throw a ZodError.");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);

      const zodError = error as ZodError;
      const issueMessages = zodError.issues.map((issue) => issue.message);

      expect(issueMessages).toContain("Player name must be at least 2 characters.");
      expect(issueMessages).toContain("Duplicate count cannot be negative.");
    }

    expect((await service.getById(userId, 42))?.player).toBe("Stable Name");
  });

  it("delete returns true when card exists and false otherwise", async () => {
    const service = new CardService();
    await service.reset(userId, [createMockCard({ id: 1 }), createMockCard({ id: 2 })]);

    expect(await service.delete(userId, 2)).toBe(true);
    expect(await service.getById(userId, 2)).toBeUndefined();
    expect(await service.delete(userId, 2)).toBe(false);
    expect(await service.getAll(userId)).toHaveLength(1);
  });
});
