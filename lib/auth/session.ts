import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { User } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import type { AuthenticatedUser, AuthRole, SessionState } from "@/types/auth";

const SESSION_COOKIE_NAME = "kc_session";
const configuredIdleSeconds = Number(process.env.AUTH_SESSION_IDLE_SECONDS ?? "");
const configuredIdleMinutes = Number(process.env.AUTH_SESSION_IDLE_MINUTES ?? "");
const SESSION_IDLE_SECONDS = Number.isFinite(configuredIdleSeconds) && configuredIdleSeconds > 0
  ? configuredIdleSeconds
  : Number.isFinite(configuredIdleMinutes) && configuredIdleMinutes > 0
    ? configuredIdleMinutes * 60
    : 15 * 60;
const SESSION_IDLE_TIMEOUT_MS = SESSION_IDLE_SECONDS * 1000;
const SESSION_SECRET = process.env.AUTH_SECRET?.trim() || "kickcollect-dev-session-secret";
const FORCE_SECURE_COOKIES = process.env.AUTH_COOKIE_SECURE === "true";

type SessionCookiePayload = {
  token: string;
  userId: number;
  role: AuthRole;
  expiresAt: string;
};

type SessionValidationSuccess = {
  ok: true;
  session: SessionState;
  cookieHeader: string;
};

type SessionValidationFailure = {
  ok: false;
  response: Response;
};

export type SessionValidationResult = SessionValidationSuccess | SessionValidationFailure;

type CookieOptions = {
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
};

function isAuthRole(value: unknown): value is AuthRole {
  return value === "USER" || value === "ADMIN";
}

function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS);
}

function shouldUseSecureCookies(): boolean {
  return FORCE_SECURE_COOKIES || process.env.NODE_ENV === "production";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sign(value: string): string {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function encodePayload(payload: SessionCookiePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(rawValue: string): SessionCookiePayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(rawValue, "base64url").toString("utf8")) as Partial<SessionCookiePayload>;

    if (
      typeof parsed.token !== "string" ||
      typeof parsed.userId !== "number" ||
      !isAuthRole(parsed.role) ||
      typeof parsed.expiresAt !== "string"
    ) {
      return null;
    }

    return {
      token: parsed.token,
      userId: parsed.userId,
      role: parsed.role,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.expires) {
    segments.push(`Expires=${options.expires.toUTCString()}`);
  }

  segments.push(`Path=${options.path ?? "/"}`);
  segments.push(`SameSite=${options.sameSite ?? "Lax"}`);

  if (options.httpOnly ?? true) {
    segments.push("HttpOnly");
  }

  if (options.secure ?? true) {
    segments.push("Secure");
  }

  return segments.join("; ");
}

function parseCookieHeader(cookieHeader: string | null | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .reduce<Record<string, string>>((cookies, segment) => {
      const separatorIndex = segment.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const name = segment.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(segment.slice(separatorIndex + 1));

      if (name.length > 0) {
        cookies[name] = value;
      }

      return cookies;
    }, {});
}

function createSessionCookieValue(payload: SessionCookiePayload): string {
  const encodedPayload = encodePayload(payload);
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function createSessionCookieHeader(payload: SessionCookiePayload): string {
  const expiresAt = new Date(payload.expiresAt);
  const maxAgeSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  return serializeCookie(SESSION_COOKIE_NAME, createSessionCookieValue(payload), {
    expires: expiresAt,
    httpOnly: true,
    maxAge: maxAgeSeconds,
    path: "/",
    sameSite: "Lax",
    secure: shouldUseSecureCookies(),
  });
}

export function createClearedSessionCookieHeader(): string {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "Lax",
    secure: shouldUseSecureCookies(),
  });
}

function toAuthenticatedUser(user: Pick<User, "id" | "email" | "displayName" | "role">): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

function createUnauthorizedResponse(message = "Authentication required."): Response {
  const response = Response.json({ error: message }, { status: 401 });
  response.headers.append("set-cookie", createClearedSessionCookieHeader());
  return response;
}

function appendSessionCookie(response: Response, cookieHeader: string): Response {
  response.headers.append("set-cookie", cookieHeader);
  return response;
}

