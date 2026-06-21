-- AlterTable
ALTER TABLE `InvestigationChatMessage` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InvestigationChatRoom` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InvestigatorReview` ALTER COLUMN `updatedAt` DROP DEFAULT;
