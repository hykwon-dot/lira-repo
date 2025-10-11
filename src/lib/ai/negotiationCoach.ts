import type { IntakeSummary } from "@/app/simulation/types";
import type {
  AiNegotiationCoachPlan,
  AiNegotiationScriptLine,
  AiNegotiationToneGuidance,
  AiNegotiationWarning,
  AiRealtimeInsights,
  AiRiskSignal,
} from "./types";

interface NegotiationCoachOptions {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  intakeSummary?: IntakeSummary | null;
  insights?: AiRealtimeInsights | null;
  conversationSummary?: string | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const sanitize = (value: string | null | undefined) => (value ? value.replace(/\s+/g, " ").trim() : "");

const STRESS_PATTERNS = [/긴급/, /무섭/, /위협/, /불안/, /위험/, /협박/, /압박/, /시한/, /기한/, /마감/];
const HOSTILITY_PATTERNS = [/화났/, /화가/, /분노/, /책임/, /배상/, /소송/, /처벌/];
const TRUST_BUILDERS = [/감사/, /고마/, /믿/, /안심/, /도움/, /고맙/];

function analyzeSentiment(messages: NegotiationCoachOptions["messages"]) {
  let stressScore = 0;
  let hostilityScore = 0;
  let trustScore = 0;

  messages
    .filter((msg) => msg.role === "user")
    .forEach((msg) => {
      const content = msg.content.toLowerCase();
      STRESS_PATTERNS.forEach((pattern) => {
        if (pattern.test(content)) stressScore += 1;
      });
      HOSTILITY_PATTERNS.forEach((pattern) => {
        if (pattern.test(content)) hostilityScore += 1;
      });
      TRUST_BUILDERS.forEach((pattern) => {
        if (pattern.test(content)) trustScore += 1;
      });
    });

  return {
    stress: clamp(stressScore / 4, 0, 1),
    hostility: clamp(hostilityScore / 4, 0, 1),
    trust: clamp(trustScore / 3, 0, 1),
  };
}

function buildToneGuidance(
  sentiment: ReturnType<typeof analyzeSentiment>,
  insights: AiRealtimeInsights | null | undefined,
): AiNegotiationToneGuidance {
  const cues: string[] = [];
  let primaryTone = "차분하고 공감 어린 톤";
  let backupTone: string | null = null;

  if (sentiment.stress > 0.6 || insights?.overallRisk === "high") {
    primaryTone = "안정감을 주는 공감 톤";
    cues.push("안전과 보호를 반복적으로 언급", "현재 상황을 요약하며 상대 감정 수용");
  }

  if (sentiment.hostility > 0.45) {
    backupTone = "단호하지만 존중 있는 톤";
    cues.push("사실과 근거 위주로 설명", "조건과 한계를 명확히 선을 긋기");
  }

  if (sentiment.trust < 0.3) {
    cues.push("작은 약속이라도 즉시 실행할 것을 제안", "협상에서 얻을 상호 이익을 강조");
  } else {
    cues.push("긍정적으로 진행 중인 포인트를 중간중간 상기");
  }

  if (!cues.length) {
    cues.push("고객 발언을 재진술하며 이해 확인", "다음 단계와 책임 소재를 명확히 전달");
  }

  return {
    primaryTone,
    backupTone,
    cues: Array.from(new Set(cues)).slice(0, 4),
  } satisfies AiNegotiationToneGuidance;
}

function summarizeSituation(options: NegotiationCoachOptions): string {
  const { conversationSummary, intakeSummary, insights } = options;
  if (conversationSummary && conversationSummary.trim().length > 0) {
    return conversationSummary.trim();
  }
  const parts: string[] = [];
  const caseTitle = sanitize(intakeSummary?.caseTitle);
  const objective = sanitize(intakeSummary?.objective);
  const primaryIntent = sanitize(intakeSummary?.primaryIntent);

  if (caseTitle) parts.push(`사건명: ${caseTitle}`);
  if (primaryIntent) parts.push(`의뢰 목적: ${primaryIntent}`);
  if (objective) parts.push(`희망 결과: ${objective}`);
  if (insights?.overallRisk) {
    parts.push(
      `현재 위험 수준: ${
        insights.overallRisk === "high" ? "높음" : insights.overallRisk === "medium" ? "중간" : "낮음"
      } (${Math.round(insights.riskScore)}점)`,
    );
  }
  if (parts.length === 0) {
    return "핵심 정보가 충분하지 않습니다. 대화를 기반으로 우선 신뢰 구축 후 세부 조건을 확인하세요.";
  }
  return parts.join(" · ");
}

function derivePrimaryGoal(options: NegotiationCoachOptions, insights: AiRealtimeInsights | null | undefined): string {
  const { intakeSummary } = options;
  const explicitGoal = sanitize(intakeSummary?.objective);
  if (explicitGoal) return explicitGoal;
  const intent = sanitize(intakeSummary?.primaryIntent);
  if (intent) return `${intent} 달성을 위한 초기 합의 도출`;
  const actionPlanFocus = sanitize(insights?.actionPlan?.focus);
  if (actionPlanFocus) return actionPlanFocus;
  return "신뢰 확보 및 핵심 정보 확정";
}

function buildStrategyPillars(
  options: NegotiationCoachOptions,
  insights: AiRealtimeInsights | null | undefined,
): string[] {
  const pillars = new Set<string>();
  const { intakeSummary } = options;

  if (insights?.overallRisk === "high") {
    pillars.add("즉시 안전 확보 및 긴급 플랜 수립");
  }
  if (insights?.signals?.some((signal) => signal.id === "legal-deadline")) {
    pillars.add("법적 기한을 협상 카드로 제시해 일정 조율");
  }
  if ((intakeSummary?.missingDetails?.length ?? 0) > 0) {
    pillars.add("누락 정보 보완 후 조건 명확화");
  }
  if ((intakeSummary?.recommendedDocuments?.length ?? 0) > 0) {
    pillars.add("증거 확보 계획을 공유하며 신뢰 제고");
  }
  if (insights?.signals?.some((signal) => signal.id === "emotional-distress")) {
    pillars.add("감정 안정화와 지지 메시지 반복");
  }

  if (pillars.size === 0) {
    pillars.add("현 상황을 정리하고 상호 기대치 조율");
  }

  return Array.from(pillars).slice(0, 4);
}

function extractUserConcern(messages: NegotiationCoachOptions["messages"]): string | null {
  const lastUserMessage = [...messages].reverse().find((msg) => msg.role === "user");
  return lastUserMessage ? sanitize(lastUserMessage.content) : null;
}

function buildScriptedResponses(
  options: NegotiationCoachOptions,
  insights: AiRealtimeInsights | null | undefined,
  sentiment: ReturnType<typeof analyzeSentiment>,
): AiNegotiationScriptLine[] {
  const { intakeSummary } = options;
  const concern = extractUserConcern(options.messages);
  const missingDetail = sanitize(intakeSummary?.missingDetails?.[0] ?? "");
  const recommendedDoc = sanitize(intakeSummary?.recommendedDocuments?.[0] ?? "");
  const highRiskSignal = insights?.signals?.find((signal) => signal.severity === "high") ?? null;
  const mediumSignal = insights?.signals?.find((signal) => signal.severity === "medium") ?? null;

  const scripts: AiNegotiationScriptLine[] = [];

  const empathyScript = [
    "우선 지금 상황이 많이 부담스러우실 수 있다는 점을 충분히 이해하고 있습니다.",
    concern ? `말씀해 주신 "${concern}" 부분을 기준으로 상황을 재정리해드릴게요.` : "지금까지 공유해 주신 내용을 중심으로 정리하며 안내드릴게요.",
    "바로 실행 가능한 조치부터 우선 제안드리고, 필요한 경우 단계별로 함께 협상 전략을 세우겠습니다.",
  ].join(" ");

  scripts.push({
    id: "trust-opening",
    intent: "rapport",
    label: "신뢰 형성 오프닝",
    script: empathyScript,
    rationale: "상대 감정을 인정하고 바로 지원 계획을 제시하면 협상 초반 신뢰 확보에 도움이 됩니다.",
    trustImpact: clamp(0.65 + sentiment.trust * 0.3, 0.55, 0.95),
    emotionalTone: "공감",
    recommendedNextStep: "핵심 정보 2~3가지를 재확인하며 공동 목표를 명확히 합니다.",
  });

  if (missingDetail) {
    const infoScript = [
      `추가로 ${missingDetail} 부분에 대해 조금 더 상세히 확인해보고 싶습니다.`,
      "해당 정보가 확보되면 협상에서 우리가 취할 수 있는 옵션 폭이 크게 넓어집니다.",
      "부담되지 않는 선에서 확인 가능한 범위를 말씀해 주시면 제가 정리해 두겠습니다.",
    ].join(" ");

    scripts.push({
      id: "info-clarify",
      intent: "information",
      label: "핵심 정보 보강 질문",
      script: infoScript,
      rationale: "누락 정보는 협상 레버리지 확보에 필수입니다. 고객의 부담을 덜어주는 표현이 신뢰도를 유지시킵니다.",
      trustImpact: clamp(0.58 + (1 - sentiment.stress) * 0.25, 0.5, 0.88),
      emotionalTone: "차분",
      recommendedNextStep: recommendedDoc
        ? `${recommendedDoc} 자료를 확인해주시면 근거를 기반으로 제안을 구성할 수 있습니다.`
        : "확보된 정보를 요약해 공유하며 다음 단계를 예약합니다.",
    });
  }

  if (highRiskSignal) {
    const riskScript = [
      `${highRiskSignal.title} 신호가 감지되어 이 부분은 바로 대응 전략을 세워야 합니다.`,
      `우선 ${highRiskSignal.guidance}라는 방향으로 준비했으면 합니다.`,
      "동시에 상대방에게는 우리가 가능한 선택지를 미리 전달해 협상 주도권을 가져오겠습니다.",
    ].join(" ");

    scripts.push({
      id: "risk-anchor",
      intent: "risk",
      label: "리스크 대응 앵커",
      script: riskScript,
      rationale: "가장 높은 위험 요소를 선제적으로 언급하면 신뢰와 전문성을 동시에 전달할 수 있습니다.",
      trustImpact: clamp(0.62 + sentiment.trust * 0.2, 0.5, 0.9),
      emotionalTone: "단호",
      recommendedNextStep: "리스크 대응 후 예상 시나리오 2가지를 제시하며 협상 조건을 설정합니다.",
    });
  } else if (mediumSignal) {
    const mediumScript = [
      `${mediumSignal.title}가 포착되어 사전에 대비책을 준비하려 합니다.`,
      `가능한 대안은 ${mediumSignal.guidance} 방향입니다.`,
      "이 부분에 동의하신다면 협상 테이블에선 선제 대응으로 활용하겠습니다.",
    ].join(" ");

    scripts.push({
      id: "moderate-risk",
      intent: "risk",
      label: "중간 위험 관리",
      script: mediumScript,
      rationale: "중간 수준 위험을 선제적으로 다루면 협상에서 불확실성을 줄일 수 있습니다.",
      trustImpact: clamp(0.6 + sentiment.trust * 0.15, 0.48, 0.85),
      emotionalTone: "신뢰",
      recommendedNextStep: "대응 합의 후 일정과 담당자를 명확히 합니다.",
    });
  }

  if (scripts.length < 3) {
    scripts.push({
      id: "value-proposal",
      intent: "proposal",
      label: "가치 제안 정리",
      script:
        "이번 협상에서 우리가 제시할 핵심 가치는 피해 최소화와 재발 방지입니다. 상대방에게도 실익이 있음을 강조해보겠습니다.",
      rationale: "상호 이익을 강조하면 협상 동기가 상승합니다.",
      trustImpact: clamp(0.57 + sentiment.trust * 0.2, 0.5, 0.82),
      emotionalTone: "설득",
      recommendedNextStep: "동의 여부를 확인한 뒤, 구체적인 조건(기한·자료·역할)을 문서화합니다.",
    });
  }

  return scripts.slice(0, 4);
}

function buildObjectionHandlers(options: NegotiationCoachOptions): AiNegotiationScriptLine[] {
  const { intakeSummary } = options;
  const objective = sanitize(intakeSummary?.objective);
  const doc = sanitize(intakeSummary?.recommendedDocuments?.[0] ?? "");

  const handlers: AiNegotiationScriptLine[] = [];

  handlers.push({
    id: "budget-objection",
    intent: "objection",
    label: "비용/리소스 우려 대응",
    script: [
      "예산과 리소스에 대한 우려는 충분히 이해합니다.",
      objective
        ? `이번 목표(${objective})를 달성하기 위해 필수적으로 필요한 범위를 먼저 합의하고, 추가 옵션은 단계적으로 조정하겠습니다.`
        : "필수 범위와 선택 범위를 분리해 우선순위부터 확정하는 방법을 제안드립니다.",
    ].join(" "),
    rationale: "협상 상대의 부담을 나누어 제시하면 거부감을 낮출 수 있습니다.",
    trustImpact: 0.62,
    emotionalTone: "협조",
    recommendedNextStep: "필수 항목과 선택 항목을 표로 정리해 전달합니다.",
  });

  handlers.push({
    id: "evidence-objection",
    intent: "objection",
    label: "증거 부족 우려 대응",
    script: [
      "자료가 충분하지 않을 수 있다는 점이 걱정되실 수 있습니다.",
      doc
        ? `${doc}을(를) 우선 확보하면 협상에서 신뢰도를 높일 수 있습니다.`
        : "현재 가지고 있는 기록을 기준으로 검증 가능한 포인트를 먼저 제시하겠습니다.",
      "추가 확보가 어려운 부분은 직접 조사로 보완하는 시나리오도 준비해 두겠습니다.",
    ].join(" "),
    rationale: "자료 확보 전략을 제시하면 협상 준비도가 높아집니다.",
    trustImpact: 0.6,
    emotionalTone: "전략",
    recommendedNextStep: "자료 확보 계획과 예상 일정표를 공유합니다.",
  });

  return handlers;
}

function mapSignalToWarning(signal: AiRiskSignal): AiNegotiationWarning {
  return {
    id: signal.id,
    title: signal.title,
    severity: signal.severity,
    detail: `신뢰도 ${(signal.confidence * 100).toFixed(0)}% · 근거: ${signal.evidence}`,
    mitigation: signal.guidance,
  } satisfies AiNegotiationWarning;
}

function buildRiskWarnings(insights: AiRealtimeInsights | null | undefined): AiNegotiationWarning[] {
  if (!insights?.signals?.length) {
    return [
      {
        id: "general-prep",
        title: "확인되지 않은 변수",
        severity: "low",
        detail: "현재 대화에서 추가 리스크 신호는 명시되지 않았습니다.",
        mitigation: "협상 메모를 공유하며 새로운 변수 발생 시 즉시 대응할 수 있도록 알림 체계를 유지하세요.",
      },
    ];
  }

  return insights.signals.slice(0, 4).map(mapSignalToWarning);
}

function buildFollowUpPrompts(options: NegotiationCoachOptions, insights: AiRealtimeInsights | null | undefined): string[] {
  const prompts = new Set<string>();
  (insights?.followUpQuestions ?? []).forEach((item) => {
    const sanitized = sanitize(item);
    if (sanitized) prompts.add(sanitized);
  });
  (options.intakeSummary?.nextQuestions ?? []).forEach((item) => {
    const sanitized = sanitize(item);
    if (sanitized) prompts.add(sanitized);
  });

  if (!prompts.size) {
    prompts.add("상대방이 이번 협상에서 반드시 얻고 싶은 핵심 가치는 무엇인지 다시 확인해 주세요.");
    prompts.add("우리 측에서 양보 가능한 범위를 사전 정리했는지 점검해 주세요.");
  }

  return Array.from(prompts).slice(0, 5);
}

function buildRapportTips(sentiment: ReturnType<typeof analyzeSentiment>): string[] {
  const tips: string[] = [];
  if (sentiment.stress > 0.6) {
    tips.push("대답 전 핵심 요점을 정리해주고, 대화 속도는 상대 호흡에 맞춥니다.");
  }
  if (sentiment.trust < 0.35) {
    tips.push("작은 성공 경험이나 유사 사례를 공유해 전문성을 증명하세요.");
  } else {
    tips.push("상대가 이미 신뢰를 보내고 있으므로, 빠른 실행 약속으로 동력을 유지하세요.");
  }
  if (sentiment.hostility > 0.4) {
    tips.push("감정적 반응에는 즉시 사실 확인과 공감 표현을 병행해 갈등을 완화하세요.");
  }
  if (!tips.length) {
    tips.push("대화 핵심을 요약하면서 상호 확신을 반복적으로 확인하세요.");
  }
  return Array.from(new Set(tips)).slice(0, 4);
}

export function generateNegotiationCoaching(options: NegotiationCoachOptions): AiNegotiationCoachPlan {
  const insights = options.insights ?? null;
  const sentiment = analyzeSentiment(options.messages);

  const plan: AiNegotiationCoachPlan = {
    id: `coach-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    situationSummary: summarizeSituation(options),
    primaryGoal: derivePrimaryGoal(options, insights),
    toneGuidance: buildToneGuidance(sentiment, insights),
    strategyPillars: buildStrategyPillars(options, insights),
    scriptedResponses: buildScriptedResponses(options, insights, sentiment),
    objectionHandlers: buildObjectionHandlers(options),
    riskWarnings: buildRiskWarnings(insights),
    followUpPrompts: buildFollowUpPrompts(options, insights),
    rapportTips: buildRapportTips(sentiment),
  };

  return plan;
}
