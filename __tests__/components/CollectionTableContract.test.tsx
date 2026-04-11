import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CollectionPage from "@/app/collection/page";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("@/components/Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("@/lib/stores/card-context", () => ({
  useCards: () => ({
    cards: [
      {
        id: 1,
        player: "Aitana Bonmati",
        series: "Topps Finest",
        number: "#01",
        team: "FC Barcelona",
        position: "MID",
        year: 2024,
        rarity: "Rare",
        condition: "Mint",
        value: "$120.00",
        dupes: 0,
        fav: true,
      },
      {
        id: 2,
        player: "Erling Haaland",
        series: "Panini Prizm",
        number: "#09",
        team: "Manchester City",
        position: "FWD",
        year: 2023,
        rarity: "Epic",
        condition: "Near Mint",
        value: "$95.00",
        dupes: 2,
        fav: false,
      },
      {
        id: 3,
        player: "Jude Bellingham",
        series: "Donruss Optic",
        number: "#11",
        team: "Real Madrid",
        position: "MID",
        year: 2024,
        rarity: "Rare",
        condition: "Mint",
        value: "$85.00",
        dupes: 1,
        fav: false,
      },
      {
        id: 4,
        player: "Lionel Messi",
        series: "Select",
        number: "#10",
        team: "Inter Miami",
        position: "FWD",
        year: 2024,
        rarity: "Legendary",
        condition: "Near Mint",
        value: "$250.00",
        dupes: 0,
        fav: true,
      },
      {
        id: 5,
        player: "Virgil van Dijk",
        series: "Topps Chrome",
        number: "#04",
        team: "Liverpool",
        position: "DEF",
        year: 2022,
        rarity: "Uncommon",
        condition: "Good",
        value: "$40.00",
        dupes: 3,
        fav: false,
      },
      {
        id: 6,
        player: "Alisson Becker",
        series: "Mosaic",
        number: "#01",
        team: "Liverpool",
        position: "GK",
        year: 2023,
        rarity: "Common",
        condition: "Mint",
        value: "$22.00",
        dupes: 0,
        fav: false,
      },
      {
        id: 7,
        player: "Bukayo Saka",
        series: "Topps Merlin",
        number: "#07",
        team: "Arsenal",
        position: "FWD",
        year: 2025,
        rarity: "Epic",
        condition: "Mint",
        value: "$110.00",
        dupes: 2,
        fav: true,
      },
    ],
    loading: false,
    error: null,
    refresh: mocks.refresh,
  }),
  useCardActions: () => ({
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
  }),
}));

describe("Collection semantic table contract", () => {
  beforeEach(() => {
    mocks.refresh.mockReset();
  });

  it("exposes cards through a semantic table with expected Bronze columns", () => {
    render(<CollectionPage />);

    const table = screen.getByRole("table", { name: /collection cards/i });
    const headers = within(table).getAllByRole("columnheader");
    const headerNames = headers.map((header) => header.textContent?.trim() ?? "");

    expect(headerNames).toEqual(
      expect.arrayContaining(["Player", "Team", "Position", "Year", "Value", "Dupes"]),
    );

    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(7);
  });

  it("provides pagination context for the semantic table", () => {
    render(<CollectionPage />);

    expect(screen.getByText(/page\s+1\s+of\s+2/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();

    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton).toBeEnabled();

    fireEvent.click(nextButton);

    expect(screen.getByText(/page\s+2\s+of\s+2/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Prev" })).toBeEnabled();
  });

  it("updates the value statistic when filters change", () => {
    render(<CollectionPage />);

    expect(screen.getByTestId("collection-value-total")).toHaveTextContent(
      "Filtered total value: $722.00",
    );

    fireEvent.change(screen.getByLabelText("Rarity"), {
      target: { value: "Rare" },
    });

    expect(screen.getByTestId("collection-value-total")).toHaveTextContent(
      "Filtered total value: $205.00",
    );
  });
});
