import { randomUUID } from "crypto";
import type { AiComplianceIssue, AiComplianceMetric, AiComplianceReport, ComplianceCategory, RiskSeverity } from "./types";

export interface ComplianceContentSegment {
  id: string;
  label: string;
  text: string;
  source: string;
}

export interface ComplianceAnalysisInput {
  segments: ComplianceContentSegment[];
  jurisdictionHints?: string[];
}

interface DetectionRule {
  id: string;
  pattern: RegExp;
  category: ComplianceCategory;
  severity: RiskSeverity;
  guidance: string;
  regulationReferences: string[];
}

const PII_PATTERNS: DetectionRule[] = [
  {
    id: "pii-phone",
    pattern: /\b\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g,
    category: "privacy",
    severity: "high",
    guidance: "전화번호는 마스킹하거나 별도 보안 경로로 전달하세요.",
    regulationReferences: ["PIPA", "GDPR"],
  },
  {
    id: "pii-rrn",
    pattern: /\b\d{6}-\d{7}\b/g,
    category: "privacy",
    severity: "high",
    guidance: "주민등록번호는 수집/저장 금지 대상입니다. 즉시 삭제하고 대체 식별자를 사용하세요.",
    regulationReferences: ["PIPA"],
  },
  {
    id: "pii-account",
    pattern: /(계좌번호|card\s?number|bank\s?account)[^\n]{0,40}\d{6,}/gi,
    category: "privacy",
    severity: "medium",
    guidance: "금융 정보는 암호화 저장 및 접근권한 통제를 적용해야 합니다.",
    regulationReferences: ["PCI DSS"],
  },
];

const SAFETY_PATTERNS: DetectionRule[] = [
  {
    id: "harm-threat",
    pattern: /(살해|폭탄|테러|폭력|협박|자살)/g,
    category: "safety",
    severity: "high",
    guidance: "즉시 관리자에게 알리고, 필요 시 공공 안전 기관에 신고하도록 안내하세요.",
    regulationReferences: ["Platform Safety Guideline"],
  },
];

const LEGAL_PATTERNS: DetectionRule[] = [
  {
    id: "illegal-request",
    pattern: /(불법|위법|탈세|뇌물|자료\s?삭제\s?요청)/g,
    category: "legal",
    severity: "medium",
    guidance: "법률 위반 가능성이 있는 요청입니다. 법무 검토와 보고 절차를 따르세요.",
    regulationReferences: ["KCC Compliance"],
  },
];

const BIAS_PATTERNS: DetectionRule[] = [
  {
    id: "bias-gender",
    pattern: /(여자(?:는|들)?|남자(?:는|들)?)[^\n]{0,20}(못해|열등|부적합)/g,
    category: "bias",
    severity: "medium",
    guidance: "성별에 대한 차별 표현을 제거하고 중립적 표현으로 교체하세요.",
    regulationReferences: ["DEI Policy"],
  },
  {
    id: "bias-race",
    pattern: /(흑인|백인|아시아인|외국인)[^\n]{0,20}(위험|의심|불량)/g,
    category: "bias",
    severity: "high",
    guidance: "인종/출신 기반의 편향 표현입니다. 즉시 수정하고 검토 로그를 남기세요.",
    regulationReferences: ["DEI Policy", "UN SDG 10"],
  },
];

const POLICY_PATTERNS: DetectionRule[] = [
  {
    id: "policy-legal-advice",
    pattern: /(법률\s?자문|법적\s?책임|법률\s?확약)/g,
    category: "policy",
    severity: "low",
    guidance: "법률 조언으로 오해될 표현은 면책 문구와 함께 제공하세요.",
    regulationReferences: ["Terms of Service"],
  },
];

