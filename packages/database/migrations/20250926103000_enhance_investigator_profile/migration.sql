-- AlterTable
ALTER TABLE `InvestigatorProfile`
    ADD COLUMN `contactPhone` VARCHAR(191) NULL,
    ADD COLUMN `serviceArea` VARCHAR(191) NULL,
    ADD COLUMN `introduction` TEXT NULL,
    ADD COLUMN `portfolioUrl` VARCHAR(191) NULL,
    ADD COLUMN `termsAcceptedAt` DATETIME(3) NULL,
    ADD COLUMN `privacyAcceptedAt` DATETIME(3) NULL;
