-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `openId` VARCHAR(191) NOT NULL,
    `unionId` VARCHAR(191) NULL,
    `nickname` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_openId_key`(`openId`),
    UNIQUE INDEX `User_unionId_key`(`unionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiProvider` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `baseUrl` VARCHAR(191) NULL,
    `apiKey` TEXT NULL,
    `timeoutMs` INTEGER NOT NULL,
    `imageTimeoutMs` INTEGER NOT NULL,
    `maxRetries` INTEGER NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AiProvider_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiModel` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `capabilities` JSON NOT NULL,
    `supportsJsonMode` BOOLEAN NOT NULL DEFAULT false,
    `supportsThinking` BOOLEAN NOT NULL DEFAULT false,
    `pricing` JSON NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AiModel_providerId_key_key`(`providerId`, `key`),
    UNIQUE INDEX `AiModel_providerId_modelId_key`(`providerId`, `modelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiTask` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `mode` VARCHAR(32) NOT NULL,
    `strategy` VARCHAR(32) NULL,
    `maxImages` INTEGER NULL,
    `maxTokens` INTEGER NULL,
    `temperature` DOUBLE NULL,
    `systemPrompt` TEXT NULL,
    `thinking` BOOLEAN NOT NULL DEFAULT false,
    `jsonMode` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AiTask_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiTaskModel` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `weight` INTEGER NOT NULL DEFAULT 100,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AiTaskModel_taskId_modelId_key`(`taskId`, `modelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiUsage` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `feature` VARCHAR(32) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `inputTokens` INTEGER NULL,
    `outputTokens` INTEGER NULL,
    `costEstimate` DECIMAL(12, 6) NULL,
    `status` VARCHAR(32) NOT NULL,
    `latencyMs` INTEGER NULL,
    `errorMessage` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AiUsage_requestId_key`(`requestId`),
    INDEX `AiUsage_userId_feature_createdAt_idx`(`userId`, `feature`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `aiUsageId` VARCHAR(191) NOT NULL,
    `result` VARCHAR(32) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiFeedback_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `AiFeedback_result_createdAt_idx`(`result`, `createdAt`),
    UNIQUE INDEX `AiFeedback_aiUsageId_key`(`aiUsageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiCreditAccount` (
    `userId` VARCHAR(191) NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,
    `totalAdded` INTEGER NOT NULL DEFAULT 0,
    `totalUsed` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiCreditLedger` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `delta` INTEGER NOT NULL,
    `balance` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `dedupeKey` VARCHAR(191) NULL,
    `feature` VARCHAR(32) NULL,
    `aiUsageId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AiCreditLedger_dedupeKey_key`(`dedupeKey`),
    INDEX `AiCreditLedger_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillingInterest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `feature` VARCHAR(32) NOT NULL,
    `remainingCredits` INTEGER NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BillingInterest_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `BillingInterest_feature_createdAt_idx`(`feature`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiModel` ADD CONSTRAINT `AiModel_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `AiProvider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiTaskModel` ADD CONSTRAINT `AiTaskModel_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `AiTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiTaskModel` ADD CONSTRAINT `AiTaskModel_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `AiModel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiUsage` ADD CONSTRAINT `AiUsage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiFeedback` ADD CONSTRAINT `AiFeedback_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiFeedback` ADD CONSTRAINT `AiFeedback_aiUsageId_fkey` FOREIGN KEY (`aiUsageId`) REFERENCES `AiUsage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiCreditAccount` ADD CONSTRAINT `AiCreditAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiCreditLedger` ADD CONSTRAINT `AiCreditLedger_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillingInterest` ADD CONSTRAINT `BillingInterest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

