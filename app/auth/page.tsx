import Link from "next/link";

export default function AuthPage() {
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
          Authentication Placeholder
        </h1>
        <p style={{ color: "#7a9b8a", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>
          Authentication is intentionally not implemented in this remediation pass. Use the direct
          collection route to continue validating migration behavior.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" className="kc-btn kc-btn-ghost">
            Back Home
          </Link>
          <Link href="/collection" className="kc-btn kc-btn-em">
            Go to Collection
          </Link>
        </div>
      </section>
    </main>
  );
}
