import OpenAI from "openai";
import { z } from "zod";
import type { AiTwinAnalysis, AiTwinTimelineStep } from "./types";
import {
  BUDGET_LABELS,
  COMMUTE_LABELS,
  DENSITY_LABELS,
  ESCORT_LABELS,
  FIELD_AGENT_LABELS,
  OCCUPATION_LABELS,
  SCENARIO_LABELS,
  SHIFT_LABELS,
  WEATHER_LABELS,
  applyScenarioVariableHeuristics,
  formatScenarioVariablesForPrompt,
  sanitizeScenarioVariables,
  type ScenarioVariableValueMap,
  type TwinBudgetLevel,
  type TwinCommutePattern,
  type TwinEscortSupport,
  type TwinFieldAgentGender,
  type TwinLocationDensity,
  type TwinScenarioCategory,
  type TwinShiftType,
  type TwinTargetOccupation,
  type TwinWeather,
} from "./twinConfig";

export interface TwinSimulationInput {
  scenarioCategory: TwinScenarioCategory;
  fieldAgentGender: TwinFieldAgentGender;
  hasVehicle: boolean;
  operationDate?: string | null;
  shiftType: TwinShiftType;
  targetOccupation: TwinTargetOccupation;
  commutePattern: TwinCommutePattern;
  weather: TwinWeather;
  locationDensity: TwinLocationDensity;
  escortSupport: TwinEscortSupport;
  budgetLevel: TwinBudgetLevel;
  specialNotes?: string;
  conversationSummary?: string | null;
  scenarioTitle?: string | null;
  scenarioVariables: ScenarioVariableValueMap;
}

const openaiApiKey = process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "";
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const TwinAnalysisSchema = z.object({
  successRate: z.number().min(0).max(100),
  confidenceLabel: z.enum(["높음", "중간", "낮음"]),
  keyFactors: z.array(z.string()).min(1),
  riskAlerts: z.array(z.string()).min(1),
  recommendedActions: z.array(z.string()).min(1),
  timeline: z
    .array(
      z.object({
        phase: z.string(),
        detail: z.string(),
        emphasis: z.string().optional().nullable(),
      })
    )
    .min(1),
  knowledgeBase: z.array(z.string()).min(1),
  rationale: z.string().optional().nullable(),
});

const BASE_KNOWLEDGE = [
  "한국 민간조사 성공 사례 DB (2023) 기준 변수별 가중치 적용",
  "사설 탐정협회 필드 요원 운용 매뉴얼 7판",
  "LIRA 내부 추적 패턴 학습 모델 v2.4",
];

const TWIN_SYSTEM_PROMPT = `당신은 LIRA 디지털 트윈 분석 전문가입니다. 고객이 제공한 사건 변수를 바탕으로 작전 성공률을 추정하고, 반드시 JSON 형식으로만 응답합니다.`;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function successConfidence(rate: number): AiTwinAnalysis["confidenceLabel"] {
  if (rate >= 75) return "높음";
  if (rate >= 55) return "중간";
  return "낮음";
}

const mergeUniqueStrings = (...lists: (string[] | undefined)[]): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const list of lists) {
    if (!list) continue;
    for (const entry of list) {
      const normalized = typeof entry === "string" ? entry.trim() : "";
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(normalized);
    }
  }

  return merged;
};

function buildTimeline(inputs: TwinSimulationInput): AiTwinTimelineStep[] {
  return [
    {
      phase: "디지털 트윈 환경 구성",
      detail: `${SCENARIO_LABELS[inputs.scenarioCategory]}을(를) 기반으로 가상 시나리오 레이어링을 완료합니다.`,
    },
    {
      phase: "동선 패턴 학습",
      detail: `${OCCUPATION_LABELS[inputs.targetOccupation]} 대상의 ${COMMUTE_LABELS[inputs.commutePattern]} 데이터를 재현합니다.`,
      emphasis: "GPS ping · CDR 48시간 샘플링",
    },
    {
      phase: "현장 리스크 시뮬레이션",
      detail: `${WEATHER_LABELS[inputs.weather]} 조건과 ${DENSITY_LABELS[inputs.locationDensity]} 환경 변수를 조합해 위험 요인을 검증합니다.`,
    },
    {
      phase: "작전 리허설",
      detail: `${ESCORT_LABELS[inputs.escortSupport]} 편성으로 출입 경로와 백업 시나리오를 리허설합니다.`,
    },
  ];
}

