import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { InvestigatorStatus } from "@prisma/client";
import { scoreInvestigators } from "@/lib/ai/investigatorMatcher";
import type { InvestigatorMatchContext } from "@/lib/ai/investigatorMatcher";
import type { IntakeSummary } from "@/app/simulation/types";
import type { AiRealtimeInsights } from "@/lib/ai/types";

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const maybeLabel = (item as Record<string, unknown>).label;
          if (typeof maybeLabel === "string" && maybeLabel.trim().length > 0) {
            return maybeLabel.trim();
          }
        }
        return null;
      })
      .filter((item): item is string => Boolean(item && item.trim().length > 0));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((v) => (typeof v === "string" ? v : null))
      .filter((item): item is string => Boolean(item && item.trim().length > 0));
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
  const keywordsInput = Array.isArray(body?.keywords) ? body.keywords : [];
  const scenarioTitle: string | undefined = typeof body?.scenarioTitle === "string" ? body.scenarioTitle : undefined;
  const intakeSummaryRaw = body?.intakeSummary;
  const insightsRaw = body?.insights;

    const keywords = (keywordsInput as unknown[])
      .map((keyword) => (typeof keyword === "string" ? keyword.trim().toLowerCase() : ""))
      .filter((keyword): keyword is string => keyword.length > 0);

    const intakeSummary: IntakeSummary | null =
      intakeSummaryRaw && typeof intakeSummaryRaw === "object"
        ? {
            caseTitle: typeof intakeSummaryRaw.caseTitle === "string" ? intakeSummaryRaw.caseTitle : "",
            caseType: typeof intakeSummaryRaw.caseType === "string" ? intakeSummaryRaw.caseType : "",
            primaryIntent:
              typeof intakeSummaryRaw.primaryIntent === "string" ? intakeSummaryRaw.primaryIntent : "",
            urgency: typeof intakeSummaryRaw.urgency === "string" ? intakeSummaryRaw.urgency : "",
            objective: typeof intakeSummaryRaw.objective === "string" ? intakeSummaryRaw.objective : "",
            keyFacts: toStringArray(intakeSummaryRaw.keyFacts),
            missingDetails: toStringArray(intakeSummaryRaw.missingDetails),
            recommendedDocuments: toStringArray(intakeSummaryRaw.recommendedDocuments),
            nextQuestions: toStringArray(intakeSummaryRaw.nextQuestions),
          }
        : null;

    const insights: AiRealtimeInsights | null = insightsRaw && typeof insightsRaw === "object"
      ? (insightsRaw as AiRealtimeInsights)
      : null;

  const prisma = await getPrismaClient();
  const investigators = await prisma.investigatorProfile.findMany({
      where: {
        status: InvestigatorStatus.APPROVED,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const profiles = investigators.map((inv) => ({
      id: inv.id,
      ratingAverage: inv.ratingAverage ? Number(inv.ratingAverage) : null,
      successRate: inv.successRate ? Number(inv.successRate) : null,
      experienceYears: inv.experienceYears ?? 0,
      serviceArea: inv.serviceArea ?? null,
      specialties: toStringArray(inv.specialties),
      user: inv.user
        ? {
            id: inv.user.id,
            name: inv.user.name ?? null,
            email: inv.user.email ?? null,
          }
        : null,
    }));

    const matchContext: InvestigatorMatchContext = {
      keywords,
      scenarioTitle,
      intakeSummary,
      insights,
    };

    const recommendations = scoreInvestigators(profiles, matchContext).map((match) => ({
      ...match,
    }));

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("[INVESTIGATOR_RECOMMENDATION_ERROR]", error);
    return NextResponse.json(
      { error: "RECOMMENDATION_FAILED", message: "탐정 추천 정보를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
