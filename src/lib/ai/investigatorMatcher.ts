import type { IntakeSummary } from "@/app/simulation/types";
import type { AiRealtimeInsights } from "./types";

export interface InvestigatorProfileForMatch {
  id: number;
  ratingAverage: number | null;
  successRate: number | null;
  experienceYears: number;
  serviceArea: string | null;
  specialties: string[];
  user: {
    id: number;
    name: string | null;
    email: string | null;
  } | null;
}

export interface InvestigatorMatchContext {
  keywords: string[];
  scenarioTitle?: string;
  intakeSummary?: IntakeSummary | null;
  insights?: AiRealtimeInsights | null;
}

export interface InvestigatorMatchResult {
  id: number;
  investigatorId: number;
  userId: number | null;
  name: string;
  email: string | null;
  rating: number | null;
  successRate: number | null;
  experienceYears: number;
  serviceArea: string | null;
  specialties: string[];
  reason: string;
  alignmentFactors: string[];
  matchScore: number;
  successProbability: number;
  confidence: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeTokens = (tokens: string[]) =>
  Array.from(
    new Set(
      tokens
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length > 0),
    ),
  );

const deriveCaseKeywords = (context: InvestigatorMatchContext): string[] => {
  const bucket: string[] = [];
  const push = (value?: string | null) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    bucket.push(trimmed);
    trimmed
      .split(/[,\s/·]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 1)
      .forEach((item) => bucket.push(item));
  };

  const summary = context.intakeSummary ?? null;
  if (summary) {
    push(summary.caseTitle);
    push(summary.caseType);
    push(summary.primaryIntent);
    push(summary.objective);
    push(summary.urgency);
    summary.keyFacts?.forEach(push);
    summary.recommendedDocuments?.forEach(push);
  }

  const scenarioTitle = context.scenarioTitle;
  if (scenarioTitle) {
    push(scenarioTitle);
  }

  bucket.push(...context.keywords);

  return normalizeTokens(bucket).slice(0, 24);
};

const RISK_KEYWORD_HINTS: Record<string, string[]> = {
  "violence-threat": ["폭력", "보호", "위협", "안전", "스토킹"],
  "evidence-loss": ["증거", "포렌식", "백업", "디지털"],
  "legal-deadline": ["법", "기한", "소송", "법률"],
  "emotional-distress": ["상담", "케어", "심리", "감정"],
  "digital-trace": ["디지털", "IT", "포렌식", "로그"],
};

const deriveRiskKeywords = (insights: AiRealtimeInsights | null | undefined): string[] => {
  if (!insights?.signals?.length) return [];
  const tokens: string[] = [];
  insights.signals.forEach((signal) => {
    tokens.push(signal.title);
    signal.title
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1)
      .forEach((token) => tokens.push(token));
    const hints = RISK_KEYWORD_HINTS[signal.id];
    if (hints) {
      tokens.push(...hints);
    }
  });
  return normalizeTokens(tokens).slice(0, 16);
};

const severityWeight = (severity: AiRealtimeInsights["overallRisk"]) => {
  if (severity === "high") return 1.15;
  if (severity === "medium") return 1.05;
  return 0.95;
};

