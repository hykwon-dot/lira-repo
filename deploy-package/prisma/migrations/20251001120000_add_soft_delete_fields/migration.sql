-- Add soft delete timestamps to user and profile tables
ALTER TABLE `User`
  ADD COLUMN `deletedAt` DATETIME NULL;

ALTER TABLE `InvestigatorProfile`
  ADD COLUMN `deletedAt` DATETIME NULL;

ALTER TABLE `CustomerProfile`
  ADD COLUMN `deletedAt` DATETIME NULL;
