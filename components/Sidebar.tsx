"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const isDashboardActive = pathname === "/";
  const isCollectionActive =
    pathname === "/collection" || pathname.startsWith("/collection/");
  const isAuthActive = pathname === "/auth" || pathname.startsWith("/auth/");

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

      <Link
        href="/"
        className={`kc-nav-item ${isDashboardActive ? "kc-active" : ""}`}
        aria-current={isDashboardActive ? "page" : undefined}
      >
        <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>📊</span> Dashboard
      </Link>
      <Link
        href="/collection"
        className={`kc-nav-item ${isCollectionActive ? "kc-active" : ""}`}
        aria-current={isCollectionActive ? "page" : undefined}
      >
        <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>🃏</span> Collection
      </Link>
      <button type="button" className="kc-nav-item">
        <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>📦</span> Pack Shop
      </button>
      <button type="button" className="kc-nav-item">
        <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>⭐</span> Wishlist
      </button>

      <div style={{ flex: 1 }} />

      <Link
        href="/auth"
        className={`kc-nav-item ${isAuthActive ? "kc-active" : ""}`}
        aria-current={isAuthActive ? "page" : undefined}
      >
        <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>🚪</span> Log Out
      </Link>
    </aside>
  );
}
