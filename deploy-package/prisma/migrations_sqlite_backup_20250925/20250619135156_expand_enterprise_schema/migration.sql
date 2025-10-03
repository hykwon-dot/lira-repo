-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN "overview" JSONB;
ALTER TABLE "Scenario" ADD COLUMN "raciMatrix" JSONB;
ALTER TABLE "Scenario" ADD COLUMN "scheduleTemplate" JSONB;
ALTER TABLE "Scenario" ADD COLUMN "spendTracking" JSONB;

-- CreateTable
CREATE TABLE "Phase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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

-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phaseId" INTEGER NOT NULL,
    "taskKey" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "competency" JSONB NOT NULL,
    CONSTRAINT "Task_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phaseId" INTEGER NOT NULL,
    "riskKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "mitigation" TEXT NOT NULL,
    CONSTRAINT "Risk_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
