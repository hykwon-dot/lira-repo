'use server';

import { getPrismaClient } from '@/lib/prisma';
import type { Scenario, Phase, Task, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';

// Re-exporting the Task type for client components to use.
export type { Task };

export type ScenarioWithPhases = Scenario & {
  phases: Phase[];
};

export type PhaseWithTasks = Phase & {
  tasks: Task[];
};

async function loadScenarioFromJson(key: string) {
  try {
    const filePath = path.join(process.cwd(), 'prisma', 'enterprise_scenarios.json');
    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    return data[key];
  } catch (e) {
    console.error("Failed to load scenario from JSON", e);
    return null;
  }
}

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

    let scenarioByTitle = await prisma.scenario.findFirst({
      where: { title: id },
      include: {
        phases: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!scenarioByTitle) {
      const jsonScenario = await loadScenarioFromJson(id);
      if (jsonScenario) {
        try {
          const title = jsonScenario.title || id;
          const overview = jsonScenario.overview || {};
          
          scenarioByTitle = await prisma.scenario.create({
            data: {
              title: title,
              description: overview.objective || '',
              difficulty: jsonScenario.difficulty || overview.difficulty || '보통',
              overview: overview,
              spendTracking: jsonScenario.spendTracking,
              raciMatrix: jsonScenario.raciMatrix,
              scheduleTemplate: jsonScenario.scheduleTemplate,
              phases: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                create: (jsonScenario.phases || []).map((phase: any, idx: number) => ({
                  phaseKey: phase.id || `phase-${idx + 1}`,
                  name: phase.name,
                  durationDays: phase.durationDays || 0,
                  scheduleOffset: phase.scheduleOffset || 0,
                  budget: phase.budget || {},
                  phaseKPI: phase.phaseKPI || {},
                  deliverables: phase.deliverables || [],
                  order: idx,
                  tasks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    create: (phase.tasks || []).map((task: any, tIdx: number) => ({
                      taskKey: task.taskId || `task-${idx}-${tIdx}`,
                      desc: task.desc || task.description || '',
                      competency: task.competency || [],
                      order: tIdx
                    }))
                  },
                  risks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    create: (phase.risks || []).map((risk: any, rIdx: number) => ({
                      riskKey: risk.riskId || `risk-${idx}-${rIdx}`,
                      name: typeof risk === 'string' ? risk : (risk.name || 'Risk'),
                      severity: typeof risk === 'string' ? 'M' : (risk.severity || 'M'),
                      trigger: typeof risk === 'string' ? '' : (risk.trigger || ''),
                      mitigation: typeof risk === 'string' ? '' : (risk.mitigation || '')
                    }))
                  }
                }))
              }
            },
            include: {
              phases: {
                orderBy: {
                  order: 'asc',
                },
              },
            },
          });
        } catch (createError) {
          console.error("Failed to create scenario from JSON", createError);
        }
      }
    }
    
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
