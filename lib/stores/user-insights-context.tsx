"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

type ActivityEntry = {
  id: number;
  timestamp: string;
  message: string;
};

type UserPreferences = {
  pageSize: number;
};

type UserInsightsContextValue = {
  preferences: UserPreferences;
  setPageSizePreference: (pageSize: number) => void;
  activity: ActivityEntry[];
  recordActivity: (message: string) => void;
};

const PAGE_SIZE_COOKIE_NAME = "kc_page_size";
const ACTIVITY_COOKIE_NAME = "kc_activity_log";
const cookieMaxAge = 60 * 60 * 24 * 365;

const UserInsightsContext = createContext<UserInsightsContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookieNamePrefix = `${name}=`;
  const cookieParts = document.cookie.split(";").map((part) => part.trim());
  const matchingPart = cookieParts.find((part) => part.startsWith(cookieNamePrefix));
  return matchingPart ? decodeURIComponent(matchingPart.slice(cookieNamePrefix.length)) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${cookieMaxAge}; samesite=lax`;
}

function getInitialPageSize(): number {
  const fromCookie = Number(readCookie(PAGE_SIZE_COOKIE_NAME));
  if ([4, 6, 10].includes(fromCookie)) {
    return fromCookie;
  }

  return 6;
}

function readInitialActivity(): ActivityEntry[] {
  const raw = readCookie(ACTIVITY_COOKIE_NAME);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ActivityEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry) =>
          typeof entry?.id === "number" &&
          typeof entry?.timestamp === "string" &&
          typeof entry?.message === "string",
      )
      .slice(0, 8);
  } catch {
    return [];
  }
}

type UserInsightsProviderProps = {
  children: ReactNode;
};

export function UserInsightsProvider({ children }: UserInsightsProviderProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => ({
    pageSize: getInitialPageSize(),
  }));
  const [activity, setActivity] = useState<ActivityEntry[]>(() => readInitialActivity());

  const setPageSizePreference = (pageSize: number) => {
    if (![4, 6, 10].includes(pageSize)) {
      return;
    }

    setPreferences((current) => ({ ...current, pageSize }));
    writeCookie(PAGE_SIZE_COOKIE_NAME, String(pageSize));
  };

  const recordActivity = (message: string) => {
    setActivity((current) => {
      const entry: ActivityEntry = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
        message,
      };
      const nextActivity = [entry, ...current].slice(0, 8);
      writeCookie(ACTIVITY_COOKIE_NAME, JSON.stringify(nextActivity));
      return nextActivity;
    });
  };

  const value = useMemo<UserInsightsContextValue>(
    () => ({
      preferences,
      setPageSizePreference,
      activity,
      recordActivity,
    }),
    [preferences, activity],
  );

  return <UserInsightsContext.Provider value={value}>{children}</UserInsightsContext.Provider>;
}

export function useUserInsights(): UserInsightsContextValue {
  const context = useContext(UserInsightsContext);
  if (!context) {
    throw new Error("useUserInsights must be used within a UserInsightsProvider.");
  }

  return context;
}
