-- CreateEnum
CREATE TYPE "public"."Position" AS ENUM ('GK', 'DEF', 'MID', 'FWD');

-- CreateEnum
CREATE TYPE "public"."Rarity" AS ENUM ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary');

-- CreateEnum
CREATE TYPE "public"."Condition" AS ENUM ('Mint', 'Near Mint', 'Good', 'Fair', 'Poor');

-- CreateTable
CREATE TABLE "public"."cards" (
    "id" INTEGER NOT NULL,
    "player" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "position" "public"."Position" NOT NULL,
    "year" INTEGER NOT NULL,
    "rarity" "public"."Rarity" NOT NULL,
    "condition" "public"."Condition" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "dupes" INTEGER NOT NULL,
    "fav" BOOLEAN NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cards_player_idx" ON "public"."cards"("player");

-- CreateIndex
CREATE INDEX "cards_series_idx" ON "public"."cards"("series");

-- CreateIndex
CREATE INDEX "cards_team_idx" ON "public"."cards"("team");

-- CreateIndex
CREATE INDEX "cards_position_idx" ON "public"."cards"("position");

-- CreateIndex
CREATE INDEX "cards_rarity_idx" ON "public"."cards"("rarity");

-- CreateIndex
CREATE INDEX "cards_condition_idx" ON "public"."cards"("condition");

-- CreateIndex
CREATE INDEX "cards_fav_idx" ON "public"."cards"("fav");
