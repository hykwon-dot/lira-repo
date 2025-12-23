import type { IntakeSummary } from "@/app/simulation/types";

export type RiskSeverity = "low" | "medium" | "high";

export interface AiRiskSignal {
  id: string;
  title: string;
  severity: RiskSeverity;
  confidence: number; // 0 - 1
  evidence: string;
  guidance: string;
}

export interface AiTimelineStep {
  id: string;
  label: string;
  status: "pending" | "in-progress" | "completed";
  etaDays: number | null;
  rationale: string;
}

export interface AiScenarioRecommendation {
  id: string;
  title: string;
  similarity: number; // 0 - 1
  summary: string;
  highlight: string;
}

export interface AiNextAction {
  id: string;
  label: string;
  description: string;
  priority: RiskSeverity;
}

export type AiActionPhase = "p0" | "p1" | "backup";

export interface AiActionPlanItem {
  id: string;
  phase: AiActionPhase;
  label: string;
  description: string;
  ownerHint?: string;
  dueInHours?: number | null;
  relatedSignals?: string[];
}

export interface AiActionPlan {
  focus: string;
  generatedAt: string;
  successCriteria: string[];
  notes: string;
  items: AiActionPlanItem[];
}

export interface AiProactiveAlert {
  id: string;
  title: string;
  severity: RiskSeverity;
  message: string;
  suggestion: string;
}

export type EvidenceArtifactType = "document" | "image" | "video" | "audio" | "other";

export interface EvidenceArtifactInput {
  id: string;
  title: string;
  type: EvidenceArtifactType;
  description?: string;
  keywords?: string[];
  hasFile?: boolean;
  lastUpdated?: string;
}

export interface AiEvidenceSummary {
  id: string;
  title: string;
  classification: string;
  confidence: number;
  riskLevel: RiskSeverity;
  keyFindings: string[];
  recommendedActions: string[];
}

export interface AiReportRiskHighlight {
  title: string;
  severity: RiskSeverity;
  detail: string;
  recommendation: string;
}

export interface AiReportTimelineEntry {
  phase: string;
  status: string;
  etaLabel: string;
  note: string;
}

export interface AiReportEvidenceHighlight {
  title: string;
  classification: string;
  riskLevel: RiskSeverity;
  keyFinding: string;
}

export interface AiInvestigationReportDraft {
  id: string;
  generatedAt: string;
  title: string;
  executiveSummary: string;
  keyInsights: string[];
  riskHighlights: AiReportRiskHighlight[];
  actionItems: string[];
  timelineEntries: AiReportTimelineEntry[];
  evidenceHighlights: AiReportEvidenceHighlight[];
  followUpChecklist: string[];
  appendixNotes: string[];
  markdown: string;
}

export interface AiFlowPhase {
  id: string;
  name: string;
  durationDays: number;
  confidence: number;
  description: string;
  requiredRoles: string[];
  dependencies: string[];
  status: "planned" | "parallel" | "critical";
}

export interface AiFlowSimulation {
  totalDurationDays: number;
  phases: AiFlowPhase[];
  resourceNotes: string[];
  riskNotes: string[];
  recommendedCheckpoints: string[];
}

export interface AiRealtimeInsights {
  generatedAt: string;
  riskScore: number;
  overallRisk: RiskSeverity;
  signals: AiRiskSignal[];
  alerts: AiProactiveAlert[];
  timeline: AiTimelineStep[];
  recommendations: AiScenarioRecommendation[];
  nextActions: AiNextAction[];
  actionPlan: AiActionPlan;
  flowSimulation: AiFlowSimulation;
  followUpQuestions: string[];
  summary: string;
}

export interface RealtimeAnalysisPayload {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  intakeSummary?: IntakeSummary | null;
  keywords?: string[];
  conversationSummary?: string | null;
}

export interface AiNegotiationToneGuidance {
  primaryTone: string;
  backupTone?: string | null;
  cues: string[];
}

export interface AiNegotiationScriptLine {
  id: string;
  intent: string;
  label: string;
  script: string;
  rationale: string;
  trustImpact: number;
  emotionalTone: string;
  recommendedNextStep?: string;
}

export interface AiNegotiationWarning {
  id: string;
  title: string;
  severity: RiskSeverity;
  detail: string;
  mitigation: string;
}

export interface AiNegotiationCoachPlan {
  id: string;
  generatedAt: string;
  situationSummary: string;
  primaryGoal: string;
  toneGuidance: AiNegotiationToneGuidance;
  strategyPillars: string[];
  scriptedResponses: AiNegotiationScriptLine[];
  objectionHandlers: AiNegotiationScriptLine[];
  riskWarnings: AiNegotiationWarning[];
  followUpPrompts: string[];
  rapportTips: string[];
}

export type ComplianceCategory = "privacy" | "safety" | "legal" | "bias" | "policy" | "other";

export interface AiComplianceIssue {
  id: string;
  category: ComplianceCategory;
  severity: RiskSeverity;
  snippet: string;
  guidance: string;
  regulationReferences: string[];
  source: string;
}

export interface AiComplianceMetric {
  id: string;
  label: string;
  score: number;
  threshold: number;
  detail: string;
}

export interface AiComplianceReport {
  id: string;
  generatedAt: string;
  overallSeverity: RiskSeverity;
  flaggedIssues: AiComplianceIssue[];
  metrics: AiComplianceMetric[];
  cleanSegments: number;
  totalSegments: number;
  summary: string;
}

export interface AiStressScenario {
  id: string;
  title: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  description: string;
  earlyIndicators: string[];
  recommendedActions: string[];
  decisiveMoments: string[];
}

export interface AiStressTestReport {
  id: string;
  generatedAt: string;
  baseAssumptions: string[];
  resilienceScore: number;
  stressDelta: number;
  scenarios: AiStressScenario[];
  systemicRisks: string[];
  mitigationThemes: string[];
}

export interface AiTwinTimelineStep {
  phase: string;
  detail: string;
  emphasis?: string | null;
}

export interface AiTwinAnalysis {
  id: string;
  generatedAt: string;
  successRate: number;
  confidenceLabel: "높음" | "중간" | "낮음";
  keyFactors: string[];
  riskAlerts: string[];
  recommendedActions: string[];
  timeline: AiTwinTimelineStep[];
  knowledgeBase: string[];
  rationale?: string;
}
