import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuthPage from "@/app/auth/page";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/lib/stores/auth-context", () => ({
  useAuth: () => ({
    status: "unauthenticated",
    session: null,
    login: mocks.login,
    register: mocks.register,
    logout: vi.fn(),
    refreshSession: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

describe("AuthPage", () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.register.mockReset();
    mocks.replace.mockReset();
    mocks.searchParams = new URLSearchParams();
  });

  it("submits login credentials and redirects to collection", async () => {
    mocks.login.mockResolvedValue({
      user: { id: 1, email: "user@example.com", displayName: "User", role: "USER" },
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    });

    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Secure Login" }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "Password123",
      });
    });
    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/collection");
    });
  });

  it("shows register mode and submits the display name", async () => {
    mocks.register.mockResolvedValue({
      user: { id: 2, email: "new@example.com", displayName: "New User", role: "USER" },
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    });

    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Register & Continue" }));

    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalledWith({
        displayName: "New User",
        email: "new@example.com",
        password: "Password123",
      });
    });
  });

  it("shows each validation issue returned by registration", async () => {
    mocks.register.mockRejectedValue({
      message: "Validation failed.",
      issues: [
        { message: "Display name must be at least 2 characters." },
        { message: "Enter a valid email address." },
        { message: "Password must be at least 8 characters." },
      ],
    });

    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    fireEvent.click(screen.getByRole("button", { name: "Register & Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Display name must be at least 2 characters.")).toBeInTheDocument();
    });
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(screen.queryByText("Validation failed.")).not.toBeInTheDocument();
  });
});
