import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { getPrismaClient } from "@/lib/prisma";
import type {
  AiActionPlan,
  AiNextAction,
  AiRealtimeInsights,
  AiRiskSignal,
  AiScenarioRecommendation,
  AiTimelineStep,
  RealtimeAnalysisPayload,
} from "./types";
import type { IntakeSummary } from "@/app/simulation/types";
import { deriveTrendAlerts, recordRiskSignals } from "./riskTrendTracker";
import { generateInvestigationFlow } from "./investigationFlowSimulator";

const MESSAGE_SCHEMA = z.object({
  role: z.string(), // Allow 'system', 'data', etc. to prevent validation errors
  content: z.string().optional(), // Allow empty content (e.g. tool calls)
});

const PAYLOAD_SCHEMA = z.object({
  messages: z.array(MESSAGE_SCHEMA).min(1),
  intakeSummary: z
    .object({
      caseTitle: z.string().optional().nullable(),
      caseType: z.string().optional().nullable(),
      primaryIntent: z.string().optional().nullable(),
      urgency: z.string().optional().nullable(),
      objective: z.string().optional().nullable(),
      keyFacts: z.array(z.string()).optional(),
      missingDetails: z.array(z.string()).optional(),
      recommendedDocuments: z.array(z.string()).optional(),
      nextQuestions: z.array(z.string()).optional(),
    })
    .optional()
    .nullable(),
  keywords: z.array(z.string()).optional(),
  conversationSummary: z.string().optional().nullable(),
});

const RISK_RULES: Array<{
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  patterns: RegExp[];
  guidance: string;
}> = [
  {
    id: "violence-threat",
    title: "폭력 또는 위협 징후",
    severity: "high",
    patterns: [/폭력/, /협박/, /위협/, /위험/, /스토킹/, /접근금지/],
    guidance: "즉시 안전 확보를 권장하고, 필요 시 경찰 신고 또는 보호명령 절차 안내가 필요합니다.",
  },
  {
    id: "evidence-loss",
    title: "증거 훼손 가능성",
    severity: "medium",
    patterns: [/증거/, /삭제/, /폐기/, /훼손/, /녹취/, /영상/, /지워/],
    guidance: "증거 백업·보존 절차를 안내하고, 즉시 수집 가능한 자료 목록을 공유하세요.",
  },
  {
    id: "legal-deadline",
    title: "법적 기한 임박",
    severity: "high",
    patterns: [/기한/, /마감/, /소멸시효/, /내일/, /이번 주/, /빠르게/],
    guidance: "법적 제출 마감일을 확인하고, 필수 서류 점검과 제출 일정 조율이 필요합니다.",
  },
  {
    id: "emotional-distress",
    title: "고객 정서 안정 필요",
    severity: "medium",
    patterns: [/불안/, /두렵/, /잠을 못/, /멘탈/, /감당/, /힘들/, /울/, /패닉/],
    guidance: "심리적 지원이 필요해 보입니다. 상황을 재정리하고 안정감을 줄 수 있는 안내가 유용합니다.",
  },
  {
    id: "digital-trace",
    title: "디지털 포렌식 필요",
    severity: "low",
    patterns: [/카카오톡/, /메신저/, /이메일/, /로그/, /클라우드/, /백업/, /휴대폰/],
    guidance: "디지털 증거 수집 절차와 포렌식 보존 여부를 확인하세요.",
  },
];

