-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'REJECTED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "content_drafts" (
    "id" TEXT NOT NULL,
    "language_pair_id" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "review_note" TEXT,
    "published_skill_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_drafts_status_idx" ON "content_drafts"("status");
