"use client";

import {
  useCallback,
  createContext,
  startTransition,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { buildApiUrl, createApiError, requestJson, type ErrorWithIssues } from "@/lib/client/api";
import type { SessionState } from "@/types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type CredentialsPayload = {
  email: string;
  password: string;
};

type RegisterPayload = CredentialsPayload & {
  displayName: string;
};

type AuthContextValue = {
  status: AuthStatus;
  session: SessionState | null;
  login: (payload: CredentialsPayload) => Promise<SessionState>;
  register: (payload: RegisterPayload) => Promise<SessionState>;
  logout: (redirectPath?: string) => Promise<void>;
  refreshSession: (method?: "GET" | "POST") => Promise<SessionState | null>;
  handleUnauthorized: (reason?: "expired" | "required") => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_API_PATH = "/api/auth/session";
const LOGIN_API_PATH = "/api/auth/login";
const REGISTER_API_PATH = "/api/auth/register";
const LOGOUT_API_PATH = "/api/auth/logout";
const KEEP_ALIVE_INTERVAL_MS = 5 * 1000;

function isProtectedPath(pathname: string | null): boolean {
  return pathname === "/collection" || pathname?.startsWith("/card/") === true;
}

function toAuthRedirect(pathname: string | null, reason?: "expired" | "required"): string {
  const searchParams = new URLSearchParams();

  if (pathname && isProtectedPath(pathname)) {
    searchParams.set("next", pathname);
  }

  if (reason) {
    searchParams.set("reason", reason);
  }

  const query = searchParams.toString();
  return query.length > 0 ? `/auth?${query}` : "/auth";
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const lastKeepAliveAtRef = useRef(0);
  const keepAliveInFlightRef = useRef(false);

  const redirectToAuth = useCallback((reason?: "expired" | "required") => {
    setSession(null);
    setStatus("unauthenticated");

    if (pathname === "/auth") {
      return;
    }

    startTransition(() => {
      router.replace(toAuthRedirect(pathname, reason));
    });
  }, [pathname, router]);

  const refreshSession = useCallback(async (method: "GET" | "POST" = "GET"): Promise<SessionState | null> => {
    try {
      const nextSession = await requestJson<SessionState>(
        buildApiUrl(SESSION_API_PATH),
        {
          method,
          cache: "no-store",
          credentials: "include",
        },
        "Unable to restore your session.",
      );

      setSession(nextSession);
      setStatus("authenticated");
      lastKeepAliveAtRef.current = Date.now();
      return nextSession;
    } catch (caughtError) {
      const authError = caughtError as ErrorWithIssues;

      if (authError.status === 401) {
        if (method === "POST" || isProtectedPath(pathname)) {
          redirectToAuth(method === "POST" ? "expired" : "required");
        } else {
          setSession(null);
          setStatus("unauthenticated");
        }

        return null;
      }

      setSession(null);
      setStatus("unauthenticated");
      throw caughtError;
    }
  }, [pathname, redirectToAuth]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextSession = await refreshSession("GET");

        if (!cancelled && !nextSession) {
          setStatus("unauthenticated");
        }
      } catch {
        if (!cancelled) {
          setStatus("unauthenticated");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const timeoutMs = Math.max(0, Date.parse(session.expiresAt) - Date.now());
    const timeoutId = window.setTimeout(() => {
      redirectToAuth("expired");
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [redirectToAuth, session]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const keepAlive = () => {
      if (keepAliveInFlightRef.current) {
        return;
      }

      if (Date.now() - lastKeepAliveAtRef.current < KEEP_ALIVE_INTERVAL_MS) {
        return;
      }

      keepAliveInFlightRef.current = true;

      void refreshSession("POST").finally(() => {
        keepAliveInFlightRef.current = false;
      });
    };

    const listenerOptions: AddEventListenerOptions = { passive: true };
    const eventNames: Array<keyof WindowEventMap> = ["click", "keydown", "mousemove", "touchstart"];

    for (const eventName of eventNames) {
      window.addEventListener(eventName, keepAlive, listenerOptions);
    }

    return () => {
      for (const eventName of eventNames) {
        window.removeEventListener(eventName, keepAlive, listenerOptions);
      }
    };
  }, [refreshSession, status]);

  const login = useCallback(async (payload: CredentialsPayload): Promise<SessionState> => {
    const nextSession = await requestJson<SessionState>(
      buildApiUrl(LOGIN_API_PATH),
      {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      "Unable to log in.",
    );

    setSession(nextSession);
    setStatus("authenticated");
    lastKeepAliveAtRef.current = Date.now();
    return nextSession;
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<SessionState> => {
    const nextSession = await requestJson<SessionState>(
      buildApiUrl(REGISTER_API_PATH),
      {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      "Unable to register.",
    );

    setSession(nextSession);
    setStatus("authenticated");
    lastKeepAliveAtRef.current = Date.now();
    return nextSession;
  }, []);

  const logout = useCallback(async (redirectPath = "/auth"): Promise<void> => {
    try {
      const response = await fetch(buildApiUrl(LOGOUT_API_PATH), {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok && response.status !== 401) {
        throw await createApiError(response, "Unable to log out.");
      }
    } finally {
      setSession(null);
      setStatus("unauthenticated");

      startTransition(() => {
        router.replace(redirectPath);
      });
    }
  }, [router]);

  const handleUnauthorized = useCallback((reason?: "expired" | "required") => {
    redirectToAuth(reason ?? "expired");
  }, [redirectToAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      login,
      register,
      logout,
      refreshSession,
      handleUnauthorized,
    }),
    [handleUnauthorized, login, logout, refreshSession, register, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
