"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

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

export function CardProvider({ children }: CardProviderProps) {
  const serviceRef = useRef(new CardService());
  const [cards, setCards] = useState<CardEntry[]>(() => serviceRef.current.getAll());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    try {
      const created = serviceRef.current.create(data);
      setCards(serviceRef.current.getAll());
      return created;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to create card.");
      throw caughtError;
    }
  }, []);

  const updateCard = useCallback((id: number, data: unknown): CardEntry | undefined => {
    setError(null);

    try {
      const updated = serviceRef.current.update(id, data);
      setCards(serviceRef.current.getAll());
      return updated;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to update card.");
      throw caughtError;
    }
  }, []);

  const deleteCard = useCallback((id: number): boolean => {
    setError(null);

    try {
      const deleted = serviceRef.current.delete(id);
      setCards(serviceRef.current.getAll());
      return deleted;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to delete card.");
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
