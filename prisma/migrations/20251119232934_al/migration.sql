/*
  Warnings:

  - A unique constraint covering the columns `[lsOrderId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[lsSubscriptionId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "lsOrderId" TEXT,
ADD COLUMN     "provider" TEXT DEFAULT 'mercadopago';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "lsSubscriptionId" TEXT,
ADD COLUMN     "provider" TEXT DEFAULT 'mercadopago';

-- CreateIndex
CREATE UNIQUE INDEX "payments_lsOrderId_key" ON "payments"("lsOrderId");

-- CreateIndex
CREATE INDEX "payments_lsOrderId_idx" ON "payments"("lsOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_lsSubscriptionId_key" ON "subscriptions"("lsSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_lsSubscriptionId_idx" ON "subscriptions"("lsSubscriptionId");
