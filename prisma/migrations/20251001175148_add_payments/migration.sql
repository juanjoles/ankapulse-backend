-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planType" TEXT NOT NULL DEFAULT 'free',
    "maxChecks" INTEGER NOT NULL DEFAULT 5,
    "minIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxRegions" INTEGER NOT NULL DEFAULT 1,
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 7,
    "alertCooldownMin" INTEGER NOT NULL DEFAULT 30,
    "currentChecks" INTEGER NOT NULL DEFAULT 0,
    "planStartedAt" TIMESTAMP(3),
    "planExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "mpSubscriptionId" TEXT,
    "mpPreapprovalId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "planType" TEXT NOT NULL,
    "mpPaymentId" TEXT,
    "mpPreferenceId" TEXT,
    "mpStatus" TEXT,
    "mpStatusDetail" TEXT,
    "metadata" JSONB,
    "description" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_mpSubscriptionId_key" ON "subscriptions"("mpSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_mpPreapprovalId_key" ON "subscriptions"("mpPreapprovalId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_status_idx" ON "subscriptions"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_mpPaymentId_key" ON "payments"("mpPaymentId");

-- CreateIndex
CREATE INDEX "payments_userId_status_idx" ON "payments"("userId", "status");

-- CreateIndex
CREATE INDEX "payments_mpPaymentId_idx" ON "payments"("mpPaymentId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
