"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div
      className="kc-root"
      style={{ minHeight: "100vh", overflow: "hidden", position: "relative" }}
    >
      <div
        className="kc-orb kc-orb-em"
        style={{ width: 600, height: 600, top: -100, left: -100, opacity: 0.7 }}
      />
      <div
        className="kc-orb kc-orb-blue"
        style={{ width: 500, height: 500, top: 200, right: -100 }}
      />

      <nav
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 60px",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div className="kc-logo-icon" style={{ width: 38, height: 38, fontSize: 14 }}>
            KC
          </div>
          <span
            style={{
              fontFamily: "var(--kc-font-h)",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--kc-text)",
              letterSpacing: 2,
            }}
          >
            KICK<span style={{ color: "var(--kc-em)" }}>COLLECT</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/auth" className="kc-btn kc-btn-ghost kc-btn-sm">
            LOG IN
          </Link>
          <Link href="/auth" className="kc-btn kc-btn-em kc-btn-sm">
            GET STARTED
          </Link>
        </div>
      </nav>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "80px 40px 60px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(0,255,136,.08)",
            border: "1px solid var(--kc-border-em)",
            borderRadius: 20,
            padding: "6px 16px",
            marginBottom: 32,
            fontSize: 12,
            color: "var(--kc-em)",
            letterSpacing: 2,
            fontFamily: "var(--kc-font-h)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--kc-em)",
              boxShadow: "0 0 8px var(--kc-em)",
              display: "inline-block",
              animation: "kc-blink 1.5s infinite",
            }}
          />
          FOOTBALL CARD COLLECTOR PLATFORM
        </div>

        <h1
          style={{
            fontFamily: "var(--kc-font-h)",
            fontSize: "clamp(42px, 6vw, 80px)",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -1,
            marginBottom: 8,
            color: "var(--kc-text)",
          }}
        >
          OWN THE
          <br />
          <span style={{ color: "var(--kc-em)", textShadow: "var(--kc-em-glow)" }}>MOMENT.</span>
          <br />BUILD THE LEGEND.
        </h1>

        <p
          style={{
            fontFamily: "var(--kc-font-h)",
            fontSize: 14,
            letterSpacing: 4,
            color: "var(--kc-muted)",
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          Your ultimate digital card collection
        </p>

        <p
          style={{
            maxWidth: 520,
            color: "#7a9b8a",
            fontSize: 16,
            lineHeight: 1.7,
            marginBottom: 44,
            fontWeight: 300,
          }}
        >
          Collect, trade, and showcase iconic football cards. Open packs, chase legendary players,
          and build the most prestigious collection in the game.
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
            position: "relative",
            zIndex: 20,
          }}
        >
          <Link href="/auth" className="kc-btn kc-btn-em">
            START COLLECTING
          </Link>
          <Link href="/collection" className="kc-btn kc-btn-ghost">
            EXPLORE CARDS
          </Link>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
          padding: "0 40px 80px",
        }}
      >
        {[
          { label: "Common", color: "var(--kc-r-common)", glow: "var(--kc-r-common)" },
          { label: "Uncommon", color: "var(--kc-r-uncommon)", glow: "var(--kc-r-uncommon)" },
          { label: "Rare", color: "var(--kc-r-rare)", glow: "var(--kc-r-rare)" },
          { label: "Epic", color: "var(--kc-r-epic)", glow: "var(--kc-r-epic)" },
          {
            label: "Legendary",
            color: "var(--kc-r-legendary)",
            glow: "var(--kc-r-legendary)",
            borderEm: true,
          },
        ].map((r) => (
          <div
            key={r.label}
            style={{
              padding: "10px 22px",
              borderRadius: 30,
              background: "var(--kc-glass)",
              border: `1px solid ${r.borderEm ? "rgba(245,158,11,.4)" : "var(--kc-border)"}`,
              fontFamily: "var(--kc-font-h)",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--kc-text)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: r.color,
                boxShadow: `0 0 ${r.label === "Legendary" ? "10px" : "6px"} ${r.glow}`,
                display: "inline-block",
              }}
            />
            {r.label}
          </div>
        ))}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
          padding: "0 60px 80px",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {[
          {
            icon: "📦",
            title: "Pack Opening",
            body: "Tear open Starter, Premium, Elite & Legendary packs with animated reveals for every rarity tier.",
          },
          {
            icon: "🃏",
            title: "Smart Collection",
            body: "Filter, sort, favourite and track every card with real-time duplicate detection.",
          },
          {
            icon: "📊",
            title: "Live Dashboard",
            body: "Monitor rarity breakdown, series completion, coin balance, and milestones at a glance.",
          },
        ].map((f) => (
          <div key={f.title} className="kc-glass-card" style={{ transition: "border-color .3s, transform .3s" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(0,255,136,.1)",
                border: "1px solid var(--kc-border-em)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                marginBottom: 16,
              }}
            >
              {f.icon}
            </div>
            <div
              style={{
                fontFamily: "var(--kc-font-h)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--kc-text)",
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              {f.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--kc-muted)", lineHeight: 1.6 }}>{f.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
