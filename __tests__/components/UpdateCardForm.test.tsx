import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CardDetailPage from "@/app/card/[id]/page";

const mocks = vi.hoisted(() => ({
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  push: vi.fn(),
  card: {
    id: 101,
    player: "Initial Name",
    series: "Topps Chrome 2025",
    number: "#027/199",
    team: "Real Madrid",
    position: "MID",
    year: 2025,
    rarity: "Rare",
    condition: "Near Mint",
    value: "$12.50",
    dupes: 1,
    fav: false,
  },
}));

vi.mock("@/components/Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: String(mocks.card.id) }),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/stores/card-context", () => ({
  useCards: () => ({
    cards: [mocks.card],
    loading: false,
    error: null,
  }),
  useCardActions: () => ({
    createCard: vi.fn(),
    updateCard: mocks.updateCard,
    deleteCard: mocks.deleteCard,
  }),
}));

describe("UpdateCardForm flow", () => {
  beforeEach(() => {
    mocks.updateCard.mockReset();
    mocks.deleteCard.mockReset();
    mocks.push.mockReset();
    mocks.card = {
      id: 101,
      player: "Initial Name",
      series: "Topps Chrome 2025",
      number: "#027/199",
      team: "Real Madrid",
      position: "MID",
      year: 2025,
      rarity: "Rare",
      condition: "Near Mint",
      value: "$12.50",
      dupes: 1,
      fav: false,
    };
  });

  it("prefills modal, submits edits, and closes on success", () => {
    mocks.updateCard.mockReturnValue({ ...mocks.card, player: "Updated Name", value: "$99.00" });

    render(<CardDetailPage />);

    fireEvent.click(screen.getByRole("button", { name: /edit card/i }));

    const playerInput = screen.getByLabelText("Player");
    expect(playerInput).toHaveValue("Initial Name");

    fireEvent.change(playerInput, { target: { value: "Updated Name" } });
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mocks.updateCard).toHaveBeenCalledTimes(1);
    expect(mocks.updateCard).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ player: "Updated Name", value: "99" }),
    );
    expect(screen.queryByRole("heading", { name: "Edit Card" })).not.toBeInTheDocument();
  });

  it("keeps modal open and shows error when update fails", () => {
    mocks.updateCard.mockImplementation(() => {
      throw {
        issues: [{ message: "Player name must be at least 2 characters." }],
      };
    });

    render(<CardDetailPage />);

    fireEvent.click(screen.getByRole("button", { name: /edit card/i }));
    fireEvent.change(screen.getByLabelText("Player"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mocks.updateCard).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Player name must be at least 2 characters.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edit Card" })).toBeInTheDocument();
  });
});
