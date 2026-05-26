DROP TABLE IF EXISTS "QuotaUsage";

CREATE TABLE "AiCreditAccount" (
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalAdded" INTEGER NOT NULL DEFAULT 0,
    "totalUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCreditAccount_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "AiCreditLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "feature" "AiFeature",
    "aiUsageId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "remainingCredits" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingInterest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiCreditLedger_userId_createdAt_idx" ON "AiCreditLedger"("userId", "createdAt");
CREATE UNIQUE INDEX "AiCreditLedger_dedupeKey_key" ON "AiCreditLedger"("dedupeKey");
CREATE INDEX "BillingInterest_userId_createdAt_idx" ON "BillingInterest"("userId", "createdAt");
CREATE INDEX "BillingInterest_feature_createdAt_idx" ON "BillingInterest"("feature", "createdAt");

ALTER TABLE "AiCreditAccount" ADD CONSTRAINT "AiCreditAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiCreditLedger" ADD CONSTRAINT "AiCreditLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingInterest" ADD CONSTRAINT "BillingInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