const presenceScore = (values: Array<string | null | number | undefined>): number => {
  const present = values.filter((value) => {
    if (typeof value === "number") {
      return Number.isFinite(value) && value !== 0;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return Boolean(value);
  }).length;
  return present / Math.max(1, values.length);
};

const computeAlignment = (profile: InvestigatorProfileForMatch, context: InvestigatorMatchContext) => {
  const keywords = deriveCaseKeywords(context);
  const riskKeywords = deriveRiskKeywords(context.insights);
  const normalizedSpecialties = normalizeTokens(profile.specialties);

  const matchableTokens = [...keywords, ...riskKeywords];
  const matchedTokens = new Set<string>();

  matchableTokens.forEach((token) => {
    if (normalizedSpecialties.some((spec) => spec.includes(token))) {
      matchedTokens.add(token);
    }
  });

  const keywordMatchScore = clamp(matchedTokens.size * 8, 0, 60);
  const ratingScore = profile.ratingAverage ? clamp(profile.ratingAverage, 0, 5) * 8 : 0;
  const successScore = profile.successRate ? clamp(profile.successRate, 0, 100) * 0.45 : 0;
  const experienceScore = clamp(profile.experienceYears, 0, 30) * 2.2;

  const overallRisk = context.insights?.overallRisk ?? "medium";
  const riskWeight = severityWeight(overallRisk);

  const baseScore = ratingScore + successScore + experienceScore + keywordMatchScore;
  const adjustedScore = clamp(baseScore * riskWeight, 20, 100);

  const keywordHighlight = matchedTokens.size
    ? `전문 분야가 사건 키워드 ${Array.from(matchedTokens)
        .slice(0, 3)
        .map((token) => `"${token}"`)
        .join(", ")}${matchedTokens.size > 3 ? " 등" : ""}과(와) 일치`
    : null;

  const alignmentFactors = [
    keywordHighlight,
    profile.ratingAverage ? `평균 평점 ${profile.ratingAverage.toFixed(1)}점` : null,
    profile.successRate ? `사건 성공률 ${profile.successRate.toFixed(1)}%` : null,
    profile.experienceYears > 0 ? `${profile.experienceYears}년 현장 경험` : null,
    profile.serviceArea ? `${profile.serviceArea} 지역 대응 가능` : null,
  ].filter((entry): entry is string => Boolean(entry));

  const confidence = clamp(
    0.45 + presenceScore([
      profile.ratingAverage,
      profile.successRate,
      profile.specialties.length > 0 ? "specialty" : null,
      profile.experienceYears,
    ]) * 0.45,
    0.55,
    0.95,
  );

  const normalizedRating = profile.ratingAverage ? profile.ratingAverage / 5 : 0.55;
  const normalizedSuccess = profile.successRate ? profile.successRate / 100 : 0.6;
  const normalizedExperience = clamp(profile.experienceYears / 12, 0, 1);
  const normalizedKeyword = clamp(matchedTokens.size / Math.max(3, matchableTokens.length || 1), 0, 1);

  const successProbability = clamp(
    (0.32 * normalizedRating +
      0.28 * normalizedSuccess +
      0.22 * normalizedExperience +
      0.18 * normalizedKeyword) *
      riskWeight,
    0.35,
    0.96,
  );

  const fitSummary = keywordHighlight
    ? `${keywordHighlight.replace(/"/g, "")}. ${profile.experienceYears}년 경력과 ${
        profile.successRate ? `${profile.successRate.toFixed(0)}% 성공률` : "축적된 해결 사례"
      }가 강점입니다.`
    : `${profile.experienceYears}년 경력과 ${profile.successRate ? `${profile.successRate.toFixed(0)}% 성공률` : "전문 분야"}이(가) 사건에 적합합니다.`;

  return {
    matchScore: Math.round(adjustedScore),
    successProbability,
    alignmentFactors,
    confidence,
    fitSummary,
    matchedTokens: Array.from(matchedTokens),
  };
};

export function scoreInvestigators(
  profiles: InvestigatorProfileForMatch[],
  context: InvestigatorMatchContext,
): InvestigatorMatchResult[] {
  const sorted = profiles
    .map((profile) => {
      const {
        matchScore,
        successProbability,
        alignmentFactors,
        confidence,
        fitSummary,
      } = computeAlignment(profile, context);

      return {
        id: profile.id,
        investigatorId: profile.id,
        userId: profile.user?.id ?? null,
        name: profile.user?.name ?? "이름 미상",
        email: profile.user?.email ?? null,
        rating: profile.ratingAverage,
        successRate: profile.successRate,
        experienceYears: profile.experienceYears,
        serviceArea: profile.serviceArea,
        specialties: profile.specialties,
        reason: fitSummary,
        alignmentFactors,
        matchScore,
        successProbability,
        confidence,
      } satisfies InvestigatorMatchResult;
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  return sorted.map((entry, index) => ({
    ...entry,
    matchScore: clamp(entry.matchScore + Math.max(0, 6 - index * 2), 25, 100),
    successProbability: clamp(entry.successProbability, 0.35, 0.97),
  }));
}
