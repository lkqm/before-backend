ALTER TABLE `AiTaskModel`
  ADD COLUMN `taskId` VARCHAR(191) NULL,
  ADD COLUMN `modelId` VARCHAR(191) NULL;

UPDATE `AiTaskModel` atm
JOIN `AiTask` t ON t.`key` = atm.`taskKey`
JOIN `AiModel` m ON m.`providerKey` = atm.`providerKey` AND m.`key` = atm.`modelKey`
SET
  atm.`taskId` = t.`id`,
  atm.`modelId` = m.`id`;

ALTER TABLE `AiModel`
  ADD COLUMN `providerId` VARCHAR(191) NULL;

UPDATE `AiModel` m
JOIN `AiProvider` p ON p.`key` = m.`providerKey`
SET m.`providerId` = p.`id`;

ALTER TABLE `AiModel`
  DROP FOREIGN KEY `AiModel_providerKey_fkey`;

DROP INDEX `AiModel_providerKey_key_key` ON `AiModel`;
DROP INDEX `AiTaskModel_taskKey_providerKey_modelKey_key` ON `AiTaskModel`;

ALTER TABLE `AiTaskModel`
  MODIFY `taskId` VARCHAR(191) NOT NULL,
  MODIFY `modelId` VARCHAR(191) NOT NULL,
  DROP COLUMN `taskKey`,
  DROP COLUMN `providerKey`,
  DROP COLUMN `modelKey`;

ALTER TABLE `AiModel`
  MODIFY `providerId` VARCHAR(191) NOT NULL,
  DROP COLUMN `providerKey`;

CREATE UNIQUE INDEX `AiModel_providerId_key_key` ON `AiModel`(`providerId`, `key`);
CREATE UNIQUE INDEX `AiModel_providerId_modelId_key` ON `AiModel`(`providerId`, `modelId`);
CREATE UNIQUE INDEX `AiTaskModel_taskId_modelId_key` ON `AiTaskModel`(`taskId`, `modelId`);

ALTER TABLE `AiModel`
  ADD CONSTRAINT `AiModel_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `AiProvider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AiTaskModel`
  ADD CONSTRAINT `AiTaskModel_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `AiTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `AiTaskModel_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `AiModel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