const BASE_TIMELINE: AiTimelineStep[] = [
  {
    id: "intake",
    label: "사건 인입 및 정리",
    status: "in-progress",
    etaDays: 1,
    rationale: "대화를 바탕으로 사건 기본 정보를 수집하고 있습니다.",
  },
  {
    id: "evidence",
    label: "핵심 증거 수집",
    status: "pending",
    etaDays: 3,
    rationale: "주요 증거 확보 일정이 아직 확정되지 않았습니다.",
  },
  {
    id: "field",
    label: "현장 조사 및 추적",
    status: "pending",
    etaDays: 5,
    rationale: "현장 조사 범위와 리소스를 배정할 예정입니다.",
  },
  {
    id: "interim",
    label: "중간 보고 및 전략 조정",
    status: "pending",
    etaDays: 7,
    rationale: "중간 보고 일정이 확정되면 알림을 드립니다.",
  },
  {
    id: "final",
    label: "최종 보고 및 전달",
    status: "pending",
    etaDays: 10,
    rationale: "사건 종결 보고서 초안을 준비할 예정입니다.",
  },
];

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const countMatches = (content: string, patterns: RegExp[]) =>
  patterns.reduce((count, pattern) => (pattern.test(content) ? count + 1 : count), 0);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

async function loadEnterpriseScenarioCorpus(): Promise<Array<{ id: string; text: string; title: string }>> {
  const prisma = await getPrismaClient();
  const scenarios = await prisma.scenario.findMany({
    take: 120,
    include: {
      phases: {
        include: {
          tasks: true,
          risks: true,
        },
      },
    },
  });

  if (scenarios.length) {
    return scenarios.map((scenario) => {
      const overviewText = scenario.overview ? JSON.stringify(scenario.overview) : "";
      return {
        id: String(scenario.id),
        title: scenario.title ?? `시나리오 ${scenario.id}`,
        text: [
          scenario.description ?? "",
          scenario.category ?? "",
          scenario.caseType ?? "",
          overviewText,
          scenario.phases.map((phase) => `${phase.name} ${phase.description ?? ""}`).join(" "),
        ].join(" \n"),
      };
    });
  }

  // Fallback to JSON corpus when DB is empty (local dev)
  const filePath = path.join(process.cwd(), "prisma", "investigator_scenarios.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  return Object.entries(parsed as Record<string, unknown>).map(([id, value]) => {
    const record =
      value && typeof value === "object" ? (value as Record<string, unknown>) : ({} as Record<string, unknown>);

    const rawTitle = record.title;
    const normalizedTitle =
      typeof rawTitle === "string" && rawTitle.trim().length > 0
        ? rawTitle.trim()
        : id.replace(/[_-]+/g, " ").trim();

    return {
      id,
      title: normalizedTitle,
      text: JSON.stringify(record),
    };
  });
}

function buildRiskSignals(messages: Array<{ role: string; content: string }>): {
  signals: AiRiskSignal[];
  riskScore: number;
} {
  const concatenated = messages
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.content.toLowerCase())
    .join(" \n");

  const signals: AiRiskSignal[] = [];
  let accumulatedScore = 0;

  RISK_RULES.forEach((rule) => {
    const matchCount = countMatches(concatenated, rule.patterns);
    if (matchCount > 0) {
      const confidence = clamp(0.35 + matchCount * 0.2, 0.35, 0.95);
      const severityWeight = rule.severity === "high" ? 1 : rule.severity === "medium" ? 0.6 : 0.4;
      accumulatedScore += confidence * severityWeight * 30;
      signals.push({
        id: rule.id,
        title: rule.title,
        severity: rule.severity,
        confidence,
        evidence: rule.patterns
          .map((pattern) => pattern.source.replace(/\\/g, ""))
          .slice(0, 3)
          .join(", "),
        guidance: rule.guidance,
      });
    }
  });

  const riskScore = clamp(accumulatedScore, 0, 95);

  return { signals, riskScore };
}

