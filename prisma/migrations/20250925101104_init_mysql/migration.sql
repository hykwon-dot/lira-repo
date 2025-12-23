-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('USER', 'INVESTIGATOR', 'ENTERPRISE', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvestigatorProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `experienceYears` INTEGER NOT NULL DEFAULT 0,
    `specialties` JSON NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `ratingAverage` DECIMAL(5, 2) NULL,
    `successRate` DECIMAL(5, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InvestigatorProfile_userId_key`(`userId`),
    INDEX `InvestigatorProfile_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EnterpriseProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `businessNumber` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `sizeCode` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EnterpriseProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'CLOSED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `externalId` VARCHAR(191) NULL,

    UNIQUE INDEX `Conversation_externalId_key`(`externalId`),
    INDEX `Conversation_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversationId` INTEGER NOT NULL,
    `role` ENUM('USER', 'AI', 'SYSTEM') NOT NULL,
    `content` TEXT NOT NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Message_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConversationAnalysis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversationId` INTEGER NOT NULL,
    `summary` TEXT NOT NULL,
    `recommendedTags` JSON NULL,
    `suggestedNext` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ConversationAnalysis_conversationId_key`(`conversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Scenario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(191) NULL,
    `difficulty` VARCHAR(191) NULL DEFAULT '중간',
    `image` VARCHAR(191) NULL,
    `overview` JSON NULL,
    `spendTracking` JSON NULL,
    `raciMatrix` JSON NULL,
    `scheduleTemplate` JSON NULL,
    `riskLevel` VARCHAR(191) NULL,
    `caseType` VARCHAR(191) NULL,
    `successRate` INTEGER NULL DEFAULT 0,
    `typicalDurationDays` INTEGER NULL,
    `budgetRange` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `Scenario_category_idx`(`category`),
    FULLTEXT INDEX `Scenario_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Phase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order` INTEGER NOT NULL DEFAULT 0,
    `scenarioId` INTEGER NOT NULL,
    `phaseKey` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `durationDays` INTEGER NOT NULL,
    `scheduleOffset` INTEGER NOT NULL,
    `budget` JSON NOT NULL,
    `phaseKPI` JSON NOT NULL,
    `deliverables` JSON NOT NULL,
    `nextPhase` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order` INTEGER NOT NULL DEFAULT 0,
    `phaseId` INTEGER NOT NULL,
    `taskKey` VARCHAR(191) NOT NULL,
    `desc` TEXT NOT NULL,
    `competency` JSON NOT NULL,
    `durationDays` INTEGER NULL,
    `priority` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Risk` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phaseId` INTEGER NOT NULL,
    `riskKey` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NOT NULL,
    `trigger` VARCHAR(191) NOT NULL,
    `mitigation` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSummary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stepNumber` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `shortDesc` VARCHAR(191) NOT NULL,
    `fullDesc` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `relatedQuestion` VARCHAR(191) NOT NULL,
    `workflow` VARCHAR(191) NULL,
    `parentStepId` INTEGER NULL,
    `isSubTask` BOOLEAN NOT NULL DEFAULT false,
    `conversationId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvestigationRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `scenarioId` INTEGER NULL,
    `title` VARCHAR(191) NOT NULL,
    `details` TEXT NOT NULL,
    `desiredOutcome` VARCHAR(191) NULL,
    `budgetMin` INTEGER NULL,
    `budgetMax` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InvestigationRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvestigatorMatch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `investigatorId` INTEGER NOT NULL,
    `score` DECIMAL(5, 2) NOT NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InvestigatorMatch_score_idx`(`score`),
    UNIQUE INDEX `InvestigatorMatch_requestId_investigatorId_key`(`requestId`, `investigatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InvestigatorProfile` ADD CONSTRAINT `InvestigatorProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EnterpriseProfile` ADD CONSTRAINT `EnterpriseProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversationAnalysis` ADD CONSTRAINT `ConversationAnalysis_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Phase` ADD CONSTRAINT `Phase_scenarioId_fkey` FOREIGN KEY (`scenarioId`) REFERENCES `Scenario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_phaseId_fkey` FOREIGN KEY (`phaseId`) REFERENCES `Phase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Risk` ADD CONSTRAINT `Risk_phaseId_fkey` FOREIGN KEY (`phaseId`) REFERENCES `Phase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSummary` ADD CONSTRAINT `UserSummary_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigationRequest` ADD CONSTRAINT `InvestigationRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigationRequest` ADD CONSTRAINT `InvestigationRequest_scenarioId_fkey` FOREIGN KEY (`scenarioId`) REFERENCES `Scenario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigatorMatch` ADD CONSTRAINT `InvestigatorMatch_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `InvestigationRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestigatorMatch` ADD CONSTRAINT `InvestigatorMatch_investigatorId_fkey` FOREIGN KEY (`investigatorId`) REFERENCES `InvestigatorProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
