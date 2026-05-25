-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('caption', 'rewrite');

-- CreateEnum
CREATE TYPE "AiUsageStatus" AS ENUM ('success', 'failed', 'blocked', 'timeout');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "openId" TEXT,
    "platform" TEXT,
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costEstimate" DECIMAL(12,6),
    "status" "AiUsageStatus" NOT NULL,
    "latencyMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaUsage" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_anonymousId_key" ON "Device"("anonymousId");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_requestId_key" ON "AiUsage"("requestId");

-- CreateIndex
CREATE INDEX "AiUsage_deviceId_feature_createdAt_idx" ON "AiUsage"("deviceId", "feature", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuotaUsage_deviceId_feature_date_key" ON "QuotaUsage"("deviceId", "feature", "date");

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaUsage" ADD CONSTRAINT "QuotaUsage_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
