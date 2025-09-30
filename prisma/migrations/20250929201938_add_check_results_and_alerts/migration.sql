/*
  Warnings:

  - You are about to drop the column `regions` on the `checks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "checks" DROP COLUMN "regions",
ALTER COLUMN "interval" SET DEFAULT '5min';

-- CreateTable
CREATE TABLE "check_results" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "checkResultId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_results_checkId_timestamp_idx" ON "check_results"("checkId", "timestamp");

-- CreateIndex
CREATE INDEX "alerts_checkId_sentAt_idx" ON "alerts"("checkId", "sentAt");

-- CreateIndex
CREATE INDEX "checks_userId_idx" ON "checks"("userId");

-- AddForeignKey
ALTER TABLE "check_results" ADD CONSTRAINT "check_results_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_checkResultId_fkey" FOREIGN KEY ("checkResultId") REFERENCES "check_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
