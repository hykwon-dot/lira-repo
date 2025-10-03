import fs from 'fs';
import path from 'path';

const SCENARIO_FILE = path.join(process.cwd(), 'prisma', 'enterprise_scenarios.json');

type ValidationIssue = {
  scenarioId: string;
  message: string;
};

const requiredOverviewFields: Array<keyof RawOverview> = ['industry', 'objective', 'totalDurationDays', 'budget'];

interface RawOverview {
  industry?: unknown;
  objective?: unknown;
  totalDurationDays?: unknown;
  budget?: { recommended?: unknown; hardCap?: unknown } | null;
}

interface RawPhase {
  id?: unknown;
  name?: unknown;
  durationDays?: unknown;
  details?: unknown;
  tasks?: unknown;
  risks?: unknown;
}

interface RawScenario {
  overview?: RawOverview | null;
  phases?: unknown;
}

const isNonEmptyArray = (value: unknown): value is unknown[] => Array.isArray(value) && value.length > 0;

function validateScenario(scenarioId: string, scenario: RawScenario): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!scenario.overview) {
    issues.push({ scenarioId, message: 'overview가 없습니다.' });
    return issues;
  }

  requiredOverviewFields.forEach((field) => {
    const value = scenario.overview?.[field];
    if (value === undefined || value === null || value === '') {
      issues.push({ scenarioId, message: `overview.${String(field)} 값이 비어 있습니다.` });
    }
  });

  const recommendedBudget = scenario.overview?.budget?.recommended;
  if (recommendedBudget !== undefined && typeof recommendedBudget !== 'number') {
    issues.push({ scenarioId, message: 'budget.recommended 값이 숫자가 아닙니다.' });
  }

  if (!Array.isArray(scenario.phases) || scenario.phases.length === 0) {
    issues.push({ scenarioId, message: 'phases 정보가 없거나 비어 있습니다.' });
    return issues;
  }

  scenario.phases.forEach((phaseRaw, index) => {
    const phaseIssues = validatePhase(scenarioId, index, phaseRaw as RawPhase);
    issues.push(...phaseIssues);
  });

  return issues;
}

function validatePhase(scenarioId: string, index: number, phase: RawPhase): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const phaseIdentifier = `${scenarioId} > phase[${index}]`;

  if (typeof phase.name !== 'string' || phase.name.trim() === '') {
    issues.push({ scenarioId, message: `${phaseIdentifier} 이름이 누락되었습니다.` });
  }

  if (phase.durationDays !== undefined && typeof phase.durationDays !== 'number') {
    issues.push({ scenarioId, message: `${phaseIdentifier} durationDays 값이 숫자가 아닙니다.` });
  }

  const detailsValid = Array.isArray(phase.details) && phase.details.every((detail) => typeof detail === 'string');
  const tasksValid = Array.isArray(phase.tasks) && (phase.tasks as unknown[]).every((task) => {
    if (typeof task !== 'object' || task === null) {
      return false;
    }
    const desc = (task as { desc?: unknown }).desc;
    return typeof desc === 'string' && desc.trim() !== '';
  });

  if (!detailsValid && !tasksValid) {
    issues.push({
      scenarioId,
      message: `${phaseIdentifier} 상세 설명 또는 업무 목록이 없습니다.`,
    });
  }

  if (phase.risks && !isNonEmptyArray(phase.risks)) {
    issues.push({ scenarioId, message: `${phaseIdentifier} risks 형식이 올바르지 않습니다.` });
  }

  return issues;
}

function main() {
  if (!fs.existsSync(SCENARIO_FILE)) {
    console.error(`❌ 시나리오 파일을 찾을 수 없습니다: ${SCENARIO_FILE}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(SCENARIO_FILE, 'utf-8');
  const scenarios: Record<string, RawScenario> = JSON.parse(rawContent);

  const allIssues: ValidationIssue[] = [];

  Object.entries(scenarios).forEach(([scenarioId, scenario]) => {
    const issues = validateScenario(scenarioId, scenario);
    allIssues.push(...issues);
  });

  if (allIssues.length > 0) {
    console.error('❌ 시나리오 검증에 실패했습니다. 해결이 필요한 항목:');
    allIssues.forEach((issue) => {
      console.error(` - [${issue.scenarioId}] ${issue.message}`);
    });
    process.exit(1);
  }

  console.log(`✅ ${Object.keys(scenarios).length}개의 시나리오가 정상적으로 검증되었습니다.`);
}

main();
