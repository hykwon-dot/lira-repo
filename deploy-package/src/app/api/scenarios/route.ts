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
    return NextResponse.json({ items });
  } catch (e) {
    console.error('[API][scenarios] 목록 조회 오류', e);
    return NextResponse.json({ error: '시나리오 조회 실패' }, { status: 500 });
  }
}
