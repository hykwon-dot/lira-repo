-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "phaseId" INTEGER NOT NULL,
    "taskKey" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "competency" JSONB NOT NULL,
    "durationDays" INTEGER,
    "priority" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "Task_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("competency", "desc", "durationDays", "id", "order", "phaseId", "priority", "taskKey") SELECT "competency", "desc", "durationDays", "id", "order", "phaseId", "priority", "taskKey" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