function verifySignedCookie(cookieValue: string | undefined): SessionCookiePayload | null {
  if (!cookieValue) {
    return null;
  }

  const separatorIndex = cookieValue.lastIndexOf(".");
  if (separatorIndex <= 0) {
    return null;
  }

  const encodedPayload = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  return decodePayload(encodedPayload);
}

export function readSessionFromCookieHeader(cookieHeader: string | null | undefined): SessionCookiePayload | null {
  const cookies = parseCookieHeader(cookieHeader);
  return verifySignedCookie(cookies[SESSION_COOKIE_NAME]);
}

async function removeSessionByToken(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      tokenHash: hashToken(token),
    },
  });
}

export async function createSessionForUser(user: Pick<User, "id" | "email" | "displayName" | "role">): Promise<{
  cookieHeader: string;
  session: SessionState;
}> {
  const expiresAt = getSessionExpiry();
  const token = randomBytes(32).toString("base64url");

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      role: user.role,
      userId: user.id,
      expiresAt,
      lastActivityAt: new Date(),
    },
  });

  const session = {
    user: toAuthenticatedUser(user),
    expiresAt: expiresAt.toISOString(),
  } satisfies SessionState;

  return {
    cookieHeader: createSessionCookieHeader({
      token,
      userId: user.id,
      role: user.role,
      expiresAt: session.expiresAt,
    }),
    session,
  };
}

export async function validateUserSession(request: Request): Promise<SessionValidationResult> {
  const cookiePayload = readSessionFromCookieHeader(request.headers.get("cookie"));

  if (!cookiePayload) {
    return {
      ok: false,
      response: createUnauthorizedResponse(),
    };
  }

  const now = Date.now();
  const cookieExpiry = Date.parse(cookiePayload.expiresAt);

  if (!Number.isFinite(cookieExpiry) || cookieExpiry <= now) {
    await removeSessionByToken(cookiePayload.token);
    return {
      ok: false,
      response: createUnauthorizedResponse("Session expired due to inactivity."),
    };
  }

  const sessionRecord = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(cookiePayload.token),
    },
    include: {
      user: true,
    },
  });

  if (
    !sessionRecord ||
    sessionRecord.userId !== cookiePayload.userId ||
    !isAuthRole(sessionRecord.role) ||
    !isAuthRole(sessionRecord.user.role) ||
    sessionRecord.role !== sessionRecord.user.role ||
    sessionRecord.expiresAt.getTime() <= now
  ) {
    if (sessionRecord) {
      await prisma.session.delete({
        where: {
          id: sessionRecord.id,
        },
      });
    }

    return {
      ok: false,
      response: createUnauthorizedResponse("Session expired due to inactivity."),
    };
  }

  const refreshedExpiry = getSessionExpiry();
  const updatedSession = await prisma.session.update({
    where: {
      id: sessionRecord.id,
    },
    data: {
      expiresAt: refreshedExpiry,
      lastActivityAt: new Date(),
    },
    include: {
      user: true,
    },
  });

  const session = {
    user: toAuthenticatedUser(updatedSession.user),
    expiresAt: refreshedExpiry.toISOString(),
  } satisfies SessionState;

  return {
    ok: true,
    session,
    cookieHeader: createSessionCookieHeader({
      token: cookiePayload.token,
      userId: updatedSession.userId,
      role: updatedSession.role,
      expiresAt: session.expiresAt,
    }),
  };
}

export async function destroySession(request: Request): Promise<string> {
  const cookiePayload = readSessionFromCookieHeader(request.headers.get("cookie"));

  if (cookiePayload) {
    await removeSessionByToken(cookiePayload.token);
  }

  return createClearedSessionCookieHeader();
}

export function finalizeSessionResponse(response: Response, result: SessionValidationSuccess): Response {
  return appendSessionCookie(response, result.cookieHeader);
}

export function createProxyUnauthorizedResponse(message = "Authentication required."): NextResponse {
  const response = NextResponse.json({ error: message }, { status: 401 });
  response.headers.append("set-cookie", createClearedSessionCookieHeader());
  return response;
}
