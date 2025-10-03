-- Alter table to support investigator assignments and lifecycle metadata
ALTER TABLE `InvestigationRequest`
    ADD COLUMN `investigatorId` INT NULL,
    ADD COLUMN `acceptedAt` DATETIME(3) NULL,
    ADD COLUMN `declinedAt` DATETIME(3) NULL,
    ADD COLUMN `declineReason` TEXT NULL,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'MATCHING';

-- Normalize historical status values to the new workflow semantics
UPDATE `InvestigationRequest` SET `status` = 'MATCHING' WHERE `status` IN ('OPEN', 'UNDER_REVIEW', 'ASSIGNED');
UPDATE `InvestigationRequest` SET `status` = 'IN_PROGRESS' WHERE `status` = 'IN_PROGRESS';
UPDATE `InvestigationRequest` SET `status` = 'COMPLETED' WHERE `status` = 'COMPLETED';
UPDATE `InvestigationRequest` SET `status` = 'CANCELLED' WHERE `status` = 'CANCELLED';

CREATE INDEX `InvestigationRequest_investigatorId_idx` ON `InvestigationRequest`(`investigatorId`);

ALTER TABLE `InvestigationRequest`
    ADD CONSTRAINT `InvestigationRequest_investigatorId_fkey`
        FOREIGN KEY (`investigatorId`) REFERENCES `InvestigatorProfile`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- Timeline entries capturing workflow updates
CREATE TABLE `InvestigationTimelineEntry` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `requestId` INT NOT NULL,
    `type` ENUM('REQUEST_CREATED','INVESTIGATOR_ASSIGNED','INVESTIGATOR_ACCEPTED','INVESTIGATOR_DECLINED','STATUS_ADVANCED','PROGRESS_NOTE','INTERIM_REPORT','FINAL_REPORT','ATTACHMENT_SHARED','CUSTOMER_CANCELLED','SYSTEM') NOT NULL,
    `title` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `payload` JSON NULL,
    `authorId` INT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `InvestigationTimelineEntry_requestId_createdAt_idx`
    ON `InvestigationTimelineEntry`(`requestId`, `createdAt`);

ALTER TABLE `InvestigationTimelineEntry`
    ADD CONSTRAINT `InvestigationTimelineEntry_requestId_fkey`
        FOREIGN KEY (`requestId`) REFERENCES `InvestigationRequest`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InvestigationTimelineEntry`
    ADD CONSTRAINT `InvestigationTimelineEntry_authorId_fkey`
        FOREIGN KEY (`authorId`) REFERENCES `User`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- Chat room supporting bi-directional communication once a case is active
CREATE TABLE `InvestigationChatRoom` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `requestId` INT NOT NULL,
    `customerId` INT NOT NULL,
    `investigatorUserId` INT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `lastMessagePreview` VARCHAR(512) NULL,
    `lastMessageAt` DATETIME(3) NULL,
    `customerClearedAt` DATETIME(3) NULL,
    `investigatorClearedAt` DATETIME(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `InvestigationChatRoom_requestId_key`(`requestId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `InvestigationChatRoom_customerId_idx`
    ON `InvestigationChatRoom`(`customerId`);

CREATE INDEX `InvestigationChatRoom_investigatorUserId_idx`
    ON `InvestigationChatRoom`(`investigatorUserId`);

ALTER TABLE `InvestigationChatRoom`
    ADD CONSTRAINT `InvestigationChatRoom_requestId_fkey`
        FOREIGN KEY (`requestId`) REFERENCES `InvestigationRequest`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InvestigationChatRoom`
    ADD CONSTRAINT `InvestigationChatRoom_customerId_fkey`
        FOREIGN KEY (`customerId`) REFERENCES `User`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InvestigationChatRoom`
    ADD CONSTRAINT `InvestigationChatRoom_investigatorUserId_fkey`
        FOREIGN KEY (`investigatorUserId`) REFERENCES `User`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- Chat messages within an investigation conversation
CREATE TABLE `InvestigationChatMessage` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `roomId` INT NOT NULL,
    `senderId` INT NOT NULL,
    `content` LONGTEXT NULL,
    `attachments` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    `requestStage` VARCHAR(191) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `InvestigationChatMessage_roomId_createdAt_idx`
    ON `InvestigationChatMessage`(`roomId`, `createdAt`);

ALTER TABLE `InvestigationChatMessage`
    ADD CONSTRAINT `InvestigationChatMessage_roomId_fkey`
        FOREIGN KEY (`roomId`) REFERENCES `InvestigationChatRoom`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InvestigationChatMessage`
    ADD CONSTRAINT `InvestigationChatMessage_senderId_fkey`
        FOREIGN KEY (`senderId`) REFERENCES `User`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;
