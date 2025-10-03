-- CreateTable
CREATE TABLE `Notification` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NOT NULL,
    `type` ENUM('INVESTIGATION_ASSIGNED', 'INVESTIGATION_STATUS', 'CHAT_MESSAGE', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `actionUrl` VARCHAR(512) NULL,
    `metadata` JSON NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Notification_userId_readAt_idx` ON `Notification`(`userId`, `readAt`);

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
