-- CreateTable
CREATE TABLE "user_review_state" (
    "user_id" UUID NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "language_pair_id" TEXT NOT NULL,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_review_state_pkey" PRIMARY KEY ("user_id","exercise_id")
);

-- CreateIndex
CREATE INDEX "user_review_state_user_id_language_pair_id_due_at_idx" ON "user_review_state"("user_id", "language_pair_id", "due_at");

-- AddForeignKey
ALTER TABLE "user_review_state" ADD CONSTRAINT "user_review_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_review_state" ADD CONSTRAINT "user_review_state_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
