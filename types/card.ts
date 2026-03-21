export type Position = "GK" | "DEF" | "MID" | "FWD";

export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type Condition = "Mint" | "Near Mint" | "Good" | "Fair" | "Poor";

export interface CardEntry {
  id: number;
  player: string;
  series: string;
  number: string;
  team: string;
  position: Position;
  year: number;
  rarity: Rarity;
  condition: Condition;
  value: string;
  dupes: number;
  fav: boolean;
}

export const rarityColors: Readonly<Record<Rarity, string>> = {
  Common: "var(--kc-r-common)",
  Uncommon: "var(--kc-r-uncommon)",
  Rare: "var(--kc-r-rare)",
  Epic: "var(--kc-r-epic)",
  Legendary: "var(--kc-r-legendary)",
};

export const badgeClasses: Readonly<Record<Rarity, string>> = {
  Common: "kc-badge-common",
  Uncommon: "kc-badge-uncommon",
  Rare: "kc-badge-rare",
  Epic: "kc-badge-epic",
  Legendary: "kc-badge-legendary",
};
