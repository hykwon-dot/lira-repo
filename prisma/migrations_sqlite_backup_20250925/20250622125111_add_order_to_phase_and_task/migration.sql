-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Phase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "scenarioId" INTEGER NOT NULL,
    "phaseKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "scheduleOffset" INTEGER NOT NULL,
    "budget" JSONB NOT NULL,
    "phaseKPI" JSONB NOT NULL,
    "deliverables" JSONB NOT NULL,
    "nextPhase" TEXT,
    CONSTRAINT "Phase_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Phase" ("budget", "deliverables", "durationDays", "id", "name", "nextPhase", "phaseKPI", "phaseKey", "scenarioId", "scheduleOffset") SELECT "budget", "deliverables", "durationDays", "id", "name", "nextPhase", "phaseKPI", "phaseKey", "scenarioId", "scheduleOffset" FROM "Phase";
DROP TABLE "Phase";
ALTER TABLE "new_Phase" RENAME TO "Phase";
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "phaseId" INTEGER NOT NULL,
    "taskKey" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "competency" JSONB NOT NULL,
    CONSTRAINT "Task_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("competency", "desc", "id", "phaseId", "taskKey") SELECT "competency", "desc", "id", "phaseId", "taskKey" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
