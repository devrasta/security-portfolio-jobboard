/*
  Warnings:

  - The primary key for the `CompanyUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `CompanyUser` table. All the data in the column will be lost.
  - The primary key for the `JobInvite` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `JobInvite` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CompanyUser_userId_companyId_key";

-- DropIndex
DROP INDEX "JobInvite_jobId_email_key";

-- AlterTable
ALTER TABLE "CompanyUser" DROP CONSTRAINT "CompanyUser_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "CompanyUser_pkey" PRIMARY KEY ("userId", "companyId");

-- AlterTable
ALTER TABLE "JobInvite" DROP CONSTRAINT "JobInvite_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "JobInvite_pkey" PRIMARY KEY ("jobId", "email");
