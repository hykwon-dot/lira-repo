import { getPrismaClient } from '@/lib/prisma';
import ScenarioLibrary from './ScenarioLibrary';
import type { Scenario, Phase } from '@prisma/client';

export const dynamic = 'force-dynamic'; // Build fix: Skip static generation to avoid DB connection during build

// 시나리오 라이브러리로 전달될 처리된 시나리오 데이터의 타입을 정의합니다.
interface ProcessedScenario {
  id: number;
  title: string;
  description: string;
  image: string | null;
  totalDays: number;
  totalBudget: number;
  difficulty: string;
}

async function getScenarios(): Promise<ProcessedScenario[]> {
  const prisma = await getPrismaClient();
  const scenarios = await prisma.scenario.findMany({
    include: {
      phases: true,
    },
  });

  // 각 시나리오에 대해 총 소요 기간과 예산을 계산합니다.
  const processedScenarios = scenarios.map((scenario: Scenario & { phases: Phase[] }) => {
    const totalDays = scenario.phases.reduce((acc: number, phase: Phase) => acc + phase.durationDays, 0);
    const totalBudget = scenario.phases.reduce((acc: number, phase: Phase) => {
        // budget 필드가 JSON이므로 타입 단언을 사용합니다.
        const budget = phase.budget as { recommended?: number };
        return acc + (budget?.recommended || 0);
    }, 0);

    return {
      ...scenario,
      totalDays,
      totalBudget,
      // difficulty 필드가 null일 수 있는 경우를 대비하여 기본값을 제공합니다.
      difficulty: scenario.difficulty ?? '미정',
    };
  });
  return processedScenarios;
}

export default async function ScenarioPage() {
  const scenarios = await getScenarios();
  // 이제 getScenarios가 ProcessedScenario[] 타입을 반환하므로,
  // JSON 직렬화/역직렬화가 필요 없을 수 있지만, 복잡한 객체나 날짜 타입 등을 안전하게 전달하기 위해 유지합니다.
  return <ScenarioLibrary scenarios={JSON.parse(JSON.stringify(scenarios))} />;
}
