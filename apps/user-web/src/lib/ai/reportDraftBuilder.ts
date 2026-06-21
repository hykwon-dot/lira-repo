import type { IntakeSummary } from "@/app/simulation/types";
import type {
  AiEvidenceSummary,
  AiInvestigationReportDraft,
  AiRealtimeInsights,
  RiskSeverity,
} from "./types";

interface ReportDraftInput {
  intakeSummary?: IntakeSummary | null;
  conversationSummary?: string | null;
  insights?: AiRealtimeInsights | null;
  evidenceSummaries?: AiEvidenceSummary[];
  transcript?: Array<{ role: "user" | "assistant"; content: string }>;
}

const severityLabel: Record<RiskSeverity, string> = {
  high: "긴급",
  medium: "주의",
  low: "관찰",
};

const formatEtaLabel = (etaDays: number | null, status: string) => {
  if (status === "completed") return "완료";
  if (etaDays === null || Number.isNaN(etaDays)) return "일정 검토";
  if (etaDays <= 0) return "오늘 중";
  return `${etaDays}일 내`;
};

const sanitizeText = (value: string | null | undefined) =>
  value ? value.replace(/\s+/g, " ").trim() : "";

const pickTop = <T>(list: T[], limit: number) => list.slice(0, Math.max(0, limit));

