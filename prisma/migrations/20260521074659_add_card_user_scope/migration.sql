/*
  Warnings:

  - The primary key for the `cards` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `userId` to the `cards` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."cards" DROP CONSTRAINT "cards_pkey",
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD CONSTRAINT "cards_pkey" PRIMARY KEY ("userId", "id");

-- CreateIndex
CREATE INDEX "cards_userId_idx" ON "public"."cards"("userId");

-- AddForeignKey
ALTER TABLE "public"."cards" ADD CONSTRAINT "cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
