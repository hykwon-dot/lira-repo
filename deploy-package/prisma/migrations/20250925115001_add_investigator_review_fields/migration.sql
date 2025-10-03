-- AlterTable
ALTER TABLE `InvestigatorProfile` ADD COLUMN `reviewNote` TEXT NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedById` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `InvestigatorProfile` ADD CONSTRAINT `InvestigatorProfile_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
