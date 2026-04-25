import type { CardEntry } from "@/types/card";
import { CardService } from "@/lib/services/card-service";

let cardStore = new CardService();

export function getCardStore(): CardService {
  return cardStore;
}

export function resetCardStoreForTests(initialCards?: CardEntry[]): void {
  cardStore = new CardService(initialCards);
}
