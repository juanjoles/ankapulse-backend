-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "emailAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "telegramAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telegramChatId" TEXT;

-- CreateTable
CREATE TABLE "StatusPage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPageMonitor" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusPageMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_userId_key" ON "StatusPage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_slug_key" ON "StatusPage"("slug");

-- CreateIndex
CREATE INDEX "StatusPage_slug_idx" ON "StatusPage"("slug");

-- CreateIndex
CREATE INDEX "StatusPage_userId_idx" ON "StatusPage"("userId");

-- CreateIndex
CREATE INDEX "StatusPageMonitor_statusPageId_idx" ON "StatusPageMonitor"("statusPageId");

-- CreateIndex
CREATE INDEX "StatusPageMonitor_checkId_idx" ON "StatusPageMonitor"("checkId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPageMonitor_statusPageId_checkId_key" ON "StatusPageMonitor"("statusPageId", "checkId");

-- AddForeignKey
ALTER TABLE "StatusPage" ADD CONSTRAINT "StatusPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageMonitor" ADD CONSTRAINT "StatusPageMonitor_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageMonitor" ADD CONSTRAINT "StatusPageMonitor_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
