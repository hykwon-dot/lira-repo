/*
  Warnings:

  - You are about to alter the column `lastMessagePreview` on the `InvestigationChatRoom` table. The data in that column could be lost. The data in that column will be cast from `VarChar(512)` to `VarChar(191)`.
  - You are about to alter the column `title` on the `Notification` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to drop the `EnterpriseProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `EnterpriseProfile` DROP FOREIGN KEY `EnterpriseProfile_userId_fkey`;

-- DropForeignKey
ALTER TABLE `InvestigationChatMessage` DROP FOREIGN KEY `InvestigationChatMessage_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `InvestigationChatMessage` DROP FOREIGN KEY `InvestigationChatMessage_senderId_fkey`;

-- DropForeignKey
ALTER TABLE `InvestigationChatRoom` DROP FOREIGN KEY `InvestigationChatRoom_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `InvestigationChatRoom` DROP FOREIGN KEY `InvestigationChatRoom_investigatorUserId_fkey`;

-- DropForeignKey
ALTER TABLE `InvestigationChatRoom` DROP FOREIGN KEY `InvestigationChatRoom_requestId_fkey`;

-- DropForeignKey
ALTER TABLE `InvestigationTimelineEntry` DROP FOREIGN KEY `InvestigationTimelineEntry_requestId_fkey`;

-- DropForeignKey
ALTER TABLE `InvestigatorReview` DROP FOREIGN KEY `InvestigatorReview_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `InvestigatorReview` DROP FOREIGN KEY `InvestigatorReview_investigatorId_fkey`;

-- DropForeignKey
ALTER TABLE `InvestigatorReview` DROP FOREIGN KEY `InvestigatorReview_requestId_fkey`;

-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_userId_fkey`;

-- DropForeignKey
ALTER TABLE `SimulationEvent` DROP FOREIGN KEY `SimulationEvent_runId_fkey`;

-- DropIndex
DROP INDEX `InvestigationChatMessage_senderId_fkey` ON `InvestigationChatMessage`;

-- AlterTable
ALTER TABLE `InvestigationChatMessage` MODIFY `content` TEXT NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InvestigationChatRoom` ALTER COLUMN `updatedAt` DROP DEFAULT,
    MODIFY `lastMessagePreview` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `InvestigatorReview` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Notification` MODIFY `title` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `EnterpriseProfile`;

-- CreateTable
CREATE TABLE `Organization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `businessNumber` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `sizeCode` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `ownerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Organization_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganizationMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `invitedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrganizationMember_userId_idx`(`userId`),
    UNIQUE INDEX `OrganizationMember_organizationId_userId_key`(`organizationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Organization` ADD CONSTRAINT `Organization_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationMember` ADD CONSTRAINT `OrganizationMember_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationMember` ADD CONSTRAINT `OrganizationMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationMember` ADD CONSTRAINT `OrganizationMember_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SimulationEvent` ADD CONSTRAINT `SimulationEvent_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `SimulationRun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigationTimelineEntry` ADD CONSTRAINT `InvestigationTimelineEntry_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `InvestigationRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigationChatRoom` ADD CONSTRAINT `InvestigationChatRoom_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `InvestigationRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigationChatRoom` ADD CONSTRAINT `InvestigationChatRoom_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigationChatRoom` ADD CONSTRAINT `InvestigationChatRoom_investigatorUserId_fkey` FOREIGN KEY (`investigatorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigationChatMessage` ADD CONSTRAINT `InvestigationChatMessage_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `InvestigationChatRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigationChatMessage` ADD CONSTRAINT `InvestigationChatMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigatorReview` ADD CONSTRAINT `InvestigatorReview_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `InvestigationRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigatorReview` ADD CONSTRAINT `InvestigatorReview_investigatorId_fkey` FOREIGN KEY (`investigatorId`) REFERENCES `InvestigatorProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigatorReview` ADD CONSTRAINT `InvestigatorReview_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
