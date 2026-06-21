"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiCompass,
  FiMapPin,
  FiPlay,
  FiTrendingUp,
} from "react-icons/fi";

import type { AiTwinAnalysis } from "@/lib/ai/types";
import {
  BUDGET_LABELS,
  COMMUTE_LABELS,
  DENSITY_LABELS,
  ESCORT_LABELS,
  FIELD_AGENT_LABELS,
  OCCUPATION_LABELS,
  SCENARIO_LABELS,
  SCENARIO_VARIABLE_DEFINITIONS,
  SHIFT_LABELS,
  WEATHER_LABELS,
  applyScenarioVariableHeuristics,
  createScenarioVariableDefaults,
  sanitizeScenarioVariables,
  type ScenarioHeuristicAccumulator,
  type ScenarioVariableDefinition,
  type ScenarioVariableValue,
  type ScenarioVariableValueMap,
  type TwinScenarioCategory,
  type TwinFieldAgentGender,
  type TwinShiftType,
  type TwinTargetOccupation,
  type TwinCommutePattern,
  type TwinWeather,
  type TwinLocationDensity,
  type TwinEscortSupport,
  type TwinBudgetLevel,
} from "@/lib/ai/twinConfig";
import { useHydratedUserStore } from "@/lib/userStore";
import {
  InvestigatorRecommendation,
  InvestigatorRecommendationsCard,
} from "../InvestigatorRecommendationsCard";
import type { IntakeSummary } from "../types";

interface TwinInputs {
  scenarioCategory: TwinScenarioCategory;
  fieldAgentGender: TwinFieldAgentGender;
  hasVehicle: boolean;
  operationDate: string;
  shiftType: TwinShiftType;
  targetOccupation: TwinTargetOccupation;
  commutePattern: TwinCommutePattern;
  weather: TwinWeather;
  locationDensity: TwinLocationDensity;
  escortSupport: TwinEscortSupport;
  budgetLevel: TwinBudgetLevel;
  specialNotes: string;
  scenarioVariables: ScenarioVariableValueMap;
}

type TwinAnalysisResult = AiTwinAnalysis;

const defaultInputs: TwinInputs = {
  scenarioCategory: "affair",
  fieldAgentGender: "mixed",
  hasVehicle: true,
  operationDate: "",
  shiftType: "day",
  targetOccupation: "office",
  commutePattern: "regular",
  weather: "clear",
  locationDensity: "residential",
  escortSupport: "dual",
  budgetLevel: "standard",
  specialNotes: "",
  scenarioVariables: createScenarioVariableDefaults("affair"),
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type HandoffTranscriptEntry = {
  role: "user" | "assistant";
  content: string;
};

interface SimulationHandoffContext {
  summary?: IntakeSummary | null;
  conversationSummary?: string | null;
  transcript?: HandoffTranscriptEntry[] | null;
}

const successConfidence = (rate: number): TwinAnalysisResult["confidenceLabel"] => {
  if (rate >= 75) return "높음";
  if (rate >= 55) return "중간";
  return "낮음";
};

const BASE_FIXED_VARIABLE_COUNT = 11;

const mergeTextFragments = (summary?: IntakeSummary | null, conversation?: string | null): string => {
  const fragments: string[] = [];
  if (summary) {
    fragments.push(summary.caseTitle ?? "");
    fragments.push(summary.caseType ?? "");
    fragments.push(summary.primaryIntent ?? "");
    fragments.push(summary.objective ?? "");
    fragments.push(summary.urgency ?? "");
    fragments.push(...(summary.keyFacts ?? []));
    fragments.push(...(summary.missingDetails ?? []));
    fragments.push(...(summary.recommendedDocuments ?? []));
  }
  if (conversation) {
    fragments.push(conversation);
  }
  return fragments
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(" ")
    .toLowerCase();
};

const deriveKeywords = (summary: IntakeSummary | null): string[] => {
  if (!summary) return [];

  const bucket: string[] = [];
  const push = (value?: string) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    bucket.push(trimmed);
    trimmed.split(/[\s,]+/).forEach((token) => {
      const normalized = token.trim();
      if (normalized.length > 1) {
        bucket.push(normalized);
      }
    });
  };

  [
    summary.caseTitle,
    summary.caseType,
    summary.primaryIntent,
    summary.objective,
    summary.urgency,
    ...(summary.keyFacts ?? []),
    ...(summary.missingDetails ?? []),
  ].forEach(push);

  return Array.from(new Set(bucket.filter((value) => value.trim().length > 0))).slice(0, 48);
};

const containsAnyKeyword = (text: string, keywords: string[]): boolean =>
  keywords.some((keyword) => text.includes(keyword));

const deriveScenarioCategoryFromSummary = (
  summary?: IntakeSummary | null,
  conversation?: string | null,
): TwinScenarioCategory => {
  const text = mergeTextFragments(summary, conversation);
  const caseType = summary?.caseType?.toLowerCase() ?? "";

  const missingKeywords = ["실종", "가출", "missing", "행방", "유괴", "kidnap", "찾고", "수색"];
  const corporateKeywords = ["기업", "회사", "법인", "내부", "스파이", "산업", "보안", "퇴사", "자료 유출", "hack"];
  const insuranceKeywords = ["보험", "보험금", "보험사", "청구", "연금", "산재", "보험사기", "claim"];
  const affairKeywords = ["불륜", "외도", "배우자", "결혼", "이혼", "혼인", "연인"];

  if (containsAnyKeyword(text, missingKeywords) || containsAnyKeyword(caseType, missingKeywords)) {
    return "missing";
  }
  if (containsAnyKeyword(text, corporateKeywords) || containsAnyKeyword(caseType, corporateKeywords)) {
    return "corporate";
  }
  if (containsAnyKeyword(text, insuranceKeywords) || containsAnyKeyword(caseType, insuranceKeywords)) {
    return "insurance";
  }
  if (containsAnyKeyword(text, affairKeywords) || containsAnyKeyword(caseType, affairKeywords)) {
    return "affair";
  }
  return "affair";
};

