import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/scenarios : 활성 시나리오 목록
export async function GET() {
  try {
    const prisma = await getPrismaClient();
    const items = await prisma.scenario.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // MISSING_PERSON 타입 제외 필터링 (임시)
    const filteredItems = items.filter((item: any) => {
      try {
        const overview = typeof item.overview === 'string' 
          ? JSON.parse(item.overview) 
          : item.overview;
        
        return overview?.caseType !== 'MISSING_PERSON';
      } catch (err) {
        // 파싱 에러 발생 시 일단 포함 (안전을 위해)
        return true;
      }
    });

    return NextResponse.json({ items: filteredItems });
  } catch (e) {
    console.error('[API][scenarios] 목록 조회 오류', e);
    return NextResponse.json({ error: '시나리오 조회 실패' }, { status: 500 });
  }
}
