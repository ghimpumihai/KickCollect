import { createCardSchema, updateCardSchema } from "@/lib/validation/card-schema";
import type { CardEntry } from "@/types/card";

export type CardPaginationResult = {
  items: CardEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

const seededCards: CardEntry[] = [
  {
    id: 1,
    player: "Kylian Mbappé",
    series: "Panini Prizm 2024",
    number: "#012/150",
    team: "Real Madrid",
    position: "FWD",
    year: 2024,
    rarity: "Epic",
    condition: "Mint",
    value: "$48.00",
    dupes: 0,
    fav: true,
  },
  {
    id: 2,
    player: "Erling Haaland",
    series: "Topps Chrome 2023",
    number: "#001/50",
    team: "Man City",
    position: "FWD",
    year: 2023,
    rarity: "Legendary",
    condition: "Mint",
    value: "$210.00",
    dupes: 0,
    fav: true,
  },
  {
    id: 3,
    player: "Pedri",
    series: "Panini Adrenalyn 2024",
    number: "",
    team: "Barcelona",
    position: "MID",
    year: 2024,
    rarity: "Rare",
    condition: "Near Mint",
    value: "$12.50",
    dupes: 2,
    fav: false,
  },
  {
    id: 4,
    player: "Lamine Yamal",
    series: "Topps Match Attax 2025",
    number: "",
    team: "Barcelona",
    position: "FWD",
    year: 2025,
    rarity: "Uncommon",
    condition: "Good",
    value: "$4.20",
    dupes: 3,
    fav: false,
  },
  {
    id: 5,
    player: "Gianluigi Donnarumma",
    series: "Panini Prizm 2024",
    number: "",
    team: "PSG",
    position: "GK",
    year: 2024,
    rarity: "Common",
    condition: "Fair",
    value: "$1.00",
    dupes: 0,
    fav: false,
  },
  {
    id: 6,
    player: "Rodri",
    series: "Topps Chrome 2024",
    number: "",
    team: "Man City",
    position: "MID",
    year: 2024,
    rarity: "Rare",
    condition: "Near Mint",
    value: "$18.00",
    dupes: 0,
    fav: false,
  },
];

export class CardService {
  private cards: CardEntry[];

  constructor(initialCards: CardEntry[] = seededCards) {
    this.cards = initialCards.map((card) => ({ ...card }));
  }

  getAll(): CardEntry[] {
    return this.cards.map((card) => ({ ...card }));
  }

  getPaginated(page: number, pageSize: number): CardPaginationResult {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = this.cards.slice(startIndex, endIndex).map((card) => ({ ...card }));
    const totalItems = this.cards.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  getById(id: number): CardEntry | undefined {
    const foundCard = this.cards.find((card) => card.id === id);
    return foundCard ? { ...foundCard } : undefined;
  }

  create(data: unknown): CardEntry {
    const parsedCard = createCardSchema.parse(data);
    const nextId = parsedCard.id ?? this.generateNextId();
    const newCard: CardEntry = {
      ...parsedCard,
      id: nextId,
    };

    this.cards.push(newCard);
    return { ...newCard };
  }

  update(id: number, data: unknown): CardEntry | undefined {
    const cardIndex = this.cards.findIndex((card) => card.id === id);

    if (cardIndex === -1) {
      return undefined;
    }

    const inputData = typeof data === "object" && data !== null ? data : {};

    const parsedUpdate = updateCardSchema.parse({
      ...inputData,
      id,
    });

    const currentCard = this.cards[cardIndex];
    const updatedCard: CardEntry = {
      ...currentCard,
      ...parsedUpdate,
      id,
    };

    this.cards[cardIndex] = updatedCard;
    return { ...updatedCard };
  }

  delete(id: number): boolean {
    const beforeCount = this.cards.length;
    this.cards = this.cards.filter((card) => card.id !== id);
    return this.cards.length < beforeCount;
  }

  private generateNextId(): number {
    const highestId = this.cards.reduce((maxId, card) => Math.max(maxId, card.id), 0);
    return highestId + 1;
  }
}
