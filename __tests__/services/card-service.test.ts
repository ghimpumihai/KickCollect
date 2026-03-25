import { ZodError } from "zod";
import { describe, expect, it } from "vitest";

import { createMockCard } from "@/__tests__/factories";
import { CardService } from "@/lib/services/card-service";

function createValidCardInput(overrides: Record<string, unknown> = {}) {
  const { id: _id, ...baseCard } = createMockCard();

  return {
    ...baseCard,
    ...overrides,
  };
}

describe("CardService", () => {
  it("getAll returns defensive copies", () => {
    const service = new CardService([createMockCard({ id: 10, player: "Original Player" })]);

    const cards = service.getAll();
    cards[0].player = "Mutated Player";

    expect(service.getById(10)?.player).toBe("Original Player");
  });

  it("getById returns a copy and undefined for unknown ids", () => {
    const service = new CardService([createMockCard({ id: 15, team: "Arsenal" })]);

    const card = service.getById(15);
    expect(card).toBeDefined();

    if (!card) {
      throw new Error("Expected card to exist for this test.");
    }

    card.team = "Chelsea";

    expect(service.getById(15)?.team).toBe("Arsenal");
    expect(service.getById(9999)).toBeUndefined();
  });

  it("create generates next id and normalizes numeric value", () => {
    const service = new CardService([
      createMockCard({ id: 4 }),
      createMockCard({ id: 12, player: "Existing Card" }),
    ]);

    const created = service.create(createValidCardInput({ value: 22.5 }));

    expect(created.id).toBe(13);
    expect(created.value).toBe("$22.50");
    expect(service.getById(13)).toEqual(created);
  });

  it("create throws ZodError for invalid payload", () => {
    const service = new CardService([]);

    try {
      service.create(createValidCardInput({ player: "", year: 1800 }));
      throw new Error("Expected create to throw a ZodError.");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);

      const zodError = error as ZodError;
      const issueMessages = zodError.issues.map((issue) => issue.message);

      expect(issueMessages).toContain("Player name must be at least 2 characters.");
      expect(issueMessages).toContain("Year must be 1900 or later.");
    }
  });

  it("update merges provided fields and keeps route id authoritative", () => {
    const service = new CardService([createMockCard({ id: 30, player: "Before", value: "$10.00", fav: false })]);

    const updated = service.update(30, {
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
    expect(service.getById(30)?.id).toBe(30);
  });

  it("update returns undefined for missing cards", () => {
    const service = new CardService([createMockCard({ id: 7 })]);

    const updated = service.update(8, { player: "Nope" });

    expect(updated).toBeUndefined();
    expect(service.getAll()).toHaveLength(1);
  });

  it("update throws ZodError for invalid update payload", () => {
    const service = new CardService([createMockCard({ id: 42, player: "Stable Name" })]);

    try {
      service.update(42, { player: "", dupes: -1 });
      throw new Error("Expected update to throw a ZodError.");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);

      const zodError = error as ZodError;
      const issueMessages = zodError.issues.map((issue) => issue.message);

      expect(issueMessages).toContain("Player name must be at least 2 characters.");
      expect(issueMessages).toContain("Duplicate count cannot be negative.");
    }

    expect(service.getById(42)?.player).toBe("Stable Name");
  });

  it("delete returns true when card exists and false otherwise", () => {
    const service = new CardService([createMockCard({ id: 1 }), createMockCard({ id: 2 })]);

    expect(service.delete(2)).toBe(true);
    expect(service.getById(2)).toBeUndefined();
    expect(service.delete(2)).toBe(false);
    expect(service.getAll()).toHaveLength(1);
  });
});
