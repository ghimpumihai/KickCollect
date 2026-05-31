import { beforeEach, describe, expect, it } from "vitest";

import { createTestUser, getCookieValue, resetAuthState } from "@/__tests__/auth-helpers";
import { POST as LOGIN_POST } from "@/app/api/auth/login/route";
import { POST as LOGOUT_POST } from "@/app/api/auth/logout/route";
import { POST as REGISTER_POST } from "@/app/api/auth/register/route";
import { GET as SESSION_GET } from "@/app/api/auth/session/route";
import { prisma } from "@/lib/server/prisma";

const BASE_URL = `${process.env.TEST_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"}/api/auth`;

function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

beforeEach(async () => {
  await resetAuthState();
});

describe("POST /api/auth/register", () => {
  it("creates a USER account and returns a session cookie", async () => {
    const response = await REGISTER_POST(
      new Request(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "Assignment User",
          email: "assignment@example.com",
          password: "Password123",
        }),
      }),
    );
    const body = await readJson<{ user: { displayName: string; email: string; role: string } }>(response);

    expect(response.status).toBe(201);
    expect(body.user.displayName).toBe("Assignment User");
    expect(body.user.email).toBe("assignment@example.com");
    expect(body.user.role).toBe("USER");
    expect(response.headers.get("set-cookie")).toContain("kc_session=");
    expect(await prisma.user.findUnique({ where: { email: "assignment@example.com" } })).not.toBeNull();
  });
});

describe("POST /api/auth/login", () => {
  it("returns a session for valid credentials", async () => {
    const { user, password } = await createTestUser({
      email: "login@example.com",
      displayName: "Login User",
    });

    const response = await LOGIN_POST(
      new Request(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password,
        }),
      }),
    );
    const body = await readJson<{ user: { email: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.user.email).toBe("login@example.com");
    expect(response.headers.get("set-cookie")).toContain("kc_session=");
  });

  it("rejects invalid credentials", async () => {
    const { user } = await createTestUser({
      email: "wrong-pass@example.com",
    });

    const response = await LOGIN_POST(
      new Request(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: "not-the-password",
        }),
      }),
    );
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid email or password.");
  });
});

describe("GET /api/auth/session", () => {
  it("returns the authenticated session from the cookie", async () => {
    const registerResponse = await REGISTER_POST(
      new Request(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "Session User",
          email: "session@example.com",
          password: "Password123",
        }),
      }),
    );

    const response = await SESSION_GET(
      new Request(`${BASE_URL}/session`, {
        headers: {
          cookie: getCookieValue(registerResponse.headers.get("set-cookie") ?? ""),
        },
      }),
    );
    const body = await readJson<{ user: { email: string; displayName: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.user.email).toBe("session@example.com");
    expect(body.user.displayName).toBe("Session User");
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie and removes the stored session", async () => {
    const registerResponse = await REGISTER_POST(
      new Request(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "Logout User",
          email: "logout@example.com",
          password: "Password123",
        }),
      }),
    );

    const response = await LOGOUT_POST(
      new Request(`${BASE_URL}/logout`, {
        method: "POST",
        headers: {
          cookie: getCookieValue(registerResponse.headers.get("set-cookie") ?? ""),
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await prisma.session.count()).toBe(0);
  });
});
