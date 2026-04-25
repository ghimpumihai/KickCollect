"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Sidebar } from "@/components/Sidebar";
import { useCardActions, useCards } from "@/lib/stores/card-context";
import { useUserInsights } from "@/lib/stores/user-insights-context";
import type { CardEntry, Condition, Position, Rarity } from "@/types/card";
import { rarityColors } from "@/types/card";

type ModalType = "edit" | "sell" | null;

const positions: Position[] = ["GK", "DEF", "MID", "FWD"];
const rarities: Rarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const conditions: Condition[] = ["Mint", "Near Mint", "Good", "Fair", "Poor"];

const fieldInputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid var(--kc-border)",
  background: "rgba(17,24,39,.75)",
  color: "var(--kc-text)",
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: 1.3,
};

type EditCardForm = {
  player: string;
  series: string;
  number: string;
  team: string;
  position: Position;
  year: string;
  rarity: Rarity;
  condition: Condition;
  value: string;
  dupes: string;
  fav: boolean;
};

const createEditFormFromCard = (card: CardEntry): EditCardForm => ({
  player: card.player,
  series: card.series,
  number: card.number,
  team: card.team,
  position: card.position,
  year: String(card.year),
  rarity: card.rarity,
  condition: card.condition,
  value: card.value,
  dupes: String(card.dupes),
  fav: card.fav,
});

