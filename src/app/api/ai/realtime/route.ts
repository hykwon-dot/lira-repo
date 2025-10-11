import { NextRequest, NextResponse } from "next/server";
import { runRealtimeAnalysis, normalizePayload } from "@/lib/ai/realtimeAnalysis";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const normalized = normalizePayload(body);
    const insights = await runRealtimeAnalysis(normalized);

    return NextResponse.json(insights, { status: 200 });
  } catch (error) {
    console.error("[AI_REALTIME_ANALYSIS_ERROR]", error);
    const message =
      error instanceof Error ? error.message : "실시간 분석 요청 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
