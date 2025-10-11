import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeCompliance, toComplianceSegments } from "@/lib/ai/complianceGuardian";
import type { AiNegotiationCoachPlan, AiRealtimeInsights } from "@/lib/ai/types";

const NOTE_SCHEMA = z.object({
  label: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
});

const INSIGHTS_SCHEMA = z.any().optional().nullable();
const NEGOTIATION_SCHEMA = z.any().optional().nullable();

const REQUEST_SCHEMA = z.object({
  conversationSummary: z.string().optional().nullable(),
  realtimeSummary: z.string().optional().nullable(),
  reportMarkdown: z.string().optional().nullable(),
  negotiationPlanMarkdown: z.string().optional().nullable(),
  additionalNotes: z.array(NOTE_SCHEMA).optional().default([]),
  insights: INSIGHTS_SCHEMA,
  negotiationPlan: NEGOTIATION_SCHEMA,
});

function buildAdditionalNotes(options: {
  insights?: AiRealtimeInsights | null;
  negotiationPlan?: AiNegotiationCoachPlan | null;
}): Array<{ label: string; text: string }> {
  const notes: Array<{ label: string; text: string }> = [];
  const { insights, negotiationPlan } = options;

  if (insights) {
    const signalText = (insights.signals ?? [])
      .slice(0, 6)
      .map((signal) => `• [${signal.severity.toUpperCase()}] ${signal.title} (${Math.round(signal.confidence * 100)}%)`)
      .join("\n");
    if (signalText) {
      notes.push({
        label: "Risk Signals",
        text: signalText,
      });
    }

    const alertsText = (insights.alerts ?? [])
      .slice(0, 6)
      .map((alert) => `• [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`)
      .join("\n");
    if (alertsText) {
      notes.push({
        label: "Trend Alerts",
        text: alertsText,
      });
    }
  }

  if (negotiationPlan) {
    const scriptText = negotiationPlan.scriptedResponses
      .slice(0, 6)
      .map((script) => `• ${script.label}: ${script.script}`)
      .join("\n");
    if (scriptText) {
      notes.push({
        label: "Negotiation Scripts",
        text: scriptText,
      });
    }
  }

  return notes;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const parsed = REQUEST_SCHEMA.parse(payload);

    const insights = parsed.insights as AiRealtimeInsights | null | undefined;
    const negotiationPlan = parsed.negotiationPlan as AiNegotiationCoachPlan | null | undefined;

    const segments = toComplianceSegments({
      conversationSummary: parsed.conversationSummary ?? insights?.summary ?? null,
      realtimeSummary: parsed.realtimeSummary ?? insights?.summary ?? null,
      reportMarkdown: parsed.reportMarkdown ?? null,
      negotiationPlan: parsed.negotiationPlanMarkdown ?? null,
      additionalNotes: [
        ...buildAdditionalNotes({ insights: insights ?? null, negotiationPlan: negotiationPlan ?? null }),
        ...(parsed.additionalNotes ?? [])
          .filter((note): note is { label: string; text: string } => Boolean(note?.text && note.text.trim().length > 0))
          .map((note, index) => ({
            label: note.label ?? `Note-${index + 1}`,
            text: note.text ?? "",
          })),
      ],
    });

    const report = analyzeCompliance({ segments });

    return NextResponse.json({ report }, { status: 200 });
  } catch (error) {
    console.error("[AI_COMPLIANCE_GUARD_ERROR]", error);
    const message =
      error instanceof z.ZodError
        ? "입력 형식이 올바르지 않습니다."
        : error instanceof Error
        ? error.message
        : "규제 감시 에이전트 실행 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
