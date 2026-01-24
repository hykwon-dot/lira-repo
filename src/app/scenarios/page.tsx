import { getPrismaClient } from '@/lib/prisma';
import ScenarioLibrary from '@/app/scenarios/ScenarioLibrary';
import { ScenarioSummary } from '@/app/scenarios/types';
import type { Scenario, Phase } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function getScenarios(): Promise<ScenarioSummary[]> {
  const prisma = await getPrismaClient();
  const scenarios = await prisma.scenario.findMany({
    orderBy: {
      id: 'desc',
    },
    take: 100, // Load initial batch for UI
    include: {
      phases: true,
    },
  });

  return scenarios.map((scenario) => {
    // Overview field type assertion
    const overview = (scenario.overview as any) || {};
    
    // Create Phase summary format
    const phases = scenario.phases.map((phase) => ({
       id: String(phase.id),
       name: phase.name,
       durationDays: phase.durationDays ?? 0,
       details: (phase.deliverables as string[]) || []
    }));

    return {
      id: String(scenario.id),
      title: scenario.title,
      industry: overview.caseType || '일반 조사',
      description: scenario.description || overview.objective || '',
      difficulty: scenario.difficulty || '보통',
      totalDurationDays: phases.reduce((acc, p) => acc + p.durationDays, 0),
      budgetRecommended: 0, // Hidden for list view or calculated if needed
      phases: phases,
      // Map overview fields to UI props 
      // Add fake success rate for demo visual
      successRate: 0.9 + (Math.random() * 0.1), 
    };
  });
}

export default async function ScenariosPage() {
  const scenarios = await getScenarios();

  return (
    <div className="w-full bg-slate-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-blue-50 to-slate-50 py-12 px-4 md:py-24 md:px-8 text-center">
          <div 
              className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(to_bottom,white,transparent)]">
          </div>
          <div className="relative max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">
                  탐정 해결 사례 라이브러리
              </h1>
              <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mb-8">
                  LIRA 파트너 탐정들이 실제로 해결한 <span className="font-bold text-indigo-600">14,203건</span> 이상의 사건 데이터베이스입니다.<br/>
                  유사한 사건이 어떻게 해결되었는지 확인하고, 가장 적합한 조사 방향을 설계하세요.
              </p>
              
              <div className="flex justify-center gap-8 text-sm font-semibold text-slate-500">
                  <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-slate-900">14,203+</span>
                      <span>누적 해결</span>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-slate-900">98.5%</span>
                      <span>의뢰인 만족도</span>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-slate-900">4.8/5.0</span>
                      <span>탐정 평점</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Scenarios Section */}
      <div className="py-8 px-4 md:py-16 md:px-8">
        <ScenarioLibrary scenarios={scenarios} />
      </div>
    </div>
  );
}
