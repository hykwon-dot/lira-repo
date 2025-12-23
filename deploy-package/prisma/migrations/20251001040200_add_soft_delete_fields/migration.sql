-- AlterTable
ALTER TABLE `CustomerProfile` MODIFY `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `InvestigatorProfile` MODIFY `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `deletedAt` DATETIME(3) NULL;
