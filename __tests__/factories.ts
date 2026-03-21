import type { CardEntry } from "@/types/card";

const defaultMockCard: CardEntry = {
  id: 101,
  player: "Jude Bellingham",
  series: "Topps Chrome 2025",
  number: "#027/199",
  team: "Real Madrid",
  position: "MID",
  year: 2025,
  rarity: "Rare",
  condition: "Near Mint",
  value: "$34.50",
  dupes: 0,
  fav: false,
};

export function createMockCard(overrides: Partial<CardEntry> = {}): CardEntry {
  return {
    ...defaultMockCard,
    ...overrides,
  };
}
