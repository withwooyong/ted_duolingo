-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "hearts_updated_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "premium_expires_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "user_badges" ALTER COLUMN "earned_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "user_exercise_history" ALTER COLUMN "answered_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "user_languages" ALTER COLUMN "added_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "user_progress" ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMPTZ(3);
