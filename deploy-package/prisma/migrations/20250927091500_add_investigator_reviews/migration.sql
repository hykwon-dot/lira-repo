CREATE TABLE `InvestigatorReview` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `requestId` INTEGER NOT NULL,
  `investigatorId` INTEGER NOT NULL,
  `customerId` INTEGER NOT NULL,
  `rating` INTEGER NOT NULL,
  `comment` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `InvestigatorReview_requestId_key` (`requestId`),
  INDEX `InvestigatorReview_investigatorId_idx` (`investigatorId`),
  INDEX `InvestigatorReview_customerId_idx` (`customerId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `InvestigatorReview_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `InvestigationRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `InvestigatorReview_investigatorId_fkey` FOREIGN KEY (`investigatorId`) REFERENCES `InvestigatorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `InvestigatorReview_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
