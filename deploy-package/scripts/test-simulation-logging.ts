import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureTestUser() {
  const existing = await prisma.user.findFirst({
    orderBy: { id: 'asc' },
  });
  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      email: 'simulation-tester@example.com',
      name: 'Simulation Tester',
      password: 'temporary',
      role: 'ADMIN',
    },
  });
}

async function ensureScenario() {
  const scenario = await prisma.scenario.findFirst({
    orderBy: { id: 'asc' },
  });
  if (!scenario) {
    throw new Error('No scenario seed data available for simulation logging test.');
  }
  return scenario;
}

async function main() {
  const user = await ensureTestUser();
  const scenario = await ensureScenario();

  const run = await prisma.simulationRun.create({
    data: {
      userId: user.id,
      scenarioId: scenario.id,
      status: 'ACTIVE',
      metadata: { source: 'test-script' },
    },
  });

  await prisma.simulationEvent.create({
    data: {
      runId: run.id,
      userId: user.id,
      eventType: 'NOTE_ADDED',
      payload: { note: '테스트 노트' },
    },
  });

  const fetched = await prisma.simulationRun.findUnique({
    where: { id: run.id },
    include: {
      events: true,
    },
  });

  if (!fetched) {
    throw new Error('Created simulation run could not be fetched.');
  }

  if ((fetched.events?.length ?? 0) === 0) {
    throw new Error('Simulation event was not persisted.');
  }

  await prisma.simulationEvent.deleteMany({ where: { runId: run.id } });

  await prisma.simulationRun.delete({
    where: { id: run.id },
  });

  console.log('✓ Simulation logging models validated successfully.');
}

main()
  .catch((error) => {
    console.error('✗ Simulation logging test failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
