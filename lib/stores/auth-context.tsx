"use client";

import {
  createContext,
  startTransition,
  type ReactNode,
  useCallback,
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
  const sessionVersionRef = useRef(0);

  const invalidatePendingSessionReads = useCallback(() => {
    sessionVersionRef.current += 1;
    return sessionVersionRef.current;
  }, []);

  const redirectToAuth = useCallback(
    (reason?: "expired" | "required") => {
      invalidatePendingSessionReads();
      setSession(null);
      setStatus("unauthenticated");

      if (pathname === "/auth") {
        return;
      }

      startTransition(() => {
        router.replace(toAuthRedirect(pathname, reason));
      });
    },
    [invalidatePendingSessionReads, pathname, router],
  );

  const refreshSession = useCallback(
    async (method: "GET" | "POST" = "GET"): Promise<SessionState | null> => {
      const requestVersion = sessionVersionRef.current;

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

        if (requestVersion !== sessionVersionRef.current) {
          return null;
        }

        setSession(nextSession);
        setStatus("authenticated");
        return nextSession;
      } catch (caughtError) {
        if (requestVersion !== sessionVersionRef.current) {
          return null;
        }

        const authError = caughtError as ErrorWithIssues;

        if (authError.status === 401) {
          const hasAuthenticatedSession = session !== null || status === "authenticated";

          if (method === "POST" || hasAuthenticatedSession || isProtectedPath(pathname)) {
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
    },
    [pathname, redirectToAuth, session, status],
  );

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

  const login = useCallback(async (payload: CredentialsPayload): Promise<SessionState> => {
    invalidatePendingSessionReads();

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
    return nextSession;
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<SessionState> => {
    invalidatePendingSessionReads();

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
    return nextSession;
  }, []);

  const logout = useCallback(
    async (redirectPath = "/auth"): Promise<void> => {
      invalidatePendingSessionReads();

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
    },
    [invalidatePendingSessionReads, router],
  );

  const handleUnauthorized = useCallback(
    (reason?: "expired" | "required") => {
      redirectToAuth(reason ?? "expired");
    },
    [redirectToAuth],
  );

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