function adjustTimeline(
  baseTimeline: AiTimelineStep[],
  summary: RealtimeAnalysisPayload["intakeSummary"],
  messages: Array<{ role: string; content: string }>
): AiTimelineStep[] {
  const cloned = baseTimeline.map((step) => ({ ...step }));
  const userContent = messages
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.content.toLowerCase())
    .join(" \n");

  if (userContent.includes("증거") || summary?.recommendedDocuments?.length) {
    const evidenceStep = cloned.find((step) => step.id === "evidence");
    if (evidenceStep) {
      evidenceStep.status = "in-progress";
      evidenceStep.etaDays = 2;
      evidenceStep.rationale = "증거 확보 필요성이 언급되어 즉시 수집 단계가 진행되어야 합니다.";
    }
  }

  if (userContent.includes("보고") || userContent.includes("중간")) {
    const interimStep = cloned.find((step) => step.id === "interim");
    if (interimStep) {
      interimStep.status = "in-progress";
      interimStep.etaDays = 3;
      interimStep.rationale = "중간 보고에 대한 요청이 확인되어 일정을 앞당깁니다.";
    }
  }

  if (userContent.includes("위협") || userContent.includes("긴급")) {
    const fieldStep = cloned.find((step) => step.id === "field");
    if (fieldStep) {
      fieldStep.status = "in-progress";
      fieldStep.etaDays = 1;
      fieldStep.rationale = "현장 대응이 필요한 긴급 신호가 감지되었습니다.";
    }
  }

  return cloned;
}

async function buildRecommendations(
  keywords: string[] | undefined,
  messages: Array<{ role: string; content: string }>
): Promise<AiScenarioRecommendation[]> {
  const corpus = await loadEnterpriseScenarioCorpus();
  const keywordSet = new Set((keywords ?? []).map((token) => token.toLowerCase()));
  const contentTokens = tokenize(
    messages
      .filter((entry) => entry.role === "user")
      .map((entry) => entry.content)
      .join(" \n")
  );

  corpus.forEach((item) => {
    item.text = item.text.toLowerCase();
  });

  const scored = corpus
    .map((item) => {
      const tokens = tokenize(item.text);
      const totalTokens = tokens.length || 1;
      let matchWeight = 0;

      tokens.forEach((token) => {
        if (keywordSet.has(token)) {
          matchWeight += 2;
        } else if (contentTokens.includes(token)) {
          matchWeight += 0.8;
        }
      });

      const overlap = clamp(matchWeight / totalTokens, 0, 1);

      return {
        id: item.id,
        title: item.title,
        similarity: overlap,
        summary: item.text.slice(0, 160).replace(/\s+/g, " ") + "...",
        highlight:
          overlap > 0.45
            ? "사건 서술과 높은 유사도를 보여 우선 검토 대상입니다."
            : "참고할 만한 유사 사건 기록입니다.",
      } satisfies AiScenarioRecommendation;
    })
    .filter((item) => item.similarity > 0.08)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 4);

  return scored;
}

function buildNextActions(
  signals: AiRiskSignal[],
  summary: RealtimeAnalysisPayload["intakeSummary"]
): AiNextAction[] {
  const actions: AiNextAction[] = [];

  if (signals.some((signal) => signal.id === "violence-threat")) {
    actions.push({
      id: "safety-plan",
      label: "고객 안전 계획 수립",
      description: "보호 요청 가능 여부, 경찰 신고, 긴급 연락망을 확인하고 공유하세요.",
      priority: "high",
    });
  }

  if ((summary?.recommendedDocuments?.length ?? 0) > 0) {
    actions.push({
      id: "document-check",
      label: "증거 확보 체크리스트 공유",
      description: "필요 서류 목록을 고객과 공유하고, 업로드 경로를 안내하세요.",
      priority: "medium",
    });
  }

  if (signals.some((signal) => signal.id === "legal-deadline")) {
    actions.push({
      id: "deadline-sync",
      label: "법적 기한 일정 조율",
      description: "제출 마감일과 내부 검토 일정을 캘린더에 등록하세요.",
      priority: "high",
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "intake-review",
      label: "초기 상담 내용 정리 및 검토",
      description: "요약본을 확인하고 누락된 질문이 없는지 점검하세요.",
      priority: "low",
    });
  }

  return actions;
}

