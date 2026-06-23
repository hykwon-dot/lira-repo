import { NextResponse } from "next/server";
import { prisma } from "@lira/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 최근 로그 1000개를 가져와 세션 단위로 그룹핑
    const logs = await prisma.guestActivityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const sessionsMap = new Map<string, any>();

    for (const log of logs) {
      if (!sessionsMap.has(log.sessionId)) {
        sessionsMap.set(log.sessionId, {
          sessionId: log.sessionId,
          guestId: log.guestId,
          caseType: log.caseType,
          createdAt: log.createdAt, // 최신 로그의 시간
          messages: [],
          startPayload: null,
        });
      }

      const session = sessionsMap.get(log.sessionId);

      // caseType 갱신 (빈 값 채우기)
      if (!session.caseType && log.caseType) {
        session.caseType = log.caseType;
      }

      if (log.action === "START_DIAGNOSIS") {
        session.startPayload = log.payload;
        // 세션 시작 시간을 기록
        session.startedAt = log.createdAt; 
      } else if (log.action === "CHAT_MESSAGE") {
        const p = log.payload as any;
        if (p?.userText || p?.aiText) {
          session.messages.push({
            id: log.id,
            userText: p.userText,
            aiText: p.aiText,
            createdAt: log.createdAt,
          });
        }
      }
    }

    const sessions = Array.from(sessionsMap.values()).map(session => {
      // 메시지 시간순 정렬 (asc)
      session.messages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // startedAt이 없으면 첫 메시지의 시간 사용
      if (!session.startedAt) {
        session.startedAt = session.messages.length > 0 ? session.messages[0].createdAt : session.createdAt;
      }
      
      return session;
    });

    // 최신 세션순 정렬
    sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    // 상위 100개 세션만 반환
    return NextResponse.json({ success: true, data: sessions.slice(0, 100) });
  } catch (error) {
    console.error("[API_CHATS_GUESTS]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch guest conversations" },
      { status: 500 }
    );
  }
}
