"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

function buildApiUrl(path: string): string {
  return API_BASE_URL.length > 0 ? `${API_BASE_URL}${path}` : path;
}

type ApiErrorPayload = {
  error?: string;
  issues?: string[];
};

type ErrorWithIssues = Error & {
  issues?: Array<{ message: string }>;
};

type CardPaginationResponse = {
  items: CardEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

async function createApiError(response: Response, fallbackMessage: string): Promise<ErrorWithIssues> {
  let payload: ApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }

  const message = typeof payload?.error === "string" && payload.error.length > 0 ? payload.error : fallbackMessage;
  const error = new Error(message) as ErrorWithIssues;

  if (Array.isArray(payload?.issues)) {
    const issues = payload.issues
      .filter((issue): issue is string => typeof issue === "string" && issue.length > 0)
      .map((issueMessage) => ({ message: issueMessage }));

    if (issues.length > 0) {
      error.issues = issues;
    }
  }

  return error;
}

async function requestJson<T>(input: RequestInfo | URL, init: RequestInit, fallbackMessage: string): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw await createApiError(response, fallbackMessage);
  }

  return (await response.json()) as T;
}

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
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextCards = await fetchAllCards();
      setCards(nextCards);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to refresh cards.");
      throw caughtError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCard = useCallback(async (data: unknown): Promise<CardEntry> => {
    const created = await requestJson<CardEntry>(
      buildApiUrl(CARDS_API_PATH),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(data),
      },
      "Unable to create card.",
    );

    setCards((currentCards) => [...currentCards, created]);
    return created;
  }, []);

  const updateCard = useCallback(async (id: number, data: unknown): Promise<CardEntry | undefined> => {
    const response = await fetch(buildApiUrl(`${CARDS_API_PATH}/${id}`), {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw await createApiError(response, "Unable to update card.");
    }

    const updated = (await response.json()) as CardEntry;
    setCards((currentCards) =>
      currentCards.map((currentCard) => (currentCard.id === updated.id ? updated : currentCard)),
    );

    return updated;
  }, []);

  const deleteCard = useCallback(async (id: number): Promise<boolean> => {
    const response = await fetch(buildApiUrl(`${CARDS_API_PATH}/${id}`), {
      method: "DELETE",
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      throw await createApiError(response, "Unable to delete card.");
    }

    setCards((currentCards) => currentCards.filter((currentCard) => currentCard.id !== id));
    return true;
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
