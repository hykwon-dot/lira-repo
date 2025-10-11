import type { AiEvidenceSummary, EvidenceArtifactInput, EvidenceArtifactType, RiskSeverity } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const TYPE_CLASSIFICATIONS: Record<EvidenceArtifactType, string> = {
  document: "문서 증거",
  image: "이미지 증거",
  video: "영상 증거",
  audio: "음성 기록",
  other: "기타 자료",
};

const KEYWORD_RISK_HINTS: Array<{
  pattern: RegExp;
  risk: RiskSeverity;
  note: string;
}> = [
  { pattern: /계약|합의|약정|법적|소송/, risk: "high", note: "법적 분쟁 관련 내용" },
  { pattern: /폭행|협박|위협|위험|긴급/, risk: "high", note: "신변 위협 요소" },
  { pattern: /거래|송금|입금|출금|금액|현금/, risk: "medium", note: "금전 거래 내역" },
  { pattern: /메신저|카카오톡|통화|녹취|대화/, risk: "medium", note: "대화 기록" },
  { pattern: /사진|영상|이미지|촬영/, risk: "medium", note: "시각 증거자료" },
];

interface ArtifactScore {
  score: number;
  riskLevel: RiskSeverity;
  notes: string[];
}

function evaluateArtifact(artifact: EvidenceArtifactInput): ArtifactScore {
  const text = [artifact.title, artifact.description, ...(artifact.keywords ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  const notes = new Set<string>();
  let riskLevel: RiskSeverity = "low";

  KEYWORD_RISK_HINTS.forEach(({ pattern, risk, note }) => {
    if (pattern.test(text)) {
      score += risk === "high" ? 35 : 20;
      if (risk === "high" && riskLevel !== "high") {
        riskLevel = "high";
      }
      if (risk === "medium" && riskLevel === "low") {
        riskLevel = "medium";
      }
      notes.add(note);
    }
  });

  if (artifact.hasFile) {
    score += 10;
  }

  if (artifact.type === "image" || artifact.type === "video") {
    score += 15;
  }

  score = clamp(score, 5, 95);

  return {
    score,
    riskLevel,
    notes: Array.from(notes),
  };
}

function buildKeyFindings(artifact: EvidenceArtifactInput, evaluation: ArtifactScore): string[] {
  const findings: string[] = [];

  if (evaluation.notes.length) {
    findings.push(...evaluation.notes);
  }

  if (artifact.description) {
    findings.push(`요약: ${artifact.description.slice(0, 140)}`);
  }

  if (artifact.keywords?.length) {
    findings.push(`키워드: ${artifact.keywords.join(", ")}`);
  }

  return findings.slice(0, 3);
}

function buildRecommendedActions(artifact: EvidenceArtifactInput, evaluation: ArtifactScore): string[] {
  const actions: string[] = [];

  if (evaluation.riskLevel === "high") {
    actions.push("즉시 법률 검토와 보호 조치를 병행하세요.");
  } else if (evaluation.riskLevel === "medium") {
    actions.push("증거 무결성 확보와 백업을 진행하세요.");
  } else {
    actions.push("필요 시 추가 맥락과 보조 자료를 확보하세요.");
  }

  if (artifact.type === "image" || artifact.type === "video") {
    actions.push("원본 해상도를 보존하고 메타데이터를 기록해 두세요.");
  }

  if (artifact.type === "audio") {
    actions.push("정확한 녹취록 작성과 시간대 표기를 권장합니다.");
  }

  return actions.slice(0, 3);
}

export function summarizeEvidenceArtifacts(artifacts: EvidenceArtifactInput[]): AiEvidenceSummary[] {
  if (!artifacts.length) {
    return [];
  }

  return artifacts.map((artifact, index) => {
    const evaluation = evaluateArtifact(artifact);
    const keyFindings = buildKeyFindings(artifact, evaluation);
    const recommendedActions = buildRecommendedActions(artifact, evaluation);

    return {
      id: artifact.id || `artifact-${index}`,
      title: artifact.title,
      classification: TYPE_CLASSIFICATIONS[artifact.type] ?? "증거 자료",
      confidence: evaluation.score / 100,
      riskLevel: evaluation.riskLevel,
      keyFindings,
      recommendedActions,
    } satisfies AiEvidenceSummary;
  });
}
