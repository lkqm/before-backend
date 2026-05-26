-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('ai', 'caption', 'image_rank', 'rewrite');

-- CreateEnum
CREATE TYPE "AiUsageStatus" AS ENUM ('success', 'failed', 'blocked', 'timeout');

-- CreateEnum
CREATE TYPE "AiFeedbackResult" AS ENUM ('accepted', 'dismissed', 'reverted');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "unionId" TEXT,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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
CREATE TABLE "AiFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aiUsageId" TEXT NOT NULL,
    "result" "AiFeedbackResult" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_openId_key" ON "User"("openId");

-- CreateIndex
CREATE UNIQUE INDEX "User_unionId_key" ON "User"("unionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_requestId_key" ON "AiUsage"("requestId");

-- CreateIndex
CREATE INDEX "AiUsage_userId_feature_createdAt_idx" ON "AiUsage"("userId", "feature", "createdAt");

-- CreateIndex
CREATE INDEX "AiFeedback_userId_createdAt_idx" ON "AiFeedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiFeedback_result_createdAt_idx" ON "AiFeedback"("result", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiFeedback_aiUsageId_key" ON "AiFeedback"("aiUsageId");

-- CreateIndex
CREATE UNIQUE INDEX "QuotaUsage_userId_feature_date_key" ON "QuotaUsage"("userId", "feature", "date");

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_aiUsageId_fkey" FOREIGN KEY ("aiUsageId") REFERENCES "AiUsage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaUsage" ADD CONSTRAINT "QuotaUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
