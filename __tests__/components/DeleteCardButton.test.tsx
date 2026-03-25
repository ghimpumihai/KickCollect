import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CardDetailPage from "@/app/card/[id]/page";

const mocks = vi.hoisted(() => ({
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  push: vi.fn(),
  card: {
    id: 55,
    player: "Delete Target",
    series: "Topps Chrome 2025",
    number: "#027/199",
    team: "Real Madrid",
    position: "MID",
    year: 2025,
    rarity: "Rare",
    condition: "Near Mint",
    value: "$34.50",
    dupes: 2,
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

describe("DeleteCardButton flow", () => {
  beforeEach(() => {
    mocks.updateCard.mockReset();
    mocks.deleteCard.mockReset();
    mocks.push.mockReset();
    mocks.card = {
      id: 55,
      player: "Delete Target",
      series: "Topps Chrome 2025",
      number: "#027/199",
      team: "Real Madrid",
      position: "MID",
      year: 2025,
      rarity: "Rare",
      condition: "Near Mint",
      value: "$34.50",
      dupes: 2,
      fav: false,
    };
  });

  it("opens confirmation and navigates to collection on successful delete", () => {
    mocks.deleteCard.mockReturnValue(true);

    render(<CardDetailPage />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByRole("heading", { name: /delete card/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));

    expect(mocks.deleteCard).toHaveBeenCalledTimes(1);
    expect(mocks.deleteCard).toHaveBeenCalledWith(55);
    expect(mocks.push).toHaveBeenCalledWith("/collection");
    expect(screen.queryByRole("heading", { name: /delete card/i })).not.toBeInTheDocument();
  });

  it("shows inline error and stays on page when delete returns false", () => {
    mocks.deleteCard.mockReturnValue(false);

    render(<CardDetailPage />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));

    expect(mocks.deleteCard).toHaveBeenCalledWith(55);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(
      screen.getByText("Card could not be deleted because it no longer exists."),
    ).toBeInTheDocument();
  });
});