const deriveSpecialNotesFromSummary = (summary?: IntakeSummary | null): string => {
  if (!summary) return "";
  const facts = summary.keyFacts?.slice(0, 2).filter((fact) => fact && fact.trim().length > 0) ?? [];
  if (facts.length > 0) {
    return facts.join(" · ");
  }
  const missing = summary.missingDetails?.[0];
  if (missing && missing.trim().length > 0) {
    return missing.trim();
  }
  return "";
};

const buildScenarioVariablesFromContext = (
  category: TwinScenarioCategory,
  summary?: IntakeSummary | null,
  conversation?: string | null,
): ScenarioVariableValueMap => {
  const defaults = createScenarioVariableDefaults(category);
  const result: ScenarioVariableValueMap = { ...defaults };
  const text = mergeTextFragments(summary, conversation);

  const setValue = (id: string, value: ScenarioVariableValue) => {
    result[id] = value;
  };

  switch (category) {
    case "affair": {
      if (containsAnyKeyword(text, ["야간", "새벽", "예측 불가", "불규칙", "갑작", "주말" ])) {
        setValue("routinePredictability", "low");
      } else if (containsAnyKeyword(text, ["규칙", "매일", "출퇴근", "고정", "정기"])) {
        setValue("routinePredictability", "high");
      }

      if (containsAnyKeyword(text, ["공동", "같은 회사", "동거", "공유", "같은 공간", "같이 근무"])) {
        setValue("sharedLocations", true);
      }

      if (containsAnyKeyword(text, ["sns", "인스타", "카톡", "메신저", "위치", "gps", "디지털", "휴대폰"])) {
        setValue("digitalTrailVisibility", "extensive");
      } else if (containsAnyKeyword(text, ["연락 없음", "단절", "잠수"])) {
        setValue("digitalTrailVisibility", "minimal");
      }

      if (containsAnyKeyword(text, ["여러", "다수", "복수", "동료들", "친구들"])) {
        setValue("thirdPartyComplexity", "multiple");
      } else if (containsAnyKeyword(text, ["모름", "불명", "확실치 않", "추측"])) {
        setValue("thirdPartyComplexity", "unknown");
      }

      if (containsAnyKeyword(text, ["형사", "고소", "고발", "협박", "범죄"])) {
        setValue("legalSensitivity", "criminal");
      } else if (containsAnyKeyword(text, ["소송", "재판", "이혼", "법원", "소장"])) {
        setValue("legalSensitivity", "litigation");
      }

      if (containsAnyKeyword(text, ["계좌", "입금", "결제", "카드", "통장", "금전"])) {
        setValue("evidenceTypePriority", "financial");
      } else if (containsAnyKeyword(text, ["영상", "cctv", "녹화", "카메라"])) {
        setValue("evidenceTypePriority", "video");
      } else if (containsAnyKeyword(text, ["디지털", "로그", "휴대폰", "클라우드"])) {
        setValue("evidenceTypePriority", "digital");
      }

      if (containsAnyKeyword(text, ["주말", "weekend", "토요일", "일요일", "밤늦", "야간"])) {
        setValue("weekendActivityLevel", "high");
      } else if (containsAnyKeyword(text, ["평일", "주중", "office hour", "규칙적"])) {
        setValue("weekendActivityLevel", "low");
      }

      if (containsAnyKeyword(text, ["출장", "여행", "비행", "장거리", "해외", "주말마다", "매주"])) {
        setValue("travelFrequency", "weekly");
      } else if (containsAnyKeyword(text, ["가끔", "드물", "거의", "rarely"])) {
        setValue("travelFrequency", "rare");
      }

      if (containsAnyKeyword(text, ["가족 모름", "가족도 모르게", "비밀", "숨김", "secret"])) {
        setValue("familyAwarenessLevel", "hidden");
      } else if (containsAnyKeyword(text, ["가족 모두", "부모 알고", "형제 알고", "open"])) {
        setValue("familyAwarenessLevel", "open");
      }

      if (containsAnyKeyword(text, ["공유 차량", "같은 차", "차 함께", "vehicle share", "렌트 같이"])) {
        setValue("sharedVehicleAccess", true);
      }

      if (containsAnyKeyword(text, ["it", "개발자", "보안", "암호", "vpn", "tech", "해킹"])) {
        setValue("targetTechSavvy", "high");
      } else if (containsAnyKeyword(text, ["디지털 약함", "스마트폰 서툴", "기술에 취약"])) {
        setValue("targetTechSavvy", "low");
      }

      if (containsAnyKeyword(text, ["현금", "차명", "가상계좌", "비밀 계좌", "cash only", "우회결제"])) {
        setValue("financialOpsec", "strict");
      } else if (containsAnyKeyword(text, ["대충", "흔적 남", "영수증", "신용카드"])) {
        setValue("financialOpsec", "basic");
      }
      break;
    }
    case "corporate": {
      if (containsAnyKeyword(text, ["관리자", "admin", "root", "광범위", "전체 권한", "전사"])) {
        setValue("insiderAccessLevel", "high");
      } else if (containsAnyKeyword(text, ["제한", "외주", "limited", "파트타임"])) {
        setValue("insiderAccessLevel", "low");
      }

      if (containsAnyKeyword(text, ["고도", "보안 시스템", "cctv", "siem", "detection", "xdr", "차세대"])) {
        setValue("securityMaturity", "advanced");
      } else if (containsAnyKeyword(text, ["낙후", "구형", "기초", "비활성"])) {
        setValue("securityMaturity", "basic");
      }

      if (containsAnyKeyword(text, ["재택", "원격", "wfh", "hybrid", "telework"])) {
        setValue("remoteWorkRatio", "high");
      } else if (containsAnyKeyword(text, ["현장", "공장", "상주", "출근"])) {
        setValue("remoteWorkRatio", "low");
      }

      if (containsAnyKeyword(text, ["리걸 홀드", "legal hold", "증거 보존", "보존 명령"])) {
        setValue("legalHoldActive", true);
      }

      if (containsAnyKeyword(text, ["규제", "pii", "개인정보", "금융", "의료", "기밀"])) {
        setValue("dataSensitivity", containsAnyKeyword(text, ["규제", "pii", "의료", "금융"]) ? "regulated" : "confidential");
      }

      if (containsAnyKeyword(text, ["노조", "조합", "노동조합", "위원회"])) {
        setValue("unionPresence", containsAnyKeyword(text, ["강경", "파업", "강력"]) ? "strong" : "partial");
      }

      if (containsAnyKeyword(text, ["로그 미제공", "공유 불가", "중단", "비활성화"])) {
        setValue("cyberMonitoring", false);
      } else if (containsAnyKeyword(text, ["실시간 로그", "보안팀 협조", "soc"])) {
        setValue("cyberMonitoring", true);
      }

      if (containsAnyKeyword(text, ["다국적", "글로벌", "해외 지사", "global", "본사 외"])) {
        setValue("siteDistribution", "global");
      } else if (containsAnyKeyword(text, ["본사 한 곳", "단일", "한 건물"])) {
        setValue("siteDistribution", "single");
      }

      if (containsAnyKeyword(text, ["재발", "반복", "again", "비슷한 사고", "연쇄"])) {
        setValue("incidentHistory", "recurring");
      } else if (containsAnyKeyword(text, ["첫 사고", "처음", "전례 없음"])) {
        setValue("incidentHistory", "none");
      }

      if (containsAnyKeyword(text, ["협력사", "외주", "vendor", "공급망", "outsourcing"])) {
        setValue("vendorFootprint", containsAnyKeyword(text, ["수백", "수십", "광범위", "많은"]) ? "extensive" : "diversified");
      }

      if (containsAnyKeyword(text, ["이직률", "퇴사", "resignation", "turnover"])) {
        if (containsAnyKeyword(text, ["높", "폭증", "increase", "잦음"])) {
          setValue("employeeTurnover", "volatile");
        } else if (containsAnyKeyword(text, ["낮", "안정", "stable"])) {
          setValue("employeeTurnover", "stable");
        }
      }

      if (containsAnyKeyword(text, ["로그 공백", "기록 없음", "backup 없음", "데이터 유실"])) {
        setValue("dataLossWindow", 72);
      } else if (containsAnyKeyword(text, ["실시간 기록", "즉시 백업", "automated backup"])) {
        setValue("dataLossWindow", 6);
      }

      if (containsAnyKeyword(text, ["제보", "whistle", "익명 신고", "internal report"])) {
        setValue("whistleblowerActivity", containsAnyKeyword(text, ["여러", "많음", "active"]) ? "active" : "pending");
      }
      break;
    }
    case "missing": {
      if (containsAnyKeyword(text, ["확실", "cctv", "직접 목격", "증언", "사진"])) {
        setValue("lastSightingReliability", "strong");
      } else if (containsAnyKeyword(text, ["불확실", "추정", "모호", "미확인"])) {
        setValue("lastSightingReliability", "weak");
      }

      if (containsAnyKeyword(text, ["경찰", "수사", "공조", "신고", "형사"])) {
        setValue("lawEnforcementCooperation", "active");
      } else if (containsAnyKeyword(text, ["미신고", "신고 안", "단독"])) {
        setValue("lawEnforcementCooperation", "none");
      }

      if (containsAnyKeyword(text, ["우울", "정신", "약", "병력", "만성", "지병", "약물"])) {
        setValue("healthConcerns", containsAnyKeyword(text, ["응급", "위급", "중증", "자살"]) ? "critical" : "known");
      }

      if (containsAnyKeyword(text, ["여권", "passport", "출국", "비행기", "공항"])) {
        setValue("travelDocumentStatus", "held");
      } else if (containsAnyKeyword(text, ["압수", "회수", "몰수", "보관", "없음"])) {
        setValue("travelDocumentStatus", "confiscated");
      } else if (containsAnyKeyword(text, ["미발급", "없다", "no passport"])) {
        setValue("travelDocumentStatus", "notIssued");
      }

      if (containsAnyKeyword(text, ["독거", "혼자", "고립", "연락 두절"])) {
        setValue("supportNetwork", "isolated");
      } else if (containsAnyKeyword(text, ["가족", "부모", "형제", "부부"])) {
        setValue("supportNetwork", "family");
      } else if (containsAnyKeyword(text, ["친구", "지인", "커뮤니티", "동호회"])) {
        setValue("supportNetwork", "friends");
      }

      if (containsAnyKeyword(text, ["산", "야산", "시골", "외곽", "하천", "바다"])) {
        setValue("riskZones", "wilderness");
      } else if (containsAnyKeyword(text, ["도심", "서울", "도시", "역세권"])) {
        setValue("riskZones", "urban");
      }

      if (containsAnyKeyword(text, ["방금", "몇 시간", "오늘", "어제", "last night"])) {
        setValue("timeSinceMissingHours", 18);
      } else if (containsAnyKeyword(text, ["이틀", "48", "3일", "72"])) {
        setValue("timeSinceMissingHours", 72);
      } else if (containsAnyKeyword(text, ["일주일", "7일", "한 주", "168"])) {
        setValue("timeSinceMissingHours", 168);
      }

      if (containsAnyKeyword(text, ["미성년", "학생", "고등학생", "middle school", "child"])) {
        setValue("subjectAgeBracket", "minor");
      } else if (containsAnyKeyword(text, ["노인", "고령", "senior", "70대", "60대"])) {
        setValue("subjectAgeBracket", "senior");
      }

      if (containsAnyKeyword(text, ["차량", "자동차", "승용차", "캠핑카", "motorcycle"])) {
        setValue("hasPersonalVehicle", true);
      }

      if (containsAnyKeyword(text, ["sns", "계정", "비밀번호", "로그인", "카톡", "휴대폰 풀림"])) {
        setValue("digitalFootprintAccess", containsAnyKeyword(text, ["비밀번호 확보", "접근 가능", "로그인 됨"]) ? "full" : "partial");
      } else if (containsAnyKeyword(text, ["계정 접근 불가", "비밀번호 모름", "잠겨"])) {
        setValue("digitalFootprintAccess", "none");
      }

      if (containsAnyKeyword(text, ["숲", "산악", "계곡", "시골", "wilderness"])) {
        setValue("terrainComplexity", "wilderness");
      } else if (containsAnyKeyword(text, ["도심", "지하철", "빌딩"])) {
        setValue("terrainComplexity", "urban");
      }

      if (containsAnyKeyword(text, ["우울", "depress", "불안", "anxiety", "위기", "cry"])) {
        setValue("psychologicalState", "distressed");
      } else if (containsAnyKeyword(text, ["안정", "괜찮", "calm"])) {
        setValue("psychologicalState", "stable");
      }
      break;
    }
    case "insurance": {
      if (containsAnyKeyword(text, ["억", "고액", "억원", "tens of millions", "large"])) {
        setValue("claimValueBand", "50mPlus");
      } else if (containsAnyKeyword(text, ["수백", "몇백", "소액", "under"])) {
        setValue("claimValueBand", "under10m");
      }

      if (containsAnyKeyword(text, ["과거 청구", "반복", "여러 번", "이력", "재차"])) {
        setValue("priorClaimHistory", containsAnyKeyword(text, ["빈번", "지속", "여러 번"]) ? "frequent" : "sporadic");
      } else if (containsAnyKeyword(text, ["첫", "처음", "신규"])) {
        setValue("priorClaimHistory", "none");
      }

      if (containsAnyKeyword(text, ["복잡", "위조", "조작", "의사 공모", "전문의"])) {
        setValue("medicalValidationDifficulty", "high");
      } else if (containsAnyKeyword(text, ["명확", "명백", "간단", "명료"])) {
        setValue("medicalValidationDifficulty", "low");
      }

      if (containsAnyKeyword(text, ["협조", "지원", "협력", "동의"])) {
        setValue("insurerCooperationLevel", "supportive");
      } else if (containsAnyKeyword(text, ["비협조", "거부", "지연", "deny", "adversarial"])) {
        setValue("insurerCooperationLevel", "adversarial");
      }

      if (containsAnyKeyword(text, ["계좌", "거래", "송금", "가상", "코인", "온라인", "디지털"])) {
        setValue("digitalTransactionFlag", true);
      }

  if (containsAnyKeyword(text, ["민감", "눈치", "경계", "의심", "감시 의식", "감시를 의식"])) {
        setValue("surveillanceTolerance", "low");
      } else if (containsAnyKeyword(text, ["둔감", "무신경", "관심 없음"])) {
        setValue("surveillanceTolerance", "high");
      }

      if (containsAnyKeyword(text, ["생명보험", "life", "사망", "beneficiary"])) {
        setValue("policyType", "life");
      } else if (containsAnyKeyword(text, ["재산", "property", "화재", "car"])) {
        setValue("policyType", "property");
      } else if (containsAnyKeyword(text, ["상해", "사고", "accident"])) {
        setValue("policyType", "accident");
      }

      if (containsAnyKeyword(text, ["완벽", "자료 많", "철저", "exhaustive"])) {
        setValue("claimPreparationLevel", "exhaustive");
      } else if (containsAnyKeyword(text, ["엉성", "부족", "자료 없음", "improvise"])) {
        setValue("claimPreparationLevel", "minimal");
      }

      if (containsAnyKeyword(text, ["공동 청구", "co-applicant", "여러 명", "family 함께"])) {
        setValue("coApplicantCount", 3);
      } else if (containsAnyKeyword(text, ["단독", "single claimant"])) {
        setValue("coApplicantCount", 0);
      }

      if (containsAnyKeyword(text, ["변호사", "lawyer", "법무법인", "legal counsel"])) {
        setValue("hasLegalRepresentation", true);
      }

      if (containsAnyKeyword(text, ["tail", "감시 피함", "counter", "역추적", "감시 회피"])) {
        setValue("surveillanceCounterMeasures", containsAnyKeyword(text, ["공격", "능숙", "전문", "stealth"]) ? "aggressive" : "basic");
      } else if (containsAnyKeyword(text, ["전혀", "없음", "no counter"])) {
        setValue("surveillanceCounterMeasures", "none");
      }

      if (containsAnyKeyword(text, ["깨끗", "투명", "clean"])) {
        setValue("financialAuditTrail", "clean");
      } else if (containsAnyKeyword(text, ["의심", "suspicious", "차명", "분산", "cryptic"])) {
        setValue("financialAuditTrail", "suspicious");
      }
      break;
    }
  }

  return sanitizeScenarioVariables(category, result);
};

