"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
const LAST_PAGE_COOKIE_NAME = "kc_last_page";
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

function writeCookie(name: string, value: string, encodeValue = true): void {
  if (typeof document === "undefined") {
    return;
  }

  const cookieValue = encodeValue ? encodeURIComponent(value) : value;
  document.cookie = `${name}=${cookieValue}; path=/; max-age=${cookieMaxAge}; samesite=lax`;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [preferences, setPreferences] = useState<UserPreferences>({ pageSize: 6 });
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    const fromPageSize = Number(readCookie(PAGE_SIZE_COOKIE_NAME));
    if ([4, 6, 10].includes(fromPageSize)) {
      setPreferences((current) => (current.pageSize === fromPageSize ? current : { ...current, pageSize: fromPageSize }));
    }

    setActivity(readInitialActivity());
  }, []);

  useEffect(() => {
    // Track last route visited so the app can restore context after refresh/redirect.
    const query = searchParams?.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    if (typeof pathname === "string" && pathname.length > 0) {
      writeCookie(LAST_PAGE_COOKIE_NAME, fullPath || "/", false);
    } else {
      writeCookie(LAST_PAGE_COOKIE_NAME, "/", false);
    }
  }, [pathname, searchParams]);

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
