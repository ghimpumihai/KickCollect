import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CollectionPage from "@/app/collection/page";

const mocks = vi.hoisted(() => ({
  createCard: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/components/Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("@/lib/stores/card-context", () => ({
  useCards: () => ({
    cards: [],
    loading: false,
    error: null,
    refresh: mocks.refresh,
  }),
  useCardActions: () => ({
    createCard: mocks.createCard,
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
  }),
}));

describe("CreateCardForm flow", () => {
  beforeEach(() => {
    mocks.createCard.mockReset();
    mocks.refresh.mockReset();
  });

  it("opens modal and submits create successfully", async () => {
    mocks.createCard.mockResolvedValue({ id: 200 });
    mocks.refresh.mockResolvedValue(undefined);

    render(<CollectionPage />);

    fireEvent.click(screen.getByRole("button", { name: /add card/i }));
    expect(screen.getByRole("heading", { name: "Add Card" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Player"), { target: { value: "Bukayo Saka" } });
    fireEvent.change(screen.getByLabelText("Series"), { target: { value: "Topps Merlin 2025" } });
    fireEvent.change(screen.getByLabelText("Card Number"), { target: { value: "#050/199" } });
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "Arsenal" } });
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "45.25" } });

    fireEvent.click(screen.getByRole("button", { name: /create card/i }));

    await waitFor(() => {
      expect(mocks.createCard).toHaveBeenCalledTimes(1);
    });
    expect(mocks.createCard).toHaveBeenCalledWith(
      expect.objectContaining({
        player: "Bukayo Saka",
        series: "Topps Merlin 2025",
        number: "#050/199",
        team: "Arsenal",
        value: "45.25",
      }),
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Add Card" })).not.toBeInTheDocument();
    });
  });

  it("shows validation-like error when create action throws", async () => {
    mocks.createCard.mockRejectedValue({
        issues: [{ message: "Player name must be at least 2 characters." }],
    });

    render(<CollectionPage />);

    fireEvent.click(screen.getByRole("button", { name: /add card/i }));
    fireEvent.click(screen.getByRole("button", { name: /create card/i }));

    await waitFor(() => {
      expect(mocks.createCard).toHaveBeenCalledTimes(1);
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByText("Player name must be at least 2 characters.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Card" })).toBeInTheDocument();
  });
});
