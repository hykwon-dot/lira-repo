import { getPrismaClient } from '@/lib/prisma';
import ScenarioLibrary from './ScenarioLibrary';
import type { Scenario, Phase } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface ProcessedScenario {
  id: number;
  title: string;
  description: string;
  image: string | null;
  totalDays: number;
  totalBudget: number;
  difficulty: string;
}

async function getScenarios(limit: number, offset: number): Promise<{ items: ProcessedScenario[], total: number }> {
  const prisma = await getPrismaClient();
  
  // 임시적으로 더 많은 데이터를 가져와서 필터링 (페이지네이션 오차 최소화)
  const scenarios = await prisma.scenario.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      phases: {
        select: {
          durationDays: true,
          budget: true,
        }
      },
    },
  });

  // MISSING_PERSON 타입 제외 필터링 (임시)
  const filteredScenarios = scenarios.filter((scenario) => {
    const overview = (scenario.overview as any) || {};
    return overview.caseType !== 'MISSING_PERSON';
  });

  const total = filteredScenarios.length;
  const paginatedScenarios = filteredScenarios.slice(offset, offset + limit);

  const processedScenarios = paginatedScenarios.map((scenario) => {
    const totalDays = scenario.phases.reduce((acc, phase) => acc + phase.durationDays, 0);
    const totalBudget = scenario.phases.reduce((acc, phase) => {
        const budget = phase.budget as { recommended?: number };
        return acc + (budget?.recommended || 0);
    }, 0);

    return {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      image: scenario.image,
      totalDays,
      totalBudget,
      difficulty: scenario.difficulty ?? '미정',
    };
  });

  return { items: processedScenarios, total };
}

export default async function ScenarioPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = parseInt(searchParams.page || '1');
  const limit = 12;
  const offset = (page - 1) * limit;

  const { items, total } = await getScenarios(limit, offset);
  
  return (
    <ScenarioLibrary 
      initialScenarios={JSON.parse(JSON.stringify(items))} 
      totalCount={total}
      currentPage={page}
      limit={limit}
    />
  );
}
