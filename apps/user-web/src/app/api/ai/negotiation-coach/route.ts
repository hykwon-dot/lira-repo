import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateNegotiationCoaching } from "@/lib/ai/negotiationCoach";
import type { IntakeSummary } from "@/app/simulation/types";
import type { AiRealtimeInsights } from "@/lib/ai/types";

const MESSAGE_SCHEMA = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const SUMMARY_SCHEMA = z
  .object({
    caseTitle: z.string().optional().nullable(),
    caseType: z.string().optional().nullable(),
    primaryIntent: z.string().optional().nullable(),
    urgency: z.string().optional().nullable(),
    objective: z.string().optional().nullable(),
    keyFacts: z.array(z.string()).optional().nullable(),
    missingDetails: z.array(z.string()).optional().nullable(),
    recommendedDocuments: z.array(z.string()).optional().nullable(),
    nextQuestions: z.array(z.string()).optional().nullable(),
  })
  .nullable()
  .optional();

const REQUEST_SCHEMA = z.object({
  messages: z.array(MESSAGE_SCHEMA).min(1),
  intakeSummary: SUMMARY_SCHEMA.default(null),
  insights: z.any().optional().nullable(),
  conversationSummary: z.string().optional().nullable(),
});

function normalizeSummary(summary: z.infer<typeof SUMMARY_SCHEMA>): IntakeSummary | null {
  if (!summary) return null;

  const coerceArray = (value: string[] | null | undefined): string[] => {
    if (!value) return [];
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  };

  const coerce = (value: string | null | undefined): string => (typeof value === "string" ? value.trim() : "");

  return {
    caseTitle: coerce(summary.caseTitle),
    caseType: coerce(summary.caseType),
    primaryIntent: coerce(summary.primaryIntent),
    urgency: coerce(summary.urgency),
    objective: coerce(summary.objective),
    keyFacts: coerceArray(summary.keyFacts ?? []),
    missingDetails: coerceArray(summary.missingDetails ?? []),
    recommendedDocuments: coerceArray(summary.recommendedDocuments ?? []),
    nextQuestions: coerceArray(summary.nextQuestions ?? []),
  } satisfies IntakeSummary;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = REQUEST_SCHEMA.parse(raw);

    const intakeSummary = normalizeSummary(parsed.intakeSummary ?? null);
    const plan = generateNegotiationCoaching({
      messages: parsed.messages,
      intakeSummary,
      insights: parsed.insights ? (parsed.insights as AiRealtimeInsights) : null,
      conversationSummary: typeof parsed.conversationSummary === "string"
        ? parsed.conversationSummary
        : null,
    });

    return NextResponse.json({ plan }, { status: 200 });
  } catch (error) {
    console.error("[AI_NEGOTIATION_COACH_ERROR]", error);
    const message =
      error instanceof z.ZodError
        ? "입력 형식이 올바르지 않습니다."
        : error instanceof Error
        ? error.message
        : "협상 코치 플랜 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