function buildFollowUpQuestions(options: {
  summary: RealtimeAnalysisPayload["intakeSummary"];
  signals: AiRiskSignal[];
}): string[] {
  const { summary, signals } = options;
  const questions = new Set<string>();

  if (summary?.missingDetails?.length) {
    const firstGap = summary.missingDetails[0];
    questions.add(`"${firstGap}" 부분에 대해 더 자세한 상황을 알려주실 수 있을까요?`);
  }

  if (summary?.recommendedDocuments?.length) {
    questions.add("추가로 확보할 수 있는 자료나 증거가 더 있을까요?");
  }

  if (signals.some((signal) => signal.id === "violence-threat")) {
    questions.add("현재 주변에 위험 요소가 있거나 보호 조치가 필요한 상황인가요?");
  }

  if (signals.some((signal) => signal.id === "legal-deadline")) {
    questions.add("법적 제출 기한이나 일정이 정확히 언제까지인지 확인해 주실 수 있을까요?");
  }

  if (!questions.size && summary?.caseType) {
    questions.add(`${summary.caseType} 관련해서 이번 사건이 시작된 계기를 조금 더 설명해 주실 수 있을까요?`);
  }

  if (!questions.size) {
    questions.add("현재 가장 걱정되는 상황이나 추가로 공유하고 싶은 정보가 있을까요?");
  }

  return Array.from(questions).slice(0, 4);
}

function buildActionPlan(options: {
  signals: AiRiskSignal[];
  summary: RealtimeAnalysisPayload["intakeSummary"];
  nextActions: AiNextAction[];
  conversationSummary?: string | null;
}): AiActionPlan {
  const { signals, summary, nextActions, conversationSummary } = options;
  const focus = summary?.caseTitle?.trim() || summary?.primaryIntent?.trim() || "초기 대응 플랜";
  const highSeveritySignals = signals.filter((signal) => signal.severity === "high");
  const mediumSeveritySignals = signals.filter((signal) => signal.severity === "medium");

  const items: AiActionPlan["items"] = [];

  if (highSeveritySignals.length > 0) {
    items.push({
      id: "p0-safety",
      phase: "p0",
      label: "즉시 안전 및 법적 보호 조치",
      description: "고객의 현재 위치와 위험 요소를 파악하고, 긴급 연락망 및 법적 보호 조치를 바로 가동합니다.",
      ownerHint: "Lead Investigator",
      dueInHours: 1,
      relatedSignals: highSeveritySignals.map((signal) => signal.id),
    });
  }

  if ((summary?.recommendedDocuments?.length ?? 0) > 0) {
    items.push({
      id: "p0-evidence",
      phase: "p0",
      label: "핵심 증거 확보",
      description: `고객에게 ${summary?.recommendedDocuments?.slice(0, 3).join(", ") ?? "필수 증거"} 업로드를 요청하고, 손실 방지를 위한 백업을 진행합니다.`,
      ownerHint: "Case Coordinator",
      dueInHours: 6,
      relatedSignals: signals.filter((signal) => signal.id === "evidence-loss").map((signal) => signal.id),
    });
  }

  if (mediumSeveritySignals.length > 0) {
    items.push({
      id: "p1-briefing",
      phase: "p1",
      label: "중간 전략 브리핑 준비",
      description: "탐정 팀 내 브리핑 세션을 잡아 위험 신호와 고객 기대치를 재정의합니다.",
      ownerHint: "Strategy Lead",
      dueInHours: 24,
      relatedSignals: mediumSeveritySignals.map((signal) => signal.id),
    });
  }

  if ((summary?.missingDetails?.length ?? 0) > 0) {
    items.push({
      id: "p1-gap-fill",
      phase: "p1",
      label: "정보 누락 보완",
      description: `다음 항목을 우선 확인합니다: ${summary?.missingDetails?.slice(0, 3).join(", ") ?? "추가 정보"}.`,
      ownerHint: "Client Success",
      dueInHours: 36,
    });
  }

  items.push({
    id: "backup-review",
    phase: "backup",
    label: "예비 리스크 검토",
    description: "리스크 진단 결과와 시나리오 추천을 바탕으로 대체 전략을 작성하고 승인 절차를 준비합니다.",
    ownerHint: "Operations",
    dueInHours: 72,
  });

  const successCriteria = [
    "고객 안전과 긴급 이슈 안정화",
    "핵심 증거 수집 완료",
    "중간 브리핑을 통한 전략 정렬",
  ];

  const notesSegments: string[] = [];
  if (conversationSummary) {
    notesSegments.push(conversationSummary);
  }
  if ((summary?.nextQuestions?.length ?? 0) > 0) {
    notesSegments.push(`추가 확인 필요: ${summary?.nextQuestions?.slice(0, 2).join(", ")}`);
  }
  if (nextActions.length > 0) {
    notesSegments.push(`우선 실행 과제: ${nextActions
      .slice(0, 3)
      .map((action) => action.label)
      .join(", ")}`);
  }

  return {
    focus,
    generatedAt: new Date().toISOString(),
    successCriteria,
    notes:
      notesSegments.join(" / ") ||
      "대화 요약과 위험 신호를 기반으로 초기 대응 플랜이 생성되었습니다.",
    items,
  } satisfies AiActionPlan;
}

