"use client";

import Link from "next/link";
import {
	type CSSProperties,
	type ChangeEvent,
	type FormEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Sidebar } from "@/components/Sidebar";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useCardActions, useCards } from "@/lib/stores/card-context";
import { useUserInsights } from "@/lib/stores/user-insights-context";
import type { Condition, Position, Rarity } from "@/types/card";

const positions: Position[] = ["GK", "DEF", "MID", "FWD"];
const rarities: Rarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const conditions: Condition[] = ["Mint", "Near Mint", "Good", "Fair", "Poor"];
const positionFilters: Array<Position | "All"> = ["All", ...positions];
const rarityFilters: Array<Rarity | "All"> = ["All", ...rarities];
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

const tableHeaderCellStyle: CSSProperties = {
	textAlign: "left",
	padding: "10px 12px",
	fontSize: 11,
	letterSpacing: 1.2,
	textTransform: "uppercase",
	color: "var(--kc-muted)",
	fontFamily: "var(--kc-font-h)",
	fontWeight: 600,
	whiteSpace: "nowrap",
};

const tableCellStyle: CSSProperties = {
	padding: "12px",
	fontSize: 13,
	color: "var(--kc-text)",
	whiteSpace: "nowrap",
	verticalAlign: "middle",
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

const usdFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

function parseCardValue(value: string): number {
	const normalized = value.replace(/[^0-9.-]+/g, "");
	const parsed = Number.parseFloat(normalized);

	return Number.isFinite(parsed) ? parsed : 0;
}

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
	const { preferences, setPageSizePreference, activity, recordActivity } =
		useUserInsights();
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [form, setForm] = useState<CreateCardForm>(() =>
		createInitialFormState(),
	);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [rarityFilter, setRarityFilter] = useState<Rarity | "All">("All");
	const [posFilter, setPosFilter] = useState<Position | "All">("All");
	const [showFav, setShowFav] = useState(false);
	const [search, setSearch] = useState("");
	const pageSize = preferences.pageSize;

	const normalizedSearch = search.trim().toLowerCase();
	const filteredCards = cards.filter((card) => {
		if (rarityFilter !== "All" && card.rarity !== rarityFilter) {
			return false;
		}

		if (posFilter !== "All" && card.position !== posFilter) {
			return false;
		}

		if (showFav && !card.fav) {
			return false;
		}

		if (normalizedSearch.length === 0) {
			return true;
		}

		return [card.player, card.team, card.series, card.number]
			.join(" ")
			.toLowerCase()
			.includes(normalizedSearch);
	});

	const totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize));
	const currentPageStart = (currentPage - 1) * pageSize;
	const currentPageCards = filteredCards.slice(
		currentPageStart,
		currentPageStart + pageSize,
	);
	const chartData = useMemo(
		() =>
			rarities.map((rarity) => ({
				rarity,
				total: filteredCards.filter((card) => card.rarity === rarity).length,
			})),
		[filteredCards],
	);
	const valueByRarityData = useMemo(
		() =>
			rarities.map((rarity) => ({
				rarity,
				totalValue: filteredCards
					.filter((card) => card.rarity === rarity)
					.reduce((sum, card) => sum + parseCardValue(card.value), 0),
			})),
		[filteredCards],
	);
	const totalFilteredValue = useMemo(
		() => filteredCards.reduce((sum, card) => sum + parseCardValue(card.value), 0),
		[filteredCards],
	);
	const valueChartRenderKey = useMemo(
		() =>
			valueByRarityData
				.map((entry) => `${entry.rarity}:${entry.totalValue.toFixed(2)}`)
				.join("|"),
		[valueByRarityData],
	);

	useEffect(() => {
		setCurrentPage((previousPage) => {
			if (previousPage < 1) {
				return 1;
			}

			if (previousPage > totalPages) {
				return totalPages;
			}

			return previousPage;
		});
	}, [totalPages]);

	const goToPage = (nextPage: number) => {
		setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
	};

	const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
		setSearch(event.target.value);
		setCurrentPage(1);
		recordActivity(`Updated search filter: "${event.target.value || "empty"}"`);
	};

	const handleRarityFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
		setRarityFilter(event.target.value as Rarity | "All");
		setCurrentPage(1);
		recordActivity(`Changed rarity filter to ${event.target.value}`);
	};

	const handlePositionFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
		setPosFilter(event.target.value as Position | "All");
		setCurrentPage(1);
		recordActivity(`Changed position filter to ${event.target.value}`);
	};

	const handleShowFavChange = (event: ChangeEvent<HTMLInputElement>) => {
		setShowFav(event.target.checked);
		setCurrentPage(1);
		recordActivity(
			event.target.checked
				? "Enabled favourites-only filter"
				: "Disabled favourites-only filter",
		);
	};

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

	const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitting(true);
		setSubmitError(null);

		try {
			await createCard({
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

			await refresh();
			recordActivity(`Created card: ${form.player}`);
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
						className="kc-glass-card"
						style={{
							borderColor: "var(--kc-border)",
							marginBottom: 16,
							padding: "12px 14px",
							display: "grid",
							gap: 10,
						}}
					>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
								gap: 10,
								alignItems: "end",
							}}
						>
							<Field label="Search" htmlFor="collection-search">
								<input
									id="collection-search"
									value={search}
									onChange={handleSearchChange}
									style={fieldInputStyle}
									placeholder="Player, team, series, number"
								/>
							</Field>

							<Field label="Rarity" htmlFor="collection-rarity-filter">
								<select
									id="collection-rarity-filter"
									value={rarityFilter}
									onChange={handleRarityFilterChange}
									style={fieldInputStyle}
								>
									{rarityFilters.map((rarity) => (
										<option key={rarity} value={rarity}>
											{rarity}
										</option>
									))}
								</select>
							</Field>

							<Field label="Position" htmlFor="collection-position-filter">
								<select
									id="collection-position-filter"
									value={posFilter}
									onChange={handlePositionFilterChange}
									style={fieldInputStyle}
								>
									{positionFilters.map((position) => (
										<option key={position} value={position}>
											{position}
										</option>
									))}
								</select>
							</Field>
						</div>

						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								gap: 12,
								flexWrap: "wrap",
							}}
						>
							<label
								htmlFor="collection-page-size"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 8,
									color: "var(--kc-text)",
									fontSize: 13,
								}}
							>
								Rows per page
								<select
									id="collection-page-size"
									value={pageSize}
									onChange={(event) => {
										const nextPageSize = Number(event.target.value);
										setPageSizePreference(nextPageSize);
										setCurrentPage(1);
										recordActivity(`Set rows per page to ${nextPageSize} (cookie saved)`);
									}}
									style={{ ...fieldInputStyle, width: 86, padding: "6px 8px" }}
								>
									{[4, 6, 10].map((size) => (
										<option key={size} value={size}>
											{size}
										</option>
									))}
								</select>
							</label>

							<label
								htmlFor="collection-fav-filter"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 8,
									color: "var(--kc-text)",
									fontSize: 13,
								}}
							>
								<input
									id="collection-fav-filter"
									type="checkbox"
									checked={showFav}
									onChange={handleShowFavChange}
								/>
								Show favourites only
							</label>

							<p style={{ margin: 0, color: "var(--kc-muted)", fontSize: 12 }}>
								Showing {filteredCards.length} of {cards.length} cards
							</p>
						</div>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
							gap: 16,
						}}
					>
						<div
							className="kc-glass-card"
							style={{
								borderColor: "var(--kc-border)",
								padding: "10px 12px",
							}}
						>
							<Table
								aria-label="Collection cards"
								style={{
									borderCollapse: "collapse",
									color: "var(--kc-text)",
									fontSize: 13,
									lineHeight: 1.4,
								}}
							>
							<TableHeader>
								<TableRow style={{ borderBottom: "1px solid var(--kc-border)" }}>
									<TableHead scope="col" style={tableHeaderCellStyle}>
										Player
									</TableHead>
									<TableHead scope="col" style={tableHeaderCellStyle}>
										Team
									</TableHead>
									<TableHead scope="col" style={tableHeaderCellStyle}>
										Position
									</TableHead>
									<TableHead scope="col" style={tableHeaderCellStyle}>
										Year
									</TableHead>
									<TableHead scope="col" style={tableHeaderCellStyle}>
										Value
									</TableHead>
									<TableHead scope="col" style={tableHeaderCellStyle}>
										Dupes
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{currentPageCards.length > 0 ? (
									currentPageCards.map((card) => (
										<TableRow key={card.id} style={{ borderBottom: "1px solid var(--kc-border)" }}>
											<TableCell style={tableCellStyle}>
												<Link
													href={`/card/${card.id}`}
													style={{
														color: "var(--kc-text)",
														textDecoration: "none",
														fontFamily: "var(--kc-font-h)",
														letterSpacing: 0.3,
													}}
												>
													{card.player}
												</Link>
											</TableCell>
											<TableCell style={tableCellStyle}>{card.team}</TableCell>
											<TableCell style={tableCellStyle}>{card.position}</TableCell>
											<TableCell style={tableCellStyle}>{card.year}</TableCell>
											<TableCell style={{ ...tableCellStyle, color: "var(--kc-em)" }}>
												{card.value}
											</TableCell>
											<TableCell style={tableCellStyle}>{card.dupes}</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={6} style={{ ...tableCellStyle, textAlign: "center", color: "var(--kc-muted)" }}>
											{cards.length > 0
												? "No cards match your current filters."
												: "No cards in your collection yet."}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
							</Table>
						</div>
						<div
							className="kc-glass-card"
							style={{
								borderColor: "var(--kc-border)",
								padding: "14px 14px 6px",
								minHeight: 330,
							}}
						>
							<h2
								style={{
									fontFamily: "var(--kc-font-h)",
									color: "var(--kc-text)",
									fontSize: 14,
									letterSpacing: 1,
									marginBottom: 10,
								}}
							>
								Rarity distribution (synchronized)
							</h2>
							<div style={{ width: "100%", height: 250 }}>
								<ResponsiveContainer>
									<BarChart data={chartData}>
										<CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
										<XAxis dataKey="rarity" stroke="#7a9b8a" tick={{ fontSize: 12 }} />
										<YAxis allowDecimals={false} stroke="#7a9b8a" tick={{ fontSize: 12 }} />
										<Tooltip
											contentStyle={{
												background: "#101828",
												border: "1px solid var(--kc-border)",
												borderRadius: 10,
												color: "var(--kc-text)",
											}}
										/>
										<Bar dataKey="total" fill="#00ff88" radius={[8, 8, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
						<div
							className="kc-glass-card"
							style={{
								borderColor: "var(--kc-border)",
								padding: "14px 14px 6px",
								minHeight: 330,
							}}
						>
							<h2
								style={{
									fontFamily: "var(--kc-font-h)",
									color: "var(--kc-text)",
									fontSize: 14,
									letterSpacing: 1,
									marginBottom: 10,
								}}
							>
								Collection value by rarity
							</h2>
							<p
								data-testid="collection-value-total"
								style={{
									margin: "0 0 10px",
									color: "var(--kc-muted)",
									fontSize: 12,
								}}
							>
								Filtered total value: {usdFormatter.format(totalFilteredValue)}
							</p>
							<div style={{ width: "100%", height: 250 }}>
								<ResponsiveContainer>
									<BarChart key={valueChartRenderKey} data={valueByRarityData}>
										<CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
										<XAxis dataKey="rarity" stroke="#7a9b8a" tick={{ fontSize: 12 }} />
										<YAxis
											stroke="#7a9b8a"
											tick={{ fontSize: 12 }}
											tickFormatter={(amount) => usdFormatter.format(Number(amount))}
										/>
										<Tooltip
											contentStyle={{
												background: "#101828",
												border: "1px solid var(--kc-border)",
												borderRadius: 10,
												color: "var(--kc-text)",
											}}
											formatter={(amount) => usdFormatter.format(Number(amount))}
										/>
										<Bar dataKey="totalValue" fill="#60a5fa" radius={[8, 8, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>

					<div
						className="kc-glass-card"
						style={{ marginTop: 16, borderColor: "var(--kc-border)" }}
					>
						<h2
							style={{
								fontFamily: "var(--kc-font-h)",
								color: "var(--kc-text)",
								fontSize: 14,
								letterSpacing: 1,
								marginBottom: 10,
							}}
						>
							Recent activity
						</h2>
						{activity.length === 0 ? (
							<p style={{ margin: 0, color: "var(--kc-muted)", fontSize: 13 }}>
								No tracked actions yet. Try searching, filtering, or creating a card.
							</p>
						) : (
							<ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
								{activity.map((entry) => (
									<li key={entry.id} style={{ color: "var(--kc-muted)", fontSize: 13 }}>
										<span style={{ color: "var(--kc-text)" }}>{entry.message}</span>{" "}
										· {new Date(entry.timestamp).toLocaleTimeString()}
									</li>
								))}
							</ul>
						)}
					</div>

					{filteredCards.length > 0 && (
						<div
							className="kc-glass-card"
							style={{
								marginTop: 16,
								padding: "14px 16px",
								borderColor: "var(--kc-border)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								gap: 12,
								flexWrap: "wrap",
							}}
						>
							<p style={{ margin: 0, color: "var(--kc-muted)", fontSize: 12 }}>
								Page {currentPage} of {totalPages} · {filteredCards.length} result
								{filteredCards.length === 1 ? "" : "s"}
							</p>
							<div
								style={{
									display: "flex",
									gap: 8,
									alignItems: "center",
									flexWrap: "wrap",
								}}
							>
								<button
									type="button"
									className="kc-btn kc-btn-ghost kc-btn-sm"
									onClick={() => goToPage(currentPage - 1)}
									disabled={currentPage <= 1}
									style={currentPage <= 1 ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
								>
									Prev
								</button>

								{Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
									const isCurrent = pageNumber === currentPage;

									return (
										<button
											key={pageNumber}
											type="button"
											className={isCurrent ? "kc-btn kc-btn-em kc-btn-sm" : "kc-btn kc-btn-ghost kc-btn-sm"}
											onClick={() => goToPage(pageNumber)}
											aria-current={isCurrent ? "page" : undefined}
										>
											{pageNumber}
										</button>
									);
								})}

								<button
									type="button"
									className="kc-btn kc-btn-ghost kc-btn-sm"
									onClick={() => goToPage(currentPage + 1)}
									disabled={currentPage >= totalPages}
									style={currentPage >= totalPages ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
								>
									Next
								</button>
							</div>
						</div>
					)}

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
