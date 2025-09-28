-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scenario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT '중간',
    "overview" JSONB,
    "spendTracking" JSONB,
    "raciMatrix" JSONB,
    "scheduleTemplate" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Scenario" ("createdAt", "description", "id", "image", "overview", "raciMatrix", "scheduleTemplate", "spendTracking", "title", "updatedAt") SELECT "createdAt", "description", "id", "image", "overview", "raciMatrix", "scheduleTemplate", "spendTracking", "title", "updatedAt" FROM "Scenario";
DROP TABLE "Scenario";
ALTER TABLE "new_Scenario" RENAME TO "Scenario";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
