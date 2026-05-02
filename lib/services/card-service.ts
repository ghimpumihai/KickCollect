import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/server/prisma";
import { seededCards } from "@/lib/server/card-seed-data";
import { createCardSchema, updateCardSchema } from "@/lib/validation/card-schema";
import type { CardEntry, Condition, Position, Rarity } from "@/types/card";

export type CardFilters = {
  search?: string;
  team?: string;
  rarity?: Rarity;
  position?: Position;
  fav?: boolean;
};

export type CardPaginationResult = {
  items: CardEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type CardStats = {
  totalCards: number;
  totalValue: string;
  averageValue: string;
  favoriteCards: number;
  duplicateCards: number;
  rarityBreakdown: Array<{ rarity: Rarity; count: number }>;
  positionBreakdown: Array<{ position: Position; count: number }>;
  conditionBreakdown: Array<{ condition: Condition; count: number }>;
};

function formatCurrency(value: Prisma.Decimal | number | string): string {
  const numericValue = typeof value === "number" ? value : Number(value.toString());
  return `$${numericValue.toFixed(2)}`;
}

function toDbCondition(condition: Condition): "Mint" | "NearMint" | "Good" | "Fair" | "Poor" {
  return condition === "Near Mint" ? "NearMint" : condition;
}

function fromDbCondition(condition: "Mint" | "NearMint" | "Good" | "Fair" | "Poor"): Condition {
  return condition === "NearMint" ? "Near Mint" : condition;
}

function toDecimalValue(value: string): Prisma.Decimal {
  const normalizedValue = value.replace(/[^0-9.-]+/g, "");
  return new Prisma.Decimal(normalizedValue);
}

function buildWhere(filters: CardFilters = {}): Prisma.CardWhereInput {
  const clauses: Prisma.CardWhereInput[] = [];

  if (filters.search && filters.search.trim().length > 0) {
    const search = filters.search.trim();
    clauses.push({
      OR: [
        { player: { contains: search, mode: "insensitive" } },
        { series: { contains: search, mode: "insensitive" } },
        { number: { contains: search, mode: "insensitive" } },
        { team: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (filters.team && filters.team.trim().length > 0) {
    clauses.push({ team: { equals: filters.team.trim(), mode: "insensitive" } });
  }

  if (filters.rarity) {
    clauses.push({ rarity: filters.rarity });
  }

  if (filters.position) {
    clauses.push({ position: filters.position });
  }

  if (typeof filters.fav === "boolean") {
    clauses.push({ fav: filters.fav });
  }

  return clauses.length > 0 ? { AND: clauses } : {};
}

function summarizeValues(values: Prisma.Decimal[]): { totalValue: string; averageValue: string } {
  if (values.length === 0) {
    return {
      totalValue: formatCurrency(0),
      averageValue: formatCurrency(0),
    };
  }

  const total = values.reduce((sum, value) => sum + Number(value.toString()), 0);
  return {
    totalValue: formatCurrency(total),
    averageValue: formatCurrency(total / values.length),
  };
}

function mapCardRecord(card: {
  id: number;
  player: string;
  series: string;
  number: string;
  team: string;
  position: Position;
  year: number;
  rarity: Rarity;
  condition: "Mint" | "NearMint" | "Good" | "Fair" | "Poor";
  value: Prisma.Decimal;
  dupes: number;
  fav: boolean;
}): CardEntry {
  return {
    ...card,
    condition: fromDbCondition(card.condition),
    value: formatCurrency(card.value),
  };
}

export class CardService {
  async reset(initialCards: CardEntry[] = seededCards): Promise<void> {
    await prisma.card.deleteMany();

    if (initialCards.length === 0) {
      return;
    }

    await prisma.card.createMany({
      data: initialCards.map((card) => ({
        ...card,
        condition: toDbCondition(card.condition),
        value: toDecimalValue(card.value),
      })),
    });
  }

  async getAll(filters: CardFilters = {}): Promise<CardEntry[]> {
    const cards = await prisma.card.findMany({
      where: buildWhere(filters),
      orderBy: { id: "asc" },
    });

    return cards.map(mapCardRecord);
  }

  async getPaginated(
    page: number,
    pageSize: number,
    filters: CardFilters = {},
  ): Promise<CardPaginationResult> {
    const where = buildWhere(filters);
    const [totalItems, cards] = await prisma.$transaction([
      prisma.card.count({ where }),
      prisma.card.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: cards.map(mapCardRecord),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    };
  }

  async getById(id: number): Promise<CardEntry | undefined> {
    const card = await prisma.card.findUnique({ where: { id } });
    return card ? mapCardRecord(card) : undefined;
  }

  async create(data: unknown): Promise<CardEntry> {
    const parsedCard = createCardSchema.parse(data);
    const nextId = parsedCard.id ?? (await this.generateNextId());

    const createdCard = await prisma.card.create({
      data: {
        id: nextId,
        ...parsedCard,
        condition: toDbCondition(parsedCard.condition),
        value: toDecimalValue(parsedCard.value),
      },
    });

    return mapCardRecord(createdCard);
  }

  async update(id: number, data: unknown): Promise<CardEntry | undefined> {
    const cardIndex = await prisma.card.findUnique({ where: { id } });

    if (!cardIndex) {
      return undefined;
    }

    const inputData = typeof data === "object" && data !== null ? data : {};
    const parsedUpdate = updateCardSchema.parse({
      ...inputData,
      id,
    });
    const { id: _ignored, ...updateFields } = parsedUpdate;

    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        ...updateFields,
        ...(updateFields.condition ? { condition: toDbCondition(updateFields.condition) } : {}),
        ...(updateFields.value ? { value: toDecimalValue(updateFields.value) } : {}),
      },
    });

    return mapCardRecord(updatedCard);
  }

  async delete(id: number): Promise<boolean> {
    const existingCard = await prisma.card.findUnique({ where: { id } });
    if (!existingCard) {
      return false;
    }

    await prisma.card.delete({ where: { id } });
    return true;
  }

  async getStats(filters: CardFilters = {}): Promise<CardStats> {
    const cards = await prisma.card.findMany({
      where: buildWhere(filters),
      orderBy: { id: "asc" },
    });

    const { totalValue, averageValue } = summarizeValues(cards.map((card) => card.value));

    return {
      totalCards: cards.length,
      totalValue,
      averageValue,
      favoriteCards: cards.filter((card) => card.fav).length,
      duplicateCards: cards.filter((card) => card.dupes > 0).length,
      rarityBreakdown: (["Common", "Uncommon", "Rare", "Epic", "Legendary"] as const).map((rarity) => ({
        rarity,
        count: cards.filter((card) => card.rarity === rarity).length,
      })),
      positionBreakdown: (["GK", "DEF", "MID", "FWD"] as const).map((position) => ({
        position,
        count: cards.filter((card) => card.position === position).length,
      })),
      conditionBreakdown: (["Mint", "NearMint", "Good", "Fair", "Poor"] as const).map((condition) => ({
        condition: fromDbCondition(condition),
        count: cards.filter((card) => card.condition === condition).length,
      })),
    };
  }

  private async generateNextId(): Promise<number> {
    const aggregate = await prisma.card.aggregate({
      _max: { id: true },
    });

    return (aggregate._max.id ?? 0) + 1;
  }
}