const runHeuristicAnalysis = (inputs: TwinInputs, rationale?: string): TwinAnalysisResult => {
  let score = 62;
  const keyFactors: string[] = [];
  const riskAlerts: string[] = [];
  const recommendedActions: string[] = [];
  const knowledgeBase: string[] = [
    "한국 민간조사 성공 사례 DB (2023) 기준 변수별 가중치 적용",
    "사설 탐정협회 필드 요원 운용 매뉴얼 7판",
    "LIRA 내부 추적 패턴 학습 모델 v2.4",
  ];

  // Scenario weightings
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
      riskAlerts.push("프리랜서는 일정 변동성 높아 동선 예측 난도 상승");
      score -= 5;
      break;
    case "service":
      score += 1;
      break;
    case "unknown":
      riskAlerts.push("피조사자 직업 불명: 사전 리서치 단계 추가 필요");
      score -= 6;
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

  if (inputs.specialNotes.trim().length > 0) {
    riskAlerts.push(`특이 사항 확인 필요: ${inputs.specialNotes.trim()}`);
  }

  const sanitizedVariables = sanitizeScenarioVariables(inputs.scenarioCategory, inputs.scenarioVariables);
  const accumulator = {
    score,
    keyFactors,
    riskAlerts,
    recommendedActions,
  } satisfies ScenarioHeuristicAccumulator;
  applyScenarioVariableHeuristics(inputs.scenarioCategory, sanitizedVariables, accumulator);
  score = accumulator.score;

  const successRate = clamp(Math.round(score), 8, 96);
  const confidenceLabel = successConfidence(successRate);

  if (keyFactors.length === 0) {
    keyFactors.push("기본 시뮬레이션 파라미터 기준 안정적으로 수행 가능");
  }
  if (riskAlerts.length === 0) {
    riskAlerts.push("주요 리스크 없음 – 표준 체크리스트 유지");
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push("사전 잠복 지점 마킹 및 통신 프로토콜 점검");
  }

  const timeline = [
    {
      phase: "디지털 트윈 환경 구성",
      detail: `${SCENARIO_LABELS[inputs.scenarioCategory]}을(를) 기준으로 가상 상황 레이어링`,
    },
    {
      phase: "동선 패턴 학습",
      detail: `${OCCUPATION_LABELS[inputs.targetOccupation]} 대상의 ${COMMUTE_LABELS[inputs.commutePattern]} 데이터를 재현`,
      emphasis: "GPS Ping & CDR 48시간 샘플링",
    },
    {
      phase: "현장 리스크 시뮬레이션",
      detail: `${WEATHER_LABELS[inputs.weather]} 날씨와 ${DENSITY_LABELS[inputs.locationDensity]} 환경 변수 조합 시험`,
    },
    {
      phase: "작전 리허설",
      detail: `${ESCORT_LABELS[inputs.escortSupport]} 구성으로 입출경 포인트 연속 검증`,
    },
  ];

  return {
    id: `heuristic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    successRate,
    confidenceLabel,
    keyFactors,
    riskAlerts,
    recommendedActions,
    timeline,
    knowledgeBase,
    rationale,
  };
};

export default function TwinSimulationPage() {
  const router = useRouter();
  const user = useHydratedUserStore((state) => state.user);
  const [inputs, setInputs] = useState<TwinInputs>(defaultInputs);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TwinAnalysisResult | null>(null);
  const [handoffContext, setHandoffContext] = useState<SimulationHandoffContext | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFallbackResult, setIsFallbackResult] = useState(false);
  const [recommendations, setRecommendations] = useState<InvestigatorRecommendation[]>([]);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const handoffSignatureRef = useRef<string | null>(null);

  const scenarioDefinitions = useMemo(
    () => SCENARIO_VARIABLE_DEFINITIONS[inputs.scenarioCategory] ?? [],
    [inputs.scenarioCategory],
  );
  const totalVariableCount = BASE_FIXED_VARIABLE_COUNT + scenarioDefinitions.length;

  const matchButtonLabel = useMemo(() => {
    if (!user) return "로그인 후 탐정고르기";
    if (user.role === "investigator") return "고객 계정에서 이용";
    return "탐정고르기";
  }, [user]);

  const isMatchDisabled = user?.role === "investigator";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const persisted = window.sessionStorage.getItem("simulation-handoff");
      if (persisted) {
        const parsed = JSON.parse(persisted) as SimulationHandoffContext;
        setHandoffContext(parsed);
      }
    } catch (error) {
      console.warn("[TWIN_HANDOFF_READ_ERROR]", error);
    }
  }, []);

  useEffect(() => {
    if (!handoffContext) return;

    const signature = JSON.stringify(handoffContext);
    if (handoffSignatureRef.current === signature) {
      return;
    }

    const summary = handoffContext.summary ?? null;
    const conversation = handoffContext.conversationSummary ?? null;
    const derivedCategory = deriveScenarioCategoryFromSummary(summary ?? undefined, conversation ?? undefined);
    const derivedVariables = buildScenarioVariablesFromContext(derivedCategory, summary ?? undefined, conversation ?? undefined);
    const sanitizedVariables = sanitizeScenarioVariables(derivedCategory, derivedVariables);
    const derivedNotes = deriveSpecialNotesFromSummary(summary);

    setInputs((prev) => ({
      ...prev,
      scenarioCategory: derivedCategory,
      scenarioVariables: sanitizedVariables,
      specialNotes: prev.specialNotes && prev.specialNotes.trim().length > 0 ? prev.specialNotes : derivedNotes,
    }));

    handoffSignatureRef.current = signature;
  }, [handoffContext]);

  const handoffSummary = useMemo(() => {
    if (!handoffContext) return null;
    const parts = [
      handoffContext.summary?.caseTitle,
      handoffContext.conversationSummary ?? handoffContext.summary?.objective,
    ].filter((value): value is string => Boolean(value && value.trim().length > 0));

    return parts.length > 0 ? parts.join(" · ") : null;
  }, [handoffContext]);

  const progressLabel = useMemo(() => {
    if (!isAnalyzing) {
      if (progress >= 100 && result) {
        return "분석 완료";
      }
      return "대기 중";
    }
    if (progress < 40) return "환경 변수 적용";
    if (progress < 75) return "패턴 학습 중";
    if (progress < 100) return "리허설 시뮬레이션";
    return "최종 리포트 정리";
  }, [isAnalyzing, progress, result]);

  useEffect(() => {
    const summary = handoffContext?.summary ?? null;
    if (!summary) {
      setRecommendations([]);
      setRecommendationsError(null);
      setIsRecommendationsLoading(false);
      return;
    }

    const baseKeywords = deriveKeywords(summary);
    const enrichedKeywords = baseKeywords.length > 0
      ? baseKeywords
      : [SCENARIO_LABELS[inputs.scenarioCategory]];

    const controller = new AbortController();

    const loadRecommendations = async () => {
      setIsRecommendationsLoading(true);
      setRecommendationsError(null);

      try {
        const response = await fetch("/api/simulation/investigator-recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords: enrichedKeywords,
            scenarioTitle: summary.caseTitle ?? null,
            intakeSummary: summary,
            scenarioCategory: inputs.scenarioCategory,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Recommendation request failed: ${response.status}`);
        }

        const data = await response.json();
        const listRaw = Array.isArray(data?.recommendations)
          ? (data.recommendations as InvestigatorRecommendation[])
          : [];
        const list = listRaw.map((item) => ({
          ...item,
          alignmentFactors: Array.isArray(item.alignmentFactors) ? item.alignmentFactors : [],
        }));
        setRecommendations(list);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[TWIN_RECOMMENDATIONS_ERROR]", error);
        setRecommendationsError("탐정 추천 정보를 불러오는 중 문제가 발생했습니다.");
        setRecommendations([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsRecommendationsLoading(false);
        }
      }
    };

    void loadRecommendations();

    return () => controller.abort();
  }, [handoffContext, inputs.scenarioCategory]);

  const formattedResultTimestamp = useMemo(() => {
    if (!result?.generatedAt) return null;
    const createdAt = new Date(result.generatedAt);
    if (Number.isNaN(createdAt.getTime())) return null;
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(createdAt);
  }, [result?.generatedAt]);

  function handleInputChange<K extends keyof TwinInputs>(key: K, value: TwinInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  const handleScenarioCategoryChange = (category: TwinScenarioCategory) => {
    setInputs((prev) => ({
      ...prev,
      scenarioCategory: category,
      scenarioVariables: createScenarioVariableDefaults(category),
    }));
  };

  const handleScenarioVariableChange = useCallback((id: string, value: ScenarioVariableValue) => {
    setInputs((prev) => ({
      ...prev,
      scenarioVariables: {
        ...prev.scenarioVariables,
        [id]: value,
      },
    }));
  }, []);

  const renderScenarioVariableField = useCallback(
    (definition: ScenarioVariableDefinition) => {
      const currentValue = inputs.scenarioVariables[definition.id] ?? definition.defaultValue;

      if (definition.type === "select") {
        return (
          <label key={definition.id} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-indigo-100">
            <div>
              <p className="font-semibold text-indigo-50">{definition.label}</p>
              <p className="mt-1 text-xs text-indigo-200/70">{definition.description}</p>
            </div>
            <select
              value={currentValue as string}
              onChange={(event) => handleScenarioVariableChange(definition.id, event.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
            >
              {(definition.options ?? []).map((option) => (
                <option key={`${definition.id}-${option.value}`} value={option.value} className="bg-slate-900 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        );
      }

      if (definition.type === "boolean") {
        const booleanValue = Boolean(currentValue);
        return (
          <div
            key={definition.id}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-indigo-100"
          >
            <div>
              <p className="font-semibold text-indigo-50">{definition.label}</p>
              <p className="mt-1 text-xs text-indigo-200/70">{definition.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleScenarioVariableChange(definition.id, true)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                  booleanValue ? "border-indigo-300 bg-indigo-500/20 text-white" : "border-white/10 bg-white/5 text-indigo-100/70"
                }`}
              >
                예
              </button>
              <button
                type="button"
                onClick={() => handleScenarioVariableChange(definition.id, false)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                  !booleanValue ? "border-indigo-300 bg-indigo-500/20 text-white" : "border-white/10 bg-white/5 text-indigo-100/70"
                }`}
              >
                아니오
              </button>
            </div>
          </div>
        );
      }

      const numericValue = Number(currentValue ?? definition.defaultValue ?? 0);
      return (
        <label key={definition.id} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-indigo-100">
          <div>
            <p className="font-semibold text-indigo-50">{definition.label}</p>
            <p className="mt-1 text-xs text-indigo-200/70">{definition.description}</p>
          </div>
          <input
            type="number"
            value={numericValue}
            min={definition.min}
            max={definition.max}
            step={definition.step ?? 1}
            onChange={(event) => handleScenarioVariableChange(definition.id, Number(event.target.value))}
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
          />
        </label>
      );
    },
    [handleScenarioVariableChange, inputs.scenarioVariables],
  );

  const handleMatchNow = useCallback(
    (recommendation: InvestigatorRecommendation) => {
      if (!recommendation) return;
      const investigatorId = recommendation.investigatorId ?? recommendation.id;
      router.push(`/investigators/${investigatorId}?source=twin`);
    },
    [router],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setResult(null);
    setErrorMessage(null);
    setIsFallbackResult(false);

    const start = Date.now();
    const maxDuration = 2600;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const tentative = clamp(Math.round((elapsed / maxDuration) * 95), 0, 95);
      setProgress((prev) => (prev >= 95 ? prev : tentative));
    }, 120);
    progressTimerRef.current = timer;

    const conversationSummary =
      handoffContext?.conversationSummary ?? handoffContext?.summary?.objective ?? null;
    const scenarioTitle = handoffContext?.summary?.caseTitle ?? null;
    const trimmedNotes = inputs.specialNotes.trim();
    const sanitizedVariables = sanitizeScenarioVariables(inputs.scenarioCategory, inputs.scenarioVariables);
    const normalizedInputs: TwinInputs = {
      ...inputs,
      specialNotes: trimmedNotes,
      scenarioVariables: sanitizedVariables,
    };

    const payload = {
      ...normalizedInputs,
      operationDate: normalizedInputs.operationDate ? normalizedInputs.operationDate : null,
      hasVehicle: Boolean(normalizedInputs.hasVehicle),
      specialNotes: trimmedNotes.length > 0 ? trimmedNotes : undefined,
      scenarioVariables: sanitizedVariables,
      conversationSummary,
      scenarioTitle,
    } satisfies Record<string, unknown>;

    try {
      const response = await fetch("/api/ai/twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let parsed: unknown = null;
      if (rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch (parseError) {
          console.warn("[TWIN_AI_PARSE_ERROR]", parseError);
        }
      }

      if (!response.ok) {
        const message =
          parsed && typeof parsed === "object" && parsed !== null && "error" in parsed &&
          typeof (parsed as { error: unknown }).error === "string"
            ? (parsed as { error: string }).error
            : `디지털 트윈 분석 요청이 거절되었습니다. (status ${response.status})`;
        throw new Error(message);
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error("AI 분석 결과 형식을 확인할 수 없습니다.");
      }

      if ("error" in parsed && typeof (parsed as { error?: unknown }).error === "string") {
        throw new Error((parsed as { error: string }).error);
      }

      const analysis = parsed as TwinAnalysisResult;
      setResult(analysis);
    } catch (error) {
      console.error("[TWIN_ANALYSIS_ERROR]", error);
      const fallback = runHeuristicAnalysis(
        normalizedInputs,
        "AI 분석이 실패하여 휴리스틱 분석 결과를 제공합니다."
      );
      setResult(fallback);
      setIsFallbackResult(true);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "AI 분석 중 예기치 않은 오류가 발생했습니다."
      );
    } finally {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgress(100);
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                <FiCompass className="h-3.5 w-3.5" /> Digital Twin Lab
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                현장 변수 기반 미행 성공도 시뮬레이션
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100 md:text-base md:leading-relaxed">
                고객이 입력한 사건 데이터를 고해상도 디지털 트윈으로 재구성해, 현장 투입 전 성공 확률과 리스크를 예측합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-indigo-100/80">
              <Link
                href="/simulation"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-white/30 hover:bg-white/20"
              >
                <FiArrowLeft className="h-4 w-4" /> 시뮬레이션 대화로 돌아가기
              </Link>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px]">
                수집 변수: {totalVariableCount}개
              </span>
            </div>
          </div>
          {handoffSummary ? (
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
              <FiMapPin className="mt-1 h-5 w-5" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
                  최신 상담 요약 연결됨
                </p>
                <p className="mt-1 text-indigo-100/90">{handoffSummary}</p>
              </div>
            </div>
          ) : null}
        </header>

        <main className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="space-y-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <header className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-indigo-100">현장 변수 입력</h2>
                <p className="mt-1 text-xs text-indigo-200/70">
                  추적 팀 구성, 환경 변수, 예산 제약 등 최대한 상세하게 입력할수록 시뮬레이션 정밀도가 높아집니다.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-indigo-100">
                <FiActivity className="h-3.5 w-3.5 animate-pulse" /> {progressLabel}
              </span>
            </header>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  작전 카테고리
                  <select
                    value={inputs.scenarioCategory}
                    onChange={(event) => handleScenarioCategoryChange(event.target.value as TwinScenarioCategory)}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
                  >
                    {Object.entries(SCENARIO_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-900 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  현장 요원 구성
                  <select
                    value={inputs.fieldAgentGender}
                    onChange={(event) => handleInputChange("fieldAgentGender", event.target.value as TwinInputs["fieldAgentGender"])}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
                  >
                    {Object.entries(FIELD_AGENT_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-900 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  작전 예정일
                  <input
                    type="date"
                    value={inputs.operationDate}
                    onChange={(event) => handleInputChange("operationDate", event.target.value)}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-indigo-200/40 focus:border-indigo-300 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  투입 차량 보유 여부
                  <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-3 py-2 text-sm">
                    <button
                      type="button"
                      onClick={() => handleInputChange("hasVehicle", true)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${inputs.hasVehicle ? "border-indigo-300 bg-indigo-500/20 text-white" : "border-white/10 bg-white/5 text-indigo-100/70"}`}
                    >
                      있음
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange("hasVehicle", false)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${!inputs.hasVehicle ? "border-indigo-300 bg-indigo-500/20 text-white" : "border-white/10 bg-white/5 text-indigo-100/70"}`}
                    >
                      없음
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  근무 시간 패턴
                  <select
                    value={inputs.shiftType}
                    onChange={(event) => handleInputChange("shiftType", event.target.value as TwinInputs["shiftType"])}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
                  >
                    {Object.entries(SHIFT_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-900 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  피조사자 직종
                  <select
                    value={inputs.targetOccupation}
                    onChange={(event) => handleInputChange("targetOccupation", event.target.value as TwinInputs["targetOccupation"])}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
                  >
                    {Object.entries(OCCUPATION_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-900 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  동선 패턴
                  <select
                    value={inputs.commutePattern}
                    onChange={(event) => handleInputChange("commutePattern", event.target.value as TwinInputs["commutePattern"])}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
                  >
                    {Object.entries(COMMUTE_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-900 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  예상 기상
                  <select
                    value={inputs.weather}
                    onChange={(event) => handleInputChange("weather", event.target.value as TwinInputs["weather"])}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
                  >
                    {Object.entries(WEATHER_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-900 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  작전 지역 밀도
                  <select
                    value={inputs.locationDensity}
                    onChange={(event) => handleInputChange("locationDensity", event.target.value as TwinInputs["locationDensity"])}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
                  >
                    {Object.entries(DENSITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-900 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  현장 투입 형태
                  <select
                    value={inputs.escortSupport}
                    onChange={(event) => handleInputChange("escortSupport", event.target.value as TwinInputs["escortSupport"])}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
                  >
                    {Object.entries(ESCORT_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-900 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-indigo-100">
                  예산 여력
                  <select
                    value={inputs.budgetLevel}
                    onChange={(event) => handleInputChange("budgetLevel", event.target.value as TwinInputs["budgetLevel"])}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-indigo-300 focus:outline-none"
                  >
                    {Object.entries(BUDGET_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-900 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm text-indigo-100">
                특이 사항/제약
                <textarea
                  rows={4}
                  value={inputs.specialNotes}
                  onChange={(event) => handleInputChange("specialNotes", event.target.value)}
                  placeholder="예) 대상이 새벽 2시에 귀가, 동행인이 자주 바뀜, 경찰 신고 이력 있음 등"
                  className="rounded-2xl border border-white/20 bg-white/10 px-3 py-3 text-sm text-white placeholder:text-indigo-200/40 focus:border-indigo-300 focus:outline-none"
                />
              </label>
              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-indigo-50">
                      {SCENARIO_LABELS[inputs.scenarioCategory]} 전용 변수
                    </p>
                    <p className="text-xs text-indigo-200/70">
                      {scenarioDefinitions.length > 0
                        ? "사건 유형별로 정교하게 튜닝된 변수입니다."
                        : "선택한 카테고리에 가변 변수가 없습니다."}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-indigo-100/90">
                    {scenarioDefinitions.length}개 세부 변수
                  </span>
                </div>
                {scenarioDefinitions.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {scenarioDefinitions.map((definition) => renderScenarioVariableField(definition))}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-indigo-200/80">
                  * 입력값은 세션 종료 시 자동 삭제되며, 분석 결과는 탐정 승인 계정에서만 저장됩니다.
                </p>
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-700/60"
                >
                  <FiPlay className="h-4 w-4" />
                  {isAnalyzing ? "분석 중..." : "디지털 트윈 분석 실행"}
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-indigo-100">시뮬레이션 결과</h2>
              {result ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-300/50 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    {result.confidenceLabel} 신뢰도
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      isFallbackResult
                        ? "border-amber-300/60 bg-amber-400/10 text-amber-100"
                        : "border-sky-300/60 bg-sky-400/10 text-sky-100"
                    }`}
                  >
                    {isFallbackResult ? "휴리스틱 예측" : "AI 생성"}
                  </span>
                </div>
              ) : null}
            </header>
            {result && formattedResultTimestamp ? (
              <p className="text-[11px] text-indigo-200/70">생성 시각: {formattedResultTimestamp}</p>
            ) : null}
            {errorMessage ? (
              <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                {errorMessage}
              </div>
            ) : null}
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/15 bg-slate-950/40 p-6 text-indigo-100">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-300/80">Success Projection</p>
                <div className="mt-4 flex flex-wrap items-center gap-6">
                  <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-indigo-400/60 bg-indigo-500/10 text-3xl font-bold">
                    {result ? `${result.successRate}%` : "--%"}
                    <div className="absolute inset-2 rounded-full border border-indigo-200/30" />
                  </div>
                  <div className="flex-1 space-y-2 text-sm text-indigo-100/90">
                    <p>
                      {result
                        ? `${SCENARIO_LABELS[inputs.scenarioCategory]} 기준으로 평가된 예상 성공률입니다.`
                        : "분석을 실행하면 시뮬레이션 성공률과 주요 근거가 표시됩니다."}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-indigo-200/70">
                      <FiTrendingUp className="h-4 w-4" />
                      {progressLabel}
                    </p>
                    {isAnalyzing ? (
                      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-indigo-400 via-indigo-300 to-indigo-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/15 bg-slate-950/40 p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
                  <FiCheckCircle className="h-4 w-4 text-emerald-300" /> 주요 성공 요인
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-indigo-100/90">
                  {(result?.keyFactors ?? ["상단 폼을 채운 뒤 분석을 실행하세요."]).map((factor, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-white/15 bg-slate-950/40 p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                  <FiAlertTriangle className="h-4 w-4" /> 감시 리스크 및 주의 사항
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-amber-100/90">
                  {(result?.riskAlerts ?? ["분석 전 리스크 알림이 없습니다."]).map((risk, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-300" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-white/15 bg-slate-950/40 p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
                  작전 리허설 타임라인
                </h3>
                <ul className="mt-3 space-y-3 text-sm text-indigo-100/90">
                  {(result?.timeline ?? [
                    { phase: "준비 중", detail: "분석을 실행하면 단계별 시나리오가 표시됩니다." },
                  ]).map((item, index) => (
                    <li key={index} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-indigo-300/80">{item.phase}</p>
                      <p className="mt-1 text-sm">{item.detail}</p>
                      {item.emphasis ? (
                        <p className="mt-1 text-xs text-indigo-200/80">핵심 장비: {item.emphasis}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-white/15 bg-slate-950/40 p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
                  권장 액션 계획
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-indigo-100/90">
                  {(result?.recommendedActions ?? [
                    "분석을 실행하면 권장 액션과 준비 체크리스트가 제안됩니다.",
                  ]).map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {result?.rationale ? (
                <div className="rounded-3xl border border-white/15 bg-slate-950/40 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
                    분석 근거 메모
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-indigo-100/90">{result.rationale}</p>
                </div>
              ) : null}

              <div className="rounded-3xl border border-white/15 bg-slate-950/40 p-5 text-xs text-indigo-200/80">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
                  참고 근거
                </h3>
                <ul className="mt-2 space-y-1">
                  {(result?.knowledgeBase ?? [
                    "분석 결과는 LIRA 디지털 트윈 기준 모델을 따릅니다.",
                  ]).map((reference, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-200/60" />
                      <span>{reference}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* InvestigatorRecommendationsCard removed as per user request */}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