function heuristicTwinAnalysis(inputs: TwinSimulationInput, rationale?: string | null): AiTwinAnalysis {
  let score = 62;
  const keyFactors: string[] = [];
  const riskAlerts: string[] = [];
  const recommendedActions: string[] = [];
  const scenarioVariables = sanitizeScenarioVariables(inputs.scenarioCategory, inputs.scenarioVariables);

  switch (inputs.scenarioCategory) {
    case "affair":
      score += 6;
      keyFactors.push("배우자 소송 대비 패턴: 중심 활동 시간이 명확해 추적 효율 ↑");
      break;
    case "corporate":
      score += 2;
      riskAlerts.push("기업 보안 사건은 법적 제약과 감시 회피 기술에 대비 필요");
      break;
    case "missing":
      score -= 8;
      riskAlerts.push("실종 수색은 외부 변수(경찰 공조, 지역 네트워크)에 크게 좌우");
      break;
    case "insurance":
      score += 4;
      keyFactors.push("보험 조사: 반복 패턴이 뚜렷해 증거 확보 용이");
      break;
  }

  if (inputs.fieldAgentGender === "mixed") {
    score += 4;
    keyFactors.push("혼성 요원 투입으로 현장 위장 및 접근 시나리오 다변화");
  } else if (inputs.fieldAgentGender === "female") {
    score += 2;
    keyFactors.push("여성 요원 투입: 주거지 접근 시 민원 리스크 감소");
  }

  if (inputs.hasVehicle) {
    score += 5;
    keyFactors.push("추적 차량 확보: 이동 반경 확대 및 야간 감시 지속 가능");
  } else {
    score -= 7;
    riskAlerts.push("차량 부재: 장거리 추적 시 시간/비용 부담 증가");
    recommendedActions.push("차량 지원 확보 또는 공조 파트너 투입 고려");
  }

  switch (inputs.shiftType) {
    case "day":
      score += 3;
      break;
    case "night":
      score -= 4;
      riskAlerts.push("야간 작전: 시야 확보 및 출입 통제 영향");
      break;
    case "rotating":
      score += 1;
      keyFactors.push("교대 운영: 24시간 감시 커버리지 확보");
      break;
  }

  switch (inputs.targetOccupation) {
    case "office":
      score += 6;
      keyFactors.push("사무직 대상은 규칙적인 동선 확보 가능");
      break;
    case "freelancer":
      score -= 5;
      riskAlerts.push("프리랜서는 일정 변동성 높아 동선 예측 난도 상승");
      break;
    case "service":
      score += 1;
      break;
    case "unknown":
      score -= 6;
      riskAlerts.push("피조사자 직업 불명: 사전 리서치 단계 추가 필요");
      break;
  }

  switch (inputs.commutePattern) {
    case "regular":
      score += 5;
      keyFactors.push("규칙적 출퇴근 패턴: 고정 모니터링 포인트 설정 가능");
      break;
    case "flex":
      score -= 3;
      riskAlerts.push("탄력 출퇴근: 패턴 학습 기간 연장 필요");
      break;
    case "remote":
      score -= 5;
      riskAlerts.push("재택 위주: 외부 동선 확보 어려움, 온라인 추적 활성화 필요");
      break;
  }

  switch (inputs.weather) {
    case "clear":
      score += 4;
      break;
    case "rain":
      score -= 5;
      riskAlerts.push("우천 시 시야 확보 및 추적 장비 보호 필요");
      recommendedActions.push("생활 방수 장비와 실내 잠입 시나리오 보강");
      break;
    case "snow":
      score -= 8;
      riskAlerts.push("적설 시 야간 CCTV, 도로 통제 변수↑");
      recommendedActions.push("차량 체인, 대체 교통수단 사전 확보");
      break;
    case "windy":
      score -= 2;
      break;
  }

  switch (inputs.locationDensity) {
    case "downtown":
      score -= 3;
      riskAlerts.push("도심 밀집: 주차, 미행 노출 리스크↑");
      break;
    case "residential":
      score += 2;
      keyFactors.push("주거지: 이웃 감시망 활용 가능");
      break;
    case "rural":
      score -= 1;
      riskAlerts.push("외곽 지역: 장거리 이동 계획과 연료 관리 필수");
      break;
  }

  switch (inputs.escortSupport) {
    case "solo":
      score -= 6;
      riskAlerts.push("단독 투입: 현장 변수 대응 인력 부족");
      recommendedActions.push("백업 드론 또는 실시간 컨트롤 센터 지원 확보");
      break;
    case "dual":
      score += 3;
      keyFactors.push("2인 1조: 교차 감시와 휴식 관리에 유리");
      break;
    case "team":
      score += 6;
      keyFactors.push("팀 단위 투입: 다각도 커버리지와 역할 분담 최적화");
      recommendedActions.push("작전 브리핑 시 팀 커뮤니케이션 프로토콜 재점검");
      break;
  }

  switch (inputs.budgetLevel) {
    case "tight":
      score -= 4;
      riskAlerts.push("예산 제약: 장비/교대 인력 배치 제한 우려");
      recommendedActions.push("핵심 구간에 자원 집중, IoT 센서 임대 검토");
      break;
    case "standard":
      break;
    case "premium":
      score += 5;
      keyFactors.push("프리미엄 예산: 첨단 장비와 외부 파트너 활용 범위 확대");
      break;
  }

  if (inputs.operationDate) {
    const plannedDay = new Date(inputs.operationDate).getDay();
    if (Number.isFinite(plannedDay)) {
      if (plannedDay === 0 || plannedDay === 6) {
        score -= 3;
        riskAlerts.push("주말 작전: 상업시설 폐점·경비 교대 등 변수 증가");
        recommendedActions.push("주말 전용 동선 확보 및 휴일 근무 협조 공문 준비");
      } else {
        score += 2;
        keyFactors.push("평일 작전: 출퇴근 시간대를 활용한 패턴 분석 가능");
      }
    }
  } else {
    riskAlerts.push("작전 예정일 미정: 기상·인력 배치 확정 전 추가 검토 필요");
  }

  const trimmedNotes = (inputs.specialNotes ?? "").trim();
  if (trimmedNotes.length > 0) {
    riskAlerts.push(`특이 사항 확인 필요: ${trimmedNotes}`);
  }

  const scenarioAccumulator = {
    score,
    keyFactors,
    riskAlerts,
    recommendedActions,
  } satisfies {
    score: number;
    keyFactors: string[];
    riskAlerts: string[];
    recommendedActions: string[];
  };
  applyScenarioVariableHeuristics(inputs.scenarioCategory, scenarioVariables, scenarioAccumulator);
  score = Number.isFinite(scenarioAccumulator.score) ? scenarioAccumulator.score : score;

  const successRate = clamp(Math.round(score), 8, 96);
  const confidenceLabel = successConfidence(successRate);

  if (!keyFactors.length) {
    keyFactors.push("기본 시뮬레이션 파라미터 기준 안정적으로 수행 가능");
  }
  if (!riskAlerts.length) {
    riskAlerts.push("주요 리스크 없음 – 표준 체크리스트 유지");
  }
  if (!recommendedActions.length) {
    recommendedActions.push("사전 잠복 지점 마킹 및 통신 프로토콜 점검");
  }

  return {
    id: `twin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    successRate,
    confidenceLabel,
    keyFactors,
    riskAlerts,
    recommendedActions,
    timeline: buildTimeline(inputs),
    knowledgeBase: BASE_KNOWLEDGE,
    rationale: rationale ?? undefined,
  } satisfies AiTwinAnalysis;
}

function buildPrompt(inputs: TwinSimulationInput): string {
  const scenarioVariables = sanitizeScenarioVariables(inputs.scenarioCategory, inputs.scenarioVariables);
  const segments = [
    "다음은 민간조사 디지털 트윈 분석 요청입니다.",
    "입력 변수와 현장 맥락을 기반으로 작전 성공률을 추정하고 핵심 근거를 제시하세요.",
    "출력은 반드시 JSON 형식으로 작성하고, 아래 키만 포함하세요:",
    '{"successRate": number, "confidenceLabel": "높음"|"중간"|"낮음", "keyFactors": string[], "riskAlerts": string[], "recommendedActions": string[], "timeline": [{"phase": string, "detail": string, "emphasis"?: string}], "knowledgeBase": string[], "rationale": string}',
    "successRate는 0~100 사이 정수입니다.",
    "confidenceLabel은 성공률과 근거에 따라 선택하세요.",
    "timeline은 최대 4단계, 현장 재현 절차를 서술하세요.",
    "knowledgeBase에는 참조한 매뉴얼, 데이터셋 등을 명시하세요.",
  ];

  if (inputs.scenarioTitle) {
    segments.push(`시나리오 제목: ${inputs.scenarioTitle}`);
  }
  if (inputs.conversationSummary) {
    segments.push(`상담 요약: ${inputs.conversationSummary}`);
  }

  segments.push(
    "입력 파라미터:",
    `· 카테고리: ${SCENARIO_LABELS[inputs.scenarioCategory]}`,
    `· 현장 요원 구성: ${FIELD_AGENT_LABELS[inputs.fieldAgentGender]}${inputs.hasVehicle ? " / 차량 보유" : " / 차량 없음"}`,
    `· 예정일: ${inputs.operationDate ?? "미정"}`,
    `· 근무 패턴: ${SHIFT_LABELS[inputs.shiftType]}`,
    `· 대상 직종: ${OCCUPATION_LABELS[inputs.targetOccupation]}`,
    `· 동선 패턴: ${COMMUTE_LABELS[inputs.commutePattern]}`,
    `· 기상 조건: ${WEATHER_LABELS[inputs.weather]}`,
    `· 지역 밀도: ${DENSITY_LABELS[inputs.locationDensity]}`,
    `· 투입 형태: ${ESCORT_LABELS[inputs.escortSupport]}`,
    `· 예산 수준: ${BUDGET_LABELS[inputs.budgetLevel]}`,
    `· 특이 사항: ${(inputs.specialNotes ?? "없음").trim() || "없음"}`,
  );

  const scenarioLines = formatScenarioVariablesForPrompt(inputs.scenarioCategory, scenarioVariables);
  segments.push("현장 특화 변수:", ...scenarioLines);

  segments.push("JSON만 응답하세요. 추가 설명이나 마크다운은 금지입니다.");

  return segments.join("\n");
}

function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    return match[0];
  }
  return null;
}

export async function generateDigitalTwinAnalysis(inputs: TwinSimulationInput): Promise<AiTwinAnalysis> {
  if (!openaiClient) {
    return heuristicTwinAnalysis(inputs, "OPENAI_API_KEY 미설정으로 휴리스틱 분석을 반환합니다.");
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TWIN_SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(inputs) },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const jsonText = extractJson(text) ?? text;
    const parsedJson = JSON.parse(jsonText);
    const parsed = TwinAnalysisSchema.safeParse(parsedJson);

    if (!parsed.success) {
      console.warn("[DIGITAL_TWIN_AI_PARSE_WARNING]", parsed.error.format());
      return heuristicTwinAnalysis(inputs, "AI 응답 파싱 오류로 휴리스틱 분석을 반환합니다.");
    }

    const payload = parsed.data;
    const heuristic = heuristicTwinAnalysis(inputs, "시나리오 변수 기반 휴리스틱 보정 결과");

    const blendedSuccessRate = clamp(
      Math.round(payload.successRate * 0.6 + heuristic.successRate * 0.4),
      8,
      96,
    );

    const keyFactors = mergeUniqueStrings(payload.keyFactors, heuristic.keyFactors).slice(0, 6);
    const riskAlerts = mergeUniqueStrings(payload.riskAlerts, heuristic.riskAlerts).slice(0, 6);
    const recommendedActions = mergeUniqueStrings(
      payload.recommendedActions,
      heuristic.recommendedActions,
    ).slice(0, 6);
    const knowledgeBase = mergeUniqueStrings(payload.knowledgeBase, heuristic.knowledgeBase).slice(0, 6);

    const rationaleSegments = mergeUniqueStrings(
      payload.rationale ? [payload.rationale] : undefined,
      heuristic.rationale ? [heuristic.rationale] : undefined,
      ["AI 분석과 휴리스틱 보정이 결합되어 시나리오 변수 영향도를 반영했습니다."],
    );
    const combinedRationale = rationaleSegments.length > 0 ? rationaleSegments.join("\n\n") : undefined;

    return {
      id: `twin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString(),
      successRate: blendedSuccessRate,
      confidenceLabel: successConfidence(blendedSuccessRate),
      keyFactors,
      riskAlerts,
      recommendedActions,
      timeline: payload.timeline.length > 0 ? payload.timeline.slice(0, 6) : heuristic.timeline,
      knowledgeBase,
      rationale: combinedRationale,
    } satisfies AiTwinAnalysis;
  } catch (error) {
    console.error("[DIGITAL_TWIN_AI_ERROR]", error);
    return heuristicTwinAnalysis(inputs, "AI 호출 실패로 휴리스틱 분석을 반환합니다.");
  }
}

export function describeTwinInput(inputs: TwinSimulationInput): string {
  const scenarioVariables = sanitizeScenarioVariables(inputs.scenarioCategory, inputs.scenarioVariables);
  return [
    `카테고리=${SCENARIO_LABELS[inputs.scenarioCategory]}`,
    `요원=${FIELD_AGENT_LABELS[inputs.fieldAgentGender]}`,
    `차량=${inputs.hasVehicle ? "보유" : "없음"}`,
    `패턴=${SHIFT_LABELS[inputs.shiftType]}`,
    `직업=${OCCUPATION_LABELS[inputs.targetOccupation]}`,
    `동선=${COMMUTE_LABELS[inputs.commutePattern]}`,
    `기상=${WEATHER_LABELS[inputs.weather]}`,
    `지역=${DENSITY_LABELS[inputs.locationDensity]}`,
    `투입=${ESCORT_LABELS[inputs.escortSupport]}`,
    `예산=${BUDGET_LABELS[inputs.budgetLevel]}`,
    ...formatScenarioVariablesForPrompt(inputs.scenarioCategory, scenarioVariables).map((line) => line.replace("· ", "")),
  ].join(" · ");
}

export { heuristicTwinAnalysis, buildTimeline };
