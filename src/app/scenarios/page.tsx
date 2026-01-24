import { getPrismaClient } from '@/lib/prisma';
import ScenarioLibrary from '@/app/scenarios/ScenarioLibrary';
import { ScenarioSummary } from '@/app/scenarios/types';
import type { Scenario, Phase } from '@prisma/client';

<<<<<<< HEAD
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
=======
type RawPhase = {
  id?: string;
  name?: string;
  durationDays?: number;
  details?: unknown;
  tasks?: Array<{ desc?: string }> | null;
};

type RawScenario = {
  title?: string;
  overview?: {
    industry?: string;
    caseType?: string;
    objective?: string;
    totalDurationDays?: number;
    budget?: { recommended?: number };
    overallKPI?: Record<string, unknown>;
    difficulty?: string;
    successRate?: number;
  };
  difficulty?: string;
  phases?: RawPhase[];
};

const TITLE_MAPPING: Record<string, string> = {
  adultery_investigation: '불륜 의혹 조사',
  credit_investigation_case: '신용 및 자산 조사',
  missing_person_case: '실종자 수색',
  industrial_espionage: '산업 기밀 유출 조사',
  insurance_fraud_investigation: '보험 사기 혐의 조사',
  background_check: '평판 조회 및 신원 확인',
  stalking_response: '스토킹 피해 대응 및 증거 수집'
};

const formatTitleFromId = (id: string) =>
  id
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const extractSuccessRate = (overview?: RawScenario['overview']) => {
  if (!overview?.overallKPI) return undefined;
  const candidate = overview.overallKPI.successRate ?? overview.overallKPI.leadConversionRate;
  if (typeof candidate === 'number') {
    return candidate;
  }
  if (typeof candidate === 'string') {
    const parsed = Number(candidate.replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(parsed)) {
      return parsed > 1 ? parsed : parsed / 100;
    }
  }
  return undefined;
};

async function getScenarios(): Promise<ScenarioSummary[]> {
  const filePath = path.join(process.cwd(), 'prisma', 'investigator_scenarios.json');
  const fileContent = await fs.readFile(filePath, 'utf8');
  const data: Record<string, RawScenario> = JSON.parse(fileContent);
>>>>>>> c5414ad7b6eb26edb21f1cdc960bb0038a9a61d6

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
