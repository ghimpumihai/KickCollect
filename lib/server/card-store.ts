import type { CardEntry } from "@/types/card";
import { CardService } from "@/lib/services/card-service";

let cardStore = new CardService();

export function getCardStore(): CardService {
  return cardStore;
}

export async function resetCardStoreForTests(initialCards?: CardEntry[]): Promise<void> {
  cardStore = new CardService();
  await cardStore.reset(initialCards);
}
