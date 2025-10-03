import { PrismaClient } from '@prisma/client';
import scenariosData from './enterprise_scenarios.json'; // JSON 파일을 직접 import
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] 시딩 스크립트 시작...');

  const filePath = path.join(process.cwd(), 'prisma', 'enterprise_scenarios.json');
  
  if (!fs.existsSync(filePath)) {
    console.error(`[SEED] ERROR: enterprise_scenarios.json 파일을 찾을 수 없습니다. 경로: ${filePath}`);
    return;
  }

  console.log(`[SEED] JSON 파일 로드 시도: ${filePath}`);
  const jsonData = fs.readFileSync(filePath, 'utf-8');
  const scenariosAsObject = JSON.parse(jsonData);

  const titleMapping: { [key: string]: string } = {
    "domesticTechExpo_Enterprise": "국내 기술 엑스포",
    "snsProductLaunch_Enterprise": "SNS 제품 마케팅",
    "overseasTechExpo_Enterprise": "해외 기술 엑스포"
  };

  // JSON 객체를 순회하며 배열로 변환하고, title과 difficulty 필드를 정규화합니다.
  const scenariosToSeed = Object.entries(scenariosAsObject).map(([key, value]) => {
    const scenario: any = value;
    scenario.title = titleMapping[key] || key; // 사용자 친화적 제목 매핑
    
    // 난이도 필드 정규화
    if (scenario.overview && scenario.overview.difficulty && !scenario.difficulty) {
      scenario.difficulty = scenario.overview.difficulty;
    }
    if (!scenario.difficulty) {
      scenario.difficulty = '보통'; // 기본값 설정
    }
    return scenario;
  });

  console.log('[SEED] JSON 파일 변환 완료:', scenariosToSeed.length, '개 시나리오');

  // 기존 데이터 삭제
  await prisma.task.deleteMany({});
  await prisma.risk.deleteMany({});
  await prisma.phase.deleteMany({});
  await prisma.scenario.deleteMany({});
  console.log('[SEED] 기존 데이터 삭제 완료.');

  // 시나리오별 데이터 삽입
  for (const s of scenariosToSeed) {
    try {
      const createdScenario = await prisma.scenario.create({
        data: {
          title: s.title,
          description: s.overview.objective,
          difficulty: s.difficulty, // 정규화된 난이도 사용
          overview: s.overview,
          spendTracking: s.spendTracking,
          raciMatrix: s.raciMatrix,
          scheduleTemplate: s.scheduleTemplate,
          phases: {
            create: s.phases.map((phase: any, phaseIndex: number) => {
              const tasks = Array.isArray(phase.tasks)
                ? phase.tasks.map((task: any, taskIndex: number) => ({
                    taskKey: task.taskId ?? `${phase.id || `phase-${phaseIndex + 1}`}-task-${taskIndex + 1}`,
                    desc: task.desc ?? task.description ?? '',
                    competency: task.competency ?? []
                  }))
                : [];

              const risks = Array.isArray(phase.risks)
                ? phase.risks.map((risk: any, riskIndex: number) => {
                    if (typeof risk === 'string') {
                      return {
                        riskKey: `${phase.id || `phase-${phaseIndex + 1}`}-risk-${riskIndex + 1}`,
                        name: risk,
                        severity: 'M',
                        trigger: '',
                        mitigation: ''
                      };
                    }
                    return {
                      riskKey: risk.riskId ?? `${phase.id || `phase-${phaseIndex + 1}`}-risk-${riskIndex + 1}`,
                      name: risk.name ?? 'Risk',
                      severity: risk.severity ?? 'M',
                      trigger: risk.trigger ?? '',
                      mitigation: risk.mitigation ?? ''
                    };
                  })
                : [];

              return {
                phaseKey: phase.id ?? `phase-${phaseIndex + 1}`,
                name: phase.name,
                durationDays: phase.durationDays,
                scheduleOffset: phase.scheduleOffset,
                budget: phase.budget,
                phaseKPI: phase.phaseKPI,
                deliverables: phase.deliverables,
                nextPhase: phase.nextPhase,
                tasks: tasks.length ? { create: tasks } : undefined,
                risks: risks.length ? { create: risks } : undefined
              };
            })
          }
        }
      });
      console.log(`[SEED] 생성된 시나리오: ${createdScenario.title}`);
    } catch (error) {
      console.error(`[SEED] "${s.title}" 시나리오 생성 중 오류 발생:`, error);
    }
  }
  console.log('[SEED] 시딩 스크립트 완료.');
}

main()
  .catch((e) => {
    console.error('[SEED] 최종 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('[SEED] Prisma 연결 해제.');
  });
