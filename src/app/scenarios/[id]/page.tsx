import { promises as fs } from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import ScenarioPlaybook from './ScenarioPlaybook';
import { getPrismaClient } from '@/lib/prisma';
import type { ScenarioWithDetails, PhaseWithDetails } from './types';
import { Task, Risk } from '@prisma/client';

interface ScenarioDetailPageProps {
  params: { id: string };
}

async function getScenarioDetails(id: string): Promise<ScenarioWithDetails | null> {
  const prisma = await getPrismaClient();
  const numericId = parseInt(id, 10);

  // 1. Try DB by numeric ID
  if (!isNaN(numericId)) {
    const scenario = await prisma.scenario.findUnique({
      where: { id: numericId },
      include: {
        phases: {
          orderBy: {
            order: 'asc',
          },
          include: {
            tasks: true,
            risks: true,
          },
        },
      },
    });
    if (scenario) return scenario as ScenarioWithDetails;
  }

  // 2. Try DB by title (for string IDs)
  const scenarioByTitle = await prisma.scenario.findFirst({
    where: { title: id },
    include: {
      phases: {
        orderBy: {
          order: 'asc',
        },
        include: {
          tasks: true,
          risks: true,
        },
      },
    },
  });
  if (scenarioByTitle) return scenarioByTitle as ScenarioWithDetails;

  // 3. Try to read from JSON (Fallback)
  try {
    const filePath = path.join(process.cwd(), 'prisma', 'enterprise_scenarios.json');
    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    if (data[id]) {
      const raw = data[id];
      const overview = raw.overview || {};
      
      // Map phases
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const phases: PhaseWithDetails[] = (raw.phases || []).map((p: any, idx: number) => {
        const phaseId = idx + 1; // Use index as ID for simplicity
        
        const tasks: Task[] = (p.details || []).map((desc: string, tIdx: number) => ({
          id: phaseId * 1000 + tIdx,
          phaseId: phaseId,
          taskKey: `task-${phaseId}-${tIdx}`,
          desc: desc,
          competency: {},
          durationDays: null,
          priority: null,
          status: "PENDING",
          order: tIdx
        } as unknown as Task));

        const risks: Risk[] = (p.risks || []).map((r: string, rIdx: number) => ({
          id: phaseId * 1000 + rIdx,
          phaseId: phaseId,
          riskKey: `risk-${phaseId}-${rIdx}`,
          name: r,
          severity: "MEDIUM",
          trigger: "",
          mitigation: "상황에 따른 유연한 대처 필요", // Default mitigation
        } as unknown as Risk));

        // Convert phaseKPI object to array of strings if needed
        let phaseKPI = p.phaseKPI;
        if (phaseKPI && !Array.isArray(phaseKPI) && typeof phaseKPI === 'object') {
            phaseKPI = Object.keys(phaseKPI).map(key => {
                const val = phaseKPI[key];
                return val === true ? key : `${key}: ${val}`;
            });
        }

        return {
          id: phaseId,
          scenarioId: 0, // Dummy
          phaseKey: p.id || `phase-${idx}`,
          name: p.name,
          description: null,
          durationDays: p.durationDays || 0,
          scheduleOffset: p.scheduleOffset || 0,
          budget: p.budget || {},
          phaseKPI: phaseKPI || [],
          deliverables: p.deliverables || [],
          nextPhase: p.nextPhase || null,
          order: idx,
          tasks,
          risks,
        } as unknown as PhaseWithDetails;
      });

      const scenario: ScenarioWithDetails = {
        id: id as unknown as number, // Cast string to number type to satisfy interface
        title: raw.title || overview.objective || id,
        description: overview.objective || "",
        category: overview.industry || "기타",
        difficulty: raw.difficulty || overview.difficulty || "중간",
        image: null,
        overview: overview,
        spendTracking: {},
        raciMatrix: {},
        scheduleTemplate: {},
        riskLevel: "LOW",
        caseType: overview.caseType || null,
        successRate: overview.overallKPI?.successRate ? Math.round(overview.overallKPI.successRate * 100) : 0,
        typicalDurationDays: overview.totalDurationDays || 0,
        budgetRange: overview.budget || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        phases: phases
      };

      return scenario;
    }
  } catch (e) {
    console.error("Failed to read scenario JSON", e);
  }

  return null;
}

export default async function ScenarioDetailPage({ params }: ScenarioDetailPageProps) {
  const scenario = await getScenarioDetails(params.id);

  if (!scenario) {
    notFound();
  }

  return <ScenarioPlaybook scenario={scenario} />;
}
