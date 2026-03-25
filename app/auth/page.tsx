"use client";

import Link from "next/link";
import { useState } from "react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

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
        aria-labelledby="auth-placeholder-title"
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
          id="auth-placeholder-title"
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
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "kc-btn kc-btn-em kc-btn-sm" : "kc-btn kc-btn-ghost kc-btn-sm"}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
        <p style={{ color: "#7a9b8a", fontSize: 16, lineHeight: 1.7, marginBottom: 18 }}>
          {mode === "login"
            ? "Welcome back. Continue to your collection dashboard."
            : "Create an account to start collecting and tracking cards."}
        </p>
        <form style={{ display: "grid", gap: 10, marginBottom: 22 }}>
          <input
            aria-label="Email"
            type="email"
            placeholder="Email"
            style={{ borderRadius: 10, border: "1px solid var(--kc-border)", padding: "10px 12px", background: "rgba(17,24,39,.75)", color: "var(--kc-text)" }}
          />
          <input
            aria-label="Password"
            type="password"
            placeholder="Password"
            style={{ borderRadius: 10, border: "1px solid var(--kc-border)", padding: "10px 12px", background: "rgba(17,24,39,.75)", color: "var(--kc-text)" }}
          />
          {mode === "register" && (
            <input
              aria-label="Display Name"
              type="text"
              placeholder="Display Name"
              style={{ borderRadius: 10, border: "1px solid var(--kc-border)", padding: "10px 12px", background: "rgba(17,24,39,.75)", color: "var(--kc-text)" }}
            />
          )}
        </form>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" className="kc-btn kc-btn-ghost">
            Back Home
          </Link>
          <Link href="/collection" className="kc-btn kc-btn-em">
            {mode === "login" ? "Continue to Collection" : "Create Account & Continue"}
          </Link>
        </div>
      </section>
    </main>
  );
}
