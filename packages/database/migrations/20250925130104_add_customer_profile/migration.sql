-- CreateTable
CREATE TABLE `CustomerProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `birthDate` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `occupation` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `preferredCaseTypes` JSON NULL,
    `budgetMin` INTEGER NULL,
    `budgetMax` INTEGER NULL,
    `urgencyLevel` VARCHAR(191) NULL,
    `securityQuestion` VARCHAR(191) NULL,
    `securityAnswerHash` VARCHAR(191) NULL,
    `termsAcceptedAt` DATETIME(3) NOT NULL,
    `privacyAcceptedAt` DATETIME(3) NOT NULL,
    `marketingOptIn` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomerProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerProfile` ADD CONSTRAINT `CustomerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