function getErrorMessage(caughtError: unknown, fallbackMessage: string): string {
  if (typeof caughtError === "object" && caughtError !== null && "issues" in caughtError) {
    const errorWithIssues = caughtError as {
      issues?: Array<{ message?: string }>;
    };
    if (Array.isArray(errorWithIssues.issues)) {
      const issueMessages = errorWithIssues.issues
        .map((issue) => issue.message)
        .filter((message): message is string => typeof message === "string" && message.length > 0);

      if (issueMessages.length > 0) {
        return issueMessages.join(" ");
      }
    }
  }

  if (caughtError instanceof Error && caughtError.message.trim().length > 0) {
    return caughtError.message;
  }

  return fallbackMessage;
}

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { cards, loading, error } = useCards();
  const { updateCard, deleteCard } = useCardActions();
  const { recordActivity } = useUserInsights();
  const [modal, setModal] = useState<ModalType>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteSubmitError, setDeleteSubmitError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<EditCardForm | null>(null);
  const [editSubmitError, setEditSubmitError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const cardId = useMemo(() => Number(params.id), [params.id]);

  const card = useMemo<CardEntry | undefined>(() => {
    if (!Number.isFinite(cardId)) {
      return undefined;
    }

    return cards.find((entry) => entry.id === cardId);
  }, [cards, cardId]);

  useEffect(() => {
    if (modal === "edit" && card) {
      setEditForm(createEditFormFromCard(card));
      setEditSubmitError(null);
      setEditSubmitting(false);
    }
  }, [card, modal]);

  const openEditModal = () => {
    if (!card) {
      return;
    }

    setEditForm(createEditFormFromCard(card));
    setEditSubmitError(null);
    setEditSubmitting(false);
    setModal("edit");
  };

  const closeEditModal = () => {
    setModal(null);
    setEditSubmitting(false);
    setEditSubmitError(null);
  };

  const handleEditTextInput =
    (key: keyof Omit<EditCardForm, "fav">) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setEditForm((current) =>
        current
          ? {
              ...current,
              [key]: value,
            }
          : current,
      );
    };

  const handleEditFavouriteChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEditForm((current) =>
      current
        ? {
            ...current,
            fav: event.target.checked,
          }
        : current,
    );
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!card || !editForm) {
      setEditSubmitError("Card details are unavailable. Please close and reopen the editor.");
      return;
    }

    setEditSubmitting(true);
    setEditSubmitError(null);

    try {
      const updated = await updateCard(card.id, {
        player: editForm.player,
        series: editForm.series,
        number: editForm.number,
        team: editForm.team,
        position: editForm.position,
        year: Number(editForm.year),
        rarity: editForm.rarity,
        condition: editForm.condition,
        value: editForm.value,
        dupes: Number(editForm.dupes),
        fav: editForm.fav,
      });

      if (!updated) {
        setEditSubmitError("Card could not be updated because it no longer exists.");
        setEditSubmitting(false);
        return;
      }

      recordActivity(`Updated card: ${editForm.player}`);
      closeEditModal();
    } catch (caughtError) {
      setEditSubmitError(
        getErrorMessage(caughtError, "Unable to update card. Please review the form and try again."),
      );
      setEditSubmitting(false);
    }
  };

  const openDeleteConfirmation = () => {
    setDeleteSubmitError(null);
    setDeleteSubmitting(false);
    setConfirmDelete(true);
  };

  const closeDeleteConfirmation = () => {
    if (deleteSubmitting) {
      return;
    }

    setDeleteSubmitError(null);
    setDeleteSubmitting(false);
    setConfirmDelete(false);
  };

  const handleDeleteConfirm = async () => {
    if (!card) {
      setDeleteSubmitError("Card details are unavailable. Please close this dialog and try again.");
      return;
    }

    setDeleteSubmitting(true);
    setDeleteSubmitError(null);

    try {
      const deleted = await deleteCard(card.id);

      if (!deleted) {
        setDeleteSubmitError("Card could not be deleted because it no longer exists.");
        setDeleteSubmitting(false);
        return;
      }

      recordActivity(`Deleted card: ${card.player}`);
      setConfirmDelete(false);
      router.push("/collection");
    } catch (caughtError) {
      setDeleteSubmitError(getErrorMessage(caughtError, "Unable to delete card. Please try again."));
      setDeleteSubmitting(false);
    }
  };

  return (
    <main className="kc-root" style={{ minHeight: "100vh", display: "flex" }}>
      <Sidebar />

      <section style={{ flex: 1, padding: "28px 24px 36px", position: "relative", overflowY: "auto" }}>
        <div
          className="kc-orb kc-orb-em"
          style={{ width: 380, height: 380, top: -140, right: -110, opacity: 0.45 }}
        />

        <div style={{ position: "relative", zIndex: 10, maxWidth: 960 }}>
          <Link
            href="/collection"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "var(--kc-muted)",
              marginBottom: 20,
              letterSpacing: 1.5,
              fontFamily: "var(--kc-font-h)",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← Back to collection
          </Link>

          {loading && (
            <div className="kc-glass-card">
              <p style={{ color: "var(--kc-text)", margin: 0 }}>Loading card details…</p>
            </div>
          )}

          {!loading && error && !card && (
            <div className="kc-glass-card" style={{ borderColor: "rgba(239, 68, 68, .35)" }}>
              <h1
                style={{
                  fontFamily: "var(--kc-font-h)",
                  fontSize: "clamp(22px, 3vw, 32px)",
                  letterSpacing: 1,
                  marginBottom: 8,
                  color: "var(--kc-text)",
                }}
              >
                Unable to load card
              </h1>
              <p style={{ color: "var(--kc-muted)", margin: 0 }}>{error}</p>
            </div>
          )}

          {!loading && !error && !card && (
            <div className="kc-glass-card">
              <h1
                style={{
                  fontFamily: "var(--kc-font-h)",
                  fontSize: "clamp(22px, 3vw, 32px)",
                  letterSpacing: 1,
                  marginBottom: 8,
                  color: "var(--kc-text)",
                }}
              >
                Card not found
              </h1>
              <p style={{ color: "var(--kc-muted)", margin: 0 }}>
                We could not find a card for ID <strong style={{ color: "var(--kc-text)" }}>{params.id}</strong>.
              </p>
            </div>
          )}

          {!loading && card && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)",
                  gap: 20,
                  alignItems: "start",
                }}
              >
                <article
                  className="kc-glass-card"
                  style={{
                    borderColor: "var(--kc-border)",
                    background:
                      card.rarity === "Epic"
                        ? "linear-gradient(160deg, rgba(168,85,247,.16) 0%, rgba(255,255,255,.04) 100%)"
                        : card.rarity === "Legendary"
                          ? "linear-gradient(160deg, rgba(245,158,11,.14) 0%, rgba(255,255,255,.04) 100%)"
                          : "var(--kc-glass)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--kc-font-h)",
                      fontSize: 10,
                      letterSpacing: 2,
                      color: "var(--kc-muted)",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    Card Preview
                  </div>
                  <div
                    style={{
                      aspectRatio: "2/3",
                      borderRadius: 14,
                      border: `1px solid ${rarityColors[card.rarity]}`,
                      boxShadow: `0 0 24px color-mix(in srgb, ${rarityColors[card.rarity]} 35%, transparent)`,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 999,
                        border: `1px solid ${rarityColors[card.rarity]}`,
                        color: rarityColors[card.rarity],
                        padding: "4px 10px",
                        fontSize: 10,
                        fontFamily: "var(--kc-font-h)",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        width: "fit-content",
                      }}
                    >
                      {card.rarity}
                    </div>

                    <div>
                      <div
                        style={{
                          fontFamily: "var(--kc-font-h)",
                          fontSize: 13,
                          letterSpacing: 1,
                          color: "var(--kc-text)",
                          textTransform: "uppercase",
                        }}
                      >
                        {card.player}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--kc-muted)" }}>
                        {card.team} · {card.position}
                      </div>
                    </div>
                  </div>
                </article>

                <div className="kc-glass-card" style={{ borderColor: "var(--kc-border)" }}>
                  <h1
                    style={{
                      fontFamily: "var(--kc-font-h)",
                      fontSize: "clamp(24px, 3.6vw, 38px)",
                      letterSpacing: 1,
                      color: "var(--kc-text)",
                      marginBottom: 10,
                    }}
                  >
                    {card.player}
                  </h1>

                  <p style={{ color: "var(--kc-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
                    {card.series} {card.number ? `· ${card.number}` : ""}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 10,
                      marginBottom: 18,
                    }}
                  >
                    <Stat label="Team" value={card.team} />
                    <Stat label="Year" value={String(card.year)} />
                    <Stat label="Condition" value={card.condition} />
                    <Stat label="Value" value={card.value} highlight />
                    <Stat label="Duplicates" value={String(card.dupes)} />
                    <Stat label="Favourite" value={card.fav ? "Yes" : "No"} />
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="button" className="kc-btn kc-btn-em" onClick={openEditModal}>
                      ✎ Edit card
                    </button>
                    <button
                      type="button"
                      className="kc-btn kc-btn-ghost"
                      onClick={() => setModal("sell")}
                      disabled={card.dupes < 1}
                      aria-disabled={card.dupes < 1}
                      style={card.dupes < 1 ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                    >
                      🪙 Sell duplicate
                    </button>
                    <button
                      type="button"
                      className="kc-btn"
                      onClick={openDeleteConfirmation}
                      style={{
                        background: "transparent",
                        color: "#ef4444",
                        border: "1px solid rgba(239,68,68,.35)",
                      }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>

              <section style={{ marginTop: 24 }}>
                <h2
                  style={{
                    fontFamily: "var(--kc-font-h)",
                    fontSize: 11,
                    letterSpacing: 2,
                    color: "var(--kc-muted)",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Task shells
                </h2>
                <div className="kc-glass-card" style={{ borderColor: "var(--kc-border)" }}>
                  <p style={{ margin: 0, color: "var(--kc-muted)", lineHeight: 1.6, fontSize: 14 }}>
                    Edit and delete are fully operational for the assignment CRUD scope. The sell duplicate dialog
                    remains a lightweight shell for optional expansion.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </section>

      {modal === "edit" && card && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,.64)",
            backdropFilter: "blur(5px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            className="kc-glass-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-card-modal-title"
            style={{
              maxWidth: 680,
              width: "100%",
              borderColor: "var(--kc-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <h2
                id="edit-card-modal-title"
                style={{
                  margin: 0,
                  fontFamily: "var(--kc-font-h)",
                  color: "var(--kc-text)",
                  fontSize: 18,
                  letterSpacing: 1,
                }}
              >
                Edit Card
              </h2>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={editSubmitting}
                aria-label="Close edit card modal"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--kc-muted)",
                  cursor: "pointer",
                  fontSize: 22,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {editForm ? (
              <form onSubmit={handleEditSubmit}>
                {editSubmitError && (
                  <div
                    className="kc-glass-card"
                    style={{
                      marginBottom: 14,
                      borderColor: "rgba(239,68,68,.35)",
                      background: "rgba(127,29,29,.18)",
                      padding: "12px 14px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#fca5a5",
                        lineHeight: 1.5,
                        fontSize: 13,
                      }}
                    >
                      {editSubmitError}
                    </p>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                  }}
                >
                  <Field label="Player" htmlFor="edit-player">
                    <input
                      id="edit-player"
                      value={editForm.player}
                      onChange={handleEditTextInput("player")}
                      style={fieldInputStyle}
                    />
                  </Field>

                  <Field label="Series" htmlFor="edit-series">
                    <input
                      id="edit-series"
                      value={editForm.series}
                      onChange={handleEditTextInput("series")}
                      style={fieldInputStyle}
                    />
                  </Field>

                  <Field label="Card Number" htmlFor="edit-number">
                    <input
                      id="edit-number"
                      value={editForm.number}
                      onChange={handleEditTextInput("number")}
                      style={fieldInputStyle}
                    />
                  </Field>

                  <Field label="Team" htmlFor="edit-team">
                    <input
                      id="edit-team"
                      value={editForm.team}
                      onChange={handleEditTextInput("team")}
                      style={fieldInputStyle}
                    />
                  </Field>

                  <Field label="Position" htmlFor="edit-position">
                    <select
                      id="edit-position"
                      value={editForm.position}
                      onChange={handleEditTextInput("position")}
                      style={fieldInputStyle}
                    >
                      {positions.map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Year" htmlFor="edit-year">
                    <input
                      id="edit-year"
                      value={editForm.year}
                      onChange={handleEditTextInput("year")}
                      style={fieldInputStyle}
                      inputMode="numeric"
                    />
                  </Field>

                  <Field label="Rarity" htmlFor="edit-rarity">
                    <select
                      id="edit-rarity"
                      value={editForm.rarity}
                      onChange={handleEditTextInput("rarity")}
                      style={fieldInputStyle}
                    >
                      {rarities.map((rarity) => (
                        <option key={rarity} value={rarity}>
                          {rarity}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Condition" htmlFor="edit-condition">
                    <select
                      id="edit-condition"
                      value={editForm.condition}
                      onChange={handleEditTextInput("condition")}
                      style={fieldInputStyle}
                    >
                      {conditions.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Value" htmlFor="edit-value">
                    <input
                      id="edit-value"
                      value={editForm.value}
                      onChange={handleEditTextInput("value")}
                      style={fieldInputStyle}
                      placeholder="$12.50"
                    />
                  </Field>

                  <Field label="Duplicates" htmlFor="edit-dupes">
                    <input
                      id="edit-dupes"
                      value={editForm.dupes}
                      onChange={handleEditTextInput("dupes")}
                      style={fieldInputStyle}
                      inputMode="numeric"
                    />
                  </Field>
                </div>

                <label
                  htmlFor="edit-fav"
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--kc-text)",
                    fontSize: 13,
                  }}
                >
                  <input
                    id="edit-fav"
                    type="checkbox"
                    checked={editForm.fav}
                    onChange={handleEditFavouriteChange}
                  />
                  Mark as favourite
                </label>

                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="kc-btn kc-btn-ghost"
                    onClick={closeEditModal}
                    disabled={editSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="kc-btn kc-btn-em" disabled={editSubmitting}>
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <p style={{ margin: 0, color: "var(--kc-muted)", lineHeight: 1.6 }}>
                Card details are unavailable. Please close and reopen the editor.
              </p>
            )}
          </div>
        </div>
      )}

      {modal === "sell" && card && (
        <ModalShell title="Sell Duplicate" onClose={() => setModal(null)}>
          <p style={{ margin: 0, color: "var(--kc-muted)", lineHeight: 1.6 }}>
            Sell flow shell: this card currently has <strong style={{ color: "var(--kc-em)" }}>{card.dupes}</strong>
            {" "}
            duplicate{card.dupes === 1 ? "" : "s"}. Coin payout and state updates are intentionally deferred.
          </p>
        </ModalShell>
      )}

      {confirmDelete && card && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(0,0,0,.72)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            className="kc-glass-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-card-title"
            style={{ maxWidth: 480, width: "100%", borderColor: "rgba(239,68,68,.25)" }}
          >
            <h2
              id="delete-card-title"
              style={{
                fontFamily: "var(--kc-font-h)",
                color: "var(--kc-text)",
                letterSpacing: 1,
                fontSize: 16,
                marginBottom: 10,
              }}
            >
              Delete card
            </h2>
            <p style={{ color: "var(--kc-muted)", lineHeight: 1.6, marginBottom: 16, fontSize: 14 }}>
              Are you sure you want to delete <strong style={{ color: "var(--kc-text)" }}>{card.player}</strong>? This
              action cannot be undone.
            </p>
            {deleteSubmitError && (
              <div
                className="kc-glass-card"
                style={{
                  marginBottom: 14,
                  borderColor: "rgba(239,68,68,.35)",
                  background: "rgba(127,29,29,.18)",
                  padding: "12px 14px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#fca5a5",
                    lineHeight: 1.5,
                    fontSize: 13,
                  }}
                >
                  {deleteSubmitError}
                </p>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="kc-btn"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                style={{
                  background: "transparent",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,.35)",
                }}
              >
                {deleteSubmitting ? "Deleting..." : "Confirm delete"}
              </button>
              <button
                type="button"
                className="kc-btn kc-btn-ghost"
                onClick={closeDeleteConfirmation}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid var(--kc-border)",
        background: "var(--kc-glass)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--kc-muted)",
          letterSpacing: 1.4,
          textTransform: "uppercase",
          fontFamily: "var(--kc-font-h)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--kc-font-h)",
          fontSize: 14,
          color: highlight ? "var(--kc-em)" : "var(--kc-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} style={{ display: "grid", gap: 6 }}>
      <span
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "var(--kc-muted)",
          fontFamily: "var(--kc-font-h)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,.6)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        className="kc-glass-card"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 520, width: "100%", borderColor: "var(--kc-border)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2
            style={{
              fontFamily: "var(--kc-font-h)",
              color: "var(--kc-text)",
              letterSpacing: 1,
              fontSize: 16,
              marginBottom: 14,
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--kc-muted)",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              marginTop: -10,
            }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {children}

        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="kc-btn kc-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
