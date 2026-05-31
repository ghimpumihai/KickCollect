import { NextResponse, type NextRequest } from "next/server";

import {
  createClearedSessionCookieHeader,
  createProxyUnauthorizedResponse,
  readSessionFromCookieHeader,
} from "@/lib/auth/session";

function isProtectedPage(pathname: string): boolean {
  return pathname === "/collection" || pathname.startsWith("/collection/") || pathname.startsWith("/card/");
}

function isProtectedApi(pathname: string): boolean {
  return pathname === "/api/cards" || pathname.startsWith("/api/cards/");
}

function isAuthPage(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

function isAuthRole(role: string | undefined): boolean {
  return role === "USER" || role === "ADMIN";
}

function hasActiveCookieSession(request: NextRequest): boolean {
  const session = readSessionFromCookieHeader(request.headers.get("cookie"));

  if (!session || !isAuthRole(session.role)) {
    return false;
  }

  return Date.parse(session.expiresAt) > Date.now();
}

function redirectToAuth(request: NextRequest): NextResponse {
  const redirectUrl = new URL("/auth", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  redirectUrl.searchParams.set("next", nextPath);

  const response = NextResponse.redirect(redirectUrl);
  response.headers.append("set-cookie", createClearedSessionCookieHeader());
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const authenticated = hasActiveCookieSession(request);

  if ((isProtectedPage(pathname) || isProtectedApi(pathname)) && !authenticated) {
    return isProtectedApi(pathname)
      ? createProxyUnauthorizedResponse()
      : redirectToAuth(request);
  }

  if (isAuthPage(pathname) && authenticated) {
    return NextResponse.redirect(new URL("/collection", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/:path*", "/collection/:path*", "/card/:path*", "/api/cards/:path*"],
};
