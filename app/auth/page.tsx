"use client";

import Link from "next/link";
import { startTransition, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { ErrorWithIssues } from "@/lib/client/api";
import { useAuth } from "@/lib/stores/auth-context";

type AuthMode = "login" | "register";

type AuthFormState = {
  displayName: string;
  email: string;
  password: string;
};

const initialFormState: AuthFormState = {
  displayName: "",
  email: "",
  password: "",
};

function getErrorMessages(caughtError: unknown): string[] {
  const issueMessages =
    typeof caughtError === "object" && caughtError !== null && "issues" in caughtError
      ? ((caughtError as ErrorWithIssues).issues ?? [])
          .map((issue) => issue.message)
          .filter((message) => typeof message === "string" && message.trim().length > 0)
      : [];

  if (issueMessages.length > 0) {
    return issueMessages;
  }

  if (caughtError instanceof Error && caughtError.message.trim().length > 0) {
    return [caughtError.message];
  }

  return ["Unable to authenticate."];
}

function isSafeRedirectPath(value: string | null): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, status } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<AuthFormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  const nextPath = useMemo(() => {
    const requestedPath = searchParams.get("next");
    return isSafeRedirectPath(requestedPath) ? requestedPath : "/collection";
  }, [searchParams]);

  const sessionMessage = useMemo(() => {
    switch (searchParams.get("reason")) {
      case "expired":
        return "Your session expired after inactivity. Please log in again.";
      case "required":
        return "Please log in to access your collection.";
      default:
        return null;
    }
  }, [searchParams]);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmitErrors([]);
  };

  const handleFieldChange = (key: keyof AuthFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSubmitErrors([]);
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitErrors([]);

    try {
      if (mode === "login") {
        await login({
          email: form.email,
          password: form.password,
        });
      } else {
        await register({
          displayName: form.displayName,
          email: form.email,
          password: form.password,
        });
      }

      setForm(initialFormState);

      startTransition(() => {
        router.replace(nextPath);
      });
    } catch (caughtError) {
      setSubmitErrors(getErrorMessages(caughtError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="kc-root" style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <div
        className="kc-orb kc-orb-em"
        style={{ width: 420, height: 420, top: -120, left: -100, opacity: 0.7 }}
      />
      <div
        className="kc-orb kc-orb-blue"
        style={{ width: 360, height: 360, bottom: -120, right: -80, opacity: 0.8 }}
      />

      <section
        aria-labelledby="auth-title"
        className="kc-glass-card"
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
          top: "min(14vh, 120px)",
        }}
      >
        <h1
          id="auth-title"
          style={{
            fontFamily: "var(--kc-font-h)",
            color: "var(--kc-text)",
            fontSize: "clamp(30px, 4vw, 42px)",
            letterSpacing: 1,
            marginBottom: 12,
          }}
        >
          {mode === "login" ? "Log In" : "Register"}
        </h1>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button
            type="button"
            className={mode === "login" ? "kc-btn kc-btn-em kc-btn-sm" : "kc-btn kc-btn-ghost kc-btn-sm"}
            onClick={() => handleModeChange("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "kc-btn kc-btn-em kc-btn-sm" : "kc-btn kc-btn-ghost kc-btn-sm"}
            onClick={() => handleModeChange("register")}
          >
            Register
          </button>
        </div>

        <p style={{ color: "#7a9b8a", fontSize: 16, lineHeight: 1.7, marginBottom: 18 }}>
          {mode === "login"
            ? "Welcome back. Sign in with a secure HTTPS session before opening the collection."
            : "Create your USER account to securely manage the collection across the LAN."}
        </p>

        {sessionMessage && (
          <div
            className="kc-glass-card"
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              borderColor: "rgba(251,191,36,.35)",
              background: "rgba(120,53,15,.18)",
            }}
          >
            <p style={{ margin: 0, color: "#fde68a", fontSize: 13, lineHeight: 1.6 }}>{sessionMessage}</p>
          </div>
        )}

        {submitErrors.length > 0 && (
          <div
            className="kc-glass-card"
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              borderColor: "rgba(239,68,68,.35)",
              background: "rgba(127,29,29,.18)",
            }}
          >
            <ul style={{ margin: 0, paddingLeft: 18, color: "#fca5a5", fontSize: 13, lineHeight: 1.7 }}>
              {submitErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <form style={{ display: "grid", gap: 10, marginBottom: 22 }} onSubmit={handleSubmit}>
          {mode === "register" && (
            <input
              aria-label="Display Name"
              type="text"
              value={form.displayName}
              onChange={handleFieldChange("displayName")}
              placeholder="Display Name"
              style={{
                borderRadius: 10,
                border: "1px solid var(--kc-border)",
                padding: "10px 12px",
                background: "rgba(17,24,39,.75)",
                color: "var(--kc-text)",
              }}
            />
          )}
          <input
            aria-label="Email"
            type="email"
            value={form.email}
            onChange={handleFieldChange("email")}
            placeholder="Email"
            style={{
              borderRadius: 10,
              border: "1px solid var(--kc-border)",
              padding: "10px 12px",
              background: "rgba(17,24,39,.75)",
              color: "var(--kc-text)",
            }}
          />
          <input
            aria-label="Password"
            type="password"
            value={form.password}
            onChange={handleFieldChange("password")}
            placeholder="Password"
            style={{
              borderRadius: 10,
              border: "1px solid var(--kc-border)",
              padding: "10px 12px",
              background: "rgba(17,24,39,.75)",
              color: "var(--kc-text)",
            }}
          />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/" className="kc-btn kc-btn-ghost">
              Back Home
            </Link>
            <button type="submit" className="kc-btn kc-btn-em" disabled={submitting || status === "loading"}>
              {submitting
                ? mode === "login"
                  ? "Signing In..."
                  : "Creating Account..."
                : mode === "login"
                  ? "Secure Login"
                  : "Register & Continue"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
