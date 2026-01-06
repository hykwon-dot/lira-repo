import { promises as fs } from 'fs';
import path from 'path';
import ScenarioLibrary from '@/app/scenarios/ScenarioLibrary';
import { ScenarioSummary } from '@/app/scenarios/types';

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
  domesticTechExpo_Enterprise: '국내 기술 엑스포',
  snsProductLaunch_Enterprise: 'SNS 제품 마케팅',
  overseasTechExpo_Enterprise: '해외 기술 엑스포',
  adultery_investigation: '불륜 의혹 조사',
  credit_investigation_case: '신용 조사 프로젝트',
  missing_person_case: '실종자 수색 작전',
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
  const filePath = path.join(process.cwd(), 'prisma', 'enterprise_scenarios.json');
  const fileContent = await fs.readFile(filePath, 'utf8');
  const data: Record<string, RawScenario> = JSON.parse(fileContent);

  return Object.entries(data).map(([id, scenario]) => {
    const overview = scenario.overview ?? {};
    const title = scenario.title ?? TITLE_MAPPING[id] ?? overview.objective ?? overview.industry ?? formatTitleFromId(id);
    const industry = overview.industry ?? overview.caseType ?? '기타';
    const objective = overview.objective ?? '시나리오 개요 정보가 추가될 예정입니다.';
    const totalDurationDays = overview.totalDurationDays;
    const budgetRecommended = overview.budget?.recommended;
    const difficulty = scenario.difficulty ?? overview.difficulty;
    const successRate = extractSuccessRate(overview);

    const phases = (scenario.phases ?? []).map((phase, index) => {
      const detailItems: string[] = [];
      if (Array.isArray(phase.details)) {
        detailItems.push(...phase.details.filter((item): item is string => typeof item === 'string'));
      }
      if (Array.isArray(phase.tasks)) {
        detailItems.push(
          ...phase.tasks
            .map((task) => task?.desc)
            .filter((desc): desc is string => Boolean(desc))
        );
      }
      return {
        id: phase.id ?? `phase-${index + 1}`,
        name: phase.name ?? `단계 ${index + 1}`,
        durationDays: phase.durationDays,
        details: detailItems,
      };
    });

    const metaDescriptionParts: string[] = [];
    metaDescriptionParts.push(objective);
    if (totalDurationDays) {
      metaDescriptionParts.push(`총 ${totalDurationDays}일 예상`);
    }
    if (budgetRecommended) {
      metaDescriptionParts.push(`권장 예산 ${budgetRecommended.toLocaleString()}원`);
    }

    return {
      id,
      title,
      industry,
      description: metaDescriptionParts.join(' · '),
      difficulty,
      totalDurationDays,
      budgetRecommended,
      successRate,
      phases,
    } satisfies ScenarioSummary;
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
                  유사한 사건 사례
              </h1>
              <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
                  실제 민간조사원들이 해결한 다양한 사건들을 살펴보고, 당신의 상황과 유사한 사례를 찾아보세요. 전문가들의 조사 방법과 해결 과정을 참고하실 수 있습니다.
              </p>
          </div>
      </div>

      {/* Scenarios Section */}
      <div className="py-8 px-4 md:py-16 md:px-8">
        <ScenarioLibrary scenarios={scenarios} />
      </div>

       {/* TODO: Add Chart and Recommended Projects sections from the image */}
    </div>
  );
}
