-- Replace database enums with strings so new AI features do not require enum migrations.
ALTER TABLE `AiUsage` MODIFY `feature` VARCHAR(32) NOT NULL;
ALTER TABLE `AiUsage` MODIFY `status` VARCHAR(32) NOT NULL;
ALTER TABLE `AiFeedback` MODIFY `result` VARCHAR(32) NOT NULL;
ALTER TABLE `AiCreditLedger` MODIFY `feature` VARCHAR(32) NULL;
ALTER TABLE `BillingInterest` MODIFY `feature` VARCHAR(32) NOT NULL;
