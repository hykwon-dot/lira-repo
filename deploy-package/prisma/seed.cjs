const { PrismaClient } = require('../src/generated/prisma');
const scenarioData = require('./enterprise_scenarios.json');

const prisma = new PrismaClient();

async function main() {
  for (const [key, scenario] of Object.entries(scenarioData)) {
    const createdScenario = await prisma.scenario.create({
      data: {
        title: key,
        description: scenario.overview.objective,
        overview: scenario.overview,
        spendTracking: scenario.spendTracking,
        raciMatrix: scenario.raciMatrix,
        scheduleTemplate: scenario.scheduleTemplate,
        phases: {
          create: scenario.phases.map((phase) => ({
            phaseKey: phase.id,
            name: phase.name,
            durationDays: phase.durationDays,
            scheduleOffset: phase.scheduleOffset,
            budget: phase.budget,
            phaseKPI: phase.phaseKPI,
            deliverables: phase.deliverables,
            nextPhase: phase.nextPhase,
            tasks: {
              create: phase.tasks.map((task) => ({
                taskKey: task.taskId,
                desc: task.desc,
                competency: task.competency
              }))
            },
            risks: {
              create: phase.risks.map((risk) => ({
                riskKey: risk.riskId,
                name: risk.name,
                severity: risk.severity,
                trigger: risk.trigger,
                mitigation: risk.mitigation
              }))
            }
          }))
        }
      }
    });
    console.log(`Seeded: ${createdScenario.title}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
