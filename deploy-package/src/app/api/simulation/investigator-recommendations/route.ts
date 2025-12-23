import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { InvestigatorStatus } from "@prisma/client";

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

    const keywords = (keywordsInput as unknown[])
      .map((keyword) => (typeof keyword === "string" ? keyword.trim().toLowerCase() : ""))
      .filter((keyword): keyword is string => keyword.length > 0);

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

    const ranked = investigators
      .map((inv) => {
        const specialties = toStringArray(inv.specialties);
        const normalizedSpecialties = specialties.map((spec) => spec.toLowerCase());

        let keywordScore = 0;
        const matchedKeywords = new Set<string>();
  keywords.forEach((keyword) => {
          if (normalizedSpecialties.some((spec) => spec.includes(keyword))) {
            keywordScore += 25;
            matchedKeywords.add(keyword);
          }
        });

        // If scenario title contains keywords, try to match words from title
        if (scenarioTitle && scenarioTitle.trim().length > 0) {
          const titleTokens = scenarioTitle
            .split(/\s+/)
            .map((token) => token.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase())
            .filter((token) => token.length > 1);
          titleTokens.forEach((token) => {
            if (normalizedSpecialties.some((spec) => spec.includes(token))) {
              keywordScore += 10;
              matchedKeywords.add(token);
            }
          });
        }

        const rating = inv.ratingAverage ? Number(inv.ratingAverage) : null;
        const successRate = inv.successRate ? Number(inv.successRate) : null;
        const experienceYears = inv.experienceYears ?? 0;

        const ratingScore = rating ? rating * 8 : 0;
        const successScore = successRate ? successRate * 0.5 : 0;
        const experienceScore = experienceYears * 2;

        const totalScore = ratingScore + successScore + experienceScore + keywordScore;

        const reasonParts: string[] = [];
        if (matchedKeywords.size > 0) {
          const displayKeywords = Array.from(matchedKeywords)
            .slice(0, 3)
            .map((kw) => `"${kw}"`)
            .join(", ");
          reasonParts.push(`시나리오 핵심 키워드 ${displayKeywords}${matchedKeywords.size > 3 ? " 등" : ""}과(와) 맞는 전문 분야를 보유`);
        } else if (specialties.length > 0) {
          reasonParts.push(`전문 분야: ${specialties.slice(0, 3).join(", ")}`);
        }

        if (rating) {
          reasonParts.push(`평균 평점 ${rating.toFixed(1)}점`);
        }
        if (experienceYears > 0) {
          reasonParts.push(`${experienceYears}년 경력`);
        }
        if (successRate) {
          reasonParts.push(`사건 성공률 ${successRate.toFixed(1)}%`);
        }
        if (inv.serviceArea) {
          reasonParts.push(`${inv.serviceArea} 지역 대응 가능`);
        }

        const reason = reasonParts.length > 0
          ? reasonParts.join(" · ")
          : "승인된 탐정으로 다양한 사건 경험을 보유하고 있습니다.";

        return {
          id: inv.id,
          investigatorId: inv.id,
          userId: inv.user?.id ?? null,
          name: inv.user?.name ?? "이름 미상",
          email: inv.user?.email ?? null,
          rating,
          successRate,
          experienceYears,
          serviceArea: inv.serviceArea ?? null,
          specialties,
          reason,
          score: totalScore,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return NextResponse.json({ recommendations: ranked });
  } catch (error) {
    console.error("[INVESTIGATOR_RECOMMENDATION_ERROR]", error);
    return NextResponse.json(
      { error: "RECOMMENDATION_FAILED", message: "탐정 추천 정보를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
