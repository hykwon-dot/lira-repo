import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildInvestigationReportDraft } from "@/lib/ai/reportDraftBuilder";
import type { AiRealtimeInsights } from "@/lib/ai/types";

const SEVERITY = z.enum(["low", "medium", "high"]);

const TIMELINE_STATUS = z.enum(["pending", "in-progress", "completed"]);
const ACTION_PHASE = z.enum(["p0", "p1", "backup"]);
const FLOW_STATUS = z.enum(["planned", "parallel", "critical"]);

const RISK_SIGNAL_SCHEMA = z.object({
  id: z.string(),
  title: z.string(),
  severity: SEVERITY,
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
  guidance: z.string(),
});

const ALERT_SCHEMA = z.object({
  id: z.string(),
  title: z.string(),
  severity: SEVERITY,
  message: z.string(),
  suggestion: z.string(),
});

const TIMELINE_SCHEMA = z.object({
  id: z.string(),
  label: z.string(),
  status: TIMELINE_STATUS,
  etaDays: z.number().nullable(),
  rationale: z.string(),
});

const RECOMMENDATION_SCHEMA = z.object({
  id: z.string(),
  title: z.string(),
  similarity: z.number(),
  summary: z.string(),
  highlight: z.string(),
});

const NEXT_ACTION_SCHEMA = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  priority: SEVERITY,
});

const ACTION_PLAN_ITEM_SCHEMA = z.object({
  id: z.string(),
  phase: ACTION_PHASE,
  label: z.string(),
  description: z.string(),
  ownerHint: z.string().optional().nullable(),
  dueInHours: z.number().nullable().optional(),
  relatedSignals: z.array(z.string()).optional().default([]),
});

const ACTION_PLAN_SCHEMA = z.object({
  focus: z.string(),
  generatedAt: z.string(),
  successCriteria: z.array(z.string()),
  notes: z.string(),
  items: z.array(ACTION_PLAN_ITEM_SCHEMA),
});

const FLOW_PHASE_SCHEMA = z.object({
  id: z.string(),
  name: z.string(),
  durationDays: z.number(),
  confidence: z.number(),
  description: z.string(),
  requiredRoles: z.array(z.string()),
  dependencies: z.array(z.string()),
  status: FLOW_STATUS,
});

const FLOW_SIMULATION_SCHEMA = z.object({
  totalDurationDays: z.number(),
  phases: z.array(FLOW_PHASE_SCHEMA),
  resourceNotes: z.array(z.string()),
  riskNotes: z.array(z.string()),
  recommendedCheckpoints: z.array(z.string()),
});

const INSIGHTS_SCHEMA = z
  .object({
    generatedAt: z.string(),
    riskScore: z.number(),
    overallRisk: SEVERITY,
    summary: z.string(),
    signals: z.array(RISK_SIGNAL_SCHEMA).default([]),
    alerts: z.array(ALERT_SCHEMA).default([]),
    timeline: z.array(TIMELINE_SCHEMA).default([]),
    recommendations: z.array(RECOMMENDATION_SCHEMA).default([]),
    nextActions: z.array(NEXT_ACTION_SCHEMA).default([]),
    actionPlan: ACTION_PLAN_SCHEMA,
    flowSimulation: FLOW_SIMULATION_SCHEMA,
    followUpQuestions: z.array(z.string()).default([]),
  })
  .passthrough();

const EVIDENCE_SUMMARY_SCHEMA = z.object({
  id: z.string(),
  title: z.string(),
  classification: z.string(),
  confidence: z.number(),
  riskLevel: SEVERITY,
  keyFindings: z.array(z.string()).default([]),
  recommendedActions: z.array(z.string()).default([]),
});

const INTAKE_SUMMARY_SCHEMA = z
  .object({
    caseTitle: z.string().default(""),
    caseType: z.string().default(""),
    primaryIntent: z.string().default(""),
    urgency: z.string().default(""),
    objective: z.string().default(""),
    keyFacts: z.array(z.string()).default([]),
    missingDetails: z.array(z.string()).default([]),
    recommendedDocuments: z.array(z.string()).default([]),
    nextQuestions: z.array(z.string()).default([]),
  })
  .nullable()
  .optional();

const TRANSCRIPT_ENTRY_SCHEMA = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const REQUEST_SCHEMA = z.object({
  intakeSummary: INTAKE_SUMMARY_SCHEMA.default(null),
  conversationSummary: z.string().nullable().optional(),
  insights: INSIGHTS_SCHEMA.nullish(),
  evidenceSummaries: z.array(EVIDENCE_SUMMARY_SCHEMA).optional().default([]),
  transcript: z.array(TRANSCRIPT_ENTRY_SCHEMA).optional().default([]),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = REQUEST_SCHEMA.parse(payload);

    if (!parsed.insights) {
      return NextResponse.json(
        { error: "실시간 분석 정보가 필요합니다." },
        { status: 400 },
      );
    }

    const normalizedInsights: AiRealtimeInsights = {
      ...(parsed.insights as AiRealtimeInsights),
      actionPlan: {
        ...parsed.insights.actionPlan,
        items: parsed.insights.actionPlan.items.map((item) => ({
          ...item,
          ownerHint: item.ownerHint ?? undefined,
          relatedSignals: item.relatedSignals ?? [],
        })),
      },
    };

    const report = buildInvestigationReportDraft({
      intakeSummary: parsed.intakeSummary ?? null,
      conversationSummary: parsed.conversationSummary ?? null,
      insights: normalizedInsights,
      evidenceSummaries: parsed.evidenceSummaries,
      transcript: parsed.transcript,
    });

    return NextResponse.json({ report }, { status: 200 });
  } catch (error) {
    console.error("[AI_REPORT_DRAFT_ERROR]", error);
    const message =
      error instanceof z.ZodError
        ? "입력 형식이 올바르지 않습니다."
        : error instanceof Error
        ? error.message
        : "보고서 초안 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
