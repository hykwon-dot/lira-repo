import type { IntakeSummary } from "@/app/simulation/types";
import type {
  AiFlowPhase,
  AiFlowSimulation,
  AiRiskSignal,
  RiskSeverity,
} from "./types";

interface FlowSimulationInput {
  riskScore: number;
  overallRisk: RiskSeverity;
  signals: AiRiskSignal[];
  summary?: IntakeSummary | null;
}

const BASE_PHASES: AiFlowPhase[] = [
  {
    id: "discovery",
    name: "사실 관계 정리",
    durationDays: 2,
    confidence: 0.8,
    description: "사건 개요를 정리하고 초기 증빙 자료를 수집합니다.",
    requiredRoles: ["Intake Specialist"],
    dependencies: [],
    status: "planned",
  },
  {
    id: "evidence",
    name: "증거 확보",
    durationDays: 4,
    confidence: 0.7,
    description: "문서, 디지털 로그 등을 확보하고 무결성을 검증합니다.",
    requiredRoles: ["Research Analyst", "Digital Forensic"],
    dependencies: ["discovery"],
    status: "critical",
  },
  {
    id: "field",
    name: "현장 조사",
    durationDays: 5,
    confidence: 0.6,
    description: "현장 방문, 인터뷰, 잠입 등 오프라인 조사를 수행합니다.",
    requiredRoles: ["Field Investigator"],
    dependencies: ["evidence"],
    status: "planned",
  },
  {
    id: "analysis",
    name: "분석 및 전략 수립",
    durationDays: 3,
    confidence: 0.75,
    description: "수집한 데이터를 분석하고 법적 전략과 대응 시나리오를 마련합니다.",
    requiredRoles: ["Strategy Lead", "Legal Advisor"],
    dependencies: ["field", "evidence"],
    status: "parallel",
  },
  {
    id: "report",
    name: "최종 보고 및 전달",
    durationDays: 2,
    confidence: 0.85,
    description: "조사 결과를 문서화하고 고객과 후속 조치를 협의합니다.",
    requiredRoles: ["Report Writer", "Account Manager"],
    dependencies: ["analysis"],
    status: "planned",
  },
];

function adjustPhaseDurations(phases: AiFlowPhase[], input: FlowSimulationInput): AiFlowPhase[] {
  const { overallRisk, signals, summary } = input;

  return phases.map((phase) => {
    let durationFactor = 1;
    let confidence = phase.confidence;

    if (overallRisk === "high") {
      durationFactor += 0.2;
      confidence -= 0.05;
    } else if (overallRisk === "low") {
      durationFactor -= 0.1;
      confidence += 0.05;
    }

    if (phase.id === "evidence" && (summary?.recommendedDocuments?.length ?? 0) > 3) {
      durationFactor += 0.2;
    }

    if (phase.id === "field" && signals.some((signal) => signal.id === "violence-threat")) {
      durationFactor += 0.25;
      confidence -= 0.05;
    }

    if (phase.id === "analysis" && signals.some((signal) => signal.id === "legal-deadline")) {
      durationFactor -= 0.15;
      confidence += 0.05;
      return {
        ...phase,
        durationDays: Math.max(2, Math.round(phase.durationDays * durationFactor)),
        confidence: Math.min(0.95, confidence + 0.05),
        status: "critical",
      } satisfies AiFlowPhase;
    }

    return {
      ...phase,
      durationDays: Math.max(1, Math.round(phase.durationDays * durationFactor)),
      confidence: Math.min(0.95, Math.max(0.5, confidence)),
    } satisfies AiFlowPhase;
  });
}

function buildResourceNotes(input: FlowSimulationInput): string[] {
  const notes = new Set<string>();
  const { overallRisk, summary, signals } = input;

  if (overallRisk === "high") {
    notes.add("고위험 케이스이므로 야간/주말 대응 인력을 확보하세요.");
  }

  if ((summary?.recommendedDocuments?.length ?? 0) > 5) {
    notes.add("증거 분류를 위한 문서 리뷰 태스크포스를 구성하세요.");
  }

  if (signals.some((signal) => signal.id === "digital-trace")) {
    notes.add("디지털 포렌식 장비와 전문 인력을 배치하세요.");
  }

  if (signals.some((signal) => signal.id === "emotional-distress")) {
    notes.add("고객 케어 매니저를 참여시켜 커뮤니케이션 부담을 줄여주세요.");
  }

  return Array.from(notes);
}

function buildRiskNotes(input: FlowSimulationInput): string[] {
  const notes = new Set<string>();
  const { signals } = input;

  signals.forEach((signal) => {
    if (signal.severity === "high") {
      notes.add(`${signal.title}가 반복 감지되었습니다. 초기 단계에서 별도 대책을 마련하세요.`);
    } else if (signal.severity === "medium") {
      notes.add(`${signal.title} 관련 리스크를 중간 보고에서 점검하세요.`);
    }
  });

  if (!notes.size) {
    notes.add("현재까지는 특별한 추가 리스크가 감지되지 않았습니다.");
  }

  return Array.from(notes);
}

function buildCheckpoints(phases: AiFlowPhase[]): string[] {
  return phases
    .filter((phase) => phase.status === "critical" || phase.confidence < 0.7)
    .map((phase) => `${phase.name} 단계 완료 시 리더 승인을 거쳐 다음 단계로 진행하세요.`)
    .slice(0, 4);
}

export function generateInvestigationFlow(input: FlowSimulationInput): AiFlowSimulation {
  const adjustedPhases = adjustPhaseDurations(BASE_PHASES, input);
  const totalDurationDays = adjustedPhases.reduce((sum, phase) => sum + phase.durationDays, 0);
  const resourceNotes = buildResourceNotes(input);
  const riskNotes = buildRiskNotes(input);
  const recommendedCheckpoints = buildCheckpoints(adjustedPhases);

  return {
    totalDurationDays,
    phases: adjustedPhases,
    resourceNotes,
    riskNotes,
    recommendedCheckpoints,
  } satisfies AiFlowSimulation;
}