const createReportId = () => `report-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const buildKeyInsights = (input: ReportDraftInput) => {
  const { intakeSummary, insights, evidenceSummaries } = input;
  const insightsBucket: string[] = [];

  const caseTitle = sanitizeText(intakeSummary?.caseTitle);
  const objective = sanitizeText(intakeSummary?.objective);
  const urgency = sanitizeText(intakeSummary?.urgency);
  const caseType = sanitizeText(intakeSummary?.caseType);

  if (caseTitle) {
    insightsBucket.push(`사건명: ${caseTitle}`);
  }
  if (objective) {
    insightsBucket.push(`의뢰 목표: ${objective}`);
  }
  if (caseType) {
    insightsBucket.push(`사건 유형: ${caseType}`);
  }
  if (urgency) {
    insightsBucket.push(`긴급도: ${urgency}`);
  }
  if (insights?.overallRisk) {
    insightsBucket.push(`AI 평가 위험도: ${
      insights.overallRisk === "high" ? "높음" : insights.overallRisk === "medium" ? "중간" : "낮음"
    } (${Math.round(insights.riskScore)}점)`);
  }
  if (insights?.alerts?.length) {
    insightsBucket.push(`트렌드 경보 ${insights.alerts.length}건 감지`);
  }
  if (insights?.flowSimulation) {
    insightsBucket.push(`예상 조사 기간: ${insights.flowSimulation.totalDurationDays}일`);
  }
  if ((intakeSummary?.recommendedDocuments?.length ?? 0) > 0) {
    insightsBucket.push(`필수 자료: ${pickTop(intakeSummary!.recommendedDocuments, 3).join(", ")}`);
  }
  if ((intakeSummary?.keyFacts?.length ?? 0) > 0) {
    insightsBucket.push(`핵심 사실 ${intakeSummary!.keyFacts.length}건 정리됨`);
  }
  if ((evidenceSummaries?.length ?? 0) > 0) {
    const highestRisk = [...(evidenceSummaries ?? [])].sort((a, b) => {
      const severityWeight = (severity: RiskSeverity) =>
        severity === "high" ? 3 : severity === "medium" ? 2 : 1;
      return severityWeight(b.riskLevel) - severityWeight(a.riskLevel);
    })[0];
    if (highestRisk) {
      insightsBucket.push(`중요 증거: ${highestRisk.title} (${highestRisk.riskLevel.toUpperCase()})`);
    }
  }

  return pickTop(Array.from(new Set(insightsBucket)), 8);
};

const buildRiskHighlights = (insights: AiRealtimeInsights | null | undefined) => {
  if (!insights?.signals?.length) return [];
  return pickTop(insights.signals, 5).map((signal) => ({
    title: signal.title,
    severity: signal.severity,
    detail: `신뢰도 ${(signal.confidence * 100).toFixed(0)}% · 근거: ${signal.evidence}`,
    recommendation: signal.guidance,
  }));
};

const buildActionItems = (insights: AiRealtimeInsights | null | undefined) => {
  if (!insights) return [];
  const planItems = insights.actionPlan?.items ?? [];
  const nextActions = insights.nextActions ?? [];

  const formattedPlan = planItems.map((item) => {
    const owner = item.ownerHint ? ` · 담당 ${item.ownerHint}` : "";
    const dueLabel = item.dueInHours ? ` (~${item.dueInHours}시간)` : "";
    return `${item.label}${owner}${dueLabel}: ${item.description}`;
  });

  const formattedNext = nextActions.map((action) => {
    const priority = severityLabel[action.priority] ?? "일반";
    return `[${priority}] ${action.label} - ${action.description}`;
  });

  const combined = [...formattedPlan, ...formattedNext];
  return pickTop(Array.from(new Set(combined)), 10);
};

const buildTimelineEntries = (insights: AiRealtimeInsights | null | undefined) => {
  if (!insights?.timeline?.length) return [];
  return insights.timeline.map((entry) => ({
    phase: entry.label,
    status: entry.status === "completed" ? "완료" : entry.status === "in-progress" ? "진행 중" : "대기",
    etaLabel: formatEtaLabel(entry.etaDays, entry.status),
    note: entry.rationale,
  }));
};

const buildEvidenceHighlights = (summaries: AiEvidenceSummary[] | undefined) => {
  if (!summaries?.length) return [];
  return pickTop(summaries, 6).map((summary) => ({
    title: summary.title,
    classification: summary.classification,
    riskLevel: summary.riskLevel,
    keyFinding: summary.keyFindings[0] ?? summary.recommendedActions[0] ?? "핵심 분석 결과가 기록돼 있습니다.",
  }));
};

const buildFollowUpChecklist = (input: ReportDraftInput) => {
  const { intakeSummary, insights } = input;
  const questions = new Set<string>();
  (intakeSummary?.missingDetails ?? []).forEach((item) => {
    if (item.trim()) {
      questions.add(item.trim());
    }
  });
  (insights?.followUpQuestions ?? []).forEach((question) => {
    if (question.trim()) {
      questions.add(question.trim());
    }
  });
  return pickTop(Array.from(questions), 8);
};

const buildAppendixNotes = (input: ReportDraftInput) => {
  const notes: string[] = [];
  const { conversationSummary, intakeSummary, transcript } = input;

  if (conversationSummary && conversationSummary.trim()) {
    notes.push(`대화 요약: ${conversationSummary.trim()}`);
  }

  if ((intakeSummary?.recommendedDocuments?.length ?? 0) > 0) {
    notes.push(
      `추가 확보 필요 자료: ${pickTop(intakeSummary!.recommendedDocuments, 5).join(", ")}`,
    );
  }

  if ((transcript?.length ?? 0) > 0) {
    const excerpt = pickTop(transcript ?? [], 4)
      .map((entry) => `${entry.role === "assistant" ? "AI" : "의뢰인"}: ${entry.content}`)
      .join(" \n");
    if (excerpt) {
      notes.push(`대화 발췌:\n${excerpt}`);
    }
  }

  return pickTop(notes, 6);
};

const buildMarkdown = (report: AiInvestigationReportDraft) => {
  const lines: string[] = [];
  lines.push(`# ${report.title}`);
  lines.push(`생성 시각: ${new Date(report.generatedAt).toLocaleString("ko-KR")}`);
  lines.push("");
  lines.push("## 요약");
  lines.push(report.executiveSummary);
  lines.push("");

  if (report.keyInsights.length) {
    lines.push("## 핵심 인사이트");
    report.keyInsights.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (report.riskHighlights.length) {
    lines.push("## 위험 신호");
    report.riskHighlights.forEach((highlight) => {
      lines.push(`- [${severityLabel[highlight.severity]}] ${highlight.title}: ${highlight.detail}`);
      lines.push(`  - 대응: ${highlight.recommendation}`);
    });
    lines.push("");
  }

  if (report.actionItems.length) {
    lines.push("## 실행 항목");
    report.actionItems.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (report.timelineEntries.length) {
    lines.push("## 타임라인");
    report.timelineEntries.forEach((entry) => {
      lines.push(`- ${entry.phase} (${entry.status}, ${entry.etaLabel})`);
      lines.push(`  - ${entry.note}`);
    });
    lines.push("");
  }

  if (report.evidenceHighlights.length) {
    lines.push("## 증거 하이라이트");
    report.evidenceHighlights.forEach((evidence) => {
      lines.push(`- ${evidence.title} (${evidence.classification}, ${severityLabel[evidence.riskLevel]})`);
      lines.push(`  - ${evidence.keyFinding}`);
    });
    lines.push("");
  }

  if (report.followUpChecklist.length) {
    lines.push("## 후속 점검");
    report.followUpChecklist.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (report.appendixNotes.length) {
    lines.push("## 부록");
    report.appendixNotes.forEach((note) => lines.push(`- ${note}`));
    lines.push("");
  }

  return lines.join("\n");
};

export function buildInvestigationReportDraft(input: ReportDraftInput): AiInvestigationReportDraft {
  const now = new Date().toISOString();
  const insights = input.insights ?? null;
  const intakeSummary = input.intakeSummary ?? null;

  const title = sanitizeText(intakeSummary?.caseTitle) || "조사 보고서 초안";
  const executiveSummary =
    sanitizeText(input.conversationSummary) ||
    sanitizeText(insights?.summary) ||
    "AI가 수집한 정보를 바탕으로 조사 보고서 초안을 생성했습니다.";

  const report: AiInvestigationReportDraft = {
    id: createReportId(),
    generatedAt: now,
    title,
    executiveSummary,
    keyInsights: buildKeyInsights(input),
    riskHighlights: buildRiskHighlights(insights),
    actionItems: buildActionItems(insights),
    timelineEntries: buildTimelineEntries(insights),
    evidenceHighlights: buildEvidenceHighlights(input.evidenceSummaries),
    followUpChecklist: buildFollowUpChecklist(input),
    appendixNotes: buildAppendixNotes(input),
    markdown: "",
  };

  report.markdown = buildMarkdown(report);
  return report;
}
