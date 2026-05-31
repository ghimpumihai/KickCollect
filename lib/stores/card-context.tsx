"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { buildApiUrl, createApiError, requestJson, type ErrorWithIssues } from "@/lib/client/api";
import { useAuth } from "@/lib/stores/auth-context";
import type { CardEntry } from "@/types/card";

type CardReadContextValue = {
  cards: CardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

type CardActionsContextValue = {
  createCard: (data: unknown) => Promise<CardEntry>;
  updateCard: (id: number, data: unknown) => Promise<CardEntry | undefined>;
  deleteCard: (id: number) => Promise<boolean>;
};

const CardReadContext = createContext<CardReadContextValue | null>(null);
const CardActionsContext = createContext<CardActionsContextValue | null>(null);

type CardProviderProps = {
  children: ReactNode;
};

const CARDS_API_PATH = "/api/cards";
const CARDS_PAGE_SIZE = 100;

type CardPaginationResponse = {
  items: CardEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

async function fetchAllCards(): Promise<CardEntry[]> {
  const cards: CardEntry[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const pageResponse = await requestJson<CardPaginationResponse>(
      buildApiUrl(`${CARDS_API_PATH}?page=${page}&pageSize=${CARDS_PAGE_SIZE}`),
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      },
      "Unable to load cards.",
    );

    cards.push(...pageResponse.items);
    totalPages = pageResponse.totalPages;
    page += 1;
  }

  return cards;
}

export function CardProvider({ children }: CardProviderProps) {
  const { handleUnauthorized, status } = useAuth();
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") {
      setCards([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextCards = await fetchAllCards();
      setCards(nextCards);
    } catch (caughtError) {
      const authError = caughtError as ErrorWithIssues;

      if (authError.status === 401) {
        handleUnauthorized("expired");
      }

      setError(caughtError instanceof Error ? caughtError.message : "Failed to refresh cards.");
      throw caughtError;
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized, status]);

  useEffect(() => {
    if (status === "authenticated") {
      void refresh().catch(() => {
        // Auth redirects and user-facing errors are already handled inside refresh.
        // Swallow effect-time rejections so an expected 401 does not surface as a runtime overlay.
      });
      return;
    }

    setCards([]);
    setLoading(false);
    setError(null);
  }, [refresh, status]);

  const createCard = useCallback(async (data: unknown): Promise<CardEntry> => {
    let created: CardEntry;

    try {
      created = await requestJson<CardEntry>(
        buildApiUrl(CARDS_API_PATH),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(data),
        },
        "Unable to create card.",
      );
    } catch (caughtError) {
      const authError = caughtError as ErrorWithIssues;

      if (authError.status === 401) {
        handleUnauthorized("expired");
      }

      throw caughtError;
    }

    setCards((currentCards) => [...currentCards, created]);
    return created;
  }, [handleUnauthorized]);

  const updateCard = useCallback(async (id: number, data: unknown): Promise<CardEntry | undefined> => {
    const response = await fetch(buildApiUrl(`${CARDS_API_PATH}/${id}`), {
      method: "PUT",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized("expired");
      }

      throw await createApiError(response, "Unable to update card.");
    }

    const updated = (await response.json()) as CardEntry;
    setCards((currentCards) =>
      currentCards.map((currentCard) => (currentCard.id === updated.id ? updated : currentCard)),
    );

    return updated;
  }, [handleUnauthorized]);

  const deleteCard = useCallback(async (id: number): Promise<boolean> => {
    const response = await fetch(buildApiUrl(`${CARDS_API_PATH}/${id}`), {
      method: "DELETE",
      credentials: "include",
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized("expired");
      }

      throw await createApiError(response, "Unable to delete card.");
    }

    setCards((currentCards) => currentCards.filter((currentCard) => currentCard.id !== id));
    return true;
  }, [handleUnauthorized]);

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
