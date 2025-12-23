import { NextRequest, NextResponse } from "next/server";
import { summarizeEvidenceArtifacts } from "@/lib/ai/evidenceSummarizer";
import type { EvidenceArtifactInput } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { artifacts?: EvidenceArtifactInput[] };
    const artifacts = Array.isArray(body?.artifacts) ? body.artifacts : [];

    const allowedTypes = new Set<EvidenceArtifactInput["type"]>(["document", "image", "video", "audio", "other"]);
    const normalized: EvidenceArtifactInput[] = artifacts
      .filter((artifact): artifact is EvidenceArtifactInput => {
        if (!artifact || typeof artifact.title !== "string") return false;
        return artifact.title.trim().length > 0;
      })
      .map((artifact, index) => {
        const trimmedTitle = artifact.title.trim();
        const rawType = artifact.type;
        const resolvedType = allowedTypes.has(rawType as EvidenceArtifactInput["type"]) ? (rawType as EvidenceArtifactInput["type"]) : "other";

        return {
          id: artifact.id || `artifact-${index}`,
          title: trimmedTitle,
          type: resolvedType,
          description: artifact.description?.slice(0, 400) ?? undefined,
          keywords: Array.isArray(artifact.keywords) ? artifact.keywords.slice(0, 6) : undefined,
          hasFile: artifact.hasFile ? true : undefined,
          lastUpdated: artifact.lastUpdated ?? undefined,
        } satisfies EvidenceArtifactInput;
      });

    if (!normalized.length) {
      return NextResponse.json({ summaries: [] });
    }

    const summaries = summarizeEvidenceArtifacts(normalized);
    return NextResponse.json({ summaries }, { status: 200 });
  } catch (error) {
    console.error("[AI_EVIDENCE_SUMMARY_ERROR]", error);
    return NextResponse.json(
      { error: "증거 요약을 생성하는 중 문제가 발생했습니다." },
      { status: 400 }
    );
  }
}
