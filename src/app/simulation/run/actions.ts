'use server';

import { getPrismaClient } from '@/lib/prisma';
import type { Scenario, Phase, Task, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Re-exporting the Task type for client components to use.
export type { Task };

export type ScenarioWithPhases = Scenario & {
  phases: Phase[];
};

export type PhaseWithTasks = Phase & {
  tasks: Task[];
};

export async function getScenario(id: string): Promise<ScenarioWithPhases | null> {
  try {
    const prisma = await getPrismaClient();
    const numericId = parseInt(id, 10);
    
    if (!isNaN(numericId)) {
      const scenario = await prisma.scenario.findUnique({
        where: { id: numericId },
        include: {
          phases: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });
      if (scenario) return scenario;
    }

    const scenarioByTitle = await prisma.scenario.findFirst({
      where: { title: id },
      include: {
        phases: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
    
    return scenarioByTitle;
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return null;
  }
}

export async function getPhaseDetails(id: string): Promise<PhaseWithTasks | null> {
  try {
    const prisma = await getPrismaClient();
    const phase = await prisma.phase.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        tasks: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
    return phase;
  } catch (error) {
    console.error('Error fetching phase details:', error);
    return null;
  }
}

export async function getSimilarScenarios(scenarioId: number) {
  try {
    const prisma = await getPrismaClient();
    const baseScenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      select: {
        id: true,
        category: true,
        difficulty: true,
      },
    });

    if (!baseScenario) {
      return [] as Array<Pick<Scenario, 'id' | 'title' | 'description' | 'category' | 'difficulty'>>;
    }

    const conditions: Prisma.ScenarioWhereInput[] = [];
    if (baseScenario.category) {
      conditions.push({ category: baseScenario.category });
    }
    if (baseScenario.difficulty) {
      conditions.push({ difficulty: baseScenario.difficulty });
    }

    const where: Prisma.ScenarioWhereInput = {
      id: { not: baseScenario.id },
    };

    if (conditions.length > 0) {
      where.OR = conditions;
    }

    const similar = await prisma.scenario.findMany({
      where,
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
      },
    });

    if (similar.length === 0) {
      const fallback = await prisma.scenario.findMany({
        where: { id: { not: baseScenario.id } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          difficulty: true,
        },
      });
      return fallback;
    }

    return similar;
  } catch (error) {
    console.error('Error fetching similar scenarios:', error);
    return [];
  }
}

export async function getRisksForPhase(phaseId: number) {
  try {
    const prisma = await getPrismaClient();
    const risks = await prisma.risk.findMany({
      where: {
        phaseId: phaseId,
      },
    });
    return risks;
  } catch (error) {
    console.error('Error fetching risks:', error);
    return [];
  }
}

export async function updateTaskStatus(taskId: number, status: string): Promise<Task> {
  try {
    const prisma = await getPrismaClient();
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });
    return updatedTask;
  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error);
    throw new Error('Failed to update task status.');
  }
}

export async function getPhaseData(phaseId: number): Promise<PhaseWithTasks | null> {
  try {
    const prisma = await getPrismaClient();
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        tasks: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
    return phase;
  } catch (error) {
    console.error('Failed to fetch phase data:', error);
    return null;
  }
}

export async function toggleTaskStatus(taskId: number, newStatus: Task['status']) {
  try {
    const prisma = await getPrismaClient();
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus },
    });
    revalidatePath('/simulation/run');
    return updatedTask;
  } catch (error) {
    console.error('Failed to update task status:', error);
    throw new Error('Failed to update task status');
  }
}
