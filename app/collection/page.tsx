"use client";

import Link from "next/link";
import {
	type CSSProperties,
	type ChangeEvent,
	type FormEvent,
	type ReactNode,
	useState,
} from "react";

import { Sidebar } from "@/components/Sidebar";
import { useCardActions, useCards } from "@/lib/stores/card-context";
import {
	type Condition,
	type Position,
	type Rarity,
	rarityColors,
} from "@/types/card";

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

type CreateCardForm = {
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

const createInitialFormState = (): CreateCardForm => ({
	player: "",
	series: "",
	number: "",
	team: "",
	position: "FWD",
	year: String(new Date().getFullYear()),
	rarity: "Common",
	condition: "Mint",
	value: "",
	dupes: "0",
	fav: false,
});

function getErrorMessage(caughtError: unknown): string {
	if (
		typeof caughtError === "object" &&
		caughtError !== null &&
		"issues" in caughtError
	) {
		const errorWithIssues = caughtError as {
			issues?: Array<{ message?: string }>;
		};
		if (Array.isArray(errorWithIssues.issues)) {
			const issueMessages = errorWithIssues.issues
				.map((issue) => issue.message)
				.filter(
					(message): message is string =>
						typeof message === "string" && message.length > 0,
				);

			if (issueMessages.length > 0) {
				return issueMessages.join(" ");
			}
		}
	}

	if (caughtError instanceof Error && caughtError.message.trim().length > 0) {
		return caughtError.message;
	}

	return "Unable to create card. Please review the form and try again.";
}

export default function CollectionPage() {
	const { cards, loading, error, refresh } = useCards();
	const { createCard } = useCardActions();
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [form, setForm] = useState<CreateCardForm>(() =>
		createInitialFormState(),
	);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const openCreateModal = () => {
		setSubmitError(null);
		setShowCreateModal(true);
	};

	const closeCreateModal = () => {
		setShowCreateModal(false);
		setSubmitting(false);
		setSubmitError(null);
		setForm(createInitialFormState());
	};

	const handleTextInput =
		(key: keyof Omit<CreateCardForm, "fav">) =>
		(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			const value = event.target.value;
			setForm((current) => ({
				...current,
				[key]: value,
			}));
		};

	const handleFavouriteChange = (event: ChangeEvent<HTMLInputElement>) => {
		setForm((current) => ({
			...current,
			fav: event.target.checked,
		}));
	};

	const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitting(true);
		setSubmitError(null);

		try {
			createCard({
				player: form.player,
				series: form.series,
				number: form.number,
				team: form.team,
				position: form.position,
				year: Number(form.year),
				rarity: form.rarity,
				condition: form.condition,
				value: form.value,
				dupes: Number(form.dupes),
				fav: form.fav,
			});

			refresh();
			closeCreateModal();
		} catch (caughtError) {
			setSubmitError(getErrorMessage(caughtError));
			setSubmitting(false);
		}
	};

	return (
		<main className="kc-root" style={{ minHeight: "100vh", display: "flex" }}>
			<Sidebar />

			<section
				style={{
					flex: 1,
					padding: "28px 24px 32px",
					position: "relative",
					overflowY: "auto",
				}}
			>
				<div
					className="kc-orb kc-orb-em"
					style={{
						width: 420,
						height: 420,
						top: -170,
						right: -120,
						opacity: 0.55,
					}}
				/>
				<div
					className="kc-orb kc-orb-blue"
					style={{
						width: 360,
						height: 360,
						bottom: -170,
						left: -120,
						opacity: 0.5,
					}}
				/>

				<div style={{ position: "relative", zIndex: 10, maxWidth: 1080 }}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							gap: 16,
							alignItems: "center",
							marginBottom: 18,
							flexWrap: "wrap",
						}}
					>
						<div>
							<h1
								style={{
									fontFamily: "var(--kc-font-h)",
									color: "var(--kc-text)",
									letterSpacing: 1,
									fontSize: "clamp(28px, 3.8vw, 42px)",
									marginBottom: 6,
								}}
							>
								Collection
							</h1>
							<p
								style={{
									color: "#7a9b8a",
									fontSize: 14,
									lineHeight: 1.7,
									margin: 0,
								}}
							>
								Track your cards and add new entries to your collection.
							</p>
						</div>

						<button
							type="button"
							className="kc-btn kc-btn-em"
							onClick={openCreateModal}
						>
							+ ADD CARD
						</button>
					</div>

					{error && (
						<div
							className="kc-glass-card"
							style={{ borderColor: "rgba(239,68,68,.35)", marginBottom: 16 }}
						>
							<p style={{ margin: 0, color: "#fca5a5", fontSize: 14 }}>
								{error}
							</p>
						</div>
					)}

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
							gap: 14,
						}}
					>
						{cards.map((card) => (
							<Link
								key={card.id}
								href={`/card/${card.id}`}
								className="kc-glass-card"
								style={{
									textDecoration: "none",
									borderColor: "var(--kc-border)",
									display: "block",
									transition: "transform .2s, border-color .2s",
								}}
							>
								<div
									style={{
										display: "inline-flex",
										alignItems: "center",
										border: `1px solid ${rarityColors[card.rarity]}`,
										color: rarityColors[card.rarity],
										borderRadius: 999,
										padding: "3px 10px",
										fontFamily: "var(--kc-font-h)",
										fontSize: 10,
										letterSpacing: 1,
										marginBottom: 10,
										textTransform: "uppercase",
									}}
								>
									{card.rarity}
								</div>

								<h2
									style={{
										margin: "0 0 6px",
										fontFamily: "var(--kc-font-h)",
										color: "var(--kc-text)",
										fontSize: 17,
										letterSpacing: 0.4,
									}}
								>
									{card.player}
								</h2>
								<p
									style={{
										margin: "0 0 6px",
										color: "var(--kc-muted)",
										fontSize: 13,
									}}
								>
									{card.team} · {card.position} · {card.year}
								</p>
								<p
									style={{ margin: "0 0 6px", color: "#9bb8ab", fontSize: 12 }}
								>
									{card.series} {card.number ? `· ${card.number}` : ""}
								</p>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										gap: 10,
										marginTop: 10,
									}}
								>
									<span
										style={{
											color: "var(--kc-em)",
											fontFamily: "var(--kc-font-h)",
											fontSize: 13,
										}}
									>
										{card.value}
									</span>
									<span style={{ color: "var(--kc-muted)", fontSize: 12 }}>
										Dupes: {card.dupes}
									</span>
								</div>
							</Link>
						))}
					</div>

					{loading && (
						<div className="kc-glass-card" style={{ marginTop: 16 }}>
							<p style={{ margin: 0, color: "var(--kc-text)", fontSize: 14 }}>
								Refreshing cards...
							</p>
						</div>
					)}
				</div>
			</section>

			{showCreateModal && (
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
						aria-labelledby="create-card-modal-title"
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
								id="create-card-modal-title"
								style={{
									margin: 0,
									fontFamily: "var(--kc-font-h)",
									color: "var(--kc-text)",
									fontSize: 18,
									letterSpacing: 1,
								}}
							>
								Add Card
							</h2>
							<button
								type="button"
								onClick={closeCreateModal}
								disabled={submitting}
								aria-label="Close add card modal"
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

						<form onSubmit={handleCreateSubmit}>
							{submitError && (
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
										{submitError}
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
								<Field label="Player" htmlFor="create-player">
									<input
										id="create-player"
										value={form.player}
										onChange={handleTextInput("player")}
										style={fieldInputStyle}
									/>
								</Field>

								<Field label="Series" htmlFor="create-series">
									<input
										id="create-series"
										value={form.series}
										onChange={handleTextInput("series")}
										style={fieldInputStyle}
									/>
								</Field>

								<Field label="Card Number" htmlFor="create-number">
									<input
										id="create-number"
										value={form.number}
										onChange={handleTextInput("number")}
										style={fieldInputStyle}
									/>
								</Field>

								<Field label="Team" htmlFor="create-team">
									<input
										id="create-team"
										value={form.team}
										onChange={handleTextInput("team")}
										style={fieldInputStyle}
									/>
								</Field>

								<Field label="Position" htmlFor="create-position">
									<select
										id="create-position"
										value={form.position}
										onChange={handleTextInput("position")}
										style={fieldInputStyle}
									>
										{positions.map((position) => (
											<option key={position} value={position}>
												{position}
											</option>
										))}
									</select>
								</Field>

								<Field label="Year" htmlFor="create-year">
									<input
										id="create-year"
										value={form.year}
										onChange={handleTextInput("year")}
										style={fieldInputStyle}
										inputMode="numeric"
									/>
								</Field>

								<Field label="Rarity" htmlFor="create-rarity">
									<select
										id="create-rarity"
										value={form.rarity}
										onChange={handleTextInput("rarity")}
										style={fieldInputStyle}
									>
										{rarities.map((rarity) => (
											<option key={rarity} value={rarity}>
												{rarity}
											</option>
										))}
									</select>
								</Field>

								<Field label="Condition" htmlFor="create-condition">
									<select
										id="create-condition"
										value={form.condition}
										onChange={handleTextInput("condition")}
										style={fieldInputStyle}
									>
										{conditions.map((condition) => (
											<option key={condition} value={condition}>
												{condition}
											</option>
										))}
									</select>
								</Field>

								<Field label="Value" htmlFor="create-value">
									<input
										id="create-value"
										value={form.value}
										onChange={handleTextInput("value")}
										style={fieldInputStyle}
										placeholder="$12.50"
									/>
								</Field>

								<Field label="Duplicates" htmlFor="create-dupes">
									<input
										id="create-dupes"
										value={form.dupes}
										onChange={handleTextInput("dupes")}
										style={fieldInputStyle}
										inputMode="numeric"
									/>
								</Field>
							</div>

							<label
								htmlFor="create-fav"
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
									id="create-fav"
									type="checkbox"
									checked={form.fav}
									onChange={handleFavouriteChange}
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
									onClick={closeCreateModal}
									disabled={submitting}
								>
									Cancel
								</button>
								<button
									type="submit"
									className="kc-btn kc-btn-em"
									disabled={submitting}
								>
									{submitting ? "Adding..." : "Create Card"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</main>
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
