import { notFound } from 'next/navigation';
import ScenarioPlaybook from './ScenarioPlaybook';
import { getPrismaClient } from '@/lib/prisma';
import type { ScenarioWithDetails, PhaseWithDetails } from './types';
import { promises as fs } from 'fs';
import path from 'path';

interface ScenarioDetailPageProps {
  params: { id: string };
}

const TITLE_MAPPING: Record<string, string> = {
  domesticTechExpo_Enterprise: '국내 기술 엑스포',
  snsProductLaunch_Enterprise: 'SNS 제품 마케팅',
  overseasTechExpo_Enterprise: '해외 기술 엑스포',
  adultery_investigation: '불륜 의혹 조사',
  credit_investigation_case: '신용 조사 프로젝트',
  missing_person_case: '실종자 수색 작전',
};

async function getScenarioDetails(id: string): Promise<ScenarioWithDetails | null> {
  const numericId = parseInt(id, 10);
  
  if (!isNaN(numericId)) {
    const prisma = await getPrismaClient();
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
    return scenario as ScenarioWithDetails | null;
  }

  // Fallback: Load from JSON for string IDs
  try {
    const filePath = path.join(process.cwd(), 'prisma', 'enterprise_scenarios.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const scenarios = JSON.parse(fileContent);
    const scenarioData = scenarios[id];

    if (!scenarioData) {
      return null;
    }

    // Map JSON data to Prisma-like structure
    const phases: PhaseWithDetails[] = (scenarioData.phases || []).map((p: any, index: number) => ({
      id: index + 1, // Dummy ID
      scenarioId: 0,
      name: p.name || `Phase ${index + 1}`,
      description: Array.isArray(p.details) ? p.details.join('\n') : (p.details || null),
      durationDays: p.durationDays || 0,
      order: index,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      scheduleOffset: p.scheduleOffset || 0,
      budget: p.budget || null,
      phaseKPI: p.phaseKPI || null,
      deliverables: p.deliverables || null,
      nextPhase: p.nextPhase || null,
      tasks: (p.tasks || []).map((t: any, tIndex: number) => ({
        id: tIndex + 1,
        phaseId: index + 1,
        description: t.desc || t.description || '',
        status: 'PENDING',
        assigneeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        taskKey: t.taskId || `task-${tIndex}`,
        competency: t.competency || null,
        order: tIndex
      })),
      risks: (p.risks || []).map((r: any, rIndex: number) => ({
        id: rIndex + 1,
        phaseId: index + 1,
        name: typeof r === 'string' ? r : r.name || 'Risk',
        description: typeof r === 'string' ? '' : r.mitigation || '',
        severity: typeof r === 'string' ? 'M' : r.severity || 'M',
        probability: 'M',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
        riskKey: typeof r === 'string' ? `risk-${rIndex}` : r.riskId || `risk-${rIndex}`,
        trigger: typeof r === 'string' ? '' : r.trigger || '',
        mitigation: typeof r === 'string' ? '' : r.mitigation || ''
      })),
    }));

    const scenario: ScenarioWithDetails = {
      id: 0, // Dummy ID
      title: TITLE_MAPPING[id] || id,
      description: scenarioData.overview?.objective || '',
      category: scenarioData.overview?.industry || 'General',
      difficulty: scenarioData.overview?.difficulty || '보통',
      image: null,
      overview: scenarioData.overview || null,
      spendTracking: scenarioData.spendTracking || null,
      raciMatrix: scenarioData.raciMatrix || null,
      scheduleTemplate: scenarioData.scheduleTemplate || null,
      riskLevel: 'Medium',
      caseType: 'Enterprise',
      successRate: 0,
      typicalDurationDays: scenarioData.overview?.totalDurationDays || 0,
      budgetRange: scenarioData.overview?.budget || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      phases: phases,
    };

    return scenario;
  } catch (error) {
    console.error('Error loading scenario from JSON:', error);
    return null;
  }
}

export default async function ScenarioDetailPage({ params }: ScenarioDetailPageProps) {
  const scenario = await getScenarioDetails(params.id);

  if (!scenario) {
    notFound();
  }

  return <ScenarioPlaybook scenario={scenario} />;
}
