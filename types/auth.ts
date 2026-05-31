export type AuthRole = "USER" | "ADMIN";

export type AuthenticatedUser = {
  id: number;
  email: string;
  displayName: string;
  role: AuthRole;
};

export type SessionState = {
  user: AuthenticatedUser;
  expiresAt: string;
};
