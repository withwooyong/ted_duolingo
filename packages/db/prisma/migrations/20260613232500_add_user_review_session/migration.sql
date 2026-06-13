-- CreateTable
CREATE TABLE "user_review_session" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ(3) NOT NULL,
    "xp_earned" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_review_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_review_session_user_id_idx" ON "user_review_session"("user_id");

-- AddForeignKey
ALTER TABLE "user_review_session" ADD CONSTRAINT "user_review_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
