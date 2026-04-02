"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { CardService } from "@/lib/services/card-service";
import type { CardEntry } from "@/types/card";

type CardReadContextValue = {
  cards: CardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

type CardActionsContextValue = {
  createCard: (data: unknown) => CardEntry;
  updateCard: (id: number, data: unknown) => CardEntry | undefined;
  deleteCard: (id: number) => boolean;
};

const CardReadContext = createContext<CardReadContextValue | null>(null);
const CardActionsContext = createContext<CardActionsContextValue | null>(null);

type CardProviderProps = {
  children: ReactNode;
};

const CARDS_SESSION_STORAGE_KEY = "kc_cards_session";

export function CardProvider({ children }: CardProviderProps) {
  const serviceRef = useRef(new CardService());
  const [cards, setCards] = useState<CardEntry[]>(() => serviceRef.current.getAll());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const didRehydrateRef = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CARDS_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const loadedCards = parsed.filter(
            (c) =>
              typeof (c as any)?.id === "number" &&
              typeof (c as any)?.player === "string" &&
              typeof (c as any)?.series === "string" &&
              typeof (c as any)?.team === "string" &&
              typeof (c as any)?.position === "string" &&
              typeof (c as any)?.year === "number" &&
              typeof (c as any)?.rarity === "string" &&
              typeof (c as any)?.condition === "string" &&
              typeof (c as any)?.value === "string" &&
              typeof (c as any)?.dupes === "number" &&
              typeof (c as any)?.fav === "boolean",
          ) as CardEntry[];

          serviceRef.current = new CardService(loadedCards);
          setCards(serviceRef.current.getAll());
        }
      }
    } catch {
      // Ignore storage parse errors; fall back to seeded in-memory cards.
    } finally {
      didRehydrateRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!didRehydrateRef.current) return;
    try {
      sessionStorage.setItem(CARDS_SESSION_STORAGE_KEY, JSON.stringify(cards));
    } catch {
    }
  }, [cards]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      setCards(serviceRef.current.getAll());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to refresh cards.");
    } finally {
      setLoading(false);
    }
  }, []);

  const createCard = useCallback((data: unknown): CardEntry => {
    try {
      const created = serviceRef.current.create(data);
      setCards(serviceRef.current.getAll());
      return created;
    } catch (caughtError) {
      throw caughtError;
    }
  }, []);

  const updateCard = useCallback((id: number, data: unknown): CardEntry | undefined => {
    try {
      const updated = serviceRef.current.update(id, data);
      setCards(serviceRef.current.getAll());
      return updated;
    } catch (caughtError) {
      throw caughtError;
    }
  }, []);

  const deleteCard = useCallback((id: number): boolean => {
    try {
      const deleted = serviceRef.current.delete(id);
      setCards(serviceRef.current.getAll());
      return deleted;
    } catch (caughtError) {
      throw caughtError;
    }
  }, []);

  const readValue = useMemo<CardReadContextValue>(
    () => ({
      cards,
      loading,
      error,
      refresh,
    }),
    [cards, loading, error, refresh],
  );

  const actionsValue = useMemo<CardActionsContextValue>(
    () => ({
      createCard,
      updateCard,
      deleteCard,
    }),
    [createCard, updateCard, deleteCard],
  );

  return (
    <CardReadContext.Provider value={readValue}>
      <CardActionsContext.Provider value={actionsValue}>{children}</CardActionsContext.Provider>
    </CardReadContext.Provider>
  );
}

export function useCards(): CardReadContextValue {
  const context = useContext(CardReadContext);

  if (context === null) {
    throw new Error("useCards must be used within a CardProvider.");
  }

  return context;
}

export function useCardActions(): CardActionsContextValue {
  const context = useContext(CardActionsContext);

  if (context === null) {
    throw new Error("useCardActions must be used within a CardProvider.");
  }

  return context;
}
