import { z } from "zod";

const idSchema = z.number().int({ message: "Card id must be an integer." }).positive({ message: "Card id must be greater than 0." });

const playerSchema = z
  .string({ message: "Player name is required." })
  .trim()
  .min(2, { message: "Player name must be at least 2 characters." });

const seriesSchema = z
  .string({ message: "Series is required." })
  .trim()
  .min(1, { message: "Series is required." });

const cardNumberSchema = z
  .string({ message: "Card number is required." })
  .trim();

const teamSchema = z
  .string({ message: "Team is required." })
  .trim()
  .min(1, { message: "Team is required." });

const positionSchema = z.enum(["GK", "DEF", "MID", "FWD"], {
  message: "Position must be one of: GK, DEF, MID, FWD.",
});

const raritySchema = z.enum(["Common", "Uncommon", "Rare", "Epic", "Legendary"], {
  message: "Rarity must be one of: Common, Uncommon, Rare, Epic, Legendary.",
});

const conditionSchema = z.enum(["Mint", "Near Mint", "Good", "Fair", "Poor"], {
  message: "Condition must be one of: Mint, Near Mint, Good, Fair, Poor.",
});

const yearSchema = z
  .number({ message: "Year is required." })
  .int({ message: "Year must be a whole number." })
  .min(1900, { message: "Year must be 1900 or later." })
  .max(2026, { message: "Year must be 2026 or earlier." });

const valueSchema = z
  .union([
    z
      .string({ message: "Value is required." })
      .trim()
      .min(1, { message: "Value is required." })
      .regex(/^\$?\d+(?:\.\d{1,2})?$/, {
        message: "Value must be a valid amount (for example: $12.50 or 12.50).",
      }),
    z
      .number({ message: "Value is required." })
      .finite({ message: "Value must be a finite number." })
      .min(0, { message: "Value cannot be negative." }),
  ])
  .transform((value) => {
    if (typeof value === "number") {
      return `$${value.toFixed(2)}`;
    }

    return value.startsWith("$") ? value : `$${value}`;
  });

const dupesSchema = z
  .number({ message: "Duplicate count is required." })
  .int({ message: "Duplicate count must be a whole number." })
  .min(0, { message: "Duplicate count cannot be negative." });

const favSchema = z.boolean({ message: "Favorite flag must be true or false." });

const baseCardFields = {
  player: playerSchema,
  series: seriesSchema,
  number: cardNumberSchema,
  team: teamSchema,
  position: positionSchema,
  year: yearSchema,
  rarity: raritySchema,
  condition: conditionSchema,
  value: valueSchema,
  dupes: dupesSchema,
  fav: favSchema,
};

export const cardSchema = z.object({
  id: idSchema,
  ...baseCardFields,
});

export const createCardSchema = z.object({
  id: idSchema.optional(),
  ...baseCardFields,
});

export const updateCardSchema = z
  .object({
    id: idSchema,
    ...baseCardFields,
  })
  .partial({
    player: true,
    series: true,
    number: true,
    team: true,
    position: true,
    year: true,
    rarity: true,
    condition: true,
    value: true,
    dupes: true,
    fav: true,
  });