const ALL_RULES: DetectionRule[] = [
  ...PII_PATTERNS,
  ...SAFETY_PATTERNS,
  ...LEGAL_PATTERNS,
  ...BIAS_PATTERNS,
  ...POLICY_PATTERNS,
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function buildMetric(id: string, label: string, score: number, threshold: number, detail: string): AiComplianceMetric {
  return {
    id,
    label,
    score: clamp(Number(score.toFixed(2)), 0, 100),
    threshold,
    detail,
  } satisfies AiComplianceMetric;
}

function severityWeight(severity: RiskSeverity): number {
  switch (severity) {
    case "high":
      return 1;
    case "medium":
      return 0.6;
    case "low":
    default:
      return 0.35;
  }
}

function aggregateIssues(issues: AiComplianceIssue[]): RiskSeverity {
  if (!issues.length) return "low";
  const maxWeight = Math.max(...issues.map((issue) => severityWeight(issue.severity)));
  if (maxWeight >= 0.9) return "high";
  if (maxWeight >= 0.55) return "medium";
  return "low";
}

export function analyzeCompliance(input: ComplianceAnalysisInput): AiComplianceReport {
  const segments = input.segments ?? [];
  const issues: AiComplianceIssue[] = [];
  let privacyHit = 0;
  let safetyHit = 0;
  let legalHit = 0;
  let biasHit = 0;
  let policyHit = 0;

  segments.forEach((segment) => {
    if (!segment?.text?.trim()) return;
    ALL_RULES.forEach((rule) => {
      rule.pattern.lastIndex = 0;
      const matches = segment.text.match(rule.pattern);
      if (!matches) return;
      matches.slice(0, 6).forEach((match) => {
        const normalized = match.trim();
        issues.push({
          id: `${rule.id}-${segment.id}-${issues.length + 1}`,
          category: rule.category,
          severity: rule.severity,
          snippet: normalized.length > 140 ? `${normalized.slice(0, 140)}…` : normalized,
          guidance: rule.guidance,
          regulationReferences: rule.regulationReferences,
          source: segment.label,
        });
        switch (rule.category) {
          case "privacy":
            privacyHit += severityWeight(rule.severity);
            break;
          case "safety":
            safetyHit += severityWeight(rule.severity);
            break;
          case "legal":
            legalHit += severityWeight(rule.severity);
            break;
          case "bias":
            biasHit += severityWeight(rule.severity);
            break;
          case "policy":
            policyHit += severityWeight(rule.severity);
            break;
          default:
            break;
        }
      });
    });
  });

  const totalSegments = segments.length;
  const cleanSegments = segments.filter((segment) => !issues.some((issue) => issue.source === segment.label)).length;

  const metrics: AiComplianceMetric[] = [
    buildMetric(
      "privacy-score",
      "개인정보 노출 위험",
      100 - clamp(privacyHit * 28, 0, 90),
      70,
      privacyHit > 0 ? "민감 정보가 포함되어 있습니다. 마스킹 및 접근 통제 필요." : "위험 징후 없음",
    ),
    buildMetric(
      "safety-score",
      "안전/폭력 위험",
      100 - clamp(safetyHit * 35, 0, 90),
      65,
      safetyHit > 0 ? "위험 발언이 감지되었습니다. 신고 및 플랜 점검 필요." : "위험 징후 없음",
    ),
    buildMetric(
      "legal-score",
      "법률/정책 영향",
      100 - clamp(legalHit * 26, 0, 80),
      60,
      legalHit > 0 ? "법률 위반 가능성이 있으므로 법무 검토를 진행하세요." : "위험 징후 없음",
    ),
    buildMetric(
      "bias-score",
      "편향 표현 리스크",
      100 - clamp(biasHit * 32, 0, 85),
      75,
      biasHit > 0 ? "차별적 표현이 감지되었습니다. 교육 자료와 가이드라인을 적용하세요." : "위험 징후 없음",
    ),
    buildMetric(
      "policy-score",
      "플랫폼 정책 적합도",
      100 - clamp(policyHit * 20, 0, 70),
      70,
      policyHit > 0 ? "정책 위반 가능성이 있는 표현입니다. 면책 문구 또는 대체 표현 필요." : "위험 징후 없음",
    ),
  ];

  const report: AiComplianceReport = {
    id: randomUUID(),
    generatedAt: new Date().toISOString(),
    overallSeverity: aggregateIssues(issues),
    flaggedIssues: issues.slice(0, 40),
    metrics,
    cleanSegments,
    totalSegments,
    summary:
      issues.length > 0
        ? `${issues.length}건의 잠재 규제 위반 징후가 발견되었습니다. 우선순위에 따라 조치하세요.`
        : "규제 위반 신호가 발견되지 않았습니다.",
  };

  return report;
}

export function toComplianceSegments(params: {
  conversationSummary?: string | null;
  reportMarkdown?: string | null;
  realtimeSummary?: string | null;
  negotiationPlan?: string | null;
  additionalNotes?: Array<{ label: string; text: string }>;
}): ComplianceContentSegment[] {
  const segments: ComplianceContentSegment[] = [];

  const pushSegment = (label: string, text: string | null | undefined) => {
    if (!text) return;
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return;
    segments.push({
      id: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${segments.length + 1}`,
      label,
      text: normalized,
      source: label,
    });
  };

  pushSegment("Conversation Summary", params.conversationSummary ?? null);
  pushSegment("Real-time Insights", params.realtimeSummary ?? null);
  pushSegment("Report Draft", params.reportMarkdown ?? null);
  pushSegment("Negotiation Plan", params.negotiationPlan ?? null);

  (params.additionalNotes ?? []).forEach((note, index) => {
    pushSegment(note.label ?? `Additional-${index + 1}`, note.text ?? "");
  });

  return segments.slice(0, 30);
}
