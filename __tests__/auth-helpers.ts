import type { User } from "@prisma/client";

import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSessionForUser } from "@/lib/auth/session";

type TestUserOptions = {
  displayName?: string;
  email?: string;
  password?: string;
  role?: "USER" | "ADMIN";
};

type AuthRequestOptions = TestUserOptions & {
  user?: User;
};

function buildUniqueEmail(prefix = "user"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

export async function resetAuthState(): Promise<void> {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(options: TestUserOptions = {}) {
  const password = options.password ?? "Password123";
  const user = await prisma.user.create({
    data: {
      displayName: options.displayName ?? "Test User",
      email: options.email ?? buildUniqueEmail("tester"),
      passwordHash: await hashPassword(password),
      role: options.role ?? "USER",
    },
  });

  return {
    user,
    password,
  };
}

export function getCookieValue(setCookieHeader: string): string {
  const separatorIndex = setCookieHeader.indexOf(";");
  return separatorIndex === -1 ? setCookieHeader : setCookieHeader.slice(0, separatorIndex);
}

export async function createAuthenticatedRequest(
  url: string,
  init: RequestInit = {},
  options: AuthRequestOptions = {},
): Promise<Request> {
  const user = options.user ?? (await createTestUser(options)).user;
  const session = await createSessionForUser(user);
  const headers = new Headers(init.headers);
  headers.set("cookie", getCookieValue(session.cookieHeader));

  return new Request(url, {
    ...init,
    headers,
  });
}
