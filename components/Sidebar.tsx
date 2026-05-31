"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/stores/auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const { logout, session } = useAuth();

  const isDashboardActive = pathname === "/";
  const isCollectionActive = pathname === "/collection" || pathname.startsWith("/collection/");

  return (
    <aside className="kc-sidebar">
      <Link href="/" className="kc-sidebar-logo">
        <div className="kc-logo-icon" style={{ width: 30, height: 30, fontSize: 10 }}>
          KC
        </div>
        <span
          style={{
            fontFamily: "var(--kc-font-h)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--kc-text)",
            letterSpacing: 2,
          }}
        >
          KICK<span style={{ color: "var(--kc-em)" }}>COLLECT</span>
        </span>
      </Link>

      {session && (
        <div
          className="kc-glass-card"
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderColor: "var(--kc-border)",
            display: "grid",
            gap: 4,
          }}
        >
          <span
            style={{
              fontFamily: "var(--kc-font-h)",
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "var(--kc-muted)",
            }}
          >
            Signed in as
          </span>
          <span style={{ color: "var(--kc-text)", fontSize: 14, fontWeight: 600 }}>
            {session.user.displayName}
          </span>
          <span style={{ color: "var(--kc-muted)", fontSize: 12 }}>{session.user.email}</span>
        </div>
      )}

      <Link
        href="/"
        className={`kc-nav-item ${isDashboardActive ? "kc-active" : ""}`}
        aria-current={isDashboardActive ? "page" : undefined}
      >
        <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>ðŸ“Š</span> Dashboard
      </Link>
      <Link
        href="/collection"
        className={`kc-nav-item ${isCollectionActive ? "kc-active" : ""}`}
        aria-current={isCollectionActive ? "page" : undefined}
      >
        <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>ðŸƒ</span> Collection
      </Link>
      <button type="button" className="kc-nav-item">
        <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>ðŸ“¦</span> Pack Shop
      </button>
      <button type="button" className="kc-nav-item">
        <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>â­</span> Wishlist
      </button>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        className="kc-nav-item"
        onClick={() => {
          void logout();
        }}
      >
        <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>ðŸšª</span> Log Out
      </button>
    </aside>
  );
}