export function normalizePayload(payload: RealtimeAnalysisPayload): RealtimeAnalysisPayload {
  const parsed = PAYLOAD_SCHEMA.safeParse(payload);
  if (!parsed.success) {
    throw new Error("잘못된 요청 형식입니다.");
  }
  const { intakeSummary, ...rest } = parsed.data;

  const coerceSummary = (raw: NonNullable<typeof intakeSummary>): IntakeSummary => ({
    caseTitle: raw.caseTitle ?? "",
    caseType: raw.caseType ?? "",
    primaryIntent: raw.primaryIntent ?? "",
    urgency: raw.urgency ?? "",
    objective: raw.objective ?? "",
    keyFacts: raw.keyFacts ?? [],
    missingDetails: raw.missingDetails ?? [],
    recommendedDocuments: raw.recommendedDocuments ?? [],
    nextQuestions: raw.nextQuestions ?? [],
  });

  return {
    ...rest,
    intakeSummary: intakeSummary ? coerceSummary(intakeSummary) : null,
  };
}

export async function runRealtimeAnalysis(payload: RealtimeAnalysisPayload): Promise<AiRealtimeInsights> {
  const { messages, intakeSummary, keywords, conversationSummary } = normalizePayload(payload);

  const { signals, riskScore } = buildRiskSignals(messages);
  const trendSnapshots = await recordRiskSignals(signals);
  const timeline = adjustTimeline(BASE_TIMELINE, intakeSummary, messages);
  const recommendations = await buildRecommendations(keywords, messages);
  const nextActions = buildNextActions(signals, intakeSummary);
  const followUpQuestions = buildFollowUpQuestions({ summary: intakeSummary, signals });
  const actionPlan = buildActionPlan({
    signals,
    summary: intakeSummary,
    nextActions,
    conversationSummary,
  });
  const alerts = deriveTrendAlerts({
    snapshots: trendSnapshots,
    signals,
    caseUrgency: intakeSummary?.urgency,
    caseType: intakeSummary?.caseType,
  });

  const overallRisk: "low" | "medium" | "high" =
    riskScore > 60 ? "high" : riskScore > 30 ? "medium" : "low";
  const flowSimulation = generateInvestigationFlow({
    riskScore,
    overallRisk,
    signals,
    summary: intakeSummary ?? null,
  });

  return {
    generatedAt: new Date().toISOString(),
    riskScore: Math.round(riskScore),
    overallRisk,
    signals,
    alerts,
    timeline,
    recommendations,
    nextActions,
    actionPlan,
    flowSimulation,
    followUpQuestions,
    summary:
      overallRisk === "high"
        ? "긴급 대응이 필요한 신호가 포착되었습니다. 안전 확보와 법적 기한 준수가 우선입니다."
        : overallRisk === "medium"
        ? "핵심 이슈가 드러나고 있어 선제적 대응 전략 수립이 필요합니다."
        : "현재는 안정적인 상황이지만, 증거 확보와 일정 점검을 이어가세요.",
  } satisfies AiRealtimeInsights;
}
