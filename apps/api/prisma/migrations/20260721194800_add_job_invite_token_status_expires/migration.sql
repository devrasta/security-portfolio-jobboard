-- CreateEnum
CREATE TYPE "JobInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- DropForeignKey
ALTER TABLE "JobInvite" DROP CONSTRAINT "JobInvite_jobId_fkey";

-- AlterTable: add new columns as nullable first so existing rows can be backfilled
ALTER TABLE "JobInvite"
  ADD COLUMN "id" TEXT,
  ADD COLUMN "token" TEXT,
  ADD COLUMN "status" "JobInviteStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Backfill any pre-existing rows so the columns can be made required/unique
UPDATE "JobInvite"
SET "id" = md5(random()::text || clock_timestamp()::text),
    "token" = md5(random()::text || clock_timestamp()::text || "jobId" || "email"),
    "expiresAt" = now() + interval '48 hours'
WHERE "id" IS NULL;

-- AlterTable: drop the old composite primary key, make id the primary key
ALTER TABLE "JobInvite" DROP CONSTRAINT "JobInvite_pkey";
ALTER TABLE "JobInvite"
  ALTER COLUMN "id" SET NOT NULL,
  ALTER COLUMN "token" SET NOT NULL,
  ALTER COLUMN "expiresAt" SET NOT NULL,
  ADD CONSTRAINT "JobInvite_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "JobInvite_token_key" ON "JobInvite"("token");
CREATE INDEX "JobInvite_token_idx" ON "JobInvite"("token");
CREATE UNIQUE INDEX "JobInvite_jobId_email_key" ON "JobInvite"("jobId", "email");

-- AddForeignKey
ALTER TABLE "JobInvite" ADD CONSTRAINT "JobInvite_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
